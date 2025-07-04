import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path';    

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: '/reciter-v2/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  }
})
