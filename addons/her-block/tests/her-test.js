const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const js = s.match(/data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
class DCLogic { constructor(p) { this.props = p; this.state = {}; } setState(o) { Object.assign(this.state, o); } }
const Component = new Function('DCLogic', js + '\nreturn Component;')(DCLogic);
let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const mk = (h) => class extends Component { host() { return h; } };
const S = {
  empty: { first: 'Ana', name: 'Ana Popescu', photo: '', video: '', poster: '' },
  photo: { first: 'Ana', name: 'Ana Popescu', photo: '/_blob/p1', video: '', poster: '' },
  full:  { first: 'Ana', name: 'Ana Popescu', photo: '/_blob/p1', video: '/_blob/v1', poster: '' },
  fullNoPhoto: { first: 'Ana', name: 'Ana Popescu', photo: '', video: '/_blob/v1', poster: '' },
};
for (const [k, h] of Object.entries(S)) {
  const v = new (mk(h))({}).renderVals();
  const media = [v.host.hasVideo, v.host.photoOnly, v.host.empty].filter(Boolean).length;
  ok(media === 1, `${k}: exactly one media branch active (video=${v.host.hasVideo} photoOnly=${v.host.photoOnly} empty=${v.host.empty})`);
  ok(v.host.hasPhoto !== v.host.noPhoto, `${k}: avatar branches exclusive (photo=${v.host.hasPhoto} noPhoto=${v.host.noPhoto})`);
  ok(v.host.poster === (h.poster || h.photo), `${k}: poster falls back to photo ("${v.host.poster}")`);
}
// the name flows into the transcript and labels, both languages
for (const lang of ['ro', 'en']) {
  const c = new (mk(S.full))({});
  if (lang === 'en') c.renderVals().setEn();
  const v = c.renderVals();
  ok(v.t.hv_tr1.includes('Ana'), `${lang}: transcript line 1 carries her first name -> ${v.t.hv_tr1}`);
  ok(v.t.hv_video_label.includes('Ana'), `${lang}: video label -> ${v.t.hv_video_label}`);
  for (let i = 1; i <= 6; i++) ok(typeof v.t['hv_tr' + i] === 'string' && v.t['hv_tr' + i].length > 10, `${lang}: hv_tr${i} present`);
}
// the transcript is the script Mark was given (RO)
const d = new (mk(S.full))({}).dict();
ok(d.ro.hv_tr2.includes('„Oare nu e o țeapă?”'), 'ro: hook line has the țeapă quote');
ok(/Nu plătești nimic până nu vezi cum arată\./.test(d.ro.hv_tr4), 'ro: "pay nothing until you see it" line');
// play handler
{
  const c = new (mk(S.full))({});
  const v = c.renderVals();
  ok(v.hvClass === '', 'before play: no playing class');
  let played = 0;
  const doc = { getElementById: (id) => id === 's-hv-vid' ? { play() { played++; return Promise.reject(new Error('blocked')); } } : null };
  v.hvPlay({ currentTarget: { ownerDocument: doc } });
  ok(played === 1, 'play() called once on the video element (rejected promise swallowed)');
  ok(c.state.hvPlaying === true && c.renderVals().hvClass === 's-hv-on', 'after play: state and class flip -> ' + c.renderVals().hvClass);
  // no element: must not throw, still flips
  const c2 = new (mk(S.full))({});
  c2.renderVals().hvPlay({ currentTarget: { ownerDocument: { getElementById: () => null } } });
  ok(c2.state.hvPlaying === true, 'no video element: no crash, overlay still hides');
  // language switch keeps the playing state
  c.renderVals().setEn();
  ok(c.state.hvPlaying === true, 'switching language does not reset playback state');
}
// prices
{
  const v = new Component({}).renderVals();
  ok(v.price.v === '1.669' && v.price.e === '949' && v.price.s === '1.189', `RO prices ${v.price.e} / ${v.price.s} / ${v.price.v}`);
  const c = new Component({}); c.renderVals().setEn(); const e = c.renderVals();
  ok(e.price.v === '350' && e.price.cur === '$', `EN prices $${e.price.e} / $${e.price.s} / $${e.price.v}`);
  ok(/\$350/.test(e.t.pkg_visibility) && /\$350/.test(e.t.faq_price_a), 'EN labels and FAQ show $350');
  ok(/1\.669 RON/.test(v.t.pkg_visibility) && /1\.669 RON/.test(v.t.faq_price_a), 'RO labels and FAQ show 1.669 RON');
  ok(!/299|1\.429/.test(JSON.stringify(c.dict())), 'no 299 or 1.429 left anywhere in the dictionary');
}
process.exit(bad ? 1 : 0);
