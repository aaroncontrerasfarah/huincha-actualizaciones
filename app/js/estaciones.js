/* Huincha — recorrido por estaciones.
   Con lo marcado en el mapa la app arma el recorrido desde el portón: frente del terreno, fachada principal, lo del
   antejardín, costados y posterior, lo del patio, el fondo y el interior. En cada estación pide una foto, que se marca en
   el editor de foto (editorfoto.js) y se vuelca al proyecto (volcado.js). Coordenadas: las del terreno (x desde el
   deslinde izquierdo, y desde la calle); la casa está en (retiroIzq, retiroFrontal). */
"use strict";
const EST={gps:null,sel:null,watch:null};
const EST_FACH={frontal:'Fachada principal',derecho:'Costado derecho',posterior:'Fachada posterior',izquierdo:'Costado izquierdo'};
function estOrigen(){return[+P.casa.retiroIzq||0,+P.casa.retiroFrontal||0]}
function estLote(){const LP=typeof lotPoly==='function'?lotPoly():null;if(LP)return{x0:Math.min(...LP.map(p=>p[0])),x1:Math.max(...LP.map(p=>p[0])),y0:Math.min(...LP.map(p=>p[1])),y1:Math.max(...LP.map(p=>p[1]))};
  const [ox,oy]=estOrigen(),c=P.casa;return{x0:0,x1:(+P.lote.frente||ox*2+(+c.ancho||10)),y0:0,y1:(+P.lote.fondo||oy+(+c.largo||10)+8)}}
const estClamp=(p,B)=>[Math.max(B.x0+.5,Math.min(B.x1-.5,p[0])),Math.max(B.y0-3,Math.min(B.y1-.5,p[1]))];

/* estaciones a partir del mapa y la casa (conserva fotos y estado de las ya existentes por su clave) */
function estGenerar(){const prev=new Map((P.estaciones||[]).map(e=>[e.clave,e]));const [ox,oy]=estOrigen(),B=estLote(),c=P.casa,W=+c.ancho||0,L=+c.largo||0;const out=[];
  const mk=(clave,tipo,ref,n,lugar,mira,ins)=>{const o=prev.get(clave);out.push({id:o?.id||uid(),clave,tipo,ref,n,lugar:lugar.map(v=>Math.round(v*100)/100),mira:mira.map(v=>Math.round(v*100)/100),ins,fotos:o?.fotos||[],estado:o?.estado||'pendiente'})};
  /* frente del terreno: en la vereda, frente al portón */
  const por=(P.elementos||[]).find(e=>e.t==='porton');const px=por?((por.a?.[0]??por.x)+(por.b?.[0]??por.x))/2+ox:(B.x0+B.x1)/2;
  mk('frente','frente',null,'Frente del terreno',[px,-2.5],[px,oy/2],'Párate en la vereda frente al portón, a unos 3 pasos de la reja, y saca una foto donde se vea toda la reja y el portón.');
  /* fachadas */
  if(W>0&&L>0)for(const l of casaLados()){const m=[(l.a[0]+l.b[0])/2+ox,(l.a[1]+l.b[1])/2+oy];const dx=l.b[0]-l.a[0],dy=l.b[1]-l.a[1],len=Math.hypot(dx,dy)||1;const nx=dy/len,ny=-dx/len;
    let d=5;let p=[m[0]+nx*d,m[1]+ny*d];while(d>2&&(p[0]<B.x0||p[0]>B.x1||p[1]>B.y1||(l.k!=='frontal'&&p[1]<B.y0))){d-=.5;p=[m[0]+nx*d,m[1]+ny*d]}
    mk('fach:'+l.k,'fachada',l.k,EST_FACH[l.k],l.k==='frontal'?p:estClamp(p,B),m,`Párate a unos ${Math.round(d)} pasos ${l.k==='derecho'||l.k==='izquierdo'?'del':'de la'} ${EST_FACH[l.k].toLowerCase()}, frente a su centro, con el teléfono derecho, y saca una foto donde se vea ${l.k==='derecho'||l.k==='izquierdo'?'entero':'entera'} con su techo.`)}
  else mk('fach:frontal','fachada','frontal','Fachada principal',[(B.x0+B.x1)/2,oy-4],[(B.x0+B.x1)/2,oy],'Párate frente a la casa y saca una foto donde se vea entera con su techo.');
  /* objetos marcados (no cierres ni puntos menores) */
  for(const e of P.elementos||[]){const T=eltOf(e);if(String(e.src||'').startsWith('est:')||T.k==='linea'||(T.k==='punto'&&!['arbol','estanque','palmera','pilote'].includes(e.t)))continue;const cc=elCenter(e),cen=[cc[0]+ox,cc[1]+oy];
    const toCasa=[ox+W/2-cen[0],oy+L/2-cen[1]],tl=Math.hypot(...toCasa)||1,r=Math.max(+e.w||1,+e.l||1)/2+3;const lugar=estClamp([cen[0]-toCasa[0]/tl*-r,cen[1]-toCasa[1]/tl*-r],B);
    mk('obj:'+e.id,'objeto',e.id,elNombre(e),lugar,cen,`Ve a ${elNombre(e).toLowerCase()} y saca una foto donde se vea completo.`)}
  for(const o of P.estaciones||[])if(o.tipo==='libre')out.push(o);
  mk('fondo','fondo',null,'Fondo del terreno',[(B.x0+B.x1)/2,Math.max(oy+L+2,B.y1-6)],[(B.x0+B.x1)/2,B.y1],'Ve al fondo del patio y saca una foto del deslinde de atrás y lo que esté cerca.');
  mk('interior','interior',null,'Interior',[ox+W/2,oy+L/2],[ox+W/2,oy+L],'Entra a la casa: la app reconoce cada recinto con la cámara.');
  return estOrden(out)}
