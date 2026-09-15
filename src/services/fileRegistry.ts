import { getTrackBlob, saveTrack } from './db';
import { AudioTrack } from '../types';

/**
 * In-Memory & Handle-based Registry for Audio Files
 * Enables direct streaming from local file addresses/references without duplicating audio bytes.
 */
const inMemoryFileMap = new Map<string, File>();
const inMemoryHandleMap = new Map<string, any>();
const activeStreamUrls = new Map<string, string>();

/**
 * Register a native File or FileHandle for a track.
 */
export function registerTrackFile(trackId: string, file: File, handle?: any): void {
  inMemoryFileMap.set(trackId, file);
  if (handle) {
    inMemoryHandleMap.set(trackId, handle);
  }
}

/**
 * Check if a file is already held in memory for immediate playback
 */
export function hasInMemoryFile(trackId: string): boolean {
  return inMemoryFileMap.has(trackId);
}

/**
 * Retrieve the native File or Blob for playback.
 * 1. Checks fast in-memory File reference (zero disk I/O, zero DB latency)
 * 2. Checks native FileSystemFileHandle if available
 * 3. Falls back to IndexedDB audioBlobs store
 */
export async function getTrackAudioFile(track: AudioTrack): Promise<File | Blob | null> {
  // 1. Direct in-memory file reference
  const memFile = inMemoryFileMap.get(track.id);
  if (memFile) {
    return memFile;
  }

  // 2. FileSystemFileHandle
  const handle = inMemoryHandleMap.get(track.id);
  if (handle && typeof handle.getFile === 'function') {
    try {
      const file = await handle.getFile();
      if (file) {
        inMemoryFileMap.set(track.id, file);
        return file;
      }
    } catch (e) {
      console.warn('Handle getFile failed, falling back to DB:', e);
    }
  }

  // 3. Fallback to IndexedDB
  const dbBlob = await getTrackBlob(track.id);
  if (dbBlob) {
    return dbBlob;
  }

  return null;
}

/**
 * Create or reuse a stream URL for audio playback
 */
export async function createTrackStreamUrl(track: AudioTrack): Promise<string | null> {
  const fileOrBlob = await getTrackAudioFile(track);
  if (!fileOrBlob) {
    if (track.audioUrl) return track.audioUrl;
    return null;
  }

  // Revoke previous URL for this track if present
  const oldUrl = activeStreamUrls.get(track.id);
  if (oldUrl) {
    try {
      URL.revokeObjectURL(oldUrl);
    } catch {
      // ignore
    }
  }

  const newUrl = URL.createObjectURL(fileOrBlob);
  activeStreamUrls.set(track.id, newUrl);
  return newUrl;
}

/**
 * Clean up active stream URLs
 */
export function revokeTrackStreamUrl(trackId: string): void {
  const url = activeStreamUrls.get(trackId);
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
    activeStreamUrls.delete(trackId);
  }
}

/**
 * Clean string for base matching
 */
export function normalizeSongBaseName(rawName: string): string {
  return rawName
    .replace(/\.[^/.]+$/, '') // remove extension (.mp3, .lrc, etc)
    .replace(/\s*[\(\[]\s*(lirik|lyrics|audio|official|remastered|karaoke|sync)\s*[\)\]]/gi, '')
    .replace(/[-_.\s]+/g, ' ')
    .toLowerCase()
    .trim();
}

/**
 * Automatic LRC Matching Engine:
 * Matches audio files with .lrc or .txt files sharing the same name or relative location.
 */
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

  // Map of normalized base names to LRC file
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

    // Fallback: check if any lrc file name is contained or contains audio name
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
