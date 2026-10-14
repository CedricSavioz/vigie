import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Build « fichier unique » : toute l'application dans un seul .html,
// à envoyer par e-mail et à ouvrir par double-clic (aucun serveur requis).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { outDir: 'dist-fichier', chunkSizeWarningLimit: 2000 },
})
