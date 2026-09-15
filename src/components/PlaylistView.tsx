import { useState, FormEvent } from 'react';
import {
  ListMusic,
  Plus,
  Play,
  Trash2,
  Music,
  ChevronRight,
  Sparkles,
  Layers,
  Heart,
  X,
  Check,
  Disc,
  Shuffle,
  RotateCcw,
  HardDrive,
} from 'lucide-react';
import { Playlist, AudioTrack, PlaybackSource } from '../types';
import { AppLogo } from './AppLogo';

interface PlaylistViewProps {
  playlists: Playlist[];
  allTracks: AudioTrack[];
  currentTrackId?: string;
  isPlaying: boolean;
  isShuffleActive?: boolean;
  shuffledQueue?: AudioTrack[];
  playbackSource?: PlaybackSource;
  onPlayTrack: (track: AudioTrack, queueTracks: AudioTrack[], source?: PlaybackSource) => void;
  onShufflePlayPlaylist?: (playlist: Playlist, tracks: AudioTrack[]) => void;
  onDisableShuffle?: () => void;
  onCreatePlaylist: (title: string, description: string, color: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onToggleFavorite: (trackId: string) => void;
}

export function PlaylistView({
  playlists,
  allTracks,
  currentTrackId,
  isPlaying,
  isShuffleActive = false,
  shuffledQueue = [],
  playbackSource,
  onPlayTrack,
  onShufflePlayPlaylist,
  onDisableShuffle,
  onCreatePlaylist,
  onDeletePlaylist,
  onRemoveTrackFromPlaylist,
  onToggleFavorite,
}: PlaylistViewProps) {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState('#F27D26');

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  // Get tracks for the selected playlist
  const playlistTracks = selectedPlaylist
    ? selectedPlaylist.trackIds
        .map((id) => allTracks.find((t) => t.id === id))
        .filter((t): t is AudioTrack => t !== undefined)
    : [];

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreatePlaylist(newTitle.trim(), newDesc.trim(), selectedColor);
    setNewTitle('');
    setNewDesc('');
    setIsCreating(false);
  };

  const handlePlayPlaylist = () => {
    if (playlistTracks.length > 0 && selectedPlaylist) {
      onPlayTrack(playlistTracks[0], playlistTracks, {
        type: 'playlist',
        id: selectedPlaylist.id,
        title: selectedPlaylist.title,
      });
    }
  };

  const handleShufflePlay = () => {
    if (playlistTracks.length > 0 && selectedPlaylist && onShufflePlayPlaylist) {
      onShufflePlayPlaylist(selectedPlaylist, playlistTracks);
    }
  };

