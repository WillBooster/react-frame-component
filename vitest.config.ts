import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const isCI = process.env.CI === 'true';
const isMac = process.platform === 'darwin';

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: {
          headless: true,
        },
      }),
      instances: [
        {
          browser: 'chromium' as const,
          headless: true,
        },
        ...(isCI ? [{ browser: 'firefox' as const, headless: true }] : []),
        ...(!isCI && isMac ? [{ browser: 'webkit' as const, headless: true }] : []),
      ],
    },
    globals: true,
    setupFiles: ['./test/helpers/setup.ts'],
  },
});
