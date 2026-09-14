import { useState, useEffect, useRef, useCallback } from 'react';
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
  deleteTrack as deleteTrackDB,
  getAllPlaylists,
  savePlaylist,
  deletePlaylist as deletePlaylistDB,
  loadSettings,
  saveSettings,
  getTrackBlob,
  getLocalStoredSettings,
  getStoredLastTrackId,
  saveStoredLastTrackId,
} from './services/db';
import { INITIAL_DEFAULT_TRACKS, prepareTrackBlob } from './services/defaultTracks';
import { audioEngine, EQ_PRESETS } from './services/audioEngine';
import {
  setupMediaSession,
  updateMediaSessionMetadata,
  updateMediaSessionPlaybackState,
  updateMediaSessionPositionState,
} from './services/mediaSession';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { BottomNav } from './components/BottomNav';
import { TracksView } from './components/TracksView';
import { PlaylistView } from './components/PlaylistView';
import { EqualizerView } from './components/EqualizerView';
import { OfflineView } from './components/OfflineView';
import { SettingsView } from './components/SettingsView';
import { NowPlayingBar } from './components/NowPlayingBar';
import { NowPlayingFull } from './components/NowPlayingFull';
import { SleepTimerModal } from './components/SleepTimerModal';

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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const lastPrevClickRef = useRef<number>(0);

  // Initialize DB, default tracks & restore persisted settings
  useEffect(() => {
    async function initData() {
      try {
        let savedTracks = await getAllTracks();
        if (savedTracks.length === 0) {
          // Initialize default Hi-Res demo tracks
          for (const track of INITIAL_DEFAULT_TRACKS) {
            const blob = await prepareTrackBlob(track);
            await saveTrack(track, blob);
          }
          savedTracks = await getAllTracks();
        }

        let savedPlaylists = await getAllPlaylists();
        if (savedPlaylists.length === 0) {
          const defaultPlaylists: Playlist[] = [
            {
              id: 'pl-hires-master',
              title: 'Master Hi-Res (FLAC & WAV)',
              description: 'Koleksi audio beresolusi tinggi 24-bit 96kHz',
              trackIds: savedTracks.map((t) => t.id),
              createdAt: Date.now(),
              updatedAt: Date.now(),
              color: '#06b6d4',
            },
            {
              id: 'pl-favorites',
              title: 'Lagu Favorit',
              description: 'Daftar lagu pilihan terbaik',
              trackIds: savedTracks.filter((t) => t.isFavorite).map((t) => t.id),
              createdAt: Date.now(),
              updatedAt: Date.now(),
              color: '#ec4899',
              isSystem: true,
            },
          ];

          for (const pl of defaultPlaylists) {
            await savePlaylist(pl);
          }
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

  // Load track audio source into HTMLAudioElement
  const loadTrackSource = useCallback(async (track: AudioTrack, autoPlay: boolean = false) => {
    if (!audioRef.current) return;

    const prevBlobUrl = activeBlobUrlRef.current;

    try {
      const blob = await getTrackBlob(track.id);
      let src = '';
      if (blob) {
        src = URL.createObjectURL(blob);
        activeBlobUrlRef.current = src;
      } else if (track.audioUrl) {
        src = track.audioUrl;
        activeBlobUrlRef.current = null;
      } else {
        // Prepare procedural blob on demand if needed
        const synthBlob = await prepareTrackBlob(track);
        src = URL.createObjectURL(synthBlob);
        activeBlobUrlRef.current = src;
      }

      audioRef.current.src = src;
      audioRef.current.load();

      // Revoke previous blob url safely with delay so ongoing playback/decoding is not interrupted
      if (prevBlobUrl && prevBlobUrl !== src) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(prevBlobUrl);
          } catch (_) {}
        }, 3500);
      }

      if (autoPlay) {
        audioEngine.ensureContextRunning();
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.warn('AutoPlay delayed, attaching canplay listener:', err);
          const el = audioRef.current;
          if (el) {
            const onCanPlay = async () => {
              el.removeEventListener('canplay', onCanPlay);
              try {
                await el.play();
                setIsPlaying(true);
              } catch (e2) {
                console.warn('Playback on canplay retry error:', e2);
              }
            };
            el.addEventListener('canplay', onCanPlay, { once: true });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load audio source:', err);
    }
  }, []);

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

  const togglePlay = async () => {
    if (!audioRef.current || !currentTrack) return;
    audioEngine.ensureContextRunning();

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current.src || audioRef.current.src === '') {
        await loadTrackSource(currentTrack, true);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.warn('Playback error:', err);
        }
      }
    }
  };

  const handleNextTrack = useCallback(() => {
    if (queue.length === 0 || !currentTrack) return;

    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      const next = queue[currentIndex + 1];
      setCurrentTrack(next);
      loadTrackSource(next, true);
    } else if (settings.repeatMode === 'all' || sleepTimer.active) {
      // Loop queue if repeatMode is 'all' or sleepTimer is active, so playback doesn't stop before timer ends
      const first = queue[0];
      setCurrentTrack(first);
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

    // If played > 2.5s and first click, rewind to start
    // If clicked again within 1.5s, or if played <= 2.5s, jump to previous track
    if (currentTime > 2.5 && timeSinceLastClick > 1500) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      return;
    }

    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex > 0) {
      const prev = queue[currentIndex - 1];
      setCurrentTrack(prev);
      loadTrackSource(prev, true);
    } else {
      const last = queue[queue.length - 1];
      setCurrentTrack(last);
      loadTrackSource(last, true);
    }
  }, [queue, currentTrack, currentTime, loadTrackSource]);

  // Audio element events
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || currentTrack?.duration || 0);
    }
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

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // MediaSession API integration for Control Center (Pusat Kontrol), Lockscreen, Notifications & Headset keys
  useEffect(() => {
    const cleanup = setupMediaSession({
      onPlay: togglePlay,
      onPause: togglePlay,
      onPrev: handlePrevTrack,
      onNext: handleNextTrack,
      onSeek: handleSeek,
    });
    return cleanup;
  }, [togglePlay, handlePrevTrack, handleNextTrack, handleSeek]);

  // Update Media Session track metadata (Title, Artist, Album, Multi-res Artworks)
  useEffect(() => {
    updateMediaSessionMetadata(currentTrack);
  }, [currentTrack]);

  // Synchronize Media Session playback state (Playing vs Paused) in Control Center
  useEffect(() => {
    updateMediaSessionPlaybackState(isPlaying);
  }, [isPlaying]);

  // Synchronize Media Session position state (Seekbar progress) in Control Center
  useEffect(() => {
    if (duration > 0) {
      updateMediaSessionPositionState(currentTime, duration);
    }
  }, [currentTime, duration]);

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

  // Local File Importer for FLAC, WAV, MP3, AAC, ALAC, OGG
  const handleImportFiles = async (files: FileList) => {
    const newLoadedTracks: AudioTrack[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';
      let format: AudioFormat = 'MP3';
      if (['FLAC', 'WAV', 'MP3', 'AAC', 'OGG', 'ALAC', 'M4A'].includes(extension)) {
        format = extension as AudioFormat;
      }

      // Default title from file name
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const trackId = `track-${Date.now()}-${i}`;

      const newTrack: AudioTrack = {
        id: trackId,
        title: cleanName,
        artist: 'Lokal Audio',
        album: 'Impor PlayLish',
        duration: 180,
        format,
        sampleRate: format === 'FLAC' ? 96000 : format === 'WAV' ? 48000 : 44100,
        bitDepth: format === 'FLAC' || format === 'WAV' ? 24 : 16,
        bitrate: format === 'FLAC' ? 4608 : format === 'WAV' ? 2304 : 320,
        fileSize: file.size,
        isOffline: true,
        isFavorite: false,
        addedAt: Date.now(),
        colorHex: '#06b6d4',
      };

      await saveTrack(newTrack, file);
      newLoadedTracks.push(newTrack);
    }

    setTracks((prev) => [...newLoadedTracks, ...prev]);

    if (newLoadedTracks.length > 0 && !currentTrack) {
      handlePlayTrack(newLoadedTracks[0]);
    }
  };

  // Delete Track from Library, Queues, and All Playlists
  const handleDeleteTrack = async (trackId: string) => {
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
      }
    }
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
      {/* Hidden Native Audio Element bound to AudioEngine */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
        className="hidden"
      />

      {/* Main Android App Container */}
      <main
        id="playlish-app-container"
        className="w-full max-w-lg h-full max-h-[100dvh] bg-[#050505] bg-immersive-radial border-x border-white/5 shadow-2xl flex flex-col relative overflow-hidden select-none"
      >
        {/* Android Top Status Bar */}
        <AndroidStatusBar
          sleepTimer={sleepTimer}
          settings={settings}
          isOffline={true}
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
              onDeleteTrack={handleDeleteTrack}
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

          {activeTab === 'offline' && (
            <OfflineView
              tracks={tracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              offlineOnly={settings.offlineOnly}
              onToggleOfflineOnly={(en) => handleUpdateSettings({ offlineOnly: en })}
              onPlayTrack={(track, queueTracks) =>
                handlePlayTrack(track, queueTracks, { type: 'offline', title: 'Mode Offline' })
              }
              onDeleteTrack={handleDeleteTrack}
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
      </main>
    </div>
  );
}
