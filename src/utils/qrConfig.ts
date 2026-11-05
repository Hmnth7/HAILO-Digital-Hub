/**
 * QR Code & Public Domain Configuration
 * 
 * CRITICAL RULE:
 * Never generate QR codes containing 'localhost' or '127.0.0.1'.
 * Every QR code must resolve to a valid, reachable public HTTPS domain so that
 * any mobile phone scanning the printed or on-screen QR code can immediately
 * access the citizen reporting interface.
 */

const STORAGE_KEY_PUBLIC_URL = 'hailo_public_base_url';

export interface DomainStatus {
  isConfigured: boolean;
  url: string;
  source: 'env' | 'custom' | 'host' | 'pending';
  message: string;
}

/**
 * Checks whether a legitimate non-localhost public domain is configured.
 */
export function isPublicDomainConfigured(): boolean {
  return getPublicDomainStatus().isConfigured;
}

/**
 * Detailed status of the current public domain configuration.
 */
export function getPublicDomainStatus(): DomainStatus {
  // 1. Check environment variable (Vercel / Production deployment)
  const envUrl = (import.meta as any).env?.VITE_PUBLIC_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && !isLocalhostUrl(envUrl)) {
    return {
      isConfigured: true,
      url: sanitizeUrl(envUrl.trim()),
      source: 'env',
      message: 'Configured via build environment (VITE_PUBLIC_URL)'
    };
  }

  // 2. Check user-configured override in localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_PUBLIC_URL);
    if (saved && saved.trim() !== '' && !isLocalhostUrl(saved)) {
      return {
        isConfigured: true,
        url: sanitizeUrl(saved.trim()),
        source: 'custom',
        message: 'Configured manually via Admin QR Management'
      };
    }

    // 3. If running in a browser on a genuine non-localhost domain (tunnel, ngrok, Vercel, or custom production host)
    const hostname = window.location.hostname;
    const isLocalhost = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname === '0.0.0.0' || 
      hostname === '::1';

    if (window.location.origin) {
      return {
        isConfigured: !isLocalhost,
        url: sanitizeUrl(window.location.origin),
        source: isLocalhost ? 'host' : 'host',
        message: isLocalhost 
          ? `Active host (${hostname}) • Set custom public domain in QR Management for remote phone scanning` 
          : `Auto-detected from active host (${hostname})`
      };
    }
  }

  // 4. Default production Firebase web app domain
  return {
    isConfigured: true,
    url: 'https://hailo-digital-hub-c33c1.web.app',
    source: 'pending',
    message: 'Default production Firebase web application domain'
  };
}

/**
 * Helper to check if a URL or host is localhost
 */
function isLocalhostUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(/^https?:\/\//i.test(urlStr) ? urlStr : `https://${urlStr}`);
    return parsed.hostname === 'localhost' || 
           parsed.hostname === '127.0.0.1' || 
           parsed.hostname === '0.0.0.0' || 
           parsed.hostname === '::1';
  } catch {
    return urlStr.includes('localhost') || urlStr.includes('127.0.0.1');
  }
}

/**
 * Retrieves the active public base URL for permanent QR codes and external links.
 */
export function getProductionBaseUrl(): string {
  const status = getPublicDomainStatus();
  return status.url;
}

/**
 * Sets a custom public base URL override in localStorage.
 */
export function setProductionBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || url.trim() === '') {
      localStorage.removeItem(STORAGE_KEY_PUBLIC_URL);
    } else {
      localStorage.setItem(STORAGE_KEY_PUBLIC_URL, sanitizeUrl(url.trim()));
    }
  }
}

/**
 * Clears custom public base URL override in localStorage.
 */
export function clearProductionBaseUrl(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_PUBLIC_URL);
  }
}

/**
 * Generates the permanent public HTTPS URL for a specific dustbin.
 * Example: https://hailo-digital-hub.example.com/report/BIN-001
 */
export function getBinQrUrl(binCode: string): string {
  const base = getProductionBaseUrl();
  const cleanCode = (binCode || '').trim().toUpperCase();
  if (!cleanCode) return '';
  return `${base}/report/${cleanCode}`;
}

/**
 * Sanitizes URLs to remove trailing slashes and ensure https:// protocol.
 */
export function sanitizeUrl(url: string): string {
  let cleaned = url.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}
