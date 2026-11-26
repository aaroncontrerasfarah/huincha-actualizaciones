/* Huincha — cuerpos de la casa: el cuerpo principal (P.casa: ancho × largo) más alas rectangulares (P.casa.alas)
   que forman casas en L, U o T, alas sobre pilotes (hBase > 0) y partes con otra altura o techo.
   Un ala en el suelo se une a la casa: sus muros exteriores salen del contorno conjunto y no hay muro doble.
   Un ala elevada se dibuja como una parte propia (con pilotes) unida por puerta o escalera.

   conCasa(parte, fn) ejecuta fn como si la casa fuera solo esa parte (P.casa, P.recintos y P.vanos en coordenadas
   locales). Así cada ala reutiliza el mismo motor de techos, elevaciones, plantas y 3D del cuerpo principal. */
"use strict";
let CTXP=null;
const ALA_LADO={posterior:'Atrás',derecho:'A la derecha',izquierdo:'A la izquierda',frontal:'Adelante'};
const ALA_ALIN={inicio:'Al inicio',centro:'Al centro',fin:'Al final'};
function alaNueva(lado='posterior'){return{id:'a'+Math.random().toString(36).slice(2,8),nombre:'Ala',lado,alin:'fin',ancho:4,largo:4,alto:null,hBase:0,techo:null,cumbrera:null,hTecho:null,pisos:1}}
/* Rectángulo del ala en coordenadas de la casa (x a lo ancho del frente, y hacia el fondo) */
function alaRect(a){const c=P.casa,W=+c.ancho||0,L=+c.largo||0,w=+a.ancho||0,l=+a.largo||0;if(!(W>0&&L>0&&w>0&&l>0))return null;
  const hz=a.lado==='posterior'||a.lado==='frontal',span=hz?W:L,lw=hz?w:l,al=a.alin||'fin';
  const o=a.off!=null&&a.off!==''&&isFinite(+a.off)?+a.off:al==='inicio'?0:al==='centro'?(span-lw)/2:span-lw;
  if(a.lado==='posterior')return{x0:o,x1:o+w,y0:L,y1:L+l};if(a.lado==='frontal')return{x0:o,x1:o+w,y0:-l,y1:0};
  if(a.lado==='izquierdo')return{x0:-w,x1:0,y0:o,y1:o+l};return{x0:W,x1:W+w,y0:o,y1:o+l}}
function partes(){const c=P.casa,out=[{id:'main',main:true,x0:0,y0:0,x1:+c.ancho||0,y1:+c.largo||0,hBase:0}];
  if(CTXP)return out;
  for(const a of c.alas||[]){const r=alaRect(a);if(!r)continue;out.push(Object.assign({id:a.id,ala:a,hBase:Math.max(0,+a.hBase||0)},r))}return out}
const partesSuelo=()=>partes().filter(p=>p.main||!(p.hBase>.05));
const partesElevadas=()=>partes().filter(p=>!p.main&&p.hBase>.05);
const hayAlas=()=>!CTXP&&(P.casa.alas||[]).some(a=>alaRect(a));
/* parte a la que pertenece un recinto (por su centro) */
function parteDe(r){if(CTXP||!r)return'main';const cx=r.x+r.ancho/2,cy=r.y+r.largo/2;for(const p of partes())if(!p.main&&cx>p.x0&&cx<p.x1&&cy>p.y0&&cy<p.y1)return p.id;return'main'}
function dentroCasa(x,y){const e=1e-6;return partesSuelo().some(p=>x>=p.x0-e&&x<=p.x1+e&&y>=p.y0-e&&y<=p.y1+e)}
/* Casa virtual de una parte: hereda materiales y espesores; altura, techo y pendiente propios o iguales a la casa. */
function casaDeParte(p){const c=P.casa;if(p.main)return Object.assign({},c,{alas:[]});const a=p.ala,w=p.x1-p.x0,l=p.y1-p.y0;
  const techo=a.techo||c.techo||'dos-aguas',cum=a.cumbrera||(w>=l?'paralela':'perpendicular');
  /* misma pendiente que la casa si no se indicó la altura de cumbrera */
  const spM=c.techo==='un-agua'?(+c.largo||1):(c.cumbrera==='paralela'?(+c.largo||1)/2:(+c.ancho||1)/2),m=(+c.hTecho||0)/spM;
  const spA=techo==='un-agua'?l:techo==='cuatro-aguas'?Math.min(w,l)/2:(cum==='paralela'?l/2:w/2);
  return Object.assign({},c,{ancho:w,largo:l,altura:+a.alto||+c.altura||2.4,techo,cumbrera:cum,hTecho:a.hTecho!=null&&a.hTecho!==''?+a.hTecho:Math.round(m*spA*100)/100,
    pisos:Math.max(1,+a.pisos||1),nivelPiso:p.hBase||0,alas:[],retiroIzq:(+c.retiroIzq||0)+p.x0,retiroFrontal:(+c.retiroFrontal||0)+p.y0})}
