import { useState, useEffect, useRef } from 'react';
import { renderToString } from 'react-dom/server';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { getCachedTile } from '../services/offlineManager';

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom TileLayer for Offline Support
const OfflineTileLayer = L.TileLayer.extend({
  createTile: function (coords, done) {
    const tile = document.createElement('img');
    L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
    L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));

    const { x, y, z } = coords;
    getCachedTile(z, x, y).then(blob => {
      if (blob) {
        tile.src = URL.createObjectURL(blob);
      } else {
        tile.src = this.getTileUrl(coords);
      }
    }).catch(() => {
      tile.src = this.getTileUrl(coords);
    });

    return tile;
  }
});

export default function MapView({ elements, userLat, userLng, info }) {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const clusterRef = useRef(null);
  const userMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance) return;

    const map = L.map(mapRef.current).setView([userLat, userLng], 14);
    setMapInstance(map);
    window.roadMap = map;

    new OfflineTileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Blue circle for user location
    const userMarker = L.circleMarker([userLat, userLng], {
      radius: 10,
      color: '#1565C0',
      fillColor: '#1976D2',
      fillOpacity: 0.9,
      weight: 3
    }).addTo(map).bindPopup('<b>📍 You are here</b>');
    
    userMarkerRef.current = userMarker;
    userMarker.openPopup();

    return () => {
      map.remove();
      setMapInstance(null);
      window.roadMap = null;
    };
  }, []); // Only init once

  // Update view when user location changes
  useEffect(() => {
    if (mapInstance && userLat && userLng) {
      mapInstance.flyTo([userLat, userLng], 15, { animate: true });
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLat, userLng]);
      }
    }
  }, [userLat, userLng, mapInstance]);

  useEffect(() => {
    if (!mapInstance || !elements || elements.length === 0) return;

    if (clusterRef.current) {
      mapInstance.removeLayer(clusterRef.current);
    }

    const clusters = L.layerGroup();
    clusterRef.current = clusters;

    const iconHtml = renderToString(<info.icon size={16} color="#fff" />);
    const redIcon = L.divIcon({
      html: `<div style="
        background:#e53935; 
        width:30px; height:30px;
        border-radius:30px 30px 30px 2px;
        transform:rotate(-45deg);
        border:2px solid #fff;
        box-shadow:0 2px 5px rgba(0,0,0,0.4);
        display:flex; align-items:center; justify-content:center;
      "><div style="transform:rotate(45deg); display:flex;">${iconHtml}</div></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30], // Exactly at the bottom tip
      popupAnchor: [0, -30],
      className: ''
    });

    elements.forEach(el => {
      if (!el.lat || !el.lon) return;
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${el.lat},${el.lon}&travelmode=driving`;

      const marker = L.marker([el.lat, el.lon], { icon: redIcon })
        .bindPopup(`
          <div style="min-width:180px; padding:4px;">
            <b style="font-size:14px; display:block; margin-bottom:4px;">${el.name}</b>
            <span style="color:#666; font-size:11px; display:block; margin-bottom:4px;">${el.address || 'Address unknown'}</span>
            <span style="color:#e53935; font-size:12px; font-weight:700;">${el.dist} km away</span><br><br>
            <div style="display:flex; gap:8px;">
              ${el.phone ? `<a href="tel:${el.phone}"
                style="background:#e53935;color:#fff;padding:6px 12px;
                border-radius:8px;text-decoration:none;font-size:12px;
                flex:1; text-align:center;">📞 Call</a>` : ''}
              <a href="${mapsUrl}" target="_blank"
                style="background:#f0f0f0;color:#333;padding:6px 12px;
                border-radius:8px;text-decoration:none;font-size:12px;
                flex:1; text-align:center;">🗺 Go</a>
            </div>
          </div>
        `);
      clusters.addLayer(marker);
    });

    mapInstance.addLayer(clusters);

    const bounds = elements
      .filter(el => el.lat && el.lon)
      .map(el => [el.lat, el.lon]);
    if (bounds.length) mapInstance.fitBounds(bounds, { padding: [40, 40] });
  }, [elements, info, userLat, userLng, mapInstance]);

  return <div ref={mapRef} id="map" />;
}
