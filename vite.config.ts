import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `--mode phone`: serve over self-signed HTTPS on the LAN so a phone can open the camera.
export default defineConfig(({ mode }) => ({
  // GitHub Pages serves the app under /<repo>/; set BASE_PATH there.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), ...(mode === 'phone' ? [basicSsl()] : [])],
  server: mode === 'phone' ? { host: true } : undefined,
}));