function conCasa(p,fn){if(CTXP)return fn();if(p.main&&!hayAlas())return fn();
  const P0={casa:P.casa,recintos:P.recintos,vanos:P.vanos,volumenes:P.volumenes};
  const rs=P.recintos.filter(r=>valid(r)&&parteDe(r)===p.id).map(r=>Object.assign({},r,{x:r.x-p.x0,y:r.y-p.y0})),ids=new Set(rs.map(r=>r.id));
  const cv=casaDeParte(p);
  P.casa=cv;P.recintos=rs;P.vanos=(P.vanos||[]).filter(v=>ids.has(v.recinto));if(!p.main)P.volumenes=[];CTXP=p;
  try{return fn()}finally{P.casa=P0.casa;P.recintos=P0.recintos;P.vanos=P0.vanos;P.volumenes=P0.volumenes;CTXP=null}}
/* Contorno conjunto de rectángulos (casas en L, U, T): segmentos de borde exterior por eje.
   Devuelve [{ax:'h'|'v', c, a, b}] con a<b. */
function contornoRects(rs){const xs=[...new Set(rs.flatMap(r=>[r.x0,r.x1]).map(v=>Math.round(v*1e4)/1e4))].sort((a,b)=>a-b),ys=[...new Set(rs.flatMap(r=>[r.y0,r.y1]).map(v=>Math.round(v*1e4)/1e4))].sort((a,b)=>a-b);
  const dentro=(x,y)=>rs.some(r=>x>r.x0&&x<r.x1&&y>r.y0&&y<r.y1),out=[];
  for(let j=0;j<ys.length;j++)for(let i=0;i<xs.length-1;i++){const xm=(xs[i]+xs[i+1])/2,ab=j>0&&dentro(xm,(ys[j-1]+ys[j])/2),ar=j<ys.length-1&&dentro(xm,(ys[j]+ys[j+1])/2);if(ab!==ar)out.push({ax:'h',c:ys[j],a:xs[i],b:xs[i+1]})}
  for(let i=0;i<xs.length;i++)for(let j=0;j<ys.length-1;j++){const ym=(ys[j]+ys[j+1])/2,iz=i>0&&dentro((xs[i-1]+xs[i])/2,ym),de=i<xs.length-1&&dentro((xs[i]+xs[i+1])/2,ym);if(iz!==de)out.push({ax:'v',c:xs[i],a:ys[j],b:ys[j+1]})}
  return out}
/* polígono del contorno (para dibujar el emplazamiento): une los segmentos en un ciclo */
function contornoPoligono(rs){const seg=contornoRects(rs).map(s=>s.ax==='h'?[[s.a,s.c],[s.b,s.c]]:[[s.c,s.a],[s.c,s.b]]);if(!seg.length)return null;
  const k=p=>p[0].toFixed(4)+','+p[1].toFixed(4),adj=new Map();for(const [p,q] of seg){(adj.get(k(p))||adj.set(k(p),[]).get(k(p))).push(q);(adj.get(k(q))||adj.set(k(q),[]).get(k(q))).push(p)}
  const start=seg[0][0],out=[start];let prev=null,cur=start;for(let n=0;n<seg.length+2;n++){const nb=(adj.get(k(cur))||[]).filter(p=>!prev||k(p)!==k(prev));if(!nb.length)break;const nx=nb[0];if(k(nx)===k(start))break;out.push(nx);prev=cur;cur=nx}
  /* quitar vértices colineales */
  return out.filter((p,i)=>{const a=out[(i-1+out.length)%out.length],b=out[(i+1)%out.length];return Math.abs((p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0]))>1e-6})}
const areaAlas=()=>partes().filter(p=>!p.main).reduce((t,p)=>t+(p.x1-p.x0)*(p.y1-p.y0)*Math.max(1,+p.ala.pisos||1),0);

