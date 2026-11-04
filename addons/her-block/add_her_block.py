import re, sys

P = sys.argv[1] if len(sys.argv) > 1 else 'project/Main.dc.html'
s = open(P, encoding='utf-8').read()


def once(old, new):
    global s
    n = s.count(old)
    assert n == 1, ('anchor count %d for: %r' % (n, old[:90]))
    s = s.replace(old, new)



wa_svg = re.search(r'<svg class="s-wa-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">.*?</svg>', s, re.S).group(0)

AV_TOP = '''<sc-if value="{{host.hasPhoto}}" hint-placeholder-val="{{false}}">
<img class="s-hv-av" src="{{host.photo}}" width="40" height="40" alt="">
</sc-if>
<sc-if value="{{host.noPhoto}}" hint-placeholder-val="{{true}}">
<span class="s-hv-av"><i class="s-sp"></i></span>
</sc-if>'''
AV_ID = AV_TOP.replace('width="40" height="40"', 'width="60" height="60"')

SECTION = '''<section class="s-sec s-hv" id="cine-sunt" aria-labelledby="s-h-hv">
<div class="s-wrap s-hv-in">
<div class="s-hv-hd s-rv">
<p class="s-kick">{{t.hv_kick}}</p>
<h2 class="s-h2" id="s-h-hv">{{t.hv_h2}}</h2>
<p class="s-lead">{{t.hv_lead}}</p>
</div>
<figure class="s-hv-fig s-rv">
<div class="s-hv-fr {{hvClass}}">
<sc-if value="{{host.hasVideo}}" hint-placeholder-val="{{false}}">
<video class="s-hv-media" id="s-hv-vid" src="{{host.video}}" poster="{{host.poster}}" controls playsinline preload="none" aria-label="{{t.hv_video_label}}"></video>
</sc-if>
<sc-if value="{{host.photoOnly}}" hint-placeholder-val="{{false}}">
<img class="s-hv-media" src="{{host.photo}}" width="720" height="1280" alt="{{host.name}}">
</sc-if>
<sc-if value="{{host.empty}}" hint-placeholder-val="{{true}}">
<div class="s-hv-ph" aria-hidden="true"><i class="s-sp"></i></div>
<div class="s-hv-play s-hv-play-off" aria-hidden="true"><i class="s-hv-pi"></i></div>
</sc-if>
<div class="s-hv-top" aria-hidden="true">
@@AV_TOP@@
<span class="s-hv-tn"><b>{{host.first}}</b><span>{{t.hv_city}}</span></span>
</div>
<sc-if value="{{host.hasVideo}}" hint-placeholder-val="{{false}}">
<button type="button" class="s-hv-play" onClick="{{ hvPlay }}" aria-label="{{t.hv_play}}"><i class="s-hv-pi" aria-hidden="true"></i></button>
</sc-if>
</div>
<figcaption class="s-hv-cap">{{t.hv_cap}}</figcaption>
</figure>
<div class="s-hv-meta s-rv">
<div class="s-card s-hv-id" onPointerMove="{{ spot }}">
@@AV_ID@@
<div>
<p class="s-hv-nm">{{host.name}}</p>
<p class="s-hv-rl"><span>{{t.hv_role}}</span> · <span>{{t.hv_city}}</span></p>
</div>
</div>
<div class="s-hv-b">
<a class="s-btn s-btn-p" href="{{waHref}}" target="_blank" rel="noopener noreferrer">@@WA@@{{t.hv_wa}}</a>
<a class="s-btn s-btn-g" href="#cere-un-site">{{t.cere_un_site}}</a>
</div>
<p class="s-hv-or">{{t.hv_or}} <a href="{{telHref}}">{{waShown}}</a></p>
<details class="s-q s-hv-tr">
<summary>{{t.hv_tr_sum}}<span class="s-q-i" aria-hidden="true"></span></summary>
<div class="s-q-a">
<p>{{t.hv_tr1}}</p>
<p>{{t.hv_tr2}}</p>
<p>{{t.hv_tr3}}</p>
<p>{{t.hv_tr4}}</p>
<p>{{t.hv_tr5}}</p>
<p>{{t.hv_tr6}}</p>
</div>
</details>
</div>
</div>
</section>
'''
SECTION = SECTION.replace('@@AV_TOP@@', AV_TOP).replace('@@AV_ID@@', AV_ID).replace('@@WA@@', wa_svg)
assert '@@' not in SECTION
anchor = '<section class="s-sec" id="exemple" aria-labelledby="s-h-ex">'
once(anchor, SECTION + anchor)


