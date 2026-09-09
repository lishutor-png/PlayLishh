import { useState } from 'react';
import { Sliders, Zap, Volume2, ShieldCheck, Sparkles, RefreshCw, Radio } from 'lucide-react';
import { EQ_FREQUENCIES, EQ_PRESETS, audioEngine } from '../services/audioEngine';
import { AudioSettings, EqualizerPreset } from '../types';

interface EqualizerViewProps {
  settings: AudioSettings;
  onUpdateSettings: (newSettings: Partial<AudioSettings>) => void;
  isPlaying: boolean;
}

export function EqualizerView({
  settings,
  onUpdateSettings,
  isPlaying,
}: EqualizerViewProps) {
  const [activeTab, setActiveTab] = useState<'eq' | 'fx' | 'booster'>('eq');

  const handleBandChange = (index: number, val: number) => {
    const newBands = [...settings.equalizerBands];
    newBands[index] = val;
    audioEngine.setEQBand(index, val);
    onUpdateSettings({
      equalizerBands: newBands,
      currentPresetId: 'custom',
    });
  };

  const handleApplyPreset = (preset: EqualizerPreset) => {
    audioEngine.setEQPreset(preset);
    onUpdateSettings({
      equalizerBands: [...preset.gains],
      currentPresetId: preset.id,
      bassBoost: preset.bassBoost ?? settings.bassBoost,
      virtualizer: preset.virtualizer ?? settings.virtualizer,
    });
  };

  const handleGainBoostChange = (boostVal: number) => {
    audioEngine.setGainBoost(boostVal);
    onUpdateSettings({ gainBoost: boostVal });
  };

  const handleBassBoostChange = (val: number) => {
    audioEngine.setBassBoost(val);
    onUpdateSettings({ bassBoost: val });
  };

  const handleReset = () => {
    const flatPreset = EQ_PRESETS[0];
    handleApplyPreset(flatPreset);
    handleGainBoostChange(1.0);
    handleBassBoostChange(0);
    onUpdateSettings({ virtualizer: 0 });
  };

  const boostDb = Math.round((settings.gainBoost - 1) * 10);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 max-w-2xl mx-auto w-full pb-32">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Sliders className="w-5 h-5 text-[#F27D26]" />
            Audio Studio & Equalizer
          </h1>
          <p className="text-xs text-white/50">
            Penyesuaian kualitas frekuensi & penguat volume cerdas
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Flat
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex p-1 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('eq')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'eq'
              ? 'bg-[#F27D26] text-white shadow-md shadow-[#F27D26]/25'
              : 'text-white/40 hover:text-white'
          }`}
        >
          5-Band EQ
        </button>
        <button
          onClick={() => setActiveTab('booster')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'booster'
              ? 'bg-[#F27D26] text-white shadow-md shadow-[#F27D26]/25'
              : 'text-white/40 hover:text-white'
          }`}
        >
          Volume Booster (+dB)
        </button>
        <button
          onClick={() => setActiveTab('fx')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'fx'
              ? 'bg-[#F27D26] text-white shadow-md shadow-[#F27D26]/25'
              : 'text-white/40 hover:text-white'
          }`}
        >
          Bass & Spatial 3D
        </button>
      </div>

      {/* Preset Chips */}
      <div>
        <div className="text-xs font-medium text-white/40 mb-2 flex items-center justify-between">
          <span className="uppercase tracking-widest text-[10px]">Preset Suara:</span>
          <span className="text-[11px] text-[#F27D26] font-mono font-semibold">
            {EQ_PRESETS.find((p) => p.id === settings.currentPresetId)?.name || 'Kustom'}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {EQ_PRESETS.map((preset) => {
            const isSelected = settings.currentPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/60 shadow-[0_0_12px_rgba(242,125,38,0.25)]'
                    : 'bg-white/[0.03] text-white/50 border-white/10 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: 5-BAND EQUALIZER SLIDERS */}
      {activeTab === 'eq' && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 backdrop-blur-2xl">
          <div className="flex items-center justify-between text-xs text-white/40 pb-2 border-b border-white/10">
            <span className="font-mono text-[#F27D26]">+12 dB</span>
            <span className="font-medium text-white/80 uppercase text-[10px] tracking-[0.2em]">Studio Acoustic Balance</span>
            <span className="font-mono text-[#F27D26]">-12 dB</span>
          </div>

          <div className="flex justify-between items-end h-52 px-2 pt-2">
            {EQ_FREQUENCIES.map((freqDef, idx) => {
              const currentGain = settings.equalizerBands[idx] ?? 0;
              return (
                <div key={freqDef.label} className="flex flex-col items-center gap-2 h-full">
                  {/* Gain Indicator */}
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      currentGain > 0
                        ? 'text-[#F27D26]'
                        : currentGain < 0
                        ? 'text-rose-400'
                        : 'text-white/30'
                    }`}
                  >
                    {currentGain > 0 ? `+${currentGain}` : currentGain}dB
                  </span>

                  {/* Vertical Slider Track Container */}
                  <div className="relative flex-1 flex items-center justify-center w-8">
                    {/* Zero center marker line */}
                    <div className="absolute w-6 h-[1px] bg-white/20 z-0 pointer-events-none" />

                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={currentGain}
                      onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                      className="w-40 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#F27D26] -rotate-90 origin-center z-10"
                    />
                  </div>

                  {/* Frequency Label */}
                  <div className="text-center mt-1">
                    <div className="text-[11px] font-bold text-white">{freqDef.label}</div>
                    <div className="text-[9px] text-white/40 uppercase font-mono tracking-wider">
                      {idx === 0 ? 'Sub-Bass' : idx === 1 ? 'Bass' : idx === 2 ? 'Mid' : idx === 3 ? 'Vocal' : 'Treble'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LOW-VOLUME TRACK BOOSTER (+dB PREAMP) */}
      {activeTab === 'booster' && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F27D26]/15 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Penguat Suara (Gain Booster)
              </h3>
              <p className="text-xs text-white/50">
                Tingkatkan volume lagu rekaman kecil/sunyi secara murni
              </p>
            </div>
          </div>

          {/* Booster Slider Display */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Tingkat Penguatan Audio:</span>
              <span className="font-mono text-base font-bold text-[#F27D26]">
                +{boostDb} dB ({Math.round(settings.gainBoost * 100)}%)
              </span>
            </div>

            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.05"
              value={settings.gainBoost}
              onChange={(e) => handleGainBoostChange(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
            />

            <div className="flex justify-between text-[10px] font-mono text-white/40">
              <span>Normal (0dB)</span>
              <span>Sedang (+5dB)</span>
              <span>Maksimal (+14dB)</span>
            </div>
          </div>

          {/* Smart Auto Normalizer Switch */}
          <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/10">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#F27D26] mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-white">
                  Normalisasi Volume Otomatis (ReplayGain)
                </div>
                <div className="text-[11px] text-white/50">
                  Otomatis menaikkan volume file audio yang terlalu pelan ke standar aman
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoGainNormalize}
              onChange={(e) => {
                const checked = e.target.checked;
                onUpdateSettings({
                  autoGainNormalize: checked,
                  gainBoost: checked ? 1.4 : 1.0,
                });
                audioEngine.setGainBoost(checked ? 1.4 : 1.0);
              }}
              className="w-4 h-4 accent-[#F27D26] rounded cursor-pointer"
            />
          </div>

          {/* Anti-distortion safety badge */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              Kompresor Dinamis Aktif: Mencegah distorsi dan suara pecah saat audio diperkuat.
            </span>
          </div>
        </div>
      )}

      {/* TAB 3: BASS BOOST & SPATIAL VIRTUALIZER */}
      {activeTab === 'fx' && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 backdrop-blur-2xl">
          {/* Bass Boost */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#F27D26]" />
                <span className="text-sm font-semibold text-white">Deep Bass Boost</span>
              </div>
              <span className="font-mono text-xs text-[#F27D26] font-bold">
                {settings.bassBoost}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.bassBoost}
              onChange={(e) => handleBassBoostChange(parseInt(e.target.value, 10))}
              className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
            />
            <p className="text-[11px] text-white/50">
              Meningkatkan resonansi frekuensi rendah di bawah 80Hz untuk dentuman bass yang bertenaga
            </p>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F27D26]" />
                <span className="text-sm font-semibold text-white">Virtualizer Audio 3D</span>
              </div>
              <span className="font-mono text-xs text-[#F27D26] font-bold">
                {settings.virtualizer}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.virtualizer}
              onChange={(e) => onUpdateSettings({ virtualizer: parseInt(e.target.value, 10) })}
              className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
            />
            <p className="text-[11px] text-white/50">
              Memperluas panggung suara stereo untuk pengalaman audio surround yang imersif
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
