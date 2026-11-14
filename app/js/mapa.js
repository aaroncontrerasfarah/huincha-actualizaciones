/* Huincha — medición del terreno sobre un mapa satelital.
   Capa satelital gratuita (Esri World Imagery) para pruebas. Antes de vender, revisar sus condiciones de uso
   o cambiar MAPA.capa por Google u otro proveedor con licencia comercial. */
"use strict";
const MAPA={
  capa:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  /* Segunda fuente gratuita (Esri Clarity): en muchos lugares tiene fotos más nítidas o más nuevas. */
  capa2:'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  zoomMax:22,
  calles:'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
  nombres:'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  atribucion:'Imágenes © Esri, Maxar, Earthstar Geographics · Búsqueda © OpenStreetMap',
  busqueda:q=>`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(q)}`,
  inicio:[-33.4489,-70.6693]
};

/* ---------- cálculo (sin interfaz, se puede probar aparte) ---------- */
const GeoLot={
  R:6371008.8,
  local(pts,ref){const lat0=ref[0],lng0=ref[1],k=Math.cos(lat0*Math.PI/180),f=Math.PI/180*this.R;return pts.map(([la,ln])=>[(ln-lng0)*f*k,(la-lat0)*f])},
  area(p){let a=0;for(let i=0;i<p.length;i++){const [x1,y1]=p[i],[x2,y2]=p[(i+1)%p.length];a+=x1*y2-x2*y1}return Math.abs(a)/2},
  dist:(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]),
  /* geo={pts:[[lat,lng]…], casa:[[lat,lng]…], frente:índice del lado que da a la calle} */
  compute(geo,alero=0){const pts=geo.pts||[];if(pts.length<3)return null;const n=pts.length;
    const ref=[pts.reduce((s,p)=>s+p[0],0)/n,pts.reduce((s,p)=>s+p[1],0)/n];
    const lot=this.local(pts,ref),casa=this.local(geo.casa||[],ref);
    const sides=lot.map((p,i)=>this.dist(p,lot[(i+1)%n]));
    const fi=((geo.frente|0)%n+n)%n,A=lot[fi],B=lot[(fi+1)%n],len=sides[fi]||1;
    const u=[(B[0]-A[0])/len,(B[1]-A[1])/len];let v=[-u[1],u[0]];
    const C=[lot.reduce((s,p)=>s+p[0],0)/n,lot.reduce((s,p)=>s+p[1],0)/n];if((C[0]-A[0])*v[0]+(C[1]-A[1])*v[1]<0)v=[-v[0],-v[1]];
    const r=[v[1],-v[0]];/* derecha, mirando desde la calle hacia el fondo */
    const toPlan=p=>[(p[0]-A[0])*r[0]+(p[1]-A[1])*r[1],(p[0]-A[0])*v[0]+(p[1]-A[1])*v[1]];
    const xB=toPlan(B)[0],x0=Math.min(0,xB);
    const plan=lot.map(p=>{const q=toPlan(p);return[q[0]-x0,q[1]]});
    const fondo=Math.max(...plan.map(p=>p[1]));
    const norte=((Math.atan2(v[0],v[1])*180/Math.PI)%360+360)%360;
    let cs=null;
    if(casa.length>=3){const cp=casa.map(p=>{const q=toPlan(p);return[q[0]-x0,q[1]]});const xs=cp.map(p=>p[0]),ys=cp.map(p=>p[1]);
      const e0=[cp[1][0]-cp[0][0],cp[1][1]-cp[0][1]];let ang=Math.abs(Math.atan2(e0[1],e0[0])*180/Math.PI)%90;ang=Math.min(ang,90-ang);
      const bw=Math.max(...xs)-Math.min(...xs),bh=Math.max(...ys)-Math.min(...ys);
      cs={ancho:Math.max(0,bw-2*alero),largo:Math.max(0,bh-2*alero),retiroIzq:Math.min(...xs)+alero,retiroFrontal:Math.min(...ys)+alero,giro:ang,techo:[bw,bh],n:cp.length};
      /* contorno con más de 4 esquinas (casa en L u otra forma), en la planta de la casa */
      if(cp.length>4)cs.contorno=cp.map(p=>[p[0]-cs.retiroIzq,p[1]-cs.retiroFrontal])}
    const comps=(geo.comps||[]).map(x=>{const q=toPlan(this.local([x.p],ref)[0]);return{tipo:x.tipo,plan:[q[0]-x0,q[1]]}});
    const extras=(geo.extras||[]).filter(x=>x.pts&&x.pts.length>=3).map(x=>({tipo:x.tipo,nombre:x.nombre,plan:this.local(x.pts,ref).map(p=>{const q=toPlan(p);return[q[0]-x0,q[1]]})}));
    return{sides,frente:len,fondo,area:this.area(lot),per:sides.reduce((a,b)=>a+b,0),norte,plan,casa:cs,fi,extras,comps,toPlanLL:arr=>this.local(arr,ref).map(p=>{const q=toPlan(p);return[q[0]-x0,q[1]]})}}
};

