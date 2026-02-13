import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'text-summary', 'html'],
        include: ['src/**/*.ts'],
        exclude: [
          'src/main.ts',
          'src/**/*.spec.ts',
          'src/**/*.d.ts',
          'src/test/**',
          'src/**/*.vue',
          'src/core/**',
          'src/**/index.ts',
        ],
        thresholds: {
          statements: 90,
          branches: 82,
          functions: 90,
          lines: 90,
        },
      },
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
