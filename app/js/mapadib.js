/* Huincha — dibujar sobre la imagen satelital.
   - Varias fuentes de imagen (Esri actual, Esri Clarity y las versiones anteriores de Esri Wayback, con la fecha de cada toma),
     para elegir la más nítida o la más reciente en ese lugar.
   - Herramientas para dibujar encima: construcciones, piscinas, pisos, cierres, árboles, calles con su nombre, cotas y textos.
     Cada lado muestra su largo y se puede corregir escribiendo la medida exacta.
   - Techo de la casa: se dibuja la cumbrera y la app deduce si es a dos o cuatro aguas y hacia dónde va.
   - Nombres de calles y dirección desde OpenStreetMap.
   Todo pasa al emplazamiento, a la planta, a las elevaciones y al 3D. */
"use strict";
/* ---------- 1. fuentes de imagen ---------- */
const WAYBACK_CFG='https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json';
const MFUENTES=[{id:'esri',n:'Esri · actual',url:MAPA.capa,meta:'ultima'},{id:'clarity',n:'Esri Clarity · más nítida en algunas zonas',url:MAPA.capa2}];
MV.wb=null;
async function wbCargar(){if(MV.wb)return MV.wb;try{const r=await fetch(WAYBACK_CFG);const j=await r.json();
  MV.wb=Object.entries(j).map(([num,v])=>{const f=(v.itemTitle||'').match(/(\d{4}-\d{2}-\d{2})/);return{id:'wb'+num,num:+num,fecha:f?f[1]:'',n:'Wayback '+(f?f[1]:num),url:(v.itemURL||'').replace('{level}','{z}').replace('{row}','{y}').replace('{col}','{x}'),meta:v.metadataLayerUrl}}).filter(x=>x.url&&x.fecha).sort((a,b)=>b.fecha.localeCompare(a.fecha))}catch(e){MV.wb=[]}return MV.wb}
function fuenteSel(id){const all=[...MFUENTES,...(MV.wb||[])];const f=all.find(x=>x.id===id);if(!f||!MV.base)return;MV.fuenteId=id;MV.fuente=id==='clarity'?2:1;MV.base.setUrl(f.url);MV.base.options.maxNativeZoom=19;mapNativeCheck();
  const b=$('#mfuente');if(b)b.textContent='Imagen: '+(id==='esri'?'actual':id==='clarity'?'Clarity':f.fecha);$('#mfsheet')?.remove();fechaToma()}
async function fuentesAbrir(){$('#mfsheet')?.remove();const w=$('.mwrap');if(!w)return;const d=document.createElement('div');d.id='mfsheet';d.className='mfsheet';d.innerHTML='<p class="vh">Buscando las tomas disponibles…</p>';w.appendChild(d);
  const wb=await wbCargar();const cur=MV.fuenteId||'esri';
  d.innerHTML=`<div class="row sb"><b>Imagen satelital</b><button class="btn sm ghost" data-mact="fcerrar" aria-label="Cerrar">✕</button></div><p class="vh">Prueba varias: según el lugar, una es más nítida o más reciente. La fecha es de la toma en esta zona.</p>
    ${[...MFUENTES,...wb.slice(0,12)].map(f=>`<button class="mfo${f.id===cur?' on':''}" data-mfuente="${f.id}">${esc(f.n)}</button>`).join('')}
    ${wb.length?'':'<p class="vh">No se pudieron cargar las tomas anteriores (Wayback).</p>'}<p class="vh">¿Ninguna sirve? Usa «Foto aérea propia» con una foto de dron.</p>`}
