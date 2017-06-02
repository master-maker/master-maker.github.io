'use strict';

var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
var xtend = require('xtend');
var yaml = require('js-yaml');
var glob = require('glob');
var bail = require('bail');
var async = require('async');
var trough = require('trough');
var ccount = require('ccount');
var hidden = require('is-hidden');
var vfile = require('to-vfile');
var reporter = require('vfile-reporter');
var toString = require('mdast-util-to-string');
var visit = require('unist-util-visit');
var markdown2html = require('./markdown-to-html');
var html = require('./html');
var externals = require('./externals');

var index = fs.readFileSync(path.join(__dirname, 'index.ejs'), 'utf8');
var article = fs.readFileSync(path.join(__dirname, 'article.ejs'), 'utf8');

/* Read articles */
var preline = trough()
  .use(vfile.read)
  .use(function (file) {
    file.tree = markdown2html.parse(file);
  });

/* Write articles */
var postline = trough()
  /* Render fragment as HTML */
  .use(function (config) {
    var file = config.file;
    file.contents = markdown2html.stringify(markdown2html.runSync(file.tree, file), file);
  })
  /* Wrap fragment in templated document */
  .use(function (config) {
    var file = config.file;
    file.contents = ejs.render(article, config);
    file.dirname = 'build';
    file.basename = config.slug + '.html';
  })
  /* Transform document */
  .use(function (config) {
    html.processSync(config.file);
  })
  /* Write file */
  .use(function (config, next) {
    return vfile.write(config.file, next);
  })
  /* Report file */
  .use(function (config) {
    var file = config.file;
    file.stored = true;
    console.error(reporter(file));
  });

/* Process `index.html` */
var mainline = trough()
  /* Render */
  .use(function (config) {
    config.file.contents = ejs.render(index, config);
  })
  /* Transform document */
  .use(function (config) {
    html.processSync(config.file);
  })
  /* Write file */
  .use(function (config, next) {
    return vfile.write(config.file, next);
  })
  /* Report file */
  .use(function (config) {
    var file = config.file;
    file.stored = true;
    console.error(reporter(file));
  });

/* Static line */
var staticline = trough()
  .use(vfile.read)
  .use(function (file, next) {
    var ext = file.extname;
    if (ext in externals) {
      externals[ext].run(file, next);
    } else {
      next();
    }
  })
  .use(function (file) {
    file.dirname = 'build';
  })
  .use(vfile.write)
  .use(function (file) {
    file.stored = true;
    console.error(reporter(file));
  });

trough()
  .use(glob)
  .use(function (configs, next) {
    return async.map(configs, staticline.run, next);
  })
  .run('static/*', bail);

trough()
  .use(glob)
  .use(function (paths, next) {
    return async.map(paths.filter(applicable), preline.run, next);
  })
  .use(function (files) {
    var tabs = {};
    var results = files.map(create).sort(sort).map(update);
    var nav = results.filter(navigable);

    results.forEach(add);

    return results;

    function create(file) {
      var stem = file.stem;
      var pos = stem.indexOf('.');
      var last = stem.lastIndexOf('.');
      var slug = stem;
      var name = stem;
      var title;
      var subtitle;
      var tab;
      var config;

      if (pos !== -1) {
        tab = parseInt(stem.slice(0, pos), 10);
        slug = stem.slice(pos + 1);
        name = pos === last ? slug : stem.slice(last + 1);
      }

      visit(file.tree, 'yaml', match);
      visit(file.tree, 'heading', find);

      if (title) {
        pos = title.indexOf(':');

        if (pos !== -1) {
          subtitle = title.slice(pos + 1).trim();
          title = title.slice(0, pos).trim();
        }
      }

      return xtend({
        section: parseInt(config.tab, 10),
        tab: tab,
        name: name,
        slug: slug,
        title: title,
        subtitle: subtitle,
        color: 'red',
        description: ''
      }, config, {file: file});

      function match(node) {
        config = yaml.safeLoad(node.value);
      }

      function find(node, index, parent) {
        if (!title && node.depth === 1) {
          title = toString(node);
          parent.children.splice(index, 1);
        }
      }
    }

    function sort(a, b) {
      return a.tab - b.tab;
    }

    function update(config, index, all) {
      var section = config.section;
      var result = xtend(config, {
        prev: all[index - 1],
        next: all[index + 1]
      });

      if (!(section in tabs)) {
        tabs[section] = [];
      }

      tabs[section].push(result);

      result.tabs = tabs[section];

      return result;
    }

    function add(config, index, all) {
      config.all = all;
      config.nav = nav;
    }

    function navigable(config) {
      return config.section === config.tab || config.section + 0.1 === config.tab;
    }
  })
  .use(function (configs, next) {
    return async.map(configs, postline.run, next);
  })
  .use(function (configs, next) {
    mainline.run({
      file: vfile('build/index.html'),
      all: configs,
      nav: configs[0].nav
    }, function (err) {
      next(err);
    });
  })
  .run('src/*.md', bail);

function applicable(filePath) {
  var name = path.basename(filePath);
  return !hidden(name) && ccount(name, '.') >= 2;
}
