import { runTests } from '@hypothesis/frontend-build';
import gulp from 'gulp';

// The following tasks bundle assets for the pattern library for use locally
// during development. Bundled JS and CSS are not published with the package.

gulp.task('test', () =>
  runTests({
    bootstrapFile: 'test/bootstrap.js',
    rollupConfig: 'rollup-tests.config.js',
    vitestConfig: 'vitest.config.js',
    testsPattern: 'src/**/*-test.js',
  }),
);
