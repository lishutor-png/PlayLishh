var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
app.all("/api/download-lrc", (req, res) => {
  const title = req.body?.title || req.query?.title || "lirik";
  const content = req.body?.content || req.query?.content || "";
  if (!content) {
    return res.status(400).send("Lirik tidak boleh kosong.");
  }
  const safeTitle = title.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim() || "lirik";
  const filename = safeTitle.toLowerCase().endsWith(".lrc") ? safeTitle : `${safeTitle}.lrc`;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.send(content);
});
var aiClient = null;
function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
  });
});
app.post("/api/generate-lyrics", async (req, res) => {
  try {
    const { title, artist, genre, durationSec, customPrompt } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    const ai = getGemini();
    const duration = typeof durationSec === "number" && durationSec > 0 ? durationSec : 180;
    const songArtist = artist || "Musisi";
    const songGenre = genre || "Pop / Ballad";
    if (!ai) {
      const lines = generateProceduralLyrics(title, songArtist, duration);
      return res.json({ lyrics: lines, source: "offline-procedural" });
    }
    const prompt = `Anda adalah penulis lagu dan spesialis audio profesional.
Tuliskan lirik lagu lengkap yang sinkron dalam format standar LRC (.lrc) untuk lagu:
Judul: "${title}"
Artis: "${songArtist}"
Genre/Mood: "${songGenre}"
Durasi total lagu: ${Math.round(duration)} detik.
${customPrompt ? `Petunjuk tambahan dari pengguna: "${customPrompt}"` : ""}

ATURAN FORMAT WAJIB:
1. Tuliskan setiap baris dengan timestamp format: [mm:ss.xx] Teks lirik
   Contoh:
   [00:06.00] Melodi sunyi mengalun perlahan
   [00:14.50] Mengingatkan aku tentang kisah yang lalu
2. Distribusikan timestamp secara merata dan alami mulai dari detik [00:04.00] hingga sekitar ${Math.max(10, Math.round(duration - 8))} detik.
3. Jangan gunakan tanda bintang markdown (**), heading, atau penjelasan apapun di awal dan akhir.
4. Berikan HANYA teks lirik berformat [mm:ss.xx] per baris.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });
    const rawText = response.text || "";
    const cleanedText = rawText.replace(/```(?:lrc)?/g, "").trim();
    res.json({
      lyrics: cleanedText,
      source: "gemini-ai"
    });
  } catch (error) {
    console.error("Gemini lyric generation error:", error);
    const { title, artist, durationSec } = req.body || {};
    const fallback = generateProceduralLyrics(title || "Lagu Baru", artist || "PlayLish", durationSec || 180);
    res.json({
      lyrics: fallback,
      source: "fallback",
      warning: error?.message || "Gemini service unavailable"
    });
  }
});
function generateProceduralLyrics(title, artist, duration) {
  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);
  const durStr = `${mins}:${String(secs).padStart(2, "0")}`;
  const verses = [
    `Alunan nada mengawali cerita "${title}"`,
    `Harmoni akustik jernih menyapa pendengaran`,
    `Setiap frekuensi bergetar dalam ketenangan`,
    `Menemani langkah dalam hening malam`,
    `Reff: Denting suara "${artist}" terus bergema`,
    `Membawa rasa damai yang tiada tara`,
    `Hi-Res audio mengalir tanpa jeda`,
    `Hingga petikan terakhir menutup lagu ini`
  ];
  const step = Math.max(5, (duration - 12) / verses.length);
  return verses.map((v, i) => {
    const t = 4 + i * step;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.00] ${v}`;
  }).join("\n");
}
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