/* fecha de la toma en el centro del mapa (Esri Wayback guarda la fecha y la resolución de cada foto) */
async function fechaToma(){const el=$('#mfecha');if(!el||!MV.map)return;el.textContent='';const id=MV.fuenteId||'esri';if(id==='clarity')return;
  const wb=await wbCargar();const f=id==='esri'?wb[0]:wb.find(x=>x.id===id);if(!f?.meta)return;const c=MV.map.getCenter(),z=Math.round(MV.map.getZoom());
  const geo=encodeURIComponent(JSON.stringify({spatialReference:{wkid:4326},x:c.lng,y:c.lat}));
  /* capas 0 a 13 = 1,9 cm a 150 m por píxel (capa ≈ 23 − zoom); se baja de resolución hasta encontrar la toma */
  const z0=Math.max(0,Math.min(13,23-Math.min(z,23)));for(let lid=z0;lid<=Math.min(13,z0+4);lid++){try{
    const r=await fetch(`${f.meta}/${lid}/query?f=json&where=1%3D1&outFields=*&geometry=${geo}&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&returnGeometry=false`);const j=await r.json();
    const a=j?.features?.[0]?.attributes;const sd=a&&(a.SRC_DATE2||a.SRC_DATE);if(sd){const d=typeof sd==='number'&&sd>1e11?new Date(sd):/^\d{8}$/.test(String(sd))?new Date(+String(sd).slice(0,4),+String(sd).slice(4,6)-1,+String(sd).slice(6,8)):new Date(sd);if(isNaN(d))continue;el.textContent=`Toma: ${d.toLocaleDateString('es-CL',{month:'short',year:'numeric'})}${a.SRC_RES?' · '+fmt(a.SRC_RES,2)+' m/píxel':''}`;return}}catch(e){}}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mfuente]');if(b)fuenteSel(b.dataset.mfuente)});

/* ---------- 2. herramientas de dibujo ---------- */
const DIBG=[
  {g:'Construcciones',ks:['edificacion','quincho','cobertizo','carport','bodega','galpon','pergola']},
  {g:'Pisos y patio',ks:['piscina','radier','ceramico','terraza','deck','estacionamiento','camino','pasto','gravilla','jardinera','fosa']},
  {g:'Cierres',ks:['reja','porton','cerco','muro','malla']},
  {g:'Puntos',ks:['arbol','arbusto','palmera','poste','estanque','medidorAgua','medidorLuz','camaraIns','pozoAbs']},
  {g:'Anotaciones',ks:['calle','cota','texto']}];
const DIBA={calle:{n:'Calle (con su nombre)',geo:'linea',col:'#9aa3ad'},cota:{n:'Cota (medida)',geo:'linea',col:'#ffffff'},texto:{n:'Texto',geo:'punto',col:'#ffffff'}};
const dibGeo=t=>DIBA[t]?.geo||(ELT[t]?.k==='linea'?'linea':ELT[t]?.k==='punto'?'punto':'poli');
const dibNom=it=>it.nombre||DIBA[it.t]?.n||ELT[it.t]?.n||it.t;
const dibCol=t=>DIBA[t]?.col||ELT[t]?.col||'#ff5a1f';
function dibLocal(pts){const ref=pts[0];return GeoLot.local(pts,ref)}
function dibLens(it){const L=dibLocal(it.pts),n=L.length,cl=dibGeo(it.t)==='poli';const out=[];for(let i=0;i<(cl?n:n-1);i++)out.push(GeoLot.dist(L[i],L[(i+1)%n]));return out}
/* convierte el formato anterior (construcciones y componentes) */
function dibInit(){const G=MV.geo;G.dib=(P.lote.geo?.dib||[]).map(x=>({...x,pts:x.pts.map(p=>p.slice())}));
  for(const x of G.extras||[])G.dib.push({id:uid(),t:x.tipo,pts:x.pts,nombre:x.tipo==='edificacion'?x.nombre:null});
  for(const x of G.comps||[])G.dib.push({id:uid(),t:x.tipo,pts:[x.p]});G.extras=[];G.comps=[];G.cur=[];
  const t=P.lote.geo?.techo;G.techo=t?{...t,cumb:(t.cumb||[]).map(p=>p.slice())}:{tipo:P.casa.techo||null,cumb:[]};MV.tool=null;MV.sel=null;MV.cumb=false}
