export interface ExtractedAudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  lyrics?: string;
  coverUrl?: string;
}

/**
 * Pure browser-native extractor for ID3v2, ID3v1, and MP4/M4A metadata & embedded album art.
 * Reads binary slices directly without requiring external node-dependent libraries.
 */
export async function extractAudioMetadata(file: File | Blob): Promise<ExtractedAudioMetadata> {
  const result: ExtractedAudioMetadata = {};

  try {
    // Read first 2MB slice for ID3v2 & MP4 header
    const headerSlice = await file.slice(0, Math.min(file.size, 2 * 1024 * 1024)).arrayBuffer();
    const view = new DataView(headerSlice);

    // 1. Check ID3v2 (starts with 'ID3')
    if (
      headerSlice.byteLength >= 10 &&
      view.getUint8(0) === 0x49 && // 'I'
      view.getUint8(1) === 0x44 && // 'D'
      view.getUint8(2) === 0x33    // '3'
    ) {
      parseID3v2(headerSlice, result);
    } else if (
      headerSlice.byteLength >= 4 &&
      view.getUint8(0) === 0x66 && // 'f'
      view.getUint8(1) === 0x4c && // 'L'
      view.getUint8(2) === 0x61 && // 'a'
      view.getUint8(3) === 0x43    // 'C'
    ) {
      // 2. Check FLAC header
      parseFlac(headerSlice, result);
    } else if (
      headerSlice.byteLength >= 12 &&
      view.getUint8(0) === 0x52 && // 'R'
      view.getUint8(1) === 0x49 && // 'I'
      view.getUint8(2) === 0x46 && // 'F'
      view.getUint8(3) === 0x46    // 'F'
    ) {
      // 3. Check WAV RIFF
      parseWav(headerSlice, result);
    } else {
      // 4. Check MP4 / M4A (starts with 'ftyp' or has 'ftyp' at offset 4)
      const isMp4 = checkIsMp4(view);
      if (isMp4) {
        parseMp4(headerSlice, result);
      }
    }

    // 3. If title or artist still missing, check ID3v1 at end of file (last 128 bytes)
    if ((!result.title || !result.artist) && file.size > 128) {
      const footerSlice = await file.slice(file.size - 128, file.size).arrayBuffer();
      parseID3v1(footerSlice, result);
    }
  } catch (err) {
    console.warn('Metadata parsing warning:', err);
  }

  return result;
}

/**
 * Check if buffer has MP4/M4A ftyp atom
 */
function checkIsMp4(view: DataView): boolean {
  if (view.byteLength < 12) return false;
  const tag = String.fromCharCode(
    view.getUint8(4),
    view.getUint8(5),
    view.getUint8(6),
    view.getUint8(7)
  );
  return tag === 'ftyp';
}

/**
 * Parse ID3v2 tags (v2.3 and v2.4)
 */
function parseID3v2(buffer: ArrayBuffer, result: ExtractedAudioMetadata): void {
  const view = new DataView(buffer);
  const version = view.getUint8(3); // 3 = v2.3, 4 = v2.4
  // ID3v2 tag size is synchsafe (4 bytes, 7 bits each)
  const tagSize =
    ((view.getUint8(6) & 0x7f) << 21) |
    ((view.getUint8(7) & 0x7f) << 14) |
    ((view.getUint8(8) & 0x7f) << 7) |
    (view.getUint8(9) & 0x7f);

  const maxOffset = Math.min(buffer.byteLength, 10 + tagSize);
  let offset = 10;

  while (offset + 10 < maxOffset) {
    // Read 4-character frame ID
    const frameId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );

    // Stop on padding zeroes
    if (frameId.charCodeAt(0) === 0) break;

    let frameSize = 0;
    if (version === 4) {
      // v2.4 synchsafe integer
      frameSize =
        ((view.getUint8(offset + 4) & 0x7f) << 21) |
        ((view.getUint8(offset + 5) & 0x7f) << 14) |
        ((view.getUint8(offset + 6) & 0x7f) << 7) |
        (view.getUint8(offset + 7) & 0x7f);
    } else {
      // v2.3 standard 32-bit big-endian
      frameSize = view.getUint32(offset + 4, false);
    }

    offset += 10;
    if (frameSize <= 0 || offset + frameSize > buffer.byteLength) break;

    const frameBytes = new Uint8Array(buffer, offset, frameSize);

    // Decode frames of interest
    if (frameId === 'TIT2' && !result.title) {
      result.title = decodeTextFrame(frameBytes);
    } else if (frameId === 'TPE1' && !result.artist) {
      result.artist = decodeTextFrame(frameBytes);
    } else if (frameId === 'TALB' && !result.album) {
      result.album = decodeTextFrame(frameBytes);
    } else if (frameId === 'TCON' && !result.genre) {
      result.genre = decodeTextFrame(frameBytes);
    } else if (frameId === 'TYER' || frameId === 'TDRC') {
      result.year = decodeTextFrame(frameBytes);
    } else if (frameId === 'USLT' && !result.lyrics) {
      result.lyrics = decodeUsltFrame(frameBytes);
    } else if (frameId === 'APIC' && !result.coverUrl) {
      result.coverUrl = decodeApicFrame(frameBytes);
    }

    offset += frameSize;
  }
}

