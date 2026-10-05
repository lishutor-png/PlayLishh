import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  AudioTrack,
  Playlist,
  AudioSettings,
  SleepTimerConfig,
  ActiveTab,
  AudioFormat,
  PlaybackSource,
} from './types';
import {
  getAllTracks,
  saveTrack,
  saveTracksBatch,
  TrackWithBlobItem,
  purgeLegacyCopiedBlobs,
  clearAllTracks,
  updateTrackLyrics,
  deleteTrack as deleteTrackDB,
  getAllPlaylists,
  savePlaylist,
  deletePlaylist as deletePlaylistDB,
  loadSettings,
  saveSettings,
  getLocalStoredSettings,
  getStoredLastTrackId,
  saveStoredLastTrackId,
} from './services/db';
import {
  registerTrackFile,
  unregisterTrackFile,
  clearAllTrackFiles,
  releaseInactiveMemoryBlobs,
  resolveDirectStreamUrl,
  pairAudioAndLrcFiles,
  normalizeSongBaseName,
  scanAndroidDeviceMusic,
} from './services/fileRegistry';
import { extractAudioMetadata } from './services/metadataExtractor';
import { audioEngine } from './services/audioEngine';
import {
  initMediaSessionController,
  publishMediaTrackMetadata,
  syncMediaPlaybackState,
} from './services/mediaSession';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { BottomNav } from './components/BottomNav';
import { TracksView } from './components/TracksView';
import { PlaylistView } from './components/PlaylistView';
import { EqualizerView } from './components/EqualizerView';
import { SettingsView } from './components/SettingsView';
import { NowPlayingBar } from './components/NowPlayingBar';
import { NowPlayingFull } from './components/NowPlayingFull';
import { SleepTimerModal } from './components/SleepTimerModal';
import { LyricEditorModal } from './components/LyricEditorModal';

const DEFAULT_SETTINGS: AudioSettings = {
  volume: 0.75,
  safeVolumeLimit: 0.8, // 80% Safe hearing threshold
  safeVolumeEnforced: true,
  gainBoost: 1.0, // 1.0 = 0dB
  autoGainNormalize: false,
  bassBoost: 0,
  virtualizer: 0,
  equalizerBands: [0, 0, 0, 0, 0],
  currentPresetId: 'flat',
  repeatMode: 'all',
  shuffle: false,
  offlineOnly: false,
};

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateShuffledQueue(trackList: AudioTrack[], startingTrack?: AudioTrack): AudioTrack[] {
  if (trackList.length <= 1) return [...trackList];
  if (startingTrack) {
    const remaining = trackList.filter((t) => t.id !== startingTrack.id);
    const shuffledRemaining = shuffleArray(remaining);
    return [startingTrack, ...shuffledRemaining];
  }
  return shuffleArray(trackList);
}

