/* Huincha — ayudas para que la IA reconozca bien, pensadas para quien nunca ha hecho un plano.
   1. Plantilla sobre la cámara (fachada completa, rincón de un recinto, frente del terreno) y nivel para enderezar el teléfono.
   2. Revisión de la imagen antes de enviarla: si está oscura o movida, se toma otra sola y no se gasta una consulta.
   3. Foco por etapa y lo ya confirmado en la casa, para que la IA sepa qué buscar.
   4. Dibujos para elegir cuando la IA duda (portón, reja, radier…), y la zona señalada se envía ampliada.
   5. Dibujo de dónde pararse y hacia dónde apuntar en cada etapa del recorrido. */
"use strict";
/* ---------- 1. plantilla y nivel ---------- */
const PLANT={
  fachada:{t:'Toda la fachada dentro del recuadro: con el techo arriba y el suelo abajo. Si puedes, que salga una puerta completa.',
    svg:'<path d="M8 40 L50 14 L92 40" class="pl"/><rect x="8" y="40" width="84" height="44" class="pl"/><line x1="0" y1="84" x2="100" y2="84" class="pl s"/>'},
  rincon:{t:'Apunta a un rincón: que se vean dos muros, el piso y el cielo.',
    svg:'<path d="M50 10 L50 70 M50 70 L8 92 M50 70 L92 92 M50 10 L8 2 M50 10 L92 2" class="pl"/>'},
  frente:{t:'Toda la reja y el portón dentro del recuadro, de un poste al otro.',
    svg:'<rect x="4" y="38" width="92" height="40" class="pl"/><line x1="0" y1="78" x2="100" y2="78" class="pl s"/>'}};
function vPlantModo(){if(!VV)return null;const g=typeof vGuia==='function'?vGuia():null;
  if(VV.st==='guia'&&g&&g.fach!=null&&!VV.fRes&&!VV.fBusy)return'fachada';
  if(VV.st==='rooms'&&!VV.rsug)return'rincon';
  if(VV.st==='guia'&&g&&g.k==='frente')return'frente';return null}
function vNivel(){const b=VV?.tiltB,gm=VV?.tiltG;if(b==null||gm==null)return null;const ang=(screen.orientation&&screen.orientation.angle)||window.orientation||0;
  if(ang===90||ang===-90||ang===270)return{roll:ang===90?b:-b,pitch:Math.abs(gm)};return{roll:gm,pitch:b}}
function vCapturaTick(){if(!VV)return;const cam=$('#vcam');if(!cam)return;let pl=$('#vplant'),nv=$('#vnivel');
  if(!pl){pl=document.createElement('div');pl.id='vplant';pl.className='vplant';pl.setAttribute('aria-hidden','true');cam.appendChild(pl);nv=document.createElement('div');nv.id='vnivel';nv.className='vnivel';cam.appendChild(nv)}
  const m=vPlantModo();if(pl.dataset.m!==(m||'')){pl.dataset.m=m||'';pl.innerHTML=m?`<svg viewBox="0 0 100 100" preserveAspectRatio="none">${PLANT[m].svg}</svg><p>${PLANT[m].t}</p>`:'';pl.hidden=!m}
  const n=vNivel();if(!m||!n){nv.hidden=true;return}nv.hidden=false;const okR=Math.abs(n.roll)<4,okP=m==='rincon'||Math.abs(n.pitch-90)<18;
  const msg=!okR?(n.roll>0?'Gira el teléfono un poco a la izquierda':'Gira el teléfono un poco a la derecha'):!okP?(n.pitch<90?'Levanta el teléfono: estás apuntando al suelo':'Baja el teléfono: estás apuntando al cielo'):'Derecho ✓';
  nv.className='vnivel'+(okR&&okP?' ok':'');nv.innerHTML=`<i style="transform:rotate(${(-n.roll).toFixed(1)}deg)"></i><span>${msg}</span>`}
setInterval(vCapturaTick,250);
window.addEventListener('deviceorientation',e=>{if(VV&&e.beta!=null){VV.tiltB=e.beta;VV.tiltG=e.gamma}});

