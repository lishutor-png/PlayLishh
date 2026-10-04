import { EqualizerBand, EqualizerPreset, AudioSettings } from '../types';

export const EQ_FREQUENCIES: { freq: number; label: string; type: BiquadFilterType }[] = [
  { freq: 60, label: '60 Hz', type: 'lowshelf' },
  { freq: 230, label: '230 Hz', type: 'peaking' },
  { freq: 910, label: '910 Hz', type: 'peaking' },
  { freq: 3600, label: '3.6 kHz', type: 'peaking' },
  { freq: 14000, label: '14 kHz', type: 'highshelf' },
];

export const EQ_PRESETS: EqualizerPreset[] = [
  {
    id: 'flat',
    name: 'Flat / Studio Direct',
    gains: [0, 0, 0, 0, 0],
    bassBoost: 0,
    virtualizer: 0,
  },
  {
    id: 'hires-audiophile',
    name: 'Hi-Res Audiophile Clarity',
    gains: [2, 1, 0, 3, 5],
    bassBoost: 15,
    virtualizer: 25,
  },
  {
    id: 'bass-booster',
    name: 'Deep Bass Extra',
    gains: [8, 5, 1, 0, -1],
    bassBoost: 80,
    virtualizer: 10,
  },
  {
    id: 'vocal',
    name: 'Vocal Clarity & Acoustic',
    gains: [-2, 1, 5, 4, 2],
    bassBoost: 0,
    virtualizer: 20,
  },
  {
    id: 'electronic',
    name: 'Electronic / Synthwave',
    gains: [6, 4, -1, 3, 6],
    bassBoost: 60,
    virtualizer: 40,
  },
  {
    id: 'rock',
    name: 'Rock / Metal Energy',
    gains: [5, 3, -2, 4, 5],
    bassBoost: 40,
    virtualizer: 30,
  },
  {
    id: 'jazz',
    name: 'Smooth Jazz & Warmth',
    gains: [3, 2, 1, 2, 3],
    bassBoost: 25,
    virtualizer: 35,
  },
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private preampGainNode: GainNode | null = null;
  private bassBoostFilter: BiquadFilterNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private compressorNode: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Cached state
  private volume: number = 0.75;
  private safeLimit: number = 0.8;
  private isSafeEnforced: boolean = true;
  private gainBoost: number = 1.0; // 1.0 (0dB) to 2.5 (+14dB)
  private bassBoostVal: number = 0; // 0-100
  private eqBandsState: number[] = [0, 0, 0, 0, 0];

  public init(audioEl: HTMLAudioElement) {
    this.audioElement = audioEl;
    this.updateMasterGain();
  }

  private isDspRequired(): boolean {
    if (this.gainBoost > 1.01) return true;
    if (this.bassBoostVal > 0) return true;
    if (this.eqBandsState.some((b) => Math.abs(b) > 0.1)) return true;
    return false;
  }

  private setupAudioContext() {
    if (this.ctx || !this.audioElement) return;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Keep AudioContext alive if Android attempts to suspend it during active background playback
      this.ctx.onstatechange = () => {
        if (
          this.ctx &&
          (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted') &&
          this.audioElement &&
          !this.audioElement.paused
        ) {
          this.ctx.resume().catch(() => {});
        }
      };

      this.sourceNode = this.ctx.createMediaElementSource(this.audioElement);

      // Reset element volume to 1.0 since masterGainNode will now control output level
      this.audioElement.volume = 1.0;

      // 1. Preamp Gain (Volume Booster for low-volume tracks)
      this.preampGainNode = this.ctx.createGain();
      this.preampGainNode.gain.value = this.gainBoost;

      // 2. Bass Boost Filter (Sub-bass peak 80Hz)
      this.bassBoostFilter = this.ctx.createBiquadFilter();
      this.bassBoostFilter.type = 'lowshelf';
      this.bassBoostFilter.frequency.value = 80;
      this.bassBoostFilter.gain.value = (this.bassBoostVal / 100) * 12;

      // 3. 5-Band Equalizer Filters
      this.eqFilters = EQ_FREQUENCIES.map((freqDef, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.type = freqDef.type;
        filter.frequency.value = freqDef.freq;
        filter.gain.value = this.eqBandsState[idx] || 0;
        return filter;
      });

      // 4. Dynamics Compressor (Anti-Clipping / Limiter to ensure pure sound when boosting)
      this.compressorNode = this.ctx.createDynamicsCompressor();
      this.compressorNode.threshold.setValueAtTime(-2, this.ctx.currentTime);
      this.compressorNode.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressorNode.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressorNode.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressorNode.release.setValueAtTime(0.25, this.ctx.currentTime);

      // 5. Master Gain Node (Enforces user volume + safe limit cap)
      this.masterGainNode = this.ctx.createGain();
      this.updateMasterGain();

      // 6. Analyser Node (Visualizer FFT)
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.82;

      // Connect Audio Graph:
      let lastNode: AudioNode = this.sourceNode;
      lastNode.connect(this.preampGainNode);
      lastNode = this.preampGainNode;

      lastNode.connect(this.bassBoostFilter);
      lastNode = this.bassBoostFilter;

      for (const eqFilter of this.eqFilters) {
        lastNode.connect(eqFilter);
        lastNode = eqFilter;
      }

      lastNode.connect(this.compressorNode);
      this.compressorNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);
    } catch (err) {
      console.warn('Web Audio API initialized with fallback:', err);
    }
  }

  public ensureContextRunning() {
    if (this.isDspRequired() && !this.ctx) {
      this.setupAudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateMasterGain();
  }

  public setSafeLimit(limit: number, enforced: boolean) {
    this.safeLimit = Math.max(0.4, Math.min(1.0, limit));
    this.isSafeEnforced = enforced;
    this.updateMasterGain();
  }

  // Preamp Gain Boost (1.0 = 0dB, 1.5 = +3.5dB, 2.0 = +6dB, 2.5 = +8dB)
  public setGainBoost(boost: number) {
    this.gainBoost = Math.max(1.0, Math.min(2.5, boost));
    this.ensureContextRunning();
    if (this.preampGainNode && this.ctx) {
      this.preampGainNode.gain.setTargetAtTime(this.gainBoost, this.ctx.currentTime, 0.05);
    }
  }

  public setEQBand(index: number, gainDb: number) {
    this.eqBandsState[index] = gainDb;
    this.ensureContextRunning();
    if (this.eqFilters[index] && this.ctx) {
      this.eqFilters[index].gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.05);
    }
  }

  public setEQPreset(preset: EqualizerPreset) {
    this.eqBandsState = [...preset.gains];
    this.ensureContextRunning();
    if (this.ctx) {
      this.eqFilters.forEach((filter, idx) => {
        filter.gain.setTargetAtTime(preset.gains[idx] || 0, this.ctx!.currentTime, 0.05);
      });
    }
    if (preset.bassBoost !== undefined) {
      this.setBassBoost(preset.bassBoost);
    }
  }

  public setBassBoost(value: number) {
    this.bassBoostVal = Math.max(0, Math.min(100, value));
    this.ensureContextRunning();
    if (this.bassBoostFilter && this.ctx) {
      const dbGain = (this.bassBoostVal / 100) * 12;
      this.bassBoostFilter.gain.setTargetAtTime(dbGain, this.ctx.currentTime, 0.05);
    }
  }

  // Restore and sync all audio settings across context & nodes
  public applyFullSettings(settings: AudioSettings) {
    this.volume = Math.max(0, Math.min(1, settings.volume));
    this.safeLimit = Math.max(0.4, Math.min(1.0, settings.safeVolumeLimit));
    this.isSafeEnforced = settings.safeVolumeEnforced;
    this.gainBoost = Math.max(1.0, Math.min(2.5, settings.gainBoost));
    this.bassBoostVal = Math.max(0, Math.min(100, settings.bassBoost));
    if (settings.equalizerBands && settings.equalizerBands.length === 5) {
      this.eqBandsState = [...settings.equalizerBands];
    }

    if (this.ctx) {
      this.updateMasterGain();
      if (this.preampGainNode) {
        this.preampGainNode.gain.setTargetAtTime(this.gainBoost, this.ctx.currentTime, 0.05);
      }
      if (this.bassBoostFilter) {
        const dbGain = (this.bassBoostVal / 100) * 12;
        this.bassBoostFilter.gain.setTargetAtTime(dbGain, this.ctx.currentTime, 0.05);
      }
      this.eqFilters.forEach((filter, idx) => {
        filter.gain.setTargetAtTime(this.eqBandsState[idx] || 0, this.ctx!.currentTime, 0.05);
      });
    } else if (this.audioElement) {
      const effectiveVolume = this.isSafeEnforced && this.volume > this.safeLimit ? this.safeLimit : this.volume;
      this.audioElement.volume = effectiveVolume;
    }
  }

  public getAnalyserData(dataArray: Uint8Array): void {
    if (this.analyserNode && this.ctx && this.ctx.state === 'running') {
      this.analyserNode.getByteFrequencyData(dataArray);
      return;
    }
    // Lightweight hardware-playback visualizer fallback when WebAudio DSP is bypassed
    if (this.audioElement && !this.audioElement.paused) {
      const now = performance.now() * 0.006;
      const len = dataArray.length;
      for (let i = 0; i < len; i++) {
        const wave =
          Math.sin(now + i * 0.25) * 0.4 +
          Math.cos(now * 1.7 - i * 0.15) * 0.35 +
          Math.sin(now * 2.9 + i * 0.5) * 0.25;
        const envelope = Math.max(0.15, 1 - i / (len * 1.1));
        dataArray[i] = Math.min(255, Math.max(12, Math.floor((wave * 0.5 + 0.55) * 210 * envelope)));
      }
    } else {
      dataArray.fill(0);
    }
  }

  public getWaveformData(dataArray: Uint8Array): void {
    if (this.analyserNode && this.ctx && this.ctx.state === 'running') {
      this.analyserNode.getByteTimeDomainData(dataArray);
      return;
    }
    if (this.audioElement && !this.audioElement.paused) {
      const now = performance.now() * 0.008;
      for (let i = 0; i < dataArray.length; i++) {
        dataArray[i] = Math.floor(128 + Math.sin(now + i * 0.18) * 42 * Math.cos(now * 0.5 + i * 0.05));
      }
    } else {
      dataArray.fill(128);
    }
  }

  public getFrequencyBinCount(): number {
    return this.analyserNode ? this.analyserNode.frequencyBinCount : 128;
  }

  // Smooth fade out for sleep timer
  public fadeOutAndStop(durationSec: number = 3, onComplete?: () => void) {
    if (this.masterGainNode && this.ctx) {
      const currentTime = this.ctx.currentTime;
      this.masterGainNode.gain.cancelScheduledValues(currentTime);
      this.masterGainNode.gain.setValueAtTime(this.masterGainNode.gain.value, currentTime);
      this.masterGainNode.gain.linearRampToValueAtTime(0.0001, currentTime + durationSec);

      setTimeout(() => {
        if (this.audioElement) {
          this.audioElement.pause();
        }
        // Restore volume back
        this.updateMasterGain();
        if (onComplete) onComplete();
      }, durationSec * 1000);
    } else {
      if (this.audioElement) {
        this.audioElement.pause();
      }
      if (onComplete) onComplete();
    }
  }

  private updateMasterGain() {
    let effectiveVolume = this.volume;

    // Apply safe hearing limit cap if enabled
    if (this.isSafeEnforced && effectiveVolume > this.safeLimit) {
      effectiveVolume = this.safeLimit;
    }

    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setTargetAtTime(effectiveVolume, this.ctx.currentTime, 0.05);
    } else if (this.audioElement) {
      this.audioElement.volume = effectiveVolume;
    }
  }
}

export const audioEngine = new AudioEngine();
