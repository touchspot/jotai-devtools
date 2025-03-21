import { replace } from 'esbuild-plugin-replace';
import { Options, defineConfig } from 'tsup';

const defaultOutExtension: Options['outExtension'] = ({ format }) => {
  return {
    js: `.${format}.js`,
  };
};

const defaultEsBuildPlugins: Options['esbuildPlugins'] = [
  replace({
    // FIXME - Should filter it by `include` instead of `exclude`. This doesn't seem to be working /^.*\.js$/,
    __DEV__: '(process.env.NODE_ENV!=="production")',
  }),
];

const baseConfig: Options = {
  // Outputs `dist/index.js` and `dist/utils.js`
  entry: {
    index: 'src/index.ts',
  },
  sourcemap: false,
  // Clean output directory before each build
  clean: true,
  minify: false,
  splitting: true,
  tsconfig: './tsconfig.build.json',
  dts: true,
  skipNodeModulesBundle: true,
  platform: 'node',
  outExtension: defaultOutExtension,
  esbuildPlugins: defaultEsBuildPlugins,
};

const cjsConfig: Options = {
  ...baseConfig,
  format: ['cjs'],
};

const mjsOutExtension: Options['outExtension'] = ({ format }) => {
  return {
    js: `.${format}.mjs`,
  };
};

const mjsConfig: Options = {
  ...baseConfig,
  format: ['esm'],
  outExtension: mjsOutExtension,
};

export default defineConfig([cjsConfig, mjsConfig]);
