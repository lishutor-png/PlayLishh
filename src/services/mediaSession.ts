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

  try {
    ms.setActionHandler('play', () => {
      callbacks.onPlay();
    });

    ms.setActionHandler('pause', () => {
      callbacks.onPause();
    });

    ms.setActionHandler('previoustrack', () => {
      callbacks.onPrev();
    });

    ms.setActionHandler('nexttrack', () => {
      callbacks.onNext();
    });

    ms.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && !isNaN(details.seekTime)) {
        callbacks.onSeek(details.seekTime);
      }
    });

    ms.setActionHandler('seekbackward', (details) => {
      const skip = details.seekOffset || 10;
      // We pass relative seek through seekto handler or fallback
      const audio = document.querySelector('audio');
      if (audio) {
        callbacks.onSeek(Math.max(0, audio.currentTime - skip));
      }
    });

    ms.setActionHandler('seekforward', (details) => {
      const skip = details.seekOffset || 10;
      const audio = document.querySelector('audio');
      if (audio) {
        callbacks.onSeek(Math.min(audio.duration || 9999, audio.currentTime + skip));
      }
    });

    ms.setActionHandler('stop', () => {
      callbacks.onPause();
    });
  } catch (err) {
    console.warn('Could not register some Media Session action handlers:', err);
  }

  return () => {
    try {
      ms.setActionHandler('play', null);
      ms.setActionHandler('pause', null);
      ms.setActionHandler('previoustrack', null);
      ms.setActionHandler('nexttrack', null);
      ms.setActionHandler('seekto', null);
      ms.setActionHandler('seekbackward', null);
      ms.setActionHandler('seekforward', null);
      ms.setActionHandler('stop', null);
    } catch {
      // Ignore cleanup error
    }
  };
}

/**
 * Updates track metadata in the system Control Center and Lockscreen.
 */
export function updateMediaSessionMetadata(track: AudioTrack | null): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator) || !window.MediaMetadata) {
    return;
  }

  if (!track) {
    navigator.mediaSession.metadata = null;
    return;
  }

  const artworkList: MediaImage[] = [];

  if (track.coverUrl) {
    artworkList.push(
      { src: track.coverUrl, sizes: '96x96', type: 'image/jpeg' },
      { src: track.coverUrl, sizes: '128x128', type: 'image/jpeg' },
      { src: track.coverUrl, sizes: '192x192', type: 'image/jpeg' },
      { src: track.coverUrl, sizes: '256x256', type: 'image/jpeg' },
      { src: track.coverUrl, sizes: '384x384', type: 'image/jpeg' },
      { src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' }
    );
  } else {
    // Fallback to high-res app music player logo
    artworkList.push(
      { src: '/app-logo.svg', sizes: '512x512', type: 'image/svg+xml' }
    );
  }

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || 'PlayLish Artist',
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
    // Some browsers throw if position is out of range or rapidly changing; safe to ignore
  }
}