/* ---------- paso Casa: forma de la casa (cuerpos) ---------- */
const FORMAS_CASA=[['rect','Rectangular',[[0,0,6,4]]],['L','En L',[[0,0,6,4],[4,4,6,7]]],['U','En U',[[0,0,7,4],[0,4,2,7],[5,4,7,7]]],['T','En T',[[0,0,7,3],[2.5,3,4.5,7]]]];
function formaPicto(rs,on){const pts=contornoPoligono(rs.map(([x0,y0,x1,y1])=>({x0,y0,x1,y1})));return`<svg viewBox="-0.6 -0.6 8.2 8.2" width="44" height="44" aria-hidden="true"><polygon points="${pts.map(p=>p[0]+','+(7-p[1])).join(' ')}" fill="${on?'var(--accent,#F2B705)':'none'}" stroke="currentColor" stroke-width=".45" stroke-linejoin="round"/></svg>`}
function formaActual(){const al=(P.casa.alas||[]).filter(a=>!(+a.hBase>.05));if(!al.length)return'rect';if(al.length===1)return al[0].alin==='centro'?'T':'L';return al.length===2?'U':'otra'}
function setForma(k){const c=P.casa,W=+c.ancho||10,L=+c.largo||8;const elev=(c.alas||[]).filter(a=>+a.hBase>.05);const mk=(alin,ancho,largo)=>Object.assign(alaNueva('posterior'),{alin,ancho:Math.round(ancho*10)/10,largo:Math.round(largo*10)/10});
  const suelo=k==='L'?[mk('fin',W*.4,L*.6)]:k==='U'?[Object.assign(mk('inicio',W*.3,L*.6),{nombre:'Ala izquierda'}),Object.assign(mk('fin',W*.3,L*.6),{nombre:'Ala derecha'})]:k==='T'?[mk('centro',W*.35,L*.6)]:[];
  const prev=(c.alas||[]).filter(a=>!(+a.hBase>.05));suelo.forEach((a,i)=>{if(prev[i])Object.assign(a,{id:prev[i].id,nombre:prev[i].nombre||a.nombre,ancho:prev[i].ancho,largo:prev[i].largo})});
  c.alas=[...suelo,...elev]}
