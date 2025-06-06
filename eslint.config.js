import hypothesisBase from 'eslint-config-hypothesis/base';
import hypothesisJSX from 'eslint-config-hypothesis/jsx';
import hypothesisTS from 'eslint-config-hypothesis/ts';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(
  globalIgnores(['.yalc/**', 'lib/**', 'build/**']),

  hypothesisBase,
  hypothesisJSX,
  hypothesisTS,

  // Icons
  {
    files: ['src/components/icons/*.tsx'],
    rules: {
      // preact uses kebab-cased SVG element attributes, which look like
      // unknown properties to `eslint-plugin-react` (React uses camelCase
      // for these properties)
      'react/no-unknown-property': 'off',
    },
  },
);
