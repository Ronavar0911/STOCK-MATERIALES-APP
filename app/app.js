(function(){
"use strict";
const $=s=>document.querySelector(s);
const RESET_CSS=(document.head.querySelector('style')||{}).textContent||'';
const SHELL=$('#shell'), CSS_EL=$('#css'), APP_EL=document.getElementById('appjs');
const LINKS=[...document.querySelectorAll('link[href*="fonts.googleapis"]')].map(l=>l.outerHTML).join('');
$('#app').appendChild(SHELL.content.cloneNode(true));

/* ================= data ================= */
let RAW=JSON.parse(document.getElementById('data').textContent);
function decode(T){if(!T)return [];const d=T.dict||{};return T.rows.map(r=>{const o={};T.cols.forEach((c,j)=>{let v=r[j];if(d[j]!==undefined&&v!==null&&v!==undefined)v=d[j][v];o[c]=v===undefined?null:v;});return o;});}
let D={};
function load(raw){D={meta:raw.meta,tab:decode(raw.tab),sp:decode(raw.sp),mv:decode(raw.mv),res:decode(raw.res),ot:decode(raw.ot)};
  D.byMat={};D.tab.forEach(t=>D.byMat[t.Material]=t);
  D.price=m=>{const t=D.byMat[m];return t&&t.Precio_unit>0?t.Precio_unit:0;};}
load(RAW);

/* ================= helpers ================= */
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
const today=new Date().toISOString().slice(0,10);
const EST=[['Quiebre','Sin stock y nada pedido','--crit-bar'],['Pedir','Bajo mínimo, falta pedir','--warn-bar'],['En camino','Bajo mínimo, ya pedido','--info-bar'],['OK','Entre mínimo y máximo','--ok-bar'],['Sobrestock','Sobre 1,5 × máximo','--bar']];
const DEM=[['Regular','18+ meses con consumo','--d-reg'],['Intermitente','6 a 17 meses','--d-int'],['Esporádico','menos de 6 meses','--d-esp'],['Puntual','consumo en 1 temporada','--d-pun'],['Inactivo','más de 12 meses sin consumo','--d-ina'],['Sin consumo','sin historial','--d-sin']];
const DEMC=Object.fromEntries(DEM.map(d=>[d[0],d[2]]));
const pill=e=>`<span class="pill p-${esc(String(e).split(' ')[0])}">${esc(e)}</span>`;
const spill=e=>`<span class="pill s${esc(String(e)[0])}">${esc(String(e).slice(2))}</span>`;
const dem=d=>`<span class="dem" style="--dc:var(${DEMC[d]||'--d-sin'})">${esc(d)}</span>`;
function status(msg,err){const s=$('#status');s.textContent=msg||'';s.classList.toggle('err',!!err);}
let store={};try{store=JSON.parse(localStorage.getItem('stockapp')||'{}')}catch(e){}
function remember(k,v){store[k]=v;try{localStorage.setItem('stockapp',JSON.stringify(store))}catch(e){}}
const sumBy=(arr,key,val)=>{const g=new Map();arr.forEach(o=>{const k=key(o);if(k===null||k===undefined||k==='')return;g.set(k,(g.get(k)||0)+val(o));});return [...g.entries()];};

/* tooltip */
const tip=$('#tip');
document.addEventListener('mousemove',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(!t){tip.hidden=true;return;}
  tip.innerHTML=t.dataset.tip;tip.hidden=false;const w=tip.offsetWidth,h=tip.offsetHeight;
  tip.style.left=Math.min(innerWidth-w-8,e.clientX+12)+'px';tip.style.top=Math.max(8,e.clientY-h-10)+'px';});

/* charts */
function hbars(rows,opt){opt=opt||{};const mx=Math.max(1,...rows.map(r=>r.v));
  return `<div class="hb">${rows.map(r=>`<div class="r ${opt.click?'click':''}" ${r.key!=null?`data-key="${esc(r.key)}"`:''} data-tip="${esc(r.tip||(r.n+'<br>'+(opt.fmt||num)(r.v)))}"><span class="n">${esc(r.n)}</span><span class="t"><i style="width:${(r.v/mx*100).toFixed(1)}%;${r.c?`background:var(${r.c})`:''}"></i></span><span class="x">${(opt.fmt||num)(r.v)}</span></div>`).join('')||'<div class="note">Sin datos.</div>'}</div>`;}
function columns(rows,opt){opt=opt||{};const W=opt.W||640,H=200,pl=48,pb=22,pt=8;const n=rows.length||1;const mx=Math.max(1,...rows.map(r=>r.v));
  const nice=v=>{const p=Math.pow(10,Math.floor(Math.log10(v)));const f=v/p;return (f<=1?1:f<=2?2:f<=5?5:10)*p;};const top=nice(mx);
  const bw=(W-pl)/n;let g='';for(let i=0;i<=4;i++){const y=pt+(H-pb-pt)*(1-i/4);g+=`<line class="g" x1="${pl}" x2="${W}" y1="${y}" y2="${y}"/><text x="${pl-6}" y="${y+3}" text-anchor="end">${(opt.axis||(v=>penC.format(v)))(top*i/4)}</text>`;}
  const every=Math.ceil(n/12);
  const bars=rows.map((r,i)=>{const h=(H-pb-pt)*r.v/top;const x=pl+i*bw+bw*.15,w=Math.max(2,bw*.7);const y=H-pb-h;
    return `<g data-tip="${esc(r.tip)}"><rect class="hit" x="${pl+i*bw}" y="${pt}" width="${bw}" height="${H-pb-pt}"/>${h>0?`<rect class="m" x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(4,w/2)}"/>`:''}</g>`+(i%every===0?`<text x="${x+w/2}" y="${H-6}" text-anchor="middle">${esc(r.lab)}</text>`:'');}).join('');
  return `<svg class="col" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label||'')}">${g}${bars}</svg>`;}
function seg(parts,onAttr){const tot=parts.reduce((a,p)=>a+p.v,0)||1;
  return `<div class="seg">${parts.filter(p=>p.v>0).map(p=>`<i style="flex:${p.v/tot};background:var(${p.c})" data-tip="${esc(p.n)}: ${nf0.format(p.v)} (${Math.round(p.v/tot*100)}%)" ${onAttr?onAttr(p):''}></i>`).join('')}</div>`;}

/* season */
function seasonWeek(){const ini=new Date(D.meta.inicio_temporada+'T00:00:00');return Math.max(1,Math.min(52,Math.floor((new Date()-ini)/6048e5)+1));}
function header(){const wk=seasonWeek();$('#tTemp').textContent=D.meta.temporada;$('#tWeek').textContent=wk;
  $('#tBar').style.width=(wk/52*100).toFixed(1)+'%';$('#tSrc').textContent=D.meta.fuente||'';
  $('#n-stock').textContent=nf0.format(D.tab.filter(t=>t.Estado==='Quiebre'||t.Estado==='Pedir').length);
  $('#n-solped').textContent=nf0.format(D.sp.filter(s=>s.Material&&/^[123]/.test(s.Estado)).length);
  $('#n-mov').textContent=penC.format(D.mv.reduce((a,m)=>a+z(m.Costo_consumo),0));
  $('#n-eq').textContent=nf0.format(new Set(D.ot.filter(o=>o.Equipo_riego==='Sí').map(o=>o.Equipo)).size);
  $('#n-res').textContent=nf0.format(new Set(D.res.map(r=>r.Orden).filter(Boolean)).size);}

/* generic sortable table */
function makeTable(host,cols,rows,opt){opt=opt||{};let sort=opt.sort||null,limit=opt.limit||200;const open=new Set();
  function draw(){let r=rows.slice();if(sort){const c=cols.find(x=>x.k===sort.k);const g=c.v||(o=>o[c.k]);
      r.sort((a,b)=>{let x=g(a),y=g(b);if(x===null||x===undefined||x==='')return 1;if(y===null||y===undefined||y==='')return -1;
        return (typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'es'))*(sort.d==='asc'?1:-1);});}
    const head='<tr>'+cols.map(c=>`<th class="${c.num?'num':''}" data-k="${c.k}" ${c.tip?`title="${esc(c.tip)}"`:''} ${sort&&sort.k===c.k?`data-dir="${sort.d}"`:''}>${esc(c.h)}</th>`).join('')+'</tr>';
    const body=r.slice(0,limit).map(o=>{const i=rows.indexOf(o);return `<tr class="row" tabindex="0" data-i="${i}">`+cols.map(c=>`<td class="${c.cls||''}${c.num?' num':''}">${c.f?c.f(o):esc(o[c.k])}</td>`).join('')+'</tr>'+
      (opt.sub&&open.has(i)?`<tr class="sub"><td colspan="${cols.length}">${opt.sub(o)}</td></tr>`:'');}).join('');
    host.innerHTML=`<div class="tbl-wrap"><table><thead>${head}</thead><tbody>${body||`<tr><td colspan="${cols.length}" class="muted">Ningún registro con estos filtros.</td></tr>`}</tbody></table></div>`+
      (r.length>limit?`<div class="more"><button class="btn" type="button">Mostrar ${Math.min(200,r.length-limit)} más (de ${nf0.format(r.length)})</button></div>`:`<div class="note">${nf0.format(r.length)} ${opt.unit||'registros'}</div>`);
    host.querySelectorAll('th').forEach(th=>th.onclick=()=>{const k=th.dataset.k;sort=sort&&sort.k===k?{k,d:sort.d==='asc'?'desc':'asc'}:{k,d:cols.find(c=>c.k===k).num?'desc':'asc'};draw();});
    const mb=host.querySelector('.more button');if(mb)mb.onclick=()=>{limit+=200;draw();};
    host.querySelectorAll('tbody tr.row').forEach(tr=>{const i=+tr.dataset.i;const go=()=>{if(opt.sub){open.has(i)?open.delete(i):open.add(i);draw();}else if(opt.onRow)opt.onRow(rows[i]);};
      tr.onclick=go;tr.onkeydown=e=>{if(e.key==='Enter')go();};});}
  draw();}
function toolbar(n,inner){return `<div class="toolbar" style="--n:${n}">${inner}<button class="btn link" type="button" data-clear>Limpiar filtros</button></div>`;}
function opts(list,sel,all){return `<option value="">${esc(all)}</option>`+list.map(x=>{const v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;return `<option value="${esc(v)}" ${sel===v?'selected':''}>${esc(l)}</option>`;}).join('');}

/* ================= STOCK ================= */
const SF={estado:store.estado??'_atencion',tipo:'',q:'',ot:'',alm:''};
function vStock(){const v=$('#v-stock');
  const cnt={},dc={};D.tab.forEach(t=>{cnt[t.Estado]=(cnt[t.Estado]||0)+1;dc[t.Tipo_demanda]=(dc[t.Tipo_demanda]||0)+1;});
  const need=D.tab.filter(t=>t.Estado==='Quiebre'||t.Estado==='Pedir');
  const inv=D.tab.reduce((a,t)=>a+z(t.Cant_sugerida_pedir)*D.price(t.Material),0);
  const val=D.tab.reduce((a,t)=>a+z(t.Valor_stock),0);
  const conMin=EST.reduce((a,e)=>a+(cnt[e[0]]||0),0);
  const alms=[...new Set(D.tab.flatMap(t=>(t.Almacenes_con_stock||'').split(' / ').filter(Boolean)))].sort();
  v.innerHTML=`<div class="tiles t3" style="--n:3">
    <div class="tile hero"><span class="v">${nf0.format(need.length)}</span><span class="l">Materiales que requieren pedido</span><span class="s">${nf0.format(cnt.Quiebre||0)} en quiebre · ${nf0.format(cnt.Pedir||0)} bajo mínimo sin pedir</span></div>
    <div class="tile"><span class="v">${penC.format(inv)}</span><span class="l">Inversión estimada para reponer</span><span class="s">Cantidad sugerida × precio unitario del stock</span></div>
    <div class="tile"><span class="v">${penC.format(val)}</span><span class="l">Valor del stock libre</span><span class="s">Todos los almacenes, excepto 1030</span></div></div>
  <div class="grid2">
    <div class="card"><h3>Estado frente al mínimo <small>${nf0.format(conMin)} materiales con mínimo</small></h3>
      ${seg(EST.map(e=>({n:e[0],v:cnt[e[0]]||0,c:e[2]})),p=>`data-e="${p.n}"`)}
      <div class="legend">${EST.map(e=>`<button class="chip" data-e="${e[0]}" title="${e[1]}"><span class="dot" style="background:var(${e[2]})"></span>${e[0]} <b>${nf0.format(cnt[e[0]]||0)}</b></button>`).join('')}
        <button class="chip" data-e="Sin mínimo" title="Esporádico, puntual, inactivo o sin consumo"><span class="dot" style="background:var(--idle-bar)"></span>Sin mínimo <b>${nf0.format(cnt['Sin mínimo']||0)}</b></button></div></div>
    <div class="card"><h3>Tipo de demanda <small>según 36 meses de historial</small></h3>
      ${seg(DEM.map(d=>({n:d[0],v:dc[d[0]]||0,c:d[2]})),p=>`data-t="${p.n}"`)}
      <div class="legend">${DEM.map(d=>`<button class="chip" data-t="${d[0]}" title="${d[1]}"><span class="dot" style="background:var(${d[2]})"></span>${d[0]} <b>${nf0.format(dc[d[0]]||0)}</b></button>`).join('')}</div></div>
  </div>
  ${toolbar(3,`<input type="search" id="sq" placeholder="Buscar código o descripción" value="${esc(SF.q)}" aria-label="Buscar material">
    <select id="sot" aria-label="Reserva en OT">${opts([['OM01','Con reserva en OT correctiva (OM01)'],['OM03','Con reserva en OT preventiva (OM03)']],SF.ot,'Con o sin reserva en OT')}</select>
    <select id="salm" aria-label="Almacén">${opts(alms,SF.alm,'Todos los almacenes')}</select>
    <select id="sest" aria-label="Estado">${opts([['_atencion','Requieren pedido'],...EST.map(e=>e[0]),'Sin mínimo'],SF.estado,'Todos los estados')}</select>`)}
  <div class="note">Mínimo = promedio mensual ajustado × ${D.meta.params?.MesesMin??2} meses (solo demanda Regular e Intermitente) o el mínimo manual de críticos, el que sea mayor. Toca una fila para ver el detalle del material.</div>
  <div id="stbl"></div>`;
  const sync=()=>{v.querySelectorAll('[data-e]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.e===SF.estado)));v.querySelectorAll('[data-t]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.t===SF.tipo)));$('#sest').value=SF.estado;};
  v.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{SF.estado=SF.estado===b.dataset.e?'':b.dataset.e;remember('estado',SF.estado);sync();stockTable();});
  v.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{SF.tipo=SF.tipo===b.dataset.t?'':b.dataset.t;sync();stockTable();});
  $('#sq').oninput=e=>{SF.q=e.target.value;stockTable();};$('#sot').onchange=e=>{SF.ot=e.target.value;stockTable();};
  $('#salm').onchange=e=>{SF.alm=e.target.value;stockTable();};$('#sest').onchange=e=>{SF.estado=e.target.value;remember('estado',SF.estado);sync();stockTable();};
  v.querySelector('[data-clear]').onclick=()=>{Object.assign(SF,{estado:'',q:'',tipo:'',ot:'',alm:''});remember('estado','');vStock();};
  sync();stockTable();}
