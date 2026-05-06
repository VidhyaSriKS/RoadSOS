import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export function useLocation() {
  const [locationText, setLocationText] = useState('⏳ Detecting...');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        // Request permissions natively on mobile
        if (Capacitor.isNativePlatform()) {
          const permStatus = await Geolocation.checkPermissions();
          if (permStatus.location !== 'granted') {
            const requestStatus = await Geolocation.requestPermissions();
            if (requestStatus.location !== 'granted') {
              setLocationText('🔒 Allow location access');
              setShowBanner(true);
              return;
            }
          }
        }

        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 12000,
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

    fetchLocation();
  }, []);

  return { locationText, showBanner };
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

