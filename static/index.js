'use strict';

/* eslint-env browser */

var jump = require('jump.js');

var down = document.getElementById('down');
var content = down && document.getElementById(down.hash.slice(1));

/* Jump down. */
if (content) {
  down.addEventListener('click', onclick);
}

function onclick(ev) {
  ev.preventDefault();
  jump(content);
  content.focus();
}