const RANK={'Quiebre':0,'Pedir':1,'En camino':2,'OK':3,'Sobrestock':4,'Sin mínimo':5};
function stockTable(){const q=SF.q.trim().toLowerCase();
  const rows=D.tab.filter(t=>(!SF.estado||(SF.estado==='_atencion'?(t.Estado==='Quiebre'||t.Estado==='Pedir'):t.Estado===SF.estado))
    &&(!SF.tipo||t.Tipo_demanda===SF.tipo)&&(!SF.ot||z(t['Reservado_'+SF.ot])>0)&&(!SF.alm||(t.Almacenes_con_stock||'').includes(SF.alm))
    &&(!q||String(t.Material).toLowerCase().includes(q)||String(t.Descripcion||'').toLowerCase().includes(q)));
  makeTable($('#stbl'),[
    {k:'Estado',h:'Estado',f:o=>pill(o.Estado),v:o=>RANK[o.Estado]},
    {k:'Material',h:'Material',cls:'code'},{k:'Descripcion',h:'Descripción',cls:'desc'},{k:'UM',h:'UM'},
    {k:'Stock',h:'Stock',num:1,f:o=>num(o.Stock)},
    {k:'Minimo',h:'Mínimo',num:1,f:o=>num(o.Minimo)+(z(o.Minimo_manual)>0?' <span class="muted" title="Mínimo manual de críticos">●</span>':'')},
    {k:'Maximo',h:'Máximo',num:1,f:o=>num(o.Maximo)},
    {k:'Cobertura_meses',h:'Cobertura',num:1,tip:'Meses que dura el stock al ritmo del promedio mensual ajustado',f:o=>o.Cobertura_meses===null?'<span class="muted">—</span>':`<span class="cov">${nf.format(o.Cobertura_meses)} m<i><b style="width:${Math.min(100,o.Cobertura_meses/(D.meta.params?.MesesMax||4)*100)}%"></b></i></span>`},
    {k:'Pend_en_transito',h:'OC en tránsito',num:1,f:o=>num(o.Pend_en_transito||null)},
    {k:'Pend_sin_OC',h:'SOLPED sin OC',num:1,f:o=>num(o.Pend_sin_OC||null)},
    {k:'Cant_sugerida_pedir',h:'Sugerido pedir',num:1,f:o=>o.Cant_sugerida_pedir>0?`<b>${num(o.Cant_sugerida_pedir)}</b>`:''},
    {k:'Costo_pedir',h:'Costo est. (S/)',num:1,v:o=>z(o.Cant_sugerida_pedir)*D.price(o.Material),f:o=>money(z(o.Cant_sugerida_pedir)*D.price(o.Material))},
    {k:'Cons_temporada_actual',h:'Consumo temp.',num:1,f:o=>num(o.Cons_temporada_actual||null)},
    {k:'Prom_mensual_ajustado',h:'Prom. mes aj.',num:1,f:o=>num(o.Prom_mensual_ajustado||null)},
    {k:'Tipo_demanda',h:'Demanda',f:o=>dem(o.Tipo_demanda)},
  ],rows,{sort:{k:'Estado',d:'asc'},onRow:o=>openSheet(o.Material),unit:'materiales'});}