CSS = '''/* her block: photo, video message, transcript */
.s-hv sc-if{display:contents}
.s-hv-in{display:grid;gap:clamp(32px,5vw,48px);grid-template-areas:"hd" "fig" "meta"}
.s-hv-hd{grid-area:hd;display:grid;gap:18px;justify-items:start}
.s-hv-fig{grid-area:fig;position:relative;isolation:isolate;display:grid;gap:16px;width:min(100%,340px);justify-self:center}
.s-hv-fig::before{content:"";position:absolute;z-index:-1;inset:4% -24% 12%;background:radial-gradient(closest-side,rgba(var(--acc-rgb),.34),transparent 72%);filter:blur(16px);pointer-events:none}
.s-hv-meta{grid-area:meta;display:grid;gap:24px;justify-items:start;min-width:0}
@media(min-width:880px){.s-hv-in{grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr);grid-template-areas:"fig hd" "fig meta";column-gap:clamp(48px,7vw,110px);row-gap:30px;align-items:start}.s-hv-hd{align-self:end}.s-hv-fig{align-self:center;justify-self:start}}
.s-hv-fr{position:relative;width:100%;isolation:isolate;overflow:hidden;aspect-ratio:9/16;border-radius:30px;border:1px solid rgba(var(--acc-rgb),.4);background:radial-gradient(120% 70% at 50% 0%,rgba(var(--acc-rgb),.3),transparent 62%),linear-gradient(170deg,#261840,#171124 58%,#0f0a19);box-shadow:0 40px 90px -34px rgba(var(--acc-rgb),.5),inset 0 1px 0 rgba(255,255,255,.08);transition:transform .5s var(--ease),border-color .4s,box-shadow .5s}
.s-hv-media{position:absolute;inset:0;z-index:0;display:block;width:100%;height:100%;object-fit:cover;background:#000}
.s-hv-ph{position:absolute;inset:0;pointer-events:none}
.s-hv-ph .s-sp{position:absolute;left:50%;top:38%;translate:-50% -50%;width:64%;height:auto;aspect-ratio:1;color:var(--acc);opacity:.1}
.s-hv-top{position:absolute;z-index:3;inset:0 0 auto 0;display:flex;align-items:center;gap:11px;padding:16px 16px 46px;background:linear-gradient(rgba(12,9,19,.8),transparent);pointer-events:none;transition:opacity .4s,visibility .4s}
.s-hv-av{flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;overflow:hidden;color:var(--ink);background:linear-gradient(145deg,var(--acc2),var(--orc));box-shadow:0 0 0 2px rgba(12,9,19,.7),0 0 0 3.5px rgba(var(--acc-rgb),.75)}
img.s-hv-av{display:block;object-fit:cover}
.s-hv-av .s-sp{width:.95rem;height:.95rem}
.s-hv-tn{display:grid;line-height:1.25;min-width:0}
.s-hv-tn b{font-weight:700;font-size:.98rem;overflow-wrap:anywhere}
.s-hv-tn span{font-size:.82rem;color:rgba(243,239,249,.8)}
.s-hv-play{position:absolute;z-index:4;inset:0;display:grid;place-items:center;padding:0;border:0;border-radius:inherit;background:linear-gradient(transparent 40%,rgba(12,9,19,.55));cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:opacity .4s,visibility .4s}
.s-hv-play-off{background:none;cursor:default;pointer-events:none}
.s-hv-pi{position:relative;display:grid;place-items:center;width:84px;height:84px;border-radius:50%;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.38);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 14px 40px -8px rgba(0,0,0,.6),0 0 0 8px rgba(var(--acc-rgb),.12);transition:scale .35s var(--ease),background-color .3s}
.s-hv-pi::before{content:"";width:26px;height:30px;margin-left:5px;background:#fff;clip-path:polygon(0 0,100% 50%,0 100%)}
.s-hv-pi::after{content:"";position:absolute;inset:-10px;border-radius:50%;border:2px solid rgba(var(--acc-rgb),.75);opacity:0;pointer-events:none}
.s-hv-on .s-hv-play,.s-hv-on .s-hv-top{opacity:0;visibility:hidden;pointer-events:none}
.s-hv-cap{text-align:center;color:var(--mut);font-size:.92rem;line-height:1.45;text-wrap:balance}
.s-hv-id{display:flex;align-items:center;gap:16px;width:100%;max-width:460px;padding:16px 20px;border-radius:20px}
.s-hv-id .s-hv-av{width:60px;height:60px}
.s-hv-id .s-hv-av .s-sp{width:1.2rem;height:1.2rem}
.s-hv-nm{font-family:var(--disp);font-weight:700;font-stretch:92%;font-size:1.3rem;letter-spacing:-.02em;line-height:1.15;overflow-wrap:anywhere}
.s-hv-rl{margin-top:3px;color:var(--mut);font-size:.96rem;line-height:1.4}
.s-hv-b{display:flex;flex-wrap:wrap;gap:12px 14px}
.s-hv-b .s-btn-p .s-wa-svg{color:var(--ink)}
@media(max-width:559px){.s-hv-b{width:100%}.s-hv-b .s-btn{width:100%;padding-inline:1.1em}}
.s-hv-or{color:var(--mut)}
.s-root .s-hv-or a{color:var(--fg);font-weight:700;white-space:nowrap;border-bottom:1px solid rgba(var(--acc-rgb),.6);padding-bottom:1px}
.s-hv-tr{width:100%;max-width:62ch}
.s-hv-tr summary{min-height:58px;font-size:1.05rem}
.s-hv-tr .s-q-a{display:grid;gap:10px;max-width:none}
@media(hover:hover){.s-hv-fr:hover{border-color:rgba(var(--acc-rgb),.7);box-shadow:0 50px 100px -30px rgba(var(--acc-rgb),.7),inset 0 1px 0 rgba(255,255,255,.1)}.s-hv-play:hover .s-hv-pi{scale:1.1;background:rgba(var(--acc-rgb),.38)}}
@keyframes s-hv-ring{0%{opacity:.85;scale:.9}100%{opacity:0;scale:1.5}}
@media (prefers-reduced-motion:no-preference){.s-hv-play:not(.s-hv-play-off) .s-hv-pi::after{animation:s-hv-ring 2.4s ease-out infinite}}
@media (hover:hover) and (prefers-reduced-motion:no-preference){.s-hv-fr:hover{transform:translateY(-6px)}}
@media (prefers-reduced-motion:reduce){.s-hv-fr,.s-hv-play,.s-hv-top{transition:none}}
'''
once('.s-f>.s-sel{display:block;font-weight:400;font-size:1rem}', CSS + '.s-f>.s-sel{display:block;font-weight:400;font-size:1rem}')


