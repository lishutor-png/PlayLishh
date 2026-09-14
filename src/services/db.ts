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

// Track operations
export async function saveTrack(track: AudioTrack, audioBlob?: Blob): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['tracks', 'audioBlobs'], 'readwrite');
  
  // Strip blobData from metadata object before storing in tracks store
  const { blobData, ...trackMeta } = track;
  
  tx.objectStore('tracks').put(trackMeta);
  
  if (audioBlob || blobData) {
    const blobToStore = audioBlob || blobData;
    tx.objectStore('audioBlobs').put({
      trackId: track.id,
      blob: blobToStore,
      mimeType: blobToStore?.type || 'audio/mp3',
      savedAt: Date.now()
    });
  }

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
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioBlobs', 'readonly');
    const request = tx.objectStore('audioBlobs').get(trackId);
    request.onsuccess = () => {
      if (request.result && request.result.blob) {
        resolve(request.result.blob);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
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
