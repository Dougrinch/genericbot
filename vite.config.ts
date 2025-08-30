import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(env => {
  return {
    plugins: [react()],

    ...(env.mode === 'production'
      ? {
        define: {
          'process.env.NODE_ENV': '"production"',
          'process.env': '{}',
        },
      }
      : {}),

    build: {
      lib: {
        entry: './src/bot/injection.tsx',
        name: 'Bot',
        fileName: 'bot',
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
  }
})