RO_KEYS = '''      "hv_kick": "Cu cine vorbești",
      "hv_h2": "Cine este în spatele Shine Digital?",
      "hv_lead": "Un om din București, la un mesaj distanță. Îți fac întâi site-ul, ți-l arăt și abia apoi vorbim despre bani.",
      "hv_role": "Fondatoare, Shine Digital",
      "hv_city": "București",
      "hv_play": "Redă mesajul video",
      "hv_cap": "Mesaj video în limba română",
      "hv_wa": "Scrie-mi pe WhatsApp",
      "hv_or": "Sau sună-mă direct:",
      "hv_tr_sum": "Citește ce spun în video",
'''
EN_KEYS = '''      "hv_kick": "Who you’ll talk to",
      "hv_h2": "Who is behind Shine Digital?",
      "hv_lead": "A person from Bucharest, one message away. I build your site first, show it to you, and only then do we talk about money.",
      "hv_role": "Founder, Shine Digital",
      "hv_city": "Bucharest",
      "hv_play": "Play the video message",
      "hv_cap": "Video message in Romanian. English text below.",
      "hv_wa": "Message me on WhatsApp",
      "hv_or": "Or call me directly:",
      "hv_tr_sum": "Read what I say in the video",
'''
ro_wa = '      "motion_graphics": "Motion graphics și animații pentru site",\n'
once(ro_wa, ro_wa + RO_KEYS)
en_wa = '      "motion_graphics": "Motion graphics and animations for your site",\n'
once(en_wa, en_wa + EN_KEYS)

