import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path';    
import legacy from '@vitejs/plugin-legacy'


// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(),
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  base: mode === 'production' ? '/reciter-v2/' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000 // in kB
  }

}))
