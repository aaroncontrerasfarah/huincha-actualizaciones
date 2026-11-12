/* Huincha — ubicación en el terreno y señalar elementos con la cámara.
   1) El usuario indica en el plano dónde está (o usa el GPS o "estoy en el portón") y hacia dónde mira
      (o la brújula, si el norte del terreno es conocido). Eso ancla la realidad aumentada o los pasos al terreno.
   2) Desde ahí, toca en la cámara el pie de un elemento: la app calcula su ubicación (realidad aumentada: punto exacto;
      pasos: dirección de la brújula + distancia), la IA sugiere qué es y sus medidas, y se dibuja en el croquis. */
"use strict";
/* conversión de realidad aumentada a la planta con orientación libre */
function vArRefPlan(p){const R=VV.arRef;if(!R)return null;let fx=R.f[0],fz=R.f[2];const n=Math.hypot(fx,fz)||1;fx/=n;fz/=n;const rx=-fz,rz=fx;
  const dx=p[0]-R.c[0],dz=p[2]-R.c[2],a=dx*fx+dz*fz,b=dx*rx+dz*rz,th=R.th??Math.PI/2,c=Math.cos(th),s=Math.sin(th);return[R.S[0]+a*c+b*s,R.S[1]+a*s-b*c]}

/* brújula siempre activa durante el recorrido (también con realidad aumentada) */
function vBrujulaOn(){if(!VV||VV._brujula)return;VV._brujula=true;const h=e=>{if(!VV){window.removeEventListener('deviceorientationabsolute',h);return}vOrient(e,true)};window.addEventListener('deviceorientationabsolute',h)}
/* dirección en la planta según la brújula, si el norte del terreno es conocido */
function vThetaBrujula(){if(!(P.lote.norteOk&&VV.head!=null&&VV.absOk))return null;const h0=((+P.lote.norte||0)+90)%360,a=(VV.head-h0)*Math.PI/180;return Math.atan2(-Math.sin(a),Math.cos(a))}

/* fija la posición (planta de la casa) y la dirección de la vista */
function vAnclar(p,th){if(th==null)th=vThetaBrujula();
  if(VV.eng==='ar'){const a=VV.ar;if(!a?.cam){toast('Mueve el equipo lentamente hasta que la realidad aumentada reconozca el suelo, y vuelve a indicar dónde estás.');return false}
    VV.arRef={c:a.cam.slice(),f:a.fwd.slice(),S:p.slice(),th:th??Math.PI/2,prio:true}}
  else{VV.dr=p.slice();if(th!=null){VV.fixDir=[Math.cos(th),Math.sin(th)];if(VV.head!=null)VV.h0=((VV.head+th*180/Math.PI)%360+360)%360}if(P.lote.norteOk&&VV.absOk)VV.h0=((+P.lote.norte||0)+90)%360}
  if(VV.guia)VV.guia.ok=1;VV.ubicado=Date.now();V3.sig='';vCroquis();return true}

/* ---------- plano para indicar dónde estás ---------- */
function vPortonPlan(){const e=[...VV.elems,...(P.elementos||[])].find(q=>q.t==='porton');return e?elCenter(e):null}
function vCasaCentro(){const cp=vCasaPrevia();if(cp)return[cp.x,cp.y];if(VV.sides.length){const {pts}=vPoly();return[pts.reduce((s,q)=>s+q[0],0)/pts.length,pts.reduce((s,q)=>s+q[1],0)/pts.length]}return[4,4]}
function vUbicar(motivo){vBrujulaOn();VV.ub={paso:'pos',p:null,motivo};vUbPinta();
  if(P.lote.geo?.pts?.length>=3&&navigator.geolocation)navigator.geolocation.getCurrentPosition(pos=>{if(!VV?.ub)return;try{const res=GeoLot.compute({pts:P.lote.geo.pts,frente:P.lote.geo.frente,casa:[]});const q=res.toPlanLL([[pos.coords.latitude,pos.coords.longitude]])[0];
      VV.ub.gps=[q[0]-(+P.casa.retiroIzq||0),q[1]-(+P.casa.retiroFrontal||0)];VV.ub.acc=Math.round(pos.coords.accuracy||10);vUbPinta()}catch(e){}},()=>{},{enableHighAccuracy:true,timeout:9000,maximumAge:5000})}
