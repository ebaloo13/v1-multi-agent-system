import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig(({ command }) => {
  const isDevServer = command === 'serve'

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      // Local dev needs direct Node access for the existing file-based workflow.
      // Keep the Cloudflare plugin enabled for non-dev builds so the deployment target stays intact.
      ...(!isDevServer ? [cloudflare({ viteEnvironment: { name: 'ssr' } })] : []),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
  }
})

export default config