/**
 * Decode text frames (TIT2, TPE1, TALB, etc.)
 */
function decodeTextFrame(bytes: Uint8Array): string {
  if (bytes.length <= 1) return '';
  const encoding = bytes[0];
  const body = bytes.subarray(1);

  try {
    if (encoding === 0) {
      // ISO-8859-1
      return new TextDecoder('iso-8859-1').decode(body).replace(/\0+$/, '').trim();
    } else if (encoding === 1) {
      // UTF-16 with BOM
      return new TextDecoder('utf-16').decode(body).replace(/\0+$/, '').trim();
    } else if (encoding === 2) {
      // UTF-16BE without BOM
      return new TextDecoder('utf-16be').decode(body).replace(/\0+$/, '').trim();
    } else if (encoding === 3) {
      // UTF-8
      return new TextDecoder('utf-8').decode(body).replace(/\0+$/, '').trim();
    }
  } catch {
    // Fallback: simple ascii string
    let str = '';
    for (let i = 0; i < body.length; i++) {
      if (body[i] !== 0) str += String.fromCharCode(body[i]);
    }
    return str.trim();
  }
  return '';
}

/**
 * Decode USLT (Unsynchronized lyrics) frame
 * Format: [encoding: 1 byte][language: 3 bytes][descriptor: null-terminated][lyrics text: rest]
 */
function decodeUsltFrame(bytes: Uint8Array): string {
  if (bytes.length <= 4) return '';
  const encoding = bytes[0];
  // Skip language (3 bytes)
  let idx = 4;

  // Find end of descriptor (null-terminated)
  if (encoding === 1 || encoding === 2) {
    // 2-byte null terminator
    while (idx + 1 < bytes.length && !(bytes[idx] === 0 && bytes[idx + 1] === 0)) {
      idx += 2;
    }
    idx += 2;
  } else {
    // 1-byte null terminator
    while (idx < bytes.length && bytes[idx] !== 0) {
      idx++;
    }
    idx += 1;
  }

  if (idx >= bytes.length) return '';
  const textBytes = bytes.subarray(idx);

  try {
    if (encoding === 1) return new TextDecoder('utf-16').decode(textBytes).trim();
    if (encoding === 2) return new TextDecoder('utf-16be').decode(textBytes).trim();
    if (encoding === 3) return new TextDecoder('utf-8').decode(textBytes).trim();
    return new TextDecoder('iso-8859-1').decode(textBytes).trim();
  } catch {
    return '';
  }
}

/**
 * Decode APIC (Attached Picture) frame to Base64 Data URL
 * Format: [encoding: 1 byte][mime: null-terminated][picture_type: 1 byte][desc: null-terminated][image_binary]
 */
function decodeApicFrame(bytes: Uint8Array): string | undefined {
  if (bytes.length < 10) return undefined;
  const encoding = bytes[0];
  let idx = 1;

  // 1. Read MIME type (null-terminated ISO-8859-1 string)
  let mime = '';
  while (idx < bytes.length && bytes[idx] !== 0) {
    mime += String.fromCharCode(bytes[idx]);
    idx++;
  }
  idx++; // Skip null terminator

  if (!mime || mime === '-->') {
    mime = 'image/jpeg';
  }

  // 2. Picture type (1 byte)
  // idx++;
  idx += 1;

  // 3. Skip description (null-terminated according to encoding)
  if (encoding === 1 || encoding === 2) {
    while (idx + 1 < bytes.length && !(bytes[idx] === 0 && bytes[idx + 1] === 0)) {
      idx += 2;
    }
    idx += 2;
  } else {
    while (idx < bytes.length && bytes[idx] !== 0) {
      idx++;
    }
    idx += 1;
  }

  if (idx >= bytes.length) return undefined;

  const imageBytes = bytes.subarray(idx);
  return uint8ArrayToDataUrl(imageBytes, mime);
}