/* ---------- interfaz del mapa ---------- */
const MV={map:null,geo:null,mode:'lote',layer:null,me:null,tilesOk:false,tileErr:0};
function openMap(){if(!window.L){toast('No se pudo cargar el mapa. Revisa tu conexión.');return}
  const g=P.lote.geo;MV.geo={pts:(g?.pts||[]).map(p=>p.slice()),casa:(g?.casa||[]).map(p=>p.slice()),extras:(g?.extras||[]).map(x=>({...x,pts:x.pts.map(p=>p.slice())})),comps:(g?.comps||[]).map(x=>({...x,p:x.p.slice()})),compP:null,otra:[],frente:g?.frente||0};dibInit();MV.calles=P.lote.calles?{...P.lote.calles}:null;MV.mode='lote';MV.tilesOk=false;MV.tileErr=0;
  const ov=document.createElement('div');ov.className='mapov';ov.id='mapov';
  ov.innerHTML=`<div class="mtop"><div class="inp msearch"><input id="msearch" type="search" placeholder="Buscar dirección o comuna" value="${esc([P.meta.direccion,P.meta.comuna].filter(Boolean).join(', '))}" autocomplete="off"></div>
    <button class="btn sm" data-mact="buscar">Buscar</button><button class="btn sm" data-mact="gps" aria-label="Ir a mi ubicación">GPS</button><button class="btn sm dark" data-mact="cerrar" aria-label="Cerrar mapa">✕</button></div>
    <div class="mwrap"><div class="mmap" id="mmap"></div><div class="mcross" aria-hidden="true"></div>
      <div class="mtools"><button class="btn sm" data-mact="fuentes" id="mfuente">Imagen: actual</button><span class="mzl" id="mfecha"></span><label class="btn sm"><input type="file" accept="image/*" data-aerea hidden>Foto aérea propia</label><button class="btn sm" data-mact="aeredit" id="maere" hidden>Ajustar foto aérea</button><span class="mzl" id="mzl"></span></div></div>
    <div class="mbar"><div class="seg"><button class="btn sm" data-mmode="lote">Terreno</button><button class="btn sm" data-mmode="casa">Casa</button><button class="btn sm" data-mmode="dib">Dibujar</button></div>
    <p class="mhelp" id="mhelp"></p><div id="mres"></div>
    <div class="row"><button class="btn sm dark" data-mact="mira">+ Marcar en la mira</button><button class="btn sm" data-mact="deshacer">Deshacer punto</button><button class="btn sm" data-mact="borrar">Borrar</button><button class="btn pri" data-mact="usar" id="musar">Usar estas medidas</button></div></div>`;
  document.body.appendChild(ov);document.body.classList.add('noscroll');
  const Z=MAPA.zoomMax;MV.fuente=MV.fuente||1;
  const map=L.map('mmap',{zoomControl:false,maxZoom:Z,tap:true,zoomSnap:0.5,zoomDelta:1,wheelPxPerZoomLevel:80,bounceAtZoomLimits:false});MV.map=map;L.control.zoom({position:'topright'}).addTo(map);map.attributionControl.setPrefix(false);
  const base=L.tileLayer(MV.fuente===2?MAPA.capa2:MAPA.capa,{maxNativeZoom:19,maxZoom:Z,attribution:MAPA.atribucion}).addTo(map);MV.base=base;
  MV.refs=[L.tileLayer(MAPA.calles,{maxNativeZoom:18,maxZoom:Z,opacity:.55}).addTo(map),L.tileLayer(MAPA.nombres,{maxNativeZoom:18,maxZoom:Z}).addTo(map)];
  if(window.ResizeObserver){MV.ro=new ResizeObserver(()=>MV.map?.invalidateSize({pan:false}));MV.ro.observe($('#mmap'))}
  map.on('zoomanim',()=>{if(MV.aerImg)MV.aerImg.style.visibility='hidden'});map.on('zoomend moveend viewreset resize',aerRender);if(P.lote.aerea)aerCargar(P.lote.aerea);
  map.on('zoomend',mapZoomInfo);map.on('moveend',mapNativeCheck);{let tf=0;map.on('moveend',()=>{clearTimeout(tf);tf=setTimeout(fechaToma,700)})}if(MV.fuenteId&&MV.fuenteId!=='esri')wbCargar().then(()=>fuenteSel(MV.fuenteId));
  base.on('tileload',()=>{MV.tilesOk=true});base.on('tileerror',()=>{MV.tileErr++;if(!MV.tilesOk&&MV.tileErr===4)mapHelp()});
  MV.layer=L.layerGroup().addTo(map);
  map.on('click',e=>{if(MV.mode==='aerea')return;if(dibClick(e.latlng))return;if(MV.mode==='comp'){MV.geo.compP=[e.latlng.lat,e.latlng.lng];drawMap();return}const arr=mArr();arr.push([e.latlng.lat,e.latlng.lng]);drawMap()});
  const all=[...MV.geo.pts,...MV.geo.casa];
  if(all.length)map.fitBounds(L.latLngBounds(all).pad(0.4),{maxZoom:20});
  else if(g?.center)map.setView(g.center,g.zoom||19);
  else{map.setView(MAPA.inicio,13);const q=$('#msearch').value.trim();if(q)mapSearch(q,true).then(ok=>{if(!ok)mapGps(true)});else mapGps(true)}
  drawMap()}
