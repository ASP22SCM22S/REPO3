const config = require('../config');
const gulp = require('gulp');
const gutil = require('gulp-util');
const rename = require('gulp-rename');
const filter = require('gulp-filter');
const concat = require('gulp-concat');
const series = require('stream-series');
const util = require('../util');
const sassUtils = require('../../scripts/gulp-utils');
const sass = require('gulp-sass')(require('sass'));
const insert = require('gulp-insert');
const gulpif = require('gulp-if');
const minifyCss = util.minifyCss;
const args = util.args;
const IS_DEV = require('../const').IS_DEV;
const path = require('path');

exports.task = function() {
  const streams = [];
  const modules = args.modules,
    overrides = args.override,
    dest = args['output-dir'] || config.outputDir,
    layoutDest = dest + 'layouts/';

  gutil.log("Building css files...");

  // create SCSS file for distribution
  streams.push(
    gulp.src(getPaths())
    .pipe(util.filterNonCodeFiles())
    .pipe(filter(['**', '!**/*.css']))
    .pipe(filter(['**', '!**/*-theme.scss']))
    .pipe(filter(['**', '!**/*-attributes.scss']))
    .pipe(concat('angular-material.scss'))
    .pipe(insert.prepend(config.banner))
    .pipe(gulp.dest(dest))                        // raw uncompiled SCSS
    .pipe(sass())
    .pipe(util.dedupeCss())
    .pipe(util.autoprefix())
    .pipe(gulp.dest(dest))                        // unminified
    .pipe(gulpif(!IS_DEV, minifyCss()))
    .pipe(gulpif(!IS_DEV, util.dedupeCss()))
    .pipe(rename({extname: '.min.css'}))
    .pipe(gulp.dest(dest))                        // minified
  );

  streams.push(
    gulp.src(config.cssIEPaths.slice())         // append raw CSS for IE Fixes
    .pipe(concat('angular-material.layouts.ie_fixes.css'))
    .pipe(gulp.dest(layoutDest))
  );

  // Generate standalone SCSS (and CSS) file for Layouts API
  // The use of these classnames is automated but requires
  // the Javascript module `material.core.layout`
  //  > (see src/core/services/layout.js)
  // NOTE: this generated css is ALSO appended to the published
  //       angular-material.css file

  streams.push(
    gulp.src(config.scssLayoutFiles)
    .pipe(concat('angular-material.layouts.scss'))
    .pipe(sassUtils.hoistScssVariables())
    .pipe(insert.prepend(config.banner))
    .pipe(gulp.dest(layoutDest))      // raw uncompiled SCSS
    .pipe(sass())
    .pipe(util.dedupeCss())
    .pipe(util.autoprefix())
    .pipe(rename({extname: '.css'}))
    .pipe(gulp.dest(layoutDest))
    .pipe(gulpif(!IS_DEV, minifyCss()))
    .pipe(gulpif(!IS_DEV, util.dedupeCss()))
    .pipe(rename({extname: '.min.css'}))
    .pipe(gulp.dest(layoutDest))
  );

  // Generate the Layout-Attributes SCSS and CSS files
  // These are intended to allow usages of the Layout styles
  // without:
  //  * use of the Layout directives and classnames, and
  //  * Layout module `material.core.layout`

  streams.push(
    gulp.src(config.scssLayoutAttributeFiles)
    .pipe(concat('angular-material.layout-attributes.scss'))
    .pipe(sassUtils.hoistScssVariables())
    .pipe(gulp.dest(layoutDest))     // raw uncompiled SCSS
    .pipe(sass())
    .pipe(util.dedupeCss())
    .pipe(util.autoprefix())
    .pipe(rename({extname: '.css'}))
    .pipe(insert.prepend(config.banner))
    .pipe(gulp.dest(layoutDest))
    .pipe(gulpif(!IS_DEV, minifyCss()))
    .pipe(gulpif(!IS_DEV, util.dedupeCss()))
    .pipe(rename({extname: '.min.css'}))
    .pipe(gulp.dest(layoutDest))
  );

  return series(streams);

  /**
   * @returns {string[]} array of SCSS file paths used in the build
   */
  function getPaths() {
    const paths = config.scssBaseFiles.slice(0);
    if (modules) {
      paths.push.apply(paths, modules.split(',').map(function(module) {
        return 'src/components/' + module + '/*.scss';
      }));
    } else {
      config.scssComponentPaths.forEach(component => paths.push(path.join(component, '*.scss')));
      paths.push(config.scssServicesLayout);
    }
    overrides && paths.unshift(overrides);
    return paths;
  }
};
