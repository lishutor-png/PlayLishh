import { useState, useRef, ChangeEvent } from 'react';
import {
  Music,
  Play,
  Pause,
  Plus,
  Upload,
  Search,
  Heart,
  ListPlus,
  Sparkles,
  Check,
  X,
  FileAudio,
  HardDrive,
  Trash2,
  Shuffle,
  RotateCcw,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { AudioTrack, Playlist, AudioFormat } from '../types';
import { AppLogo } from './AppLogo';

interface TracksViewProps {
  tracks: AudioTrack[];
  playlists: Playlist[];
  currentTrackId?: string;
  isPlaying: boolean;
  isShuffleActive?: boolean;
  shuffledQueue?: AudioTrack[];
  onPlayTrack: (track: AudioTrack, queueTracks: AudioTrack[]) => void;
  onShufflePlayAll?: (tracks: AudioTrack[]) => void;
  onDisableShuffle?: () => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onImportFiles: (files: FileList) => void;
  onDeleteTrack: (trackId: string) => void;
  onOpenLyricEditor?: (track: AudioTrack) => void;
}

export function TracksView({
  tracks,
  playlists,
  currentTrackId,
  isPlaying,
  isShuffleActive = false,
  shuffledQueue = [],
  onPlayTrack,
  onShufflePlayAll,
  onDisableShuffle,
  onTogglePlay,
  onToggleFavorite,
  onAddTrackToPlaylist,
  onImportFiles,
  onDeleteTrack,
  onOpenLyricEditor,
}: TracksViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [targetTrackForPlaylist, setTargetTrackForPlaylist] = useState<AudioTrack | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<AudioTrack | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filtered tracks
  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.album.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFormat === 'favorite') return t.isFavorite;
    if (selectedFormat === 'all') return true;
    return t.format.toLowerCase() === selectedFormat.toLowerCase();
  });

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full pb-32">
      {/* Brand Hero Card with Adaptive Button Arrangement */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent border border-white/10 shadow-xl backdrop-blur-2xl relative overflow-hidden flex flex-col gap-3.5">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#F27D26]/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Top Row: App Logo & Track Counter Badge */}
        <div className="flex items-center justify-between relative z-10">
          <AppLogo size="lg" variant="full" isPlaying={isPlaying} />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-semibold text-white/60 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
              {tracks.length} Lagu
            </span>
          </div>
        </div>

        {/* Action Buttons Row: Big, Ergonomic & Thumb-friendly */}
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 relative z-10 pt-1 border-t border-white/5">
          {tracks.length > 1 && (
            isShuffleActive && onDisableShuffle ? (
              <button
                id="btn-stop-shuffle-hero"
                onClick={onDisableShuffle}
                className="col-span-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs border border-rose-500/40 cursor-pointer shadow-md transition-all active:scale-95"
                title="Hentikan Mode Acak (Kembali ke Urutan Normal)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Hentikan Acak</span>
              </button>
            ) : onShufflePlayAll ? (
              <button
                id="btn-shuffle-all-hero"
                onClick={() => onShufflePlayAll(filteredTracks.length > 0 ? filteredTracks : tracks)}
                className="col-span-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 cursor-pointer shadow-md transition-all active:scale-95"
                title="Putar Acak Semua Lagu"
              >
                <Shuffle className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Putar Acak</span>
              </button>
            ) : null
          )}
          <button
            id="btn-import-hero"
            onClick={() => fileInputRef.current?.click()}
            className={`${
              tracks.length > 1 ? 'col-span-1 sm:flex-none' : 'col-span-2 sm:flex-none'
            } flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#ff8a3d] text-white font-bold text-xs shadow-lg shadow-[#F27D26]/25 cursor-pointer transition-all active:scale-95`}
            title="Impor Audio dari Perangkat"
          >
            <Upload className="w-4 h-4" />
            <span>Impor Audio</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="audio/*,.flac,.wav,.mp3,.aac,.ogg,.m4a,.alac"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Section Title & Statistics */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
            <Music className="w-4 h-4 text-[#F27D26]" />
            Daftar Lagu ({tracks.length})
          </h2>
          <p className="text-[11px] text-white/50">
            Koleksi audio Hi-Res dan format lossless tersimpan di perangkat
          </p>
        </div>
      </div>

      {/* Search Input with Clear Button */}
      <div className="relative">
        <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari lagu, artis, atau album..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 bg-white/[0.04] border border-white/10 rounded-2xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F27D26] transition-colors backdrop-blur-xl"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white bg-white/10 rounded-full cursor-pointer transition-colors"
            title="Hapus pencarian"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Format Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'Semua Format' },
          { id: 'flac', label: 'FLAC (Hi-Res)' },
          { id: 'wav', label: 'WAV Lossless' },
          { id: 'mp3', label: 'MP3' },
          { id: 'alac', label: 'ALAC' },
          { id: 'favorite', label: 'Favorit' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFormat(tab.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedFormat === tab.id
                ? 'bg-[#F27D26] text-white border-[#F27D26] shadow-md shadow-[#F27D26]/20'
                : 'bg-white/[0.04] text-white/60 border-white/10 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tracks List */}
      <div className="space-y-2">
        {filteredTracks.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-xl space-y-3">
            <AppLogo size="md" variant="icon-only" className="mx-auto" />
            <p className="text-sm font-bold text-white/90">Tidak ada lagu ditemukan</p>
            <p className="text-xs text-white/40 max-w-xs mx-auto">
              Klik tombol &quot;Impor Audio&quot; untuk menambahkan file FLAC, WAV, MP3, atau AAC dari perangkat Anda.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F27D26] hover:bg-[#ff8a3d] text-white font-bold text-xs shadow-lg shadow-[#F27D26]/25 cursor-pointer transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              Impor File Audio
            </button>
          </div>
        ) : (
          filteredTracks.map((track) => {
            const isCurrent = currentTrackId === track.id;
            return (
              <div
                key={track.id}
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all group ${
                  isCurrent
                    ? 'bg-[#F27D26]/15 border-[#F27D26]/40 shadow-[0_0_15px_rgba(242,125,38,0.15)]'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                {/* Track Details & Click to Play */}
                <div
                  onClick={() => {
                    if (isCurrent) {
                      onTogglePlay();
                    } else {
                      onPlayTrack(track, filteredTracks);
                    }
                  }}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative shadow">
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/40 bg-white/5">
                        <Music className="w-5 h-5" />
                      </div>
                    )}
                    {/* Play/Pause Overlay Button */}
                    <div
                      className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                        isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-5 h-5 text-[#F27D26] fill-current" />
                      ) : (
                        <Play className="w-5 h-5 text-[#F27D26] fill-current translate-x-0.5" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3
                        className={`text-xs font-bold truncate ${
                          isCurrent ? 'text-[#F27D26]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </h3>
                      {/* Audio Format Pill */}
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30 shrink-0">
                        {track.format}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-white/50 truncate mt-0.5">
                      <span className="truncate">{track.artist}</span>
                      <span>•</span>
                      {track.sampleRate && (
                        <span className="text-[10px] font-mono text-white/40">
                          {track.sampleRate >= 1000
                            ? `${track.sampleRate / 1000}kHz`
                            : `${track.sampleRate}Hz`}
                          {track.bitDepth ? `/${track.bitDepth}b` : ''}
                        </span>
                      )}
                      <span>•</span>
                      <span className="font-mono text-[10px]">
                        {formatDuration(track.duration)}
                      </span>
                      {isShuffleActive && shuffledQueue.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-[#F27D26] bg-[#F27D26]/10 px-1 py-0.2 rounded font-semibold">
                            🎲 #{shuffledQueue.findIndex((t) => t.id === track.id) + 1}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Favorite, Add to Playlist & Delete with High Visibility */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    className="w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center text-white/60 hover:text-rose-400 cursor-pointer rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors active:scale-95"
                    title={track.isFavorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${
                        track.isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : ''
                      }`}
                    />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTargetTrackForPlaylist(track);
                    }}
                    className="w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center text-white/60 hover:text-[#F27D26] cursor-pointer rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors active:scale-95"
                    title="Tambah ke PlayLish"
                  >
                    <ListPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {onOpenLyricEditor && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLyricEditor(track);
                      }}
                      className={`w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center cursor-pointer rounded-xl border transition-colors active:scale-95 ${
                        track.lyrics
                          ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/40 shadow-sm'
                          : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                      title={track.lyrics ? 'Lirik Tersedia (Ketuk untuk Edit)' : 'Sematkan Lirik ke Lagu Ini'}
                    >
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackToDelete(track);
                    }}
                    className="w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center text-white/50 hover:text-rose-400 cursor-pointer rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 transition-colors active:scale-95"
                    title="Hapus Lagu dari Penyimpanan"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Track Confirmation Modal */}
      {trackToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0E0E0E] border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-white space-y-4 backdrop-blur-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Hapus Lagu Tersimpan?</h3>
                <p className="text-[11px] text-white/50">Tindakan ini permanen</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
              <p className="text-xs font-semibold text-white truncate">&quot;{trackToDelete.title}&quot;</p>
              <p className="text-[11px] text-white/50 truncate">{trackToDelete.artist} • {trackToDelete.format}</p>
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              File audio dan data lagu ini akan dihapus dari memori lokal (IndexedDB) serta semua playlist.
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

      {/* Add To Playlist Dialog */}
      {targetTrackForPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0E0E0E] border border-white/15 rounded-3xl p-6 shadow-2xl text-white backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ListPlus className="w-4 h-4 text-[#F27D26]" />
                Tambah ke PlayLish
              </h3>
              <button
                onClick={() => setTargetTrackForPlaylist(null)}
                className="p-1 rounded-full text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3">
              <p className="text-xs text-white/50 mb-3 truncate">
                Pilih playlist untuk lagu: &quot;{targetTrackForPlaylist.title}&quot;
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {playlists.map((pl) => {
                  const isInPlaylist = pl.trackIds.includes(targetTrackForPlaylist.id);
                  return (
                    <button
                      key={pl.id}
                      onClick={() => {
                        onAddTrackToPlaylist(pl.id, targetTrackForPlaylist.id);
                        setTargetTrackForPlaylist(null);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left cursor-pointer transition-colors ${
                        isInPlaylist
                          ? 'bg-[#F27D26]/10 border-[#F27D26]/30 text-white'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] text-white/80'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold">{pl.title}</div>
                        <div className="text-[10px] text-white/40">
                          {pl.trackIds.length} lagu
                        </div>
                      </div>
                      {isInPlaylist ? (
                        <span className="text-[10px] font-medium text-[#F27D26] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Sudah Ada
                        </span>
                      ) : (
                        <Plus className="w-4 h-4 text-white/40" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setTargetTrackForPlaylist(null)}
              className="w-full py-2.5 mt-2 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 border border-white/10 cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

