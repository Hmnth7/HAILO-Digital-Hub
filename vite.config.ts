import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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

