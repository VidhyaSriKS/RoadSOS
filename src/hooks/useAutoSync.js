import { useEffect } from 'react';
import { downloadOfflineData } from '../utils/offlineDb';
import { getStoredLocation } from './useLocation';
import localforage from 'localforage';
import { calcDistance } from '../utils/places';

export function useAutoSync() {
  useEffect(() => {
    // Check location every 5 minutes
    const interval = setInterval(async () => {
      try {
        const loc = await getStoredLocation();
        const offlineStore = localforage.createInstance({ name: 'RoadSOS', storeName: 'offline_places' });
        const lastLoc = await offlineStore.getItem('last_download_loc');
        
        if (lastLoc) {
          const dist = calcDistance(loc.lat, loc.lng, lastLoc.lat, lastLoc.lng);
          
          // If the user has traveled more than 30km from the last download center, silently fetch the next batch
          if (dist > 30) {
            console.log(`Auto-sync: Traveled ${dist}km. Silently downloading next 50km radius of hospitals...`);
            await downloadOfflineData(loc.lat, loc.lng, 50);
            console.log('Auto-sync complete!');
          }
        }
      } catch (err) {
        // Expected to fail if device has lost network connection
        console.log("Auto-sync background check skipped (likely offline).", err);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);
}