/**
 * Helper to turn Uint8Array binary image data to Base64 Data URL
 */
function uint8ArrayToDataUrl(uint8: Uint8Array, mime: string): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);
  return `data:${mime};base64,${base64}`;
}

/**
 * Parse ID3v1 (last 128 bytes of MP3 file)
 */
function parseID3v1(buffer: ArrayBuffer, result: ExtractedAudioMetadata): void {
  if (buffer.byteLength < 128) return;
  const view = new DataView(buffer);
  const tag = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2)
  );
  if (tag !== 'TAG') return;

  const readString = (offset: number, length: number) => {
    let str = '';
    for (let i = 0; i < length; i++) {
      const code = view.getUint8(offset + i);
      if (code === 0) break;
      str += String.fromCharCode(code);
    }
    return str.trim();
  };

  if (!result.title) result.title = readString(3, 30);
  if (!result.artist) result.artist = readString(33, 30);
  if (!result.album) result.album = readString(63, 30);
  if (!result.year) result.year = readString(93, 4);
}

/**
 * Parse MP4 / M4A metadata atoms
 */
function parseMp4(buffer: ArrayBuffer, result: ExtractedAudioMetadata): void {
  const view = new DataView(buffer);
  let offset = 0;

  // Search recursively for known atoms
  function scanAtoms(start: number, end: number) {
    let pos = start;
    while (pos + 8 <= end) {
      const atomSize = view.getUint32(pos, false);
      if (atomSize <= 0) break;
      const atomType = String.fromCharCode(
        view.getUint8(pos + 4),
        view.getUint8(pos + 5),
        view.getUint8(pos + 6),
        view.getUint8(pos + 7)
      );

      const nextAtom = pos + atomSize;
      const dataStart = pos + 8;
      const dataEnd = Math.min(nextAtom, end);

      // Container atoms
      if (['moov', 'udta', 'meta', 'ilst'].includes(atomType)) {
        const metaAdjust = atomType === 'meta' ? 4 : 0; // 'meta' has a 4-byte version/flags
        scanAtoms(dataStart + metaAdjust, dataEnd);
      } else if (atomType === 'covr' && !result.coverUrl) {
        // Embedded artwork in MP4
        // 'covr' contains a 'data' child atom: [size:4][type:'data'][version/flags:4][mimeType:4][imageBytes]
        if (dataEnd - dataStart > 16) {
          const imageBytes = new Uint8Array(buffer, dataStart + 16, dataEnd - (dataStart + 16));
          // Detect PNG vs JPEG magic bytes
          const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50;
          const mime = isPng ? 'image/png' : 'image/jpeg';
          result.coverUrl = uint8ArrayToDataUrl(imageBytes, mime);
        }
      } else if (atomType === '©nam' && !result.title) {
        result.title = decodeMp4DataString(buffer, dataStart, dataEnd);
      } else if (atomType === '©ART' && !result.artist) {
        result.artist = decodeMp4DataString(buffer, dataStart, dataEnd);
      } else if (atomType === '©alb' && !result.album) {
        result.album = decodeMp4DataString(buffer, dataStart, dataEnd);
      } else if (atomType === '©lyr' && !result.lyrics) {
        result.lyrics = decodeMp4DataString(buffer, dataStart, dataEnd);
      }

      pos = nextAtom;
    }
  }

  scanAtoms(offset, buffer.byteLength);
}

function decodeMp4DataString(buffer: ArrayBuffer, start: number, end: number): string {
  // mp4 text tags contain child 'data' box at start+8 or start+16
  const minLength = 16;
  if (end - start <= minLength) return '';
  const textBytes = new Uint8Array(buffer, start + minLength, end - (start + minLength));
  try {
    return new TextDecoder('utf-8').decode(textBytes).trim();
  } catch {
    return '';
  }
}

/**
 * Parse native FLAC metadata blocks (STREAMINFO, VORBIS_COMMENT, PICTURE)
 */
function parseFlac(buffer: ArrayBuffer, result: ExtractedAudioMetadata): void {
  const view = new DataView(buffer);
  let offset = 4; // Skip 'fLaC' marker

  while (offset + 4 <= buffer.byteLength) {
    const headerByte = view.getUint8(offset);
    const isLast = (headerByte & 0x80) !== 0;
    const blockType = headerByte & 0x7f;
    const blockLength =
      (view.getUint8(offset + 1) << 16) |
      (view.getUint8(offset + 2) << 8) |
      view.getUint8(offset + 3);

    offset += 4;
    if (offset + blockLength > buffer.byteLength) break;

    // Block type 4: VORBIS_COMMENT (Tags)
    if (blockType === 4) {
      parseVorbisComment(buffer, offset, blockLength, result);
    }
    // Block type 6: PICTURE (Cover art)
    else if (blockType === 6 && !result.coverUrl) {
      parseFlacPicture(buffer, offset, blockLength, result);
    }

    offset += blockLength;
    if (isLast) break;
  }
}

