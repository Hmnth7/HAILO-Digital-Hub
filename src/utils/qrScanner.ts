import jsQR from 'jsqr';
import { Bin } from '../types';

/**
 * Extracts a normalized Bin ID from scanned QR code content.
 * Supports full HTTPS URLs, hash routes, relative paths, query parameters,
 * and direct bin codes.
 */
export function extractBinCodeFromQr(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // 1. Check for URL path like /report/BIN-XXX or /bins/BIN-XXX
  const pathMatch = trimmed.match(/(?:\/report\/|\/bins\/)([A-Za-z0-9_-]+)/i);
  if (pathMatch && pathMatch[1].toUpperCase() !== 'SUCCESS') {
    return pathMatch[1].toUpperCase();
  }

  // 2. Check for URL query param ?bin=BIN-XXX or ?binCode=BIN-XXX or ?code=BIN-XXX
  const queryMatch = trimmed.match(/[?&](?:bin|binCode|code)=([A-Za-z0-9_-]+)/i);
  if (queryMatch) {
    return queryMatch[1].toUpperCase();
  }

  // 3. Direct bin code pattern (e.g. BIN-001, BIN-A002, BIN001, etc.)
  const directMatch = trimmed.match(/^BIN[-_]?[A-Za-z0-9]+$/i);
  if (directMatch) {
    if (/^BIN\d+$/i.test(trimmed)) {
      return `BIN-${trimmed.slice(3)}`.toUpperCase();
    }
    return trimmed.toUpperCase();
  }

  // 4. If text contains a word matching BIN-\w+
  const wordMatch = trimmed.match(/\b(BIN-[A-Za-z0-9_-]+)\b/i);
  if (wordMatch) {
    return wordMatch[1].toUpperCase();
  }

  return null;
}

export interface QrValidationResult {
  valid: boolean;
  binCode?: string;
  bin?: Bin;
  error?: string;
  rawText: string;
}

/**
 * Validates scanned QR text against currently registered bins in the database.
 */
export function validateScannedQr(text: string, registeredBins: Bin[]): QrValidationResult {
  const rawText = (text || '').trim();
  const extractedCode = extractBinCodeFromQr(rawText);

  if (!extractedCode) {
    return {
      valid: false,
      rawText,
      error: 'Invalid QR Code: The scanned QR code does not contain a recognized HAILO dustbin URL or ID.'
    };
  }

  const matchedBin = registeredBins.find(
    (b) => b.binCode.toUpperCase() === extractedCode.toUpperCase()
  );

  if (!matchedBin) {
    return {
      valid: false,
      binCode: extractedCode,
      rawText,
      error: `Dustbin "${extractedCode}" is not registered in the system.`
    };
  }

  return {
    valid: true,
    binCode: matchedBin.binCode,
    bin: matchedBin,
    rawText
  };
}

/**
 * Scans a canvas frame for QR codes using BarcodeDetector if available, falling back to jsQR.
 */
export async function scanCanvasForQr(canvas: HTMLCanvasElement): Promise<string | null> {
  // 1. Try native BarcodeDetector API if supported
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(canvas);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Fall through to jsQR
    }
  }

  // 2. Decode using jsQR on 2D context
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    });
    return code ? code.data : null;
  } catch {
    return null;
  }
}

/**
 * Scans a video element by rendering its current frame to an offscreen canvas.
 */
export async function scanVideoFrameForQr(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<string | null> {
  if (video.readyState < video.HAVE_CURRENT_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  // 1. First try native BarcodeDetector directly on video if supported
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(video);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Fall through
    }
  }

  // 2. Render frame to canvas and use jsQR
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return scanCanvasForQr(canvas);
}

/**
 * Reads an image file (e.g. from photo upload) and scans it for a QR code.
 */
export async function scanImageFileForQr(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const result = await scanCanvasForQr(canvas);
        resolve(result);
      };
      img.onerror = () => resolve(null);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
