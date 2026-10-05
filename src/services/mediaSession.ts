import { AudioTrack } from '../types';

export interface MediaSessionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
}

interface PlayLishNativeBridge {
  updateMediaSession: (
    title: string,
    artist: string,
    album: string,
    isPlaying: boolean,
    positionMs: number,
    durationMs: number
  ) => void;
  updatePlaybackState: (
    isPlaying: boolean,
    positionMs: number,
    durationMs: number
  ) => void;
  stopMediaSession: () => void;
  scanDeviceAudio?: () => string;
  findAudioUriByName?: (fileName: string, title: string) => string;
  requestStoragePermission?: () => void;
  requestUnrestrictedBattery?: () => void;
  isIgnoringBatteryOptimizations?: () => boolean;
}

declare global {
  interface Window {
    PlayLishNativeBridge?: PlayLishNativeBridge;
  }
}

// Stable reference to callbacks so handlers are registered ONCE and never spammed
let currentCallbacks: MediaSessionCallbacks | null = null;
let isInitialized = false;
let lastPositionSyncTime = 0;
let lastSyncedTrackId: string | null = null;
let lastSyncedIsPlaying: boolean | null = null;

// Web Locks API Keep-Alive: Prevents Chromium / Android WebView from freezing page after 1 hour in background
let activeWebLockRelease: (() => void) | null = null;

function setWebPlaybackLock(active: boolean): void {
  if (typeof navigator === 'undefined' || !('locks' in navigator) || !navigator.locks) {
    return;
  }

  if (active) {
    if (activeWebLockRelease) return; // Already holding lock
    try {
      navigator.locks
        .request('playlish_active_audio_playback', { mode: 'exclusive' }, () => {
          return new Promise<void>((resolve) => {
            activeWebLockRelease = () => {
              activeWebLockRelease = null;
              resolve();
            };
          });
        })
        .catch(() => {
          activeWebLockRelease = null;
        });
    } catch {
      // ignore
    }
  } else {
    if (activeWebLockRelease) {
      const release = activeWebLockRelease;
      activeWebLockRelease = null;
      release();
    }
  }
}

export function isAndroidBatteryUnrestricted(): boolean {
  try {
    if (typeof window !== 'undefined' && window.PlayLishNativeBridge?.isIgnoringBatteryOptimizations) {
      return Boolean(window.PlayLishNativeBridge.isIgnoringBatteryOptimizations());
    }
  } catch {
    // ignore
  }
  return true;
}

export function requestAndroidUnrestrictedBattery(): void {
  try {
    if (typeof window !== 'undefined' && window.PlayLishNativeBridge?.requestUnrestrictedBattery) {
      window.PlayLishNativeBridge.requestUnrestrictedBattery();
    }
  } catch {
    // ignore
  }
}

/**
 * Registers MediaSession handlers once for both Web MediaSession API and
 * Native Android MediaPlaybackService (via PlayLishNativeBridge).
 */
export function initMediaSessionController(callbacks: MediaSessionCallbacks): () => void {
  currentCallbacks = callbacks;

  if (typeof window === 'undefined') {
    return () => {};
  }

  // Listen for Native Android Notification / Lockscreen / Bluetooth media button events
  const handleNativeEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ action: string; seekTime?: number }>;
    const detail = customEvent.detail;
    if (!detail || !currentCallbacks) return;

    switch (detail.action) {
      case 'play':
        currentCallbacks.onPlay();
        break;
      case 'pause':
      case 'stop':
        currentCallbacks.onPause();
        break;
      case 'next':
        currentCallbacks.onNext();
        break;
      case 'prev':
        currentCallbacks.onPrev();
        break;
      case 'seekto':
        if (typeof detail.seekTime === 'number' && !isNaN(detail.seekTime)) {
          currentCallbacks.onSeek(detail.seekTime);
        }
        break;
    }
  };

  window.addEventListener('playlish-native-action', handleNativeEvent);

  // Register standard Web MediaSession handlers once
  if ('mediaSession' in navigator && !isInitialized) {
    isInitialized = true;
    const ms = navigator.mediaSession;

    const safeSetHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null
    ) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Ignore unsupported actions on specific WebView versions
      }
    };

    safeSetHandler('play', () => currentCallbacks?.onPlay());
    safeSetHandler('pause', () => currentCallbacks?.onPause());
    safeSetHandler('previoustrack', () => currentCallbacks?.onPrev());
    safeSetHandler('nexttrack', () => currentCallbacks?.onNext());
    safeSetHandler('stop', () => currentCallbacks?.onPause());

    safeSetHandler('seekto', (details) => {
      if (details.seekTime !== undefined && !isNaN(details.seekTime)) {
        currentCallbacks?.onSeek(details.seekTime);
      }
    });

    safeSetHandler('seekbackward', (details) => {
      const skip = details.seekOffset || 10;
      const audio = document.querySelector('audio');
      if (audio && currentCallbacks) {
        currentCallbacks.onSeek(Math.max(0, audio.currentTime - skip));
      }
    });

    safeSetHandler('seekforward', (details) => {
      const skip = details.seekOffset || 10;
      const audio = document.querySelector('audio');
      if (audio && currentCallbacks) {
        currentCallbacks.onSeek(Math.min(audio.duration || 9999, audio.currentTime + skip));
      }
    });
  }

  return () => {
    window.removeEventListener('playlish-native-action', handleNativeEvent);
  };
}

