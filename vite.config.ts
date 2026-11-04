import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function complaintsApiPlugin() {
  const dbDir = path.resolve(__dirname, 'data');
  const dbFile = path.resolve(dbDir, 'complaints.json');

  const ensureDb = () => {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(dbFile)) {
      fs.writeFileSync(dbFile, '[]', 'utf-8');
    }
  };

  const readComplaints = (): any[] => {
    ensureDb();
    try {
      const data = fs.readFileSync(dbFile, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeComplaints = (data: any[]): void => {
    ensureDb();
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
  };

  const middleware = (req: any, res: any, next: any) => {
    const rawUrl = req.url || '';
    const pathname = rawUrl.split('?')[0];

    if (pathname !== '/api/complaints' && !pathname.startsWith('/api/complaints/')) {
      return next();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }

    if (req.method === 'GET') {
      const complaints = readComplaints();
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      return res.end(JSON.stringify(complaints));
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const item = JSON.parse(body || '{}');
          const complaints = readComplaints();

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

          item.status = item.status || 'PENDING';

          const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          item.createdAt = item.createdAt || nowStr;
          item.reportedAt = item.reportedAt || nowStr;

          const updated = [item, ...complaints.filter((c: any) => c.id !== item.id)];
          writeComplaints(updated);

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 201;
          return res.end(JSON.stringify(item));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const updateData = JSON.parse(body || '{}');
          const complaints = readComplaints();
          const targetId = updateData.id || updateData.complaintCode;
          let matched = false;

          const updated = complaints.map((c: any) => {
            if (c.id === targetId || c.complaintCode === targetId) {
              matched = true;
              return { ...c, ...updateData };
            }
            return c;
          });

          if (!matched && updateData.complaintCode) {
            updated.unshift(updateData);
          }

          writeComplaints(updated);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, complaint: updateData }));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Failed to update complaint' }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      writeComplaints([]);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, count: 0 }));
    }

    next();
  };

  return {
    name: 'complaints-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(middleware);
    }
  };
}

export default defineConfig({
  plugins: [react(), complaintsApiPlugin()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/router/Router.tsx',
        './src/context/AppContext.tsx',
        './src/pages/DashboardPage.tsx',
        './src/pages/LoginPage.tsx',
        './src/pages/BinMonitoringPage.tsx',
        './src/pages/CitizenReportPage.tsx'
      ]
    }
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      'recharts',
      'qrcode.react',
      'canvas-confetti'
    ],
    force: true
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-charts': ['recharts'],
          'vendor-qr': ['qrcode.react', 'canvas-confetti']
        }
      }
    }
  }
});

