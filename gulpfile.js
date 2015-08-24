var gulp = require('gulp');
var solc = require('gulp-smake');
var filter = require('gulp-filter');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var concatCSS = require('gulp-concat-css');
var mainBowerFiles = require('main-bower-files');
var preprocess = require('gulp-preprocess');
var replace = require('gulp-replace');
var jshint = require('gulp-jshint');
var rm = require('gulp-rm');
var crypto = require('crypto');
var os = require('os');
var fs = require('fs-extra');
var path = require('path');

var getFileGlobs = function () {
    return ['src/lib/*.js'].concat(mainBowerFiles()).concat(['src/controllers/*.js', 'src/*.js', 'src/css/*.css']);
};
var allFiles = getFileGlobs();
var solidityPaths = ['./src/contracts/*.sol', './src/contracts/**/*.sol'];

gulp.task('clean', function () {
  return gulp.src(['build/**/*'], {read: false}).pipe(rm());
});

gulp.task('hint', function () {
  return gulp.src(['src/*.js', 'src/**/*.js', '!src/lib', '!src/lib/**'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('watch', ['test'], function () {
  return gulp.watch(allFiles.concat(solidityPaths), ['test']);
});

gulp.task('build', ['clean', 'build-contracts', 'build-static']);

gulp.task('copy-contracts', function() {
  return gulp.src(solidityPaths, {base: 'src'})
    .pipe(gulp.dest('build')); 
});

var tmpDir = (function () {
  var hash = crypto.createHash('sha1');
  hash.update(__dirname);
  return path.join(os.tmpdir(), hash.digest('base64'));
})();

var solidityPaths = ['./src/contracts/*.sol', './src/contracts/**/*.sol'];
gulp.task('pre-build-contracts', function () {
  fs.emptyDirSync(tmpDir);
  return gulp.src(solidityPaths, {base: 'src'})
    .pipe(preprocess())
    .pipe(gulp.dest(tmpDir));
});

gulp.task('build-contracts', ['pre-build-contracts'], function () {
  return gulp.src(solidityPaths)
    .pipe(solc.build({
        paths: solidityPaths,
        root: __dirname, 
        sourceDir: 'src/contracts',
        buildDir: 'build/contracts',
        docsDir: 'docs/contracts',
        compilerFlags: "--optimize --bin --abi --devdoc -o ."
    }, {base: tmpDir + '/contracts'}));
});

gulp.task('build-static', ['hint'], function () {
  allFiles = getFileGlobs();
  var jsFilter = filter('*.js', {restore: true});
  var cssFilter = filter('*.css', {restore: true});
  var fontFilter = filter(['*.eot', '*.woff', '*.woff2', '*.svg', '*.ttf']);

  return gulp.src(allFiles)
    .pipe(jsFilter)
    .pipe(concat('all.js'))
//    .pipe(uglify({mangle: false}))
    .pipe(gulp.dest('./build'))
    .pipe(jsFilter.restore)
    .pipe(cssFilter)
    .pipe(concatCSS('all.css'))
    .pipe(replace(/font\/[^\/]+/ig, './build/fonts'))
    .pipe(minifyCSS())
    .pipe(gulp.dest('./build'))
    .pipe(cssFilter.restore)
    .pipe(fontFilter)
    .pipe(gulp.dest('./build/fonts'));
});

gulp.task('test', ['build'], function() {
  var ethertest = require('gulp-ethertest');
  gulp.src(['./build/contracts/*.bin', 'build/contracts/*.abi'])
    .pipe(ethertest({
      primaryAccount: '0x82a978b3f5962a5b0957d9ee9eef472ee55b42f1',
      gas: 2760038, gasPrice: 10, endowment: 1000, value: 100, colors: true,
      watchLogEvents: false
    }));
});
