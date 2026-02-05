import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react'],
  treeshake: true,
  splitting: false,
  minify: false,
  sourcemap: true,
});
