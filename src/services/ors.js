import { CONFIG } from '../config';
const ORS_KEY = CONFIG.ORS_KEY;

export async function getRoute(startLat, startLng, endLat, endLng) {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_KEY}&start=${startLng},${startLat}&end=${endLng},${endLat}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('ORS fetch failed');
  const data = await response.json();
  
  return {
    geometry: data.features[0].geometry,
    summary: data.features[0].properties.summary, // distance, duration
  };
}