function dibClick(ll){const G=MV.geo;if(!G||!G.dib)return false;const p=[ll.lat,ll.lng];
  if(MV.cumb){G.techo.cumb.push(p);if(G.techo.cumb.length>=2){G.techo.cumb=G.techo.cumb.slice(-2);MV.cumb=false;techoDeducir()}drawMap();return true}
  if(MV.mode!=='dib')return false;
  if(!MV.tool){MV.sel=null;drawMap();return true}
  const geo=dibGeo(MV.tool);
  if(geo==='punto'){const it={id:uid(),t:MV.tool,pts:[p]};G.dib.push(it);if(MV.tool==='texto'){MV.sel=it.id}toast(`${dibNom(it)} ubicado.`);drawMap();return true}
  G.cur.push(p);if(MV.tool==='cota'&&G.cur.length===2)dibFin();else drawMap();return true}
function dibFin(){const G=MV.geo,geo=dibGeo(MV.tool),min=geo==='poli'?3:2;if(G.cur.length<min){toast(geo==='poli'?'Marca al menos tres esquinas.':'Marca al menos dos puntos.');return}
  const it={id:uid(),t:MV.tool,pts:G.cur};G.dib.push(it);G.cur=[];MV.sel=it.id;if(MV.tool==='cota')MV.sel=null;drawMap();toast(`${dibNom(it)} dibujado. Puedes corregir sus medidas abajo.`)}
/* fija el largo de un lado moviendo el punto siguiente en la misma dirección */
function dibLargo(it,i,v){const L=dibLocal(it.pts),n=L.length,j=(i+1)%n,a=L[i],b=L[j],d=GeoLot.dist(a,b)||1;const nb=[a[0]+(b[0]-a[0])/d*v,a[1]+(b[1]-a[1])/d*v];
  const ref=it.pts[0],k=Math.cos(ref[0]*Math.PI/180),f=Math.PI/180*GeoLot.R;it.pts[j]=[ref[0]+nb[1]/f,ref[1]+nb[0]/(f*k)];it.medido=true}
