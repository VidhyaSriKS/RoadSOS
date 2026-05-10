import { useState, useEffect, useRef, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { App } from '@capacitor/app';

/**
 * Two-phase location strategy:
 *   Phase 1 – Fast: network/cell-tower (low accuracy, ~1-3s, works indoors)
 *   Phase 2 – Refine: GPS satellite (high accuracy, ~5-15s, requires outdoor signal)
 * This way the app always gets a position quickly, then improves it if possible.
 */
async function getTwoPhasePosition() {
  let position = null;

  // Phase 1: Fast, low-accuracy fix (network/WiFi/cell)
  try {
    position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,   // network-based — fast & works indoors
      timeout: 5000,
      maximumAge: 60000,           // accept up to 1-min-old cached network fix
    });
  } catch (_) {
    // Network location not available — skip to Phase 2
  }

  // Phase 2: Try to improve with GPS (only if Phase 1 gave us something rough,
  // or if Phase 1 failed entirely)
  try {
    const gpsPos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,    // GPS satellite
      timeout: 10000,
      maximumAge: 0,
    });
    // Only use GPS result if it's more accurate than what we already have
    const gpsAcc = gpsPos.coords.accuracy ?? Infinity;
    const prevAcc = position?.coords.accuracy ?? Infinity;
    if (gpsAcc < prevAcc) {
      position = gpsPos;
    }
  } catch (_) {
    // GPS timed out (indoors, tunnel, etc.) — that's fine, keep Phase 1 result
  }

  if (!position) throw new Error('Could not determine location');
  return position;
}

export function useLocation() {
  const [locationText, setLocationText] = useState('⏳ Detecting...');
  const [showBanner, setShowBanner] = useState(false);
  // 'loading' | 'granted' | 'denied' | 'error'
  // Start as 'granted' so LocationGuard doesn’t flash before the first check
  const [permissionStatus, setPermissionStatus] = useState('granted');
  const [isUsingCachedLocation, setIsUsingCachedLocation] = useState(false);

  const retryTimerRef = useRef(null);
  const isFetchingRef = useRef(false);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const fetchLocation = useCallback(async () => {
    // Guard: don't run if already in progress
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      // ── Step 1: Permission check on native ─────────────────────────────────
      if (Capacitor.isNativePlatform()) {
        const permStatus = await Geolocation.checkPermissions();

        if (permStatus.location === 'denied') {
          setPermissionStatus('denied');
          setLocationText('🔒 Location Denied');
          setShowBanner(false);
          return; // finally will reset isFetchingRef
        }

        if (permStatus.location !== 'granted') {
          const reqStatus = await Geolocation.requestPermissions();
          const granted =
            reqStatus.location === 'granted' ||
            reqStatus.coarseLocation === 'granted';
          if (!granted) {
            setPermissionStatus('denied');
            setLocationText('🔒 Permission Needed');
            setShowBanner(false);
            return; // finally will reset isFetchingRef
          }
        }
      }

      // ── Step 2: Get position (two-phase) ────────────────────────────────
      setLocationText('📡 Detecting location...');

      const pos = await getTwoPhasePosition();
      const { latitude, longitude } = pos.coords;

      // Persist
      window.userLat = latitude;
      window.userLng = longitude;
      localStorage.setItem('userLat', String(latitude));
      localStorage.setItem('userLng', String(longitude));

      // Success — clear any error state
      setPermissionStatus('granted');
      setShowBanner(false);
      setIsUsingCachedLocation(false);
      clearRetryTimer();

      // ── Step 3: Reverse geocode ─────────────────────────────────────────
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
          { headers: { 'User-Agent': 'RoadSOS-App/1.0' } }
        );
        const data = await res.json();

        if (data?.address) {
          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.suburb ||
            data.address.county ||
            'Your area';
          const country = data.address.country || '';
          const countryCode = data.address.country_code?.toUpperCase() || 'IN';
          localStorage.setItem('countryCode', countryCode);
          setLocationText('📍 ' + city + (country ? `, ${country}` : ''));
        } else {
          setLocationText('📍 Location detected');
        }
      } catch (_) {
        setLocationText('📍 Location detected');
      }
    } catch (err) {
      console.error('[useLocation] Error:', err);

      const isDenied =
        err.code === 1 ||
        err.message?.toLowerCase().includes('denied') ||
        err.message?.toLowerCase().includes('permission');

      if (isDenied) {
        setPermissionStatus('denied');
        setLocationText('🔒 Location Denied');
        setShowBanner(false);
        return; // finally will reset isFetchingRef
      }

      // ── GPS completely unavailable — fall back to cache ──────────────────
      setPermissionStatus('error');
      const cachedLat = localStorage.getItem('userLat');
      const cachedLng = localStorage.getItem('userLng');

      if (cachedLat && cachedLng) {
        setIsUsingCachedLocation(true);
        setShowBanner(true);
        setLocationText('📍 Last known location');
        console.warn('[useLocation] Using cached location:', cachedLat, cachedLng);
      } else {
        setIsUsingCachedLocation(false);
        setShowBanner(true);
        setLocationText('⏱ Location unavailable');
      }

      // Auto-retry every 30s — only one timer at a time
      if (!retryTimerRef.current) {
        retryTimerRef.current = setInterval(() => {
          fetchLocation();
        }, 30000);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [clearRetryTimer]);

  useEffect(() => {
    fetchLocation();

    let listener;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          // Wait 600ms so the OS updates its permission state
          setTimeout(() => fetchLocation(), 600);
        }
      }).then(l => { listener = l; });
    }

    return () => {
      if (listener) listener.remove();
      clearRetryTimer();
    };
  }, [fetchLocation, clearRetryTimer]);

  const openSettings = async (type = 'app') => {
    if (!Capacitor.isNativePlatform()) {
      alert('Please enable location access in your browser settings.');
      return;
    }
    try {
      await NativeSettings.open(
        type === 'gps'
          ? { optionAndroid: AndroidSettings.Location, optionIOS: IOSSettings.Location }
          : { optionAndroid: AndroidSettings.ApplicationDetails, optionIOS: IOSSettings.App }
      );
    } catch (err) {
      console.error('[useLocation] NativeSettings error:', err);
      try {
        await NativeSettings.open({ optionAndroid: 'ApplicationDetails', optionIOS: 'App' });
      } catch (_) {}
    }
  };

  // forceRefetch: resets the concurrency guard then runs fetchLocation
  // Used by the retry button so it always fires even if a stale guard is set
  const forceRefetch = useCallback(() => {
    isFetchingRef.current = false;
    fetchLocation();
  }, [fetchLocation]);

  return {
    locationText,
    showBanner,
    permissionStatus,
    isUsingCachedLocation,
    refreshLocation: fetchLocation,
    forceRefetch,
    openSettings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getStoredLocation — used by SOS + Nearby screens to get coords for API calls.
// Two-phase: fast network fix first, then GPS. Falls back to cache.
// ─────────────────────────────────────────────────────────────────────────────
export async function getStoredLocation() {
  try {
    const pos = await getTwoPhasePosition();
    const { latitude, longitude } = pos.coords;
    localStorage.setItem('userLat', String(latitude));
    localStorage.setItem('userLng', String(longitude));
    return { lat: latitude, lng: longitude };
  } catch (_) {
    const lat = localStorage.getItem('userLat');
    const lng = localStorage.getItem('userLng');
    if (lat && lng) {
      return { lat: parseFloat(lat), lng: parseFloat(lng) };
    }
    throw new Error('No location available — please enable GPS');
  }
}
