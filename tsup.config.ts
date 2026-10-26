import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts'],
  format: ['cjs', 'esm'],
  tsconfig: 'tsconfig.build.json',
  dts: false,
  clean: true,
  sourcemap: true,
  shims: true, // add support for imports of native libs of node in ESM and CJS
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  skipNodeModulesBundle: true,
});