/* dibujo sobre el mapa (se llama desde drawShapes) */
function dibDraw(add,lay){const G=MV.geo;if(!G?.dib)return;const enDib=MV.mode==='dib';
  const lab=(p,html,cls)=>add(L.marker(p,{interactive:false,icon:L.divIcon({className:cls,html,iconSize:null})}));
  for(const it of G.dib){const geo=dibGeo(it.t),col=dibCol(it.t),sel=MV.sel===it.id;let shp;
    if(geo==='poli')shp=add(L.polygon(it.pts,{color:sel?'#fff':col,weight:sel?3:2,fillColor:col,fillOpacity:.3,interactive:enDib&&!MV.tool}));
    else if(geo==='linea')shp=add(L.polyline(it.pts,{color:sel?'#fff':col,weight:it.t==='calle'?9:it.t==='cota'?1.5:3.5,opacity:it.t==='calle'?.6:1,dashArray:it.t==='cota'?'4 3':null,interactive:enDib&&!MV.tool}));
    else shp=add(L.circleMarker(it.pts[0],{radius:it.t==='texto'?4:7,color:'#fff',weight:2,fillColor:col,fillOpacity:1,interactive:enDib&&!MV.tool}));
    if(shp&&enDib)shp.on('click',ev=>{L.DomEvent.stopPropagation(ev);if(MV.tool)return;MV.sel=it.id;drawMap()});
    const c=it.pts.reduce((s,p)=>[s[0]+p[0]/it.pts.length,s[1]+p[1]/it.pts.length],[0,0]);
    if(it.t==='calle')lab(c,`<span>${esc(it.nombre||'Calle sin nombre')}</span>`,'mcalle');
    else if(it.t==='texto')lab(it.pts[0],`<span>${esc(it.nombre||'Texto')}</span>`,'mtexto');
    else if(it.t==='cota'){const l=dibLens(it)[0];lab(c,`<span>${fmt(l,2)} m</span>`,'mlen fr')}
    else if(geo!=='punto'||sel||enDib)lab(geo==='poli'?c:it.pts[0],`<span>${esc(dibNom(it))}${geo==='poli'?' · '+fmt(GeoLot.area(dibLocal(it.pts)),0)+' m²':''}</span>`,'mcomp');
    if(sel&&geo!=='punto'){const ls=dibLens(it);ls.forEach((l,i)=>{const a=it.pts[i],b=it.pts[(i+1)%it.pts.length];lab([(a[0]+b[0])/2,(a[1]+b[1])/2],`<span>${fmt(l,2)} m</span>`,'mlen')})}}
  if(G.cur?.length){const col=dibCol(MV.tool);if(G.cur.length>1)add(dibGeo(MV.tool)==='poli'?L.polygon(G.cur,{color:col,weight:2,dashArray:'5 4',fillOpacity:.1,interactive:false}):L.polyline(G.cur,{color:col,weight:3,dashArray:'5 4',interactive:false}));
    const ls=dibLens({t:MV.tool,pts:G.cur});const n=G.cur.length;for(let i=0;i<n-1;i++){const a=G.cur[i],b=G.cur[i+1];lab([(a[0]+b[0])/2,(a[1]+b[1])/2],`<span>${fmt(ls[i],2)} m</span>`,'mlen')}}
  /* lados de la casa y cumbrera */
  if(G.casa?.length>=3&&(MV.mode==='casa')){const Lc=GeoLot.local(G.casa,G.casa[0]);G.casa.forEach((a,i)=>{const b=G.casa[(i+1)%G.casa.length];lab([(a[0]+b[0])/2,(a[1]+b[1])/2],`<span>${fmt(GeoLot.dist(Lc[i],Lc[(i+1)%Lc.length]),2)} m</span>`,'mlen casa')})}
  const T=G.techo;if(T?.cumb?.length){if(T.cumb.length===2)add(L.polyline(T.cumb,{color:'#ffd43b',weight:4,dashArray:'8 5',interactive:false}));T.cumb.forEach(p=>add(L.circleMarker(p,{radius:6,color:'#fff',weight:2,fillColor:'#ffd43b',fillOpacity:1,interactive:false})))}
  /* nombres de calles encontrados en OpenStreetMap, junto a cada deslinde */
  if(MV.calles&&G.pts.length>=3)for(const [i,nm] of Object.entries(MV.calles)){const a=G.pts[+i],b=G.pts[(+i+1)%G.pts.length];if(a&&b)lab([(a[0]+b[0])/2,(a[1]+b[1])/2],`<span>${esc(nm)}</span>`,'mcalle osm')}
  /* vértices arrastrables del elemento seleccionado */
  const it=G.dib.find(x=>x.id===MV.sel);if(it&&enDib)it.pts.forEach((p,i)=>{const mk=L.marker(p,{draggable:true,icon:L.divIcon({className:'mvx otra',html:`<span>${i+1}</span>`,iconSize:[24,24],iconAnchor:[12,12]})});mk._hshape=1;mk.addTo(lay);mk.on('dragend',ev=>{const q=ev.target.getLatLng();it.pts[i]=[q.lat,q.lng];it.medido=false;drawMap()})})}

/* ---------- 3. techo de la casa a partir de la cumbrera ---------- */
function techoDeducir(){const G=MV.geo,T=G.techo,res=GeoLot.compute(G,+P.casa.alero||0);if(T.cumb.length<2||!res?.casa)return;
  const [a,b]=res.toPlanLL(T.cumb),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);const par=Math.abs(dx)>=Math.abs(dy);const lado=par?res.casa.techo[0]:res.casa.techo[1];
  T.cumbrera=par?'paralela':'perpendicular';T.tipo=len<lado*.78?'cuatro-aguas':'dos-aguas';
  toast(`Techo a ${T.tipo==='cuatro-aguas'?'cuatro':'dos'} aguas, con la cumbrera ${par?'paralela':'perpendicular'} a la calle (${fmt(len,1)} m). Corrígelo si no es así.`)}
