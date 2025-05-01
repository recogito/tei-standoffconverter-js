
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
    ssr: true,
    sourcemap: true,
    lib: {
      entry: './src/index.ts',
      name: 'StandoffConverter',
      formats: ['es', 'umd']
    }
  }
});