/**
 * Publishes track metadata to both Android Native MediaSession Service and Web MediaSession.
 * Avoids passing large base64/blob strings over IPC to prevent Android TransactionTooLargeException.
 */
export function publishMediaTrackMetadata(
  track: AudioTrack | null,
  isPlaying: boolean = false,
  currentTimeSec: number = 0,
  durationSec: number = 0
): void {
  if (typeof window === 'undefined') return;

  if (!track) {
    setWebPlaybackLock(false);
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      } catch {
        // ignore
      }
    }
    try {
      window.PlayLishNativeBridge?.stopMediaSession();
    } catch {
      // ignore
    }
    lastSyncedTrackId = null;
    return;
  }

  setWebPlaybackLock(isPlaying);

  const title = track.title || 'PlayLish Audio';
  const artist = track.artist || 'PlayLish Hi-Res';
  const album = track.album || 'Koleksi Lokal';
  const effectiveDuration = durationSec > 0 ? durationSec : track.duration || 0;

  // 1. Update Native Android MediaSession Foreground Service if running in APK
  try {
    if (window.PlayLishNativeBridge) {
      window.PlayLishNativeBridge.updateMediaSession(
        title,
        artist,
        album,
        isPlaying,
        Math.round(currentTimeSec * 1000),
        Math.round(effectiveDuration * 1000)
      );
    }
  } catch (e) {
    console.warn('Native MediaSession bridge update warning:', e);
  }

  // 2. Update Web MediaSession API
  if ('mediaSession' in navigator && typeof window.MediaMetadata !== 'undefined') {
    const origin = window.location.origin;
    const defaultCover = `${origin}/music-cover-default.png`;
    const icon512 = `${origin}/pwa-512x512.png`;
    const icon192 = `${origin}/pwa-192x192.png`;

    // Only use safe HTTP/HTTPS URLs or small data URIs (< 64KB) to prevent Binder IPC overflow
    let safeArtworkUrl = defaultCover;
    if (track.coverUrl) {
      if (track.coverUrl.startsWith('http://') || track.coverUrl.startsWith('https://')) {
        safeArtworkUrl = track.coverUrl;
      } else if (track.coverUrl.startsWith('data:') && track.coverUrl.length < 65000) {
        safeArtworkUrl = track.coverUrl;
      } else if (track.coverUrl.startsWith('/')) {
        safeArtworkUrl = `${origin}${track.coverUrl}`;
      }
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: [
          { src: safeArtworkUrl, sizes: '512x512', type: 'image/png' },
          { src: icon512, sizes: '512x512', type: 'image/png' },
          { src: icon192, sizes: '192x192', type: 'image/png' },
        ],
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (err) {
      console.warn('Web MediaMetadata error:', err);
    }
  }

  lastSyncedTrackId = track.id;
  lastSyncedIsPlaying = isPlaying;
}

/**
 * Synchronizes play/pause state and position with zero IPC spam.
 * Only sends updates when playback state changes, user seeks, or every 15s for drift correction.
 */
export function syncMediaPlaybackState(
  track: AudioTrack | null,
  isPlaying: boolean,
  currentTimeSec: number,
  durationSec: number,
  forceSync: boolean = false
): void {
  if (typeof window === 'undefined' || !track) return;

  const now = Date.now();
  const stateChanged =
    lastSyncedIsPlaying !== isPlaying || lastSyncedTrackId !== track.id;
  const shouldSyncPosition =
    forceSync || stateChanged || now - lastPositionSyncTime > 15000;

  if (!shouldSyncPosition) return;

  setWebPlaybackLock(isPlaying);
  lastPositionSyncTime = now;
  lastSyncedIsPlaying = isPlaying;

  const effectiveDuration = durationSec > 0 ? durationSec : track.duration || 0;
  const safeCurrentTime = Math.max(
    0,
    effectiveDuration > 0 ? Math.min(currentTimeSec, effectiveDuration) : currentTimeSec
  );

  // 1. Update Native Android Service
  try {
    if (window.PlayLishNativeBridge) {
      if (lastSyncedTrackId !== track.id) {
        publishMediaTrackMetadata(track, isPlaying, safeCurrentTime, effectiveDuration);
      } else {
        window.PlayLishNativeBridge.updatePlaybackState(
          isPlaying,
          Math.round(safeCurrentTime * 1000),
          Math.round(effectiveDuration * 1000)
        );
      }
    }
  } catch {
    // ignore
  }

  // 2. Update Web MediaSession
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      if (
        'setPositionState' in navigator.mediaSession &&
        effectiveDuration > 0 &&
        isFinite(effectiveDuration)
      ) {
        navigator.mediaSession.setPositionState({
          duration: effectiveDuration,
          playbackRate: 1.0,
          position: safeCurrentTime,
        });
      }
    } catch {
      // ignore position state errors
    }
  }
}