function vUbSVG(){const LP=vLotePlan(),cp=vCasaPrevia(),U=VV.ub;const pts=[...(LP||[])];let casa='';
  if(VV.sides.length){const {pts:cs}=vPoly();pts.push(...cs);casa=`<polygon class="ubcasa" points="${cs.map(q=>`${q[0]},${-q[1]}`).join(' ')}"/>`}
  else if(cp){const f=elFoot(cp);pts.push(...f);casa=`<polygon class="ubcasa" points="${f.map(q=>`${q[0]},${-q[1]}`).join(' ')}"/><text x="${cp.x}" y="${-cp.y}" class="ubtx">CASA</text>`}
  const els=[...VV.elems,...(P.elementos||[]).filter(e=>!VV.elems.some(v=>v.id===e.id))].map(e=>{const T=eltOf(e);if(T.k==='linea')return`<line x1="${e.a[0]}" y1="${-e.a[1]}" x2="${e.b[0]}" y2="${-e.b[1]}" class="ubel l"/>`;if(T.k==='punto')return`<circle cx="${e.x}" cy="${-e.y}" r="${Math.max(.3,(e.w||1)/2)}" class="ubel"/>`;return`<polygon points="${elFoot(e).map(q=>`${q[0]},${-q[1]}`).join(' ')}" class="ubel"/>`}).join('');
  for(const e of VV.elems)pts.push(elCenter(e));if(U?.gps)pts.push(U.gps);if(U?.p)pts.push(U.p);if(!pts.length)pts.push([-5,-8],[15,15]);
  const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),x0=Math.min(...xs)-3,x1=Math.max(...xs)+3,y0=Math.min(...ys)-4,y1=Math.max(...ys)+3;
  const here=U?.p?`<circle cx="${U.p[0]}" cy="${-U.p[1]}" r=".7" class="ubyo"/>${U.dir!=null?`<line x1="${U.p[0]}" y1="${-U.p[1]}" x2="${U.p[0]+Math.cos(U.dir)*3}" y2="${-(U.p[1]+Math.sin(U.dir)*3)}" class="ubdir"/>`:''}`:'';
  const gps=U?.gps?`<circle cx="${U.gps[0]}" cy="${-U.gps[1]}" r="${Math.min(15,U.acc||8)}" class="ubgpsr"/><circle cx="${U.gps[0]}" cy="${-U.gps[1]}" r=".5" class="ubgps"/>`:'';
  return`<svg id="ubsvg" class="ubsvg" viewBox="${x0} ${-y1} ${x1-x0} ${y1-y0}" preserveAspectRatio="xMidYMid meet">${LP?`<polygon class="ublot" points="${LP.map(q=>`${q[0]},${-q[1]}`).join(' ')}"/>`:''}
    <text x="${(x0+x1)/2}" y="${-y0-1}" class="ubtx">CALLE</text>${casa}${els}${gps}${here}</svg>`}
