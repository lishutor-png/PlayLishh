import { AudioTrack } from '../types';

interface MediaSessionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
}

/**
 * Initializes and registers Media Session API handlers for system Control Center,
 * Notification Tray, Lockscreen, and Bluetooth/Wearable devices.
 */
export function setupMediaSession(callbacks: MediaSessionCallbacks): () => void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return () => {};
  }

  const ms = navigator.mediaSession;

  const safeSet = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      // Ignore unsupported optional actions in older browsers
    }
  };

  // 1. Playback Controls
  safeSet('play', () => {
    callbacks.onPlay();
  });

  safeSet('pause', () => {
    callbacks.onPause();
  });

  safeSet('previoustrack', () => {
    callbacks.onPrev();
  });

  safeSet('nexttrack', () => {
    callbacks.onNext();
  });

  safeSet('stop', () => {
    callbacks.onPause();
  });

  // 2. Seeking & Scrubber Controls in Android Notification / iOS Lockscreen
  safeSet('seekto', (details) => {
    if (details.seekTime !== undefined && !isNaN(details.seekTime)) {
      callbacks.onSeek(details.seekTime);
    }
  });

  safeSet('seekbackward', (details) => {
    const skip = details.seekOffset || 10;
    const audio = document.querySelector('audio');
    if (audio) {
      callbacks.onSeek(Math.max(0, audio.currentTime - skip));
    }
  });

  safeSet('seekforward', (details) => {
    const skip = details.seekOffset || 10;
    const audio = document.querySelector('audio');
    if (audio) {
      callbacks.onSeek(Math.min(audio.duration || 9999, audio.currentTime + skip));
    }
  });

  return () => {
    safeSet('play', null);
    safeSet('pause', null);
    safeSet('previoustrack', null);
    safeSet('nexttrack', null);
    safeSet('stop', null);
    safeSet('seekto', null);
    safeSet('seekbackward', null);
    safeSet('seekforward', null);
  };
}

/**
 * Updates track metadata in the system Control Center and Lockscreen.
 * Android OS MediaNotificationManager strictly requires absolute HTTP/HTTPS URLs and PNG/JPEG formats.
 */
export function updateMediaSessionMetadata(track: AudioTrack | null): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator) || !window.MediaMetadata) {
    return;
  }

  if (!track) {
    navigator.mediaSession.metadata = null;
    return;
  }

  const origin = window.location.origin;
  const defaultPngCover = `${origin}/music-cover-default.png`;
  const pwa512Url = `${origin}/pwa-512x512.png`;
  const pwa192Url = `${origin}/pwa-192x192.png`;

  let primaryArtwork = track.coverUrl;

  // Blob URLs from imported tracks cannot be loaded by the Android System Notification daemon!
  // In that case, we fall back to our high-resolution PNG music cover.
  if (!primaryArtwork || primaryArtwork.startsWith('blob:')) {
    primaryArtwork = defaultPngCover;
  } else if (!primaryArtwork.startsWith('http://') && !primaryArtwork.startsWith('https://')) {
    primaryArtwork = `${origin}${primaryArtwork.startsWith('/') ? '' : '/'}${primaryArtwork}`;
  }

  const artworkList: MediaImage[] = [
    { src: primaryArtwork, sizes: '512x512', type: 'image/png' },
    { src: defaultPngCover, sizes: '512x512', type: 'image/png' },
    { src: pwa512Url, sizes: '512x512', type: 'image/png' },
    { src: pwa192Url, sizes: '192x192', type: 'image/png' },
  ];

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || 'PlayLish Master Audio',
      album: track.album || 'PlayLish Hi-Res Audio',
      artwork: artworkList,
    });
  } catch (err) {
    console.warn('Failed to update MediaSession metadata:', err);
  }
}

/**
 * Updates playback status (playing/paused) in system Control Center.
 */
export function updateMediaSessionPlaybackState(isPlaying: boolean): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  try {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  } catch (err) {
    console.warn('Failed to update MediaSession playback state:', err);
  }
}

/**
 * Updates the timeline seekbar position in Android/iOS Control Center.
 */
export function updateMediaSessionPositionState(currentTime: number, duration: number): void {
  if (
    typeof window === 'undefined' ||
    !('mediaSession' in navigator) ||
    !('setPositionState' in navigator.mediaSession) ||
    !duration ||
    isNaN(duration) ||
    duration <= 0
  ) {
    return;
  }

  try {
    const validPos = Math.min(Math.max(0, currentTime), duration);
    navigator.mediaSession.setPositionState({
      duration: duration,
      playbackRate: 1.0,
      position: validPos,
    });
  } catch {
    // Ignore harmless position state errors
  }
}
