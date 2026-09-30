import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Server code reads process.env; Vite only exposes VITE_ variables. process.env wins over the file.
  process.env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }

  return {
    define: {
      __APP_VERSION__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev'),
    },
    plugins: [tanstackStart(), nitro(), viteReact()],
  }
})
