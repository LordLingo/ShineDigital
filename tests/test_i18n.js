const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const js = s.match(/data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
class DCLogic { constructor(p) { this.props = p; this.state = {}; } setState(o) { Object.assign(this.state, o); } }
const Component = new Function('DCLogic', js + '\nreturn Component;')(DCLogic);
const tpl = s.slice(s.indexOf('<div class="s-root"'), s.indexOf('</x-dc>'));
const holes = [...new Set([...tpl.matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g)].map(m => m[1]))];
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
let bad = 0;
for (const lang of ['ro', 'en']) {
  const c = new Component({});
  if (lang === 'en') c.renderVals().setEn();
  const v = c.renderVals();
  const miss = [], blank = [];
  for (const h of holes) {
    if (h === 'true' || h === 'false') continue;
    const val = get(v, h);
    if (val === undefined || val === null) miss.push(h);
    else if (val === '' && !['price.cur', 'price.pcOff', 'waClass', 'msg', 'mailto'].includes(h)) blank.push(h);
  }
  console.log(`[${lang}] lang attr=${v.lang} pressed ro/en=${v.roPressed}/${v.enPressed} | holes=${holes.length} | missing=${JSON.stringify(miss)} | blank=${JSON.stringify(blank)}`);
  bad += miss.length + blank.length;
  console.log(`[${lang}] prices: cur="${v.price.cur}" unit=${v.price.unit} e=${v.price.e} s=${v.price.s} v=${v.price.v} off="${v.price.pcOff}"`);
  console.log(`[${lang}] pkg labels: ${v.t.pkg_essential} | ${v.t.pkg_signature} | ${v.t.pkg_visibility}`);
  console.log(`[${lang}] budget: ${[v.t.bud_none, v.t.bud_1, v.t.bud_2, v.t.bud_3, v.t.bud_4].join(' | ')}`);
  console.log(`[${lang}] faq price: ${v.t.faq_price_a}`);
  console.log(`[${lang}] note: ${v.t.price_note.slice(0, 40)}…`);
  console.log(`[${lang}] motion line: ${v.t.motion_graphics}`);
  console.log(`[${lang}] wa: ${decodeURIComponent(v.waHref.split('?text=')[1])}`);
  // simulate the form submit
  const vals = { pachet: 'signature', companie: 'Nord Auto SRL', domeniu: 'service auto', localitate: 'București', persoana: 'Ion Popescu', email: 'ion@example.ro', telefon: '', buget: 'b2', mesaj: 'Vreau un site / I want a site' };
  const form = { ownerDocument: { getElementById: () => null }, elements: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, { value: x }])) };
  v.submit({ preventDefault() {}, currentTarget: form });
  console.log(`[${lang}] email text:\n${c.state.msg.split('\n').map(l => '    ' + l).join('\n')}`);
  console.log(`[${lang}] mailto subject: ${decodeURIComponent(c.state.mailto.match(/subject=([^&]*)/)[1])}`);
  // pick handler
  const sel = { value: '' };
  v.pick({ currentTarget: { getAttribute: () => 'visibility', ownerDocument: { getElementById: () => sel } } });
  console.log(`[${lang}] pick sets select value = ${sel.value}`);
  console.log(`[${lang}] copy labels: ${v.copyLabel}`);
}
// parity + untranslated check
const c = new Component({}); const d = c.dict();
const rk = Object.keys(d.ro), ek = Object.keys(d.en);
console.log('dict parity:', rk.length === ek.length && rk.every(k => k in d.en) ? 'same keys (' + rk.length + ')' : 'MISMATCH');
const same = rk.filter(k => d.ro[k] === d.en[k]);
console.log('identical RO/EN strings:', JSON.stringify(same));
const usedInTpl = new Set(holes.filter(h => h.startsWith('t.')).map(h => h.slice(2)));
const unused = rk.filter(k => !usedInTpl.has(k) && !js.includes('t.' + k) && !js.includes("t['" + k + "']"));
console.log('dictionary keys used nowhere:', JSON.stringify(unused));
process.exit(bad ? 1 : 0);
