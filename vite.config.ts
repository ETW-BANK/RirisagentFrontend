import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = (env.VITE_API_BASE_URL || 'https://ririsagent.runasp.net').replace(
    /\/+$/,
    '',
  )

  return {
    base: env.GITHUB_ACTIONS === 'true' ? '/RirisagentFrontend/' : '/',
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
