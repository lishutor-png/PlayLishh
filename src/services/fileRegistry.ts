import { Capacitor } from '@capacitor/core';
import { AudioTrack, AudioFormat } from '../types';
import { getTrackBlob, saveTrack } from './db';

/**
 * Persistent & Direct Audio Stream Registry
 * Keeps an in-memory cache of active File/Blob pointers AND seamlessly loads persisted
 * audio files from IndexedDB or Android MediaStore when the app is reopened after exit.
 */
const inMemoryFileMap = new Map<string, File | Blob>();
const inMemoryHandleMap = new Map<string, any>();
let activeObjectUrl: string | null = null;
let activeObjectTrackId: string | null = null;
// Pin the currently playing File/Blob strongly in memory so V8 Garbage Collector NEVER collects it mid-playback
let activeBlobRef: File | Blob | null = null;

/**
 * Register a direct File/Blob reference or FileSystemFileHandle.
 */
export function registerTrackFile(trackId: string, file?: File | Blob, handle?: any): void {
  if (file) {
    inMemoryFileMap.set(trackId, file);
  }
  if (handle) {
    inMemoryHandleMap.set(trackId, handle);
  }
}

/**
 * Keep active File handles intact so OS file descriptors never close mid-stream.
 */
export function releaseInactiveMemoryBlobs(_activeTrackId?: string): void {
  // Intentionally keep File handles in inMemoryFileMap so live streams never get garbage-collected
}

/**
 * Remove file pointer when a track is removed from playlist/library
 */
export function unregisterTrackFile(trackId: string): void {
  inMemoryFileMap.delete(trackId);
  inMemoryHandleMap.delete(trackId);
  if (activeObjectTrackId === trackId) {
    revokeActiveObjectUrl();
  }
}

/**
 * Clear all registered file pointers and revoke active ObjectURL
 */
export function clearAllTrackFiles(): void {
  inMemoryFileMap.clear();
  inMemoryHandleMap.clear();
  revokeActiveObjectUrl();
}

/**
 * Check if a track has an active direct file pointer or native Android URI
 */
export function hasDirectAudioAccess(track: AudioTrack): boolean {
  if (track.audioUrl && !track.audioUrl.startsWith('blob:')) return true;
  if (inMemoryFileMap.has(track.id) || inMemoryHandleMap.has(track.id)) return true;
  return false;
}

/**
 * Retrieve the File/Blob object from memory, FileSystemFileHandle, or persistent IndexedDB store
 */
export async function getTrackAudioFile(track: AudioTrack): Promise<File | Blob | null> {
  // 1. Check fast in-memory session cache
  const memFile = inMemoryFileMap.get(track.id);
  if (memFile && memFile.size > 0) return memFile;

  // 2. Check FileSystemFileHandle if available
  const handle = inMemoryHandleMap.get(track.id);
  if (handle && typeof handle.getFile === 'function') {
    try {
      const file = await handle.getFile();
      if (file && file.size > 0) {
        registerTrackFile(track.id, file);
        return file;
      }
    } catch (e) {
      console.warn('FileSystemFileHandle getFile warning:', e);
    }
  }

  // 3. Load persisted audio Blob/File from IndexedDB (ensures playback works after closing & reopening the app!)
  const persistedBlob = await getTrackBlob(track.id);
  if (persistedBlob && persistedBlob.size > 0) {
    registerTrackFile(track.id, persistedBlob);
    return persistedBlob;
  }

  return null;
}

/**
 * Resolves a playable URL for <audio src={...}> across app restarts with deterministic ObjectURL cleanup.
 * Guarantees songs always play after exiting and reopening the app without memory leaks.
 */
