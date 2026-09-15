import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  FolderOpen,
  FileAudio,
  Sparkles,
  FileText,
  CheckCircle2,
  HardDrive,
  Info,
  Layers,
} from 'lucide-react';

interface ImportSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFiles: (files: FileList | File[]) => void;
  existingTracksCount: number;
}

export function ImportSongModal({
  isOpen,
  onClose,
  onImportFiles,
  existingTracksCount,
}: ImportSongModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
      onClose();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
      onClose();
    }
  };

  return (
    <div
      id="import-song-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#121214] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/20 border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Pilih & Masukkan Lagu
              </h3>
              <p className="text-xs text-white/50">
                Penyimpanan HP atau Komputer • Otomatis Lirik .LRC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Zone */}
        <div
          className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer ${
            isDragging
              ? 'border-[#F27D26] bg-[#F27D26]/15 scale-[1.01]'
              : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F27D26] mb-1">
            <FileAudio className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-white">
            Tarik & Lepaskan File Lagu (.mp3, .flac, dll) di Sini
          </span>
          <p className="text-xs text-white/40 max-w-xs">
            Atau klik untuk membuka jendela pemilihan berkas di penyimpanan perangkat Anda.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              MP3, FLAC, WAV, AAC, M4A
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
              + File .LRC
            </span>
          </div>
        </div>

        {/* Action Buttons: Files vs Folder */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Button 1: Pilih File Lagu (+ File .LRC) */}
          <button
            id="btn-modal-pick-files"
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 flex flex-col gap-2 cursor-pointer transition-all hover:border-[#F27D26]/60 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#F27D26]/20 text-[#F27D26] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileAudio className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-mono text-[#F27D26] font-bold">Pilihan File</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-[#F27D26] transition-colors">
                Pilih File Lagu & .LRC
              </div>
              <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                Pilih satu atau banyak lagu MP3 beserta berkas .lrc sekaligus.
              </p>
            </div>
          </button>

          {/* Button 2: Pilih Folder Musik Lengkap */}
          <button
            id="btn-modal-pick-folder"
            onClick={() => folderInputRef.current?.click()}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 flex flex-col gap-2 cursor-pointer transition-all hover:border-[#F27D26]/60 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderOpen className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold">Pindai Folder</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                Pilih Folder Musik
              </div>
              <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                Pindai seluruh folder lagu di HP/PC beserta semua file .lrc di dalamnya.
              </p>
            </div>
          </button>
        </div>

        {/* Flow Explanation Guide */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-white/80 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Alur Pemutaran & Pembacaan Lagu</span>
          </div>

          <div className="space-y-1.5 text-white/60 text-[11px]">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center font-mono text-[9px] shrink-0 mt-0.5">
                1
              </span>
              <span>
                <strong className="text-white/90">Akses Penyimpanan:</strong> Mengakses file lagu langsung dari HP/komputer tanpa perlu menyalin ulang berkas.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center font-mono text-[9px] shrink-0 mt-0.5">
                2
              </span>
              <span>
                <strong className="text-white/90">Otomatis Lirik .LRC:</strong> Jika ada file .lrc dengan nama lagu yang sama, PlayLish langsung membaca dan menyinkronkan lirik tanpa perlu dimuat berulang.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center font-mono text-[9px] shrink-0 mt-0.5">
                3
              </span>
              <span>
                <strong className="text-white/90">Ekstraksi Info:</strong> Membaca judul, artis, album, durasi, dan sampul album asli dari file audio.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center font-mono text-[9px] shrink-0 mt-0.5">
                4
              </span>
              <span>
                <strong className="text-white/90">Audio Engine:</strong> Saat ditekan Play, audio engine langsung membunyikan suara melalui equalizer 5-band dan limiter.
              </span>
            </div>
          </div>
        </div>

        {/* Hidden Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="audio/*,.flac,.wav,.mp3,.aac,.ogg,.m4a,.alac,.lrc,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        <input
          type="file"
          ref={folderInputRef}
          multiple
          {...({ webkitdirectory: '', directory: '' } as any)}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
