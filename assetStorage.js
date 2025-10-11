// IndexedDB storage for PDF assets (no size limits)

const DB_NAME = 'BibWebAssets';
const DB_VERSION = 2; // Incremented to add settings store
const STORE_NAME = 'assets';
const SETTINGS_STORE = 'settings';

let db = null;

// Initialize IndexedDB
export async function initAssetStorage() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      console.log('[AssetDB] Database initialized');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create assets store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
        console.log('[AssetDB] Assets store created');
      }
      
      // Create settings store if it doesn't exist
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
        console.log('[AssetDB] Settings store created');
      }
    };
  });
}

// Save asset to IndexedDB
export async function saveAsset(name, file) {
  if (!db) await initAssetStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const asset = {
      name: name,
      blob: file,
      size: file.size,
      type: file.type,
      savedAt: Date.now()
    };
    
    const request = store.put(asset);
    request.onsuccess = () => {
      console.log(`[AssetDB] Saved ${name} (${(file.size / 1024).toFixed(1)} KB)`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Get asset from IndexedDB
export async function getAsset(name) {
  if (!db) await initAssetStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(name);
    
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.blob : null);
    };
    request.onerror = () => reject(request.error);
  });
}

// Get all asset names
export async function getAllAssetNames() {
  if (!db) await initAssetStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all assets
export async function getAllAssets() {
  if (!db) await initAssetStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const assets = {};
      request.result.forEach(item => {
        assets[item.name] = item.blob;
      });
      resolve(assets);
    };
    request.onerror = () => reject(request.error);
  });
}

// Delete asset
export async function deleteAsset(name) {
  if (!db) await initAssetStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(name);
    
    request.onsuccess = () => {
      console.log(`[AssetDB] Deleted ${name}`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Clear all assets
export async function clearAllAssets() {
  if (!db) await initAssetStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => {
      console.log('[AssetDB] All assets cleared');
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Get total storage size
export async function getStorageSize() {
  if (!db) await initAssetStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const totalSize = request.result.reduce((sum, item) => sum + (item.size || 0), 0);
      resolve(totalSize);
    };
    request.onerror = () => reject(request.error);
  });
}

// Save a setting to IndexedDB
export async function saveSetting(key, value) {
  if (!db) await initAssetStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    
    const request = store.put({ key, value });
    request.onsuccess = () => {
      console.log(`[AssetDB] Saved setting: ${key}`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Get a setting from IndexedDB
export async function getSetting(key) {
  if (!db) await initAssetStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETTINGS_STORE], 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get(key);
    
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}