function formaCardHTML(){const c=P.casa,f=formaActual(),e=s=>String(s??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const opt=(o,v)=>Object.entries(o).map(([k,n])=>`<option value="${k}"${v===k?' selected':''}>${n}</option>`).join('');
  const num=(a,k,lab,hint,ph)=>`<label class="fld"><span>${lab}</span><div class="inp"><input data-ala="${a.id}" data-ak="${k}" inputmode="decimal" value="${a[k]!=null&&a[k]!==''&&+a[k]!==0||k==='ancho'||k==='largo'?String(a[k]??'').replace('.',','):''}" placeholder="${ph||''}"><em>m</em></div>${hint?`<small>${hint}</small>`:''}</label>`;
  const alaHTML=(a,i)=>`<div class="ala" data-alaid="${a.id}"><div class="row sb"><div class="inp" style="flex:1"><input data-ala="${a.id}" data-ak="nombre" value="${e(a.nombre)}" aria-label="Nombre del ala"></div><button class="btn sm ghost" data-alaquitar="${a.id}" aria-label="Quitar ${e(a.nombre)}">Quitar</button></div>
    <div class="g2"><label class="fld"><span>Dónde está</span><div class="inp sel"><select data-ala="${a.id}" data-ak="lado">${opt(ALA_LADO,a.lado)}</select></div></label><label class="fld"><span>Alineada</span><div class="inp sel"><select data-ala="${a.id}" data-ak="alin">${opt(ALA_ALIN,a.alin)}</select></div><small>Respecto del muro del cuerpo principal.</small></label></div>
    <div class="g2">${num(a,'ancho',a.lado==='posterior'||a.lado==='frontal'?'Ancho (a lo largo del muro)':'Fondo (hacia afuera)','Por fuera.')}${num(a,'largo',a.lado==='posterior'||a.lado==='frontal'?'Largo (hacia afuera)':'Largo (a lo largo del muro)','Por fuera.')}</div>
    <div class="g2">${num(a,'hBase','Altura del piso sobre el terreno','0 si está en el suelo; sobre pilotes, la altura bajo el piso.','0')}${num(a,'alto','Altura de muros','Si es distinta a la casa.',String(c.altura||2.4).replace('.',','))}</div>
    <div class="g2"><label class="fld"><span>Techo</span><div class="inp sel"><select data-ala="${a.id}" data-ak="techo"><option value="">Igual que la casa</option>${opt({'dos-aguas':'Dos aguas','cuatro-aguas':'Cuatro aguas','un-agua':'Un agua',plana:'Plano'},a.techo||'')}</select></div></label>${num(a,'hTecho','Altura de cumbrera','Vacío: misma pendiente que la casa.')}</div></div>`;
  const ps=partes(),b=ps.reduce((m,p)=>({x0:Math.min(m.x0,p.x0),y0:Math.min(m.y0,p.y0),x1:Math.max(m.x1,p.x1),y1:Math.max(m.y1,p.y1)}),{x0:0,y0:0,x1:+c.ancho||1,y1:+c.largo||1});
  const k=100/Math.max(b.x1-b.x0,b.y1-b.y0,1),X=x=>(x-b.x0)*k+6,Y=y=>(b.y1-y)*k+6,poly=contornoPoligono(partesSuelo());
  const prev=c.ancho>0&&c.largo>0?`<svg class="formaprev" viewBox="0 0 ${(b.x1-b.x0)*k+12} ${(b.y1-b.y0)*k+12}" role="img" aria-label="Contorno de la casa">${poly?`<polygon points="${poly.map(p=>X(p[0])+','+Y(p[1])).join(' ')}" class="fp-casa"/>`:''}${partesElevadas().map(p=>`<rect x="${X(p.x0)}" y="${Y(p.y1)}" width="${(p.x1-p.x0)*k}" height="${(p.y1-p.y0)*k}" class="fp-elev"/>`).join('')}${ps.map(p=>`<text x="${(X(p.x0)+X(p.x1))/2}" y="${(Y(p.y0)+Y(p.y1))/2}" class="fp-t">${p.main?'Principal':e(p.ala.nombre)}</text>`).join('')}<text x="${(X(0)+X(c.ancho))/2}" y="${Y(b.y0)+5}" class="fp-calle">calle ↓</text></svg>`:'';
  return`<div class="card" id="formacard"><h3>Forma de la casa</h3><p class="note">Mírala desde arriba. Elige la forma más parecida; después ajusta las medidas de cada ala. El cuerpo principal es el de la fachada a la calle.</p>
    <div class="formas" role="radiogroup" aria-label="Forma de la casa">${FORMAS_CASA.map(([kk,n,rs])=>`<button class="forma" role="radio" aria-checked="${f===kk}" data-forma="${kk}">${formaPicto(rs,f===kk)}<span>${n}</span></button>`).join('')}</div>
    ${prev}
    ${(c.alas||[]).map(alaHTML).join('')}
    <div class="row"><button class="btn sm" data-alanueva="suelo">+ Agregar ala</button><button class="btn sm" data-alanueva="elevada">+ Parte sobre pilotes</button></div>
    <p class="note">¿Un domo, quincho o terraza pegado a la casa? Agrégalo abajo en «Volúmenes especiales» con distancia 0.</p></div>`}
document.addEventListener('click',ev=>{const t=ev.target.closest('[data-forma],[data-alanueva],[data-alaquitar]');if(!t)return;const c=P.casa;c.alas=c.alas||[];
  if(t.dataset.forma)setForma(t.dataset.forma);
  else if(t.dataset.alanueva){const a=alaNueva(t.dataset.alanueva==='elevada'?'izquierdo':'posterior');if(t.dataset.alanueva==='elevada')Object.assign(a,{nombre:'Parte elevada',hBase:1.2,alin:'inicio',ancho:3,largo:4,techo:'un-agua'});c.alas.push(a)}
  else{const id=t.dataset.alaquitar;c.alas=c.alas.filter(a=>a.id!==id)}
  persist();const y=window.scrollY;render();window.scrollTo(0,y)});
document.addEventListener('change',ev=>{const t=ev.target;if(!t.dataset?.ala)return;const a=(P.casa.alas||[]).find(x=>x.id===t.dataset.ala);if(!a)return;const k=t.dataset.ak;
  if(['ancho','largo','hBase','alto','hTecho'].includes(k)){const v=num(t.value);a[k]=isFinite(v)&&t.value.trim()!==''?Math.round(v*100)/100:(k==='hBase'?0:null)}else a[k]=t.value||null;
  persist();const y=window.scrollY;render();window.scrollTo(0,y)});
