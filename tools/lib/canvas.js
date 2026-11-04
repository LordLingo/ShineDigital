/*
 * Reads the design canvas (project/Main.dc.html) and runs its component in plain Node,
 * so build scripts can use its text, prices and WhatsApp link without copying them.
 *
 *   const canvas = require('./lib/canvas')(srcPath);
 *   canvas.css, canvas.template, canvas.src
 *   canvas.valsFor('ro' | 'en')  ->  { vals, dict }   (vals = what the canvas renders with, dict = both languages)
 */
'use strict';
const fs = require('fs');

module.exports = function loadCanvas(srcPath) {
  const src = fs.readFileSync(srcPath, 'utf8');
  const cssMatch = /<style>([\s\S]*?)<\/style>/.exec(src);
  const tplMatch = /<\/helmet>\s*([\s\S]*?)\s*<\/x-dc>/.exec(src);
  const jsMatch = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/.exec(src);
  if (!cssMatch || !tplMatch || !jsMatch) throw new Error('Could not find <style>, template or <script> in ' + srcPath);

  // Minimal stand-in for the canvas runtime's base class.
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(p) { Object.assign(this.state, p); }
  }
  const Component = new Function('DCLogic', jsMatch[1] + '\nreturn Component;')(DCLogic);

  function valsFor(lang) {
    const c = new Component({});
    c.state.lang = lang;
    return { vals: c.renderVals(), dict: c.dict() };
  }
  return { src, css: cssMatch[1], template: tplMatch[1], valsFor };
};
