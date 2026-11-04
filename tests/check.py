import re, sys, subprocess
from html.parser import HTMLParser
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
print('bytes', len(s.encode()), 'lines', s.count('\n'))
print('markers left:', re.findall(r'@@\w+@@', s))
css = re.search(r'<style>(.*?)</style>', s, re.S).group(1)
print('css braces open/close:', css.count('{'), css.count('}'), '| {{ in css:', css.count('{{'))
js = re.search(r'data-dc-script[^>]*>(.*?)</script>', s, re.S).group(1)
print('js has {{:', '{{' in js)
open(sys.argv[2], 'w').write(js.replace('DCLogic', 'Object') + '\nnew Component({}).renderVals();')
holes = re.findall(r'\{\{[^}]*\}\}', s)
print('holes:', sorted(set(h.replace(' ', '') for h in holes)))
body = s[s.index('<x-dc>'):s.index('</x-dc>')]
VOID = {'meta','link','br','hr','img','input','source','wbr','col'}
class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.stack=[]; self.errs=[]
    def handle_starttag(self, tag, attrs):
        if tag in VOID: return
        self.stack.append((tag, self.getpos()))
    def handle_startendtag(self, tag, attrs):
        pass
    def handle_endtag(self, tag):
        if tag in VOID: return
        if self.stack and self.stack[-1][0]==tag: self.stack.pop(); return
        self.errs.append(('mismatch', tag, self.getpos(), self.stack[-1] if self.stack else None))
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0]==tag:
                del self.stack[i:]; break
pp = P(); pp.feed(body)
print('html errors:', pp.errs[:8]); print('unclosed:', pp.stack[:8])
print('unquoted attrs:', re.findall(r'<[a-z][^>]*\s[a-zA-Z-]+=[^"\'{\s>][^>]*>', body)[:5])
print('style attrs:', len(re.findall(r'\sstyle="', body)))
