/* Huincha — emplazamiento exacto y obras proyectadas.
   - Norte: si el del mapa y el de la brújula no coinciden, pregunta cuál usar.
   - Cada construcción y elemento del terreno se ubica con su distancia a los deslindes, y se acota en el plano.
   - Terminado el levantamiento se pueden proyectar construcciones nuevas (ampliación, quincho, piscina…):
     se dibujan distintas en planos y 3D y se cubican aparte. */
"use strict";
/* ---------- norte ---------- */
const angDif=(a,b)=>{const d=Math.abs(((a-b)%360+540)%360-180);return d};
function norteConflicto(){const lo=P.lote;return lo.norteMapa!=null&&lo.norteBru!=null&&!lo.norteElegido&&angDif(lo.norteMapa,lo.norteBru)>20}
function norteCardHTML(){if(!norteConflicto())return'';const lo=P.lote;
  return`<div class="card warn" id="norteconf"><h3>El norte no coincide</h3><p class="note">El mapa indica ${fmt(lo.norteMapa,0)}° y la brújula del teléfono marcó ${fmt(lo.norteBru,0)}° (diferencia de ${fmt(angDif(lo.norteMapa,lo.norteBru),0)}°). La brújula se desvía cerca de rejas, autos o muros con fierro; el mapa suele ser más exacto si las esquinas se marcaron bien.</p>
    <div class="row"><button class="btn pri" data-nor="mapa">Usar el del mapa (${fmt(lo.norteMapa,0)}°)</button><button class="btn" data-nor="bru">Usar el de la brújula (${fmt(lo.norteBru,0)}°)</button></div></div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-nor]');if(!b)return;const lo=P.lote;lo.norte=Math.round(b.dataset.nor==='mapa'?lo.norteMapa:lo.norteBru);lo.norteOk=true;lo.norteElegido=b.dataset.nor;persist();const y=window.scrollY;render();window.scrollTo(0,y);toast(`Norte fijado en ${lo.norte}°.`)});

/* ---------- geometría en coordenadas del terreno ---------- */
const elAreaM2=e=>{const T=eltOf(e);if(T.k==='linea')return 0;if(T.k==='punto')return Math.PI*Math.pow((+e.w||1)/2,2);const f=elFoot(e);let a=0;for(let i=0;i<f.length;i++){const p=f[i],q=f[(i+1)%f.length];a+=p[0]*q[1]-q[0]*p[1]}return Math.abs(a)/2};
function elLote(e){const c=P.casa,ox=+c.retiroIzq||0,oy=+c.retiroFrontal||0;const T=eltOf(e);const pts=T.k==='linea'?[e.a,e.b]:T.k==='punto'?[[e.x-(+e.w||1)/2,e.y-(+e.w||1)/2],[e.x+(+e.w||1)/2,e.y+(+e.w||1)/2]]:elFoot(e);return pts.map(p=>[p[0]+ox,p[1]+oy])}
function segCerca(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy||1;let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2;t=Math.max(0,Math.min(1,t));return[a[0]+t*dx,a[1]+t*dy]}
/* distancia más corta de un elemento a los deslindes: {d, p (en el elemento), q (en el deslinde), lado} */
function elDeslinde(e){const LP=lotPoly();if(!LP)return null;let best=null;for(const p of elLote(e))LP.forEach((a,i)=>{const b=LP[(i+1)%LP.length],q=segCerca(p,a,b),d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(!best||d<best.d)best={d,p,q,lado:i}});return best}
const esConstruccion=e=>{const T=eltOf(e);return T.k==='vol'||e.t==='piscina'||e.t==='fosa'||e.t==='pozoAbs'||e.proy};
/* cotas a deslindes en el emplazamiento (X,Y en coordenadas del terreno) */
function elemCotasSVG(X,Y,s,fs){let h='';for(const e of P.elementos||[]){if(!esConstruccion(e))continue;const b=elDeslinde(e);if(!b||b.d<.3)continue;
    const [x1,y1,x2,y2]=[X(b.p[0]),Y(b.p[1]),X(b.q[0]),Y(b.q[1])];const col=e.proy?'#d9480f':'#1b1e20';
    h+=`<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" style="stroke:${col};stroke-width:.25"/><circle cx="${r2(x1)}" cy="${r2(y1)}" r=".5" style="fill:${col}"/><circle cx="${r2(x2)}" cy="${r2(y2)}" r=".5" style="fill:${col}"/>`;
    h+=`<text x="${r2((x1+x2)/2+fs*.4)}" y="${r2((y1+y2)/2-fs*.3)}" font-size="${r2(fs*.72)}" class="tx mono" style="fill:${col}">${fmt(b.d)}</text>`}return h}