function techoHTML(){const T=MV.geo.techo||{};const op=[['dos-aguas','Dos aguas'],['cuatro-aguas','Cuatro aguas'],['un-agua','Un agua'],['plana','Plano']];
  return`<div class="mtecho"><b>Techo de la casa:</b> <span class="chips">${op.map(([k,n])=>`<button class="chip" data-mtecho="${k}" aria-pressed="${T.tipo===k}">${n}</button>`).join('')}</span>
    ${T.tipo==='dos-aguas'||T.tipo==='cuatro-aguas'||!T.tipo?`<span class="row"><button class="btn sm${MV.cumb?' pri':''}" data-mact="cumb">${MV.cumb?'Toca los dos extremos de la cumbrera…':T.cumb?.length===2?'Volver a dibujar la cumbrera':'Dibujar la cumbrera'}</button>${T.cumbrera?`<span class="lbl">Cumbrera ${T.cumbrera} a la calle</span>`:''}</span>`:''}
    <span class="vh">La cumbrera es la línea más alta del techo ${queEs('cumbrera')}. Con ella la app deduce las aguas y dibuja las elevaciones.</span></div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mtecho]');if(!b||!MV.geo)return;MV.geo.techo.tipo=b.dataset.mtecho;if(!/aguas/.test(b.dataset.mtecho))MV.geo.techo.cumb=[];drawMap()});

/* ---------- ayuda y edición en la barra inferior ---------- */
function dibHelp(h){const G=MV.geo;if(!G?.dib)return false;
  if(MV.mode==='casa'&&G.casa.length>=3){h.innerHTML=`${G.casa.length} esquinas marcadas: arrastra para ajustar al borde del techo, o sigue marcando quiebres.`+techoHTML();return true}
  if(MV.mode!=='dib')return false;const it=G.dib.find(x=>x.id===MV.sel);
  if(MV.tool){const geo=dibGeo(MV.tool),n=dibNom({t:MV.tool});h.innerHTML=`<b>${picto(MV.tool)}${esc(n)}:</b> ${geo==='punto'?'toca el mapa donde está (o usa la mira).':geo==='poli'?`toca cada esquina en orden (${G.cur.length} marcadas) y luego «Terminar».`:MV.tool==='cota'?'toca los dos extremos de la medida.':`toca los puntos de la línea (${G.cur.length}) y luego «Terminar».`}
    <span class="row">${geo!=='punto'&&MV.tool!=='cota'?`<button class="btn sm pri" data-mact="dfin">Terminar</button>`:''}<button class="btn sm" data-mact="dtool" data-t="">Cambiar herramienta</button></span>`;return true}
  if(it){const geo=dibGeo(it.t),ls=geo==='punto'?[]:dibLens(it);const T=ELT[it.t];
    h.innerHTML=`<div class="row sb"><b>${picto(it.t)}${esc(dibNom(it))}</b><span class="row"><button class="btn sm danger" data-mact="ddel">Borrar</button><button class="btn sm" data-mact="dok">Listo</button></span></div>
      ${it.t==='calle'||it.t==='texto'||T?.edif||T?.k==='vol'?`<label class="fld"><span>${it.t==='calle'?'Nombre de la calle':it.t==='texto'?'Texto':'Nombre'}</span><div class="inp"><input data-dnom value="${esc(it.nombre||'')}" placeholder="${it.t==='calle'?'Ej. Av. Los Aromos':it.t==='texto'?'Ej. Acceso vehicular':'Ej. Ampliación dormitorio'}"></div></label>`:''}
      ${T?.k==='vol'?`<div class="fld"><span>Techo</span><div class="chips">${[['dos_aguas','Dos aguas'],['una_agua','Un agua'],['plano','Plano']].map(([k,n])=>`<button class="chip" data-dset="techo:${k}" aria-pressed="${(it.techo||'dos_aguas')===k}">${n}</button>`).join('')}</div></div>${T.edif?`<div class="fld"><span>Pisos</span><div class="chips">${[1,2,3].map(k=>`<button class="chip" data-dset="pisos:${k}" aria-pressed="${(it.pisos||1)===k}">${k}</button>`).join('')}</div></div>`:''}`:''}
      ${ls.length?`<div class="dlens"><span class="lbl">Largo de cada lado (escribe la medida real si la tomaste con huincha)</span>${ls.map((l,i)=>`<label class="inp sm"><em>${i+1}–${(i+1)%it.pts.length+1}</em><input data-dlen="${i}" inputmode="decimal" value="${String(Math.round(l*100)/100).replace('.',',')}"><em>m</em></label>`).join('')}</div>`:''}
      ${geo==='poli'?`<p class="vh">Superficie: ${fmt(GeoLot.area(dibLocal(it.pts)),1)} m². Arrastra los puntos numerados para ajustar.</p>`:''}`;return true}
  const cnt=G.dib.length;h.innerHTML=`<b>Dibuja sobre la imagen</b> lo que hay en el terreno (o lo que no se ve desde arriba). Elige qué vas a dibujar:${cnt?` <span class="lbl">${cnt} dibujado${cnt>1?'s':''} · toca uno para editarlo</span>`:''}
    ${DIBG.map(g=>`<div class="dgrp"><span class="lbl">${g.g}</span><div class="chips">${g.ks.filter(k=>ELT[k]||DIBA[k]).map(k=>`<button class="chip" data-mact="dtool" data-t="${k}">${picto(k)}${esc(DIBA[k]?.n||ELT[k].n)}</button>`).join('')}</div></div>`).join('')}
    <div class="row"><button class="btn sm" data-mact="calles">Buscar nombres de calles</button></div>`;return true}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mact],[data-dset]');if(!b||!$('#mapov')||!MV.geo?.dib)return;const G=MV.geo,it=G.dib.find(x=>x.id===MV.sel);
  if(b.dataset.dset&&it){const [k,v]=b.dataset.dset.split(':');it[k]=k==='pisos'?+v:v;drawMap();return}
  switch(b.dataset.mact){
    case 'dtool':MV.tool=b.dataset.t||null;G.cur=[];MV.sel=null;drawMap();break;
    case 'dfin':dibFin();break;
    case 'ddel':if(it){G.dib=G.dib.filter(x=>x!==it);MV.sel=null;drawMap();toast('Borrado.')}break;
    case 'dok':MV.sel=null;drawMap();break;
    case 'cumb':MV.cumb=!MV.cumb;if(MV.cumb)G.techo.cumb=[];drawMap();break;
    case 'fuentes':fuentesAbrir();break;
    case 'fcerrar':$('#mfsheet')?.remove();break;
    case 'calles':callesBuscar(false);break}});
document.addEventListener('change',e=>{const t=e.target;if(!$('#mapov')||!MV.geo?.dib)return;const it=MV.geo.dib.find(x=>x.id===MV.sel);if(!it)return;
  if(t.dataset.dnom!=null){it.nombre=t.value.trim()||null;drawMap()}
  if(t.dataset.dlen!=null){const v=num(t.value);if(v>0){dibLargo(it,+t.dataset.dlen,v);drawMap()}}});

/* ---------- 4. nombres de calles y dirección (OpenStreetMap) ---------- */
async function callesBuscar(quiet){const G=MV.geo;if(!G||G.pts.length<3){if(!quiet)toast('Primero marca el terreno.');return}
  const n=G.pts.length,c=[G.pts.reduce((s,p)=>s+p[0],0)/n,G.pts.reduce((s,p)=>s+p[1],0)/n];if(!quiet)toast('Buscando nombres de calles…');
  try{const fi=((G.frente|0)%n+n)%n,a=G.pts[fi],b=G.pts[(fi+1)%n];
    const rv=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${(a[0]+b[0])/2}&lon=${(a[1]+b[1])/2}`,{headers:{'Accept-Language':'es'}}).then(r=>r.json()).catch(()=>null);
    const ad=rv?.address||{};MV.dir={calle:ad.road||ad.pedestrian||ad.footway||'',num:ad.house_number||'',comuna:ad.city||ad.town||ad.village||ad.municipality||ad.suburb||''};
    const q=`[out:json][timeout:20];way(around:90,${c[0]},${c[1]})["highway"]["name"];out geom;`;
    const ov=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'}}).then(r=>r.json()).catch(()=>null);
    const ways=(ov?.elements||[]).filter(w=>w.geometry?.length>1);const out={};const ref=c;
    for(let i=0;i<n;i++){const A=G.pts[i],B=G.pts[(i+1)%n];const [la,lb]=GeoLot.local([A,B],ref),m=[(la[0]+lb[0])/2,(la[1]+lb[1])/2],ang=Math.atan2(lb[1]-la[1],lb[0]-la[0]);let best=null;
      for(const w of ways){const W=GeoLot.local(w.geometry.map(g=>[g.lat,g.lon]),ref);for(let k=0;k<W.length-1;k++){const p=W[k],q2=W[k+1],dx=q2[0]-p[0],dy=q2[1]-p[1],L2=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((m[0]-p[0])*dx+(m[1]-p[1])*dy)/L2)),d=Math.hypot(m[0]-p[0]-dx*t,m[1]-p[1]-dy*t);
        let da=Math.abs(Math.atan2(dy,dx)-ang)%Math.PI;da=Math.min(da,Math.PI-da);if(d<28&&da<.45&&(!best||d<best.d))best={d,n:w.tags.name}}}
      if(best)out[i]=best.n}
    if(!out[fi]&&MV.dir.calle)out[fi]=MV.dir.calle;MV.calles=out;drawMap();
    if(!quiet){const k=Object.keys(out).length;toast(k?`Encontré ${k} calle${k>1?'s':''}: ${[...new Set(Object.values(out))].join(', ')}.`:'No encontré calles con nombre junto al terreno. Puedes dibujarlas con «Calle».')}}
  catch(e){if(!quiet)toast('No se pudieron buscar las calles. Revisa la conexión.')}}

