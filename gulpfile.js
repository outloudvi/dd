const gulp = require('gulp')
const toml = require('gulp-toml')
const rename = require('gulp-rename')
const fs = require('fs')
const htmlmin = require('gulp-htmlmin')
const cleanCSS = require('gulp-clean-css')
const nunjucksRender = require('gulp-nunjucks-render')
const { execSync } = require('child_process')
const dayjs = require('dayjs')
const dayjsUtc = require('dayjs/plugin/utc')
const dayjsTimezone = require('dayjs/plugin/timezone')

dayjs.extend(dayjsUtc)
dayjs.extend(dayjsTimezone)

gulp.task('toml', () => {
  return gulp
    .src('data.toml')
    .pipe(toml())
    .pipe(rename({ extname: '.json' }))
    .pipe(gulp.dest('dist'))
})

gulp.task('minify-css', () => {
  return gulp.src('src/style.css').pipe(cleanCSS()).pipe(gulp.dest('dist'))
})

gulp.task('generate-html', () => {
  const data = JSON.parse(fs.readFileSync('dist/data.json', 'utf-8'))
  const lastCommitTs = Number(
    execSync('git log -1 --format=%ct').toString('utf-8')
  )
  return gulp
    .src('src/templates/*.njk')
    .pipe(
      nunjucksRender({
        data: {
          ...data,
          lastCommitDate: dayjs(lastCommitTs * 1000)
            .tz('Asia/Hong_Kong')
            .format('YYYY/MM/DD'),
        },
        path: ['src/templates', 'dist'],
      })
    )
    .pipe(gulp.dest('dist'))
})

gulp.task('minify-html', () => {
  return gulp
    .src('dist/index.html')
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest('dist'))
})

gulp.task(
  'build-html',
  gulp.series('minify-css', 'generate-html', 'minify-html')
)

gulp.task('default', gulp.series('toml', 'build-html'))

gulp.task('watch', () => {
  gulp.watch('data.toml', gulp.series('default'))
  gulp.watch('src/style.css', gulp.series('build-html'))
  gulp.watch('src/templates/**/*.njk', gulp.series('build-html'))
})
