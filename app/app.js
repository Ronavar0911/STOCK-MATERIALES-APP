(function(){
"use strict";
const $=s=>document.querySelector(s);
const RESET_CSS=(document.head.querySelector('style')||{}).textContent||'';
const SHELL=$('#shell'), CSS_EL=$('#css'), APP_EL=document.getElementById('appjs');
const LINKS=[...document.querySelectorAll('link[href*="fonts.googleapis"]')].map(l=>l.outerHTML).join('');
$('#app').appendChild(SHELL.content.cloneNode(true));

/* ================= datos ================= */
let RAW=JSON.parse(document.getElementById('data').textContent);
function decode(T){if(!T)return [];const d=T.dict||{};return T.rows.map(r=>{const o={};T.cols.forEach((c,j)=>{let v=r[j];if(d[j]!==undefined&&v!==null&&v!==undefined)v=d[j][v];o[c]=v===undefined?null:v;});return o;});}
let D={};
function load(raw){D={meta:raw.meta,tab:decode(raw.tab),sp:decode(raw.sp),mv:decode(raw.mv),res:decode(raw.res),ot:decode(raw.ot)};
  D.byMat={};D.tab.forEach(t=>D.byMat[t.Material]=t);
  D.price=m=>{const t=D.byMat[m];return t&&t.Precio_unit>0?t.Precio_unit:0;};}
load(RAW);

/* ================= utilidades ================= */
const nf=new Intl.NumberFormat('es-PE',{maximumFractionDigits:1});
const nf0=new Intl.NumberFormat('es-PE',{maximumFractionDigits:0});
const pen=new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN',maximumFractionDigits:0});
const penC=new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN',notation:'compact',maximumFractionDigits:1});
const num=v=>v===null||v===undefined||v===''?'':(Math.abs(v)>=100?nf0:nf).format(v);
const money=v=>v?(Math.abs(v)>=1e5?penC:pen).format(v):'';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fdate=s=>s?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(2,4):'';
const z=v=>+v||0;
const days=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const SINP='<span class="og fal" title="Material sin precio en MB52 ni en MB51">sin precio</span>';
const EST=[['Quiebre','Sin stock y nada pedido','q','--bad'],['Pedir','Bajo mínimo, falta pedir','pd','--bad'],['En camino','Bajo mínimo, ya pedido','ec','--pen'],['OK','Entre mínimo y máximo','ok','--ok'],['Sobrestock','Más de 1,5 × máximo','sob','--fp']];
const ESTC={Quiebre:'var(--bad)',Pedir:'color-mix(in srgb,var(--bad) 60%,var(--pen))','En camino':'var(--pen)',OK:'var(--ok)',Sobrestock:'var(--fp)','Sin mínimo':'var(--mut)'};
const DEM=[['Regular','18 meses o más con consumo','--ac'],['Intermitente','6 a 17 meses con consumo','--fp'],['Esporádico','menos de 6 meses','--pen'],['Puntual','consumo en una sola temporada','--ad'],['Inactivo','más de 12 meses sin consumo','--mut'],['Sin consumo','sin historial','--bd']];
const DEMC=Object.fromEntries(DEM.map(d=>[d[0],d[2]]));
const pill=e=>{const m={Quiebre:'q',Pedir:'pd','En camino':'ec',OK:'ok',Sobrestock:'sob'};return `<span class="og ${m[e]||'nod'}">${esc(e)}</span>`;};
const SPC={'1':'fal','2':'cam','3':'adel','4':'ok','5':'nod'};
const spill=e=>`<span class="og ${SPC[String(e)[0]]||'nod'}">${esc(String(e).slice(2))}</span>`;
const dem=d=>`<span class="dem" style="--dc:var(${DEMC[d]||'--mut'})">${esc(d)}</span>`;
const clsPill=c=>c?`<span class="og ${({OM01:'om1',OM03:'om3',OM02:'om2',OM04:'om4'})[c]||'nod'}">${esc(c)}</span>`:'<span class="og nod">Sin OT</span>';
const K=(t,v,s,c,attr)=>`<${attr?'button type="button"':'div'} class="k" ${c?`style="border-left-color:var(${c})"`:''} ${attr||''} title="${esc(t+': '+String(v).replace(/<[^>]+>/g,'')+(s?' · '+s:''))}"><small>${esc(t)}</small><b>${v}</b><span>${esc(s||'')}</span></${attr?'button':'div'}>`;
const SEC=(titulo,der,cls,inner)=>`<div class="ksec ${cls||''}"><div class="kh"><b>${titulo}</b><span>${der||''}</span></div>${inner}</div>`;
function status(msg,err){const s=$('#status');s.textContent=msg||'';s.classList.toggle('err',!!err);}
let store={};try{store=JSON.parse(localStorage.getItem('stockapp')||'{}')}catch(e){}
function remember(k,v){store[k]=v;try{localStorage.setItem('stockapp',JSON.stringify(store))}catch(e){}}
const sumBy=(arr,key,val)=>{const g=new Map();arr.forEach(o=>{const k=key(o);if(k===null||k===undefined||k==='')return;g.set(k,(g.get(k)||0)+val(o));});return [...g.entries()];};
const opts=(list,sel,all)=>(all!==null?`<option value="">${esc(all)}</option>`:'')+list.map(x=>{const v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;return `<option value="${esc(v)}" ${sel===v?'selected':''}>${esc(l)}</option>`;}).join('');

/* tooltip */
const tip=$('#tip');
document.addEventListener('mousemove',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(!t){tip.hidden=true;return;}
  tip.innerHTML=t.dataset.tip;tip.hidden=false;const w=tip.offsetWidth,h=tip.offsetHeight;
  tip.style.left=Math.min(innerWidth-w-8,e.clientX+12)+'px';tip.style.top=Math.max(8,e.clientY-h-10)+'px';});

/* gráficos */
function hbars(rows,opt){opt=opt||{};const mx=Math.max(1,...rows.map(r=>r.v));
  return `<div class="hb">${rows.map(r=>`<div class="r ${opt.click?'click':''}" ${r.key!=null?`data-key="${esc(r.key)}"`:''} data-tip="${esc(r.tip||(esc(r.n)+'<br>'+(opt.fmt||num)(r.v)))}"><span class="n">${esc(r.n)}</span><span class="t"><i style="width:${(r.v/mx*100).toFixed(1)}%;${r.c?`background:${r.c}`:''}"></i></span><span class="x">${(opt.fmt||num)(r.v)}</span></div>`).join('')||'<div class="mut">Sin datos.</div>'}</div>`;}
function columns(rows,opt){opt=opt||{};const W=opt.W||640,H=opt.H||200,pl=52,pb=22,pt=8;const n=rows.length||1;const mx=Math.max(1,...rows.map(r=>r.v));
  const nice=v=>{const p=Math.pow(10,Math.floor(Math.log10(v)));const f=v/p;return (f<=1?1:f<=2?2:f<=5?5:10)*p;};const top=nice(mx);
  const bw=(W-pl)/n;let g='';for(let i=0;i<=4;i++){const y=pt+(H-pb-pt)*(1-i/4);g+=`<line class="g" x1="${pl}" x2="${W}" y1="${y}" y2="${y}"/><text x="${pl-6}" y="${y+4}" text-anchor="end">${(opt.axis||(v=>penC.format(v)))(top*i/4)}</text>`;}
  const every=Math.ceil(n/14);
  const bars=rows.map((r,i)=>{const h=(H-pb-pt)*r.v/top;const x=pl+i*bw+bw*.15,w=Math.max(2,bw*.7);const y=H-pb-h;
    return `<g data-tip="${esc(r.tip)}"><rect class="hit" x="${pl+i*bw}" y="${pt}" width="${bw}" height="${H-pb-pt}"/>${h>0?`<rect class="m ${r.cur?'cur':''}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(3,w/2)}"/>`:''}</g>`+(i%every===0?`<text x="${x+w/2}" y="${H-6}" text-anchor="middle">${esc(r.lab)}</text>`:'');}).join('');
  return `<svg class="col" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label||'')}">${g}${bars}</svg>`;}
function dist(parts,attr){const tot=parts.reduce((a,p)=>a+p.v,0)||1;
  return `<div class="dist">${parts.filter(p=>p.v>0).map(p=>`<i style="flex:${p.v/tot};background:${p.c}" data-tip="${esc(p.n)}: ${nf0.format(p.v)} (${Math.round(p.v/tot*100)}%)" ${attr(p)}></i>`).join('')}</div>`;}

/* ================= temporada y semanas ================= */
function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day+3);const y=t.getUTCFullYear();const f=new Date(Date.UTC(y,0,4));return 1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7);}
function seasonWeeks(){const ini=new Date(D.meta.inicio_temporada+'T00:00:00');const y=ini.getFullYear()+1;const j=new Date(y,0,4);const fin=new Date(y,0,4-((j.getDay()+6)%7)+182);
  const out=[];for(let d=new Date(ini);d<fin;d=new Date(d.getTime()+6048e5)){out.push({ini:new Date(d),iso:isoWeek(d)});}return out;}
