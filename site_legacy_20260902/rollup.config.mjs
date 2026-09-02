/**
 * GOS PWA - Rollup config for Service Worker build
 */
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/workers/service-worker.ts',
  output: {
    dir: 'dist',
    format: 'es',
    name: 'GOSServiceWorker',
    entryFileNames: 'service-worker.js',
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.sw.json',
      compilerOptions: {
        lib: ['es2020', 'webworker'],
        target: 'es2020',
        module: 'es2020',
        moduleResolution: 'node',
        strict: true,
        skipLibCheck: true,
      },
    }),
  ],
};
