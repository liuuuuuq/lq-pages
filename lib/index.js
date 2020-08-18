const { src, dest, parallel, series, watch } = require('gulp')

const del = require('del')
const browerSync = require('browser-sync')

// 此插件包括 gulp 所有插件，通过此插件调用具体插件
const loadPlugins = require('gulp-load-plugins')()

// 创建一个开发服务器
const bs = browerSync.create()

// const sass = require('gulp-sass')
// const babel = require('gulp-babel')
// const swig = require('gulp-swig')
// const imagemin = require('gulp-imagemin')

const data = {
  menus: [
    {
      name: 'Home',
      icon: 'aperture',
      link: 'index.html'
    },
    {
      name: 'Features',
      link: 'features.html'
    },
    {
      name: 'About',
      link: 'about.html'
    },
    {
      name: 'Contact',
      link: '#',
      children: [
        {
          name: 'Twitter',
          link: 'https://twitter.com/w_zce'
        },
        {
          name: 'About',
          link: 'https://weibo.com/zceme'
        },
        {
          name: 'divider'
        },
        {
          name: 'About',
          link: 'https://github.com/zce'
        }
      ]
    }
  ],
  pkg: require('./package.json'),
  date: new Date()
}


const clean = () => {
  // 指定一个 temp 目录，方便执行 useref 任务得时候进行读取
  return del(['dist', 'temp'])
}

const style = () => {
  return src('src/assets/styles/*.scss', { base: 'src' })
    // 以 _ 开头的样式文件名 gulp 会认为是项目依赖的文件，讲不会被转换
    // outputStyle 执行样式的展开形式
    .pipe(loadPlugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest('temp'))
    // 文件改变后以流的方式向浏览器自动更新
    .pipe(bs.reload({ stream: true }))
}

const script = () => {
  return src('src/assets/scripts/*.js', { base: 'src' })
    .pipe(loadPlugins.babel({ presets: ['@babel/preset-env'] }))
    .pipe(dest('temp'))
    .pipe(bs.reload({ stream: true }))
}

const page = () => {
  return src('src/*.html', { base: 'src' })
    .pipe(loadPlugins.swig({ data }))
    .pipe(dest('temp'))
    .pipe(bs.reload({ stream: true }))
}

const image = () => {
  return src('src/assets/images/**', { base: 'src' })
    .pipe(loadPlugins.imagemin())
    .pipe(dest('dist'))
}

const font = () => {
  return src('src/assets/fonts/**', { base: 'src' })
    .pipe(loadPlugins.imagemin())
    .pipe(dest('dist'))
}

const extra = () => {
  return src('public/**', { base: 'public' })
    .pipe(dest('dist'))
}

const serve = () => {
  watch('src/assets/styles/*.scss', style)
  watch('src/assets/scripts/*.js', script)
  watch('src/*.html', page)
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)

  watch([
    'src/assets/images/**',
    'src/assets/fonts/**',
    'public/**'
  ], bs.reload)

  bs.init({
    notify: false, // 页面连接信息
    port: 2080,
    open: true,
    // files: 'dist/**', // 指定文件改变后页面自动刷新
    server: {
      // 相当于服务器的静态文件夹
      baseDir: ['dist', 'src', 'public'],
      // 当有请求是，优先查找routes下的配置
      // 通过routes进行路径映射
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

// 根据html中的构建注释，对文件进行处理
const useref = () => {
  return src('temp/*.html', { base: 'temp' })
    .pipe(loadPlugins.useref({ searchPath: ['temp', '.'] }))
    // 压缩 html js css
    .pipe(loadPlugins.if(/\.js$/, loadPlugins.uglify()))
    .pipe(loadPlugins.if(/\.css$/, loadPlugins.cleanCss()))
    .pipe(loadPlugins.if(/\.html$/, loadPlugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest('dist'))
}


const compile = parallel(style, script, page)

const build = series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )
)

const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop
}