/* ---------- 2. calidad de la imagen ---------- */
async function fotoCalidad(blob){try{const bm=await createImageBitmap(blob);const w=192,h=Math.max(1,Math.round(bm.height*w/bm.width));const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');g.drawImage(bm,0,0,w,h);
  const d=g.getImageData(0,0,w,h).data,G=new Float32Array(w*h);let s=0;for(let i=0;i<w*h;i++){G[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];s+=G[i]}const lum=s/(w*h);
  let m=0,m2=0,n=0;for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;const L=4*G[i]-G[i-1]-G[i+1]-G[i-w]-G[i+w];m+=L;m2+=L*L;n++}const nit=n?m2/n-(m/n)**2:0;
  const motivo=lum<38?'oscura':lum>242?'quemada':nit<9?'movida':null;return{lum,nit,ok:!motivo,motivo}}catch(e){return{ok:true,nit:0,lum:128}}}
const CAL_MSG={oscura:'La imagen está muy oscura: enciende una luz o abre una cortina.',quemada:'Hay demasiada luz: no apuntes directo al sol o a una ventana.',movida:'La imagen salió movida: quédate quieto un segundo.'};
/* toma hasta n imágenes y devuelve la más nítida; en la revisión automática no envía nada si todas están malas */
async function vGrabBueno(o={}){
  if(o.fach){const t0=Date.now();let avisado=false;while(Date.now()-t0<2500){const n=vNivel();if(!n||Math.abs(n.roll)<5)break;if(!avisado){toast('Endereza el teléfono para la foto…');avisado=true}await sleep(200)}}
  let best=null;const N=o.n||(o.auto?2:3);for(let k=0;k<N;k++){if(!VV)return null;const b=await vGrab();if(!b)break;const q=await fotoCalidad(b);if(!best||q.nit>best.q.nit&&!(q.motivo==='oscura'&&best.q.ok))best={b,q};if(q.ok&&q.nit>25)break;if(k<N-1)await sleep(320)}
  if(!best)return null;if(!best.q.ok){if(o.auto){vIaEstado('ok',CAL_MSG[best.q.motivo]);return null}toast(CAL_MSG[best.q.motivo]+' La envío igual.')}return best.b}

/* ---------- 3. qué buscar en cada etapa ---------- */
const GUIA_FOCO={
  frente:'el cierre del frente: portón (corredizo sobre riel o batiente con bisagras; de fierro, madera, malla o placa), puerta peatonal, reja o muro, pilares, medidores de agua y luz en nichos, vereda y antejardín',
  acceso:'el camino del portón a la puerta (radier, adoquín, gravilla, cerámico), escalones, terraza de acceso, antejardín con pasto o jardineras, estacionamiento',
  patio1:'construcciones y elementos del patio a la izquierda: quincho, bodega, cobertizo, piscina, árboles, cerco con el vecino, radier',
  patio2:'el deslinde de fondo (cerco, muro, malla) y lo que esté cerca: bodega, quincho, árboles, estanque, fosa séptica o cámaras',
  patio3:'construcciones y elementos del patio a la derecha: cobertizo, carport, logia exterior, árboles, cerco con el vecino',
  contorno:'el muro de la casa junto al que se camina: ventanas, puertas, bajadas de agua, medidores, terrazas'};
function iaFoco(){const g=typeof vGuia==='function'?vGuia():null;return g&&GUIA_FOCO[g.k]?`Qué buscar ahora: ${GUIA_FOCO[g.k]}.`:''}
function iaConfirmado(){const M=P.mat||{},o=[];const n=(grp,k)=>k&&MATS[grp]?.opts?.[k]?.n;
  if(n('revExt',M.revExt))o.push('revestimiento '+n('revExt',M.revExt).toLowerCase());if(n('cubierta',M.cubierta))o.push('cubierta '+n('cubierta',M.cubierta).toLowerCase());if(n('ventanas',M.ventanas))o.push('ventanas '+n('ventanas',M.ventanas).toLowerCase());
  if(P.casa?.techo)o.push('techo '+P.casa.techo.replace('-',' '));const el=[...new Set((P.elementos||[]).filter(e=>!e.est).map(e=>elNombre(e).toLowerCase()))].slice(0,10);if(el.length)o.push('elementos confirmados: '+el.join(', '));
  return o.length?'Confirmado por el usuario en esta casa: '+o.join('; ')+'.':''}
