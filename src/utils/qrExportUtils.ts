/**
 * HAILO Digital Hub - QR Export & Sticker Generation Utilities
 * 
 * Provides production-grade export utilities without external heavy dependencies:
 * - High-resolution PNG sticker generation (1000x1200 @ 300dpi style)
 * - Vector SVG placard generation
 * - Batch ZIP archiving (standard uncompressed ZIP RFC 1951/PKWARE)
 * - Batch A4 PDF sticker sheet generation (standard PDF 1.4 DCTDecode)
 */

import { Bin } from '../types';
import { getBinQrUrl } from './qrConfig';

// Standard A4 dimensions in points (72 pt/inch)
export const A4_WIDTH_PT = 595.28;
export const A4_HEIGHT_PT = 841.89;

// High-DPI canvas dimensions for crisp printing (300 DPI approx)
export const A4_CANVAS_WIDTH = 2480;
export const A4_CANVAS_HEIGHT = 3508;

/**
 * CRC-32 Lookup Table for standard ZIP files
 */
function createCRC32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();

function calculateCrc32(data: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Creates a valid PKWARE ZIP file from a list of files without external libraries.
 */
export function buildZipFile(files: { name: string; data: Uint8Array | string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const fileEntries: {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    checksum: number;
    size: number;
    offset: number;
    localHeader: Uint8Array;
  }[] = [];

  let offset = 0;

  for (const f of files) {
    const nameBytes = encoder.encode(f.name);
    const dataBytes = typeof f.data === 'string' ? encoder.encode(f.data) : f.data;
    const checksum = calculateCrc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 bytes + name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // signature
    view.setUint16(4, 20, true);         // version needed
    view.setUint16(6, 0, true);          // general purpose bit flag
    view.setUint16(8, 0, true);          // compression method (0 = uncompressed store)
    view.setUint16(10, 0, true);         // mod time
    view.setUint16(12, 0, true);         // mod date
    view.setUint32(14, checksum, true);   // CRC-32
    view.setUint32(18, size, true);       // compressed size
    view.setUint32(22, size, true);       // uncompressed size
    view.setUint16(26, nameBytes.length, true); // file name length
    view.setUint16(28, 0, true);          // extra field length
    localHeader.set(nameBytes, 30);

    fileEntries.push({
      nameBytes,
      dataBytes,
      checksum,
      size,
      offset,
      localHeader
    });

    offset += localHeader.length + size;
  }

  const centralDirStart = offset;
  const centralDirHeaders: Uint8Array[] = [];

  for (const entry of fileEntries) {
    // Central directory header (46 bytes + name)
    const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(cdHeader.buffer);

    view.setUint32(0, 0x02014b50, true); // signature
    view.setUint16(4, 20, true);         // version made by
    view.setUint16(6, 20, true);         // version needed
    view.setUint16(8, 0, true);          // bit flag
    view.setUint16(10, 0, true);         // compression method
    view.setUint16(12, 0, true);         // mod time
    view.setUint16(14, 0, true);         // mod date
    view.setUint32(16, entry.checksum, true);
    view.setUint32(20, entry.size, true);
    view.setUint32(24, entry.size, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint16(30, 0, true);         // extra field len
    view.setUint16(32, 0, true);         // file comment len
    view.setUint16(34, 0, true);         // disk number start
    view.setUint16(36, 0, true);         // internal attrs
    view.setUint32(38, 0, true);         // external attrs
    view.setUint32(42, entry.offset, true); // relative offset of local header
    cdHeader.set(entry.nameBytes, 46);

    centralDirHeaders.push(cdHeader);
    offset += cdHeader.length;
  }

  const centralDirSize = offset - centralDirStart;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // signature
  eocdView.setUint16(4, 0, true);          // disk number
  eocdView.setUint16(6, 0, true);          // disk where cd starts
  eocdView.setUint16(8, fileEntries.length, true); // number of cd records on this disk
  eocdView.setUint16(10, fileEntries.length, true); // total number of cd records
  eocdView.setUint32(12, centralDirSize, true);    // size of central directory
  eocdView.setUint32(16, centralDirStart, true);   // offset of start of cd
  eocdView.setUint16(20, 0, true);         // comment length

  // Total zip length
  let totalLength = 0;
  for (const entry of fileEntries) {
    totalLength += entry.localHeader.length + entry.dataBytes.length;
  }
  for (const cd of centralDirHeaders) {
    totalLength += cd.length;
  }
  totalLength += eocd.length;

  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const entry of fileEntries) {
    result.set(entry.localHeader, pos);
    pos += entry.localHeader.length;
    result.set(entry.dataBytes, pos);
    pos += entry.dataBytes.length;
  }
  for (const cd of centralDirHeaders) {
    result.set(cd, pos);
    pos += cd.length;
  }
  result.set(eocd, pos);

  return result;
}

/**
 * Builds a single-page PDF containing a rendered high-res image (A4 portrait)
 */
export function buildPdfFromJpeg(jpegBytes: Uint8Array, width: number, height: number): Uint8Array {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;
  const encoder = new TextEncoder();

  function write(str: string) {
    const buf = encoder.encode(str);
    chunks.push(buf);
    currentOffset += buf.length;
  }

  function writeBytes(bytes: Uint8Array) {
    chunks.push(bytes);
    currentOffset += bytes.length;
  }

  write("%PDF-1.4\n");

  // Obj 1: Catalog
  offsets.push(currentOffset);
  write("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Obj 2: Pages
  offsets.push(currentOffset);
  write("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // Obj 3: Page (A4 portrait: 595.28 x 841.89 pt)
  offsets.push(currentOffset);
  write(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_PT} ${A4_HEIGHT_PT}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`);

  // Obj 4: Content stream (scale image to fill A4 page)
  const streamContent = `q\n${A4_WIDTH_PT} 0 0 ${A4_HEIGHT_PT} 0 0 cm\n/Im1 Do\nQ\n`;
  offsets.push(currentOffset);
  write(`4 0 obj\n<< /Length ${encoder.encode(streamContent).length} >>\nstream\n${streamContent}endstream\nendobj\n`);

  // Obj 5: Image XObject
  offsets.push(currentOffset);
  write(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  writeBytes(jpegBytes);
  write("\nendstream\nendobj\n");

  // Xref
  const xrefOffset = currentOffset;
  write("xref\n0 6\n0000000000 65535 f \n");
  for (const off of offsets) {
    write(String(off).padStart(10, '0') + " 00000 n \n");
  }

  write(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  let totalSize = 0;
  for (const c of chunks) totalSize += c.length;
  const finalPdf = new Uint8Array(totalSize);
  let p = 0;
  for (const c of chunks) {
    finalPdf.set(c, p);
    p += c.length;
  }

  return finalPdf;
}

/**
 * Loads a QR Code SVG element into an HTMLImageElement for canvas drawing
 */
export async function loadQrSvgAsImage(svgElementId: string): Promise<HTMLImageElement> {
  const svg = document.getElementById(svgElementId);
  if (!svg) {
    throw new Error(`QR SVG element with id "${svgElementId}" not found in document.`);
  }

  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.src = url;

  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load QR SVG into image: ${e}`));
    };
  });
}