/* orden del recorrido */
function estOrden(lista){const [,oy]=estOrigen(),L=+P.casa.largo||0;const rango=e=>{if(e.clave==='frente')return 0;if(e.clave==='fach:frontal')return 1;
    if(e.tipo==='objeto'||e.tipo==='libre')return e.mira[1]<oy?2:6;return{'fach:derecho':3,'fach:posterior':4,'fach:izquierdo':5,fondo:7,interior:8}[e.clave]??6};
  const dist=e=>Math.hypot(e.mira[0]-estOrigen()[0]-(+P.casa.ancho||0)/2,e.mira[1]-oy-L/2);
  return lista.slice().sort((a,b)=>rango(a)-rango(b)||dist(a)-dist(b))}
function estCercana(p){let best=null;for(const e of P.estaciones||estGenerar()){const d=Math.hypot(e.lugar[0]-p[0],e.lugar[1]-p[1]);if(d<12&&(!best||d<best.d))best={d,e}}return best?best.e:null}
/* posición GPS en coordenadas del terreno, con la georreferencia del mapa */
function gpsATerreno(lat,lng){const g=P.lote.geo;if(!g?.pts?.length||g.pts.length<3)return null;try{const r=GeoLot.compute({pts:g.pts,frente:g.frente,casa:[]});return r?r.toPlanLL([[lat,lng]])[0]:null}catch(e){return null}}

/* ---------- pantalla del recorrido ---------- */
function estSel(){const L=P.estaciones||[];return L.find(e=>e.id===EST.sel)||L.find(e=>e.estado==='pendiente')||L[0]}
function estMiniMapaSVG(sel){const [ox,oy]=estOrigen(),c=P.casa,B=estLote(),LP=typeof lotPoly==='function'?lotPoly():null;const x0=B.x0-4,x1=B.x1+4,y1=B.y1+3,yb=-6;const P2=p=>`${(p[0]).toFixed(2)},${(-p[1]).toFixed(2)}`;
  let h=`<rect x="${x0}" y="${-yb-6}" width="${x1-x0}" height="6" class="em-calle"/>`;
  h+=LP?`<polygon points="${LP.map(P2).join(' ')}" class="em-lote"/>`:`<rect x="${B.x0}" y="${-B.y1}" width="${B.x1-B.x0}" height="${B.y1-B.y0}" class="em-lote"/>`;
  for(const e of P.elementos||[]){const T=eltOf(e);if(T.k==='linea')h+=`<line x1="${e.a[0]+ox}" y1="${-(e.a[1]+oy)}" x2="${e.b[0]+ox}" y2="${-(e.b[1]+oy)}" class="em-lin"/>`;else if(T.k==='punto')h+=`<circle cx="${e.x+ox}" cy="${-(e.y+oy)}" r="${Math.max(.4,(+e.w||1)/2)}" class="em-obj"/>`;else h+=`<polygon points="${elFoot(e).map(p=>P2([p[0]+ox,p[1]+oy])).join(' ')}" class="em-obj" style="fill:${T.col}66"/>`}
  if(c.ancho>0)h+=`<rect x="${ox}" y="${-(oy+(+c.largo))}" width="${c.ancho}" height="${c.largo}" class="em-casa"/>`;
  if(sel){const dx=sel.mira[0]-sel.lugar[0],dy=sel.mira[1]-sel.lugar[1],d=Math.hypot(dx,dy)||1;h+=`<line x1="${sel.lugar[0]}" y1="${-sel.lugar[1]}" x2="${sel.lugar[0]+dx/d*Math.min(d,4)}" y2="${-(sel.lugar[1]+dy/d*Math.min(d,4))}" class="em-mira" marker-end="url(#emk)"/>`}
  (P.estaciones||[]).forEach((e,i)=>{const s=e.id===sel?.id;h+=`<g class="em-est ${e.estado}${s?' on':''}" data-est="sel:${e.id}"><circle cx="${e.lugar[0]}" cy="${-e.lugar[1]}" r="${s?1.6:1.1}"/><text x="${e.lugar[0]}" y="${-e.lugar[1]+.45}">${i+1}</text></g>`});
  if(EST.gps)h+=`<circle cx="${EST.gps[0]}" cy="${-EST.gps[1]}" r="1" class="em-gps"/><circle cx="${EST.gps[0]}" cy="${-EST.gps[1]}" r="3" class="em-gpsr"/>`;
  return`<svg class="estmapa" viewBox="${x0} ${-y1} ${x1-x0} ${y1-yb}" role="img" aria-label="Mapa del recorrido"><defs><marker id="emk" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" class="em-mk"/></marker></defs>${h}</svg>`}