COMPUTED = '''    // Her video message: the transcript below is what she says in the video. Keep them identical.
    ro.hv_video_label = 'Mesaj video de la ' + H.first;
    en.hv_video_label = 'Video message from ' + H.first;
    ro.hv_tr1 = 'Bună! Sunt ' + H.first + ', din București.';
    ro.hv_tr2 = 'Știu ce gândești când primești un mesaj despre un site nou: „Oare nu e o țeapă?”';
    ro.hv_tr3 = 'Așa că fac invers. Fac mai întâi site-ul tău. Complet: cu numele afacerii, cu culorile și textele tale. Apoi ți-l arăt.';
    ro.hv_tr4 = 'Nu plătești nimic până nu vezi cum arată. Dacă nu-ți place, nu datorezi nimic.';
    ro.hv_tr5 = 'Scrie-mi pe WhatsApp numele afacerii tale și începem.';
    ro.hv_tr6 = 'Mulțumesc că m-ai ascultat. Te aștept!';
    en.hv_tr1 = 'Hi! I’m ' + H.first + ', from Bucharest.';
    en.hv_tr2 = 'I know what you think when you get a message about a new website: “Isn’t this a scam?”';
    en.hv_tr3 = 'So I do it the other way around. First I build your website. Complete: with your business name, your colors and your texts. Then I show it to you.';
    en.hv_tr4 = 'You pay nothing until you see how it looks. If you don’t like it, you owe nothing.';
    en.hv_tr5 = 'Message me your business name on WhatsApp and we start.';
    en.hv_tr6 = 'Thank you for listening. I’m waiting for you!';
'''
once("    this._dict = {\n      ro: ro,", COMPUTED + "    this._dict = {\n      ro: ro,")

once("    var usd = function (n) { return grp(n, ','); };\n",
     "    var usd = function (n) { return grp(n, ','); };\n    var H = this.host();\n")


once("waHidden: false, lang: 'ro' };\n  }\n  dict() {", "waHidden: false, lang: 'ro', hvPlaying: false };\n  }\n  dict() {")
HOST = '''  host() {
    // HER DETAILS: change them here and nowhere else.
    // photo: her picture (a /_blob/ url or data: uri). video: her video message (mp4, vertical 9:16, under 10 MB).
    // Leave both empty and the block shows a placeholder.
    return {
      first: '[Prenume]',
      name: '[Prenume Nume]',
      photo: '',
      video: '',
      poster: ''
    };
  }
'''
once("  dict() {\n    if (this._dict) return this._dict;", HOST + "  dict() {\n    if (this._dict) return this._dict;")
once("var ids = ['cere-un-site', 's-final'];", "var ids = ['cine-sunt', 'cere-un-site', 's-final'];")

once("      : WA_NUMBER;\n    return {\n      menuOpen: this.state.menuOpen,",
     "      : WA_NUMBER;\n"
     "    var H = this.host();\n"
     "    var hasVideo = !!H.video;\n"
     "    var hasPhoto = !!H.photo;\n"
     "    return {\n      menuOpen: this.state.menuOpen,")

once("      waClass: this.state.waHidden ? 's-wa-off' : '',\n",
     "      waClass: this.state.waHidden ? 's-wa-off' : '',\n"
     "      telHref: 'tel:' + WA_NUMBER,\n"
     "      host: {\n"
     "        first: H.first,\n"
     "        name: H.name,\n"
     "        photo: H.photo,\n"
     "        video: H.video,\n"
     "        poster: H.poster || H.photo,\n"
     "        hasVideo: hasVideo,\n"
     "        hasPhoto: hasPhoto,\n"
     "        noPhoto: !hasPhoto,\n"
     "        photoOnly: hasPhoto && !hasVideo,\n"
     "        empty: !hasPhoto && !hasVideo\n"
     "      },\n"
     "      hvClass: this.state.hvPlaying ? 's-hv-on' : '',\n")

once("      closeMenu: function () { self.setState({ menuOpen: false }); },\n",
     "      closeMenu: function () { self.setState({ menuOpen: false }); },\n"
     "      hvPlay: function (e) {\n"
     "        try {\n"
     "          var doc = (e && e.currentTarget && e.currentTarget.ownerDocument) || document;\n"
     "          var vid = doc.getElementById('s-hv-vid');\n"
     "          if (vid && vid.play) {\n"
     "            var pr = vid.play();\n"
     "            if (pr && pr.catch) pr.catch(function () {});\n"
     "          }\n"
     "        } catch (err) {}\n"
     "        self.setState({ hvPlaying: true });\n"
     "      },\n")

open(P, 'w', encoding='utf-8').write(s)
print('patched OK, bytes', len(s.encode()))
