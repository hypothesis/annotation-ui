import { buildCSS, runTests } from '@hypothesis/frontend-build';
import gulp from 'gulp';

import tailwindConfig from './tailwind.config.js';

// The following tasks bundle assets for the pattern library for use locally
// during development. Bundled JS and CSS are not published with the package.

gulp.task('build-test-css', () =>
  buildCSS(['./test/tailwind.scss'], { tailwindConfig }),
);

// Some (eg. a11y) tests rely on CSS bundles. We assume that JS will always take
// longer to build than CSS, so build in parallel.
gulp.task(
  'test',
  gulp.parallel('build-test-css', () =>
    runTests({
      bootstrapFile: 'test/bootstrap.js',
      rollupConfig: 'rollup-tests.config.js',
      vitestConfig: 'vitest.config.js',
      testsPattern: 'src/**/*-test.js',
    }),
  ),
);
