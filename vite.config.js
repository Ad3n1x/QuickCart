import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isGitHubPages = env.VITE_GITHUB_PAGES === 'true';
  return {
    plugins: [react()],
    base: isGitHubPages ? '/QuickCart/' : (env.VITE_BASE_PATH || '/'),
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || env.API_URL || '')
    },
    build: { outDir: 'dist' }
  };
});
