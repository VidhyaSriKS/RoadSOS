import { useState, useEffect, useRef } from 'react';
import { renderToString } from 'react-dom/server';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapView({ elements, userLat, userLng, info }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([userLat, userLng], 14);
    mapInstanceRef.current = map;
    window.roadMap = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Blue circle for user location
    L.circleMarker([userLat, userLng], {
      radius: 10,
      color: '#1565C0',
      fillColor: '#1976D2',
      fillOpacity: 0.9,
      weight: 3
    }).addTo(map).bindPopup('<b>📍 You are here</b>').openPopup();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      window.roadMap = null;
    };
  }, [userLat, userLng]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !elements.length) return;

    const iconHtml = renderToString(<info.icon size={16} color="#fff" />);

    const redIcon = L.divIcon({
      html: `<div style="
        background:#e53935; color:#fff;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        width:32px; height:32px;
        display:flex; align-items:center;
        justify-content:center;
        font-size:13px; border:2px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
      "><span style="transform:rotate(45deg); display:flex; align-items:center; justify-content:center;">${iconHtml}</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
      className: ''
    });

    elements.forEach(el => {
      if (!el.elLat || !el.elLng) return;
      const name = el.tags?.name || el.tags?.['name:en'] || 'Unnamed';
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${el.elLat},${el.elLng}&travelmode=driving`;

      L.marker([el.elLat, el.elLng], { icon: redIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:160px;">
            <b style="font-size:13px;">${name}</b><br>
            <span style="color:#e53935;font-size:12px;">${el.dist} km away</span><br><br>
            <a href="tel:${info.call || 108}"
              style="background:#e53935;color:#fff;padding:5px 10px;
              border-radius:6px;text-decoration:none;font-size:12px;
              margin-right:6px;">📞 Call</a>
            <a href="${mapsUrl}" target="_blank"
              style="background:#f0f0f0;color:#333;padding:5px 10px;
              border-radius:6px;text-decoration:none;font-size:12px;">🗺 Go</a>
          </div>
        `);
    });

    const bounds = elements
      .filter(el => el.elLat && el.elLng)
      .map(el => [el.elLat, el.elLng]);
    if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
  }, [elements, info, userLat, userLng]);

  return <div ref={mapRef} id="map" />;
}