const fd=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
const isoD=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
let WK=null; /* índice de semana seleccionada dentro de la temporada */
function curIdx(){const ws=seasonWeeks();const now=new Date();let i=ws.findIndex((w,k)=>now>=w.ini&&(k===ws.length-1||now<ws[k+1].ini));return i<0?ws.length-1:i;}
function weekRange(i){const ws=seasonWeeks();const a=ws[i].ini;const b=new Date(a.getTime()+6*864e5);return {a,b,ia:isoD(a),ib:isoD(b),iso:ws[i].iso};}
function defIdx(){const ws=seasonWeeks();const c=curIdx();const last=D.mv.filter(m=>m.Grupo==='Consumo').reduce((a,m)=>m['Fe.contabilización']>a?m['Fe.contabilización']:a,'');if(!last)return c;const k=Math.floor((new Date(last+'T00:00:00')-ws[0].ini)/6048e5);return Math.max(0,Math.min(c,k));}
function wkCard(){const ws=seasonWeeks();if(WK===null||WK>=ws.length)WK=defIdx();const cur=curIdx();const r=weekRange(WK);
  const gw=new Array(ws.length).fill(0);D.mv.forEach(m=>{if(m.Grupo!=='Consumo'||!m['Fe.contabilización'])return;const d=new Date(m['Fe.contabilización']+'T00:00:00');const k=Math.floor((d-ws[0].ini)/6048e5);if(k>=0&&k<ws.length)gw[k]+=z(m.Costo_consumo);});
  const tag=WK===cur?'<span class="rl now">Semana actual</span>':WK<cur?`<span class="rl">Hace ${cur-WK} sem.</span>`:`<span class="rl fut">En ${WK-cur} sem.</span>`;
  const tmp=D.meta.temporada.replace(/20(\d\d)\/20(\d\d)/,'$1-$2');
  $('#wkcard').innerHTML=`<div><small>SEMANA SELECCIONADA</small><div class="big"><button type="button" id="wkp" aria-label="Semana anterior">‹</button><b>${r.iso}</b><button type="button" id="wkn" aria-label="Semana siguiente">›</button></div>
    <span class="fechas"><span class="dr">${fd(r.a)} – ${fd(r.b)}</span>${tag}<span class="cm">Campaña ${tmp}</span></span></div>
    <div><div class="strip">${ws.map((w,i)=>`<button type="button" data-w="${i}" class="${i===WK?'cur':i<cur&&gw[i]>0?'ok':i<=cur?'':''} ${i===cur&&i!==WK?'td':''}" data-tip="Semana ${w.iso} · ${fd(w.ini)}<br>${i<=cur?'Gasto en consumo: '+pen.format(gw[i]):'Semana futura'}">${w.iso}</button>`).join('')}</div>
    <div class="lg"><span><i style="background:color-mix(in srgb,var(--ok) 25%,var(--card));border:1px solid var(--bd)"></i>Con consumo registrado</span><span><i style="background:var(--bg);border:1px solid var(--bd)"></i>Sin movimientos / futura</span><span><i style="background:var(--ac)"></i>Semana seleccionada</span><span><i style="outline:2px solid var(--fp);outline-offset:-2px"></i>Hoy</span><span>Clic en una semana para verla en «Consumo y gasto»</span></div></div>`;
  $('#wkp').onclick=()=>{if(WK>0){WK--;wkCard();refreshWeekViews();}};$('#wkn').onclick=()=>{if(WK<ws.length-1){WK++;wkCard();refreshWeekViews();}};
  $('#wkcard').querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{WK=+b.dataset.w;wkCard();refreshWeekViews();});}
function refreshWeekViews(){if(CURTAB==='mov')vMov();}

function header(){$('#tSrc').textContent=`${D.meta.fuente||''} · temporada ${D.meta.temporada} desde ${fdate(D.meta.inicio_temporada)} · ${nf0.format(D.tab.length)} materiales`;
  $('#n-stock').textContent=nf0.format(D.tab.filter(t=>t.Estado==='Quiebre'||t.Estado==='Pedir').length);
  $('#n-solped').textContent=nf0.format(D.sp.filter(s=>s.Material&&/^[123]/.test(s.Estado)).length);
  $('#n-mov').textContent=penC.format(D.mv.reduce((a,m)=>a+z(m.Costo_consumo),0));
  $('#n-eq').textContent=nf0.format(new Set(D.ot.filter(o=>o.Equipo_riego==='Sí').map(o=>o.Equipo)).size);
  $('#n-res').textContent=nf0.format(new Set(D.res.map(r=>r.Orden).filter(Boolean)).size);
  wkCard();}

/* ================= tabla ================= */
function makeTable(host,cols,rows,opt){opt=opt||{};let sort=opt.sort||null,limit=opt.limit||200;const open=new Set();const fix=opt.fix||0;
  function draw(){let r=rows.slice();if(sort){const c=cols.find(x=>x.k===sort.k);const g=c.v||(o=>o[c.k]);
      r.sort((a,b)=>{let x=g(a),y=g(b);if(x===null||x===undefined||x==='')return 1;if(y===null||y===undefined||y==='')return -1;
        return (typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'es'))*(sort.d==='asc'?1:-1);});}
    const head='<tr>'+cols.map((c,j)=>`<th class="${c.num?'n':''} ${j<fix?'sl':''}" data-k="${c.k}" ${c.tip?`title="${esc(c.tip)}"`:''} ${sort&&sort.k===c.k?`data-dir="${sort.d}"`:''}>${esc(c.h)}</th>`).join('')+'</tr>';
    const body=r.slice(0,limit).map(o=>{const i=rows.indexOf(o);return `<tr class="row" tabindex="0" data-i="${i}">`+cols.map((c,j)=>`<td class="${c.cls||''}${c.num?' n':''}${j<fix?' sl':''}">${c.f?c.f(o):esc(o[c.k])}</td>`).join('')+'</tr>'+
      (opt.sub&&open.has(i)?`<tr class="sub"><td colspan="${cols.length}">${opt.sub(o)}</td></tr>`:'');}).join('');
    host.innerHTML=`<div class="gw"><table><thead>${head}</thead><tbody>${body||`<tr><td colspan="${cols.length}" class="mut">Ningún registro con estos filtros.</td></tr>`}</tbody></table></div>`+
      `<div class="more"><span>${nf0.format(r.length)} ${opt.unit||'registros'}${r.length>limit?` · mostrando ${nf0.format(limit)}`:''}</span>${r.length>limit?`<button class="btn2" type="button">Mostrar ${Math.min(200,r.length-limit)} más</button>`:''}</div>`;
    if(fix){const ths=[...host.querySelectorAll('thead th')];let left=0;const L=[];for(let j=0;j<fix;j++){L.push(left);left+=ths[j].offsetWidth;}
      host.querySelectorAll('tr').forEach(tr=>{[...tr.children].slice(0,fix).forEach((c,j)=>{if(c.colSpan===1)c.style.left=L[j]+'px';});});}
    host.querySelectorAll('thead th').forEach(th=>th.onclick=()=>{const k=th.dataset.k;sort=sort&&sort.k===k?{k,d:sort.d==='asc'?'desc':'asc'}:{k,d:cols.find(c=>c.k===k).num?'desc':'asc'};draw();});
    const mb=host.querySelector('.more button');if(mb)mb.onclick=()=>{limit+=200;draw();};
    host.querySelectorAll('tbody tr.row').forEach(tr=>{const i=+tr.dataset.i;const go=()=>{if(opt.sub){open.has(i)?open.delete(i):open.add(i);draw();}else if(opt.onRow)opt.onRow(rows[i]);};
      tr.onclick=go;tr.onkeydown=e=>{if(e.key==='Enter')go();};});}
  draw();}
const clearBtn='<div class="act"><button class="btn2" type="button" data-clear>Limpiar filtros</button></div>';