/* ================= SOLPED ================= */
const PF={estado:'_abiertas',q:'',sol:'',dias:'',tipo:'mat'};
const spScope=()=>D.sp.filter(s=>PF.tipo==='mat'?!!s.Material:PF.tipo==='srv'?!s.Material:true);
const isOpen=s=>/^[123]/.test(s.Estado);
const ageCls=d=>d>60?'a3':d>30?'a2':'a1';
function vSolped(){const v=$('#v-solped');const SP=spScope();const cnt={};SP.forEach(s=>cnt[s.Estado]=(cnt[s.Estado]||0)+1);
  const open=SP.filter(isOpen);const valOpen=open.reduce((a,s)=>a+z(s['Valor total']),0);
  const rec=SP.filter(s=>s.Estado==='4 Recibido'&&s.Fecha_recepcion&&s['Fecha de solicitud']).map(s=>days(s['Fecha de solicitud'],s.Fecha_recepcion)).filter(d=>d>=0);
  const avgRec=rec.length?rec.reduce((a,b)=>a+b,0)/rec.length:null;
  const sols=[...new Set(SP.map(s=>s.Solicitante).filter(Boolean))].sort();
  const F=[['1 Solicitado sin OC','--warn-bar'],['2 OC en tránsito','--info-bar'],['3 Recibido parcial','--bar'],['4 Recibido','--ok-bar']];
  const buckets=[['0–15 días',0,15],['16–30',16,30],['31–60',31,60],['61–90',61,90],['Más de 90',91,1e9]].map(b=>({lab:b[0],v:open.filter(s=>z(s.Dias_desde_solicitud)>=b[1]&&z(s.Dias_desde_solicitud)<=b[2]).length}));
  const topSol=sumBy(SP,s=>s.Solicitante,()=>1).sort((a,b)=>b[1]-a[1]).slice(0,10);
  v.innerHTML=`<div class="flow">${F.map((f,i)=>`<button class="step" data-e="${f[0]}" style="--c:var(${f[1]})"><span class="k">PASO ${i+1}</span><span class="v">${nf0.format(cnt[f[0]]||0)}</span><span class="l">${f[0].slice(2)}</span></button>`).join('')}
    <button class="step aside" data-e="5 Servicio con OC" style="--c:var(--idle-bar)"><span class="k">APARTE</span><span class="v">${nf0.format(D.sp.filter(x=>x.Estado==='5 Servicio con OC').length)}</span><span class="l">Servicios con OC</span></button></div>
  <div class="tiles t3" style="--n:3">
    <div class="tile"><span class="v">${nf0.format(open.length)}</span><span class="l">Posiciones abiertas</span><span class="s">Pasos 1 a 3 · ${PF.tipo==='mat'?'solo materiales':PF.tipo==='srv'?'solo servicios':'materiales y servicios'}</span></div>
    <div class="tile"><span class="v">${penC.format(valOpen)}</span><span class="l">Valor de lo abierto</span><span class="s">Valor total de las posiciones abiertas</span></div>
    <div class="tile"><span class="v">${avgRec===null?'—':nf0.format(avgRec)+' días'}</span><span class="l">Tiempo promedio hasta recibir</span><span class="s">De la fecha de SOLPED a la entrada 101</span></div></div>
  <div class="grid2">
    <div class="card"><h3>Antigüedad de lo abierto <small>posiciones por días desde la SOLPED</small></h3>${columns(buckets.map(b=>({lab:b.lab,v:b.v,tip:`${b.lab}: ${nf0.format(b.v)} posiciones`})),{axis:v=>nf0.format(v),label:'Antigüedad'})}</div>
    <div class="card"><h3>Solicitantes más frecuentes <small>posiciones, top 10</small></h3>${hbars(topSol.map(([n,c])=>({n,v:c,key:n,tip:`${n}: ${nf0.format(c)} posiciones · ${nf0.format(open.filter(s=>s.Solicitante===n).length)} abiertas`})),{click:1,fmt:v=>nf0.format(v)})}</div>
  </div>
  ${toolbar(3,`<input type="search" id="pq" placeholder="Buscar material, texto, SOLPED o pedido" value="${esc(PF.q)}" aria-label="Buscar SOLPED">
    <select id="ptipo" aria-label="Tipo de posición">${opts([['mat','Solo materiales'],['srv','Solo servicios']],PF.tipo,'Materiales y servicios')}</select>
    <select id="psol" aria-label="Solicitante">${opts(sols,PF.sol,'Todos los solicitantes')}</select>
    <select id="pdias" aria-label="Antigüedad">${opts([15,30,60,90].map(d=>[String(d),'Abiertas hace más de '+d+' días']),PF.dias,'Cualquier antigüedad')}</select>`)}
  <div class="note"><b>Días abierta</b>: días desde la fecha de la SOLPED hasta hoy, solo para lo que no ha llegado (verde hasta 30, ámbar hasta 60, rojo después). <b>Días a recepción</b>: lo que tardó en llegar lo ya recibido. Recibido = existe entrada 101 en MB51 para el mismo pedido y material.</div>
  <div id="ptbl"></div>`;
  const sync=()=>v.querySelectorAll('.step').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.e===PF.estado)));
  v.querySelectorAll('.step').forEach(b=>b.onclick=()=>{PF.estado=PF.estado===b.dataset.e?'':b.dataset.e;sync();spTable();});
  v.querySelectorAll('.hb .r[data-key]').forEach(r=>r.onclick=()=>{PF.sol=r.dataset.key;$('#psol').value=PF.sol;spTable();});
  $('#ptipo').onchange=e=>{PF.tipo=e.target.value;vSolped();};$('#pq').oninput=e=>{PF.q=e.target.value;spTable();};$('#psol').onchange=e=>{PF.sol=e.target.value;spTable();};$('#pdias').onchange=e=>{PF.dias=e.target.value;spTable();};
  v.querySelector('[data-clear]').onclick=()=>{Object.assign(PF,{estado:'',q:'',sol:'',dias:'',tipo:''});vSolped();};
  sync();spTable();}
