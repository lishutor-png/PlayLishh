export type AudioFormat = 'FLAC' | 'WAV' | 'MP3' | 'AAC' | 'OGG' | 'ALAC' | 'M4A' | 'WebM';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  audioUrl?: string; // object URL or data URL
  blobData?: Blob; // for IndexedDB storage
  coverUrl?: string;
  format: AudioFormat;
  sampleRate?: number; // e.g. 96000, 48000, 44100
  bitDepth?: number; // 24-bit, 16-bit
  bitrate?: number; // in kbps e.g. 9216, 1411, 320
  fileSize?: number; // bytes
  isOffline: boolean;
  isFavorite?: boolean;
  addedAt: number;
  lyrics?: string;
  genre?: string;
  colorHex?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
  color?: string;
  isSystem?: boolean; // e.g., Favorites
}

export interface EqualizerBand {
  frequency: number;
  label: string;
  gain: number; // -12dB to +12dB
}

export interface EqualizerPreset {
  id: string;
  name: string;
  gains: number[]; // 5 band values
  bassBoost?: number; // 0 to 100%
  virtualizer?: number; // 0 to 100%
  icon?: string;
}

export interface SleepTimerConfig {
  active: boolean;
  hours: number;
  minutes: number;
  totalSeconds: number;
  remainingSeconds: number;
  targetEndTime: number | null;
  fadeOutSeconds: number; // e.g. 30s
  autoFade: boolean;
}

export interface AudioSettings {
  volume: number; // 0.0 - 1.0
  safeVolumeLimit: number; // e.g. 0.8 (80%)
  safeVolumeEnforced: boolean; // default true for ear safety
  gainBoost: number; // 1.0 (0dB) to 2.5 (+14dB boost for quiet tracks)
  autoGainNormalize: boolean; // auto boost quiet files
  bassBoost: number; // 0 to 100
  virtualizer: number; // 0 to 100
  equalizerBands: number[]; // 5 values in dB
  currentPresetId: string;
  repeatMode: 'off' | 'all' | 'one';
  shuffle: boolean;
  offlineOnly: boolean;
}

export type ActiveTab = 'tracks' | 'playlists' | 'equalizer' | 'offline' | 'settings';

export interface PlaybackSource {
  type: 'all' | 'playlist' | 'offline';
  id?: string;
  title?: string;
}