function estPinta(){const ov=$('#estov');if(!ov)return;const L=P.estaciones,s=estSel();EST.sel=s?.id;const hechas=L.filter(e=>e.estado==='marcada').length;const i=L.indexOf(s);
  const est={pendiente:'Pendiente',foto:'Con foto',marcada:'Marcada ✓'};
  ov.innerHTML=`<div class="estpan"><div class="row sb"><h3>Recorrido por estaciones</h3><button class="btn sm dark" data-est="cerrar" aria-label="Cerrar">✕</button></div>
    <div class="gprog"><span class="lbl">${hechas} de ${L.length} marcadas${EST.gps?' · GPS activo':''}</span><div class="gbar"><i style="width:${Math.round(hechas/L.length*100)}%"></i></div></div>
    ${estMiniMapaSVG(s)}
    ${s?`<div class="card estcard"><p class="lbl">Estación ${i+1}${EST.cerca&&EST.cerca===s.id?' · estás aquí':''}</p><h3>${esc(s.n)}</h3><p class="note">${esc(s.ins)}</p>
      ${s.tipo==='interior'?`<div class="row"><button class="btn pri" data-est="interior">Entrar y reconocer recintos</button></div>`:`<div class="row"><button class="btn pri" data-est="foto:${s.id}">📷 Sacar foto</button><button class="btn" data-est="gal:${s.id}">🖼️ Desde la galería</button></div>
      ${s.fotos.length?`<div class="estfotos">${s.fotos.map((f,k)=>`<button class="estft" data-est="edit:${s.id}:${k}"><img data-ref="${esc(f.img||'')}" alt="Foto ${k+1}"><span>${f.formas?.length||0} marcados · editar</span></button>`).join('')}</div>`:''}`}</div>`:''}
    <div class="estlist">${L.map((e,k)=>`<button class="estli ${e.estado}${e.id===s?.id?' on':''}" data-id="${e.id}" data-est="sel:${e.id}"><b>${k+1}</b><span>${esc(e.n)}</span><em>${est[e.estado]||''}</em></button>`).join('')}</div>
    <div class="row"><button class="btn sm" data-est="libre">+ Algo que no está en el mapa</button></div></div>`;
  ov.querySelectorAll('img[data-ref]').forEach(im=>{const u=phSrc(im.dataset.ref);if(u)im.src=u})}
function estAbrir(){P.estaciones=estGenerar();persist();let ov=$('#estov');if(!ov){ov=document.createElement('div');ov.id='estov';ov.className='estov';document.body.appendChild(ov)}ov.hidden=false;EST.manual=false;
  if(navigator.geolocation&&EST.watch==null)try{EST.watch=navigator.geolocation.watchPosition(p=>{const q=gpsATerreno(p.coords.latitude,p.coords.longitude);if(!q)return;EST.gps=q;const c=estCercana(q);EST.cerca=c?.id||null;if(c&&!EST.manual)EST.sel=c.id;if(!$('#efov'))estPinta()},()=>{},{enableHighAccuracy:true,maximumAge:5000})}catch(e){}
  estPinta()}
