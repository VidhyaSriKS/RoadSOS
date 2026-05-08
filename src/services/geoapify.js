import { CONFIG } from '../config';
const GEOAPIFY_KEY = CONFIG.GEOAPIFY_KEY;

export const CATEGORY_MAPPING = {
  hospital: 'healthcare.hospital',
  ambulance_service: 'service.ambulance_station',
  repair: 'service.vehicle.repair,service.vehicle.repair.car',
  towing: 'service.vehicle',
  pharmacy: 'healthcare.pharmacy',
  police: 'service.police',
  fuel: 'service.vehicle.fuel'
};

export async function fetchPlacesGeoapify(lat, lng, category, radiusKm = 10) {
  const categories = CATEGORY_MAPPING[category] || category;
  const radius = radiusKm * 1000;

  // Get stored country code (set during reverse geocode in useLocation)
  const countryCode = (localStorage.getItem('countryCode') || 'IN').toLowerCase();

  // Use both circle filter (radius) AND countrycode filter to prevent
  // cross-country results caused by inaccurate GPS or stale coords.
  const url = `https://api.geoapify.com/v2/places?categories=${categories}` +
    `&filter=circle:${lng},${lat},${radius}` +
    `&filter=countrycode:${countryCode}` +
    `&bias=proximity:${lng},${lat}` +
    `&limit=50&apiKey=${GEOAPIFY_KEY}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Geoapify fetch failed');
  const data = await response.json();

  return data.features.map(f => ({
    id: f.properties.place_id,
    lat: f.properties.lat,
    lon: f.properties.lon,
    name: f.properties.name || f.properties.address_line1 || 'Unnamed',
    address: f.properties.address_line2 || f.properties.formatted,
    phone: f.properties.datasource?.raw?.phone ||
           f.properties.datasource?.raw?.['contact:phone'] ||
           f.properties.datasource?.raw?.['contact:mobile'] ||
           f.properties.datasource?.raw?.mobile ||
           f.properties.datasource?.raw?.['phone:mobile'] ||
           f.properties.datasource?.raw?.phone1 ||
           f.properties.datasource?.raw?.tel ||
           f.properties.datasource?.raw?.telephone ||
           null,
    category: f.properties.categories[0],
    raw: f.properties
  }));
}

export async function reverseGeocode(lat, lng) {
  const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Reverse geocode failed');
  const data = await response.json();
  return data.features[0]?.properties;
}