/* ================= STOCK ================= */
const SF={estado:store.estado??'_atencion',tipo:'',q:'',ot:'',alm:''};
const RANK={'Quiebre':0,'Pedir':1,'En camino':2,'OK':3,'Sobrestock':4,'Sin mínimo':5};
function vStock(){const v=$('#v-stock');
  const cnt={},dc={};D.tab.forEach(t=>{cnt[t.Estado]=(cnt[t.Estado]||0)+1;dc[t.Tipo_demanda]=(dc[t.Tipo_demanda]||0)+1;});
  const need=(cnt.Quiebre||0)+(cnt.Pedir||0);
  const inv=D.tab.reduce((a,t)=>a+z(t.Cant_sugerida_pedir)*D.price(t.Material),0);
  const sinP=D.tab.filter(t=>z(t.Cant_sugerida_pedir)>0&&!D.price(t.Material)).length;
  const val=D.tab.reduce((a,t)=>a+z(t.Valor_stock),0);
  const conMin=EST.reduce((a,e)=>a+(cnt[e[0]]||0),0);
  const alms=[...new Set(D.tab.flatMap(t=>(t.Almacenes_con_stock||'').split(' / ').filter(Boolean)))].sort();
  v.innerHTML=SEC('ESTADO ACTUAL DEL STOCK','stock de hoy (MB52) frente al mínimo sugerido','wkk',`<div class="kp k6">
      ${K('Requieren pedido',nf0.format(need),'quiebre + bajo mínimo sin pedir','--bad','data-e="_atencion"')}
      ${K('Quiebre',nf0.format(cnt.Quiebre||0),'sin stock y nada pedido','--bad','data-e="Quiebre"')}
      ${K('Pedir',nf0.format(cnt.Pedir||0),'bajo mínimo, falta pedir','--bad','data-e="Pedir"')}
      ${K('En camino',nf0.format(cnt['En camino']||0),'bajo mínimo, ya pedido','--pen','data-e="En camino"')}
      ${K('OK',nf0.format(cnt.OK||0),'entre mínimo y máximo','--ok','data-e="OK"')}
      ${K('Sobrestock',nf0.format(cnt.Sobrestock||0),'más de 1,5 × máximo','--fp','data-e="Sobrestock"')}</div>`)+
    SEC('VALORES Y BASE HISTÓRICA','36 meses de consumo (temporadas 23/24 a 25/26)','',`<div class="kp">
      ${K('Inversión para reponer',penC.format(inv),sinP?`${sinP} materiales sin precio no suman`:'cantidad sugerida × precio',sinP?'--bad':'--ac')}
      ${K('Valor del stock libre',penC.format(val),'todos los almacenes salvo 1030','--ac')}
      ${K('Materiales con mínimo',nf0.format(conMin),'demanda regular o intermitente, o crítico','--fp')}
      ${K('Sin mínimo automático',nf0.format(cnt['Sin mínimo']||0),'esporádico, puntual, inactivo o sin consumo','--mut','data-e="Sin mínimo"')}</div>`)+
    `<div class="half"><div class="card"><h2>Estado frente al mínimo <small>${nf0.format(conMin)} materiales con mínimo</small></h2>
      ${dist(EST.map(e=>({n:e[0],v:cnt[e[0]]||0,c:ESTC[e[0]]})),p=>`data-e="${p.n}"`)}
      <div class="lg2">${EST.map(e=>`<button type="button" data-e="${e[0]}" title="${e[1]}"><i class="dot" style="background:${ESTC[e[0]]}"></i>${e[0]}<b>${nf0.format(cnt[e[0]]||0)}</b></button>`).join('')}</div></div>
    <div class="card"><h2>Tipo de demanda <small>${nf0.format(D.tab.length)} materiales</small></h2>
      ${dist(DEM.map(d=>({n:d[0],v:dc[d[0]]||0,c:`var(${d[2]})`})),p=>`data-t="${p.n}"`)}
      <div class="lg2">${DEM.map(d=>`<button type="button" data-t="${d[0]}" title="${d[1]}"><i class="dot" style="background:var(${d[2]})"></i>${d[0]}<b>${nf0.format(dc[d[0]]||0)}</b></button>`).join('')}</div></div></div>
    <div class="card"><div class="pc">
      <label class="sq">Buscar<input type="search" id="sq" placeholder="Código o descripción…" value="${esc(SF.q)}"></label>
      <label>Estado<select id="sest">${opts([['_atencion','Requieren pedido'],...EST.map(e=>e[0]),'Sin mínimo'],SF.estado,'Todos')}</select></label>
      <label>Tipo de demanda<select id="stipo">${opts(DEM.map(d=>d[0]),SF.tipo,'Todos')}</select></label>
      <label>Reserva en OT<select id="sot">${opts([['OM01','Correctiva OM01'],['OM03','Preventiva OM03']],SF.ot,'Con o sin reserva')}</select></label>
      <label>Almacén con stock<select id="salm">${opts(alms,SF.alm,'Todos')}</select></label></div>
      <div class="mut" style="margin-top:8px">Mínimo = promedio mensual ajustado × ${D.meta.params?.MesesMin??2} meses (solo demanda Regular e Intermitente) o el mínimo manual de críticos, el mayor. Toca un material para ver su ficha.</div></div>
    <div id="stbl"></div>`;
  const sync=()=>{v.querySelectorAll('[data-e]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.e===SF.estado)));v.querySelectorAll('[data-t]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.t===SF.tipo)));$('#sest').value=SF.estado;$('#stipo').value=SF.tipo;};
  v.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{SF.estado=SF.estado===b.dataset.e?'':b.dataset.e;remember('estado',SF.estado);sync();stockTable();});
  v.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{SF.tipo=SF.tipo===b.dataset.t?'':b.dataset.t;sync();stockTable();});
  $('#sq').oninput=e=>{SF.q=e.target.value;stockTable();};$('#sot').onchange=e=>{SF.ot=e.target.value;stockTable();};$('#salm').onchange=e=>{SF.alm=e.target.value;stockTable();};
  $('#sest').onchange=e=>{SF.estado=e.target.value;remember('estado',SF.estado);sync();stockTable();};$('#stipo').onchange=e=>{SF.tipo=e.target.value;sync();stockTable();};
  sync();stockTable();}
function stockTable(){const q=SF.q.trim().toLowerCase();
  const rows=D.tab.filter(t=>(!SF.estado||(SF.estado==='_atencion'?(t.Estado==='Quiebre'||t.Estado==='Pedir'):t.Estado===SF.estado))
    &&(!SF.tipo||t.Tipo_demanda===SF.tipo)&&(!SF.ot||z(t['Reservado_'+SF.ot])>0)&&(!SF.alm||(t.Almacenes_con_stock||'').includes(SF.alm))
    &&(!q||String(t.Material).toLowerCase().includes(q)||String(t.Descripcion||'').toLowerCase().includes(q)));
  makeTable($('#stbl'),[
    {k:'Material',h:'Material',cls:'code'},{k:'Descripcion',h:'Descripción',cls:'w',f:o=>`<span title="${esc(o.Descripcion)}">${esc(o.Descripcion)}</span>`},
    {k:'Estado',h:'Estado',f:o=>pill(o.Estado),v:o=>RANK[o.Estado]},{k:'UM',h:'UM'},
    {k:'Stock',h:'Stock',num:1,f:o=>num(o.Stock)},
    {k:'Minimo',h:'Mínimo',num:1,f:o=>num(o.Minimo)+(z(o.Minimo_manual)>0?' <span class="og man" title="Mínimo manual de críticos">manual</span>':'')},
    {k:'Maximo',h:'Máximo',num:1,f:o=>num(o.Maximo)},
    {k:'Cobertura_meses',h:'Cobertura (meses)',num:1,tip:'Meses que dura el stock al ritmo del promedio mensual ajustado',f:o=>o.Cobertura_meses==null?'':nf.format(o.Cobertura_meses)},
    {k:'Pend_en_transito',h:'OC en tránsito',num:1,f:o=>num(o.Pend_en_transito||null)},
    {k:'Pend_sin_OC',h:'SOLPED sin OC',num:1,f:o=>num(o.Pend_sin_OC||null)},
    {k:'Cant_sugerida_pedir',h:'Sugerido pedir',num:1,f:o=>o.Cant_sugerida_pedir>0?`<b>${num(o.Cant_sugerida_pedir)}</b>`:''},
    {k:'Costo_pedir',h:'Costo est. (S/)',num:1,v:o=>z(o.Cant_sugerida_pedir)*D.price(o.Material),f:o=>z(o.Cant_sugerida_pedir)>0?(D.price(o.Material)?money(z(o.Cant_sugerida_pedir)*D.price(o.Material)):SINP):''},
    {k:'Cons_temporada_actual',h:'Consumo temp.',num:1,f:o=>num(o.Cons_temporada_actual||null)},
    {k:'Prom_mensual_ajustado',h:'Prom. mes aj.',num:1,f:o=>num(o.Prom_mensual_ajustado||null)},
    {k:'Tipo_demanda',h:'Demanda',f:o=>dem(o.Tipo_demanda)},
  ],rows,{sort:{k:'Estado',d:'asc'},onRow:o=>openSheet(o.Material),unit:'materiales',fix:2});}