/**
 * Parse Vorbis comments (used in FLAC and OGG)
 */
function parseVorbisComment(
  buffer: ArrayBuffer,
  offset: number,
  length: number,
  result: ExtractedAudioMetadata
): void {
  const view = new DataView(buffer, offset, length);
  let pos = 0;
  if (length < 8) return;

  // Vendor length (32-bit LE)
  const vendorLength = view.getUint32(pos, true);
  pos += 4 + vendorLength;

  if (pos + 4 > length) return;
  const userCommentListLength = view.getUint32(pos, true);
  pos += 4;

  const decoder = new TextDecoder('utf-8');

  for (let i = 0; i < userCommentListLength && pos + 4 <= length; i++) {
    const commentLength = view.getUint32(pos, true);
    pos += 4;
    if (pos + commentLength > length) break;

    const commentBytes = new Uint8Array(buffer, offset + pos, commentLength);
    pos += commentLength;

    const commentStr = decoder.decode(commentBytes);
    const eqIdx = commentStr.indexOf('=');
    if (eqIdx > 0) {
      const fieldName = commentStr.substring(0, eqIdx).toUpperCase();
      const fieldValue = commentStr.substring(eqIdx + 1).trim();

      if (fieldName === 'TITLE' && !result.title) {
        result.title = fieldValue;
      } else if ((fieldName === 'ARTIST' || fieldName === 'PERFORMER') && !result.artist) {
        result.artist = fieldValue;
      } else if (fieldName === 'ALBUM' && !result.album) {
        result.album = fieldValue;
      } else if (fieldName === 'GENRE' && !result.genre) {
        result.genre = fieldValue;
      } else if ((fieldName === 'DATE' || fieldName === 'YEAR') && !result.year) {
        result.year = fieldValue;
      } else if ((fieldName === 'LYRICS' || fieldName === 'UNSYNCEDLYRICS') && !result.lyrics) {
        result.lyrics = fieldValue;
      }
    }
  }
}

/**
 * Parse FLAC Picture block (METADATA_BLOCK_PICTURE)
 */
function parseFlacPicture(
  buffer: ArrayBuffer,
  offset: number,
  length: number,
  result: ExtractedAudioMetadata
): void {
  try {
    const view = new DataView(buffer, offset, length);
    let pos = 4; // Skip picture type (32-bit BE)

    // MIME type length (32-bit BE)
    const mimeLength = view.getUint32(pos, false);
    pos += 4;
    const mimeBytes = new Uint8Array(buffer, offset + pos, mimeLength);
    const mime = new TextDecoder('ascii').decode(mimeBytes) || 'image/jpeg';
    pos += mimeLength;

    // Description length (32-bit BE)
    const descLength = view.getUint32(pos, false);
    pos += 4 + descLength;

    // Skip width(4), height(4), depth(4), colors(4) = 16 bytes
    pos += 16;

    // Picture data length (32-bit BE)
    const dataLength = view.getUint32(pos, false);
    pos += 4;

    if (pos + dataLength <= length) {
      const imgBytes = new Uint8Array(buffer, offset + pos, dataLength);
      result.coverUrl = uint8ArrayToDataUrl(imgBytes, mime);
    }
  } catch (e) {
    console.warn('Could not parse FLAC picture:', e);
  }
}

/**
 * Parse RIFF WAV INFO tags or embedded ID3 chunks
 */
function parseWav(buffer: ArrayBuffer, result: ExtractedAudioMetadata): void {
  const view = new DataView(buffer);
  let pos = 12; // Skip 'RIFF' + size + 'WAVE'

  while (pos + 8 <= buffer.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(pos),
      view.getUint8(pos + 1),
      view.getUint8(pos + 2),
      view.getUint8(pos + 3)
    );
    const chunkSize = view.getUint32(pos + 4, true);
    pos += 8;

    if (chunkId === 'id3 ' || chunkId === 'ID3 ') {
      // Embedded ID3 in WAV
      parseID3v2(buffer.slice(pos, pos + chunkSize), result);
    }

    pos += chunkSize + (chunkSize % 2); // Word alignment
  }
}

