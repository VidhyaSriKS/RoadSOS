/**
 * Overpass API — queries OSM directly with multiple tag combinations.
 * Used for categories where Geoapify's index is sparse (ambulance, towing)
 * AND for hospitals/repair where we need richer phone number coverage.
 *
 * OSM phone tags checked: phone, contact:phone, contact:mobile,
 * mobile, phone:mobile, phone1, phone2, tel
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Alternative mirrors if the primary is slow
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function buildOverpassQuery(lat, lng, radiusM, tagBlocks) {
  const parts = tagBlocks.flatMap(tags =>
    ['node', 'way', 'relation'].map(type => `  ${type}${tags}(around:${radiusM},${lat},${lng});`)
  );
  return `[out:json][timeout:30];\n(\n${parts.join('\n')}\n);\nout center;`;
}

/** Parse Overpass elements into the same shape as Geoapify results */
function parseElements(elements, typeLabel) {
  return elements
    .map(el => {
      const tags = el.tags || {};
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!lat || !lon) return null;

      const name =
        tags.name ||
        tags['name:en'] ||
        tags.operator ||
        tags.brand ||
        typeLabel;

      // Check every OSM phone tag variant in priority order
      const phone =
        tags.phone ||
        tags['contact:phone'] ||
        tags['contact:mobile'] ||
        tags.mobile ||
        tags['phone:mobile'] ||
        tags.phone1 ||
        tags.phone2 ||
        tags.tel ||
        tags['telephone'] ||
        null;

      const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
        .filter(Boolean)
        .join(', ') || tags['addr:full'] || null;

      return { id: String(el.id), lat, lon, name, address, phone, category: typeLabel, raw: tags };
    })
    .filter(Boolean);
}

async function fetchOverpass(query) {
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      return json.elements || [];
    } catch (e) {
      console.warn(`Overpass mirror ${url} failed:`, e.message);
    }
  }
  throw new Error('All Overpass mirrors failed');
}

/**
 * Fetch ambulance services near a location.
 * Searches for all common OSM tag combinations used in India.
 */
export async function fetchAmbulanceServices(lat, lng, radiusKm = 15) {
  const r = radiusKm * 1000;
  const query = buildOverpassQuery(lat, lng, r, [
    '["amenity"="ambulance_station"]',
    '["emergency"="ambulance_station"]',
    '["healthcare"="ambulance_station"]',
    '["emergency"="ambulance"]',
    '["amenity"="emergency_service"]["emergency:medical"="yes"]',
    '["operator"~"ambulance|108|GVK|EMRI|ZIQITZA|Falck",i]',
  ]);
  const elements = await fetchOverpass(query);
  return parseElements(elements, 'Ambulance Service');
}

/**
 * Fetch towing services near a location.
 */
export async function fetchTowingServices(lat, lng, radiusKm = 15) {
  const r = radiusKm * 1000;
  const query = buildOverpassQuery(lat, lng, r, [
    '["amenity"="vehicle_towing"]',
    '["service"="vehicle_towing"]',
    '["shop"="vehicle_towing"]',
    '["emergency"="towing"]',
    '["amenity"="car_repair"]["service:towing"="yes"]',
  ]);
  const elements = await fetchOverpass(query);
  return parseElements(elements, 'Towing Service');
}

/**
 * Fetch hospitals and clinics near a location.
 * Uses broader OSM tags to maximise phone number coverage.
 */
export async function fetchHospitals(lat, lng, radiusKm = 15) {
  const r = radiusKm * 1000;
  const query = buildOverpassQuery(lat, lng, r, [
    '["amenity"="hospital"]',
    '["amenity"="clinic"]',
    '["healthcare"="hospital"]',
    '["healthcare"="clinic"]',
    '["amenity"="doctors"]',
    '["healthcare"="centre"]',
  ]);
  const elements = await fetchOverpass(query);
  return parseElements(elements, 'Hospital');
}

/**
 * Fetch vehicle repair shops near a location.
 * Covers all OSM tag patterns used for garages / car repair in India.
 */
export async function fetchRepairShops(lat, lng, radiusKm = 15) {
  const r = radiusKm * 1000;
  const query = buildOverpassQuery(lat, lng, r, [
    '["amenity"="car_repair"]',
    '["shop"="car_repair"]',
    '["shop"="vehicle"]',
    '["craft"="car_repair"]',
    '["amenity"="motorcycle_repair"]',
    '["shop"="motorcycle_repair"]',
    '["craft"="motorcycle_repair"]',
    '["shop"="tyres"]',
    '["amenity"="service_station"]',
  ]);
  const elements = await fetchOverpass(query);
  return parseElements(elements, 'Repair Shop');
}
