'use strict';

var trough = require('trough');

module.exports = trough().use(transform);

function transform(file) {
  file.contents = JSON.stringify(JSON.parse(file));
}
