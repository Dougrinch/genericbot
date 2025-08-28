import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Widget build configuration - builds only the widget as a single file
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env': '{}'
  },
  build: {
    lib: {
      entry: './src/widget/injection.tsx',
      name: 'Widget',
      fileName: 'widget',
      formats: ['iife']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  }
})