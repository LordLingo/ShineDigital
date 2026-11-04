const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const js = s.match(/data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
class DCLogic { constructor(p) { this.props = p; this.state = {}; } setState(o) { Object.assign(this.state, o); } }
const Component = new Function('DCLogic', js + '\nreturn Component;')(DCLogic);
const c = new Component({});
const v = c.renderVals();
console.log('waHref :', v.waHref);
console.log('waShown:', v.waShown);
console.log('message:', decodeURIComponent(v.waHref.split('?text=')[1]));
console.log('waClass at start:', JSON.stringify(v.waClass), '| other vals still there:', ['toggleMenu','closeMenu','spot','tilt','untilt','pick','submit','copyMsg','copyLabel'].every(k => k in v));

// fake page: viewport 700px tall
const rects = { 'cere-un-site': { top: 3000, bottom: 4500 }, 's-final': { top: 4500, bottom: 5200 } };
let listeners = []; const pending = []; const flush = () => { while (pending.length) pending.shift()(); };
global.window = { innerHeight: 700, requestAnimationFrame: f => { pending.push(f); return pending.length; }, cancelAnimationFrame() {}, addEventListener(t, f) { listeners.push(['w' + t, f]); }, removeEventListener(t, f) { listeners = listeners.filter(x => x[1] !== f); } };
global.document = { documentElement: { clientHeight: 700 }, getElementById: id => rects[id] ? { getBoundingClientRect: () => rects[id] } : null, addEventListener(t, f, o) { listeners.push(['d' + t, f, JSON.stringify(o)]); }, removeEventListener(t, f) { listeners = listeners.filter(x => x[1] !== f); } };
c.componentDidMount(); flush();
console.log('listeners attached:', listeners.map(x => x[0] + (x[2] ? ' ' + x[2] : '')).join(', '));
const q = () => { c._waQueue(); flush(); };
console.log('top of page        -> hidden =', c.state.waHidden, '(want false)');
rects['cere-un-site'] = { top: 560, bottom: 2100 }; rects['s-final'] = { top: 2100, bottom: 2800 }; q();
console.log('form edge near     -> hidden =', c.state.waHidden, '(want true)');
console.log('class when hidden  :', JSON.stringify(c.renderVals().waClass));
rects['cere-un-site'] = { top: 900, bottom: 2400 }; rects['s-final'] = { top: 2400, bottom: 3100 }; q();
console.log('scrolled back up   -> hidden =', c.state.waHidden, '(want false)');
rects['cere-un-site'] = { top: -1800, bottom: -300 }; rects['s-final'] = { top: -300, bottom: 400 }; q();
console.log('final CTA on screen-> hidden =', c.state.waHidden, '(want true)');
delete rects['cere-un-site']; delete rects['s-final']; q();
console.log('ids missing        -> hidden =', c.state.waHidden, '(want false, no crash)');
c.componentWillUnmount();
console.log('listeners after unmount:', listeners.length, '(want 0)');
// number formatting for another number
const alt = new Function('DCLogic', js.replace("'+40760509563'", "'+1 415 555 0100'") + '\nreturn Component;')(DCLogic);
const v2 = new alt({}).renderVals();
console.log('other number       :', v2.waShown, '|', v2.waHref.split('?')[0]);