/* Cada zona tiene fotos hasta cierto acercamiento. Pasado ese nivel Esri entrega un cuadro gris
   ("Map data not yet available"), así que se averigua el máximo disponible y desde ahí se amplía la última foto real. */
const tileXY=(lat,lng,z)=>{const n=2**z,x=Math.floor((lng+180)/360*n),r=lat*Math.PI/180,y=Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n);return[x,y]};
MV.nat={};
async function mapNativeCheck(){const m=MV.map;if(!m||!MV.base)return;const c=m.getCenter(),[kx,ky]=tileXY(c.lat,c.lng,15),key=MV.fuente+':'+kx+':'+ky;
  let nz=MV.nat[key];
  if(nz==null){const root=(MV.fuente===2?MAPA.capa2:MAPA.capa).replace('/tile/{z}/{y}/{x}','');nz=19;
    for(const z of [20,19,18,17,16]){const[x,y]=tileXY(c.lat,c.lng,z);
      try{const r=await fetch(`${root}/tilemap/${z}/${y}/${x}/1/1?f=json`);if(!r.ok)throw 0;const j=await r.json();
        if(j&&Array.isArray(j.data)&&j.data[0]===1&&!j.adjusted){nz=z;break}if(z===16)nz=16}
      catch(e){nz=19;break}}
    MV.nat[key]=nz}
  if(!MV.map||MV.base.options.maxNativeZoom===nz)return;MV.base.options.maxNativeZoom=nz;MV.base.redraw();mapZoomInfo()}
function mapZoomInfo(){const m=MV.map,el=$('#mzl');if(!m||!el)return;const z=m.getZoom(),nz=MV.base?.options.maxNativeZoom||19;
  const mpp=156543.03*Math.cos(m.getCenter().lat*Math.PI/180)/2**z;
  el.textContent=`1 cm en pantalla ≈ ${fmt(mpp*38,mpp*38<2?2:1)} m`+(z>nz?' · ampliado':'')}
const mArr=()=>MV.mode==='casa'?MV.geo.casa:MV.mode==='otra'?MV.geo.otra:MV.geo.pts;
const MCOMP={porton:'Portón',arbol:'Árbol',arbusto:'Arbusto',palmera:'Palmera',piscina:'Piscina',quincho:'Quincho',cobertizo:'Cobertizo',bodega:'Bodega',estanque:'Estanque',poste:'Poste',medidor:'Medidor',jardinera:'Jardinera',escalera:'Escalera'};
const MOTRAS={edificacion:'Ampliación o pieza',quincho:'Quincho',cobertizo:'Cobertizo',bodega:'Bodega',carport:'Estacionamiento',piscina:'Piscina',radier:'Radier o patio',deck:'Terraza'};
/* ---------- foto aérea propia (dron, techo vecino…) alineada sobre el mapa con tres esquinas ---------- */
function aerCargar(a){MV.aer={...a,pts:a.pts.map(p=>p.slice()),op:a.op||.75};const im=new Image();im.onload=()=>{MV.aer.w=im.naturalWidth;MV.aer.h=im.naturalHeight;aerRender()};im.src=phSrc(a.ref);im.className='aerimg';im.draggable=false;MV.aerImg=im;MV.map.getPanes().overlayPane.appendChild(im)}
function aerRender(){const A=MV.aer,im=MV.aerImg,m=MV.map;if(!A||!im||!m||!A.w)return;const [TL,TR,BL]=A.pts.map(p=>m.latLngToLayerPoint(p));
  const a=(TR.x-TL.x)/A.w,b=(TR.y-TL.y)/A.w,c=(BL.x-TL.x)/A.h,d=(BL.y-TL.y)/A.h;Object.assign(im.style,{width:A.w+'px',height:A.h+'px',transform:`matrix(${a},${b},${c},${d},${TL.x},${TL.y})`,opacity:A.op,visibility:'visible'});
  const eb=$('#maere');if(eb)eb.hidden=!(A&&!A.edit);aerHandles()}
