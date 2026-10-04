import { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface VisualizerCanvasProps {
  isPlaying: boolean;
  color?: string;
  mode?: 'bars' | 'wave' | 'liquid';
  height?: number;
}

export function VisualizerCanvas({
  isPlaying,
  color = '#F27D26',
  mode = 'bars',
  height = 80,
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number | null = null;
    const bufferLength = audioEngine.getFrequencyBinCount();
    const dataArray = new Uint8Array(bufferLength);

    // Pre-create a single reusable vertical gradient to prevent allocating 2,160 native objects/sec
    const cachedGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    cachedGradient.addColorStop(0, color);
    cachedGradient.addColorStop(1, 'rgba(242, 125, 38, 0.12)');

    const drawStaticIdleBars = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);
      const barCount = 36;
      const barWidth = (width / barCount) * 0.65;
      ctx.fillStyle = cachedGradient;
      for (let i = 0; i < barCount; i++) {
        const x = i * (width / barCount) + (width / barCount - barWidth) / 2;
        ctx.fillRect(x, h - 4, barWidth, 4);
      }
    };

    const render = () => {
      // Stop rendering immediately if paused or screen is off / app in background
      if (!isPlaying || document.hidden) {
        animationId = null;
        if (!isPlaying) {
          drawStaticIdleBars();
        }
        return;
      }

      animationId = requestAnimationFrame(render);

      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      if (mode === 'bars') {
        audioEngine.getAnalyserData(dataArray);
        const barCount = 36;
        const barWidth = (width / barCount) * 0.65;
        const step = Math.floor(bufferLength / barCount);

        ctx.fillStyle = cachedGradient;
        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * step] || 0;
          const percent = value / 255;
          const barHeight = Math.max(4, percent * h * 0.95);
          const x = i * (width / barCount) + (width / barCount - barWidth) / 2;
          const y = h - barHeight;

          ctx.fillRect(x, y, barWidth, barHeight);

          if (percent > 0.12) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, Math.max(1, y - 3), barWidth, 2);
            ctx.fillStyle = cachedGradient;
          }
        }
      } else if (mode === 'wave') {
        audioEngine.getWaveformData(dataArray);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, h / 2);
        ctx.stroke();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationId !== null) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      } else if (isPlaying && animationId === null) {
        render();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (isPlaying && !document.hidden) {
      render();
    } else {
      drawStaticIdleBars();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying, color, mode]);

  return (
    <div className="w-full flex items-center justify-center overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 p-2.5">
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        className="w-full h-full block"
      />
    </div>
  );
}