function spTable(){const q=PF.q.trim().toLowerCase();
  const rows=spScope().filter(s=>(!PF.estado||(PF.estado==='_abiertas'?isOpen(s):s.Estado===PF.estado))&&(!PF.sol||s.Solicitante===PF.sol)&&(!PF.dias||(isOpen(s)&&z(s.Dias_desde_solicitud)>+PF.dias))
    &&(!q||[s.Material,s['Texto breve'],s['Solicitud de pedido'],s.Pedido].some(x=>String(x??'').toLowerCase().includes(q))));
  makeTable($('#ptbl'),[
    {k:'Estado',h:'Estado',f:o=>spill(o.Estado)},
    {k:'Fecha de solicitud',h:'Fecha SOLPED',f:o=>fdate(o['Fecha de solicitud'])},
    {k:'Dias_abierta',h:'Días abierta',num:1,tip:'Días desde la fecha de SOLPED hasta hoy (solo lo pendiente)',v:o=>isOpen(o)?z(o.Dias_desde_solicitud):null,f:o=>isOpen(o)?`<span class="age ${ageCls(z(o.Dias_desde_solicitud))}">${o.Dias_desde_solicitud}</span>`:''},
    {k:'Dias_rec',h:'Días a recepción',num:1,tip:'Días entre la SOLPED y la entrada 101',v:o=>o.Fecha_recepcion&&o['Fecha de solicitud']?days(o['Fecha de solicitud'],o.Fecha_recepcion):null,f:o=>o.Fecha_recepcion&&o['Fecha de solicitud']?days(o['Fecha de solicitud'],o.Fecha_recepcion):''},
    {k:'Solicitud de pedido',h:'SOLPED',cls:'code',f:o=>esc(o['Solicitud de pedido'])+'<span class="muted">/'+esc(o['Pos.solicitud pedido'])+'</span>'},
    {k:'Material',h:'Material',cls:'code'},{k:'Texto breve',h:'Texto',cls:'desc'},
    {k:'Cantidad solicitada',h:'Solicitado',num:1,f:o=>num(o['Cantidad solicitada'])+' '+esc(o['Unidad de medida']||'')},
    {k:'Pedido',h:'Pedido (OC)',cls:'code'},
    {k:'Cant_recibida',h:'Recibido',num:1,f:o=>num(o.Cant_recibida||null)},
    {k:'Pendiente_llegar',h:'Pendiente',num:1,f:o=>num(o.Pendiente_llegar||null)},
    {k:'Valor total',h:'Valor (S/)',num:1,f:o=>money(o['Valor total'])},
    {k:'Nombre de proveedor',h:'Proveedor',cls:'desc'},{k:'Solicitante',h:'Solicitante'},
  ],rows,{sort:{k:'Dias_abierta',d:'desc'},onRow:o=>o.Material&&D.byMat[o.Material]?openSheet(o.Material):null,unit:'posiciones'});}