/* ================= SOLPED ================= */
const PF={estado:'_abiertas',q:'',sol:'',dias:'',tipo:'mat'};
const spScope=()=>D.sp.filter(s=>PF.tipo==='mat'?!!s.Material:PF.tipo==='srv'?!s.Material:true);
const isOpen=s=>/^[123]/.test(s.Estado);
const ageCls=d=>d>60?'a3':d>30?'a2':'a1';
function vSolped(){const v=$('#v-solped');const SP=spScope();const cnt={};SP.forEach(s=>cnt[s.Estado]=(cnt[s.Estado]||0)+1);
  const open=SP.filter(isOpen);const valOpen=open.reduce((a,s)=>a+z(s['Valor total']),0);
  const rec=SP.filter(s=>s.Estado==='4 Recibido'&&s.Fecha_recepcion&&s['Fecha de solicitud']).map(s=>days(s['Fecha de solicitud'],s.Fecha_recepcion)).filter(d=>d>=0);
  const avgRec=rec.length?rec.reduce((a,b)=>a+b,0)/rec.length:null;const old=open.filter(s=>z(s.Dias_desde_solicitud)>60).length;
  const sols=[...new Set(SP.map(s=>s.Solicitante).filter(Boolean))].sort();
  const buckets=[['0–15 días',0,15],['16–30',16,30],['31–60',31,60],['61–90',61,90],['Más de 90',91,1e9]].map(b=>({lab:b[0],v:open.filter(s=>z(s.Dias_desde_solicitud)>=b[1]&&z(s.Dias_desde_solicitud)<=b[2]).length}));
  const topSol=sumBy(SP,s=>s.Solicitante,()=>1).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const tl=PF.tipo==='mat'?'solo materiales':PF.tipo==='srv'?'solo servicios':'materiales y servicios';
  v.innerHTML=SEC('FLUJO DE LAS SOLPED',`${tl} · export ME5A`,'wkk',`<div class="kp k6">
      ${K('Abiertas',nf0.format(open.length),'pasos 1 a 3','--pen','data-e="_abiertas"')}
      ${K('1 · Solicitado sin OC',nf0.format(cnt['1 Solicitado sin OC']||0),'falta orden de compra','--bad','data-e="1 Solicitado sin OC"')}
      ${K('2 · OC en tránsito',nf0.format(cnt['2 OC en tránsito']||0),'con OC, sin entrada 101','--pen','data-e="2 OC en tránsito"')}
      ${K('3 · Recibido parcial',nf0.format(cnt['3 Recibido parcial']||0),'llegó una parte','--fp','data-e="3 Recibido parcial"')}
      ${K('4 · Recibido',nf0.format(cnt['4 Recibido']||0),'entrada 101 completa','--ok','data-e="4 Recibido"')}
      ${K('Servicios con OC',nf0.format(D.sp.filter(x=>x.Estado==='5 Servicio con OC').length),'no pasan por MB51','--mut','data-e="5 Servicio con OC"')}</div>`)+
    SEC('TIEMPOS Y VALOR','todo el export','',`<div class="kp">
      ${K('Valor de lo abierto',penC.format(valOpen),'valor total de pasos 1 a 3','--ac')}
      ${K('Tiempo hasta recibir',avgRec===null?'—':nf0.format(avgRec)+' días','promedio SOLPED → entrada 101','--fp')}
      ${K('Abiertas > 60 días',nf0.format(old),'requieren seguimiento',old?'--bad':'--ok')}
      ${K('Posiciones',nf0.format(SP.length),tl,'--mut')}</div>`)+
    `<div class="half"><div class="card"><h2>Antigüedad de lo abierto <small>posiciones por días desde la SOLPED</small></h2>${columns(buckets.map(b=>({lab:b.lab,v:b.v,tip:`${b.lab}: ${nf0.format(b.v)} posiciones`})),{axis:v=>nf0.format(v),label:'Antigüedad'})}</div>
    <div class="card"><h2>Solicitantes más frecuentes <small>posiciones, top 10 · toca para filtrar</small></h2>${hbars(topSol.map(([n,c])=>({n,v:c,key:n,tip:`${esc(n)}: ${nf0.format(c)} posiciones · ${nf0.format(open.filter(s=>s.Solicitante===n).length)} abiertas`})),{click:1,fmt:v=>nf0.format(v)})}</div></div>
    <div class="card"><div class="pc">
      <label class="sq">Buscar<input type="search" id="pq" placeholder="Material, texto, SOLPED o pedido…" value="${esc(PF.q)}"></label>
      <label>Tipo de posición<select id="ptipo">${opts([['mat','Solo materiales'],['srv','Solo servicios']],PF.tipo,'Materiales y servicios')}</select></label>
      <label>Solicitante<select id="psol">${opts(sols,PF.sol,'Todos')}</select></label>
      <label>Antigüedad<select id="pdias">${opts([15,30,60,90].map(d=>[String(d),'Abiertas hace más de '+d+' días']),PF.dias,'Cualquiera')}</select></label>
      ${clearBtn}</div>
      <div class="mut" style="margin-top:8px"><b>Días abierta</b>: días desde la SOLPED hasta hoy, solo para lo pendiente (verde hasta 30, ámbar hasta 60, rojo después). <b>Días a recepción</b>: lo que tardó en llegar lo ya recibido.</div></div>
    <div id="ptbl"></div>`;
  const sync=()=>v.querySelectorAll('[data-e]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.e===PF.estado)));
  v.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{PF.estado=PF.estado===b.dataset.e?'':b.dataset.e;if(b.dataset.e==='5 Servicio con OC'&&PF.tipo==='mat'){PF.tipo='';vSolped();return;}sync();spTable();});
  v.querySelectorAll('.hb .r[data-key]').forEach(r=>r.onclick=()=>{PF.sol=r.dataset.key;$('#psol').value=PF.sol;spTable();});
  $('#ptipo').onchange=e=>{PF.tipo=e.target.value;vSolped();};$('#pq').oninput=e=>{PF.q=e.target.value;spTable();};$('#psol').onchange=e=>{PF.sol=e.target.value;spTable();};$('#pdias').onchange=e=>{PF.dias=e.target.value;spTable();};
  v.querySelector('[data-clear]').onclick=()=>{Object.assign(PF,{estado:'',q:'',sol:'',dias:'',tipo:''});vSolped();};
  sync();spTable();}
function spTable(){const q=PF.q.trim().toLowerCase();
  const rows=spScope().filter(s=>(!PF.estado||(PF.estado==='_abiertas'?isOpen(s):s.Estado===PF.estado))&&(!PF.sol||s.Solicitante===PF.sol)&&(!PF.dias||(isOpen(s)&&z(s.Dias_desde_solicitud)>+PF.dias))
    &&(!q||[s.Material,s['Texto breve'],s['Solicitud de pedido'],s.Pedido].some(x=>String(x??'').toLowerCase().includes(q))));
  makeTable($('#ptbl'),[
    {k:'Solicitud de pedido',h:'SOLPED',cls:'code',f:o=>esc(o['Solicitud de pedido'])+'<span class="mut">/'+esc(o['Pos.solicitud pedido'])+'</span>'},
    {k:'Texto breve',h:'Texto',cls:'w',f:o=>`<span title="${esc(o['Texto breve'])}">${esc(o['Texto breve'])}</span>`},
    {k:'Estado',h:'Estado',f:o=>spill(o.Estado)},
    {k:'Fecha de solicitud',h:'Fecha SOLPED',f:o=>fdate(o['Fecha de solicitud'])},
    {k:'Dias_abierta',h:'Días abierta',num:1,tip:'Días desde la SOLPED hasta hoy (solo lo pendiente)',v:o=>isOpen(o)?z(o.Dias_desde_solicitud):null,f:o=>isOpen(o)?`<span class="age ${ageCls(z(o.Dias_desde_solicitud))}">${o.Dias_desde_solicitud}</span>`:''},
    {k:'Dias_rec',h:'Días a recepción',num:1,tip:'Días entre la SOLPED y la entrada 101',v:o=>o.Fecha_recepcion&&o['Fecha de solicitud']?days(o['Fecha de solicitud'],o.Fecha_recepcion):null,f:o=>o.Fecha_recepcion&&o['Fecha de solicitud']?days(o['Fecha de solicitud'],o.Fecha_recepcion):''},
    {k:'Material',h:'Material',cls:'code'},
    {k:'Cantidad solicitada',h:'Solicitado',num:1,f:o=>num(o['Cantidad solicitada'])+' '+esc(o['Unidad de medida']||'')},
    {k:'Pedido',h:'Pedido (OC)',cls:'code'},
    {k:'Cant_recibida',h:'Recibido',num:1,f:o=>num(o.Cant_recibida||null)},
    {k:'Pendiente_llegar',h:'Pendiente',num:1,f:o=>num(o.Pendiente_llegar||null)},
    {k:'Valor total',h:'Valor (S/)',num:1,f:o=>money(o['Valor total'])},
    {k:'Nombre de proveedor',h:'Proveedor',cls:'w'},{k:'Solicitante',h:'Solicitante'},
  ],rows,{sort:{k:'Dias_abierta',d:'desc'},onRow:o=>o.Material&&D.byMat[o.Material]?openSheet(o.Material):null,unit:'posiciones',fix:2});}

