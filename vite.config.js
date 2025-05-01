
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({ 
      insertTypesEntry: true,
      entryRoot: '.'
    })
  ],
  server: {
    open: '/test/index.html'
  },
  build: {
    sourcemap: true,
    lib: {
      entry: './src/index.ts',
      name: 'StandoffConverter',
      formats: ['es', 'umd'],
      fileName: (format) => {
        return format === 'es' 
          ? 'standoff-converter.mjs' 
          : `standoff-converter.${format}.cjs`;
      },
    }
  }
});
