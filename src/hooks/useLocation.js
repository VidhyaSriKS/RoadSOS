import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { NativeSettings } from 'capacitor-native-settings';
import { App } from '@capacitor/app';

export function useLocation() {
  const [locationText, setLocationText] = useState('⏳ Detecting...');
  const [showBanner, setShowBanner] = useState(false);

  const fetchLocation = async (forceSystemSettings = false) => {
    try {
      // Request permissions natively on mobile
      if (Capacitor.isNativePlatform()) {
        if (forceSystemSettings) {
          await NativeSettings.open({
            option: Capacitor.getPlatform() === 'ios' ? 'locationServices' : 'location'
          });
          return;
        }

        const permStatus = await Geolocation.checkPermissions();
        if (permStatus.location !== 'granted') {
          await Geolocation.requestPermissions();
        }
      }

      setLocationText('📡 Obtaining GPS lock...');
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds for a real GPS lock
        maximumAge: 0   // Force fresh location, no cache
      });

      const { latitude, longitude } = pos.coords;
      window.userLat = latitude;
      window.userLng = longitude;
      localStorage.setItem('userLat', latitude);
      localStorage.setItem('userLng', longitude);
      setShowBanner(false);

      try {
        // Primary: OpenStreetMap (Nominatim) for accuracy
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`, {
          headers: { 'User-Agent': 'RoadSOS-App' }
        });
        const data = await res.json();
        
        if (data && data.address) {
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Your area';
          const country = data.address.country || '';
          const countryCode = data.address.country_code?.toUpperCase() || 'IN';
          localStorage.setItem('countryCode', countryCode);
          setLocationText('📍 ' + city + (country ? `, ${country}` : ''));
        } else {
          throw new Error('OSM failed');
        }
      } catch (err) {
        console.warn('OSM Geocode failed, falling back to Geoapify:', err);
        try {
          const { reverseGeocode } = await import('../services/geoapify');
          const data = await reverseGeocode(latitude, longitude);
          const city = data.city || data.town || data.village || data.county || 'Your area';
          const country = data.country || '';
          const countryCode = data.country_code?.toUpperCase() || 'IN';
          localStorage.setItem('countryCode', countryCode);
          setLocationText('📍 ' + city + (country ? `, ${country}` : ''));
        } catch (geoErr) {
          setLocationText('📍 Location detected');
        }
      }
    } catch (err) {
      setLocationText('❌ Location error');
      setShowBanner(true);
      console.error('Location error:', err);
    }
  };

  useEffect(() => {
    fetchLocation();

    // Re-check when app is resumed (e.g. from settings)
    let listener;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) fetchLocation();
      }).then(l => listener = l);
    }

    return () => {
      if (listener) listener.remove();
    };
  }, []);

  return { 
    locationText, 
    showBanner, 
    refreshLocation: fetchLocation 
  };
}

export function getStoredLocation() {
  return new Promise(async (resolve, reject) => {
    const lat = localStorage.getItem('userLat');
    const lng = localStorage.getItem('userLng');
    if (lat && lng) {
      // Refresh silently
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
        localStorage.setItem('userLat', pos.coords.latitude);
        localStorage.setItem('userLng', pos.coords.longitude);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        return;
      } catch (e) {
        // If refresh fails, use stored
        resolve({ lat: parseFloat(lat), lng: parseFloat(lng) });
        return;
      }
    }

    try {
      const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
      localStorage.setItem('userLat', p.coords.latitude);
      localStorage.setItem('userLng', p.coords.longitude);
      resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
    } catch (e) {
      reject(e);
    }
  });
}

