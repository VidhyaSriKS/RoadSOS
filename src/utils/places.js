import { Hospital, Ambulance, ShieldAlert, Flame, Pill, Siren } from 'lucide-react';

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

export async function fetchNearby(lat, lng, tag, value, radiusKm = 10) {
  const radius = radiusKm * 1000;
  const query = `
    [out:json][timeout:25];
    (
      node["${tag}"="${value}"](around:${radius},${lat},${lng});
      way["${tag}"="${value}"](around:${radius},${lat},${lng});
    );
    out center;
  `;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  });
  const data = await res.json();
  return data.elements || [];
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
