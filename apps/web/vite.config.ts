import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 4173,
        host: '0.0.0.0', // Ensure binding to all interfaces explicitly
        allowedHosts: true, // Let all hosts through in dev
        proxy: {
            '/api': {
                target: 'http://api:4000',
                changeOrigin: true,
            },
            '/ws': {
                target: 'ws://api:4000',
                ws: true,
            },
        },
    },
})