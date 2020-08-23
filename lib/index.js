const { src, dest, parallel, series, watch } = require('gulp')

// 一个删除插件
const del = require('del')
// 可以创建开发服务器
const browerSync = require('browser-sync')
// 此插件包括 gulp 所有插件，通过此插件调用具体插件
const loadPlugins = require('gulp-load-plugins')()

// 创建一个开发服务器
const bs = browerSync.create()
/// 使用了 gulp-load-plugins 插件就不需要单独引用每个插件
// const sass = require('gulp-sass')
// const babel = require('gulp-babel')
// const swig = require('gulp-swig')
// const imagemin = require('gulp-imagemin')

// 获取当前的工作目录路径
const cwd = process.cwd()
// 一些默认的配置，此处的配置数据用来渲染模板数据
let config = {
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

try {
  // 获取工作目录的用户自定义配置
  const loadConfig = require(`${cwd}/pages.config.js`)
  // 配置合并
  config = Object.assign({}, config, loadConfig)
} catch { }

// 清除文件任务
const clean = () => {
  // 指定一个 temp 目录，方便执行 useref 任务得时候进行读取
  return del([config.build.dist, config.build.temp])
}

// 样式处理任务
const style = () => {
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
    // 以 _ 开头的样式文件名 gulp 会认为是项目依赖的文件，将不会被转换
    // outputStyle 执行样式的展开形式
    .pipe(loadPlugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
    // 文件改变后以流的方式向浏览器自动更新
    .pipe(bs.reload({ stream: true }))
}

// 脚本文件处理任务
const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
    .pipe(loadPlugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

// 处理html文件
const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
    // swig 一种模板渲染引擎
    .pipe(loadPlugins.swig({ data: config.data }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

// 处理图片
const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(loadPlugins.imagemin())
    .pipe(dest(config.build.dist))
}

// 处理字体
const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
    .pipe(loadPlugins.imagemin())
    .pipe(dest(config.build.dist))
}

// 其他一些操作，public 文件夹中的文件一般默认不被处理，直接原样输出
const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public })
    .pipe(dest(config.build.dist))
}

// 启动开发服务器
const serve = () => {
  // 启动时检测这些文件的改变，如有文件改变则再次执行对应的任务
  watch(config.build.paths.styles, { cwd: config.build.src }, style)
  watch(config.build.paths.styles, { cwd: config.build.src }, script)
  watch(config.build.paths.pages, { cwd: config.build.src }, page)
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)

  watch([
    config.build.paths.images,
    config.build.paths.fonts
  ], { cwd: config.build.src }, bs.reload)

  watch('**', { cwd: config.build.public }, bs.reload)

  // 初始化服务器
  bs.init({
    notify: false, // 页面连接提示信息是否显示
    port: 2080,
    open: true,
    // files: 'dist/**', // 指定文件改变后页面自动刷新
    server: {
      // 相当于服务器的静态文件夹
      baseDir: [config.build.temp, config.build.dist, config.build.public],
      // 当有请求时，优先查找routes下的配置
      // 通过routes进行路径映射
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

// 根据html中的构建注释，对文件进行处理
const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
    .pipe(loadPlugins.useref({ searchPath: ['temp', '.'] }))
    // 压缩 html js css
    .pipe(loadPlugins.if(/\.js$/, loadPlugins.uglify()))
    .pipe(loadPlugins.if(/\.css$/, loadPlugins.cleanCss()))
    .pipe(loadPlugins.if(/\.html$/, loadPlugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest(config.build.dist))
}

// 对 脚本，样式，页面并行处理
const compile = parallel(style, script, page)

// 打包时，先清除目标文件夹， 然后再对文件进行处理， 处理时先进行脚本样式页面的处理，然后再使用useref处理里面的构建注释
const build = series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )
)

// 开发时使用
const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop
}