/* ---------- superficie y cubicación de construcciones del terreno ---------- */
function obrasSup(proy){return(P.elementos||[]).filter(e=>!!e.proy===!!proy&&(eltOf(e).k==='vol'||e.t==='terraza'||e.t==='deck')).reduce((t,e)=>t+elAreaM2(e),0)}
function obrasCubica(){const rows=[];for(const e of P.elementos||[]){const T=eltOf(e);if(!(T.k==='vol'||e.t==='piscina'||(e.proy&&T.k==='area')))continue;const A=elAreaM2(e);if(!(A>0))continue;const pre=(e.proy?'Proyectado':'Existente')+' · '+elNombre(e);
    if(T.k==='vol'){const f=elFoot(e);let per=0;for(let i=0;i<f.length;i++){const p=f[i],q=f[(i+1)%f.length];per+=Math.hypot(q[0]-p[0],q[1]-p[1])}const h=+e.h||T.h||2.4;
      rows.push([pre+': superficie','m²',A]);if(e.proy){rows.push([pre+': radier o fundación (e = 10 cm)','m³',A*.1]);if(T.edif||['bodega','quincho','galpon'].includes(e.t))rows.push([pre+': muros perimetrales','m²',per*Math.min(h,2.6)]);rows.push([pre+': cubierta (con aleros y pendiente)','m²',A*1.18])}}
    else if(e.t==='piscina'){const d=piscDims(e),f=elFoot(e);let per=0;for(let i=0;i<f.length;i++){const p=f[i],q=f[(i+1)%f.length];per+=Math.hypot(q[0]-p[0],q[1]-p[1])}
      rows.push([pre+': espejo de agua ('+piscMed(e)+')','m²',A]);rows.push([pre+': volumen de agua','m³',A*d.prom]);rows.push([pre+': revestimiento de fondo y muros','m²',A+per*d.prom]);rows.push([pre+': borde o coronamiento','ml',per]);
      if(e.proy){rows.push([pre+': excavación','m³',A*(d.prom+.2)*1.1]);rows.push([pre+': hormigón de radier y muros (e = 15 cm)','m³',(A+per*d.prom)*.15])}}
    else rows.push([pre+': superficie','m²',A])}
  return rows}

/* ---------- proyectar construcciones nuevas ---------- */
const PROY_TIPOS=['edificacion','quincho','cobertizo','carport','bodega','terraza','piscina','radier','pergola','estacionamiento','deck','fosa'];
function proyHTML(){const L=(P.elementos||[]).filter(e=>e.proy);
  return`<div class="card" id="proy"><div class="row sb"><h3>Construcciones proyectadas</h3><span class="lbl">${L.length?L.length+' proyectada'+(L.length>1?'s':''):'Para ampliar o construir'}</span></div>
    <p class="note">Con el terreno ya levantado, agrega lo que se quiere construir: aparece en rojo en el emplazamiento, transparente en el 3D, y se cubica aparte de lo existente.</p>
    <div class="chips">${PROY_TIPOS.map(k=>`<button class="chip" data-elproy="${k}">+ ${k==='edificacion'?'Ampliación':ELT[k].n}</button>`).join('')}</div>
    ${L.length?'<p class="note">Ajusta medidas y posición en la lista de elementos del terreno, arriba.</p>':''}</div>`}