function vUbPinta(){let ov=$('#vubic');const U=VV?.ub;if(!U){ov?.remove();return}
  if(!ov){ov=document.createElement('div');ov.id='vubic';ov.className='vubic';$('#vivo').appendChild(ov)}
  const brujula=vThetaBrujula()!=null,porton=vPortonPlan();
  const txt=U.paso==='pos'?`<b>¿Dónde estás ahora?</b> Toca tu posición en el plano del terreno.${U.gps?` El punto azul es tu GPS (±${U.acc} m).`:''}`
    :`<b>¿Hacia dónde miras?</b> Toca en el plano un punto hacia donde apunta la cámara (por ejemplo, la puerta de la casa).${brujula?' O usa la brújula.':''}`;
  ov.innerHTML=`<div class="ubpan"><div class="row sb"><span class="ubh">${txt}</span><button class="btn sm dark" data-ub="cerrar" aria-label="Cerrar">✕</button></div>${vUbSVG()}
    <div class="vacts">${U.paso==='pos'?`${porton?'<button class="btn sm pri" data-ub="porton">Estoy en el portón</button>':''}${U.gps?'<button class="btn sm" data-ub="gps">Usar mi GPS</button>':''}`
      :`<button class="btn sm pri" data-ub="casa">Miro hacia la casa</button>${brujula?'<button class="btn sm" data-ub="brujula">Usar la brújula</button>':''}<button class="btn sm ghost" data-ub="atras">Cambiar posición</button>`}</div></div>`;
  const svg=$('#ubsvg');svg.addEventListener('pointerup',ev=>{const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const q=pt.matrixTransform(svg.getScreenCTM().inverse());const p=[rr2(q.x),rr2(-q.y)];
    if(U.paso==='pos'){U.p=p;U.paso='dir';U.dir=null;vUbPinta()}else{U.dir=Math.atan2(p[1]-U.p[1],p[0]-U.p[0]);vUbFin(U.dir)}})}
function vUbFin(th){const U=VV.ub;if(!U?.p)return;if(vAnclar(U.p,th)){VV.ub=null;vUbPinta();toast('Listo: la app sabe dónde estás. Ahora toca 👆 Señalar y toca en la cámara lo que quieras registrar.');vPanel()}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ub]');if(!b||!VV?.ub)return;const U=VV.ub;
  switch(b.dataset.ub){
    case 'cerrar':VV.ub=null;vUbPinta();break;
    case 'porton':{const pp=vPortonPlan();if(!pp)break;U.p=[pp[0],pp[1]-.6];U.paso='dir';vUbPinta();break}
    case 'gps':if(U.gps){U.p=U.gps.slice();U.paso='dir';vUbPinta()}break;
    case 'atras':U.paso='pos';U.p=null;vUbPinta();break;
    case 'casa':{const c=vCasaCentro();vUbFin(Math.atan2(c[1]-U.p[1],c[0]-U.p[0]));break}
    case 'brujula':vUbFin(vThetaBrujula());break}});

/* ---------- señalar un elemento tocando la cámara ---------- */
const SENAL_TIPOS=['porton','reja','piscina','cobertizo','quincho','edificacion','terraza','escalera','radier','camino','estacionamiento','arbol','arbusto','pilar','muro','bodega','jardinera','estanque','otro'];
function vSenalToggle(){if(!VV.ubicado){toast('Primero indica dónde estás, para ubicar bien lo que señales.');vUbicar('senal');return}VV.senal=!VV.senal;$('#vcam')?.classList.toggle('senalando',VV.senal);vPanel();
  if(VV.senal)toast('Toca en la cámara el pie del elemento (donde toca el suelo).')}