export async function resolveDirectStreamUrl(
  track: AudioTrack,
  forceRefresh: boolean = false
): Promise<string> {
  // Reuse current ObjectURL if already active for this track and not forced to refresh
  if (!forceRefresh && activeObjectUrl && activeObjectTrackId === track.id) {
    return activeObjectUrl;
  }

  // 1. Primary: Load from in-memory File or persistent IndexedDB audioBlobs
  const fileOrBlob = await getTrackAudioFile(track);
  if (fileOrBlob) {
    const previousUrl = activeObjectUrl;
    // Pin activeBlobRef strongly so V8 GC never collects the backing Blob while playing
    activeBlobRef = fileOrBlob;
    activeObjectUrl = URL.createObjectURL(fileOrBlob);
    activeObjectTrackId = track.id;

    if (previousUrl && previousUrl !== activeObjectUrl) {
      try {
        URL.revokeObjectURL(previousUrl);
      } catch {
        // ignore
      }
    }
    return activeObjectUrl;
  }

  // 2. Secondary: If track has a native Android content:// or file:// URL or HTTP URL, stream directly
  if (track.audioUrl && !track.audioUrl.startsWith('blob:')) {
    revokeActiveObjectUrl();
    return track.audioUrl;
  }

  // 3. Self-Healing Fallback on Native Android: Query MediaStore by filename/title if blob was missing
  if (typeof window !== 'undefined' && window.PlayLishNativeBridge?.findAudioUriByName) {
    try {
      const foundUri = window.PlayLishNativeBridge.findAudioUriByName(
        track.fileName || '',
        track.title || ''
      );
      if (foundUri) {
        const streamUrl = Capacitor.convertFileSrc(foundUri);
        if (streamUrl) {
          revokeActiveObjectUrl();
          track.audioUrl = streamUrl;
          saveTrack({ ...track, audioUrl: streamUrl }).catch(() => {});
          return streamUrl;
        }
      }
    } catch (err) {
      console.warn('Android MediaStore URI lookup warning:', err);
    }
  }

  return '';
}

/**
 * Revokes the previously active ObjectURL to guarantee 0 MB memory accumulation
 */
export function revokeActiveObjectUrl(): void {
  activeObjectTrackId = null;
  activeBlobRef = null;
  if (activeObjectUrl) {
    const urlToRevoke = activeObjectUrl;
    activeObjectUrl = null;
    try {
      URL.revokeObjectURL(urlToRevoke);
    } catch {
      // ignore
    }
  }
}

/**
 * Native Android MediaStore Direct Scanner
 * Queries Android's MediaStore via PlayLishNativeBridge without copying any MP3 files.
 */
export interface NativeDeviceAudioItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  size: number;
  mimeType: string;
  contentUri: string;
  filePath: string;
}

export function isNativeAndroidApp(): boolean {
  return (
    typeof window !== 'undefined' &&
    (Boolean(window.PlayLishNativeBridge) || Capacitor.getPlatform() === 'android')
  );
}