/* lugar libre del terreno para una construcción nueva: detrás de la casa, si cabe */
function proyLugar(w,l){const c=P.casa,W=+c.ancho||8,L=+c.largo||8,LP=lotPoly();const ox=+c.retiroIzq||0,oy=+c.retiroFrontal||0;
  const bb=typeof houseVolBox==='function'&&W>0?houseVolBox():{x0:0,y0:0,x1:W,y1:L};
  const ocup=[[bb.x0,bb.y0,bb.x1,bb.y1],...(P.elementos||[]).filter(e=>eltOf(e).k!=='linea').map(e=>{const f=elFoot(e);return[Math.min(...f.map(p=>p[0])),Math.min(...f.map(p=>p[1])),Math.max(...f.map(p=>p[0])),Math.max(...f.map(p=>p[1]))]})];
  const libre=(x,y)=>ocup.every(([a,b,c2,d])=>x+w/2+.8<a||x-w/2-.8>c2||y+l/2+.8<b||y-l/2-.8>d);
  const dentro=(x,y)=>{if(!LP)return true;const pts=[[x-w/2,y-l/2],[x+w/2,y-l/2],[x+w/2,y+l/2],[x-w/2,y+l/2]].map(p=>[p[0]+ox,p[1]+oy]);return pts.every(p=>ptIn(p,LP))};
  const cand=[];for(let k=0;k<12;k++){const d=1.5+k*1.5;cand.push([W/2,bb.y1+d+l/2],[bb.x1+d+w/2,L/2],[bb.x0-d-w/2,L/2],[bb.x1+d+w/2,bb.y1+d+l/2],[bb.x0-d-w/2,bb.y1+d+l/2])}
  return cand.find(([x,y])=>dentro(x,y)&&libre(x,y))||cand.find(([x,y])=>dentro(x,y))||cand[0]}
function ptIn(p,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
document.addEventListener('click',e=>{const b=e.target.closest('[data-elproy]');if(!b||document.getElementById('vivo'))return;const k=b.dataset.elproy,T=ELT[k];
  const w=k==='edificacion'?4:T.w||3,l=k==='edificacion'?4:T.l||3;const [x,y]=proyLugar(w,l);const el=elemNew(k,[x,y],[1,0]);el.w=w;el.l=l;el.proy=true;el.est=false;if(k==='edificacion'){el.nombre='Ampliación';el.pisos=1;el.techo='una_agua';el.h=2.5}
  (P.elementos=P.elementos||[]).push(el);persist();const yy=window.scrollY;render();window.scrollTo(0,yy);toast(`${elNombre(el)} proyectada. Ajusta sus medidas y su distancia a los deslindes.`)});

/* ---------- ubicación de un elemento por su distancia al deslinde izquierdo y a la calle ---------- */
function elPosLote(e){const pts=elLote(e);return[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1]))]}
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset?.elpos||document.getElementById('vivo'))return;const [id,ax]=t.dataset.elpos.split(':');const el=(P.elementos||[]).find(x=>x.id===id);const v=num(t.value);if(!el||!(v>=0))return;
  const cur=elPosLote(el);elMove(el,ax==='x'?v-cur[0]:0,ax==='y'?v-cur[1]:0);el.est=false;persist();const y=window.scrollY;render();window.scrollTo(0,y)});

/* ---------- fundación y nivel de piso (casa sobre pilotes o poyos) ---------- */
const FUND={tipo:{lab:'Fundación de la casa',opts:{radier:'Radier sobre el suelo',zapata:'Cimiento corrido',pilotes:'Pilotes',poyos:'Poyos de hormigón',losa:'Losa'}},
  mat:{lab:'Material de los pilotes',si:f=>/pilotes|poyos/.test(f.tipo||''),opts:{impregnado:'Pino impregnado',hormigon:'Hormigón',acero:'Acero',roble:'Roble o nativo'}},
  sep:{lab:'Separación entre pilotes',si:f=>/pilotes|poyos/.test(f.tipo||''),opts:{'1.2':'1,20 m','1.5':'1,50 m','2':'2,00 m','2.5':'2,50 m'}}};
