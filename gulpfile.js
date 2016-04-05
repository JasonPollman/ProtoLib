'use strict';
var gulp       = require('gulp'),
    buffer     = require('vinyl-buffer'),
    uglify     = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil      = require('gulp-util'),
    grename    = require('gulp-rename');

gulp.task('default', function () {
    return gulp.src('./jlib.js')
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(uglify()).on('error', gutil.log)
        .pipe(grename({
            basename : 'jlib.min',
            extname  : '.js'
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./dist'));
});
