import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')

          if (!normalizedId.includes('/node_modules/')) {
            return undefined
          }

          const parts = normalizedId.split('/node_modules/')[1]?.split('/') ?? []
          const packageName =
            parts[0]?.startsWith('@') && parts[1]
              ? `${parts[0]}/${parts[1]}`
              : parts[0]

          if (!packageName) {
            return undefined
          }

          if (packageName === 'react' || packageName === 'react-dom' || packageName === 'scheduler') {
            return 'react-vendor'
          }

          if (packageName.startsWith('react-router')) {
            return 'router-vendor'
          }

          if (packageName === 'recharts') {
            return 'chart-vendor'
          }

          if (packageName === 'jspdf') {
            return 'export-jspdf'
          }

          if (packageName === 'html2canvas') {
            return 'export-html2canvas'
          }

          if (packageName === 'canvg') {
            return 'export-canvg'
          }

          if (
            packageName.startsWith('@radix-ui') ||
            packageName.startsWith('@emotion') ||
            packageName.startsWith('@mui') ||
            packageName === 'lucide-react'
          ) {
            return 'ui-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
})
