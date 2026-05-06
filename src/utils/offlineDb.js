import localforage from 'localforage';
import { fetchNearby, TYPE_MAP } from './places';

// Initialize a specific store for offline emergency data
const offlineStore = localforage.createInstance({
  name: 'RoadSOS',
  storeName: 'offline_places'
});

export async function downloadOfflineData(lat, lng, radiusKm = 50) {
  try {
    const tags = [
      { key: 'amenity', val: 'hospital' },
      { key: 'amenity', val: 'police' },
      { key: 'shop', val: 'car_repair' },
      { key: 'amenity', val: 'vehicle_recovery' },
      { key: 'shop', val: 'tyres' },
      { key: 'amenity', val: 'ambulance_station' },
      { key: 'amenity', val: 'fire_station' },
      { key: 'amenity', val: 'pharmacy' }
    ];
    // Download all in a wide radius (e.g. 50km)
    const elements = await fetchNearby(lat, lng, tags, null, radiusKm, true);
    
    if (elements && elements.length > 0) {
      await offlineStore.setItem('all_services', elements);
      await offlineStore.setItem('last_download', new Date().toISOString());
      await offlineStore.setItem('last_download_loc', { lat, lng });
      return elements.length;
    }
    return 0;
  } catch (error) {
    console.error('Failed to download offline data', error);
    throw error;
  }
}

export async function getOfflineData() {
  try {
    const data = await offlineStore.getItem('all_services');
    return data || [];
  } catch (error) {
    console.error('Failed to get offline data', error);
    return [];
  }
}

export async function getOfflineDownloadDate() {
  try {
    return await offlineStore.getItem('last_download');
  } catch (e) {
    return null;
  }
}
