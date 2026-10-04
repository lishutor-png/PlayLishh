import { Capacitor } from '@capacitor/core';
import { AudioTrack, AudioFormat } from '../types';

/**
 * Zero-Copy Direct Audio Stream Registry
 * Streams MP3/FLAC/WAV directly from native storage URI or File pointer without copying bytes into app DB.
 */
const inMemoryFileMap = new Map<string, File>();
const inMemoryHandleMap = new Map<string, any>();
let activeObjectUrl: string | null = null;

/**
 * Register a direct File reference or FileSystemFileHandle (Zero-Copy: holds OS pointer only)
 */
export function registerTrackFile(trackId: string, file?: File, handle?: any): void {
  if (file) {
    inMemoryFileMap.set(trackId, file);
  }
  if (handle) {
    inMemoryHandleMap.set(trackId, handle);
  }
}

/**
 * Remove file pointer when a track is removed from playlist/library
 */
export function unregisterTrackFile(trackId: string): void {
  inMemoryFileMap.delete(trackId);
  inMemoryHandleMap.delete(trackId);
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
 * Retrieve the File object if available in current session
 */
export async function getTrackAudioFile(track: AudioTrack): Promise<File | Blob | null> {
  const memFile = inMemoryFileMap.get(track.id);
  if (memFile) return memFile;

  const handle = inMemoryHandleMap.get(track.id);
  if (handle && typeof handle.getFile === 'function') {
    try {
      const file = await handle.getFile();
      if (file) {
        inMemoryFileMap.set(track.id, file);
        return file;
      }
    } catch (e) {
      console.warn('FileSystemFileHandle getFile warning:', e);
    }
  }

  return null;
}

/**
 * Resolves a direct playable URL for <audio src={...}> with deterministic ObjectURL cleanup.
 * Prevents memory leaks over multi-hour playback sessions.
 */
export async function resolveDirectStreamUrl(track: AudioTrack): Promise<string> {
  // 1. If track has a native Android content:// or file:// URL or HTTP URL, stream directly without Blob URL
  if (track.audioUrl && !track.audioUrl.startsWith('blob:')) {
    revokeActiveObjectUrl();
    return track.audioUrl;
  }

  // 2. If track has a direct File or FileSystemFileHandle pointer, create a single active ObjectURL
  const fileOrBlob = await getTrackAudioFile(track);
  if (fileOrBlob) {
    revokeActiveObjectUrl();
    activeObjectUrl = URL.createObjectURL(fileOrBlob);
    return activeObjectUrl;
  }

  return '';
}

/**
 * Revokes the previously active ObjectURL to guarantee 0 MB memory accumulation
 */
export function revokeActiveObjectUrl(): void {
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
