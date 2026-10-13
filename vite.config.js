import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Served at https://permadeathmedia.com/union-up/ (the site proxies that path to
// this deployment), so every asset URL carries that prefix. __BUILD__ is the commit
// Vercel built, sent with play analytics so a change in the numbers can be matched
// to the build that made it.
export default defineConfig({
  plugins: [react()],
  base: '/union-up/',
  define: { __BUILD__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 7)) },
})
