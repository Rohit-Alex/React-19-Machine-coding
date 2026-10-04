import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { liveFeedPlugin } from './dev-server/liveFeedPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), liveFeedPlugin()],
})
