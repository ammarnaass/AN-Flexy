import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// CSP تُحقن عند البناء فقط حتى لا تكسر HMR أثناء التطوير (RULES 8.2).
function cspPlugin(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ')
  return {
    name: 'anflexy-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('</head>', `    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  </head>`)
    },
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@main': r('./src/main'), '@shared': r('./src/shared') },
    },
  },
  preload: {
    // zod يُدمَج داخل preload لأن الـ sandbox لا يستطيع الوصول إلى node_modules.
    plugins: [externalizeDepsPlugin({ exclude: ['zod'] })],
    resolve: {
      alias: { '@shared': r('./src/shared') },
    },
    build: {
      rollupOptions: {
        // sandbox: true يتطلب preload بصيغة CJS.
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    resolve: {
      alias: { '@renderer': r('./src/renderer'), '@shared': r('./src/shared') },
    },
    plugins: [react(), tailwindcss(), cspPlugin()],
  },
})