/* ================= CONSUMO Y GASTO ================= */
const MF={grupo:'Consumo',tipo:'',ot:'',q:'',vista:'mat'};
function vMov(){const v=$('#v-mov');const tipos=[...new Set(D.mv.map(m=>m.Tipo_movimiento))].sort();const hasOT=D.mv.some(m=>m.Clase_OT);
  const ws=seasonWeeks();if(WK===null)WK=defIdx();const r=weekRange(WK);
  const cons=D.mv.filter(m=>m.Grupo==='Consumo');const gasto=cons.reduce((a,m)=>a+z(m.Costo_consumo),0);
  const ent=D.mv.filter(m=>m.Grupo==='Entrada').reduce((a,m)=>a+z(m['Impte.mon.local']),0);
  const cw=cons.filter(m=>m['Fe.contabilización']>=r.ia&&m['Fe.contabilización']<=r.ib);const gW=cw.reduce((a,m)=>a+z(m.Costo_consumo),0);
  const eW=D.mv.filter(m=>m.Grupo==='Entrada'&&m['Fe.contabilización']>=r.ia&&m['Fe.contabilización']<=r.ib).reduce((a,m)=>a+z(m['Impte.mon.local']),0);
  const cur=curIdx();const gw=new Array(ws.length).fill(0);cons.forEach(m=>{const d=new Date(m['Fe.contabilización']+'T00:00:00');const k=Math.floor((d-ws[0].ini)/6048e5);if(k>=0&&k<ws.length)gw[k]+=z(m.Costo_consumo);});
  const nW=Math.min(cur+1,ws.length);const prom=nW?gasto/nW:0;
  const top1=sumBy(cw,m=>m.Material,m=>z(m.Costo_consumo)).sort((a,b)=>b[1]-a[1])[0];
  const byTipo=sumBy(cons,m=>({201:'Consumo a centro de costo (201)',202:'Consumo a centro de costo (201)',261:'Consumo a OT (261)',262:'Consumo a OT (261)',221:'Consumo a proyecto (221)',222:'Consumo a proyecto (221)'})[m['Clase de movimiento']]||m.Tipo_movimiento,m=>z(m.Costo_consumo)).sort((a,b)=>b[1]-a[1]);
  const topMat=sumBy(cons,m=>m.Material,m=>z(m.Costo_consumo)).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const topRec=sumBy(cons,m=>m['Dest.mercancía'],m=>z(m.Costo_consumo)).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const nMat=new Set(cons.map(m=>m.Material)).size;
  const descOf=m=>(D.byMat[m]?.Descripcion)||(D.mv.find(x=>x.Material===m)||{})['Texto breve de material']||m;
  v.innerHTML=SEC(`SEMANA ${r.iso}`,`${fd(r.a)} – ${fd(r.b)} · solo esta semana`,'wkk',`<div class="kp">
      ${K('Gasto en consumo',pen.format(gW),`${cw.length} movimientos de consumo`,'--ac')}
      ${K('Frente al promedio',prom?Math.round(gW/prom*100)+' %':'—',`promedio semanal ${penC.format(prom)}`,gW>prom*1.25?'--bad':gW<prom*.75?'--ok':'--pen')}
      ${K('Entradas valorizadas',pen.format(eW),'mov. 101 − 102 en la semana','--fp')}
      ${K('Mayor gasto',top1?penC.format(top1[1]):'—',top1?descOf(top1[0]):'sin consumos','--ad')}</div>`)+
    SEC(`TEMPORADA ${esc(D.meta.temporada)}`,`acumulado desde el ${fdate(D.meta.inicio_temporada)}`,'',`<div class="kp">
      ${K('Gasto en consumo',penC.format(gasto),'201 + 261 + 221 menos anulaciones','--ac')}
      ${K('Entradas valorizadas',penC.format(ent),'101 − 102 y devoluciones','--fp')}
      ${K('Materiales consumidos',nf0.format(nMat),'códigos distintos','--mut')}
      ${K('Semanas transcurridas',`${nW} de ${ws.length}`,`promedio ${penC.format(prom)} por semana`,'--mut')}</div>`)+
    `<div class="card"><h2>Gasto semanal en consumo <small>S/ por semana ISO · la seleccionada en ámbar</small></h2>${columns(ws.slice(0,nW).map((w,i)=>({lab:'S'+w.iso,v:Math.max(0,gw[i]),cur:i===WK,tip:`Semana ${w.iso} (desde ${fd(w.ini)})<br>${pen.format(gw[i])}`})),{label:'Gasto semanal',W:1280,H:210})}</div>
    <div class="half"><div class="card"><h2>Materiales con mayor gasto <small>temporada · top 10</small></h2>${hbars(topMat.map(([m,c])=>({n:descOf(m),v:c,key:m,tip:`${esc(m)} · ${esc(descOf(m))}<br>${pen.format(c)}`})),{click:1,fmt:v=>penC.format(v)})}</div>
    <div class="card"><h2>Receptores con mayor gasto <small>destinatario de la mercancía · top 10</small></h2>${hbars(topRec.map(([n,c])=>({n,v:c,key:n})),{click:1,fmt:v=>penC.format(v)})}</div></div>
    <div class="card"><h2>Gasto por tipo de salida <small>temporada</small></h2>${hbars(byTipo.map(([n,c])=>({n,v:c})),{fmt:v=>penC.format(v)})}</div>
    <div class="card"><div class="pc">
      <label class="sq">Buscar<input type="search" id="mq" placeholder="Material, receptor o referencia…" value="${esc(MF.q)}"></label>
      <label>Grupo<select id="mg">${opts(['Consumo','Entrada','Traslado/Otro'],MF.grupo,'Todos')}</select></label>
      <label>Movimiento<select id="mt">${opts(tipos,MF.tipo,'Todos')}</select></label>
      <label>Clase de OT<select id="mo" ${hasOT?'':'disabled'}>${opts([['OM01','Correctivo OM01'],['OM03','Preventivo OM03']],MF.ot,hasOT?'OM01 y OM03':'Falta columna Orden en MB51')}</select></label>
      <label>Vista<select id="mvw">${opts([['mat','Resumen por material'],['det','Detalle de movimientos'],['sem','Solo la semana seleccionada']],MF.vista,null)}</select></label></div>
      <div class="mut" style="margin-top:8px">Movimientos MB51 desde el ${fdate(D.meta.inicio_temporada)} (temporada actual). El costo es el importe en moneda local de cada movimiento.${hasOT?'':' Para separar el gasto en OM01 y OM03 agrega la columna «Orden» al layout de MB51.'}</div></div>
    <div id="mtbl"></div>`;
  v.querySelectorAll('.hb .r[data-key]').forEach(rr=>rr.onclick=()=>{MF.q=rr.dataset.key;$('#mq').value=MF.q;mvTable();$('#mtbl').scrollIntoView({behavior:'smooth',block:'start'});});
  $('#mg').onchange=e=>{MF.grupo=e.target.value;mvTable();};$('#mt').onchange=e=>{MF.tipo=e.target.value;mvTable();};$('#mo').onchange=e=>{MF.ot=e.target.value;mvTable();};
  $('#mq').oninput=e=>{MF.q=e.target.value;mvTable();};$('#mvw').onchange=e=>{MF.vista=e.target.value;mvTable();};mvTable();}
function mvTable(){const q=MF.q.trim().toLowerCase();const r=weekRange(WK);
  const rows=D.mv.filter(m=>(!MF.grupo||m.Grupo===MF.grupo)&&(!MF.tipo||m.Tipo_movimiento===MF.tipo)&&(!MF.ot||m.Clase_OT===MF.ot)&&(MF.vista!=='sem'||(m['Fe.contabilización']>=r.ia&&m['Fe.contabilización']<=r.ib))
    &&(!q||[m.Material,m['Texto breve de material'],m['Dest.mercancía'],m.Referencia,m['Nombre del usuario']].some(x=>String(x??'').toLowerCase().includes(q))));
  if(MF.vista==='mat'){const g={};rows.forEach(m=>{const k=m.Material;const o=g[k]||(g[k]={Material:k,Descripcion:m['Texto breve de material'],UM:m['Un.medida de entrada'],Movs:0,Consumo:0,Gasto:0,Receptores:new Set(),Ultimo:''});
      o.Movs++;o.Consumo+=z(m.Consumo_neto);o.Gasto+=z(m.Costo_consumo);if(m['Dest.mercancía'])o.Receptores.add(m['Dest.mercancía']);if(m['Fe.contabilización']>o.Ultimo)o.Ultimo=m['Fe.contabilización'];});
    const arr=Object.values(g).map(o=>Object.assign(o,{Receptores:[...o.Receptores].slice(0,4).join(', ')+(o.Receptores.size>4?' …':''),Stock:D.byMat[o.Material]?.Stock??null}));
    makeTable($('#mtbl'),[{k:'Material',h:'Material',cls:'code'},{k:'Descripcion',h:'Descripción',cls:'w'},{k:'UM',h:'UM'},{k:'Movs',h:'Movs.',num:1},
      {k:'Consumo',h:'Consumo neto',num:1,f:o=>num(o.Consumo||null)},{k:'Gasto',h:'Gasto (S/)',num:1,f:o=>money(o.Gasto)},
      {k:'Stock',h:'Stock hoy',num:1,f:o=>num(o.Stock)},{k:'Ultimo',h:'Último',f:o=>fdate(o.Ultimo)},{k:'Receptores',h:'Receptores',cls:'w'}],arr,{sort:{k:MF.grupo==='Consumo'?'Gasto':'Movs',d:'desc'},onRow:o=>D.byMat[o.Material]&&openSheet(o.Material),unit:'materiales',fix:2});}
  else makeTable($('#mtbl'),[{k:'Fe.contabilización',h:'Fecha',f:o=>fdate(o['Fe.contabilización'])},{k:'Material',h:'Material',cls:'code'},{k:'Clase de movimiento',h:'Mov.',cls:'code'},{k:'Tipo_movimiento',h:'Tipo'},
      {k:'Texto breve de material',h:'Descripción',cls:'w'},{k:'Ctd.en UM entrada',h:'Cantidad',num:1,f:o=>num(o['Ctd.en UM entrada'])+' '+esc(o['Un.medida de entrada']||'')},
      {k:'Impte.mon.local',h:'Importe (S/)',num:1,f:o=>money(o['Impte.mon.local'])},
      {k:'Almacén',h:'Alm.',cls:'code'},{k:'Dest.mercancía',h:'Receptor'},{k:'Referencia',h:'Referencia'},{k:'Pedido',h:'Pedido',cls:'code'},{k:'Clase_OT',h:'Clase OT',f:o=>o.Clase_OT?clsPill(o.Clase_OT):''}],rows,{sort:{k:'Fe.contabilización',d:'desc'},onRow:o=>D.byMat[o.Material]&&openSheet(o.Material),unit:'movimientos',fix:2});}