  const colorOptions = ['#F27D26', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EAB308'];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 max-w-2xl mx-auto w-full pb-32">
      {/* If Inside a Selected Playlist Detail View */}
      {selectedPlaylist ? (
        <div className="space-y-4">
          {/* Back button */}
          <button
            onClick={() => setSelectedPlaylistId(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#F27D26] hover:text-[#ff8a3d] border border-white/10 cursor-pointer transition-all active:scale-95"
          >
            ← Kembali ke Semua Playlist
          </button>

          <div
            className="p-5 sm:p-6 rounded-3xl border border-white/15 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl backdrop-blur-2xl"
            style={{
              background: `linear-gradient(135deg, ${selectedPlaylist.color || '#F27D26'}28, rgba(255, 255, 255, 0.03) 80%)`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0"
                style={{ backgroundColor: selectedPlaylist.color || '#F27D26' }}
              >
                <Disc className="w-7 h-7 sm:w-8 sm:h-8 animate-[spin_10s_linear_infinite]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">{selectedPlaylist.title}</h1>
                <p className="text-xs text-white/60 mt-0.5">
                  {selectedPlaylist.description || 'Koleksi audio berkualitas tinggi'}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-white/50">
                  <span className="font-semibold text-white/80">{playlistTracks.length} Lagu</span>
                  <span>•</span>
                  <span>
                    {Math.round(playlistTracks.reduce((acc, t) => acc + t.duration, 0) / 60)} Menit
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                disabled={playlistTracks.length === 0}
                onClick={handlePlayPlaylist}
                className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#ff8a3d] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#F27D26]/20 disabled:opacity-40 cursor-pointer transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Putar Semua
              </button>

              {isShuffleActive && onDisableShuffle ? (
                <button
                  onClick={onDisableShuffle}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-rose-500/40 cursor-pointer transition-all active:scale-95 shadow-md"
                  title="Hentikan Mode Acak (Kembali ke Urutan Normal)"
                >
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  Hentikan Acak
                </button>
              ) : (
                <button
                  disabled={playlistTracks.length === 0}
                  onClick={handleShufflePlay}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-white/15 disabled:opacity-40 cursor-pointer transition-all active:scale-95 shadow-md"
                  title="Putar playlist ini dalam urutan acak"
                >
                  <Shuffle className="w-4 h-4 text-[#F27D26]" />
                  Putar Acak
                </button>
              )}

              {!selectedPlaylist.isSystem && (
                <button
                  onClick={() => {
                    if (confirm(`Hapus playlist "${selectedPlaylist.title}"?`)) {
                      onDeletePlaylist(selectedPlaylist.id);
                      setSelectedPlaylistId(null);
                    }
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-400 border border-white/10 cursor-pointer transition-colors active:scale-95 shrink-0"
                  title="Hapus Playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Track List inside Playlist */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-white/50 px-1 uppercase tracking-wider text-[10px] flex items-center justify-between">
              <span>Daftar Lagu ({playlistTracks.length})</span>
              {playbackSource?.id === selectedPlaylist.id && isShuffleActive && (
                <span className="text-[10px] text-[#F27D26] font-mono normal-case flex items-center gap-1 bg-[#F27D26]/10 px-2 py-0.5 rounded-full border border-[#F27D26]/25">
                  <Shuffle className="w-3 h-3" /> Mode Acak Aktif ({shuffledQueue.length} Lagu)
                </span>
              )}
            </div>

            {playlistTracks.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-xl space-y-2">
                <Music className="w-10 h-10 text-white/30 mx-auto mb-2" />
                <p className="text-sm font-bold text-white/90">Playlist ini masih kosong</p>
                <p className="text-xs text-white/40 max-w-xs mx-auto">
                  Buka tab Lagu lalu klik ikon (+) untuk menambahkan lagu ke PlayLish ini.
                </p>
              </div>
            ) : (
              playlistTracks.map((track, idx) => {
                const isCurrent = currentTrackId === track.id;
                const isThisPlaylistPlaying = playbackSource?.id === selectedPlaylist.id;
                const shuffleIndex = isThisPlaylistPlaying && isShuffleActive && shuffledQueue.length > 0
                  ? shuffledQueue.findIndex((t) => t.id === track.id)
                  : -1;

                return (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-[#F27D26]/15 border-[#F27D26]/40 shadow-[0_0_15px_rgba(242,125,38,0.15)]'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div
                      onClick={() =>
                        onPlayTrack(track, playlistTracks, {
                          type: 'playlist',
                          id: selectedPlaylist.id,
                          title: selectedPlaylist.title,
                        })
                      }
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <span className="text-xs font-mono text-white/40 w-5 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative">
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-1 bg-[#0d0d10]">
                            <AppLogo size="sm" variant="icon-only" isPlaying={isCurrent && isPlaying} />
                          </div>
                        )}
                        {isCurrent && isPlaying && (
                          <div className="absolute inset-0 bg-[#F27D26]/60 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4
                            className={`text-xs font-semibold truncate ${
                              isCurrent ? 'text-[#F27D26]' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </h4>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-[#F27D26] border border-white/15 shrink-0">
                            {track.format}
                          </span>
                          {shuffleIndex >= 0 && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30 shrink-0">
                              🎲 #{shuffleIndex + 1}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/50 truncate mt-0.5">
                          {track.artist} • {track.album}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-white/45 truncate">
                          {(track.filePath || track.fileName) && (
                            <span
                              className="truncate flex items-center gap-1 font-mono text-white/40 max-w-[150px] sm:max-w-[200px]"
                              title={`Lokasi berkas: ${track.filePath || track.fileName}`}
                            >
                              <HardDrive className="w-3 h-3 text-white/30 shrink-0" />
                              <span className="truncate">{track.filePath || track.fileName}</span>
                            </span>
                          )}
                          {track.hasMatchedLrc || track.lyrics ? (
                            <span
                              className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30 shrink-0"
                              title={
                                track.lrcFileName
                                  ? `Lirik otomatis dari: ${track.lrcFileName}`
                                  : 'Lirik lagu tersinkronisasi'
                              }
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>.LRC Terhubung</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

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

                      {/* Remove Song From Playlist */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTrackFromPlaylist(selectedPlaylist.id, track.id);
                        }}
                        className="w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center text-white/60 hover:text-rose-400 cursor-pointer rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 transition-colors active:scale-95"
                        title="Hapus dari Playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* PLAYLISTS OVERVIEW / LIST */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppLogo size="md" variant="icon-only" isPlaying={isPlaying} />
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  PlayLish Saya
                </h1>
                <p className="text-xs text-white/50">
                  Kelola daftar putar lagu favorit berkualitas tinggi Anda
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F27D26] hover:bg-[#ff8a3d] text-white font-bold text-xs shadow-lg shadow-[#F27D26]/20 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Buat PlayLish
            </button>
          </div>

          {/* Create Playlist Modal / Drawer */}
          {isCreating && (
            <form
              onSubmit={handleCreateSubmit}
              className="p-5 rounded-3xl bg-[#0E0E0E] border border-white/15 shadow-2xl space-y-4 animate-in fade-in backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-bold text-[#F27D26] uppercase tracking-wider">Buat PlayLish Baru</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-1 text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[11px] text-white/50 font-medium block mb-1">
                  Nama PlayLish
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hi-Res Chill Malam"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-2xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F27D26] transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] text-white/50 font-medium block mb-1">
                  Deskripsi Singkat
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Koleksi FLAC & WAV 24-bit"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-2xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F27D26] transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] text-white/50 font-medium block mb-1.5">
                  Warna Tema
                </label>
                <div className="flex gap-2.5">
                  {colorOptions.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer shadow-md ${
                        selectedColor === c ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white bg-white/5 border border-white/10 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#F27D26] hover:bg-[#ff8a3d] flex items-center gap-1.5 shadow-lg shadow-[#F27D26]/20 cursor-pointer active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  Simpan PlayLish
                </button>
              </div>
            </form>
          )}

          {/* Grid of Playlists */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {playlists.map((pl) => {
              const count = pl.trackIds.length;
              return (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylistId(pl.id)}
                  className="p-4 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all cursor-pointer group hover:shadow-xl relative overflow-hidden flex items-center justify-between backdrop-blur-xl"
                >
                  <div
                    className="absolute top-0 left-0 bottom-0 w-1.5"
                    style={{ backgroundColor: pl.color || '#F27D26' }}
                  />

                  <div className="flex items-center gap-3.5 pl-2 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg"
                      style={{ backgroundColor: `${pl.color || '#F27D26'}33` }}
                    >
                      <Layers
                        className="w-6 h-6"
                        style={{ color: pl.color || '#F27D26' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-white truncate group-hover:text-[#F27D26] transition-colors">
                        {pl.title}
                      </h3>
                      <p className="text-[11px] text-white/50 truncate mt-0.5">
                        {pl.description || `${count} lagu`}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-mono text-[#F27D26] font-semibold">
                        {count} Lagu
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#F27D26] group-hover:translate-x-0.5 transition-all" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