/* ================= CONSUMO Y GASTO ================= */
const MF={grupo:'Consumo',tipo:'',ot:'',q:'',vista:'mat'};
function weekKey(s){const d=new Date(s+'T00:00:00');const ini=new Date(D.meta.inicio_temporada+'T00:00:00');return Math.floor((d-ini)/6048e5)+1;}
function vMov(){const v=$('#v-mov');const tipos=[...new Set(D.mv.map(m=>m.Tipo_movimiento))].sort();const hasOT=D.mv.some(m=>m.Clase_OT);
  const cons=D.mv.filter(m=>m.Grupo==='Consumo');const gasto=cons.reduce((a,m)=>a+z(m.Costo_consumo),0);
  const ent=D.mv.filter(m=>m.Grupo==='Entrada').reduce((a,m)=>a+z(m['Impte.mon.local']),0);
  const wk=seasonWeek();const wks=Array.from({length:wk},(_,i)=>({w:i+1,v:0}));
  cons.forEach(m=>{const k=weekKey(m['Fe.contabilización']);if(k>=1&&k<=wk)wks[k-1].v+=z(m.Costo_consumo);});
  const ini=new Date(D.meta.inicio_temporada+'T00:00:00');
  const wkRows=wks.map(x=>{const d=new Date(ini.getTime()+(x.w-1)*6048e5);return {lab:'S'+((x.w+26-1)%52+1),v:Math.max(0,x.v),tip:`Semana ${(x.w+26-1)%52+1} (desde ${d.toLocaleDateString('es-PE',{day:'2-digit',month:'short'})})<br>${pen.format(x.v)}`};});
  const byTipo=sumBy(cons,m=>m.Tipo_movimiento.replace('Anul. consumo','Consumo').replace('Consumo CeCo','Consumo a centro de costo (201)').replace('Consumo OT','Consumo a OT (261)').replace('Consumo proyecto','Consumo a proyecto (221)'),m=>z(m.Costo_consumo)).sort((a,b)=>b[1]-a[1]);
  const topMat=sumBy(cons,m=>m.Material,m=>z(m.Costo_consumo)).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const topRec=sumBy(cons,m=>m['Dest.mercancía'],m=>z(m.Costo_consumo)).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const nMat=new Set(cons.map(m=>m.Material)).size;
  const descOf=m=>(D.byMat[m]?.Descripcion)||(D.mv.find(x=>x.Material===m)||{})['Texto breve de material']||m;
  v.innerHTML=`<div class="tiles t3" style="--n:3">
    <div class="tile"><span class="v">${penC.format(gasto)}</span><span class="l">Gasto en consumo de la temporada</span><span class="s">Mov. 201 + 261 + 221 menos anulaciones, valorizado</span></div>
    <div class="tile"><span class="v">${penC.format(ent)}</span><span class="l">Entradas valorizadas</span><span class="s">Mov. 101 − 102 y devoluciones</span></div>
    <div class="tile"><span class="v">${nf0.format(nMat)}</span><span class="l">Materiales distintos consumidos</span><span class="s">Desde ${fdate(D.meta.inicio_temporada)}</span></div></div>
  <div class="card"><h3>Gasto semanal en consumo <small>S/ por semana ISO de la temporada ${esc(D.meta.temporada)}</small></h3>${columns(wkRows,{label:'Gasto semanal',W:1280})}</div>
  <div class="grid2">
    <div class="card"><h3>Materiales con mayor gasto <small>top 10</small></h3>${hbars(topMat.map(([m,c])=>({n:descOf(m),v:c,key:m,tip:`${esc(m)} · ${esc(descOf(m))}<br>${pen.format(c)}`})),{click:1,fmt:v=>penC.format(v)})}</div>
    <div class="card"><h3>Receptores con mayor gasto <small>destinatario de la mercancía, top 10</small></h3>${hbars(topRec.map(([n,c])=>({n,v:c,key:n})),{click:1,fmt:v=>penC.format(v)})}</div>
  </div>
  <div class="card"><h3>Gasto por tipo de salida</h3>${hbars(byTipo.map(([n,c])=>({n,v:c})),{fmt:v=>penC.format(v)})}</div>
  ${toolbar(4,`<input type="search" id="mq" placeholder="Buscar material, receptor o referencia" value="${esc(MF.q)}" aria-label="Buscar movimiento">
    <select id="mg" aria-label="Grupo">${opts(['Consumo','Entrada','Traslado/Otro'],MF.grupo,'Todos los grupos')}</select>
    <select id="mt" aria-label="Tipo de movimiento">${opts(tipos,MF.tipo,'Todos los movimientos')}</select>
    <select id="mo" aria-label="Clase de OT" ${hasOT?'':'disabled'}>${opts([['OM01','Correctivo OM01'],['OM03','Preventivo OM03']],MF.ot,hasOT?'OM01 y OM03':'OM01/OM03: falta columna Orden')}</select>
    <select id="mvw" aria-label="Vista">${opts([['mat','Resumen por material'],['det','Detalle de movimientos']],MF.vista,'Vista').replace('<option value="">Vista</option>','')}</select>`)}
  <div class="note">Movimientos MB51 desde el ${fdate(D.meta.inicio_temporada)}. El costo sale del importe en moneda local de cada movimiento.${hasOT?'':' Para separar el gasto en OM01 y OM03 agrega la columna «Orden» al layout de MB51.'}</div>
  <div id="mtbl"></div>`;
  v.querySelectorAll('.hb .r[data-key]').forEach(r=>r.onclick=()=>{MF.q=r.dataset.key;$('#mq').value=MF.q;mvTable();$('#mtbl').scrollIntoView({behavior:'smooth',block:'start'});});
  $('#mg').onchange=e=>{MF.grupo=e.target.value;mvTable();};$('#mt').onchange=e=>{MF.tipo=e.target.value;mvTable();};$('#mo').onchange=e=>{MF.ot=e.target.value;mvTable();};
  $('#mq').oninput=e=>{MF.q=e.target.value;mvTable();};$('#mvw').onchange=e=>{MF.vista=e.target.value;mvTable();};
  v.querySelector('[data-clear]').onclick=()=>{Object.assign(MF,{grupo:'',tipo:'',ot:'',q:''});vMov();};mvTable();}