function aerHandles(){const A=MV.aer,m=MV.map;if(MV.aerLay){MV.aerLay.remove();MV.aerLay=null}if(!A||!A.edit)return;const lay=L.layerGroup().addTo(m);MV.aerLay=lay;
  const ic=t=>L.divIcon({className:'maerh',html:`<span>${t}</span>`,iconSize:[30,30],iconAnchor:[15,15]});
  A.pts.forEach((p,i)=>{const mk=L.marker(p,{draggable:true,icon:ic(['1','2','3'][i])}).addTo(lay);mk.on('drag',e=>{const q=e.target.getLatLng();A.pts[i]=[q.lat,q.lng];const keep=MV.aerLay;MV.aerLay=null;aerRender();MV.aerLay=keep});mk.on('dragend',aerRender)});
  const c=[(A.pts[1][0]+A.pts[2][0])/2,(A.pts[1][1]+A.pts[2][1])/2];const mc=L.marker(c,{draggable:true,icon:ic('✥')}).addTo(lay);let c0=c;
  mc.on('dragstart',()=>{c0=[mc.getLatLng().lat,mc.getLatLng().lng];A._p0=A.pts.map(p=>p.slice())});mc.on('drag',()=>{const q=mc.getLatLng(),dl=q.lat-c0[0],dg=q.lng-c0[1];A.pts=A._p0.map(p=>[p[0]+dl,p[1]+dg]);const keep=MV.aerLay;MV.aerLay=null;aerRender();MV.aerLay=keep});mc.on('dragend',aerRender)}
async function aerNueva(file){const b=await shrink(file);if(!b){toast('No se pudo leer la foto.');return}const ref=await storePhoto(b);const m=MV.map,sz=m.getSize();
  const im=new Image();im.src=URL.createObjectURL(b);await new Promise(r=>im.onload=r);const wpx=sz.x*.7,hpx=wpx*im.naturalHeight/im.naturalWidth,x0=sz.x*.15,y0=Math.max(10,(sz.y-hpx)/2);
  const ll=(x,y)=>{const q=m.containerPointToLatLng([x,y]);return[q.lat,q.lng]};
  if(MV.aerImg)MV.aerImg.remove();aerCargar({ref,pts:[ll(x0,y0),ll(x0+wpx,y0),ll(x0,y0+hpx)],op:.6});MV.aer.edit=true;MV.mode='aerea';drawMap()}
function aerGuardar(){const A=MV.aer;if(!A)return;A.edit=false;const eb=$('#maere');if(eb)eb.hidden=false;const g=P.lote.geo;let plan=null;
  if(g?.pts?.length>=3)try{plan=GeoLot.compute({pts:g.pts,frente:g.frente,casa:[]}).toPlanLL(A.pts)}catch(e){}
  P.lote.aerea={ref:A.ref,pts:A.pts,op:A.op,plan};persist();aerHandles();MV.mode='lote';drawMap();toast('Foto aérea fijada. Se verá en el mapa y en el croquis 3D.')}
