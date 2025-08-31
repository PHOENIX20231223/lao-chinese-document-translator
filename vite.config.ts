import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',   // ✅ 部署到 Netlify 根域名时必须是 '/'
  plugins: [react()]
})