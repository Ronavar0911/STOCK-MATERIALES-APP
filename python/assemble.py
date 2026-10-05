import json
D=json.load(open('data.json'))
def enc(T):
    cols,rows=T['cols'],T['rows']; d={}
    for j in range(len(cols)):
        nn=[r[j] for r in rows if r[j] is not None]
        if not nn or not all(isinstance(v,str) for v in nn): continue
        u=list(dict.fromkeys(nn))
        if len(u)<0.6*len(rows):
            idx={v:i for i,v in enumerate(u)}; d[str(j)]=u
            for r in rows:
                if r[j] is not None: r[j]=idx[r[j]]
    return {'cols':cols,'dict':d,'rows':rows}
for k in ['tab','sp','mv','res','ot']: D[k]=enc(D[k])
s=json.dumps(D,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
html=open('app_head.html').read()+'<script id="data" type="application/json">'+s+'</script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n<script id="appjs">\n'+open('app.js').read()+'</script>\n'
open('/tmp/claude-0/-home-claude/4fe076c2-064c-54ce-8657-b214d54719b2/scratchpad/stock_materiales.html','w').write(html)
open('preview.html','w').write('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>'+html+'</body></html>')
print(len(html)/1e6)
