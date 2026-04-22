import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages: https://chakshugautam.github.io/ggsql-demo/
// Set VITE_BASE=/ for root-served deployments.
const base = process.env.VITE_BASE ?? '/ggsql-demo/'

export default defineConfig({
  base,
  plugins: [react()],
})
