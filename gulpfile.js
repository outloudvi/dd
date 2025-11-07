import gulp from 'gulp'
import toml from 'gulp-toml'
import rename from 'gulp-rename'
import fs from 'fs'
import htmlmin from 'gulp-htmlmin'
import cleanCSS from 'gulp-clean-css'
import nunjucksRender from 'gulp-nunjucks-render'
import { execSync } from 'child_process'
import dayjs from 'dayjs'
import dayjsUtc from 'dayjs/plugin/utc.js'
import dayjsTimezone from 'dayjs/plugin/timezone.js'

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
    execSync('git log -1 --format=%ct -- data.toml').toString('utf-8')
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
