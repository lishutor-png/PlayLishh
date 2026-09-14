export interface LyricLine {
  id: string;
  time: number; // in seconds
  text: string;
}

/**
 * Parses LRC format strings (`[00:12.34] Lyric text`) or plain text into timed lines.
 */
export function parseLyrics(rawLyrics: string | undefined, totalDuration: number = 180): LyricLine[] {
  if (!rawLyrics || !rawLyrics.trim()) {
    return [];
  }

  const lines = rawLyrics.split('\n');
  const lrcRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const parsedLines: LyricLine[] = [];
  const plainTextLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Check if line contains one or more LRC timestamps
    const matches = Array.from(rawLine.matchAll(lrcRegex));
    if (matches.length > 0) {
      const text = rawLine.replace(lrcRegex, '').trim();
      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const timeInSeconds = minutes * 60 + seconds + ms / 1000;
        parsedLines.push({
          id: `line-${i}-${match.index}`,
          time: timeInSeconds,
          text: text || '♪ ♪ ♪',
        });
      }
    } else {
      // Clean meta headers like [ar: Artist], [ti: Title] if present
      if (!rawLine.startsWith('[') || !rawLine.endsWith(']')) {
        plainTextLines.push(rawLine);
      }
    }
  }

  // If we found valid LRC timed lines, sort them by timestamp
  if (parsedLines.length > 0) {
    parsedLines.sort((a, b) => a.time - b.time);
    return parsedLines;
  }

  // If only plain text was provided, distribute timestamps evenly across track duration
  if (plainTextLines.length > 0) {
    const safeDuration = Math.max(30, totalDuration || 180);
    const startOffset = 4; // Start at 4 seconds
    const usableTime = Math.max(10, safeDuration - 10);
    const step = usableTime / plainTextLines.length;

    return plainTextLines.map((text, idx) => ({
      id: `plain-${idx}`,
      time: Math.round((startOffset + idx * step) * 10) / 10,
      text,
    }));
  }

  return [];
}

/**
 * Converts LyricLine array back to standard LRC string.
 */
export function formatLrc(lines: LyricLine[]): string {
  return lines
    .map((line) => {
      const mins = Math.floor(line.time / 60);
      const secs = Math.floor(line.time % 60);
      const ms = Math.floor((line.time % 1) * 100);
      const timeStr = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}]`;
      return `${timeStr} ${line.text}`;
    })
    .join('\n');
}

/**
 * Finds the index of the currently active lyric line matching current playback time.
 */
export function getActiveLyricIndex(lines: LyricLine[], currentTime: number): number {
  if (!lines || lines.length === 0) return -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentTime >= lines[i].time - 0.25) {
      return i;
    }
  }
  return 0;
}
