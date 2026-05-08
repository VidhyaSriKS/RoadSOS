import { Hospital, Ambulance, ShieldAlert, Flame, Pill, Siren, Wrench, Truck, Disc, Settings, Fuel } from 'lucide-react';

export const TYPE_MAP = {
  hospital: {
    category: 'healthcare.hospital',
    label: 'Hospitals', icon: Hospital, call: '108'
  },
  ambulance_service: {
    category: 'service.ambulance_station',
    label: 'Ambulance', icon: Ambulance, call: '108'
  },
  police: {
    category: 'service.police',
    label: 'Police Stations', icon: ShieldAlert, call: '100'
  },
  repair: {
    category: 'service.vehicle.repair,service.vehicle.repair.car',
    label: 'Repair Shops', icon: Wrench, call: null
  },
  towing: {
    category: 'service.vehicle',
    label: 'Towing Services', icon: Truck, call: null
  },
  pharmacy: {
    category: 'healthcare.pharmacy',
    label: 'Pharmacies', icon: Pill, call: null
  },
  fuel: {
    category: 'service.vehicle.fuel',
    label: 'Fuel Stations', icon: Fuel, call: null
  }
};

export function getEmergencyContact(countryCode = 'IN') {
  const codes = {
    'IN': { hospital: '108', police: '100', fire: '101', sos: '112' },
    'US': { hospital: '911', police: '911', fire: '911', sos: '911' },
    'GB': { hospital: '999', police: '999', fire: '999', sos: '999' }
  };
  return codes[countryCode] || codes['IN'];
}

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

import { fetchPlacesGeoapify } from '../services/geoapify';
import {
  fetchAmbulanceServices,
  fetchTowingServices,
  fetchHospitals,
  fetchRepairShops,
} from '../services/overpass';
import { getCachedPois, cachePois } from '../services/offlineManager';

// Route these types through Overpass (raw OSM) for:
// 1. Ambulance/towing — barely indexed in Geoapify for India
// 2. Hospital/repair  — Overpass returns all OSM phone tags (much richer)
const OVERPASS_TYPES = {
  ambulance_service: fetchAmbulanceServices,
  towing: fetchTowingServices,
  hospital: fetchHospitals,
  repair: fetchRepairShops,
};

// Progressive radius steps: start tight, widen until something is found
const RADIUS_STEPS = [10, 25, 50, 100];

async function fetchAtRadius(lat, lng, type, radiusKm) {
  if (OVERPASS_TYPES[type]) {
    const data = await OVERPASS_TYPES[type](lat, lng, radiusKm);
    if (data.length > 0) return data;
    // Overpass returned nothing — try Geoapify as fallback for this radius
    console.warn(`Overpass returned 0 for ${type} at ${radiusKm}km, trying Geoapify`);
    return fetchPlacesGeoapify(lat, lng, type, radiusKm);
  }
  return fetchPlacesGeoapify(lat, lng, type, radiusKm);
}

/**
 * Fetch nearby places, automatically widening the search radius
 * (10 → 25 → 50 → 100 km) until at least one result is found.
 *
 * Returns { places: Array, expandedRadius: number|null }
 *   expandedRadius = null  → results found within the first 10 km
 *   expandedRadius = N     → had to widen to N km to find results
 */
export async function fetchNearby(lat, lng, type) {
  for (const radius of RADIUS_STEPS) {
    try {
      const data = await fetchAtRadius(lat, lng, type, radius);
      if (data.length > 0) {
        await cachePois(type, data);
        return {
          places: data,
          expandedRadius: radius > RADIUS_STEPS[0] ? radius : null,
        };
      }
      console.log(`No results for ${type} within ${radius}km, widening...`);
    } catch (err) {
      console.warn(`Fetch error for ${type} at ${radius}km:`, err.message);
    }
  }

  // Nothing found at any radius — try offline cache
  try {
    const cached = await getCachedPois(type);
    if (cached?.pois?.length > 0) {
      return { places: cached.pois, expandedRadius: null };
    }
  } catch (_) {}

  return { places: [], expandedRadius: null };
}

export function processElements(elements, lat, lng, maxDistKm = 150) {
  return elements
    .map(el => ({
      ...el,
      dist: el.lat && el.lon ? calcDistance(lat, lng, el.lat, el.lon) : '??',
    }))
    // Drop anything unrealistically far (wrong GPS / stale coords)
    .filter(el => el.dist === '??' || parseFloat(el.dist) <= maxDistKm)
    .sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist));
}

export async function fetchNearestHospital(lat, lng) {
  try {
    const elements = await fetchNearby(lat, lng, 'hospital', 10);
    const processed = processElements(elements, lat, lng);
    return processed.length > 0 ? processed[0] : null;
  } catch (err) {
    console.error('Error fetching nearest hospital:', err);
    return null;
  }
}
