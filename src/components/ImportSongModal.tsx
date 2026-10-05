import React, { useRef, useState } from 'react';
import {
  X,
  FolderOpen,
  FileAudio,
  Sparkles,
  HardDrive,
  Smartphone,
  Zap,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { isNativeAndroidApp } from '../services/fileRegistry';

interface ImportSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFiles: (files: FileList | File[]) => void;
  onScanDeviceMusic?: () => Promise<void>;
  existingTracksCount: number;
}

export function ImportSongModal({
  isOpen,
  onClose,
  onImportFiles,
  onScanDeviceMusic,
}: ImportSongModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  if (!isOpen) return null;

  const isAndroid = isNativeAndroidApp();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
      e.target.value = '';
      onClose();
    }
  };

  const handleNativeScan = async () => {
    if (!onScanDeviceMusic) {
      fileInputRef.current?.click();
      return;
    }
    setIsScanning(true);
    try {
      await onScanDeviceMusic();
      onClose();
    } finally {
      setIsScanning(false);
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
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/20 border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Tambah Lagu & Lirik (.LRC)
              </h3>
              <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Tersimpan Permanen • Siap Diputar Tanpa Muat Ulang
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

        {/* Info Banner */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-white/80 leading-relaxed">
            <strong className="text-emerald-300">Penyimpanan Permanen Otomatis:</strong> Lagu yang Anda masukkan tetap tersimpan di database aplikasi dan langsung bisa dijalankan kembali kapan saja meskipun aplikasi ditutup atau keluar.
          </div>
        </div>

        {/* Native Android MediaStore Scanner Button */}
        {onScanDeviceMusic && (
          <button
            id="btn-scan-android-mediastore"
            onClick={handleNativeScan}
            disabled={isScanning}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#F27D26]/25 via-[#F27D26]/15 to-amber-500/10 hover:from-[#F27D26]/35 hover:to-amber-500/20 border border-[#F27D26]/50 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] text-left shadow-lg shadow-[#F27D26]/10"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#F27D26] text-white flex items-center justify-center shrink-0 shadow-md">
                {isScanning ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Smartphone className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {isScanning ? 'Memindai Penyimpanan HP...' : 'Pindai Otomatis Lagu di HP'}
                  </span>
                  {isAndroid && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F27D26] text-white font-bold">
                      DIREKOMENDASIKAN
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/65 mt-0.5 leading-snug">
                  Deteksi semua lagu MP3/FLAC di memori internal Android secara instan tanpa menyalin file.
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Direct File & Folder Picker Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Button 1: Pilih File Langsung */}
          <button
            id="btn-modal-pick-files"
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 flex flex-col gap-2 cursor-pointer transition-all hover:border-[#F27D26]/60 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#F27D26]/20 text-[#F27D26] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileAudio className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">Permanen</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-[#F27D26] transition-colors">
                Pilih File Lagu & .LRC
              </div>
              <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                Masukkan file MP3, FLAC, WAV beserta lirik .lrc agar tersimpan permanen di aplikasi.
              </p>
            </div>
          </button>

          {/* Button 2: Buka Folder Musik */}
          <button
            id="btn-modal-pick-folder"
            onClick={() => folderInputRef.current?.click()}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 flex flex-col gap-2 cursor-pointer transition-all hover:border-[#F27D26]/60 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderOpen className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold">Satu Folder</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                Buka Folder Musik
              </div>
              <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                Muat seluruh lagu satu folder penuh beserta file .lrc secara otomatis.
              </p>
            </div>
          </button>
        </div>

        {/* Technical summary */}
        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-[11px] text-white/50">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
            Otomatis sinkronisasi lirik <code className="text-white/80 font-mono">.lrc</code> &amp; proteksi RAM Non-Stop
          </span>
          <span className="font-mono text-[10px] text-emerald-400">Anti-Stop &gt;1 Jam</span>
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