const nivelPiso=()=>Math.max(0,+P.casa.nivelPiso||0);
function fundHTML(){const f=P.fund=P.fund||{};const c=P.casa;
  return`<div class="card" id="fund"><h3>Fundación y nivel del piso</h3><p class="note">¿La casa está sobre el suelo o elevada sobre pilotes? Si hay escalones para entrar, la casa está elevada.</p>
    ${Object.entries(FUND).filter(([,d])=>!d.si||d.si(f)).map(([k,d])=>`<div class="fld tch"><span>${d.lab}</span><div class="chips">${Object.entries(d.opts).map(([v,l])=>`<button class="chip" data-fund="${k}:${v}" aria-pressed="${f[k]===v}">${l}</button>`).join('')}</div></div>`).join('')}
    <label class="fld"><span>Altura del piso sobre el terreno</span><div class="inp"><input data-fundn inputmode="decimal" value="${c.nivelPiso>0?String(c.nivelPiso).replace('.',','):''}" placeholder="0"><em>m</em></div></label>
    ${c.nivelPiso>0?`<p class="note">Se dibuja elevada en las elevaciones y el 3D${/pilotes|poyos/.test(f.tipo||'')?', con sus pilotes':''}. Recuerda registrar la escalera de acceso.</p>`:''}</div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-fund]');if(!b)return;const [k,v]=b.dataset.fund.split(':');const f=P.fund=P.fund||{};f[k]=f[k]===v?null:v;persist();const y=window.scrollY;render();window.scrollTo(0,y)});
document.addEventListener('change',e=>{if(e.target.dataset?.fundn==null)return;const v=num(e.target.value);P.casa.nivelPiso=v>0?Math.round(v*100)/100:0;persist();const y=window.scrollY;render();window.scrollTo(0,y)});
/* ubicación de los pilotes bajo la casa (grilla con la separación indicada) */
function pilotesCasa(){const f=P.fund||{},c=P.casa;if(!/pilotes|poyos/.test(f.tipo||'')||!(c.ancho>0&&c.largo>0))return[];const s=+f.sep||1.5;const nx=Math.max(1,Math.round(c.ancho/s)),ny=Math.max(1,Math.round(c.largo/s));const out=[];
  for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++)out.push([c.ancho*i/nx,c.largo*j/ny]);return out}
function fundCubica(){const f=P.fund||{},rows=[];const pl=pilotesCasa();if(pl.length){const h=nivelPiso()+(f.tipo==='poyos'?.6:1);rows.push([`${f.tipo==='poyos'?'Poyos':'Pilotes'}${f.mat?' de '+FUND.mat.opts[f.mat].toLowerCase():''} (bajo la casa)`,'un',pl.length]);if(f.tipo==='pilotes')rows.push(['Pilotes: largo total (enterrado + a la vista)','ml',pl.length*h]);else rows.push(['Hormigón de poyos (0,3 × 0,3 m)','m³',pl.length*.09*h])}
  for(const e of P.elementos||[])if(e.t==='pilote')rows.push([elNombre(e)+' (terreno)','un',+e.n||1]);
  const esc=(P.elementos||[]).filter(e=>e.t==='escalera');for(const e of esc){const n=+e.peld||Math.max(1,Math.round((+e.h||1)/.18));rows.push([`${elNombre(e)}: ${n} peldaños de ${fmt(e.w,2)} m`,'un',n])}
  for(const e of P.elementos||[])if(e.t==='altillo'||e.t==='balcon')rows.push([`${elNombre(e)}: superficie de piso`,'m²',(+e.w||0)*(+e.l||0)]);
  const bar=(P.elementos||[]).filter(e=>e.t==='baranda').reduce((t,e)=>t+elLen(e),0);if(bar)rows.push(['Barandas','ml',bar]);
  return rows}
function fundSpec(){const f=P.fund||{};if(!f.tipo&&!(P.casa.nivelPiso>0))return[];return[['Fundación',[f.tipo?FUND.tipo.opts[f.tipo]:'',f.mat?FUND.mat.opts[f.mat].toLowerCase():'',f.sep?'a '+FUND.sep.opts[f.sep]:'',P.casa.nivelPiso>0?'piso a '+fmt(P.casa.nivelPiso)+' m sobre el terreno':''].filter(Boolean).join(', ')]]}
