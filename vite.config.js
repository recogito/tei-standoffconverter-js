import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({ 
      insertTypesEntry: true,
      entryRoot: '.',
      rollupTypes: true // Add this line
    })
  ],
  server: {
    open: '/test/index.html'
  },
  build: {
    ssr: true,
    sourcemap: true,
    minify: true,
    lib: {
      name: 'StandoffConverter',
      entry: './src/index.ts',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['linkedom'],
      output: {
        globals: {
          linkedom: 'linkedom'
        }
      }
    }
  }
});