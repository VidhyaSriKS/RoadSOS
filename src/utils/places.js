import { Hospital, Ambulance, ShieldAlert, Flame, Pill, Siren, Wrench, Truck, Disc, Settings } from 'lucide-react';

export const TYPE_MAP = {
  hospital: {
    tag: 'amenity', value: 'hospital',
    label: 'Hospitals', icon: Hospital, call: '108'
  },
  ambulance_service: {
    tag: 'amenity', value: 'ambulance_station',
    label: 'Ambulance Services', icon: Ambulance, call: '108'
  },
  police: {
    tag: 'amenity', value: 'police',
    label: 'Police Stations', icon: ShieldAlert, call: '100'
  },
  fire_station: {
    tag: 'amenity', value: 'fire_station',
    label: 'Fire Stations', icon: Flame, call: '101'
  },
  pharmacy: {
    tag: 'amenity', value: 'pharmacy',
    label: 'Pharmacies', icon: Pill, call: null
  },
  repair: {
    tag: 'shop', value: 'car_repair',
    label: 'Repair Shops', icon: Wrench, call: null
  },
  towing: {
    tag: 'amenity', value: 'vehicle_recovery',
    label: 'Towing Services', icon: Truck, call: null
  },
  tyres: {
    tag: 'shop', value: 'tyres',
    label: 'Puncture Shops', icon: Disc, call: null
  },
  car_service: {
    tag: 'shop', value: 'car_repair', // Also car_repair
    label: 'Car Service Centers', icon: Settings, call: null
  },
  all: {
    tag: 'amenity', value: 'hospital',
    label: 'All Emergency Services', icon: Siren, call: '112'
  }
};

export function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

import { getOfflineData } from './offlineDb';

export async function fetchNearby(lat, lng, tag, value, radiusKm = 10, skipFallback = false) {
  const radius = radiusKm * 1000;
  // Support an array of specific tags if value is undefined or we can just pass them as normal
  let queryBody = '';
  if (Array.isArray(tag)) {
    queryBody = tag.map(t => `
      node["${t.key}"="${t.val}"](around:${radius},${lat},${lng});
      way["${t.key}"="${t.val}"](around:${radius},${lat},${lng});
    `).join('');
  } else {
    queryBody = `
      node["${tag}"="${value}"](around:${radius},${lat},${lng});
      way["${tag}"="${value}"](around:${radius},${lat},${lng});
    `;
  }

  const query = `
    [out:json][timeout:25];
    (
${queryBody}
    );
    out center;
  `;
  
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    return data.elements || [];
  } catch (err) {
    if (!skipFallback) {
      console.warn('Network offline! Falling back to offline local database.');
      const all = await getOfflineData();
      if (Array.isArray(tag)) {
        return all.filter(el => tag.some(t => el.tags?.[t.key] === t.val));
      }
      return all.filter(el => el.tags?.[tag] === value);
    }
    return [];
  }
}

export function processElements(elements, lat, lng) {
  return elements
    .map(el => {
      const elLat = el.lat ?? el.center?.lat ?? null;
      const elLng = el.lon ?? el.center?.lon ?? null;
      return {
        ...el,
        elLat,
        elLng,
        dist: elLat && elLng ? calcDistance(lat, lng, elLat, elLng) : '??',
        name: el.tags?.name || el.tags?.['name:en'] || 'Unnamed Hospital',
        phone: el.tags?.phone || el.tags?.['contact:phone'] || '108'
      };
    })
    .filter(el => el.elLat && el.elLng)
    .sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist));
}

export async function fetchNearestHospital(lat, lng) {
  try {
    const elements = await fetchNearby(lat, lng, 'amenity', 'hospital', 10);
    const processed = processElements(elements, lat, lng);
    return processed.length > 0 ? processed[0] : null;
  } catch (err) {
    console.error('Error fetching nearest hospital:', err);
    return null;
  }
}