/**
 * Generates a high-resolution individual PNG sticker card for a dustbin.
 * Dimensions: 1000 x 1200 pixels.
 */
export async function generateIndividualStickerPng(bin: Bin, qrUrl: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 1000, 1200);

  // Outer border
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 14;
  ctx.strokeRect(30, 30, 940, 1140);

  // Inner decorative border
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, 904, 1104);

  // Top Banner
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(52, 52, 896, 170);

  // Header Title
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 50px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HAILO DIGITAL HUB', 500, 120);

  // Subtitle
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('SMART WASTE MANAGEMENT & MONITORING SYSTEM', 500, 165);

  // Tagline badge
  ctx.fillStyle = '#ECFDF5';
  ctx.fillRect(150, 240, 700, 56);
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 3;
  ctx.strokeRect(150, 240, 700, 56);

  ctx.fillStyle = '#047857';
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.fillText('SCAN TO REPORT WASTE ISSUES', 500, 278);

  // Draw QR Code
  try {
    const qrImg = await loadQrSvgAsImage(`qr-${bin.binCode}`);
    // White backing for QR code
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(250, 320, 500, 500);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.strokeRect(250, 320, 500, 500);
    ctx.drawImage(qrImg, 270, 340, 460, 460);
  } catch {
    // Fallback: draw from canvas element if available
    const canvasElem = document.getElementById(`qr-canvas-${bin.binCode}`) as HTMLCanvasElement;
    if (canvasElem) {
      ctx.drawImage(canvasElem, 250, 320, 500, 500);
    }
  }

  // Bin ID Box
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(150, 840, 700, 90);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px monospace, system-ui';
  ctx.fillText(`BIN ID: ${bin.binCode}`, 500, 900);

  // Location text
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
  ctx.fillText(`LOCATION: ${bin.location.toUpperCase()}`, 500, 975);

  // Reporting URL text
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(qrUrl, 500, 1030);

  // Status & Footer
  const statusText = bin.isActive !== false ? '● ACTIVE MUNICIPAL DUSTBIN' : '○ TEMPORARILY INACTIVE';
  ctx.fillStyle = bin.isActive !== false ? '#059669' : '#DC2626';
  ctx.font = 'bold 18px system-ui';
  ctx.fillText(statusText, 500, 1075);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '15px system-ui';
  ctx.fillText('Smart City Sanitation Division • Tamper-Evident Placard', 500, 1120);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png');
  });
}