/* ================= EQUIPOS ================= */
const EF={sel:store.eq||null,q:'',riego:'Sí',per:'temp'};
function otsScope(){return D.ot.filter(o=>EF.per==='all'||(o['Fecha de creación']||'')>=D.meta.inicio_temporada);}
function vEq(){const v=$('#v-eq');const ots=otsScope();
  const eqs={};ots.forEach(o=>{if(EF.riego&&o.Equipo_riego!==EF.riego)return;const e=eqs[o.Equipo]||(eqs[o.Equipo]={id:o.Equipo,n:o['Denominación de objeto técnico']||o.Equipo,u:o['Denominación de la ubicación técnica']||'',ots:0,c:0,om01:0,om03:0});
    e.ots++;e.c+=z(o['Costes tot.reales']);if(o['Clase de orden']==='OM01')e.om01++;if(o['Clase de orden']==='OM03')e.om03++;});
  const list=Object.values(eqs).sort((a,b)=>b.c-a.c);if(!EF.sel||!eqs[EF.sel])EF.sel=list[0]?.id||null;
  const tot=list.reduce((a,e)=>a+e.c,0),tOT=list.reduce((a,e)=>a+e.ots,0),t1=list.reduce((a,e)=>a+e.om01,0),t3=list.reduce((a,e)=>a+e.om03,0);
  v.innerHTML=SEC(EF.per==='temp'?`EQUIPOS · TEMPORADA ${esc(D.meta.temporada)}`:'EQUIPOS · TODO EL EXPORT IW39',EF.riego==='Sí'?'solo equipos de la lista IH08':'todos los equipos','',`<div class="kp">
      ${K('Equipos con OT',nf0.format(list.length),'con al menos una orden','--ac')}
      ${K('Órdenes',nf0.format(tOT),`${t1} OM01 · ${t3} OM03`,'--fp')}
      ${K('Correctivas OM01',tOT?Math.round(t1/tOT*100)+' %':'—',`${t1} de ${tOT} órdenes`,'--bad')}
      ${K('Costo real',penC.format(tot),'IW39 · costes totales reales','--ac')}</div>`)+
    `<div class="card"><div class="pc" style="grid-template-columns:repeat(3,1fr)">
      <label>Periodo<span class="seg"><button type="button" data-p="temp" class="${EF.per==='temp'?'on':''}">Temporada</button><button type="button" data-p="all" class="${EF.per==='all'?'on':''}">Todo el export</button></span></label>
      <label>Equipos<span class="seg"><button type="button" data-r="Sí" class="${EF.riego==='Sí'?'on':''}">Riego (IH08)</button><button type="button" data-r="" class="${EF.riego===''?'on':''}">Todos</button></span></label>
      <label>Buscar equipo<input type="search" id="eqq" placeholder="Nombre, código o ubicación…" value="${esc(EF.q)}"></label></div></div>
    <div class="eq"><div><div class="lst" id="eqitems"></div><div class="more"><span>${nf0.format(list.length)} equipos · ordenados por costo real</span></div></div><div id="eqdet"></div></div>`;
  const drawList=()=>{const q=EF.q.trim().toLowerCase();$('#eqitems').innerHTML=list.filter(e=>!q||(e.n+' '+e.id+' '+e.u).toLowerCase().includes(q)).map(e=>`<button type="button" class="eqi" data-id="${esc(e.id)}" aria-current="${e.id===EF.sel}"><b title="${esc(e.n)}">${esc(e.n)}</b><span>${money(e.c)||'S/ 0'}</span><small>${esc(e.id)} · ${e.ots} OT · <span class="ch r">${e.om01}</span> OM01 · <span class="ch g">${e.om03}</span> OM03</small></button>`).join('')||'<div class="mut" style="padding:12px">Sin equipos.</div>';
    $('#eqitems').querySelectorAll('.eqi').forEach(b=>b.onclick=()=>{EF.sel=b.dataset.id;remember('eq',EF.sel);drawList();eqDetail(ots);});};
  v.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{EF.per=b.dataset.p;vEq();});v.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{EF.riego=b.dataset.r;vEq();});
  $('#eqq').oninput=e=>{EF.q=e.target.value;drawList();};drawList();eqDetail(ots);}
function eqDetail(ots){const host=$('#eqdet');const os=ots.filter(o=>o.Equipo===EF.sel);
  if(!os.length){host.innerHTML='<div class="card mut">Elige un equipo de la lista.</div>';return;}
  const o0=os[0];const cost=os.reduce((a,o)=>a+z(o['Costes tot.reales']),0);const c=k=>os.filter(o=>o['Clase de orden']===k).length;
  const ordSet=new Set(os.map(o=>o.Orden));const mats=D.res.filter(r=>ordSet.has(r.Orden));
  const mg=sumBy(mats,r=>r.Material,r=>z(r.Reservado)).map(([m,q])=>({m,q,d:(D.byMat[m]?.Descripcion)||(mats.find(x=>x.Material===m)||{})['Texto breve de material']||'',um:(mats.find(x=>x.Material===m)||{}).UM||'',p:D.price(m),c:q*D.price(m)})).sort((a,b)=>b.c-a.c);
  const months={};os.forEach(o=>{const k=(o['Fecha de creación']||'').slice(0,7);if(k)months[k]=(months[k]||0)+z(o['Costes tot.reales']);});
  const mk=Object.keys(months).sort();const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  host.innerHTML=`<div class="card eqh"><div class="mut" style="font-size:12px">Equipo ${esc(o0.Equipo)} · ${esc(o0['Ubicación técnica']||'')}</div><div class="lh2">${esc(o0['Denominación de objeto técnico']||o0.Equipo)}</div><div class="mut">${esc(o0['Denominación de la ubicación técnica']||'')}</div></div>
    <div class="kp">${K('Órdenes creadas',os.length,EF.per==='temp'?'esta temporada':'todo el export','--fp')}${K('Correctivas OM01',c('OM01'),'mantenimiento correctivo','--bad')}${K('Preventivas OM03',c('OM03'),'mantenimiento preventivo','--ok')}${K('Costo real',penC.format(cost),'IW39 · costes totales reales','--ac')}</div>
    <div class="card"><h2>Costo real por mes <small>según fecha de creación de la OT</small></h2>${columns(mk.map(k=>({lab:MES[+k.slice(5,7)-1]+' '+k.slice(2,4),v:months[k],tip:`${MES[+k.slice(5,7)-1]} ${k.slice(0,4)}<br>${pen.format(months[k])} · ${os.filter(o=>(o['Fecha de creación']||'').startsWith(k)).length} OT`})),{label:'Costo por mes',W:960})}</div>
    <div class="card"><h2>Materiales en las OT del equipo <small>reservas IW13 · costo estimado con precio del stock</small></h2><div id="eqmat"></div></div>
    <div class="card"><h2>Órdenes</h2><div id="eqot"></div></div>`;
  makeTable($('#eqmat'),[{k:'m',h:'Material',cls:'code'},{k:'d',h:'Descripción',cls:'w'},{k:'q',h:'Cantidad',num:1,f:o=>num(o.q)+' '+esc(o.um)},{k:'c',h:'Costo est. (S/)',num:1,f:o=>o.p?money(o.c):SINP}],mg,{sort:{k:'c',d:'desc'},onRow:o=>D.byMat[o.m]&&openSheet(o.m),unit:'materiales',limit:15});
  makeTable($('#eqot'),[{k:'Orden',h:'Orden',cls:'code'},{k:'Clase de orden',h:'Clase',f:o=>clsPill(o['Clase de orden'])},{k:'Texto breve',h:'Descripción',cls:'w'},{k:'Fecha de creación',h:'Creada',f:o=>fdate(o['Fecha de creación'])},{k:'Status de usuario',h:'Status'},{k:'Costes tot.reales',h:'Costo real (S/)',num:1,f:o=>money(o['Costes tot.reales'])}],os,{sort:{k:'Fecha de creación',d:'desc'},unit:'órdenes',limit:20});}

