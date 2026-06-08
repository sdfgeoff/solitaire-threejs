import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const { VITE_BASE = '/' } = loadEnv(mode, process.cwd(), '');
  return {
    base: VITE_BASE,
    root: '.',
    build: { outDir: 'dist' },
  };
});
