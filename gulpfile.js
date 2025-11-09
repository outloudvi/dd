import gulp from 'gulp'
import toml from 'gulp-toml'
import rename from 'gulp-rename'
import tap from 'gulp-tap'
import htmlmin from 'gulp-htmlmin'
import cleanCSS from 'gulp-clean-css'
import nunjucksRender from 'gulp-nunjucks-render'
import fs from 'node:fs'
import { Feed } from 'feed'
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
    .pipe(
      tap(function (file) {
        const contents = file.contents.toString('utf-8')
        const body = JSON.parse(contents)
        const compare = new Intl.Collator(['ja']).compare
        const sortedItems = [...body.items]
          .sort((a, b) => compare(a.title, b.title))
          .sort((a, b) => (a.order ?? 99999) - (b.order ?? 99999))
        const lastCommitTs = Number(
          execSync('git log -1 --format=%ct -- data.toml').toString('utf-8')
        )
        const result = {
          ...body,
          items: sortedItems,
          lastCommitDate: dayjs(lastCommitTs * 1000)
            .tz('Asia/Hong_Kong')
            .format('YYYY/MM/DD'),
          lastCommitTs: lastCommitTs,
        }
        file.contents = Buffer.from(JSON.stringify(result, null, 2), 'utf-8')
      })
    )
    .pipe(rename({ extname: '.json' }))
    .pipe(gulp.dest('dist'))
})

gulp.task('minify-css', () => {
  return gulp.src('src/style.css').pipe(cleanCSS()).pipe(gulp.dest('dist'))
})

gulp.task('generate-html', () => {
  const data = JSON.parse(fs.readFileSync('dist/data.json', 'utf-8'))

  return gulp
    .src('src/templates/*.njk')
    .pipe(
      nunjucksRender({
        data,
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

gulp.task('build-feed', () => {
  const data = JSON.parse(fs.readFileSync('dist/data.json', 'utf-8'))
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
  const updateDate = data.lastCommitTs
    ? new Date(data.lastCommitTs * 1000)
    : new Date()

  const feed = new Feed({
    title: "Outvi V's DD",
    description: packageJson.description,
    id: packageJson.homepage,
    link: packageJson.homepage,
    language: 'zh',
    updated: updateDate,
    generator: 'dd-gulp-feed',
    feedLinks: {
      json: new URL('feed.json', packageJson.homepage).toString(),
      rss2: new URL('feed.xml', packageJson.homepage).toString(),
    },
    author: packageJson.author,
  })

  data.items.forEach((item) => {
    const { title, description, trailer } = item
    const { title: trailer_title, link: trailer_link } = trailer
    feed.addItem({
      title,
      id: title,
      link: trailer_link,
      date: updateDate,
      description,
      content: trailer_title,
    })
  })

  fs.mkdirSync('dist', { recursive: true })
  fs.writeFileSync('dist/feed.json', feed.json1(), 'utf-8')
  fs.writeFileSync('dist/feed.xml', feed.atom1(), 'utf-8')

  return Promise.resolve()
})

gulp.task(
  'build-html',
  gulp.series('minify-css', 'generate-html', 'minify-html')
)

gulp.task(
  'default',
  gulp.series('toml', gulp.parallel('build-html', 'build-feed'))
)

gulp.task('watch', () => {
  gulp.watch('data.toml', gulp.series('default'))
  gulp.watch('src/style.css', gulp.series('build-html'))
  gulp.watch('src/templates/**/*.njk', gulp.series('build-html'))
})