function closeMap(){MV.aerImg?.remove();MV.aerImg=null;MV.aer=null;MV.aerLay=null;MV.ro?.disconnect();MV.ro=null;if(MV.map){MV.map.remove();MV.map=null}$('#mapov')?.remove();document.body.classList.remove('noscroll')}
function mapHelp(){const h=$('#mhelp');if(!h)return;const a=MV.geo;const al=fmt(P.casa.alero||0);if(dibHelp(h))return;
  if(!MV.tilesOk&&MV.tileErr>=4&&!a.pts.length){h.innerHTML='<b>No se pudieron cargar las imágenes satelitales.</b> Revisa la conexión. En la vista previa del navegador están bloqueadas; en la app instalada funcionan.';return}
  if(MV.mode==='casa'){h.textContent=a.casa.length<3?`Marca en orden todas las esquinas del techo de la casa, con la mira o tocando el mapa (${a.casa.length} marcadas). Si la casa es en L o tiene otra forma, marca cada quiebre. La app descuenta el alero de ${al} m.`:`${a.casa.length} esquinas. Sigue marcando si hay más quiebres, o arrastra para ajustar al borde del techo.`;return}
  if(MV.mode==='aerea'){const A=MV.aer;h.innerHTML=`<b>Alinea tu foto aérea.</b> Arrastra los puntos 1, 2 y 3 sobre las mismas esquinas en el mapa (cercos, esquinas de la casa) y ✥ para moverla entera.
      <span class="chips">${[[.4,'Transparente'],[.6,'Media'],[1,'Opaca']].map(([v,l])=>`<button class="chip" data-mact="aerop" data-v="${v}" aria-pressed="${A&&A.op===v}">${l}</button>`).join('')}</span>
      <span class="row"><button class="btn sm pri" data-mact="aerok">Fijar foto</button><button class="btn sm danger" data-mact="aerdel">Quitar foto</button></span>`;return}
  if(MV.mode==='comp'){h.innerHTML=!a.compP?`Toca el mapa (o usa la mira) donde está cada componente: portón, árboles, piscina, quincho, estanque…${a.comps.length?` Ubicados: ${a.comps.length}.`:''}`:`¿Qué hay aquí? <span class="chips">${Object.entries(MCOMP).map(([k,n])=>`<button class="chip" data-mact="comp" data-t="${k}">${n}</button>`).join('')}</span>`;return}
  if(MV.mode==='otra'){h.innerHTML=a.otra.length<3?`Marca las esquinas de otra construcción: ampliación, quincho, bodega, cobertizo, piscina… (${a.otra.length} marcadas).${a.extras.length?` Ya marcaste: ${a.extras.map(x=>esc(x.nombre)).join(', ')}.`:''}`:`¿Qué es? <span class="chips">${Object.entries(MOTRAS).map(([k,n])=>`<button class="chip" data-mact="otra" data-t="${k}">${n}</button>`).join('')}</span>`;return}
  h.innerHTML=queEs('deslindes')+' '+esc(a.pts.length===0?'Acerca con dos dedos hasta ver bien el cerco. Pon la mira sobre cada esquina y toca «Marcar en la mira» (o toca directo el mapa). Empieza por las dos esquinas del frente (el lado de la calle) y sigue por el contorno. Si la foto se ve borrosa, prueba «Imagen 2».':a.pts.length<3?`Sigue tocando las esquinas del terreno en orden (${a.pts.length} marcadas).`:'Arrastra un punto para ajustarlo al cerco. Abajo puedes cambiar el lado que da a la calle.')}
