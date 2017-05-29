'use strict';

var unified = require('unified');
var parse = require('rehype-parse');
var minify = require('rehype-preset-minify');
var preventFaviconRequest = require('rehype-prevent-favicon-request');
var stringify = require('rehype-stringify');

module.exports = unified()
  .use(parse)
  .use(minify)
  .use(preventFaviconRequest)
  .use(stringify)
  .freeze();
