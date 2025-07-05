import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path';    

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: mode === 'production' ? '/reciter-v2/' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000 // in kB
  }

})