function mvTable(){const q=MF.q.trim().toLowerCase();
  const rows=D.mv.filter(m=>(!MF.grupo||m.Grupo===MF.grupo)&&(!MF.tipo||m.Tipo_movimiento===MF.tipo)&&(!MF.ot||m.Clase_OT===MF.ot)
    &&(!q||[m.Material,m['Texto breve de material'],m['Dest.mercancía'],m.Referencia,m['Nombre del usuario']].some(x=>String(x??'').toLowerCase().includes(q))));
  if(MF.vista==='mat'){const g={};rows.forEach(m=>{const k=m.Material;const o=g[k]||(g[k]={Material:k,Descripcion:m['Texto breve de material'],UM:m['Un.medida de entrada'],Movs:0,Consumo:0,Gasto:0,Importe:0,Receptores:new Set(),Ultimo:''});
      o.Movs++;o.Consumo+=z(m.Consumo_neto);o.Gasto+=z(m.Costo_consumo);o.Importe+=z(m['Impte.mon.local']);if(m['Dest.mercancía'])o.Receptores.add(m['Dest.mercancía']);if(m['Fe.contabilización']>o.Ultimo)o.Ultimo=m['Fe.contabilización'];});
    const arr=Object.values(g).map(o=>Object.assign(o,{Receptores:[...o.Receptores].slice(0,4).join(', ')+(o.Receptores.size>4?' …':''),Stock:D.byMat[o.Material]?.Stock??null}));
    makeTable($('#mtbl'),[{k:'Material',h:'Material',cls:'code'},{k:'Descripcion',h:'Descripción',cls:'desc'},{k:'UM',h:'UM'},{k:'Movs',h:'Movs.',num:1},
      {k:'Consumo',h:'Consumo neto',num:1,f:o=>num(o.Consumo||null)},{k:'Gasto',h:'Gasto (S/)',num:1,f:o=>money(o.Gasto)},{k:'Importe',h:'Importe neto (S/)',num:1,tip:'Suma con signo de todos los movimientos filtrados',f:o=>money(o.Importe)},
      {k:'Stock',h:'Stock hoy',num:1,f:o=>num(o.Stock)},{k:'Ultimo',h:'Último',f:o=>fdate(o.Ultimo)},{k:'Receptores',h:'Receptores',cls:'desc'}],arr,{sort:{k:MF.grupo==='Consumo'?'Gasto':'Movs',d:'desc'},onRow:o=>D.byMat[o.Material]&&openSheet(o.Material),unit:'materiales'});}
  else makeTable($('#mtbl'),[{k:'Fe.contabilización',h:'Fecha',f:o=>fdate(o['Fe.contabilización'])},{k:'Clase de movimiento',h:'Mov.',cls:'code'},{k:'Tipo_movimiento',h:'Tipo'},
      {k:'Material',h:'Material',cls:'code'},{k:'Texto breve de material',h:'Descripción',cls:'desc'},{k:'Ctd.en UM entrada',h:'Cantidad',num:1,f:o=>num(o['Ctd.en UM entrada'])+' '+esc(o['Un.medida de entrada']||'')},
      {k:'Impte.mon.local',h:'Importe (S/)',num:1,f:o=>money(o['Impte.mon.local'])},
      {k:'Almacén',h:'Alm.',cls:'code'},{k:'Dest.mercancía',h:'Receptor'},{k:'Referencia',h:'Referencia'},{k:'Pedido',h:'Pedido',cls:'code'},{k:'Clase_OT',h:'Clase OT'}],rows,{sort:{k:'Fe.contabilización',d:'desc'},onRow:o=>D.byMat[o.Material]&&openSheet(o.Material),unit:'movimientos'});}

/* ================= EQUIPOS ================= */
const EF={sel:store.eq||null,q:'',riego:'Sí',per:'temp'};
function otsScope(){return D.ot.filter(o=>EF.per==='all'||(o['Fecha de creación']||'')>=D.meta.inicio_temporada);}
function vEq(){const v=$('#v-eq');const ots=otsScope();
  const eqs={};ots.forEach(o=>{if(EF.riego&&o.Equipo_riego!==EF.riego)return;const e=eqs[o.Equipo]||(eqs[o.Equipo]={id:o.Equipo,n:o['Denominación de objeto técnico']||o.Equipo,u:o['Denominación de la ubicación técnica']||'',ots:0,c:0,om01:0,om03:0});
    e.ots++;e.c+=z(o['Costes tot.reales']);if(o['Clase de orden']==='OM01')e.om01++;if(o['Clase de orden']==='OM03')e.om03++;});
  const list=Object.values(eqs).sort((a,b)=>b.c-a.c);if(!EF.sel||!eqs[EF.sel])EF.sel=list[0]?.id||null;
  v.innerHTML=`<div class="eqlay"><div class="eqlist">
      <div class="seltog" role="group" aria-label="Periodo"><button data-p="temp" aria-pressed="${EF.per==='temp'}">Temporada ${esc(D.meta.temporada)}</button><button data-p="all" aria-pressed="${EF.per==='all'}">Todo el export IW39</button></div>
      <div class="seltog" role="group" aria-label="Equipos"><button data-r="Sí" aria-pressed="${EF.riego==='Sí'}">Equipos de riego (IH08)</button><button data-r="" aria-pressed="${EF.riego===''}">Todos</button></div>
      <input type="search" id="eqq" placeholder="Buscar equipo" value="${esc(EF.q)}" aria-label="Buscar equipo">
      <div class="eqitems" id="eqitems"></div><div class="note">${nf0.format(list.length)} equipos con OT · ordenados por costo real</div></div>
    <div id="eqdet" style="display:flex;flex-direction:column;gap:16px;min-width:0"></div></div>`;
  const drawList=()=>{const q=EF.q.trim().toLowerCase();$('#eqitems').innerHTML=list.filter(e=>!q||(e.n+' '+e.id+' '+e.u).toLowerCase().includes(q)).map(e=>`<button class="eqi" data-id="${esc(e.id)}" aria-current="${e.id===EF.sel}"><span class="nm">${esc(e.n)}</span><span class="c">${money(e.c)||'S/ 0'}</span><span class="sub">${esc(e.id)} · ${e.ots} OT · ${e.om01} OM01 · ${e.om03} OM03</span></button>`).join('')||'<div class="note" style="padding:12px">Sin equipos.</div>';
    $('#eqitems').querySelectorAll('.eqi').forEach(b=>b.onclick=()=>{EF.sel=b.dataset.id;remember('eq',EF.sel);drawList();eqDetail(ots);});};
  v.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{EF.per=b.dataset.p;vEq();});v.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{EF.riego=b.dataset.r;vEq();});
  $('#eqq').oninput=e=>{EF.q=e.target.value;drawList();};drawList();eqDetail(ots);}