/* ================= RESERVAS OT ================= */
const RF={clase:'',riego:'',q:''};
function vRes(){const v=$('#v-res');
  const g={};D.res.forEach(r=>{const k=r.Orden||'(sin orden)';const o=g[k]||(g[k]={Orden:r.Orden,Clase_OT:r.Clase_OT,Texto_OT:r.Texto_OT,Fecha:r.Fecha_creacion_OT,Status:r.Status_usuario_OT,Equipo:r.Equipo,EqN:r.Equipo_denominacion,Riego:r.Equipo_riego,items:[],Pend:0,Costo:0,SinP:0});
    o.items.push(r);if(D.price(r.Material))o.Costo+=z(r.Pendiente_retirar)*D.price(r.Material);else if(z(r.Pendiente_retirar)>0)o.SinP++;if(z(r.Pendiente_retirar)>0)o.Pend++;});
  const ords=Object.values(g);const cnt={};ords.forEach(o=>cnt[o.Clase_OT||'Sin OT']=(cnt[o.Clase_OT||'Sin OT']||0)+1);
  v.innerHTML=SEC('ÓRDENES CON MATERIAL RESERVADO','IW13 · toca una clase para filtrar','',`<div class="kp">
      ${K('OM01 · Correctivas',nf0.format(cnt.OM01||0),'órdenes con reservas','--bad','data-c="OM01"')}
      ${K('OM03 · Preventivas',nf0.format(cnt.OM03||0),'órdenes con reservas','--ok','data-c="OM03"')}
      ${K('OM02',nf0.format(cnt.OM02||0),'órdenes con reservas','--fp','data-c="OM02"')}
      ${K('OM04',nf0.format(cnt.OM04||0),'órdenes con reservas','--ad','data-c="OM04"')}</div>`)+
    `<div class="card"><div class="pc" style="grid-template-columns:2fr 1fr 1fr">
      <label class="sq">Buscar<input type="search" id="rq" placeholder="Orden, material o equipo…" value="${esc(RF.q)}"></label>
      <label>Equipos<select id="rr">${opts([['Sí','Solo riego (IH08)'],['No','Fuera de IH08']],RF.riego,'Todos')}</select></label>
      ${clearBtn}</div>
      <div class="mut" style="margin-top:8px">Una fila por orden; tócala para ver sus materiales. La clase sale de IW39 o del prefijo del número: 600 = OM01, 630 = OM03, 640 = OM04, 620 = OM02.</div></div>
    <div id="rtbl"></div>`;
  const sync=()=>v.querySelectorAll('[data-c]').forEach(k=>k.setAttribute('aria-pressed',String(k.dataset.c===RF.clase)));
  v.querySelectorAll('[data-c]').forEach(k=>k.onclick=()=>{RF.clase=RF.clase===k.dataset.c?'':k.dataset.c;sync();draw();});
  $('#rq').oninput=e=>{RF.q=e.target.value;draw();};$('#rr').onchange=e=>{RF.riego=e.target.value;draw();};
  v.querySelector('[data-clear]').onclick=()=>{Object.assign(RF,{clase:'',riego:'',q:''});vRes();};
  function draw(){const q=RF.q.trim().toLowerCase();
    const rows=ords.filter(o=>(!RF.clase||o.Clase_OT===RF.clase)&&(!RF.riego||o.Riego===RF.riego)&&(!q||[o.Orden,o.Texto_OT,o.Equipo,o.EqN].some(x=>String(x??'').toLowerCase().includes(q))||o.items.some(r=>[r.Material,r['Texto breve de material']].some(x=>String(x??'').toLowerCase().includes(q)))));
    makeTable($('#rtbl'),[{k:'Orden',h:'Orden',cls:'code',f:o=>esc(o.Orden||'(sin orden)')},{k:'Clase_OT',h:'Clase',f:o=>clsPill(o.Clase_OT)},{k:'Texto_OT',h:'Descripción OT',cls:'w'},
      {k:'Fecha',h:'Creada',f:o=>fdate(o.Fecha)},{k:'EqN',h:'Equipo',cls:'w',f:o=>esc(o.EqN||o.Equipo||'')},{k:'Riego',h:'Riego'},
      {k:'n',h:'Materiales',num:1,v:o=>o.items.length,f:o=>o.items.length},{k:'Pend',h:'Con pendiente',num:1},{k:'Costo',h:'Costo est. (S/)',num:1,f:o=>money(o.Costo)+(o.SinP?' '+SINP:'')},{k:'Status',h:'Status'}],
      rows,{sort:{k:'Orden',d:'desc'},unit:'órdenes',fix:1,sub:o=>`<table><thead><tr><th>Material</th><th>Descripción</th><th class="n">Reservado</th><th class="n">Tomado</th><th class="n">Pendiente</th><th class="n">Stock hoy</th><th class="n">Costo est.</th></tr></thead><tbody>${o.items.map(r=>`<tr><td class="code">${esc(r.Material||'')}</td><td>${esc(r['Texto breve de material']||'')}</td><td class="n">${num(r.Reservado)} ${esc(r.UM||'')}</td><td class="n">${num(r.Tomados)}</td><td class="n">${num(r.Pendiente_retirar)}</td><td class="n">${num(D.byMat[r.Material]?.Stock)}</td><td class="n">${D.price(r.Material)?money(z(r.Pendiente_retirar)*D.price(r.Material)):(z(r.Pendiente_retirar)>0?SINP:'')}</td></tr>`).join('')}</tbody></table>`});}
  sync();draw();}