function drawMap(){const m=MV.map;if(!m)return;const G=MV.geo,lay=MV.layer;lay.clearLayers();
  document.querySelectorAll('[data-mmode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mmode===MV.mode));
  const res=GeoLot.compute(G,+P.casa.alero||0);
  const vtx=(arr,i,cls,lab)=>{const mk=L.marker(arr[i],{draggable:true,icon:L.divIcon({className:'mvx '+cls,html:`<span>${lab}</span>`,iconSize:[26,26],iconAnchor:[13,13]})}).addTo(lay);
    mk.on('drag',e=>{const p=e.target.getLatLng();arr[i]=[p.lat,p.lng];drawShapes()});mk.on('dragend',()=>drawMap())};
  function drawShapes(){lay.eachLayer(l=>{if(l._hshape)lay.removeLayer(l)});const r=GeoLot.compute(G,+P.casa.alero||0);
    const add=l=>{l._hshape=1;l.addTo(lay);return l};
    if(G.pts.length>=2){const n=G.pts.length;if(n>=3)add(L.polygon(G.pts,{color:'#f2b705',weight:2.5,fillColor:'#f2b705',fillOpacity:.12,interactive:false}));else add(L.polyline(G.pts,{color:'#f2b705',weight:2.5,interactive:false}));
      const fi=n>=3?((G.frente%n)+n)%n:0;add(L.polyline([G.pts[fi],G.pts[(fi+1)%n]],{color:'#ff5a1f',weight:5,interactive:false}));
      const lens=n>=3?r.sides:[GeoLot.dist(...GeoLot.local(G.pts,G.pts[0]))];
      for(let i=0;i<(n>=3?n:1);i++){const a=G.pts[i],b=G.pts[(i+1)%n];add(L.marker([(a[0]+b[0])/2,(a[1]+b[1])/2],{interactive:false,icon:L.divIcon({className:'mlen'+(i===fi?' fr':''),html:`<span>${fmt(lens[i],1)} m</span>`,iconSize:null})}))}}
    if(G.casa.length>=2)add(L.polygon(G.casa,{color:'#ffffff',weight:2,dashArray:'6 4',fillColor:'#ffffff',fillOpacity:.15,interactive:false}));
    for(const x of G.extras||[])add(L.polygon(x.pts,{color:'#ff5a1f',weight:2,fillColor:'#ff5a1f',fillOpacity:.15,interactive:false}));
    for(const x of G.comps||[])add(L.marker(x.p,{interactive:false,icon:L.divIcon({className:'mcomp',html:`<span>${esc(MCOMP[x.tipo]||x.tipo)}</span>`,iconSize:null})}));
    if(G.compP)add(L.circleMarker(G.compP,{radius:9,color:'#fff',weight:3,fillColor:'#ff5a1f',fillOpacity:1,interactive:false}));
    if(G.otra?.length>=2)add(L.polygon(G.otra,{color:'#ff5a1f',weight:2,dashArray:'5 4',fillOpacity:.08,interactive:false}));dibDraw(add,lay)}
  drawShapes();
  G.pts.forEach((p,i)=>vtx(G.pts,i,'lote',i+1));G.casa.forEach((p,i)=>vtx(G.casa,i,'casa','C'+(i+1)));(G.otra||[]).forEach((p,i)=>vtx(G.otra,i,'otra',i+1));
  mapHelp();
  const out=$('#mres');if(!out)return;$('#musar').disabled=!res;
  if(!res){out.innerHTML='';return}
  const c=res.casa,warn=c&&c.giro>8?`<p class="note warn">La casa está girada ${fmt(c.giro,0)}° respecto del frente. Los planos la dibujan alineada con el frente.</p>`:'';
  out.innerHTML=`<div class="summ msumm"><div><b>${fmt(res.frente,2)} m</b><span>Frente</span></div><div><b>${fmt(res.fondo,2)} m</b><span>Fondo</span></div><div><b>${fmt(res.area,0)} m²</b><span>Superficie</span></div><div><b>${fmt(res.norte,0)}°</b><span>Rumbo hacia el fondo</span></div></div>
    <div class="msides">${res.sides.map((l,i)=>`<button class="chip" data-mfrente="${i}" aria-pressed="${i===res.fi}">Lado ${i+1}–${(i+1)%res.sides.length+1} · ${fmt(l,2)} m${i===res.fi?' · calle':''}</button>`).join('')}</div>
    ${c?`<div class="summ msumm"><div><b>${fmt(c.ancho,2)} m</b><span>Frente casa</span></div><div><b>${fmt(c.largo,2)} m</b><span>Fondo casa</span></div><div><b>${fmt(c.retiroFrontal,2)} m</b><span>Antejardín</span></div><div><b>${fmt(c.retiroIzq,2)} m</b><span>Al deslinde izq.</span></div></div>
      <label class="mchk"><input type="checkbox" id="mcasa-apply" ${P.casa.ancho>0?'':'checked'}> Usar también las medidas de la casa${P.casa.ancho>0?' (reemplaza las actuales)':''}</label>${warn}`:''}
    <p class="note">Medidas aproximadas desde la imagen satelital: el error puede llegar a un metro por lado. El asistente te pedirá confirmarlas con huincha.</p>`}
async function mapSearch(q,quiet){try{const r=await fetch(MAPA.busqueda(q+', Chile'),{headers:{'Accept-Language':'es'}});const j=await r.json();
    if(j&&j[0]){MV.map?.setView([+j[0].lat,+j[0].lon],19);return true}if(!quiet)toast('No encontré esa dirección. Prueba con la calle y la comuna.');return false}
  catch(e){if(!quiet)toast('No se pudo buscar la dirección. Revisa la conexión.');return false}}
async function mapGps(quiet){const done=(lat,lng,acc)=>{if(!MV.map)return;MV.map.setView([lat,lng],19);if(MV.me)MV.me.remove();MV.me=L.layerGroup([L.circle([lat,lng],{radius:acc||10,color:'#2f80ed',weight:1,fillOpacity:.12,interactive:false}),L.circleMarker([lat,lng],{radius:6,color:'#fff',weight:2,fillColor:'#2f80ed',fillOpacity:1,interactive:false})]).addTo(MV.map)};
  const C=window.Capacitor,GP=C&&C.isNativePlatform&&C.isNativePlatform()?(C.Plugins?.Geolocation||C.registerPlugin?.('Geolocation')):null;
  try{if(GP){try{await GP.requestPermissions()}catch(e){}const p=await GP.getCurrentPosition({enableHighAccuracy:true,timeout:15000});done(p.coords.latitude,p.coords.longitude,p.coords.accuracy);return true}
    if(!navigator.geolocation)throw 0;await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(p=>{done(p.coords.latitude,p.coords.longitude,p.coords.accuracy);res()},rej,{enableHighAccuracy:true,timeout:15000}));return true}
  catch(e){if(!quiet)toast('No se pudo obtener tu ubicación. Revisa que el GPS y el permiso de ubicación estén activos.');return false}}
