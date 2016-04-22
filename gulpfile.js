'use strict';
var gulp       = require('gulp'),
    buffer     = require('vinyl-buffer'),
    source = require('vinyl-source-stream'),
    browserify = require('browserify'),
    uglify     = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil      = require('gulp-util'),
    grename    = require('gulp-rename');

gulp.task('default', function () {

    gulp.src('./test/*').pipe(gulp.dest('dist/test'));
    gulp.src('./test-browser/*').pipe(gulp.dest('dist/test'));

    return browserify({
            entries: './index',
            debug: true
        })
        .bundle()
        .pipe(source('protolib.js'))
        .pipe(grename({
            basename : 'protolib',
            extname  : '.js'
        }))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(uglify()).on('error', gutil.log)
        .pipe(grename({
            basename : 'protolib.min',
            extname  : '.js'
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./dist'));
});