export default function App() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('tracks');
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [originalQueue, setOriginalQueue] = useState<AudioTrack[]>([]);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource>({
    type: 'all',
    title: 'Semua Lagu',
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isSleepTimerModalOpen, setIsSleepTimerModalOpen] = useState(false);
  const [editingLyricTrack, setEditingLyricTrack] = useState<AudioTrack | null>(null);

  // Initialize settings synchronously from local storage if available to eliminate any reset on startup
  const [settings, setSettings] = useState<AudioSettings>(() => {
    const local = getLocalStoredSettings();
    if (local) {
      return { ...DEFAULT_SETTINGS, ...local };
    }
    return DEFAULT_SETTINGS;
  });

  const [sleepTimer, setSleepTimer] = useState<SleepTimerConfig>({
    active: false,
    hours: 0,
    minutes: 30,
    totalSeconds: 1800,
    remainingSeconds: 1800,
    targetEndTime: null,
    fadeOutSeconds: 30,
    autoFade: true,
  });

  const [importNotification, setImportNotification] = useState<{
    show: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPrevClickRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0);

  // Initialize DB, request durable storage, & restore persisted tracks + settings
  useEffect(() => {
    async function initData() {
      try {
        // Request persistent storage so OS/browser never evicts IndexedDB audioBlobs when exiting app
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(() => {});
        }

        // Remove only legacy built-in demo tracks (keeps all user-imported audioBlobs intact!)
        await purgeLegacyCopiedBlobs();

        const savedTracks = await getAllTracks();

        let savedPlaylists = await getAllPlaylists();
        if (savedPlaylists.length === 0) {
          const favPlaylist: Playlist = {
            id: 'pl-favorites',
            title: 'Lagu Favorit',
            description: 'Daftar lagu pilihan terbaik Anda',
            trackIds: savedTracks.filter((t) => t.isFavorite).map((t) => t.id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            color: '#ec4899',
            isSystem: true,
          };

          await savePlaylist(favPlaylist);
          savedPlaylists = await getAllPlaylists();
        }

        // Deep sync saved settings from storage & apply across Audio Engine
        const savedAudioSettings = await loadSettings();
        if (savedAudioSettings) {
          setSettings((prev) => {
            const merged = { ...prev, ...savedAudioSettings };
            audioEngine.applyFullSettings(merged);
            return merged;
          });
        }

        setTracks(savedTracks);
        setPlaylists(savedPlaylists);

        if (savedTracks.length > 0) {
          // Restore user's last selected track so app doesn't reset song on reopen
          const lastTrackId = getStoredLastTrackId();
          const restoredTrack =
            (lastTrackId && savedTracks.find((t) => t.id === lastTrackId)) || savedTracks[0];

          setCurrentTrack(restoredTrack);
          setDuration(restoredTrack.duration || 0);
          setOriginalQueue(savedTracks);

          const activeShuffle =
            savedAudioSettings?.shuffle !== undefined
              ? savedAudioSettings.shuffle
              : settings.shuffle;

          if (activeShuffle) {
            setQueue(generateShuffledQueue(savedTracks, restoredTrack));
          } else {
            setQueue(savedTracks);
          }

          // Pre-load the restored track's audio stream from IndexedDB so pressing Play works immediately on reopen!
          const initialStreamUrl = await resolveDirectStreamUrl(restoredTrack);
          if (initialStreamUrl && audioRef.current) {
            audioRef.current.src = initialStreamUrl;
            audioRef.current.load();
          }
        }
      } catch (err) {
        console.error('Failed to initialize app data:', err);
      }
    }

    initData();
  }, []);

  // Initialize Web Audio API Engine with <audio> element and sync current settings
  useEffect(() => {
    if (audioRef.current) {
      audioEngine.init(audioRef.current);
      audioEngine.applyFullSettings(settings);
    }
  }, []);

  // Guarantee settings and state are saved when user exits or minimizes the app
  useEffect(() => {
    const handleBeforeExit = () => {
      saveSettings(settings);
      if (currentTrack) {
        saveStoredLastTrackId(currentTrack.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeExit);
    window.addEventListener('pagehide', handleBeforeExit);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeExit);
      window.removeEventListener('pagehide', handleBeforeExit);
    };
  }, [settings, currentTrack]);

  // Sleep Timer Countdown Interval
  useEffect(() => {
    if (!sleepTimer.active || !sleepTimer.targetEndTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((sleepTimer.targetEndTime! - now) / 1000));

      if (remaining <= 0) {
        // Sleep Timer Expired: Stop playback smoothly
        if (sleepTimer.autoFade) {
          audioEngine.fadeOutAndStop(3, () => {
            if (audioRef.current) {
              audioRef.current.pause();
            }
            setIsPlaying(false);
          });
        } else {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setIsPlaying(false);
        }

        setSleepTimer((prev) => ({
          ...prev,
          active: false,
          remainingSeconds: 0,
          targetEndTime: null,
        }));
      } else {
        setSleepTimer((prev) => ({
          ...prev,
          remainingSeconds: remaining,
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer.active, sleepTimer.targetEndTime, sleepTimer.autoFade]);

  // Load track audio source into HTMLAudioElement from Memory, IndexedDB audioBlobs, or Android MediaStore
  const loadTrackSource = useCallback(
    async (track: AudioTrack, autoPlay: boolean = false, forceRefresh: boolean = false) => {
      if (!audioRef.current) return;

      try {
        const el = audioRef.current;
        const src = await resolveDirectStreamUrl(track, forceRefresh);
        if (!src) {
          console.warn('No audio stream found in DB for track:', track.title);
          if (autoPlay) {
            setImportNotification({
              show: true,
              message: `Memulihkan File Audio "${track.title}"`,
              details:
                'Pilih kembali file lagu ini satu kali agar tersimpan permanen di database aplikasi.',
            });
            setTimeout(() => setImportNotification(null), 5000);
            document.getElementById('btn-import-hero')?.click();
          }
          return;
        }

        if (el.src !== src || forceRefresh) {
          el.src = src;
          el.load();
          lastTimeUpdateRef.current = 0;
          setCurrentTime(0);
        }

        if (autoPlay) {
          audioEngine.ensureContextRunning();
          try {
            await el.play();
            setIsPlaying(true);
            publishMediaTrackMetadata(track, true, el.currentTime || 0, el.duration || track.duration);
          } catch (err) {
            console.warn('AutoPlay delayed, attaching canplay listener:', err);
            const onCanPlay = async () => {
              el.removeEventListener('canplay', onCanPlay);
              try {
                await el.play();
                setIsPlaying(true);
                publishMediaTrackMetadata(track, true, el.currentTime || 0, el.duration || track.duration);
              } catch (e2) {
                console.warn('Playback on canplay retry error:', e2);
              }
            };
            el.addEventListener('canplay', onCanPlay, { once: true });
          }
        } else {
          publishMediaTrackMetadata(track, false, 0, track.duration);
        }
      } catch (err) {
        console.error('Failed to load audio source:', err);
      }
    },
    []
  );

  // Automatically recover audio context & stream URL when returning to the app after minimizing/exiting
  useEffect(() => {
    const handleVisibilityOrResume = () => {
      if (document.visibilityState === 'visible') {
        if (isPlaying) {
          audioEngine.ensureContextRunning();
        }
        if (currentTrack && audioRef.current) {
          const el = audioRef.current;
          if (!el.src || el.src === '' || el.src === window.location.href || el.error) {
            loadTrackSource(currentTrack, isPlaying, true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrResume);
    window.addEventListener('pageshow', handleVisibilityOrResume);
    window.addEventListener('focus', handleVisibilityOrResume);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrResume);
      window.removeEventListener('pageshow', handleVisibilityOrResume);
      window.removeEventListener('focus', handleVisibilityOrResume);
    };
  }, [currentTrack, isPlaying, loadTrackSource]);

  // Setting updates with immediate audio engine synchronization and persistent storage
  const handleUpdateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      audioEngine.applyFullSettings(updated);
      return updated;
    });
  }, []);

  // Update track when user plays a track
  const handlePlayTrack = useCallback(
    async (track: AudioTrack, sourceTracks?: AudioTrack[], source?: PlaybackSource) => {
      audioEngine.ensureContextRunning();
      const tracksToQueue = sourceTracks && sourceTracks.length > 0 ? sourceTracks : tracks;
      setOriginalQueue(tracksToQueue);

      if (source) {
        setPlaybackSource(source);
      } else if (!playbackSource || playbackSource.type !== 'playlist') {
        setPlaybackSource({ type: 'all', title: 'Semua Lagu' });
      }

      if (settings.shuffle) {
        const shuffled = generateShuffledQueue(tracksToQueue, track);
        setQueue(shuffled);
      } else {
        setQueue(tracksToQueue);
      }

      setCurrentTrack(track);
      saveStoredLastTrackId(track.id);
      await loadTrackSource(track, true);
    },
    [tracks, settings.shuffle, playbackSource, loadTrackSource]
  );

  // Play All in Shuffle Mode (with new random permutation)
  const handleShufflePlayAll = useCallback(
    async (sourceTracks: AudioTrack[], source?: PlaybackSource) => {
      if (sourceTracks.length === 0) return;
      audioEngine.ensureContextRunning();
      const newSource = source || { type: 'all', title: 'Semua Lagu' };
      setPlaybackSource(newSource);
      setOriginalQueue(sourceTracks);
      const shuffled = generateShuffledQueue(sourceTracks);
      setQueue(shuffled);
      handleUpdateSettings({ shuffle: true });
      setCurrentTrack(shuffled[0]);
      saveStoredLastTrackId(shuffled[0].id);
      await loadTrackSource(shuffled[0], true);
    },
    [handleUpdateSettings, loadTrackSource]
  );

  // Turn off shuffle and restore original sequence
  const handleDisableShuffle = useCallback(() => {
    handleUpdateSettings({ shuffle: false });
    const restored = originalQueue.length > 0 ? originalQueue : (tracks.length > 0 ? tracks : queue);
    if (restored.length > 0) {
      setQueue(restored);
    }
  }, [originalQueue, tracks, queue, handleUpdateSettings]);

  // Toggle or Reshuffle on click: changes randomized order immediately
  const handleToggleShuffle = useCallback(() => {
    if (!settings.shuffle) {
      // Turn shuffle on and randomize
      const base = originalQueue.length > 0 ? originalQueue : (tracks.length > 0 ? tracks : queue);
      const shuffled = generateShuffledQueue(base, currentTrack || undefined);
      setQueue(shuffled);
      handleUpdateSettings({ shuffle: true });
    } else {
      // Turn shuffle off and restore original sequence
      handleDisableShuffle();
    }
  }, [settings.shuffle, originalQueue, tracks, queue, currentTrack, handleUpdateSettings, handleDisableShuffle]);

  const handlePlay = useCallback(async () => {
    if (!audioRef.current || !currentTrack) return;
    audioEngine.ensureContextRunning();

    const el = audioRef.current;
    const hasValidSrc =
      Boolean(el.src) &&
      el.src !== '' &&
      el.src !== window.location.href &&
      !el.error;

    if (!hasValidSrc) {
      await loadTrackSource(currentTrack, true, true);
    } else {
      try {
        await el.play();
        setIsPlaying(true);
        syncMediaPlaybackState(
          currentTrack,
          true,
          el.currentTime,
          el.duration || currentTrack.duration,
          true
        );
      } catch (err) {
        console.warn('Playback error on existing src, reloading fresh stream from DB:', err);
        await loadTrackSource(currentTrack, true, true);
      }
    }
  }, [currentTrack, loadTrackSource]);

  const handlePause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    syncMediaPlaybackState(
      currentTrack,
      false,
      audioRef.current.currentTime,
      audioRef.current.duration || currentTrack?.duration || 0,
      true
    );
  }, [currentTrack]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      handlePause();
    } else {
      await handlePlay();
    }
  }, [isPlaying, handlePause, handlePlay]);

  const handleNextTrack = useCallback(() => {
    if (queue.length === 0 || !currentTrack) return;

    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      const next = queue[currentIndex + 1];
      setCurrentTrack(next);
      saveStoredLastTrackId(next.id);
      loadTrackSource(next, true);
    } else if (settings.repeatMode === 'all' || sleepTimer.active) {
      const first = queue[0];
      setCurrentTrack(first);
      saveStoredLastTrackId(first.id);
      loadTrackSource(first, true);
    } else {
      setIsPlaying(false);
    }
  }, [queue, currentTrack, settings.repeatMode, sleepTimer.active, loadTrackSource]);

  const handlePrevTrack = useCallback(() => {
    if (queue.length === 0 || !currentTrack) return;

    const now = Date.now();
    const timeSinceLastClick = now - lastPrevClickRef.current;
    lastPrevClickRef.current = now;

    // Read currentTime directly from audio element so handlePrevTrack never re-creates on timeupdate
    const actualTime = audioRef.current ? audioRef.current.currentTime : 0;

    if (actualTime > 2.5 && timeSinceLastClick > 1500) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      syncMediaPlaybackState(currentTrack, isPlaying, 0, duration || currentTrack.duration, true);
      return;
    }

    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex > 0) {
      const prev = queue[currentIndex - 1];
      setCurrentTrack(prev);
      saveStoredLastTrackId(prev.id);
      loadTrackSource(prev, true);
    } else {
      const last = queue[queue.length - 1];
      setCurrentTrack(last);
      saveStoredLastTrackId(last.id);
      loadTrackSource(last, true);
    }
  }, [queue, currentTrack, isPlaying, duration, loadTrackSource]);

  // Throttled Audio element events to prevent React re-render storm & 1-hour memory exhaustion
  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (!el) return;
    const nowTime = el.currentTime;
    if (Math.abs(nowTime - lastTimeUpdateRef.current) >= 0.25 || nowTime === 0) {
      lastTimeUpdateRef.current = nowTime;
      setCurrentTime(nowTime);
      syncMediaPlaybackState(currentTrack, !el.paused, nowTime, el.duration || duration, false);
    }
  };

  const handleLoadedMetadata = () => {
    const el = audioRef.current;
    if (!el) return;
    const realDur =
      el.duration && !isNaN(el.duration) && isFinite(el.duration)
        ? Math.round(el.duration)
        : currentTrack?.duration || 0;
    setDuration(realDur);

    if (currentTrack && realDur > 0 && currentTrack.duration !== realDur) {
      const updated = { ...currentTrack, duration: realDur };
      setCurrentTrack(updated);
      setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      saveTrack(updated).catch(() => {});
    }

    syncMediaPlaybackState(currentTrack, !el.paused, el.currentTime, realDur, true);
  };

  const handleEnded = () => {
    if (settings.repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => console.warn('Repeat play error:', err));
      }
    } else {
      handleNextTrack();
    }
  };

  const handleSeek = useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        lastTimeUpdateRef.current = time;
        setCurrentTime(time);
        syncMediaPlaybackState(
          currentTrack,
          !audioRef.current.paused,
          time,
          audioRef.current.duration || duration,
          true
        );
      }
    },
    [currentTrack, duration]
  );

  // Rebuilt MediaSession & Native Android Notification Controller (Registered stably without timeupdate churn)
  useEffect(() => {
    const cleanup = initMediaSessionController({
      onPlay: handlePlay,
      onPause: handlePause,
      onPrev: handlePrevTrack,
      onNext: handleNextTrack,
      onSeek: handleSeek,
    });

    // Listen to 25-second native Android Service heartbeat to keep AudioContext & queue progression alive >1 hour
    const handleNativeHeartbeat = () => {
      if (isPlaying) {
        audioEngine.ensureContextRunning();
        const el = audioRef.current;
        if (el && el.ended) {
          handleNextTrack();
        }
      }
    };
    window.addEventListener('playlish-heartbeat', handleNativeHeartbeat);

    return () => {
      cleanup();
      window.removeEventListener('playlish-heartbeat', handleNativeHeartbeat);
    };
  }, [handlePlay, handlePause, handlePrevTrack, handleNextTrack, handleSeek, isPlaying]);

  // Publish track metadata only when active track ID changes (prevents metadata duration update from resetting playback state)
  useEffect(() => {
    publishMediaTrackMetadata(
      currentTrack,
      audioRef.current ? !audioRef.current.paused : isPlaying,
      audioRef.current?.currentTime || 0,
      duration || currentTrack?.duration || 0
    );
  }, [currentTrack?.id]);

  // Toggle favorite
  const handleToggleFavorite = async (trackId: string) => {
    const updatedTracks = tracks.map((t) =>
      t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t
    );
    setTracks(updatedTracks);

    const updatedTrack = updatedTracks.find((t) => t.id === trackId);
    if (updatedTrack) {
      await saveTrack(updatedTrack);
    }

    // Sync favorite playlist
    const favPlaylist = playlists.find((p) => p.isSystem || p.title === 'Lagu Favorit');
    if (favPlaylist) {
      let favIds = [...favPlaylist.trackIds];
      if (updatedTrack?.isFavorite) {
        if (!favIds.includes(trackId)) favIds.push(trackId);
      } else {
        favIds = favIds.filter((id) => id !== trackId);
      }
      const newFavPl = { ...favPlaylist, trackIds: favIds, updatedAt: Date.now() };
      await savePlaylist(newFavPl);
      setPlaylists((prev) => prev.map((p) => (p.id === favPlaylist.id ? newFavPl : p)));
    }
  };

  // Playlist management
  const handleCreatePlaylist = async (title: string, description: string, color: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      title,
      description,
      trackIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color,
    };
    await savePlaylist(newPl);
    setPlaylists((prev) => [newPl, ...prev]);
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    await deletePlaylistDB(playlistId);
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  };

  const handleAddTrackToPlaylist = async (playlistId: string, trackId: string) => {
    const targetPl = playlists.find((p) => p.id === playlistId);
    if (!targetPl) return;

    if (!targetPl.trackIds.includes(trackId)) {
      const updatedPl = {
        ...targetPl,
        trackIds: [...targetPl.trackIds, trackId],
        updatedAt: Date.now(),
      };
      await savePlaylist(updatedPl);
      setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updatedPl : p)));
    }
  };

  // PROMPT MANDATE: "jika di playlist di hapus otomatis lagu tersebut ikut terhapus dari daftar putar"
  const handleRemoveTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    const targetPl = playlists.find((p) => p.id === playlistId);
    if (!targetPl) return;

    const newTrackIds = targetPl.trackIds.filter((id) => id !== trackId);
    const updatedPl = {
      ...targetPl,
      trackIds: newTrackIds,
      updatedAt: Date.now(),
    };

    await savePlaylist(updatedPl);
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updatedPl : p)));

    // Automatically remove from active playback queue if currently active!
    const updatedOriginal = originalQueue.filter((t) => t.id !== trackId);
    const updatedQueue = queue.filter((t) => t.id !== trackId);
    setOriginalQueue(updatedOriginal);
    setQueue(updatedQueue);

    // If the currently playing track was the one removed, seamlessly advance to next or stop
    if (currentTrack?.id === trackId) {
      if (updatedQueue.length > 0) {
        handlePlayTrack(updatedQueue[0], updatedQueue, playbackSource);
      } else {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        setCurrentTrack(null);
      }
    }
  };

  // Local File Importer for FLAC, WAV, MP3, AAC, ALAC, OGG with Automatic .LRC Synchronizer
  const handleImportFiles = async (files: FileList | File[]) => {
    try {
      const { matchedPairs, orphanLrcFiles } = await pairAudioAndLrcFiles(files);

      // Case A: User only imported .LRC files (e.g., adding lyrics to existing tracks)
      if (matchedPairs.length === 0 && orphanLrcFiles.length > 0) {
        let updatedCount = 0;
        for (const lrcFile of orphanLrcFiles) {
          const lrcKey = normalizeSongBaseName(lrcFile.name);
          const targetTrack = tracks.find(
            (t) =>
              normalizeSongBaseName(t.title) === lrcKey ||
              normalizeSongBaseName(t.fileName || '') === lrcKey
          );

          if (targetTrack) {
            try {
              const lrcText = await lrcFile.text();
              await updateTrackLyrics(targetTrack.id, lrcText);
              setTracks((prev) =>
                prev.map((t) =>
                  t.id === targetTrack.id
                    ? {
                        ...t,
                        lyrics: lrcText,
                        hasMatchedLrc: true,
                        lrcFileName: lrcFile.name,
                      }
                    : t
                )
              );
              if (currentTrack && currentTrack.id === targetTrack.id) {
                setCurrentTrack((prev) =>
                  prev
                    ? {
                        ...prev,
                        lyrics: lrcText,
                        hasMatchedLrc: true,
                        lrcFileName: lrcFile.name,
                      }
                    : null
                );
              }
              updatedCount++;
            } catch (err) {
              console.warn('Gagal membaca file .lrc orphan:', err);
            }
          }
        }

        setImportNotification({
          show: true,
          message: `${updatedCount} Berkas .LRC Berhasil Dihubungkan ke Lagu!`,
          details:
            updatedCount > 0
              ? 'Lirik otomatis tersinkronisasi tanpa perlu dimuat berulang.'
              : 'Tidak ditemukan lagu dengan nama yang cocok untuk file .lrc ini.',
        });
        setTimeout(() => setImportNotification(null), 4500);
        return;
      }

      // Case B: Persistent Audio File Import (Saves both metadata and audio Blob to IndexedDB so tracks always play after reopening app)
      const newLoadedTracks: AudioTrack[] = [];
      const updatedExistingTracks: AudioTrack[] = [];
      const batchToSave: TrackWithBlobItem[] = [];
      let autoLrcCount = 0;
      const nowBase = Date.now();

      for (let i = 0; i < matchedPairs.length; i++) {
        const pair = matchedPairs[i];
        const file = pair.audioFile;
        const extension = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';
        let format: AudioFormat = 'MP3';
        if (['FLAC', 'WAV', 'MP3', 'AAC', 'OGG', 'ALAC', 'M4A', 'WEBM'].includes(extension)) {
          format = extension as AudioFormat;
        }

        const cleanName = file.name.replace(/\.[^/.]+$/, '');

        // Check if this song already exists in the library (so re-importing heals/updates it in-place without duplicates)
        const normalizedClean = normalizeSongBaseName(file.name);
        const existingMatch = tracks.find(
          (t) =>
            (t.fileName && t.fileName.toLowerCase() === file.name.toLowerCase()) ||
            normalizeSongBaseName(t.title) === normalizedClean
        );

        const trackId = existingMatch
          ? existingMatch.id
          : `track-${nowBase}-${i}-${Math.random().toString(36).slice(2, 6)}`;

        // 1. Lightweight 256KB header slice metadata extraction
        const meta = await extractAudioMetadata(file);

        // 2. Estimate duration from file size & format bitrate (exact duration updates automatically on play)
        const estimatedDuration =
          existingMatch && existingMatch.duration > 0
            ? existingMatch.duration
            : Math.max(
                30,
                Math.min(
                  1200,
                  Math.round(file.size / (format === 'FLAC' || format === 'WAV' ? 176000 : 32000))
                )
              );

        // 3. Read matching .LRC file if found alongside the audio
        let lyricsText = meta.lyrics || existingMatch?.lyrics;
        let hasMatchedLrc = Boolean(existingMatch?.hasMatchedLrc);
        let lrcFileName: string | undefined = existingMatch?.lrcFileName;

        if (pair.lrcFile) {
          try {
            lyricsText = await pair.lrcFile.text();
            hasMatchedLrc = true;
            lrcFileName = pair.lrcFile.name;
            autoLrcCount++;
          } catch (e) {
            console.warn('Gagal membaca berkas .lrc pasangan:', e);
          }
        } else if (meta.lyrics) {
          hasMatchedLrc = true;
          lrcFileName = '(Tag Tersemat)';
          autoLrcCount++;
        }

        const trackObj: AudioTrack = {
          id: trackId,
          title: meta.title || existingMatch?.title || cleanName,
          artist: meta.artist || existingMatch?.artist || 'Lokal Audio',
          album: meta.album || existingMatch?.album || 'Koleksi Lokal',
          duration: estimatedDuration,
          coverUrl: meta.coverUrl || existingMatch?.coverUrl,
          lyrics: lyricsText,
          format,
          sampleRate: format === 'FLAC' ? 96000 : format === 'WAV' ? 48000 : 44100,
          bitDepth: format === 'FLAC' || format === 'WAV' ? 24 : 16,
          bitrate: format === 'FLAC' ? 4608 : format === 'WAV' ? 2304 : 320,
          fileSize: file.size,
          fileName: file.name,
          filePath: pair.relativePath || file.name,
          hasMatchedLrc,
          lrcFileName,
          isOffline: true,
          isFavorite: existingMatch ? existingMatch.isFavorite : false,
          genre: meta.genre || existingMatch?.genre || 'Koleksi Musik',
          addedAt: existingMatch ? existingMatch.addedAt : nowBase - i,
          colorHex: '#F27D26',
        };

        // Convert File into a self-contained Blob so Android WebView / IndexedDB never loses the file stream after 1 second or app restart!
        let persistentBlob: Blob = file;
        try {
          const arrayBuf = await file.arrayBuffer();
          persistentBlob = new Blob([arrayBuf], { type: file.type || 'audio/mpeg' });
        } catch {
          persistentBlob = file;
        }

        // Hold Blob pointer in memory AND persist binary in IndexedDB audioBlobs so it survives app exit!
        registerTrackFile(trackId, persistentBlob);
        batchToSave.push({ track: trackObj, audioBlob: persistentBlob });

        if (existingMatch) {
          updatedExistingTracks.push(trackObj);
        } else {
          newLoadedTracks.push(trackObj);
        }
      }

      // Persist both track metadata and audio Blobs into IndexedDB in a single transaction
      await saveTracksBatch(batchToSave);
      // Free all non-playing File pointers from RAM now that they are safely persisted in IndexedDB
      releaseInactiveMemoryBlobs(currentTrack?.id);

      // 4. Handle orphan LRC files matching existing or newly loaded tracks
      const combinedTracks = [
        ...newLoadedTracks,
        ...tracks.map((t) => updatedExistingTracks.find((u) => u.id === t.id) || t),
      ];

      if (orphanLrcFiles.length > 0) {
        for (const lrcFile of orphanLrcFiles) {
          const lrcKey = normalizeSongBaseName(lrcFile.name);
          const targetTrack = combinedTracks.find(
            (t) =>
              normalizeSongBaseName(t.title) === lrcKey ||
              normalizeSongBaseName(t.fileName || '') === lrcKey
          );
          if (targetTrack && !targetTrack.lyrics) {
            try {
              const lrcText = await lrcFile.text();
              await updateTrackLyrics(targetTrack.id, lrcText);
              targetTrack.lyrics = lrcText;
              targetTrack.hasMatchedLrc = true;
              targetTrack.lrcFileName = lrcFile.name;
              autoLrcCount++;
            } catch {
              // ignore
            }
          }
        }
      }

      setTracks(combinedTracks);
      setOriginalQueue(combinedTracks);
      if (settings.shuffle) {
        setQueue(generateShuffledQueue(combinedTracks, currentTrack || combinedTracks[0]));
      } else {
        setQueue(combinedTracks);
      }

      const totalProcessed = newLoadedTracks.length + updatedExistingTracks.length;
      setImportNotification({
        show: true,
        message: `${totalProcessed} Lagu Berhasil Disimpan Permanen!`,
        details:
          autoLrcCount > 0
            ? `${autoLrcCount} lirik (.LRC) terhubung otomatis. Lagu siap diputar kapan saja meski aplikasi ditutup.`
            : 'Lagu tersimpan di database aplikasi dan siap diputar kapan saja tanpa perlu dimuat ulang.',
      });
      setTimeout(() => setImportNotification(null), 5000);

      const trackToAutoPlay =
        (currentTrack && updatedExistingTracks.find((u) => u.id === currentTrack.id)) ||
        newLoadedTracks[0] ||
        updatedExistingTracks[0];

      if (trackToAutoPlay && (!currentTrack || updatedExistingTracks.some((u) => u.id === currentTrack.id))) {
        handlePlayTrack(trackToAutoPlay, combinedTracks);
      }
    } catch (err) {
      console.error('Error linking files:', err);
    }
  };

  // Native Android MediaStore Scanner (Zero-Copy Direct URI Streaming)
  const handleScanDeviceMusic = useCallback(async () => {
    const scannedTracks = await scanAndroidDeviceMusic();
    if (scannedTracks.length === 0) {
      setImportNotification({
        show: true,
        message: 'Pemindaian Penyimpanan Selesai',
        details:
          'Gunakan tombol "Pilih File Lagu" atau pastikan izin akses audio Android telah diberikan.',
      });
      setTimeout(() => setImportNotification(null), 4500);
      return;
    }

    const existingIds = new Set(tracks.map((t) => t.id));
    const newDeviceTracks = scannedTracks.filter((t) => !existingIds.has(t.id));

    if (newDeviceTracks.length > 0) {
      await saveTracksBatch(newDeviceTracks);
      setTracks((prev) => [...newDeviceTracks, ...prev]);
    }

    setImportNotification({
      show: true,
      message: `${newDeviceTracks.length} Lagu HP Terdeteksi (Tanpa Copy)!`,
      details: `Total ${scannedTracks.length} lagu terhubung langsung dari penyimpanan internal Android.`,
    });
    setTimeout(() => setImportNotification(null), 5000);
  }, [tracks]);

  // Update Track Lyrics Permanently in DB & Active States
  const handleUpdateTrackLyrics = async (trackId: string, newLyrics: string) => {
    await updateTrackLyrics(trackId, newLyrics);
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, lyrics: newLyrics } : t))
    );
    if (currentTrack && currentTrack.id === trackId) {
      setCurrentTrack((prev) => (prev ? { ...prev, lyrics: newLyrics } : null));
    }
    setQueue((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, lyrics: newLyrics } : t))
    );
    setOriginalQueue((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, lyrics: newLyrics } : t))
    );
  };

  // Delete Track from Library, Queues, and All Playlists
  const handleDeleteTrack = async (trackId: string) => {
    unregisterTrackFile(trackId);
    await deleteTrackDB(trackId);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    setOriginalQueue((prev) => prev.filter((t) => t.id !== trackId));
    const newQueue = queue.filter((t) => t.id !== trackId);
    setQueue(newQueue);
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        trackIds: pl.trackIds.filter((id) => id !== trackId),
      }))
    );

    if (currentTrack?.id === trackId) {
      if (newQueue.length > 0) {
        const nextTrack = newQueue[0];
        setCurrentTrack(nextTrack);
        await loadTrackSource(nextTrack, isPlaying);
      } else {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        setCurrentTrack(null);
        publishMediaTrackMetadata(null);
      }
    }
  };

  // Clear All Tracks from Library, Queues, and All Playlists
  const handleClearAllTracks = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setIsFullPlayerOpen(false);
    setCurrentTime(0);
    setDuration(0);
    publishMediaTrackMetadata(null);

    clearAllTrackFiles();
    await clearAllTracks();

    setTracks([]);
    setOriginalQueue([]);
    setQueue([]);
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        trackIds: [],
        updatedAt: Date.now(),
      }))
    );

    setImportNotification({
      show: true,
      message: 'Semua Lagu Berhasil Dihapus dari Daftar',
      details: 'Daftar putar telah dikosongkan. File asli di perangkat Anda tetap aman.',
    });
    setTimeout(() => setImportNotification(null), 4000);
  };

  // Sleep Timer controls
  const handleStartSleepTimer = (hours: number, minutes: number, autoFade: boolean) => {
    const totalSecs = hours * 3600 + minutes * 60;
    const targetEndTime = Date.now() + totalSecs * 1000;

    setSleepTimer({
      active: true,
      hours,
      minutes,
      totalSeconds: totalSecs,
      remainingSeconds: totalSecs,
      targetEndTime,
      fadeOutSeconds: 30,
      autoFade,
    });
  };

  const handleCancelSleepTimer = () => {
    setSleepTimer((prev) => ({
      ...prev,
      active: false,
      targetEndTime: null,
      remainingSeconds: prev.totalSeconds,
    }));
  };

  const handleAddTimerMinutes = (mins: number) => {
    setSleepTimer((prev) => {
      const addedSecs = mins * 60;
      const newRemaining = (prev.remainingSeconds > 0 ? prev.remainingSeconds : 0) + addedSecs;
      const baseEnd = prev.targetEndTime && prev.targetEndTime > Date.now() ? prev.targetEndTime : Date.now();
      const newEndTime = baseEnd + addedSecs * 1000;
      return {
        ...prev,
        active: true,
        totalSeconds: (prev.totalSeconds > 0 ? prev.totalSeconds : 0) + addedSecs,
        remainingSeconds: newRemaining,
        targetEndTime: newEndTime,
      };
    });
  };

  return (
    <div className="flex justify-center h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#020202] text-white selection:bg-[#F27D26]/30">
      {/* Native Audio Element bound to AudioEngine & System MediaSession */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => {
          setIsPlaying(true);
          syncMediaPlaybackState(
            currentTrack,
            true,
            audioRef.current?.currentTime || 0,
            audioRef.current?.duration || currentTrack?.duration || 0,
            true
          );
        }}
        onPause={() => {
          setIsPlaying(false);
          syncMediaPlaybackState(
            currentTrack,
            false,
            audioRef.current?.currentTime || 0,
            audioRef.current?.duration || currentTrack?.duration || 0,
            true
          );
        }}
        preload="auto"
        className="fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
      />

      {/* Main Android App Container */}
      <main
        id="playlish-app-container"
        className="w-full max-w-lg h-full max-h-[100dvh] bg-[#050505] bg-immersive-radial border-x border-white/5 shadow-2xl flex flex-col relative overflow-hidden select-none"
      >
        {/* Android Top Header & Quick Status Bar */}
        <AndroidStatusBar
          sleepTimer={sleepTimer}
          settings={settings}
          onOpenTimer={() => setIsSleepTimerModalOpen(true)}
          onOpenSettings={() => setActiveTab('settings')}
        />

        {/* Tab Views - Isolated Scroll Area so bottom player never scrolls away */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {activeTab === 'tracks' && (
            <TracksView
              tracks={tracks}
              playlists={playlists}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              isShuffleActive={settings.shuffle}
              shuffledQueue={settings.shuffle ? queue : []}
              onPlayTrack={(track, queueTracks) =>
                handlePlayTrack(track, queueTracks, { type: 'all', title: 'Semua Lagu' })
              }
              onShufflePlayAll={(sourceTracks) =>
                handleShufflePlayAll(sourceTracks, { type: 'all', title: 'Semua Lagu' })
              }
              onDisableShuffle={handleDisableShuffle}
              onTogglePlay={togglePlay}
              onToggleFavorite={handleToggleFavorite}
              onAddTrackToPlaylist={handleAddTrackToPlaylist}
              onImportFiles={handleImportFiles}
              onScanDeviceMusic={handleScanDeviceMusic}
              onDeleteTrack={handleDeleteTrack}
              onClearAllTracks={handleClearAllTracks}
              onOpenLyricEditor={(targetTrack) => setEditingLyricTrack(targetTrack)}
            />
          )}

          {activeTab === 'playlists' && (
            <PlaylistView
              playlists={playlists}
              allTracks={tracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              isShuffleActive={settings.shuffle}
              shuffledQueue={settings.shuffle ? queue : []}
              playbackSource={playbackSource}
              onPlayTrack={handlePlayTrack}
              onShufflePlayPlaylist={(playlist, plTracks) =>
                handleShufflePlayAll(plTracks, {
                  type: 'playlist',
                  id: playlist.id,
                  title: playlist.title,
                })
              }
              onDisableShuffle={handleDisableShuffle}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {activeTab === 'equalizer' && (
            <EqualizerView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              isPlaying={isPlaying}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              sleepTimer={sleepTimer}
              onUpdateSettings={handleUpdateSettings}
              onOpenSleepTimer={() => setIsSleepTimerModalOpen(true)}
              onResetAllSettings={() => {
                setSettings(DEFAULT_SETTINGS);
                audioEngine.applyFullSettings(DEFAULT_SETTINGS);
                saveSettings(DEFAULT_SETTINGS);
              }}
            />
          )}
        </div>

        {/* Pinned Bottom Bar: Mini Player & Navigation Bar Always In View */}
        <div className="shrink-0 w-full z-40 bg-[#0A0A0A]/95 backdrop-blur-2xl border-t border-white/10 flex flex-col">
          {currentTrack && !isFullPlayerOpen && (
            <NowPlayingBar
              track={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              settings={settings}
              onTogglePlay={togglePlay}
              onPrev={handlePrevTrack}
              onNext={handleNextTrack}
              onSeek={handleSeek}
              onToggleFavorite={handleToggleFavorite}
              onExpand={() => setIsFullPlayerOpen(true)}
              onDisableShuffle={handleDisableShuffle}
            />
          )}

          {/* Android Bottom Navigation Bar */}
          <BottomNav
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            playlistCount={playlists.length}
          />
        </div>

        {/* Fullscreen Expandable Now Playing View */}
        {currentTrack && isFullPlayerOpen && (
          <NowPlayingFull
            track={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            settings={settings}
            sleepTimer={sleepTimer}
            queue={queue}
            playbackSource={playbackSource}
            onTogglePlay={togglePlay}
            onPrev={handlePrevTrack}
            onNext={handleNextTrack}
            onSeek={handleSeek}
            onToggleFavorite={handleToggleFavorite}
            onToggleShuffle={handleToggleShuffle}
            onDisableShuffle={handleDisableShuffle}
            onToggleRepeat={() => {
              const nextMode =
                settings.repeatMode === 'off'
                  ? 'all'
                  : settings.repeatMode === 'all'
                  ? 'one'
                  : 'off';
              handleUpdateSettings({ repeatMode: nextMode });
            }}
            onUpdateSettings={handleUpdateSettings}
            onClose={() => setIsFullPlayerOpen(false)}
            onOpenEqualizer={() => {
              setIsFullPlayerOpen(false);
              setActiveTab('equalizer');
            }}
            onOpenSleepTimer={() => setIsSleepTimerModalOpen(true)}
            onSelectTrackFromQueue={(t) => handlePlayTrack(t, queue, playbackSource)}
            onUpdateTrackLyrics={handleUpdateTrackLyrics}
          />
        )}

        {/* Sleep Timer Time Picker Modal */}
        <SleepTimerModal
          isOpen={isSleepTimerModalOpen}
          onClose={() => setIsSleepTimerModalOpen(false)}
          sleepTimer={sleepTimer}
          onStartTimer={handleStartSleepTimer}
          onCancelTimer={handleCancelSleepTimer}
          onAddMinutes={handleAddTimerMinutes}
        />

        {/* Dedicated Lyric Editor Modal (Available from Library & Track List) */}
        {editingLyricTrack && (
          <LyricEditorModal
            track={editingLyricTrack}
            currentTime={currentTrack?.id === editingLyricTrack.id ? currentTime : 0}
            duration={currentTrack?.id === editingLyricTrack.id ? (duration || editingLyricTrack.duration) : editingLyricTrack.duration}
            isPlaying={currentTrack?.id === editingLyricTrack.id ? isPlaying : false}
            onTogglePlay={() => {
              if (currentTrack?.id === editingLyricTrack.id) {
                togglePlay();
              } else {
                handlePlayTrack(editingLyricTrack);
              }
            }}
            onSeek={(time) => {
              if (currentTrack?.id === editingLyricTrack.id) {
                handleSeek(time);
              }
            }}
            onPlayTrack={handlePlayTrack}
            isOpen={Boolean(editingLyricTrack)}
            onClose={() => setEditingLyricTrack(null)}
            onSaveLyrics={async (trackId, newLyrics) => {
              await handleUpdateTrackLyrics(trackId, newLyrics);
              setEditingLyricTrack(null);
            }}
          />
        )}

        {/* Automatic Import & LRC Sync Notification Banner */}
        {importNotification && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-[#1c1c1e]/95 border border-[#F27D26]/40 shadow-2xl rounded-2xl p-3.5 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#F27D26]/20 text-[#F27D26] shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white tracking-tight">
                  {importNotification.message}
                </h4>
                {importNotification.details && (
                  <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                    {importNotification.details}
                  </p>
                )}
              </div>
              <button
                onClick={() => setImportNotification(null)}
                className="text-white/40 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
                title="Tutup Notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
