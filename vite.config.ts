import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 * Production CSP: the app may only talk to its own origin (CLAUDE.md §1.2).
 * Also blocks MediaPipe's built-in usage telemetry, which has no opt-out.
 * The LLM gateway origin (#5) is the only allowed exception.
 */
function connectSrcPolicy(gatewayUrl: string | undefined): Plugin {
  const allowed = ["'self'", 'blob:', 'data:'];
  if (gatewayUrl) allowed.push(new URL(gatewayUrl).origin);
  return {
    name: 'connect-src-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: `connect-src ${allowed.join(' ')}` }, injectTo: 'head-prepend' },
    ],
  };
}

// `--mode phone`: serve over self-signed HTTPS on the LAN so a phone can open the camera.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    // GitHub Pages serves the app under /<repo>/; set BASE_PATH there.
    base: process.env.BASE_PATH ?? '/',
    plugins: [react(), tailwindcss(), connectSrcPolicy(env.VITE_LLM_GATEWAY_URL), ...(mode === 'phone' ? [basicSsl()] : [])],
    server: mode === 'phone' ? { host: true } : undefined,
  };
});
