import { EqualizerBand, EqualizerPreset } from '../types';

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

    const setupAudioContext = () => {
      if (this.ctx) return;
      try {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtxClass();

        if (this.audioElement) {
          this.sourceNode = this.ctx.createMediaElementSource(this.audioElement);

          // 1. Preamp Gain (Volume Booster for low-volume tracks)
          this.preampGainNode = this.ctx.createGain();
          this.preampGainNode.gain.value = this.gainBoost;

          // 2. Bass Boost Filter (Sub-bass peak 50Hz)
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
          // Source -> Preamp -> BassBoost -> EQ Filters in series -> Compressor -> MasterGain -> Analyser -> Destination
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
        }
      } catch (err) {
        console.warn('Web Audio API initialized with fallback:', err);
      }
    };

    // User gesture unlock for audio context
    const unlock = () => {
      setupAudioContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  public ensureContextRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
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
    if (this.preampGainNode && this.ctx) {
      this.preampGainNode.gain.setTargetAtTime(this.gainBoost, this.ctx.currentTime, 0.05);
    }
  }

  public setEQBand(index: number, gainDb: number) {
    this.eqBandsState[index] = gainDb;
    if (this.eqFilters[index] && this.ctx) {
      this.eqFilters[index].gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.05);
    }
  }

  public setEQPreset(preset: EqualizerPreset) {
    this.eqBandsState = [...preset.gains];
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
    if (this.bassBoostFilter && this.ctx) {
      const dbGain = (this.bassBoostVal / 100) * 12;
      this.bassBoostFilter.gain.setTargetAtTime(dbGain, this.ctx.currentTime, 0.05);
    }
  }

  public getAnalyserData(dataArray: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(dataArray);
    }
  }

  public getWaveformData(dataArray: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteTimeDomainData(dataArray);
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
