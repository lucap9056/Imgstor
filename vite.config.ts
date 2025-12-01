import { viteStaticCopy } from 'vite-plugin-static-copy';
import compression from 'vite-plugin-compression';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm';
import path from 'path';
import fs from 'fs';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd());

  return {
    base: "./",
    define: {
      'process.env': env,
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "styles/_variables" as *;`
        }
      },
      modules: {
        generateScopedName: '[hash:base64:8]',
      }
    },
    plugins: [
      react(),
      wasm(),
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240,
      }),
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240
      }),
      viteStaticCopy({
        targets: [
          {
            src: [
              'node_modules/@ffmpeg/ffmpeg/dist/esm/const.js',
              'node_modules/@ffmpeg/ffmpeg/dist/esm/errors.js'
            ],
            dest: 'assets',
          },
        ],
      }),
    ],
    worker: {
      format: "es"
    },
    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"]
    },
    build: {
      target: "esnext",
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return id.split('node_modules/')[1].split('/')[0].toString();
            }
          },
        },
      },
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        mangle: true
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'node_modules': path.resolve(__dirname, './node_modules'),
        'global-components': path.resolve(__dirname, './src/global-components'),
        'route-paths': path.resolve(__dirname, './src/route-paths'),
        'components': path.resolve(__dirname, './src/components'),
        'services': path.resolve(__dirname, './src/services'),
        'structs': path.resolve(__dirname, './src/structs'),
        'styles': path.resolve(__dirname, './src/styles'),
      },
    },
    server: {
      host: env["VITE_SERVER_HOST"] || "localhost",
      port: env["VITE_SERVER_PORT"] ? parseInt(env["VITE_SERVER_PORT"]) : 443,
      mimeType: {
        'application/wasm': ['wasm']
      },
      https: {
        cert: env["VITE_SSL_CRT"] ? fs.readFileSync(path.resolve(__dirname, env["VITE_SSL_CRT"])) : undefined,
        key: env["VITE_SSL_KEY"] ? fs.readFileSync(path.resolve(__dirname, env["VITE_SSL_KEY"])) : undefined,
      },
    },
  }
});
