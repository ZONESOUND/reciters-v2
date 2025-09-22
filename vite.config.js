import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path';    
import legacy from '@vitejs/plugin-legacy'
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), basicSsl(),
    legacy({
      //targets: ['defaults', 'not IE 11'],
      targets: ['defaults', 'last 2 versions', 'Android >= 5', 'iOS >= 10', 'Safari >= 10.1'],
      modernPolyfills: true,
      additionalLegacyPolyfills: [
        'regenerator-runtime/runtime', // async/await
      ],
      renderLegacyChunks: true,
      externalSystemJS: false
    })
  ],
  base: mode === 'production' ? '/reciter-v2/' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2015',
    cssTarget: 'es2015',
    chunkSizeWarningLimit: 1000, // in kB,
    sourcemap: true
  },
  server: {
    host: true,
    https: true
  },
  preview: {
    host: true,
    https: true,
    strictPort: true,
    port: 4173
  }

}))
