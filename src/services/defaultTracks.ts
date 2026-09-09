import { AudioTrack } from '../types';

// Utility to generate a high quality PCM WAV Blob in memory with rich musical harmony
function generateSynthesizedTrackBlob(
  type: 'synthwave' | 'acoustic' | 'ambient' | 'jazz',
  sampleRate: number = 44100,
  durationSec: number = 60
): Blob {
  const numChannels = 2;
  const numFrames = Math.floor(sampleRate * durationSec);
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV Header
  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Music synthesis parameters
  let offset = 44;
  const bpm = type === 'synthwave' ? 120 : type === 'acoustic' ? 84 : type === 'jazz' ? 96 : 60;
  const beatDuration = 60 / bpm;

  // Scale frequencies (Chords: Am, F, C, G)
  const chordProg = [
    [220.0, 261.63, 329.63, 440.0], // A minor
    [174.61, 220.0, 261.63, 349.23], // F major
    [130.81, 164.81, 196.0, 261.63], // C major
    [196.0, 246.94, 293.66, 392.0], // G major
  ];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const currentChordIndex = Math.floor((t / (beatDuration * 4)) % chordProg.length);
    const chord = chordProg[currentChordIndex];
    const beatPhase = (t % beatDuration) / beatDuration;

    let left = 0;
    let right = 0;

    if (type === 'synthwave') {
      // Bassline (8th notes)
      const bassPhase = (t % (beatDuration / 2)) / (beatDuration / 2);
      const bassFreq = chord[0] / 2;
      const bassEnv = Math.exp(-bassPhase * 3.5);
      const bass = (Math.sin(2 * Math.PI * bassFreq * t) + 0.3 * Math.sin(4 * Math.PI * bassFreq * t)) * bassEnv * 0.35;

      // Synth Arpeggio (16th notes)
      const arpIndex = Math.floor((t / (beatDuration / 4)) % 4);
      const arpFreq = chord[arpIndex] * 2;
      const arpPhase = (t % (beatDuration / 4)) / (beatDuration / 4);
      const arpEnv = Math.exp(-arpPhase * 5);
      const arp = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.18;

      // Kick & Snare Simulation
      const kickEnv = Math.max(0, 1 - beatPhase * 6);
      const kick = Math.sin(2 * Math.PI * (60 + 120 * kickEnv) * t) * kickEnv * 0.4;

      const snareTrigger = ((t / beatDuration) % 2 >= 1 && (t / beatDuration) % 2 < 1.1);
      const snareNoise = snareTrigger ? (Math.random() * 2 - 1) * Math.exp(-((t % beatDuration) - 1) * 8) * 0.25 : 0;

      // Lush Pad
      const pad = (
        Math.sin(2 * Math.PI * chord[1] * t) * 0.08 +
        Math.sin(2 * Math.PI * chord[2] * t) * 0.08 +
        Math.sin(2 * Math.PI * chord[3] * t * 1.002) * 0.08
      );

      left = bass + arp * 0.8 + kick + snareNoise + pad;
      right = bass + arp * 0.2 + kick + snareNoise * 0.9 + pad * 1.05;

    } else if (type === 'acoustic') {
      // Acoustic fingerpicking guitar simulation with gentle resonance
      const pickIndex = Math.floor((t / (beatDuration / 2)) % 4);
      const stringFreq = chord[pickIndex];
      const pickPhase = (t % (beatDuration / 2)) / (beatDuration / 2);
      const stringEnv = Math.exp(-pickPhase * 3);
      const guitar = (
        Math.sin(2 * Math.PI * stringFreq * t) +
        0.5 * Math.sin(4 * Math.PI * stringFreq * t) +
        0.2 * Math.sin(6 * Math.PI * stringFreq * t)
      ) * stringEnv * 0.3;

      // Warm cello drone in sub
      const cello = Math.sin(2 * Math.PI * (chord[0] / 2) * t) * 0.15;
      
      left = guitar * 0.9 + cello;
      right = guitar * 0.7 + cello * 1.1;

    } else if (type === 'jazz') {
      // Smooth electric piano Rhodes sound
      const chordTone1 = Math.sin(2 * Math.PI * chord[0] * t) * Math.exp(-beatPhase * 1.5) * 0.2;
      const chordTone2 = Math.sin(2 * Math.PI * chord[1] * t) * Math.exp(-beatPhase * 1.5) * 0.18;
      const chordTone3 = Math.sin(2 * Math.PI * chord[2] * t) * Math.exp(-beatPhase * 1.5) * 0.18;
      const chordTone4 = Math.sin(2 * Math.PI * chord[3] * t) * Math.exp(-beatPhase * 1.5) * 0.15;
      
      // Ride cymbal
      const cymbalPhase = (t % (beatDuration / 2)) / (beatDuration / 2);
      const ride = (Math.random() * 2 - 1) * Math.exp(-cymbalPhase * 10) * 0.06;

      left = (chordTone1 + chordTone2 + chordTone3) + ride;
      right = (chordTone1 + chordTone3 + chordTone4) + ride * 0.8;

    } else {
      // Audiophile Ambient soundscape (96kHz high dynamic range feel)
      const ambient1 = Math.sin(2 * Math.PI * 110 * t) * (0.15 + 0.05 * Math.sin(t * 0.2));
      const ambient2 = Math.sin(2 * Math.PI * 220 * t + Math.sin(t * 0.5)) * 0.12;
      const ambient3 = Math.sin(2 * Math.PI * 440 * t) * (0.08 + 0.04 * Math.cos(t * 0.3));
      const shimmer = Math.sin(2 * Math.PI * 880 * t + Math.sin(t * 0.8)) * 0.05;

      left = ambient1 + ambient2 * 0.8 + shimmer;
      right = ambient1 * 0.9 + ambient3 + shimmer * 1.2;
    }

    // Soft clip to prevent any distortion
    left = Math.max(-0.95, Math.min(0.95, left));
    right = Math.max(-0.95, Math.min(0.95, right));

    const sL = left < 0 ? left * 32768 : left * 32767;
    const sR = right < 0 ? right * 32768 : right * 32767;

    view.setInt16(offset, sL, true);
    view.setInt16(offset + 2, sR, true);
    offset += 4;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export const INITIAL_DEFAULT_TRACKS: AudioTrack[] = [
  {
    id: 'track-flac-01',
    title: 'Neon Skyline Horizon (Hi-Res)',
    artist: 'Aura Sound Labs',
    album: 'Audiophile Master Session Vol. 1',
    duration: 60,
    format: 'FLAC',
    sampleRate: 96000,
    bitDepth: 24,
    bitrate: 4608,
    fileSize: 34560000,
    isOffline: true,
    isFavorite: true,
    genre: 'Synthwave / Hi-Res',
    addedAt: Date.now() - 3600000 * 4,
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    colorHex: '#06b6d4',
    lyrics: `[00:00] In the midnight city glow
[00:08] High fidelity signals flowing slow
[00:16] Clear acoustics in the air
[00:24] 24-bit audio everywhere
[00:32] Feel the sub-bass pulse beneath the floor
[00:40] Pure sound waves forevermore`
  },
  {
    id: 'track-wav-02',
    title: 'Midnight Rain Resonance',
    artist: 'Velvet Strings & Piano',
    album: 'Acoustic Chambers Uncompressed',
    duration: 60,
    format: 'WAV',
    sampleRate: 48000,
    bitDepth: 24,
    bitrate: 2304,
    fileSize: 17280000,
    isOffline: true,
    isFavorite: true,
    genre: 'Acoustic / Studio Master',
    addedAt: Date.now() - 3600000 * 3,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    colorHex: '#10b981',
    lyrics: `[00:00] Gentle rain against the window pane
[00:12] Acoustic resonance soothes the strain
[00:24] String harmonics ring out true
[00:36] Pure frequencies just for you`
  },
  {
    id: 'track-alac-03',
    title: 'Velvet Groove & Blue Brass',
    artist: 'Miles Quintet Collective',
    album: 'Late Night Studio Sessions',
    duration: 60,
    format: 'ALAC',
    sampleRate: 48000,
    bitDepth: 24,
    bitrate: 1850,
    fileSize: 13800000,
    isOffline: true,
    isFavorite: false,
    genre: 'Jazz / Studio Master',
    addedAt: Date.now() - 3600000 * 2,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    colorHex: '#f59e0b',
    lyrics: `[00:00] Smooth brass melodies in twilight
[00:15] Electric piano sparkling bright
[00:30] Swing rhythm keeping steady time
[00:45] Uncompressed lossless sonic climb`
  },
  {
    id: 'track-flac-04',
    title: 'Ethereal Cosmic Drift (Low-Gain Track)',
    artist: 'Deep Space Soundscape',
    album: 'Stellar Harmonics Master',
    duration: 60,
    format: 'FLAC',
    sampleRate: 96000,
    bitDepth: 24,
    bitrate: 4608,
    fileSize: 34560000,
    isOffline: true,
    isFavorite: false,
    genre: 'Ambient / Quiet Master',
    addedAt: Date.now() - 3600000,
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    colorHex: '#8b5cf6',
    lyrics: `[00:00] Floating across the silent void
[00:15] Low gain acoustic signals deployed
[00:30] Use volume booster to amplify the detail
[00:45] Safe listening mode will never fail`
  }
];

export async function prepareTrackBlob(track: AudioTrack): Promise<Blob> {
  if (track.blobData) return track.blobData;

  // Generate appropriate procedural high-fidelity WAV blob based on track type
  if (track.id.includes('flac-01')) {
    return generateSynthesizedTrackBlob('synthwave', 48000, 60);
  } else if (track.id.includes('wav-02')) {
    return generateSynthesizedTrackBlob('acoustic', 48000, 60);
  } else if (track.id.includes('alac-03')) {
    return generateSynthesizedTrackBlob('jazz', 48000, 60);
  } else {
    return generateSynthesizedTrackBlob('ambient', 48000, 60);
  }
}
