'use strict';
var gulp       = require('gulp'),
    browserify = require('browserify'),
    source     = require('vinyl-source-stream'),
    buffer     = require('vinyl-buffer'),
    uglify     = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil      = require('gulp-util');

gulp.task('default', function () {

  // Set up the browserify instance on a task basis
  var b = browserify({
    entries : './jlib.js',
    debug   : true
  });

  return b.bundle()
    .pipe(source('../jlib.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))

        // Add transformation tasks to the pipeline here.
        .pipe(uglify()).on('error', gutil.log)

    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist/js/'));
});