document.addEventListener('pointerup',async ev=>{if(!VV?.senal||VV.ub)return;const cam=$('#vcam');if(!cam||!cam.contains(ev.target)||ev.target.closest('button,a,input,.vcro,.vhud,.viast,.vguia'))return;
  const rc=cam.getBoundingClientRect(),nx=(ev.clientX-rc.left)/rc.width,ny=(ev.clientY-rc.top)/rc.height;VV.senal=false;cam.classList.remove('senalando');
  const here=vHere();let pt=null,dist=null,ang=null,u=nx;
  if(VV.eng==='ar'){try{const r=await arPlugin().hitTest({x:nx,y:ny});if(r?.p){pt=vToHouse(r.p);dist=VV.ar?.cam?hdist(VV.ar.cam,r.p):null}}catch(e){}}
  if(!pt&&here){const v=$('#vvid'),vw=v?.videoWidth||rc.width,vh=v?.videoHeight||rc.height,k=Math.max(rc.width/vw,rc.height/vh),dw=vw*k,ox=(rc.width-dw)/2;u=(nx*rc.width-ox)/dw;
    const hfov=VV.eng==='ar'&&VV.ar?.proj?2*Math.atan(1/VV.ar.proj[0])*180/Math.PI:(vw>vh?63:48);ang=Math.atan2(here.dir[1],here.dir[0])-(u-.5)*hfov*Math.PI/180}
  VV.sp={nx,ny,u,v:ny,pt,dist:dist?rr2(dist):null,ang,here,tipo:null,ia:null,img:null};VV.sub='senal';vPanel();
  /* foto con el punto marcado, y sugerencia de la IA */
  try{const blob=await vGrab();if(!blob||!VV?.sp)return;const bm=await createImageBitmap(blob);const cv=document.createElement('canvas');cv.width=bm.width;cv.height=bm.height;const g=cv.getContext('2d');g.drawImage(bm,0,0);
    const px=Math.max(0,Math.min(1,u))*bm.width,py=ny*bm.height;g.strokeStyle='#ff2d2d';g.lineWidth=Math.max(4,bm.width/120);g.beginPath();g.arc(px,py,bm.width/22,0,7);g.stroke();
    const mb=await new Promise(r=>cv.toBlob(r,'image/jpeg',.85));VV.sp.img=URL.createObjectURL(mb);vPanel();if(!(await IA.mode()))return;VV.sp.iaBusy=true;vPanel();
    const mc=await senalCompuesta(bm,px,py);
    const o=await IA.ask(mc,`Eres arquitecto. La imagen tiene dos partes: a la izquierda la foto completa de un terreno con vivienda, con un CÍRCULO ROJO; a la derecha, la zona del círculo ampliada. El círculo marca un elemento constructivo o del terreno. ¿Qué es?
${IA_CHILE}
Responde SOLO JSON: {"tipo":"clave","alt":["clave"],"nombre":"cómo se llama, 2-4 palabras","ancho":3,"largo":2,"alto":1.8,"dist":5,"material":"clave o null","detalle":"breve"}
Claves de tipo: ${Object.keys(ELT).join(', ')}. "dist": metros desde la cámara al círculo. "ancho" a lo ancho de la imagen, "largo" hacia el fondo. Español de Chile.`,500);
    if(!VV?.sp)return;VV.sp.iaBusy=false;if(o&&ELT[o.tipo]){VV.sp.ia={tipo:o.tipo,alt:(o.alt||[]).filter(k=>ELT[k]&&k!==o.tipo).slice(0,3),nombre:o.nombre?String(o.nombre).slice(0,40):null,ancho:+o.ancho>0?+o.ancho:null,largo:+o.largo>0?+o.largo:null,alto:+o.alto>0?+o.alto:null,dist:+o.dist>0?+o.dist:null,mat:o.material,det:String(o.detalle||'')};
      if(!VV.sp.tipo)VV.sp.tipo=o.tipo;if(VV.sp.dist==null&&VV.sp.ia.dist)VV.sp.dist=rr2(VV.sp.ia.dist)}vPanel()}
  catch(e){if(VV?.sp){VV.sp.iaBusy=false;vPanel()}}});
