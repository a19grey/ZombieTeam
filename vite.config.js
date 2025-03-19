/**
 * Vite configuration for Zombie Survival Game
 * 
 * This configuration file sets up Vite for optimal development and production builds.
 * It defines the project structure, build output, and server settings.
 * 
 * Example usage: 
 * - Development: npm run dev
 * - Production build: npm run build
 * - Preview build: npm run preview
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    root: './',
    publicDir: 'audio', // Static assets that should be served as-is
    
    // Dynamically inject environment variables
    define: {
      'window.APP_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'window.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'window.SERVER_TIMESTAMP': JSON.stringify(new Date().toISOString())
    },
    
    // Development server configuration
    server: {
      port: 3000,
      open: true,
      cors: true,
      host: true
    },
    
    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: !isProduction,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        assetsInclude: ['**/*.mp3'] // Ensure .mp3 files are treated as assets
      }
    }
  };
}); 