/* ---------- 5. pasar lo dibujado al proyecto ---------- */
function dibAplicar(res){const G=MV.geo,lo=P.lote,c=P.casa,rr=v=>Math.round(v*100)/100;if(!G?.dib)return 0;
  lo.geo.dib=G.dib;lo.geo.techo=G.techo;lo.geo.extras=[];lo.geo.comps=[];
  /* calles y dirección */
  if(MV.calles){lo.calles={};for(const [i,n] of Object.entries(MV.calles))lo.calles[i]=n;if(MV.calles[res.fi]&&(!lo.calle||lo.calleAuto)){lo.calle=MV.calles[res.fi];lo.calleAuto=true}}
  if(MV.dir){if(!P.meta.direccion&&MV.dir.calle)P.meta.direccion=MV.dir.calle+(MV.dir.num?' '+MV.dir.num:'');if(!P.meta.comuna&&MV.dir.comuna)P.meta.comuna=MV.dir.comuna}
  /* techo de la casa */
  const T=G.techo;if(T?.tipo&&c.ancho>0){c.techo=T.tipo;if(T.cumbrera)c.cumbrera=T.cumbrera;
    if(!(c.hTecho>0)&&T.tipo!=='plana'){const span=T.tipo==='un-agua'?c.largo:T.tipo==='cuatro-aguas'?Math.min(c.ancho,c.largo):(c.cumbrera==='paralela'?c.largo:c.ancho);c.hTecho=rr(T.tipo==='un-agua'?span*.15:span/2*.35);c.hTechoEst=true}}
  /* elementos */
  const ox=+c.retiroIzq||0,oy=+c.retiroFrontal||0;P.elementos=(P.elementos||[]).filter(e=>e.origen!=='mapa'&&e.origen!=='mapa-c');lo.anot=[];let n=0;
  for(const it of G.dib){const pl=res.toPlanLL(it.pts),geo=dibGeo(it.t);
    if(DIBA[it.t]){lo.anot.push({t:it.t,pts:pl.map(q=>[rr(q[0]),rr(q[1])]),nombre:it.nombre||null});continue}
    const hp=pl.map(q=>[q[0]-ox,q[1]-oy]);
    if(geo==='punto'){const e=elemNew(it.t,hp[0]);e.origen='mapa';e.est=true;P.elementos.push(e);n++;continue}
    if(geo==='linea'){for(let k=0;k<hp.length-1;k++){const e=elemNew(it.t,hp[k],[hp[k+1][0]-hp[k][0],hp[k+1][1]-hp[k][1]]);e.a=[rr(hp[k][0]),rr(hp[k][1])];e.b=[rr(hp[k+1][0]),rr(hp[k+1][1])];e.origen='mapa';e.est=!it.medido;P.elementos.push(e);n++}continue}
    const cx=hp.reduce((s,q)=>s+q[0],0)/hp.length,cy=hp.reduce((s,q)=>s+q[1],0)/hp.length;const e=elemNew(it.t,[cx,cy]);const xs=hp.map(q=>q[0]),ys=hp.map(q=>q[1]);
    e.w=rr(Math.max(...xs)-Math.min(...xs));e.l=rr(Math.max(...ys)-Math.min(...ys));e.rot=0;e.forma='libre';e.pts=hp.map(q=>[rr(q[0]-cx),rr(q[1]-cy)]);
    if(it.nombre)e.nombre=it.nombre;if(it.techo)e.techo=it.techo;if(it.pisos)e.pisos=it.pisos;e.origen='mapa';e.est=!it.medido;P.elementos.push(e);n++}
  return n}

