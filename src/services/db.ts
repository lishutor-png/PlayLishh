import { AudioTrack, Playlist, AudioSettings } from '../types';

const DB_NAME = 'PlayLishDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('tracks')) {
        const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
        trackStore.createIndex('addedAt', 'addedAt', { unique: false });
        trackStore.createIndex('format', 'format', { unique: false });
      }

      if (!db.objectStoreNames.contains('audioBlobs')) {
        db.createObjectStore('audioBlobs', { keyPath: 'trackId' });
      }

      if (!db.objectStoreNames.contains('playlists')) {
        const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
        playlistStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

// Track operations (Persists lightweight metadata in 'tracks' and binary File/Blob in 'audioBlobs' so songs always play after reopening the app)
export async function saveTrack(track: AudioTrack, audioBlob?: Blob): Promise<void> {
  const db = await getDB();
  const stores = audioBlob ? ['tracks', 'audioBlobs'] : ['tracks'];
  const tx = db.transaction(stores, 'readwrite');

  // Strip any inline blobData or oversized Base64 cover from metadata object
  const { blobData, ...trackMeta } = track;
  if (trackMeta.coverUrl && trackMeta.coverUrl.startsWith('data:') && trackMeta.coverUrl.length > 65000) {
    delete trackMeta.coverUrl;
  }

  tx.objectStore('tracks').put(trackMeta);

  const blobToSave = audioBlob || blobData;
  if (blobToSave && stores.includes('audioBlobs')) {
    tx.objectStore('audioBlobs').put({
      trackId: track.id,
      blob: blobToSave,
      updatedAt: Date.now(),
    });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface TrackWithBlobItem {
  track: AudioTrack;
  audioBlob?: Blob;
}

export async function saveTracksBatch(
  items: Array<AudioTrack | TrackWithBlobItem>
): Promise<void> {
  if (items.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(['tracks', 'audioBlobs'], 'readwrite');
  const trackStore = tx.objectStore('tracks');
  const blobStore = tx.objectStore('audioBlobs');
  const now = Date.now();

  for (const item of items) {
    const isWrapper = 'track' in item;
    const rawTrack = isWrapper ? item.track : item;
    const explicitBlob = isWrapper ? item.audioBlob : rawTrack.blobData;

    const { blobData, ...trackMeta } = rawTrack;
    if (trackMeta.coverUrl && trackMeta.coverUrl.startsWith('data:') && trackMeta.coverUrl.length > 65000) {
      delete trackMeta.coverUrl;
    }
    trackStore.put(trackMeta);

    const blobToPersist = explicitBlob || blobData;
    if (blobToPersist) {
      blobStore.put({
        trackId: rawTrack.id,
        blob: blobToPersist,
        updatedAt: now,
      });
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Removes only legacy built-in demo tracks from IndexedDB while keeping all user-imported audioBlobs intact!
 */
export async function purgeLegacyCopiedBlobs(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['tracks', 'audioBlobs', 'playlists'], 'readwrite');

    // Remove legacy built-in demo tracks & default demo playlist if present (NEVER clear user's audioBlobs!)
    const defaultIds = ['track-flac-01', 'track-wav-02', 'track-alac-03', 'track-flac-04'];
    const trackStore = tx.objectStore('tracks');
    const blobStore = tx.objectStore('audioBlobs');
    for (const id of defaultIds) {
      trackStore.delete(id);
      blobStore.delete(id);
    }

    const playlistStore = tx.objectStore('playlists');
    playlistStore.delete('pl-hires-master');

    const getAllPlReq = playlistStore.getAll();
    getAllPlReq.onsuccess = () => {
      const playlists: Playlist[] = getAllPlReq.result || [];
      playlists.forEach((pl) => {
        const filtered = pl.trackIds.filter((id) => !defaultIds.includes(id));
        if (filtered.length !== pl.trackIds.length) {
          pl.trackIds = filtered;
          pl.updatedAt = Date.now();
          playlistStore.put(pl);
        }
      });
    };
  } catch {
    // ignore
  }
}

/**
 * Deletes ALL tracks from the database and clears trackIds from all playlists.
 */
export async function clearAllTracks(): Promise<void> {
  try {
    localStorage.removeItem('playlish_last_track_id');
  } catch {
    // ignore
  }

  const db = await getDB();
  const tx = db.transaction(['tracks', 'audioBlobs', 'playlists'], 'readwrite');

  tx.objectStore('tracks').clear();
  if (db.objectStoreNames.contains('audioBlobs')) {
    tx.objectStore('audioBlobs').clear();
  }

  const playlistStore = tx.objectStore('playlists');
  const getAllPlaylistsReq = playlistStore.getAll();

  getAllPlaylistsReq.onsuccess = () => {
    const playlists: Playlist[] = getAllPlaylistsReq.result || [];
    playlists.forEach((pl) => {
      if (pl.trackIds.length > 0) {
        pl.trackIds = [];
        pl.updatedAt = Date.now();
        playlistStore.put(pl);
      }
    });
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllTracks(): Promise<AudioTrack[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readonly');
    const request = tx.objectStore('tracks').getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getTrackBlob(trackId: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('audioBlobs', 'readonly');
      const request = tx.objectStore('audioBlobs').get(trackId);
      request.onsuccess = () => {
        if (request.result && request.result.blob) {
          resolve(request.result.blob as Blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getAllStoredBlobTrackIds(): Promise<Set<string>> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('audioBlobs', 'readonly');
      const request = tx.objectStore('audioBlobs').getAllKeys();
      request.onsuccess = () => {
        const keys = (request.result || []).map((k) => String(k));
        resolve(new Set(keys));
      };
      request.onerror = () => resolve(new Set());
    });
  } catch {
    return new Set();
  }
}

export async function updateTrackLyrics(trackId: string, lyrics: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    const getReq = store.get(trackId);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const updated = { ...getReq.result, lyrics };
        store.put(updated);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTrack(trackId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['tracks', 'audioBlobs', 'playlists'], 'readwrite');
  
  tx.objectStore('tracks').delete(trackId);
  tx.objectStore('audioBlobs').delete(trackId);

  // Automatically remove this track from all playlists!
  const playlistStore = tx.objectStore('playlists');
  const getAllPlaylistsReq = playlistStore.getAll();
  
  getAllPlaylistsReq.onsuccess = () => {
    const playlists: Playlist[] = getAllPlaylistsReq.result || [];
    playlists.forEach(pl => {
      if (pl.trackIds.includes(trackId)) {
        pl.trackIds = pl.trackIds.filter(id => id !== trackId);
        pl.updatedAt = Date.now();
        playlistStore.put(pl);
      }
    });
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Playlist operations
export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readonly');
    const request = tx.objectStore('playlists').getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    tx.objectStore('playlists').put(playlist);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    tx.objectStore('playlists').delete(playlistId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Settings operations with synchronous localStorage fallback & IndexedDB durable storage
const SETTINGS_LOCAL_KEY = 'playlish_audio_settings_v2';
const LAST_TRACK_KEY = 'playlish_last_track_id';

export function getLocalStoredSettings(): Partial<AudioSettings> | null {
  try {
    const raw = localStorage.getItem(SETTINGS_LOCAL_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read settings from localStorage:', e);
  }
  return null;
}

export function saveLocalStoredSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Could not write settings to localStorage:', e);
  }
}

export function getStoredLastTrackId(): string | null {
  try {
    return localStorage.getItem(LAST_TRACK_KEY);
  } catch {
    return null;
  }
}

export function saveStoredLastTrackId(trackId: string): void {
  try {
    localStorage.setItem(LAST_TRACK_KEY, trackId);
  } catch {
    // Ignore storage errors
  }
}

export async function loadSettings(): Promise<Partial<AudioSettings> | null> {
  const local = getLocalStoredSettings();
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const request = tx.objectStore('settings').get('audio_settings');
      request.onsuccess = () => {
        if (request.result && request.result.value) {
          // Merge local and indexedDB for maximum reliability
          const merged = { ...local, ...request.result.value };
          saveLocalStoredSettings(merged);
          resolve(merged);
        } else {
          resolve(local);
        }
      };
      request.onerror = () => resolve(local);
    });
  } catch {
    return local;
  }
}

export async function saveSettings(settings: AudioSettings): Promise<void> {
  // 1. Immediately persist synchronously to localStorage to ensure no data loss on app close/kill
  saveLocalStoredSettings(settings);

  // 2. Persist to IndexedDB
  try {
    const db = await getDB();
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key: 'audio_settings', value: settings });
  } catch (err) {
    console.error('Failed to save settings to IndexedDB:', err);
  }
}
