import localforage from 'localforage';

const tileStore = localforage.createInstance({ name: 'mapTiles' });
const poiStore = localforage.createInstance({ name: 'nearbyPois' });

export const OFFLINE_RADIUS_KM = 50;

/**
 * Downloads and caches map tiles for a given region.
 * Caution: 50km radius at high zoom is heavy.
 */
export async function downloadRegion(lat, lng) {
  const zoomLevels = [12, 13, 14, 15];
  const radius = OFFLINE_RADIUS_KM;
  
  // Calculate bounding box for the radius
  const latOffset = radius / 111.32;
  const lngOffset = radius / (111.32 * Math.cos(lat * Math.PI / 180));
  
  const bounds = {
    minLat: lat - latOffset,
    maxLat: lat + latOffset,
    minLng: lng - lngOffset,
    maxLng: lng + lngOffset
  };

  const tasks = [];
  
  for (const z of zoomLevels) {
    const minTile = latLngToTile(bounds.maxLat, bounds.minLng, z);
    const maxTile = latLngToTile(bounds.minLat, bounds.maxLng, z);
    
    for (let x = minTile.x; x <= maxTile.x; x++) {
      for (let y = minTile.y; y <= maxTile.y; y++) {
        tasks.push(cacheTile(z, x, y));
      }
    }
  }
  
  // Parallel download with limit
  await parallelLimit(tasks, 5);
}

function latLngToTile(lat, lng, zoom) {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n);
  return { x, y };
}

async function cacheTile(z, x, y) {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const key = `${z}/${x}/${y}`;
  
  const existing = await tileStore.getItem(key);
  if (existing) return;

  try {
    const res = await fetch(url);
    const blob = await res.blob();
    await tileStore.setItem(key, blob);
  } catch (e) {
    console.error('Failed to cache tile:', key, e);
  }
}

export async function getCachedTile(z, x, y) {
  return await tileStore.getItem(`${z}/${x}/${y}`);
}

export async function cachePois(category, pois) {
  await poiStore.setItem(category, {
    timestamp: Date.now(),
    pois
  });
}

export async function getCachedPois(category) {
  return await poiStore.getItem(category);
}

// Simple parallel limit helper
async function parallelLimit(tasks, limit) {
  const results = [];
  const executing = [];
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task);
    results.push(p);
    if (limit <= tasks.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}