const IA_CHILE=`Cómo se ven las cosas en casas chilenas:
- Portón corredizo: una hoja grande de fierro o madera que se desliza sobre un riel en el suelo. Portón batiente: una o dos hojas con bisagras en pilares. Puerta peatonal: hoja angosta (≈1 m) junto al portón.
- Reja: barrotes verticales de fierro entre pilares. Malla: alambre tejido en rombos. Cerco: tablas o placas de madera. Muro: albañilería o bloques, a veces con estuco.
- Siding: tablas horizontales traslapadas (fibrocemento, vinílico o madera). Tinglado: tablas de madera traslapadas. Estuco: superficie lisa pintada.
- Zinc: planchas onduladas o trapezoidales. Teja asfáltica: escamas planas. Teja de arcilla o hormigón: piezas curvas o planas rojizas.
- Radier: losa de hormigón gris. Cerámico o porcelanato exterior: baldosas con juntas. Gravilla: piedrecillas sueltas. Adoquín: bloques pequeños encajados.
- Cobertizo o carport: techo liviano sobre pilares, sin muros. Quincho: techo con parrilla de ladrillo o metálica. Bodega: caseta cerrada pequeña.
- Medidor de agua: tapa en el suelo o nicho junto a la reja. Medidor de luz: caja en poste o pilastra con el cable de llegada.`;

