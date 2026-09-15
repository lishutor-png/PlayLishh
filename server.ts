import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API: Direct file download for .LRC files (bypasses browser iframe blob sandbox restrictions)
app.all('/api/download-lrc', (req, res) => {
  const title = (req.body?.title || req.query?.title || 'lirik') as string;
  const content = (req.body?.content || req.query?.content || '') as string;

  if (!content) {
    return res.status(400).send('Lirik tidak boleh kosong.');
  }

  const safeTitle = title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'lirik';
  const filename = safeTitle.toLowerCase().endsWith('.lrc') ? safeTitle : `${safeTitle}.lrc`;

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(content);
});

// Lazy-initialized Google GenAI client
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// API: Auto-write / generate lyrics for a track using Gemini
app.post('/api/generate-lyrics', async (req, res) => {
  try {
    const { title, artist, genre, durationSec, customPrompt } = req.body || {};

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const ai = getGemini();
    const duration = typeof durationSec === 'number' && durationSec > 0 ? durationSec : 180;
    const songArtist = artist || 'Musisi';
    const songGenre = genre || 'Pop / Ballad';

    if (!ai) {
      // Return procedural fallback if no API key is set
      const lines = generateProceduralLyrics(title, songArtist, duration);
      return res.json({ lyrics: lines, source: 'offline-procedural' });
    }

    const prompt = `Anda adalah penulis lagu dan spesialis audio profesional.
Tuliskan lirik lagu lengkap yang sinkron dalam format standar LRC (.lrc) untuk lagu:
Judul: "${title}"
Artis: "${songArtist}"
Genre/Mood: "${songGenre}"
Durasi total lagu: ${Math.round(duration)} detik.
${customPrompt ? `Petunjuk tambahan dari pengguna: "${customPrompt}"` : ''}

ATURAN FORMAT WAJIB:
1. Tuliskan setiap baris dengan timestamp format: [mm:ss.xx] Teks lirik
   Contoh:
   [00:06.00] Melodi sunyi mengalun perlahan
   [00:14.50] Mengingatkan aku tentang kisah yang lalu
2. Distribusikan timestamp secara merata dan alami mulai dari detik [00:04.00] hingga sekitar ${Math.max(10, Math.round(duration - 8))} detik.
3. Jangan gunakan tanda bintang markdown (**), heading, atau penjelasan apapun di awal dan akhir.
4. Berikan HANYA teks lirik berformat [mm:ss.xx] per baris.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const rawText = response.text || '';
    // Clean code fences if returned
    const cleanedText = rawText.replace(/```(?:lrc)?/g, '').trim();

    res.json({
      lyrics: cleanedText,
      source: 'gemini-ai',
    });
  } catch (error: any) {
    console.error('Gemini lyric generation error:', error);
    // Fallback gracefully so user experience is smooth
    const { title, artist, durationSec } = req.body || {};
    const fallback = generateProceduralLyrics(title || 'Lagu Baru', artist || 'PlayLish', durationSec || 180);
    res.json({
      lyrics: fallback,
      source: 'fallback',
      warning: error?.message || 'Gemini service unavailable',
    });
  }
});

function generateProceduralLyrics(title: string, artist: string, duration: number): string {
  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);
  const durStr = `${mins}:${String(secs).padStart(2, '0')}`;

  const verses = [
    `Alunan nada mengawali cerita "${title}"`,
    `Harmoni akustik jernih menyapa pendengaran`,
    `Setiap frekuensi bergetar dalam ketenangan`,
    `Menemani langkah dalam hening malam`,
    `Reff: Denting suara "${artist}" terus bergema`,
    `Membawa rasa damai yang tiada tara`,
    `Hi-Res audio mengalir tanpa jeda`,
    `Hingga petikan terakhir menutup lagu ini`,
  ];

  const step = Math.max(5, (duration - 12) / verses.length);
  return verses
    .map((v, i) => {
      const t = 4 + i * step;
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.00] ${v}`;
    })
    .join('\n');
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