function eqDetail(ots){const host=$('#eqdet');const os=ots.filter(o=>o.Equipo===EF.sel);
  if(!os.length){host.innerHTML='<div class="card"><div class="note">Elige un equipo de la lista.</div></div>';return;}
  const o0=os[0];const cost=os.reduce((a,o)=>a+z(o['Costes tot.reales']),0);const c=k=>os.filter(o=>o['Clase de orden']===k).length;
  const ordSet=new Set(os.map(o=>o.Orden));const mats=D.res.filter(r=>ordSet.has(r.Orden));
  const mg=sumBy(mats,r=>r.Material,r=>z(r.Reservado)).map(([m,q])=>({m,q,d:(D.byMat[m]?.Descripcion)||(mats.find(x=>x.Material===m)||{})['Texto breve de material']||'',um:(mats.find(x=>x.Material===m)||{}).UM||'',c:q*D.price(m)})).sort((a,b)=>b.c-a.c);
  const months={};os.forEach(o=>{const k=(o['Fecha de creación']||'').slice(0,7);if(k)months[k]=(months[k]||0)+z(o['Costes tot.reales']);});
  const mk=Object.keys(months).sort();const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  host.innerHTML=`<div class="eqhd"><div class="muted" style="font-family:var(--f-mono);font-size:.8rem">Equipo ${esc(o0.Equipo)} · ${esc(o0['Ubicación técnica']||'')}</div><h2>${esc(o0['Denominación de objeto técnico']||o0.Equipo)}</h2><div class="note">${esc(o0['Denominación de la ubicación técnica']||'')}</div></div>
    <div class="tiles" style="--n:4">
      <div class="tile"><span class="v">${os.length}</span><span class="l">Órdenes creadas</span><span class="s">${EF.per==='temp'?'Esta temporada':'Todo el export'}</span></div>
      <div class="tile"><span class="v" style="color:var(--crit)">${c('OM01')}</span><span class="l">Correctivas OM01</span></div>
      <div class="tile"><span class="v" style="color:var(--ok)">${c('OM03')}</span><span class="l">Preventivas OM03</span></div>
      <div class="tile"><span class="v">${penC.format(cost)}</span><span class="l">Costo real de las OT</span><span class="s">IW39 · costes totales reales</span></div></div>
    <div class="card"><h3>Costo real por mes <small>según fecha de creación de la OT</small></h3>${columns(mk.map(k=>({lab:MES[+k.slice(5,7)-1]+' '+k.slice(2,4),v:months[k],tip:`${MES[+k.slice(5,7)-1]} ${k.slice(0,4)}<br>${pen.format(months[k])} · ${os.filter(o=>(o['Fecha de creación']||'').startsWith(k)).length} OT`})),{label:'Costo por mes',W:960})}</div>
    <div class="card"><h3>Materiales en las OT del equipo <small>reservas IW13 · costo estimado con precio del stock</small></h3><div id="eqmat"></div></div>
    <div class="card"><h3>Órdenes</h3><div id="eqot"></div></div>`;
  makeTable($('#eqmat'),[{k:'m',h:'Material',cls:'code'},{k:'d',h:'Descripción',cls:'desc'},{k:'q',h:'Cantidad',num:1,f:o=>num(o.q)+' '+esc(o.um)},{k:'c',h:'Costo est. (S/)',num:1,f:o=>money(o.c)}],mg,{sort:{k:'c',d:'desc'},onRow:o=>D.byMat[o.m]&&openSheet(o.m),unit:'materiales',limit:15});
  makeTable($('#eqot'),[{k:'Clase de orden',h:'Clase',f:o=>clsPill(o['Clase de orden'])},{k:'Orden',h:'Orden',cls:'code'},{k:'Texto breve',h:'Descripción',cls:'desc'},{k:'Fecha de creación',h:'Creada',f:o=>fdate(o['Fecha de creación'])},{k:'Status de usuario',h:'Status'},{k:'Costes tot.reales',h:'Costo real (S/)',num:1,f:o=>money(o['Costes tot.reales'])}],os,{sort:{k:'Fecha de creación',d:'desc'},unit:'órdenes',limit:20});}
const clsPill=c=>c?`<span class="pill ${c==='OM01'?'p-Quiebre':c==='OM03'?'p-OK':'p-En'}">${esc(c)}</span>`:'<span class="muted">Sin OT</span>';

/* ================= RESERVAS OT ================= */
const RF={clase:'',riego:'',q:''};
function vRes(){const v=$('#v-res');
  const g={};D.res.forEach(r=>{const k=r.Orden||'(sin orden)';const o=g[k]||(g[k]={Orden:r.Orden,Clase_OT:r.Clase_OT,Texto_OT:r.Texto_OT,Fecha:r.Fecha_creacion_OT,Status:r.Status_usuario_OT,Equipo:r.Equipo,EqN:r.Equipo_denominacion,Riego:r.Equipo_riego,items:[],Pend:0,Costo:0});
    o.items.push(r);o.Costo+=z(r.Pendiente_retirar)*D.price(r.Material);if(z(r.Pendiente_retirar)>0)o.Pend++;});
  const ords=Object.values(g);const cnt={};ords.forEach(o=>cnt[o.Clase_OT||'Sin OT']=(cnt[o.Clase_OT||'Sin OT']||0)+1);
  const cl=[['OM01','Correctivas','--crit'],['OM03','Preventivas','--ok'],['OM02','OM02','--info'],['OM04','OM04','--accent']];
  v.innerHTML=`<div class="tiles" style="--n:4">${cl.map(c=>`<button class="tile step" data-c="${c[0]}" style="--c:var(${c[2]})"><span class="v">${nf0.format(cnt[c[0]]||0)}</span><span class="l">Órdenes ${c[0]} · ${c[1]}</span></button>`).join('')}</div>
  ${toolbar(1,`<input type="search" id="rq" placeholder="Buscar orden, material o equipo" value="${esc(RF.q)}" aria-label="Buscar reserva">
    <select id="rr" aria-label="Equipo de riego">${opts([['Sí','Solo equipos de riego (IH08)'],['No','Fuera de la lista IH08']],RF.riego,'Todos los equipos')}</select>`)}
  <div class="note">Una fila por orden con sus materiales reservados (IW13). Toca una orden para ver sus materiales. La clase sale de IW39 o del prefijo del número: 600 = OM01, 630 = OM03, 640 = OM04, 620 = OM02.</div>
  <div id="rtbl"></div>`;
  const sync=()=>v.querySelectorAll('[data-c]').forEach(k=>k.setAttribute('aria-pressed',String(k.dataset.c===RF.clase)));
  v.querySelectorAll('[data-c]').forEach(k=>k.onclick=()=>{RF.clase=RF.clase===k.dataset.c?'':k.dataset.c;sync();draw();});
  $('#rq').oninput=e=>{RF.q=e.target.value;draw();};$('#rr').onchange=e=>{RF.riego=e.target.value;draw();};
  v.querySelector('[data-clear]').onclick=()=>{Object.assign(RF,{clase:'',riego:'',q:''});vRes();};
  function draw(){const q=RF.q.trim().toLowerCase();
    const rows=ords.filter(o=>(!RF.clase||o.Clase_OT===RF.clase)&&(!RF.riego||o.Riego===RF.riego)&&(!q||[o.Orden,o.Texto_OT,o.Equipo,o.EqN].some(x=>String(x??'').toLowerCase().includes(q))||o.items.some(r=>[r.Material,r['Texto breve de material']].some(x=>String(x??'').toLowerCase().includes(q)))));
    makeTable($('#rtbl'),[{k:'Clase_OT',h:'Clase',f:o=>clsPill(o.Clase_OT)},{k:'Orden',h:'Orden',cls:'code',f:o=>esc(o.Orden||'(sin orden)')},{k:'Texto_OT',h:'Descripción OT',cls:'desc'},
      {k:'Fecha',h:'Creada',f:o=>fdate(o.Fecha)},{k:'EqN',h:'Equipo',cls:'desc',f:o=>esc(o.EqN||o.Equipo||'')},{k:'Riego',h:'Riego'},
      {k:'n',h:'Materiales',num:1,v:o=>o.items.length,f:o=>o.items.length},{k:'Pend',h:'Con pendiente',num:1},{k:'Costo',h:'Costo est. (S/)',num:1,f:o=>money(o.Costo)},{k:'Status',h:'Status'}],
      rows,{sort:{k:'Orden',d:'desc'},unit:'órdenes',sub:o=>`<table><thead><tr><th>Material</th><th>Descripción</th><th class="num">Reservado</th><th class="num">Tomado</th><th class="num">Pendiente</th><th class="num">Stock hoy</th><th class="num">Costo est.</th></tr></thead><tbody>${o.items.map(r=>`<tr><td class="code">${esc(r.Material||'')}</td><td class="desc">${esc(r['Texto breve de material']||'')}</td><td class="num">${num(r.Reservado)} ${esc(r.UM||'')}</td><td class="num">${num(r.Tomados)}</td><td class="num">${num(r.Pendiente_retirar)}</td><td class="num">${num(D.byMat[r.Material]?.Stock)}</td><td class="num">${money(z(r.Pendiente_retirar)*D.price(r.Material))}</td></tr>`).join('')}</tbody></table>`});}
  sync();draw();}