/* ================= ficha de material ================= */
function openSheet(mat){const t=D.byMat[mat];if(!t)return;const sh=$('#sheet');
  const seasons=[['Temporada 23/24',t.Cons_2023_2024],['Temporada 24/25',t.Cons_2024_2025],['Temporada 25/26',t.Cons_2025_2026],['Temporada '+D.meta.temporada.replace(/20(\d\d)\/20(\d\d)/,'$1/$2')+' (en curso)',t.Cons_temporada_actual]];
  const scale=Math.max(z(t.Maximo)*1.2,z(t.Stock)*1.05,1);
  const sps=D.sp.filter(s=>s.Material===mat).sort((a,b)=>(b['Fecha de solicitud']||'').localeCompare(a['Fecha de solicitud']||'')).slice(0,8);
  const mvs=D.mv.filter(m=>m.Material===mat).slice(0,10);const rs=D.res.filter(r=>r.Material===mat&&z(r.Pendiente_retirar)>0).slice(0,8);
  const gasto=D.mv.filter(m=>m.Material===mat).reduce((a,m)=>a+z(m.Costo_consumo),0);
  sh.innerHTML=`<div class="card top"><div><div class="mut" style="font-size:12px">${esc(mat)} · ${esc(t.UM||'')} · ${t.Precio_unit?pen.format(t.Precio_unit)+' c/u':SINP}</div><div class="lh2">${esc(t.Descripcion||'')}</div><div class="bar">${pill(t.Estado)}${dem(t.Tipo_demanda)}</div></div><div><button class="btn2" id="shx" type="button">Cerrar</button></div></div>
  <div class="card"><h2>Stock frente a mínimo y máximo</h2><div class="gauge"><div class="fill" style="width:${Math.min(100,z(t.Stock)/scale*100)}%"></div>
    ${z(t.Minimo)>0?`<div class="mk" style="left:${z(t.Minimo)/scale*100}%" title="Mínimo"></div><div class="mk" style="left:${Math.min(99.5,z(t.Maximo)/scale*100)}%;opacity:.45" title="Máximo"></div>`:''}</div>
    <div class="gl"><span>Stock ${num(t.Stock)}</span><span>Mín ${num(t.Minimo)}${z(t.Minimo_manual)>0?' (manual)':''}</span><span>Máx ${num(t.Maximo)}</span></div></div>
  <div class="kp k3">${K('Prom. mensual ajustado',num(t.Prom_mensual_ajustado)||'0','sin picos de proyectos','--ac')}${K('Cobertura',t.Cobertura_meses==null?'—':nf.format(t.Cobertura_meses)+' meses','al ritmo del promedio','--fp')}${K('Sugerido pedir',num(t.Cant_sugerida_pedir)||'0',z(t.Cant_sugerida_pedir)&&t.Precio_unit?pen.format(z(t.Cant_sugerida_pedir)*t.Precio_unit):'',z(t.Cant_sugerida_pedir)?'--bad':'--ok')}
    ${K('OC en tránsito',num(t.Pend_en_transito)||'0','pendiente de llegar','--pen')}${K('SOLPED sin OC',num(t.Pend_sin_OC)||'0','sin orden de compra','--bad')}${K('Gasto temporada',penC.format(gasto),'consumos valorizados','--ad')}
    ${K('Meses con consumo',(t.Meses_con_consumo??0)+' de 36','historial 3 temporadas','--mut')}${K('Peso del mes pico',t.Pico_pct==null?'—':Math.round(t.Pico_pct*100)+' %','del consumo total','--mut')}${K('Consumo a proyecto',t.Pct_proyecto==null?'—':Math.round(t.Pct_proyecto*100)+' %','mov. 221','--mut')}</div>
  <div class="card"><h2>Consumo por temporada <small>${esc(t.UM||'')}</small></h2>${hbars(seasons.map(s=>({n:s[0],v:Math.max(0,z(s[1])),c:s[0].includes('curso')?'var(--pen)':null})),{fmt:v=>num(v)})}
    <div class="mut" style="margin-top:6px">Almacenes con stock: ${esc(t.Almacenes_con_stock||'ninguno')}.</div></div>
  <div class="card"><h2>SOLPED y pedidos</h2>${sps.length?`<div class="gw" style="max-height:none"><table class="mini"><thead><tr><th>Fecha</th><th>SOLPED</th><th class="n">Cant.</th><th>OC</th><th>Estado</th></tr></thead><tbody>${sps.map(s=>`<tr><td>${fdate(s['Fecha de solicitud'])}</td><td>${esc(s['Solicitud de pedido'])}</td><td class="n">${num(s['Cantidad solicitada'])}</td><td>${esc(s.Pedido||'')}</td><td>${spill(s.Estado)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="mut">Sin SOLPED en el export ME5A.</div>'}</div>
  <div class="card"><h2>Reservas en OT pendientes</h2>${rs.length?`<div class="gw" style="max-height:none"><table class="mini"><thead><tr><th>Clase</th><th>Orden</th><th>OT</th><th class="n">Pend.</th></tr></thead><tbody>${rs.map(r=>`<tr><td>${clsPill(r.Clase_OT)}</td><td>${esc(r.Orden||'')}</td><td>${esc(r.Texto_OT||'')}</td><td class="n">${num(r.Pendiente_retirar)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="mut">Sin reservas pendientes.</div>'}</div>
  <div class="card"><h2>Últimos movimientos <small>temporada</small></h2>${mvs.length?`<div class="gw" style="max-height:none"><table class="mini"><thead><tr><th>Fecha</th><th>Tipo</th><th class="n">Cant.</th><th class="n">S/</th><th>Receptor</th></tr></thead><tbody>${mvs.map(m=>`<tr><td>${fdate(m['Fe.contabilización'])}</td><td>${esc(m.Tipo_movimiento)}</td><td class="n">${num(m['Ctd.en UM entrada'])}</td><td class="n">${money(m['Impte.mon.local'])}</td><td>${esc(m['Dest.mercancía']||'')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="mut">Sin movimientos esta temporada.</div>'}</div>`;
  sh.hidden=false;$('#scrim').hidden=false;$('#shx').focus();$('#shx').onclick=closeSheet;}
function closeSheet(){$('#sheet').hidden=true;$('#scrim').hidden=true;}
$('#scrim').onclick=closeSheet;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});

/* ================= pestañas ================= */
const VIEWS={stock:vStock,solped:vSolped,mov:vMov,eq:vEq,res:vRes};let CURTAB='stock';
function show(tab){if(!VIEWS[tab])tab='stock';CURTAB=tab;document.querySelectorAll('.tabs button').forEach(b=>{b.classList.toggle('on',b.dataset.tab===tab);b.setAttribute('aria-selected',String(b.dataset.tab===tab));});
  Object.keys(VIEWS).forEach(k=>$('#v-'+k).hidden=k!==tab);VIEWS[tab]();remember('tab',tab);}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>show(b.dataset.tab));
function renderAll(){WK=null;header();show((location.hash||'').slice(1)||store.tab||'stock');}
renderAll();

/* ================= upload ================= */
const NEED={tab:['Material','Estado','Minimo','Cant_sugerida_pedir'],sp:['Solicitud de pedido','Pendiente_llegar','Estado'],mv:['Tipo_movimiento','Consumo_neto'],res:['Pendiente_retirar','Clase_OT','Orden'],ot:['Orden','Clase de orden','Costes tot.reales','Equipo_riego']};
const SHEETN={tab:'TABLERO',sp:'SOLPED_SEGUIMIENTO',mv:'MOV_TEMPORADA',res:'RESERVAS_OT',ot:'OTS'};
const iso=v=>v instanceof Date?new Date(v.getTime()-v.getTimezoneOffset()*6e4).toISOString().slice(0,10):v;
function encode(cols,objs){const rows=objs.map(o=>cols.map(c=>{let v=o[c];if(v===undefined||v==='')v=null;v=iso(v);if(typeof v==='number')v=Math.round(v*1000)/1000;return v;}));const dict={};
  cols.forEach((c,j)=>{const nn=rows.map(r=>r[j]).filter(v=>v!==null);if(!nn.length||!nn.every(v=>typeof v==='string'))return;const u=[...new Set(nn)];if(u.length<0.6*rows.length){const ix=new Map(u.map((v,i)=>[v,i]));dict[j]=u;rows.forEach(r=>{if(r[j]!==null)r[j]=ix.get(r[j]);});}});
  return {cols,dict,rows};}
let pendingRaw=null;
$('#btnLoad').onclick=()=>$('#fileIn').click();
async function ingest(buf,label){
  if(!window.XLSX)throw new Error('No cargó el lector de Excel. Revisa tu conexión y vuelve a intentar.');
  const wb=XLSX.read(buf,{type:'array',cellDates:true});const found={};
  for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:null,raw:true});if(!rows.length)continue;const keys=Object.keys(rows[0]);
    for(const k in NEED)if(!found[k]&&NEED[k].every(c=>keys.includes(c))){found[k]=rows;break;}}
  const miss=['tab','sp','mv','res'].filter(k=>!found[k]);
  if(miss.length)throw new Error('No encontré las hojas '+miss.map(k=>SHEETN[k]).join(', ')+'. Usa el libro APP_STOCK_MATERIALES después de «Actualizar todo».');
  found.mv.forEach(m=>{if(m.Costo_consumo==null&&m.Grupo==='Consumo')m.Costo_consumo=-z(m['Impte.mon.local']);});
  const t=found.tab.filter(o=>z(o.Stock)>0||z(o.Prom_mensual_ajustado)>0||z(o.Cons_temporada_actual)!==0||z(o.Pend_sin_OC)>0||z(o.Pend_en_transito)>0||z(o.Reservado_OM01)+z(o.Reservado_OM03)+z(o.Reservado_otros)>0);
  const mvDates=found.mv.map(m=>iso(m['Fe.contabilización'])).filter(Boolean).sort();
  const ini=(()=>{const n=new Date(),y=n.getFullYear();const s=y=>{const j=new Date(y,0,4);const d=(j.getDay()+6)%7;return new Date(y,0,4-d+182);};const a=n>=s(y)?y:y-1;return {d:iso(s(a)),t:a+'/'+(a+1)};})();
  const raw={meta:{generado:iso(new Date()),inicio_temporada:ini.d,temporada:ini.t,fuente:label+(mvDates.length?' · MB51 hasta '+fdate(mvDates[mvDates.length-1]):''),params:D.meta.params},
    tab:encode(RAW.tab.cols,t),sp:encode(RAW.sp.cols,found.sp),mv:encode(RAW.mv.cols,found.mv),res:encode(RAW.res.cols,found.res),ot:found.ot?encode(RAW.ot.cols,found.ot):RAW.ot};
  RAW=raw;load(raw);renderAll();return {raw,found};}
$('#fileIn').onchange=async e=>{const f=e.target.files[0];if(!f)return;status('Leyendo '+f.name+' …');
  try{const {raw,found}=await ingest(await f.arrayBuffer(),'Excel cargado el '+fdate(iso(new Date())));pendingRaw=raw;
    const art=await window.claude?.use?.('artifact');$('#btnSave').hidden=!art;
    status(`Datos cargados: ${nf0.format(D.tab.length)} materiales, ${nf0.format(D.sp.length)} posiciones SOLPED${found.ot?'':' (sin hoja OTS: Equipos mantiene los datos anteriores)'}. ${art?'Pulsa «Guardar para el equipo» para que todos vean esta versión.':'Solo los ves tú en esta sesión; los datos publicados se actualizan con ACTUALIZAR_APP.'}`);
  }catch(err){status(err.message||String(err),true);}finally{e.target.value='';}};
/* datos publicados: window.FUENTE_DATOS (app/fuente.js) o data-remote (data/APP_STOCK_MATERIALES.xlsx) */
(async()=>{
  if(window.DATOS_XLSX_B64){ /* datos.js generado por ACTUALIZAR_APP junto a index.html (SharePoint / carpeta local) */
    status('Cargando los datos…');
    try{const bin=atob(window.DATOS_XLSX_B64);const buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
      const when=window.DATOS_FECHA?new Date(window.DATOS_FECHA):null;
      await ingest(buf,'Datos actualizados'+(when?' el '+when.toLocaleDateString('es-PE')+' '+when.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}):''));status('');}
    catch(err){status('No pude leer datos.js: '+(err.message||err),true);}
    return;}
  const src=(window.FUENTE_DATOS||'').trim()||document.getElementById('data').dataset.remote;if(!src||!/^https?:/.test(location.protocol))return;
  status('Cargando los datos publicados…');
  try{const url=src+(src.includes('?')?'&':'?')+'v='+Date.now();
    const r=await fetch(url,{cache:'no-store',redirect:'follow'});if(!r.ok)throw new Error('No pude leer la fuente de datos (código '+r.status+').');
    let buf,when=null;
    if(/script\.google(usercontent)?\.com/.test(r.url)||/json/.test(r.headers.get('Content-Type')||'')){
      const j=await r.json();if(j.error)throw new Error(j.error);
      const bin=atob(j.b64);buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
      when=j.actualizado?new Date(j.actualizado):null;}
    else{buf=await r.arrayBuffer();const lm=r.headers.get('Last-Modified');when=lm?new Date(lm):null;}
    await ingest(buf,'Datos publicados'+(when?' el '+when.toLocaleDateString('es-PE')+' '+when.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}):''));
    status('');}
  catch(err){status((err.message||String(err))+' Puedes cargar el Excel a mano con «Cargar Excel actualizado».',true);}})();
$('#btnSave').onclick=async()=>{if(!pendingRaw)return;const art=await window.claude?.use?.('artifact');if(!art){status('No tienes permiso para guardar esta página.',true);return;}
  status('Guardando…');const json=JSON.stringify(pendingRaw).replace(/<\//g,'<\\/');
  const html='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'+RESET_CSS+'</style></head><body>'+
    '<title>'+document.title+'</title>'+LINKS+CSS_EL.outerHTML+SHELL.outerHTML+'<div id="app"></div><script id="data" type="application/json">'+json+'<\/script>'+
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"><\/script>'+APP_EL.outerHTML+'</body></html>';
  try{await art.publish(html);status('Guardado. El equipo verá estos datos al abrir la página.');}
  catch(err){status(err&&err.code==='conflict'?'Otra persona guardó al mismo tiempo; vuelve a cargar el Excel.':'No se pudo guardar: '+(err.message||err.code||err),true);}};
})();
