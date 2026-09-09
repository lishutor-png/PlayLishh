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

    let animationId: number;
    const bufferLength = audioEngine.getFrequencyBinCount();
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationId = requestAnimationFrame(render);

      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      if (isPlaying) {
        audioEngine.getAnalyserData(dataArray);
      } else {
        // Idle gentle animation
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.max(0, dataArray[i] * 0.92);
        }
      }

      if (mode === 'bars') {
        const barCount = 36;
        const barWidth = (width / barCount) * 0.65;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * step] || 0;
          const percent = value / 255;
          const barHeight = Math.max(4, percent * h * 0.95);
          const x = i * (width / barCount) + (width / barCount - barWidth) / 2;
          const y = h - barHeight;

          // Gradient
          const gradient = ctx.createLinearGradient(0, y, 0, h);
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, 'rgba(242, 125, 38, 0.12)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
          ctx.fill();

          // Top peak dot
          if (percent > 0.1) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + barWidth / 2, Math.max(2, y - 3), 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (mode === 'wave') {
        audioEngine.getWaveformData(dataArray);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
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
        ctx.shadowBlur = 0;
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
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