/**
 * Generates an SVG string representation of the sticker placard.
 */
export function generateIndividualStickerSvg(bin: Bin, qrUrl: string): string {
  const svgElem = document.getElementById(`qr-${bin.binCode}`);
  let qrInner = '';
  if (svgElem) {
    qrInner = svgElem.innerHTML;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1200" width="1000" height="1200">
  <defs>
    <style>
      .font-sans { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    </style>
  </defs>

  <!-- Background Card -->
  <rect x="0" y="0" width="1000" height="1200" fill="#FFFFFF"/>
  <rect x="30" y="30" width="940" height="1140" fill="none" stroke="#0F172A" stroke-width="14" rx="16"/>
  <rect x="48" y="48" width="904" height="1104" fill="none" stroke="#059669" stroke-width="4" rx="10"/>

  <!-- Header Banner -->
  <rect x="52" y="52" width="896" height="170" fill="#0F172A" rx="8"/>
  <text x="500" y="120" text-anchor="middle" fill="#10B981" font-size="50" font-weight="bold" class="font-sans">HAILO DIGITAL HUB</text>
  <text x="500" y="165" text-anchor="middle" fill="#F8FAFC" font-size="22" font-weight="bold" class="font-sans">SMART WASTE MANAGEMENT &amp; MONITORING SYSTEM</text>

  <!-- Tagline -->
  <rect x="150" y="240" width="700" height="56" fill="#ECFDF5" stroke="#10B981" stroke-width="3" rx="8"/>
  <text x="500" y="278" text-anchor="middle" fill="#047857" font-size="26" font-weight="bold" class="font-sans">SCAN TO REPORT WASTE ISSUES</text>

  <!-- Embedded QR Code -->
  <g transform="translate(250, 320)">
    <rect x="0" y="0" width="500" height="500" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" rx="12"/>
    <g transform="translate(20, 20) scale(${460 / 120})">
      ${qrInner}
    </g>
  </g>

  <!-- Bin ID & Location -->
  <rect x="150" y="840" width="700" height="90" fill="#0F172A" rx="12"/>
  <text x="500" y="900" text-anchor="middle" fill="#FFFFFF" font-size="42" font-weight="bold" class="font-mono">BIN ID: ${bin.binCode}</text>
  <text x="500" y="975" text-anchor="middle" fill="#047857" font-size="32" font-weight="bold" class="font-sans">LOCATION: ${bin.location.toUpperCase()}</text>
  <text x="500" y="1030" text-anchor="middle" fill="#475569" font-size="20" font-weight="bold" class="font-mono">${qrUrl}</text>

  <!-- Status & Footer -->
  <text x="500" y="1075" text-anchor="middle" fill="${bin.isActive !== false ? '#059669' : '#DC2626'}" font-size="18" font-weight="bold" class="font-sans">
    ${bin.isActive !== false ? '● ACTIVE MUNICIPAL DUSTBIN' : '○ TEMPORARILY INACTIVE'}
  </text>
  <text x="500" y="1120" text-anchor="middle" fill="#94A3B8" font-size="15" class="font-sans">Smart City Sanitation Division • Tamper-Evident Placard</text>
</svg>`;
}

/**
 * Generates an A4 canvas (2480 x 3508 px) with all 5 stickers organized into printable placards
 */
export async function renderA4StickerSheetCanvas(bins: Bin[]): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = A4_CANVAS_WIDTH;
  canvas.height = A4_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context not available');

  // Sheet background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, A4_CANVAS_WIDTH, A4_CANVAS_HEIGHT);

  // Sheet Header
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 54px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HAILO DIGITAL HUB — MUNICIPAL SMART WASTE MANAGEMENT', A4_CANVAS_WIDTH / 2, 90);

  ctx.fillStyle = '#047857';
  ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
  ctx.fillText('OFFICIAL PERMANENT DUSTBIN QR PLACARDS (BATCH PRINT STICKER SHEET)', A4_CANVAS_WIDTH / 2, 135);

  ctx.fillStyle = '#64748B';
  ctx.font = '22px system-ui, -apple-system, sans-serif';
  ctx.fillText('Instructions: Print on A4 vinyl adhesive paper at 100% scale (no scaling). Cut along dashed cut lines (✂). Each sticker is sized for bin lids/fronts.', A4_CANVAS_WIDTH / 2, 175);

  // Divider line
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 205);
  ctx.lineTo(A4_CANVAS_WIDTH - 80, 205);
  ctx.stroke();

  // Layout 5 stickers in a 2-column x 3-row grid
  // Grid parameters
  const colWidth = 1100;
  const rowHeight = 1040;
  const leftColX = 100;
  const rightColX = 1280;
  const startY = 230;
  const rowGap = 50;

  const positions = [
    { x: leftColX, y: startY },                       // BIN-001
    { x: rightColX, y: startY },                      // BIN-002
    { x: leftColX, y: startY + rowHeight + rowGap },  // BIN-003
    { x: rightColX, y: startY + rowHeight + rowGap }, // BIN-004
    { x: leftColX, y: startY + (rowHeight + rowGap) * 2 } // BIN-005
  ];

  // For the 6th slot (right of BIN-005), draw a municipal verification & instruction panel
  const sixthSlot = { x: rightColX, y: startY + (rowHeight + rowGap) * 2 };

  // Draw 5 stickers
  for (let i = 0; i < bins.length && i < 5; i++) {
    const bin = bins[i];
    const pos = positions[i];
    const qrUrl = getBinQrUrl(bin.binCode);

    // Scissor cut line (dashed)
    ctx.save();
    ctx.setLineDash([16, 12]);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3;
    ctx.strokeRect(pos.x - 15, pos.y - 15, colWidth + 30, rowHeight + 30);
    ctx.restore();

    // Scissor indicator text
    ctx.fillStyle = '#94A3B8';
    ctx.font = '20px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('✂ - - - CUT HERE - - -', pos.x - 10, pos.y - 25);

    // Sticker Card Container
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(pos.x, pos.y, colWidth, rowHeight);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 8;
    ctx.strokeRect(pos.x, pos.y, colWidth, rowHeight);

    // Inner Green Accent Border
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.strokeRect(pos.x + 12, pos.y + 12, colWidth - 24, rowHeight - 24);

    // Top Header Banner
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(pos.x + 15, pos.y + 15, colWidth - 30, 120);

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HAILO DIGITAL HUB', pos.x + colWidth / 2, pos.y + 65);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('SMART WASTE MANAGEMENT & MONITORING SYSTEM', pos.x + colWidth / 2, pos.y + 105);

    // Call to action pill
    ctx.fillStyle = '#ECFDF5';
    ctx.fillRect(pos.x + 80, pos.y + 150, colWidth - 160, 48);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x + 80, pos.y + 150, colWidth - 160, 48);

    ctx.fillStyle = '#047857';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText('SCAN TO REPORT WASTE ISSUES', pos.x + colWidth / 2, pos.y + 184);

    // QR Code
    try {
      const qrImg = await loadQrSvgAsImage(`qr-${bin.binCode}`);
      const qrBoxSize = 460;
      const qrX = pos.x + (colWidth - qrBoxSize) / 2;
      const qrY = pos.y + 220;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX, qrY, qrBoxSize, qrBoxSize);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.strokeRect(qrX, qrY, qrBoxSize, qrBoxSize);

      ctx.drawImage(qrImg, qrX + 20, qrY + 20, qrBoxSize - 40, qrBoxSize - 40);
    } catch {
      // Fallback
      const canvasElem = document.getElementById(`qr-canvas-${bin.binCode}`) as HTMLCanvasElement;
      if (canvasElem) {
        ctx.drawImage(canvasElem, pos.x + (colWidth - 440) / 2, pos.y + 230, 440, 440);
      }
    }

    // Bin ID Box
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(pos.x + 80, pos.y + 700, colWidth - 160, 75);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px monospace, system-ui';
    ctx.fillText(`BIN ID: ${bin.binCode}`, pos.x + colWidth / 2, pos.y + 750);

    // Location
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(`LOCATION: ${bin.location.toUpperCase()}`, pos.x + colWidth / 2, pos.y + 820);

    // Reporting URL
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(qrUrl, pos.x + colWidth / 2, pos.y + 865);

    // Status & Footer
    const statusText = bin.isActive !== false ? '● ACTIVE MUNICIPAL SMART BIN' : '○ TEMPORARILY INACTIVE';
    ctx.fillStyle = bin.isActive !== false ? '#059669' : '#DC2626';
    ctx.font = 'bold 18px system-ui';
    ctx.fillText(statusText, pos.x + colWidth / 2, pos.y + 910);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '15px system-ui';
    ctx.fillText('Authorized Municipal Waste Placard • Weatherproof UV Print', pos.x + colWidth / 2, pos.y + 950);
  }

  // Draw 6th card (Admin System Verification placard)
  {
    const pos = sixthSlot;
    ctx.save();
    ctx.setLineDash([16, 12]);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3;
    ctx.strokeRect(pos.x - 15, pos.y - 15, colWidth + 30, rowHeight + 30);
    ctx.restore();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '20px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('✂ - - - CUT HERE - - -', pos.x - 10, pos.y - 25);

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(pos.x, pos.y, colWidth, rowHeight);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 8;
    ctx.strokeRect(pos.x, pos.y, colWidth, rowHeight);

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(pos.x + 15, pos.y + 15, colWidth - 30, 120);

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HAILO DIGITAL HUB', pos.x + colWidth / 2, pos.y + 65);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('FLEET OPERATOR VERIFICATION SHEET', pos.x + colWidth / 2, pos.y + 105);

    // Operator Checklist
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('PHYSICAL PLACARD ATTACHMENT GUIDE:', pos.x + 60, pos.y + 200);

    const checklist = [
      '1. Clean the dustbin surface with alcohol swab.',
      '2. Peel protective sticker liner without touching adhesive.',
      '3. Align placard at eye-level on the front lid or face.',
      '4. Smooth out air bubbles firmly from center outward.',
      '5. Verify scan with smartphone camera before leaving bin.',
      '6. Ensure camera opens: /report/BIN-00X without errors.',
      '7. Report any peeled or damaged placards via Admin Dashboard.'
    ];

    ctx.fillStyle = '#334155';
    ctx.font = '24px system-ui';
    let lineY = pos.y + 260;
    for (const item of checklist) {
      ctx.fillText(item, pos.x + 60, lineY);
      lineY += 55;
    }

    // Municipal Authority Seal box
    ctx.fillStyle = '#ECFDF5';
    ctx.fillRect(pos.x + 60, pos.y + 680, colWidth - 120, 240);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.strokeRect(pos.x + 60, pos.y + 680, colWidth - 120, 240);

    ctx.fillStyle = '#065F46';
    ctx.font = 'bold 30px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFIED 5-BIN MUNICIPAL BATCH', pos.x + colWidth / 2, pos.y + 750);

    ctx.fillStyle = '#047857';
    ctx.font = '22px system-ui';
    ctx.fillText('BIN-001 • BIN-002 • BIN-003 • BIN-004 • BIN-005', pos.x + colWidth / 2, pos.y + 810);

    ctx.fillStyle = '#64748B';
    ctx.font = '18px monospace';
    ctx.fillText(`Generated: ${new Date().toISOString().slice(0, 10)} | Standard ISO A4`, pos.x + colWidth / 2, pos.y + 870);
  }

  return canvas;
}

/**
 * Generates an A4 PDF Blob containing all 5 dustbin QR stickers.
 */
export async function generateAllQrPdf(bins: Bin[]): Promise<Blob> {
  const canvas = await renderA4StickerSheetCanvas(bins);

  // Convert canvas to JPEG blob (at 95% quality for high compression + sharpness)
  const jpegBlob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
  });

  const arrayBuffer = await jpegBlob.arrayBuffer();
  const jpegBytes = new Uint8Array(arrayBuffer);

  const pdfBytes = buildPdfFromJpeg(jpegBytes, canvas.width, canvas.height);
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

/**
 * Packages all 5 QR codes into a single downloadable ZIP archive
 * containing:
 * - 5 high-res PNG stickers
 * - 5 vector SVG placards
 * - 1 README.txt with installation instructions and URLs
 */
export async function generateAllQrZip(bins: Bin[]): Promise<Blob> {
  const zipFiles: { name: string; data: Uint8Array | string }[] = [];

  let readmeText = `========================================================================
HAILO DIGITAL HUB — PERMANENT DUSTBIN QR PLACARD SYSTEM
Smart Waste Management & Monitoring System
========================================================================

BATCH CONTENTS (5 REGISTERED MUNICIPAL DUSTBINS):

`;

  for (const bin of bins) {
    const qrUrl = getBinQrUrl(bin.binCode);

    readmeText += `------------------------------------------------------------------------
Bin ID:       ${bin.binCode}
Location:     ${bin.location}
Status:       ${bin.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
Destination:  ${qrUrl}
PNG File:     ${bin.binCode}_Sticker_HighRes.png
SVG File:     ${bin.binCode}_Placard_Vector.svg
------------------------------------------------------------------------\n`;

    // 1. Generate PNG
    const pngBlob = await generateIndividualStickerPng(bin, qrUrl);
    const pngBuffer = await pngBlob.arrayBuffer();
    zipFiles.push({
      name: `${bin.binCode}_Sticker_HighRes.png`,
      data: new Uint8Array(pngBuffer)
    });

    // 2. Generate SVG
    const svgContent = generateIndividualStickerSvg(bin, qrUrl);
    zipFiles.push({
      name: `${bin.binCode}_Placard_Vector.svg`,
      data: svgContent
    });
  }

  readmeText += `
HOW TO USE:
1. Print the high-res PNG or vector SVG files onto weatherproof adhesive vinyl.
2. Affix each QR sticker firmly onto the designated physical dustbin.
3. Citizens scan using any iPhone or Android camera to open the instant reporting form.
4. No app installation or citizen login is required to file waste complaints.

Questions or assistance? Check Admin Dashboard -> QR Management.
========================================================================
`;

  zipFiles.push({
    name: 'README_INSTALLATION_GUIDE.txt',
    data: readmeText
  });

  const zipBytes = buildZipFile(zipFiles);
  return new Blob([zipBytes as unknown as BlobPart], { type: 'application/zip' });
}

/**
 * Triggers a direct browser file download for a Blob
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