/* ================= material sheet ================= */
function openSheet(mat){const t=D.byMat[mat];if(!t)return;const sh=$('#sheet');
  const seasons=[['23/24',t.Cons_2023_2024],['24/25',t.Cons_2024_2025],['25/26',t.Cons_2025_2026],[D.meta.temporada.replace(/20(\d\d)\/20(\d\d)/,'$1/$2')+' (en curso)',t.Cons_temporada_actual]];
  const scale=Math.max(z(t.Maximo)*1.2,z(t.Stock)*1.05,1);
  const sps=D.sp.filter(s=>s.Material===mat).sort((a,b)=>(b['Fecha de solicitud']||'').localeCompare(a['Fecha de solicitud']||'')).slice(0,8);
  const mvs=D.mv.filter(m=>m.Material===mat).slice(0,10);const rs=D.res.filter(r=>r.Material===mat&&z(r.Pendiente_retirar)>0).slice(0,8);
  const gasto=D.mv.filter(m=>m.Material===mat).reduce((a,m)=>a+z(m.Costo_consumo),0);
  sh.innerHTML=`<div class="hd"><div><div class="muted" style="font-family:var(--f-mono)">${esc(mat)} · ${esc(t.UM||'')}${t.Precio_unit?` · ${pen.format(t.Precio_unit)} c/u`:''}</div><h2>${esc(t.Descripcion||'')}</h2><div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">${pill(t.Estado)}${dem(t.Tipo_demanda)}</div></div><button class="btn" id="shx" type="button">Cerrar</button></div>
  <div><h4>Stock frente a mínimo y máximo</h4><div class="gauge"><div class="fill" style="width:${Math.min(100,z(t.Stock)/scale*100)}%"></div>
    ${z(t.Minimo)>0?`<div class="mk" style="left:${z(t.Minimo)/scale*100}%" title="Mínimo"></div><div class="mk" style="left:${Math.min(99.5,z(t.Maximo)/scale*100)}%;opacity:.45" title="Máximo"></div>`:''}</div>
    <div class="gauge-l"><span>Stock ${num(t.Stock)}</span><span>Mín ${num(t.Minimo)}${z(t.Minimo_manual)>0?' (manual)':''}</span><span>Máx ${num(t.Maximo)}</span></div></div>
  <div class="facts">
    <div class="fact"><div class="v">${num(t.Prom_mensual_ajustado)}</div><div class="l">Prom. mensual ajustado</div></div>
    <div class="fact"><div class="v">${num(t.Prom_mensual_simple)}</div><div class="l">Prom. mensual simple</div></div>
    <div class="fact"><div class="v">${t.Cobertura_meses==null?'—':nf.format(t.Cobertura_meses)+' m'}</div><div class="l">Cobertura</div></div>
    <div class="fact"><div class="v">${num(t.Pend_en_transito)}</div><div class="l">OC en tránsito</div></div>
    <div class="fact"><div class="v">${num(t.Pend_sin_OC)}</div><div class="l">SOLPED sin OC</div></div>
    <div class="fact"><div class="v">${num(t.Cant_sugerida_pedir)}</div><div class="l">Sugerido pedir</div></div>
    <div class="fact"><div class="v">${t.Meses_con_consumo??0}/36</div><div class="l">Meses con consumo</div></div>
    <div class="fact"><div class="v">${t.Pico_pct==null?'—':Math.round(t.Pico_pct*100)+'%'}</div><div class="l">Peso del mes pico</div></div>
    <div class="fact"><div class="v">${penC.format(gasto)}</div><div class="l">Gasto esta temporada</div></div></div>
  <div><h4>Consumo por temporada</h4>${hbars(seasons.map(s=>({n:s[0],v:Math.max(0,z(s[1])),c:s[0].includes('curso')?'--warn-bar':null})),{fmt:v=>num(v)+' '+esc(t.UM||'')})}
    <div class="note" style="margin-top:6px">Semana ${seasonWeek()} de 52 de la temporada en curso. Almacenes con stock: ${esc(t.Almacenes_con_stock||'ninguno')}.</div></div>
  <div><h4>SOLPED y pedidos</h4>${sps.length?`<table class="mini"><tr><th>Fecha</th><th>SOLPED</th><th class="num">Cant.</th><th>OC</th><th>Estado</th></tr>${sps.map(s=>`<tr><td>${fdate(s['Fecha de solicitud'])}</td><td class="code">${esc(s['Solicitud de pedido'])}</td><td class="num">${num(s['Cantidad solicitada'])}</td><td class="code">${esc(s.Pedido||'')}</td><td>${spill(s.Estado)}</td></tr>`).join('')}</table>`:'<div class="note">Sin SOLPED en el export ME5A.</div>'}</div>
  <div><h4>Reservas en OT pendientes</h4>${rs.length?`<table class="mini"><tr><th>Clase</th><th>Orden</th><th>OT</th><th class="num">Pend.</th></tr>${rs.map(r=>`<tr><td>${clsPill(r.Clase_OT)}</td><td class="code">${esc(r.Orden||'')}</td><td>${esc(r.Texto_OT||'')}</td><td class="num">${num(r.Pendiente_retirar)}</td></tr>`).join('')}</table>`:'<div class="note">Sin reservas pendientes.</div>'}</div>
  <div><h4>Últimos movimientos de la temporada</h4>${mvs.length?`<table class="mini"><tr><th>Fecha</th><th>Tipo</th><th class="num">Cant.</th><th class="num">S/</th><th>Receptor</th></tr>${mvs.map(m=>`<tr><td>${fdate(m['Fe.contabilización'])}</td><td>${esc(m.Tipo_movimiento)}</td><td class="num">${num(m['Ctd.en UM entrada'])}</td><td class="num">${money(m['Impte.mon.local'])}</td><td>${esc(m['Dest.mercancía']||'')}</td></tr>`).join('')}</table>`:'<div class="note">Sin movimientos esta temporada.</div>'}</div>`;
  sh.hidden=false;$('#scrim').hidden=false;$('#shx').focus();$('#shx').onclick=closeSheet;}
function closeSheet(){$('#sheet').hidden=true;$('#scrim').hidden=true;}
$('#scrim').onclick=closeSheet;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});

/* ================= tabs ================= */
const VIEWS={stock:vStock,solped:vSolped,mov:vMov,eq:vEq,res:vRes};
function show(tab){if(!VIEWS[tab])tab='stock';document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  Object.keys(VIEWS).forEach(k=>$('#v-'+k).hidden=k!==tab);VIEWS[tab]();remember('tab',tab);}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>show(b.dataset.tab));
function renderAll(){header();show((location.hash||'').slice(1)||store.tab||'stock');}
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
