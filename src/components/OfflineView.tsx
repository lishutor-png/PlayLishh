import { useState } from 'react';
import { HardDriveDownload, WifiOff, CheckCircle2, Trash2, Music, Play, ShieldCheck, Database, AlertTriangle } from 'lucide-react';
import { AudioTrack } from '../types';

interface OfflineViewProps {
  tracks: AudioTrack[];
  currentTrackId?: string;
  isPlaying: boolean;
  offlineOnly: boolean;
  onToggleOfflineOnly: (enabled: boolean) => void;
  onPlayTrack: (track: AudioTrack, queueTracks: AudioTrack[]) => void;
  onDeleteTrack: (trackId: string) => void;
}

export function OfflineView({
  tracks,
  currentTrackId,
  isPlaying,
  offlineOnly,
  onToggleOfflineOnly,
  onPlayTrack,
  onDeleteTrack,
}: OfflineViewProps) {
  const [trackToDelete, setTrackToDelete] = useState<AudioTrack | null>(null);
  const offlineTracks = tracks.filter((t) => t.isOffline);
  const totalSizeBytes = offlineTracks.reduce((acc, t) => acc + (t.fileSize || 5000000), 0);
  const totalSizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 max-w-2xl mx-auto w-full pb-32">
      {/* Title & Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <HardDriveDownload className="w-5 h-5 text-[#F27D26]" />
            Mode & Penyimpanan Offline
          </h1>
          <p className="text-xs text-white/50">
            Dengarkan musik Hi-Res tanpa kuota atau koneksi internet
          </p>
        </div>
      </div>

      {/* Offline Mode Banner */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl space-y-4 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Koneksi Offline Mandiri
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  IndexedDB
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                Semua audio disimpan lokal di browser/perangkat Anda
              </p>
            </div>
          </div>

          {/* Toggle Offline Only Filter */}
          <button
            onClick={() => onToggleOfflineOnly(!offlineOnly)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              offlineOnly
                ? 'bg-[#F27D26] text-white border-[#F27D26] shadow-lg shadow-[#F27D26]/20'
                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {offlineOnly ? 'Mode Offline ON' : 'Mode Offline OFF'}
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-white/10 text-center">
          <div className="p-3 rounded-2xl bg-black/30 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Lagu Offline</div>
            <div className="text-sm font-bold text-white mt-0.5">{offlineTracks.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-black/30 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Ruang Terpakai</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{totalSizeMb} MB</div>
          </div>
          <div className="p-3 rounded-2xl bg-black/30 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Format Audio</div>
            <div className="text-sm font-bold text-[#F27D26] mt-0.5">Lossless/Hi-Res</div>
          </div>
        </div>
      </div>

      {/* Offline Track List */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-white/40 px-1 flex items-center justify-between uppercase tracking-wider text-[10px]">
          <span>Lagu Tersimpan Offline ({offlineTracks.length})</span>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1 normal-case font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Siap Diputar Kapan Saja
          </span>
        </div>

        {offlineTracks.map((track) => {
          const isCurrent = currentTrackId === track.id;
          return (
            <div
              key={track.id}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                isCurrent
                  ? 'bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
              }`}
            >
              <div
                onClick={() => onPlayTrack(track, offlineTracks)}
                className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative">
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40">
                      <Music className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3
                      className={`text-xs font-semibold truncate ${
                        isCurrent ? 'text-emerald-400' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </h3>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {track.format}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40 truncate mt-0.5">
                    {track.artist} • {track.album}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onPlayTrack(track, offlineTracks)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-white/60 hover:text-emerald-400 border border-white/10 cursor-pointer transition-colors"
                  title="Putar Lagu"
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
                <button
                  onClick={() => setTrackToDelete(track)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 border border-white/10 cursor-pointer transition-colors"
                  title="Hapus Lagu dari Penyimpanan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {trackToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0E0E0E] border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-white space-y-4 backdrop-blur-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Hapus dari Offline?</h3>
                <p className="text-[11px] text-white/50">Tindakan ini permanen</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
              <p className="text-xs font-semibold text-white truncate">&quot;{trackToDelete.title}&quot;</p>
              <p className="text-[11px] text-white/50 truncate">{trackToDelete.artist} • {trackToDelete.format}</p>
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              File audio ini akan dihapus dari memori lokal (IndexedDB) dan ruang penyimpanan perangkat akan dibebaskan.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setTrackToDelete(null)}
                className="flex-1 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 border border-white/10 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteTrack(trackToDelete.id);
                  setTrackToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/40 cursor-pointer transition-colors"
              >
                Ya, Hapus Lagu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
