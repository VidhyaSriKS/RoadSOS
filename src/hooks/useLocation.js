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

      setLocationText('⏳ Detecting...');
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      });

      const { latitude, longitude } = pos.coords;
      window.userLat = latitude;
      window.userLng = longitude;
      localStorage.setItem('userLat', latitude);
      localStorage.setItem('userLng', longitude);
      setShowBanner(false);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.county ||
          'Your area';
        const country = data.address?.country || '';
        setLocationText('📍 ' + city + (country ? `, ${country}` : ''));
      } catch {
        setLocationText('📍 Location detected');
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
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, maximumAge: 0 });
        localStorage.setItem('userLat', pos.coords.latitude);
        localStorage.setItem('userLng', pos.coords.longitude);
      } catch (e) {}
      
      resolve({ lat: parseFloat(lat), lng: parseFloat(lng) });
      return;
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

