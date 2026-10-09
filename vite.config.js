import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Served at https://permadeathmedia.com/union-up/ (the site proxies that path to
// this deployment), so every asset URL carries that prefix.
export default defineConfig({ plugins: [react()], base: '/union-up/' })