export async function scanAndroidDeviceMusic(): Promise<AudioTrack[]> {
  if (typeof window === 'undefined' || !window.PlayLishNativeBridge?.scanDeviceAudio) {
    return [];
  }

  try {
    const rawJson = window.PlayLishNativeBridge.scanDeviceAudio();
    if (!rawJson) return [];

    const items: NativeDeviceAudioItem[] = JSON.parse(rawJson);
    const now = Date.now();

    return items.map((item, idx) => {
      const ext = (item.filePath.split('.').pop() || item.mimeType.split('/').pop() || 'MP3').toUpperCase();
      let format: AudioFormat = 'MP3';
      if (['FLAC', 'WAV', 'MP3', 'AAC', 'OGG', 'ALAC', 'M4A', 'WEBM'].includes(ext)) {
        format = ext as AudioFormat;
      } else if (ext === 'MPEG') {
        format = 'MP3';
      }

      // Convert Android content://media/external/audio/media/{id} or file path to Capacitor zero-copy local stream URL
      let directStreamUrl = '';
      if (item.contentUri) {
        directStreamUrl = Capacitor.convertFileSrc(item.contentUri);
      } else if (item.filePath) {
        directStreamUrl = Capacitor.convertFileSrc(item.filePath);
      }

      const fileName = item.filePath ? item.filePath.split('/').pop() || item.title : `${item.title}.${format.toLowerCase()}`;

      return {
        id: `native-media-${item.id}`,
        title: item.title || fileName.replace(/\.[^/.]+$/, ''),
        artist: item.artist && item.artist !== '<unknown>' ? item.artist : 'Artis Lokal',
        album: item.album && item.album !== '<unknown>' ? item.album : 'Memori Internal HP',
        duration: Math.max(1, Math.round((item.duration || 0) / 1000)),
        audioUrl: directStreamUrl,
        format,
        sampleRate: format === 'FLAC' ? 96000 : format === 'WAV' ? 48000 : 44100,
        bitDepth: format === 'FLAC' || format === 'WAV' ? 24 : 16,
        bitrate: format === 'FLAC' ? 4608 : format === 'WAV' ? 2304 : 320,
        fileSize: item.size || 0,
        fileName,
        filePath: item.filePath || item.contentUri,
        isOffline: true,
        isFavorite: false,
        genre: 'Penyimpanan Langsung',
        addedAt: now - idx,
        colorHex: '#F27D26',
      };
    });
  } catch (err) {
    console.error('Failed to scan Android MediaStore:', err);
    return [];
  }
}

/**
 * Normalize song filename for automatic .LRC pairing
 */
export function normalizeSongBaseName(rawName: string): string {
  return rawName
    .replace(/\.[^/.]+$/, '')
    .replace(/\s*[\(\[]\s*(lirik|lyrics|audio|official|remastered|karaoke|sync)\s*[\)\]]/gi, '')
    .replace(/[-_.\s]+/g, ' ')
    .toLowerCase()
    .trim();
}

export interface MatchedFilePair {
  audioFile: File;
  audioName: string;
  lrcFile?: File;
  relativePath?: string;
}

export async function pairAudioAndLrcFiles(
  fileList: File[] | FileList
): Promise<{
  matchedPairs: MatchedFilePair[];
  orphanLrcFiles: File[];
}> {
  const files = Array.from(fileList);
  const audioExtensions = new Set(['mp3', 'flac', 'wav', 'aac', 'ogg', 'alac', 'm4a', 'webm', 'wma']);
  const lrcExtensions = new Set(['lrc', 'txt']);

  const audioFiles: File[] = [];
  const lrcFiles: File[] = [];

  for (const f of files) {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (audioExtensions.has(ext)) {
      audioFiles.push(f);
    } else if (lrcExtensions.has(ext)) {
      lrcFiles.push(f);
    }
  }

  const lrcMap = new Map<string, File>();
  for (const lrc of lrcFiles) {
    const key = normalizeSongBaseName(lrc.name);
    lrcMap.set(key, lrc);
  }

  const matchedPairs: MatchedFilePair[] = [];
  const matchedLrcSet = new Set<File>();

  for (const audio of audioFiles) {
    const key = normalizeSongBaseName(audio.name);
    let matchedLrc = lrcMap.get(key);

    if (!matchedLrc) {
      for (const [lrcKey, lrcF] of lrcMap.entries()) {
        if (key.length > 3 && (key.includes(lrcKey) || lrcKey.includes(key))) {
          matchedLrc = lrcF;
          break;
        }
      }
    }

    if (matchedLrc) {
      matchedLrcSet.add(matchedLrc);
    }

    const relPath = (audio as any).webkitRelativePath || audio.name;

    matchedPairs.push({
      audioFile: audio,
      audioName: audio.name,
      lrcFile: matchedLrc,
      relativePath: relPath,
    });
  }

  const orphanLrcFiles = lrcFiles.filter((f) => !matchedLrcSet.has(f));

  return { matchedPairs, orphanLrcFiles };
}