/* ---------- 4. dibujos para elegir ---------- */
const PICTO={
  porton:'<rect x="2" y="7" width="20" height="13" rx="1"/><path d="M5 7v13M8 7v13M11 7v13M14 7v13M17 7v13M2 20h20"/>',
  reja:'<path d="M2 20h20M4 6v14M8 6v14M12 6v14M16 6v14M20 6v14M2 9h20M2 17h20"/>',
  cerco:'<path d="M2 20h20M4 8l1-2 1 2v12H4zM9 8l1-2 1 2v12H9zM14 8l1-2 1 2v12h-2zM19 8l1-2 1 2v12h-2z"/>',
  malla:'<path d="M2 20h20M3 6v14M21 6v14M3 6l18 14M3 13l9 7M3 20l18-14M12 6l9 7M3 13l9-7M12 20l9-7"/>',
  muro:'<rect x="2" y="6" width="20" height="14"/><path d="M2 10.5h20M2 15h20M7 6v4.5M14 6v4.5M10 10.5V15M17 10.5V15M7 15v5M14 15v5"/>',
  muroContencion:'<path d="M2 20h20M4 20V8l6 2v10M10 13h12"/>',
  radier:'<path d="M2 15l6-5h14l-6 5z"/><path d="M2 15v3h14v-3M16 18l6-5v-3"/>',
  ceramico:'<path d="M2 16l6-6h14l-6 6z"/><path d="M5 13h14M8 10l-3 6M12 10l-3 6M16 10l-3 6M20 10l-3 6"/>',
  baldosa:'<path d="M2 16l6-6h14l-6 6z"/><path d="M5 13h14M11 10l-3 6M17 10l-3 6"/>',
  pasto:'<path d="M2 20h20M5 20l-1-6M5 20l1-7M9 20l-1-5M9 20l2-6M14 20l-1-7M14 20l1-5M18 20l-1-6M18 20l2-5"/>',
  gravilla:'<path d="M2 20h20"/><circle cx="5" cy="17" r="1.3"/><circle cx="9" cy="18" r="1"/><circle cx="12" cy="16.5" r="1.3"/><circle cx="16" cy="18" r="1"/><circle cx="19" cy="16.5" r="1.3"/>',
  camino:'<path d="M9 20l2-16h2l2 16M12 7v2M12 12v2M12 17v2"/>',
  terraza:'<path d="M2 20h20M2 15h14v5M16 15l6-4M5 15V9h8v6M4 9h10"/>',
  deck:'<path d="M2 16l6-5h14l-6 5zM2 16v3h14v-3M5 14l6-5M9 14l6-5M13 14l6-5"/>',
  piscina:'<path d="M2 12l5-4h15l-5 4zM2 12v6h15v-6M17 18l5-4v-6"/><path d="M5 15c1.5-1 3 1 4.5 0s3 1 4.5 0"/>',
  quincho:'<path d="M2 11L12 4l10 7M4 10v10M20 10v10M2 20h20M8 20v-5h5v5M9 15v-2h3v2"/>',
  cobertizo:'<path d="M2 8l20-3M3 8v12M21 6v14M2 20h20"/>',
  carport:'<path d="M2 8h20M3 8v12M21 8v12M2 20h20M6 18h12v-3l-2-2H8l-2 2zM8 18v1M16 18v1"/>',
  pergola:'<path d="M2 8h20M4 6v2M8 6v2M12 6v2M16 6v2M20 6v2M3 8v12M21 8v12M2 20h20"/>',
  bodega:'<path d="M4 9l8-5 8 5v11H4zM9 20v-7h6v7M2 20h20"/>',
  galpon:'<path d="M2 11q10-9 20 0v9H2zM8 20v-6h8v6"/>',
  edificacion:'<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5M7 12h2v2H7zM15 12h2v2h-2z"/>',
  arbol:'<circle cx="12" cy="9" r="6"/><path d="M12 15v6M9 21h6"/>',
  arbusto:'<path d="M4 18c-2-4 2-7 5-6 1-3 6-3 7 0 3-1 6 2 4 6zM2 20h20"/>',
  palmera:'<path d="M12 21c0-5 0-9 1-12M13 9c-3-3-7-2-9 0M13 9c3-3 7-2 8 1M13 9c-1-3-4-5-7-5M13 9c2-3 5-4 7-3"/>',
  escalera:'<path d="M3 20h4v-4h4v-4h4V8h4V4h2"/>',
  rampa:'<path d="M2 20h20L22 12z"/>',
  pilar:'<path d="M8 4h8M9 4v16M15 4v16M8 20h8"/>',
  chimenea:'<path d="M9 20V6h6v14M8 6h8M10 4c0-1 1-2 2-2"/>',
  poste:'<path d="M12 21V3M7 6h10M8 6l-1 3M16 6l1 3"/>',
  estanque:'<ellipse cx="12" cy="6" rx="6" ry="2"/><path d="M6 6v12c0 1 3 2 6 2s6-1 6-2V6"/>',
  medidor:'<rect x="6" y="4" width="12" height="16" rx="1"/><circle cx="12" cy="10" r="3"/><path d="M12 10l2-1M9 16h6"/>',
  medidorAgua:'<rect x="5" y="8" width="14" height="10" rx="1"/><circle cx="12" cy="13" r="2.5"/><path d="M12 4c-1.5 2-1.5 3 0 3s1.5-1 0-3"/>',
  medidorLuz:'<rect x="6" y="4" width="12" height="16" rx="1"/><path d="M13 7l-3 5h4l-3 5"/>',
  fosa:'<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M3 12h18M8 7v10"/>',
  pozoAbs:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  camaraIns:'<rect x="6" y="6" width="12" height="12"/><path d="M9 9h6v6H9z"/>',
  jardinera:'<path d="M4 14h16l-2 6H6zM8 14c0-3 1-5 4-6M12 14c0-3 2-6 5-6"/>',
  baranda:'<path d="M2 8h20M2 20h20M4 8v12M8 8v12M12 8v12M16 8v12M20 8v12"/>',
  ventana:'<rect x="4" y="5" width="16" height="13"/><path d="M12 5v13M4 11.5h16M3 18h18"/>',
  puerta:'<path d="M6 21V3h12v18M3 21h18"/><circle cx="15" cy="12" r="1"/>'};
