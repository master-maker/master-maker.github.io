'use strict';

var unified = require('unified');
var parse = require('remark-parse');
var remark2rehype = require('remark-rehype');
var raw = require('rehype-raw');
var stringify = require('rehype-stringify');

module.exports = unified()
  .use(parse)
  .use(remark2rehype, {allowDangerousHTML: true})
  .use(raw)
  .use(stringify)
  .freeze();
