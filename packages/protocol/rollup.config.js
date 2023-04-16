import typescript from '@rollup/plugin-typescript'
import autoExternal from 'rollup-plugin-node-externals'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import path from 'path'

const euiLoader = require('@electricui/rollup-loader')

export default {
  input: 'index.ts',
  output: {
    file: 'lib/index.js',
    format: 'cjs',
    sourcemap: true,
  },
  plugins: [
    euiLoader(),

    autoExternal({
      packagePath: path.resolve(__dirname, 'package.json'),
      exclude: /electricui/,
    }),

    nodeResolve(),

    commonjs(),

    typescript({}),
  ],
}