async function applyMap(){if(!MV.calles&&MV.geo.pts.length>=3)await callesBuscar(true);if(!MV.map)return;const res=GeoLot.compute(MV.geo,+P.casa.alero||0);if(!res)return;const lo=P.lote,c=P.casa,rr=v=>Math.round(v*100)/100;
  lo.frente=rr(res.frente);lo.fondo=rr(res.fondo);lo.norte=Math.round(res.norte);lo.norteMapa=lo.norte;lo.norteElegido=null;lo.norteOk=true;lo.plan=res.plan.map(p=>[Math.round(p[0]*1000)/1000,Math.round(p[1]*1000)/1000]);lo.fuente='mapa';
  lo.geo={pts:MV.geo.pts,casa:MV.geo.casa,frente:res.fi,center:[MV.map.getCenter().lat,MV.map.getCenter().lng],zoom:MV.map.getZoom()};delete P.ok['lote-mapa'];
  let casaOk=false;if(res.casa&&$('#mcasa-apply')?.checked){Object.assign(c,{ancho:rr(res.casa.ancho),largo:rr(res.casa.largo),retiroIzq:rr(res.casa.retiroIzq),retiroFrontal:rr(res.casa.retiroFrontal),fuente:'mapa'});delete P.ok['casa-mapa'];casaOk=true;c.contornoMapa=res.casa.contorno||null}
  const nx=(res.extras||[]).length;if(nx){const ox=+c.retiroIzq||0,oy=+c.retiroFrontal||0;P.elementos=(P.elementos||[]).filter(e=>e.origen!=='mapa');
    for(const x of res.extras){const pl=x.plan.map(q=>[q[0]-ox,q[1]-oy]);const cx=pl.reduce((s,q)=>s+q[0],0)/pl.length,cy=pl.reduce((s,q)=>s+q[1],0)/pl.length;
      const e=elemNew(x.tipo,[cx,cy]);const xs=pl.map(q=>q[0]),ys=pl.map(q=>q[1]);e.w=rr(Math.max(...xs)-Math.min(...xs));e.l=rr(Math.max(...ys)-Math.min(...ys));e.rot=0;
      e.forma='libre';e.pts=pl.map(q=>[rr(q[0]-cx),rr(q[1]-cy)]);e.nombre=x.tipo==='edificacion'?x.nombre:null;e.origen='mapa';e.est=true;P.elementos.push(e)}}
  const nc=(res.comps||[]).length;if(nc){const ox=+c.retiroIzq||0,oy=+c.retiroFrontal||0,LP=res.plan;P.elementos=(P.elementos||[]).filter(e=>e.origen!=='mapa-c');
    for(const x of res.comps){const p0=[x.plan[0]-ox,x.plan[1]-oy];let dir=[1,0];
      if(ELT[x.tipo]?.k==='linea'&&LP){let best=1e9;for(let i=0;i<LP.length;i++){const a=LP[i],b=LP[(i+1)%LP.length],dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((x.plan[0]-a[0])*dx+(x.plan[1]-a[1])*dy)/L2)),d=Math.hypot(x.plan[0]-a[0]-dx*t,x.plan[1]-a[1]-dy*t);if(d<best){best=d;dir=[dx,dy]}}}
      const e=elemNew(x.tipo,p0,dir);if(ELT[x.tipo]?.k==='linea')elMove(e,-(e.b[0]-e.a[0])/2,-(e.b[1]-e.a[1])/2);e.origen='mapa-c';e.est=true;P.elementos.push(e)}}
  const nd=dibAplicar(res);if(MV.aer&&lo.aerea){try{lo.aerea.plan=res.toPlanLL(MV.aer.pts);lo.aerea.pts=MV.aer.pts}catch(e){}}
  persist();closeMap();render();toast((casaOk?'Medidas del terreno y de la casa cargadas desde el mapa':'Medidas del terreno cargadas desde el mapa')+(nd?`, más ${nd} elemento${nd>1?'s':''} dibujado${nd>1?'s':''}`:'')+(P.lote.calle&&P.lote.calleAuto?` · calle: ${P.lote.calle}`:'')+'.');if(UI.trasMapa){UI.trasMapa=null;vivoOpen().then(()=>{if(VV?.guia)vGuiaIr(1)})}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mact],[data-mmode],[data-mfrente]');if(!b||!$('#mapov'))return;const d=b.dataset;
  if(d.mmode){MV.mode=d.mmode;drawMap();return}
  if(d.mfrente!=null){MV.geo.frente=+d.mfrente;drawMap();return}
  switch(d.mact){
    case 'cerrar':closeMap();if(UI.trasMapa){UI.trasMapa=null;vivoOpen()}break;
    case 'buscar':{const q=$('#msearch').value.trim();if(q)mapSearch(q);break}
    case 'gps':mapGps();break;
    case 'mira':{if(MV.mode==='aerea')break;if(MV.mode==='dib'||MV.cumb){dibClick(MV.map.getCenter());break}if(MV.mode==='comp'){const c=MV.map.getCenter();MV.geo.compP=[c.lat,c.lng];drawMap();break}const arr=mArr();
      const c=MV.map.getCenter();arr.push([c.lat,c.lng]);drawMap();break}
    case 'fuente':{MV.fuente=MV.fuente===2?1:2;MV.base.setUrl(MV.fuente===2?MAPA.capa2:MAPA.capa);MV.base.options.maxNativeZoom=19;b.textContent='Imagen '+MV.fuente;mapNativeCheck();
      toast(MV.fuente===2?'Imagen 2: otra toma satelital. Usa la que se vea más nítida.':'Imagen 1: toma satelital principal.');break}
    case 'deshacer':{if(MV.mode==='dib'){if(MV.geo.cur.length)MV.geo.cur.pop();else if(MV.geo.dib.length){MV.geo.dib.pop();MV.sel=null;toast('Se quitó el último dibujo.')}drawMap();break}if(MV.cumb||(MV.mode==='casa'&&!MV.geo.casa.length&&MV.geo.techo?.cumb?.length)){MV.geo.techo.cumb.pop();drawMap();break}if(MV.mode==='comp'){if(MV.geo.compP)MV.geo.compP=null;else MV.geo.comps.pop();drawMap();break}const arr=mArr();if(arr.length)arr.pop();else if(MV.mode==='otra'&&MV.geo.extras.length){MV.geo.extras.pop();toast('Se quitó la última construcción.')}drawMap();break}
    case 'borrar':if(MV.mode==='dib'){const it=MV.geo.dib.find(x=>x.id===MV.sel);if(it){MV.geo.dib=MV.geo.dib.filter(x=>x!==it);MV.sel=null}else MV.geo.cur=[];drawMap();break}if(MV.mode==='casa')MV.geo.casa=[];else if(MV.mode==='otra'){MV.geo.otra=[];MV.geo.extras=[]}else if(MV.mode==='comp'){MV.geo.comps=[];MV.geo.compP=null}else{MV.geo.pts=[];MV.geo.frente=0}drawMap();break;
    case 'aerok':aerGuardar();break;
    case 'aerop':if(MV.aer){MV.aer.op=+b.dataset.v;aerRender();drawMap()}break;
    case 'aerdel':MV.aerImg?.remove();MV.aerImg=null;MV.aer=null;aerHandles();delete P.lote.aerea;persist();MV.mode='lote';drawMap();toast('Foto aérea quitada.');break;
    case 'aeredit':if(MV.aer){MV.aer.edit=true;MV.mode='aerea';aerHandles();drawMap()}break;
    case 'comp':{if(!MV.geo.compP)break;MV.geo.comps.push({tipo:b.dataset.t,p:MV.geo.compP});MV.geo.compP=null;toast(`${MCOMP[b.dataset.t]} ubicado.`);drawMap();break}
    case 'otra':{const t=b.dataset.t;if(MV.geo.otra.length<3)break;MV.geo.extras.push({tipo:t,nombre:MOTRAS[t],pts:MV.geo.otra});MV.geo.otra=[];toast(`${MOTRAS[t]} marcada. Puedes marcar otra.`);drawMap();break}
    case 'usar':applyMap();break}});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.aerea!=null&&t.files?.[0]&&MV.map){const f=t.files[0];t.value='';aerNueva(f)}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='msearch'){e.preventDefault();const q=e.target.value.trim();if(q)mapSearch(q)}});
