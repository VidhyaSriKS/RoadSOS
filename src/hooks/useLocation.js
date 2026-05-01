import { useState, useEffect } from 'react';

export function useLocation() {
  const [locationText, setLocationText] = useState('⏳ Detecting...');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationText('❌ Location not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
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
          setLocationText('📍 ' + city);
        } catch {
          setLocationText('📍 Location detected');
        }
      },
      (err) => {
        const msgs = {
          1: '🔒 Allow location access',
          2: '📡 GPS unavailable',
          3: '⏱ Location timed out',
        };
        setLocationText(msgs[err.code] || '❌ Location error');
        setShowBanner(true);
        console.error('Location error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  return { locationText, showBanner };
}

export function getStoredLocation() {
  return new Promise((resolve, reject) => {
    const lat = localStorage.getItem('userLat');
    const lng = localStorage.getItem('userLng');
    if (lat && lng) {
      // Refresh in background silently
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          localStorage.setItem('userLat', pos.coords.latitude);
          localStorage.setItem('userLng', pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0 }
      );
      resolve({ lat: parseFloat(lat), lng: parseFloat(lng) });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        localStorage.setItem('userLat', p.coords.latitude);
        localStorage.setItem('userLng', p.coords.longitude);
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      reject,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}
