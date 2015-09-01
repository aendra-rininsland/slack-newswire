'use strict';

/**
* Tasks that will zip all the files so that the zip file can be deployed to
* AWS Lambda.
*
* @author Ændrew Rininsland      <aendrew@aendrew.com>
* @since  30 Aug. 2015
*/

require('dotenv').load();
var gulp = require('gulp');
var zip = require('gulp-zip');
var del = require('del');
var install = require('gulp-install');
var runSequence = require('run-sequence');
var awsLambda = require('node-aws-lambda');

gulp.task('clean', function(callback) {
  del(['./dist', './dist.zip'], callback);
});

gulp.task('js', function() {
  return gulp.src(['index.js'])
  .pipe(gulp.dest('dist/'));
});

// Next copy over environment variables managed outside of source control.
gulp.task('env', function() {
  return gulp.src('./.env')
  .pipe(gulp.dest('./dist'));
});

gulp.task('node-mods', function() {
  return gulp.src('./package.json')
  .pipe(gulp.dest('dist/'))
  .pipe(install({production: true}));
});

gulp.task('zip', function() {
  return gulp.src(['dist/**/*', 'dist/.env', '!dist/package.json'])
  .pipe(zip('dist.zip'))
  .pipe(gulp.dest('./'));
});

gulp.task('upload', function(callback) {
  awsLambda.deploy('./dist.zip', require('./lambda-config.js'), callback);
});

gulp.task('deploy', function(callback) {
  runSequence(
    ['clean'],
    ['js', 'node-mods', 'env'],
    ['zip'],
    ['upload'],
    callback
  );
});