function estCerrar(){const ov=$('#estov');if(ov)ov.hidden=true;if(EST.watch!=null){try{navigator.geolocation.clearWatch(EST.watch)}catch(e){}EST.watch=null}render()}
function estElegirFoto(id,camara){let inp=$('#estfile');if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.id='estfile';inp.hidden=true;document.body.appendChild(inp);
    inp.addEventListener('change',()=>{const f=inp.files?.[0];const e=(P.estaciones||[]).find(x=>x.id===inp.dataset.est);inp.value='';if(f&&e&&typeof efAbrir==='function')efAbrir(e,f)})}
  inp.dataset.est=id;if(camara)inp.setAttribute('capture','environment');else inp.removeAttribute('capture');inp.click()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-est]');if(!b||!$('#estov')||$('#estov').hidden)return;const [a,x,y]=b.dataset.est.split(':');
  switch(a){
    case 'cerrar':estCerrar();break;
    case 'sel':EST.sel=x;EST.manual=true;estPinta();break;
    case 'foto':estElegirFoto(x,true);break;
    case 'gal':estElegirFoto(x,false);break;
    case 'edit':{const s=P.estaciones.find(q=>q.id===x);if(s&&typeof efAbrir==='function')efAbrir(s,null,+y);break}
    case 'libre':{const [ox,oy]=estOrigen();const o={id:uid(),clave:'libre:'+uid(),tipo:'libre',ref:null,n:'Algo que no está en el mapa',lugar:EST.gps||[ox+(+P.casa.ancho||0)/2,oy-3],mira:EST.gps||[ox,oy],ins:'Saca una foto de lo que quieres agregar y márcalo: la app te preguntará dónde está.',fotos:[],estado:'pendiente'};P.estaciones.push(o);P.estaciones=estOrden(P.estaciones);EST.sel=o.id;EST.manual=true;persist();estPinta();break}
    case 'interior':estCerrar();vivoOpen().then(()=>{if(VV){VV.st='rooms';VV.rauto=true;vPanel();setTimeout(()=>vRecDetect(false),900)}});break}});

/* ---------- entradas desde los pasos ---------- */
function estCardHTML(){const L=P.estaciones||[],h=L.filter(e=>e.estado==='marcada').length,sig=L.find(e=>e.estado!=='marcada'&&e.tipo!=='interior');
  return`<div class="card estentry" id="estcard"><div class="row sb"><h3>Recorrido por estaciones</h3><span class="lbl">${L.length?`${h} de ${L.length} marcadas`:'Recomendado'}</span></div>
    <p class="note">La app te lleva lugar por lugar desde el portón: en cada estación sacas una foto, marcas lo que se ve (muros, aguas, puertas, ventanas, pisos, cobertizos…) con su material y sus medidas, y se dibuja en el croquis.${P.lote.geo?'':' Primero marca el terreno y la casa en el mapa: así cada cosa queda bien ubicada.'}</p>
    ${sig?`<p class="note"><b>Siguiente:</b> ${esc(sig.n)}</p>`:''}<div class="row"><button class="btn pri" data-estabrir>${L.length?'Seguir el recorrido':'Empezar el recorrido'}</button></div></div>`}
document.addEventListener('click',e=>{if(e.target.closest('[data-estabrir]'))estAbrir()});
/* abrir el editor con una foto ya guardada (paso Fotos: «Identificar componentes») */
async function efDesdeRef(clave,ref){P.estaciones=estGenerar();const est=P.estaciones.find(x=>x.clave===clave);if(!est)return;const ya=est.fotos.findIndex(f=>f.img===ref);if(ya>=0){efAbrir(est,null,ya);return}
  let blob=null;try{blob=await (await fetch(phSrc(ref))).blob()}catch(e){}if(!blob){toast('No se pudo leer la foto.');return}
  let w=1,h=1;try{const bm=await createImageBitmap(blob);w=bm.width;h=bm.height}catch(e){}
  const foto={id:uid(),img:ref,w,h,ref:{pts:null,largo:efRefDefecto(est)},formas:[]};est.fotos.push(foto);est.estado='foto';persist();EF.est=est;EF.foto=foto;EF.sel=null;EF.cur=[];EF.tool="ref";EF.refN=0;
  let ov=$('#efov');if(!ov){ov=document.createElement('div');ov.id='efov';ov.className='efov';document.body.appendChild(ov)}ov.hidden=false;efPinta();efIA(est,foto,blob)}