/* ---------- anotaciones en el emplazamiento (coordenadas del terreno) ---------- */
function anotSVG(X,Y,s,fs){const lo=P.lote;let h='';
  for(const a of lo.anot||[]){const P2=a.pts.map(p=>[X(p[0]),Y(p[1])]);
    if(a.t==='calle'&&P2.length>1){h+=`<polyline points="${P2.map(p=>p.map(r2).join(',')).join(' ')}" style="fill:none;stroke:#d9d9d4;stroke-width:${r2(6*s)};stroke-linecap:round;stroke-linejoin:round;opacity:.9"/>`;
      const i=Math.floor((P2.length-1)/2),A=P2[i],B=P2[i+1];let ang=Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI;if(ang>90)ang-=180;if(ang<-90)ang+=180;
      h+=`<text transform="translate(${r2((A[0]+B[0])/2)} ${r2((A[1]+B[1])/2+fs*.35)}) rotate(${r2(ang)})" font-size="${r2(fs*1.05)}" text-anchor="middle" font-weight="700" letter-spacing="1" class="tx tm">${esc((a.nombre||'Calle').toUpperCase())}</text>`}
    else if(a.t==='cota'&&P2.length>1){const [A,B]=P2,l=Math.hypot(a.pts[1][0]-a.pts[0][0],a.pts[1][1]-a.pts[0][1]);let ang=Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI;if(ang>90)ang-=180;if(ang<-90)ang+=180;
      h+=`<line x1="${r2(A[0])}" y1="${r2(A[1])}" x2="${r2(B[0])}" y2="${r2(B[1])}" style="stroke:#1b1e20;stroke-width:.25"/>`+[A,B].map(p=>`<circle cx="${r2(p[0])}" cy="${r2(p[1])}" r=".55" style="fill:#1b1e20"/>`).join('')+
        `<text transform="translate(${r2((A[0]+B[0])/2)} ${r2((A[1]+B[1])/2-fs*.35)}) rotate(${r2(ang)})" font-size="${r2(fs*.8)}" text-anchor="middle" class="tx mono">${fmt(l)}</text>`}
    else if(a.t==='texto'&&P2.length)h+=`<text x="${r2(P2[0][0])}" y="${r2(P2[0][1])}" font-size="${r2(fs*.85)}" text-anchor="middle" class="tx">${esc(a.nombre||'')}</text>`}
  /* nombres de calles junto a los deslindes (menos el frente, que ya lleva su franja) */
  const LP=lotPoly();if(LP&&lo.calles){const fi=lo.geo?.frente|0;for(const [i,nm] of Object.entries(lo.calles)){if(+i===fi)continue;const A=LP[+i],B=LP[(+i+1)%LP.length];if(!A||!B)continue;
    const dx=B[0]-A[0],dy=B[1]-A[1],L0=Math.hypot(dx,dy)||1,cx=(A[0]+B[0])/2,cy=(A[1]+B[1])/2,C=LP.reduce((s,p)=>[s[0]+p[0]/LP.length,s[1]+p[1]/LP.length],[0,0]);let nx=-dy/L0,ny=dx/L0;if((C[0]-cx)*nx+(C[1]-cy)*ny>0){nx=-nx;ny=-ny}
    const px=X(cx+nx*3),py=Y(cy+ny*3);let ang=Math.atan2(Y(B[1])-Y(A[1]),X(B[0])-X(A[0]))*180/Math.PI;if(ang>90)ang-=180;if(ang<-90)ang+=180;
    h+=`<text transform="translate(${r2(px)} ${r2(py)}) rotate(${r2(ang)})" font-size="${r2(fs*1.05)}" text-anchor="middle" font-weight="700" letter-spacing="1" class="tx tm">${esc(nm.toUpperCase())}</text>`}}
  return h}