const picto=k=>PICTO[k]?`<svg class="pic" viewBox="0 0 24 24" aria-hidden="true">${PICTO[k]}</svg>`:'';
/* opciones con dibujo para "¿qué es?" cuando la IA duda */
function vPictoOpciones(o){const fam={porton:['porton','reja','muro','cerco'],reja:['reja','malla','cerco','muro'],cerco:['cerco','reja','malla','muro'],malla:['malla','reja','cerco'],muro:['muro','reja','cerco','muroContencion'],
  radier:['radier','ceramico','baldosa','deck','camino'],ceramico:['ceramico','radier','baldosa','terraza'],terraza:['terraza','deck','radier','ceramico'],deck:['deck','terraza','radier'],
  cobertizo:['cobertizo','carport','pergola','quincho'],carport:['carport','cobertizo','pergola'],quincho:['quincho','cobertizo','bodega','pergola'],bodega:['bodega','edificacion','quincho','galpon'],
  arbol:['arbol','arbusto','palmera'],arbusto:['arbusto','arbol','jardinera','pasto'],estanque:['estanque','medidor','poste'],medidor:['medidorLuz','medidorAgua','medidor','poste']};
  const ks=[...new Set([...(fam[o.t]||[o.t]),...(o.alt||[])])].filter(k=>ELT[k]&&k!==o.t).slice(0,4);
  return ks.length?`<div class="pics">${ks.map(k=>`<button type="button" class="picb" data-ve="retype:${o.id}:${k}">${picto(k)}<span>${ELT[k].n}</span></button>`).join('')}</div>`:''}
/* la zona señalada, ampliada al lado de la foto completa */
async function senalCompuesta(bm,px,py){const H=720,k=H/bm.height,W1=Math.round(bm.width*k);const cv=document.createElement('canvas');cv.width=W1+H;cv.height=H;const g=cv.getContext('2d');
  g.drawImage(bm,0,0,W1,H);g.strokeStyle='#ff2d2d';g.lineWidth=6;g.beginPath();g.arc(px*k,py*k,W1/22,0,7);g.stroke();
  const r=Math.min(bm.width,bm.height)*.22,sx=Math.max(0,Math.min(bm.width-2*r,px-r)),sy=Math.max(0,Math.min(bm.height-2*r,py-r));g.drawImage(bm,sx,sy,2*r,2*r,W1,0,H,H);
  g.fillStyle='#fff';g.fillRect(W1-3,0,6,H);g.strokeStyle='#ff2d2d';g.lineWidth=4;g.beginPath();g.arc(W1+(px-sx)/(2*r)*H,(py-sy)/(2*r)*H,H/9,0,7);g.stroke();
  return new Promise(res=>cv.toBlob(res,'image/jpeg',.85))}

/* ---------- 5. dónde pararse ---------- */
function guiaDibujo(k){const casa='<rect x="32" y="22" width="36" height="26" class="gd-casa"/>',lote='<rect x="6" y="4" width="88" height="72" class="gd-lote"/><rect x="0" y="80" width="100" height="10" class="gd-calle"/><rect x="44" y="74" width="12" height="4" class="gd-porton"/>';
  const yo=(x,y,a)=>`<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 0 L-9 -16 A18 18 0 0 1 9 -16 Z" class="gd-cono"/><circle r="3.2" class="gd-yo"/></g>`;
  const fl=(d)=>`<path d="${d}" class="gd-fl" marker-end="url(#gdm)"/>`;
  const D={frente:yo(50,85,0),fach0:yo(50,66,0),acceso:fl('M50 76 L50 52')+yo(50,72,0),contorno:fl('M30 50 L30 20 L70 20 L70 50 L34 50')+yo(30,52,-90),
    fach1:yo(86,35,-90),fach2:yo(50,10,180),fach3:yo(14,35,90),patio1:fl('M14 66 L14 10')+yo(14,66,0),patio2:fl('M14 10 L86 10')+yo(14,10,90),patio3:fl('M86 10 L86 66')+yo(86,10,180),
    interior:'<path d="M32 35h18M50 22v26" class="gd-int"/>'+yo(41,42,0)};
  if(!D[k])return'';return`<svg viewBox="0 0 100 90" class="gdib" role="img" aria-label="Dónde pararse"><defs><marker id="gdm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" class="gd-mk"/></marker></defs>${lote}${casa}${D[k]}<text x="50" y="88" class="gd-t">calle</text></svg>`}
