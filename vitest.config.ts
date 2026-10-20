import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@garvix/shared-types': path.resolve(__dirname, 'packages/shared-types/src/index.ts'),
      '@garvix/validation': path.resolve(__dirname, 'packages/validation/src/index.ts'),
      '@garvix/authorization': path.resolve(__dirname, 'packages/authorization/src/index.ts'),
      '@garvix/api-contracts': path.resolve(__dirname, 'packages/api-contracts/src/index.ts'),
      '@garvix/telemetry': path.resolve(__dirname, 'packages/telemetry/src/index.ts'),
      '@garvix/ui-components': path.resolve(__dirname, 'packages/ui-components/src/index.ts'),
      '@garvix/cloud-api': path.resolve(__dirname, 'apps/cloud-api/src/index.ts'),
      '@garvix/local-panel-api': path.resolve(__dirname, 'apps/local-panel-api/src/index.ts'),
      '@garvix/cloud-console': path.resolve(__dirname, 'apps/cloud-console/src/index.ts'),
      '@garvix/customer-panel': path.resolve(__dirname, 'apps/customer-panel/src/index.ts'),
    },
  },
  test: {
    include: [
      'tests/unit/**/*.test.ts',
      'tests/security/**/*.test.ts',
      'tests/recovery/**/*.test.ts',
    ],
    environment: 'node',
  },
});
