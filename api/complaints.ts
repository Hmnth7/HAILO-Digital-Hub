import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

// Shared memory store fallback for serverless environments (e.g. Vercel)
let memoryComplaints: any[] = [];

function getDbPath(): string | null {
  try {
    const localPath = path.resolve(process.cwd(), 'data', 'complaints.json');
    const localDir = path.dirname(localPath);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localPath;
  } catch {
    return null;
  }
}

function readComplaints(): any[] {
  const filePath = getDbPath();
  if (filePath && fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        memoryComplaints = parsed;
        return parsed;
      }
    } catch {
      // fallback to memory
    }
  }
  return memoryComplaints;
}

function writeComplaints(data: any[]): void {
  memoryComplaints = data;
  const filePath = getDbPath();
  if (filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // fallback in read-only serverless environment
    }
  }
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const url = req.url || '';

  if (req.method === 'GET') {
    const complaints = readComplaints();
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify(complaints));
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    } else if (!body) {
      body = await new Promise<any>((resolve) => {
        let raw = '';
        req.on('data', (chunk: any) => { raw += chunk; });
        req.on('end', () => {
          try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
        });
      });
    }

    const complaints = readComplaints();
    const item = { ...body };

    const maxNum = complaints.reduce((max: number, c: any) => {
      const m = (c.complaintCode || '').match(/CMP-(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);

    if (!item.id) {
      item.id = `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const codeInUseByOther = complaints.some((c: any) => c.complaintCode === item.complaintCode && c.id !== item.id);
    if (!item.complaintCode || codeInUseByOther) {
      item.complaintCode = `CMP-${String(maxNum + 1).padStart(3, '0')}`;
    }

    // Starting status is always PENDING
    item.status = item.status || 'PENDING';

    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    item.createdAt = item.createdAt || nowStr;
    item.reportedAt = item.reportedAt || nowStr;

    const updated = [item, ...complaints.filter((c: any) => c.id !== item.id)];
    writeComplaints(updated);

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 201;
    return res.end(JSON.stringify(item));
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    } else if (!body) {
      body = await new Promise<any>((resolve) => {
        let raw = '';
        req.on('data', (chunk: any) => { raw += chunk; });
        req.on('end', () => {
          try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
        });
      });
    }

    const complaints = readComplaints();
    const targetId = body.id || body.complaintCode;
    let matched = false;

    const updated = complaints.map((c: any) => {
      if (c.id === targetId || c.complaintCode === targetId) {
        matched = true;
        return { ...c, ...body };
      }
      return c;
    });

    if (!matched && body.complaintCode) {
      updated.unshift(body);
    }

    writeComplaints(updated);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify({ success: true, complaint: body }));
  }

  if (req.method === 'DELETE') {
    writeComplaints([]);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify({ success: true, count: 0 }));
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
