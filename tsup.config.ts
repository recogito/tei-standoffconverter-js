import type { Options } from 'tsup';

export const tsup: Options = {
  clean: true, // clean up the dist folder
  dts: true, // generate dts files
  format: ['esm', 'cjs'],
  splitting: false,
  sourcemap: true,
  minify: true,
  bundle: true,
  entry: ['src/index.ts'],
  target: 'es2020',
  external: ['jsdom']
};