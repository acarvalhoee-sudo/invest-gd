import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      external: ['html2canvas', 'canvg', 'dompurify', 'fast-png'],
    },
  },
  optimizeDeps: {
    exclude: ['html2canvas', 'canvg', 'dompurify', 'fast-png'],
  },
})
