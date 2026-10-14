import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Chemins relatifs : le build fonctionne depuis n'importe quel dossier ou hébergement statique.
  base: './',
  plugins: [react(), tailwindcss()],
  // Outil interne : le chunk principal embarque Recharts (utilisé par le panneau latéral global).
  build: { chunkSizeWarningLimit: 800 },
})