function vSenalHTML(){const S=VV.sp;if(!S)return'';const ia=S.ia;
  const foto=S.img?`<div class="vthumb"><img src="${S.img}" alt="Elemento señalado"></div>`:'';
  const sug=S.iaBusy?'<p class="vh">La IA está mirando lo que señalaste…</p>':ia?`<p class="vh">La IA cree que es <b>${esc(ia.nombre||ELT[ia.tipo].n)}</b>${ia.det?' · '+esc(ia.det):''}.</p>`:'';
  const tipos=[...new Set([ia?.tipo,...(ia?.alt||[]),...SENAL_TIPOS].filter(Boolean))];
  const necesitaDist=!S.pt;
  return`<p class="vq">¿Qué es lo que señalaste?</p>${foto}${sug}
    <div class="chips">${tipos.map(k=>`<button class="chip" data-sn="tipo:${k}" aria-pressed="${S.tipo===k}">${picto(k)}${ELT[k].n}</button>`).join('')}</div>
    ${necesitaDist?`<div class="fld"><span>¿A qué distancia está? (desde ti)</span><div class="chips">${[2,4,6,8,10,15,20].map(d=>`<button class="chip" data-sn="dist:${d}" aria-pressed="${S.dist===d}">${d} m</button>`).join('')}</div>
      <div class="inp"><input data-snd inputmode="decimal" value="${S.dist!=null?String(S.dist).replace('.',','):''}" placeholder="o escribe los metros"><em>m</em></div></div>`:`<p class="vh">📍 Ubicado con la cámara${S.dist?` a ${fmt(S.dist,1)} m de ti`:''}.</p>`}
    <div class="vacts"><button class="btn pri" data-sn="ok" ${S.tipo&&(S.pt||S.dist)?'':'disabled'}>Agregar al croquis</button><button class="btn ghost" data-sn="x">Cancelar</button></div>`}
function vSenalOk(){const S=VV.sp;if(!S?.tipo)return;let pt=S.pt;if(!pt&&S.here&&S.dist){pt=[S.here.p[0]+Math.cos(S.ang)*S.dist,S.here.p[1]+Math.sin(S.ang)*S.dist]}if(!pt)return;
  vSnap();const T=ELT[S.tipo],view=S.here?Math.atan2(pt[1]-S.here.p[1],pt[0]-S.here.p[0]):0;const perp=[-Math.sin(view),Math.cos(view)];
  const e=elemNew(S.tipo,pt,T.k==='linea'?perp:[1,0]);const ia=S.ia&&S.ia.tipo===S.tipo?S.ia:null;
  if(T.k==='linea'){if(ia?.ancho)elSetLen(e,ia.ancho);elMove(e,-(e.b[0]-e.a[0])/2,-(e.b[1]-e.a[1])/2)}else{if(ia?.ancho)e.w=ia.ancho;if(ia?.largo)e.l=ia.largo;if(T.k==='punto')e.l=e.w;else if(T.k!=='punto'){/* el punto tocado es el borde cercano: el centro queda detrás */const d=(e.l||1)/2;e.x+=Math.cos(view)*d;e.y+=Math.sin(view)*d}}
  if(ia?.alto&&(T.k!=='area'||['piscina','escalera','terraza','jardinera'].includes(S.tipo)))e.h=ia.alto;if(ia?.nombre&&ia.nombre.toLowerCase()!==T.n.toLowerCase())e.nombre=ia.nombre;
  const mo=elMatOpts(e);if(ia?.mat&&mo?.[ia.mat])e.mat=ia.mat;e.det=ia?.det||'';e.est=true;e.src='senal';VV.elems.push(e);VV.sp=null;VV.sel=e.id;VV.sub='edit';vPanel();vCroquis();
  toast(`${elNombre(e)} dibujado en el croquis. Ajusta sus medidas si hace falta.`)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-sn]');if(!b||!VV?.sp)return;const [a,x]=b.dataset.sn.split(':');
  if(a==='tipo'){VV.sp.tipo=x;vPanel()}else if(a==='dist'){VV.sp.dist=+x;vPanel()}else if(a==='ok')vSenalOk();else if(a==='x'){VV.sp=null;VV.sub=null;vPanel()}});
document.addEventListener('change',e=>{if(!VV?.sp||!e.target.hasAttribute?.('data-snd'))return;const v=num(e.target.value);if(v>0){VV.sp.dist=v;vPanel()}});
/* botones de las herramientas */
document.addEventListener('click',e=>{const b=e.target.closest('[data-ve="ubic"],[data-ve="senal"]');if(!b||!VV)return;if(b.dataset.ve==='ubic')vUbicar('manual');else vSenalToggle()});
