function dimensions(buffer, type) {
  if (type === "image/png" && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (type === "image/webp" && buffer.length >= 30 && buffer.toString("ascii", 12, 16) === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3)
    };
  }
  if (type === "image/jpeg") {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      const size = buffer.readUInt16BE(offset + 2);
      if (size < 2) break;
      offset += size + 2;
    }
  }
  return null;
}

function stripMetadata(buffer, type) {
  if (type === "image/jpeg") {
    const parts = [buffer.subarray(0, 2)];
    let offset = 2;
    while (offset + 4 <= buffer.length) {
      if (buffer[offset] !== 0xff) { parts.push(buffer.subarray(offset)); break; }
      const marker = buffer[offset + 1];
      if (marker === 0xda || marker === 0xd9) { parts.push(buffer.subarray(offset)); break; }
      const size = buffer.readUInt16BE(offset + 2);
      if (size < 2 || offset + size + 2 > buffer.length) throw new Error("JPEG structure is invalid.");
      const end = offset + size + 2;
      if (marker !== 0xe1 && marker !== 0xed) parts.push(buffer.subarray(offset, end));
      offset = end;
    }
    return Buffer.concat(parts);
  }
  if (type === "image/png") {
    const parts = [buffer.subarray(0, 8)];
    const metadataChunks = new Set(["eXIf", "iTXt", "tEXt", "zTXt"]);
    let offset = 8;
    while (offset + 12 <= buffer.length) {
      const length = buffer.readUInt32BE(offset);
      const end = offset + 12 + length;
      if (end > buffer.length) throw new Error("PNG structure is invalid.");
      const chunkType = buffer.toString("ascii", offset + 4, offset + 8);
      if (!metadataChunks.has(chunkType)) parts.push(buffer.subarray(offset, end));
      offset = end;
      if (chunkType === "IEND") break;
    }
    return Buffer.concat(parts);
  }
  if (type === "image/webp") {
    const parts = [];
    let offset = 12;
    while (offset + 8 <= buffer.length) {
      const chunkType = buffer.toString("ascii", offset, offset + 4);
      const size = buffer.readUInt32LE(offset + 4);
      const end = offset + 8 + size + (size % 2);
      if (end > buffer.length) throw new Error("WebP structure is invalid.");
      if (chunkType !== "EXIF" && chunkType !== "XMP ") parts.push(buffer.subarray(offset, end));
      offset = end;
    }
    const payload = Buffer.concat(parts);
    const header = Buffer.from("RIFF\0\0\0\0WEBP", "binary");
    header.writeUInt32LE(payload.length + 4, 4);
    return Buffer.concat([header, payload]);
  }
  return buffer;
}

function verifyImage(data, type) {
  const buffer = Buffer.from(data, "base64");
  if (!buffer.length || buffer.toString("base64").replace(/=+$/, "") !== data.replace(/=+$/, "")) {
    throw new Error("Photo data is invalid.");
  }
  const valid = type === "image/jpeg"
    ? buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    : type === "image/png"
      ? buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : type === "image/webp"
        ? buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP"
        : false;
  if (!valid) throw new Error("A photo's contents do not match its file type.");

  const size = dimensions(buffer, type);
  if (!size || size.width < 1 || size.height < 1 || size.width * size.height > 25000000) {
    throw new Error("Photo dimensions are invalid or too large.");
  }
  return stripMetadata(buffer, type);
}

async function scanImage(photo) {
  if (!process.env.MALWARE_SCAN_URL) return true;
  const response = await fetch(process.env.MALWARE_SCAN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.MALWARE_SCAN_TOKEN ? { Authorization: `Bearer ${process.env.MALWARE_SCAN_TOKEN}` } : {})
    },
    body: JSON.stringify({ filename: photo.name, contentType: photo.type, data: photo.data }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error("Photo security scanning is temporarily unavailable.");
  const result = await response.json();
  if (result.clean !== true) throw new Error("A photo did not pass the security scan.");
  return true;
}

module.exports = { scanImage, stripMetadata, verifyImage };
