/* Huincha — fachadas con IA.
   En cada fachada (principal, costados y posterior) se toma una foto: la IA reconoce el muro, las aguas del techo,
   puertas, ventanas y materiales; la app pregunta lo que falta (ancho, alto, tipo de techo), registra el norte con
   la brújula y lo dibuja en el croquis 3D. Todo pasa al proyecto para los planos, la visita guiada y la cubicación. */
"use strict";
const FLADO=[{k:'frontal',n:'Fachada principal',ins:'Párate frente al centro de la casa, a 5 o 6 pasos de la fachada (o en la vereda si la reja está cerca). Sostén el teléfono derecho, a la altura del pecho.'},
  {k:'derecho',n:'Costado derecho',ins:'Camina al costado derecho de la casa (mirando desde la calle) y párate frente a su centro, lo más lejos que permita el terreno.'},
  {k:'posterior',n:'Fachada posterior',ins:'Ve al patio y párate frente al centro de la fachada de atrás, a 5 o 6 pasos.'},
  {k:'izquierdo',n:'Costado izquierdo',ins:'Camina al costado izquierdo de la casa y párate frente a su centro, lo más lejos que permita el terreno.'}];
const FTECHO={'dos-aguas':'Dos aguas','un-agua':'Un agua','plana':'Plano'};
const FVANO={puerta:'Puerta',ventana:'Ventana',ventanal:'Ventanal',porton_garage:'Portón de garaje'};

function promptFachada(lado,ctx){return`Eres arquitecto y analizas una foto de una vivienda chilena para levantar sus planos.
La foto muestra: ${lado}. Contexto: ${ctx}
Responde SOLO con JSON, sin texto adicional:
{"caja_muro":[x0,y0,x1,y1],"ancho_estimado":8.5,"alto_muro":2.4,"pisos":1,
 "techo":{"tipo":"dos-aguas|un-agua|plana","aguas":2,"cumbrera":"paralela|perpendicular","alto_sobre_muro":1.6,"cubierta":"clave o null"},
 "vanos":[{"tipo":"puerta|ventana|ventanal|porton_garage","caja":[x0,y0,x1,y1]}],
 "materiales":{"revExt":"clave o null","zocalo":"clave o null","ventanas":"clave o null"},
 "elementos":[{"tipo":"clave","caja":[x0,y0,x1,y1],"ancho":3,"fondo":2,"alto":0.3,"dist":0,"material":"clave o null","detalle":"breve"}],
 "dist_reja":5.5,
 "resumen":"una frase con lo que se ve","conf":0.8}
- Coordenadas de 0 a 1 en la imagen (0 = izquierda/arriba). "caja_muro": el muro de esta fachada desde el suelo hasta el alero, sin el techo.
- "vanos": cada puerta, ventana, ventanal o portón de garaje de ESTA fachada, con su recuadro exacto (solo marcos, sin rejas de protección).
- "cumbrera": "paralela" si la línea más alta del techo corre a lo ancho de esta fachada; "perpendicular" si va hacia el fondo (se ve un triángulo o frontón).
- "alto_sobre_muro": cuánto sube el techo desde el alero hasta la cumbrera.
- "elementos": TODO lo constructivo que se ve delante o al lado de esta fachada, no solo el muro: terraza, escalera o gradas, rampa, baranda, pilares, alero o corredor techado (cobertizo/pergola), radier o piso exterior, camino de acceso, estacionamiento, jardinera, reja, portón, muro, ampliación (edificacion), chimenea, etc. Claves válidas: ${Object.keys(ELT).join(', ')}.
  "ancho": medida a lo largo de la fachada; "fondo": cuánto se adelanta desde el muro hacia afuera; "dist": distancia desde el muro hasta su borde más cercano (0 si está pegado); materiales válidos según el tipo: pisos y terrazas ${Object.keys(MATOPC.piso).join(', ')}; cierres ${Object.keys(MATOPC.cierre).join(', ')}.
- "dist_reja": distancia en metros desde esta fachada hasta la reja o portón del frente, si se ve; si no, null.
- Estima medidas comparando con puertas de 2 m de alto y 0,9 m de ancho, una persona de pie (≈1,7 m), una huincha estirada, peldaños de 18 cm, hiladas de ladrillo de 7 cm o bloques de 20 cm, y paños de reja de 2 a 2,5 m.
${typeof IA_CHILE!=='undefined'?IA_CHILE:''}
- Claves de cubierta: ${Object.keys(MATS.cubierta.opts).join(', ')}. revExt: ${Object.keys(MATS.revExt.opts).join(', ')}. zocalo: ${Object.keys(MATS.zocalo.opts).join(', ')}. ventanas: ${Object.keys(MATS.ventanas.opts).join(', ')}. Usa null si no se distingue.
Escribe en español de Chile.`}
async function iaFachada(blob,lado){const o=await IA.ask(blob,promptFachada(lado,iaContexto()),1400);const n01=v=>Math.max(0,Math.min(1,+v||0));const cj=c=>Array.isArray(c)&&c.length===4?c.map(n01):null;
  const t=o.techo||{},m=o.materiales||{},ok=(cat,k)=>MATS[cat]?.opts[k]?k:null;
  return{caja:cj(o.caja_muro)||[.1,.3,.9,.9],ancho:+o.ancho_estimado>0?+o.ancho_estimado:null,alto:+o.alto_muro>0?+o.alto_muro:null,pisos:Math.max(1,Math.round(+o.pisos||1)),
    techo:{tipo:FTECHO[t.tipo]?t.tipo:null,cumbrera:t.cumbrera==='perpendicular'?'perpendicular':'paralela',alto:+t.alto_sobre_muro>0?+t.alto_sobre_muro:null,cubierta:ok('cubierta',t.cubierta)},
    vanos:(Array.isArray(o.vanos)?o.vanos:[]).filter(v=>FVANO[v.tipo]&&cj(v.caja)).slice(0,14).map(v=>({tipo:v.tipo,caja:cj(v.caja),on:true})),
    mat:{revExt:ok('revExt',m.revExt),zocalo:ok('zocalo',m.zocalo),ventanas:ok('ventanas',m.ventanas)},
    els:(Array.isArray(o.elementos)?o.elementos:[]).filter(x=>ELT[x.tipo]&&cj(x.caja)).slice(0,12).map(x=>({tipo:x.tipo,caja:cj(x.caja),ancho:+x.ancho>0?+x.ancho:null,fondo:+x.fondo>0?+x.fondo:null,alto:+x.alto>0?+x.alto:null,dist:+x.dist>=0?+x.dist:0,mat:(MATOPC[MATGRP[x.tipo]]||{})[x.material]?x.material:null,det:String(x.detalle||''),on:true})),
    distReja:+o.dist_reja>0?+o.dist_reja:null,resumen:String(o.resumen||''),conf:+o.conf||.6}}

/* rumbo absoluto de la brújula (para el norte), leído en el momento de la foto */
function vLeerRumbo(){return new Promise(res=>{if(VV.absOk&&VV.head!=null)return res(VV.head);let done=false;const h=e=>{vOrient(e,true);if(VV.head!=null&&VV.absOk&&!done){done=true;fin()}};
  const fin=()=>{window.removeEventListener('deviceorientationabsolute',h);res(VV.absOk?VV.head:null)};window.addEventListener('deviceorientationabsolute',h);setTimeout(()=>{if(!done){done=true;fin()}},1500)})}

/* ancho conocido de la fachada: lado recorrido, casa del mapa o lo que ya se respondió */
function fAnchoConocido(i){const s=VV.sides[i];if(s)return s.len??s.est;const c=P.casa;if(+c.ancho>0)return i%2===0?+c.ancho:+c.largo;return VV.fachW?.[i]||null}
/* resultado vacío para delinear a mano cuando la IA no responde */
function fBlank(){return{caja:[.12,.3,.88,.88],ancho:null,alto:null,pisos:1,techo:{tipo:null,cumbrera:'paralela',alto:null,cubierta:null},vanos:[],mat:{},els:[],distReja:null,resumen:'',conf:0,manual:true}}
async function fAnalizar(blob,i){if(!(await IA.mode()))return fBlank();try{return await iaFachada(blob,FLADO[i].n.toLowerCase())}catch(err){toast(iaErrorMsg(err)+' Puedes delinear tú los elementos.');const r=fBlank();r.err=iaErrorMsg(err);return r}}
async function vFachadaFoto(i){if(VV.fBusy)return;VV.fBusy=true;VV.fRes=null;vPanel();
  try{const rumbo=i===0?await vLeerRumbo():null;let blob=await vGrabBueno({fach:true});if(!blob)return;if(VV.eng==='ar'&&VV.ar?.w)blob=await vCrop(blob,VV.ar.w/VV.ar.h);
    const img=URL.createObjectURL(blob);const r=await fAnalizar(blob,i);if(!VV)return;
    r.img=img;r.lado=i;r.rumbo=rumbo;r.DR=r.distReja||null;r.W=fAnchoConocido(i)||r.ancho||(i%2===0?9:8);r.H=r.alto||+P.casa.altura||2.4;
    VV.fRes=r;vFachadaPreview(i);try{const ph=await storePhoto(blob);P.fotos[['frontal','derecha','posterior','izquierda'][i]].push(ph);persist()}catch(e){}}
  catch(err){toast(iaErrorMsg(err)+(err?.message?` (${err.message})`:''))}
  finally{if(VV){VV.fBusy=false;vPanel()}}}

/* panel de revisión de la fachada analizada */
function vFachadaHTML(i){const r=VV.fRes;const L=FLADO[i];
  if(VV.fBusy)return`<p class="vh"><b>La IA está analizando la fachada…</b> Reconoce el muro, las aguas del techo, puertas, ventanas y materiales.</p>`;
  if(r)return fReviewHTML(r,VV.techo||r.techo,r.lado,'vfa');
  return`${guiaDibujo('fach'+i)}<p class="vh">${esc(L.ins)} Con una foto la IA reconoce las aguas del techo, puertas, ventanas y materiales${i===0?', y la brújula registra el norte':''}.</p>
    <div class="vacts"><button class="btn pri" data-vfa="foto:${i}">Foto de la fachada</button><button class="btn" type="button" data-vfd="${i}">No se puede fotografiar: dibujarla</button>${VV.fach?.[i]?'<span class="lbl">✓ Ya registrada</span>':''}</div>`}
/* medidas de cada vano en metros, desde su recuadro (o lo que escribió el usuario) */
function fVanoMed(r,v){const c=r.caja,cw=(c[2]-c[0])||1,ch=(c[3]-c[1])||1;const fx0=(v.caja[0]-c[0])/cw,fx1=(v.caja[2]-c[0])/cw,fyb=(c[3]-v.caja[3])/ch,fyt=(c[3]-v.caja[1])/ch;
  const win=v.tipo==='ventana'||v.tipo==='ventanal';const m=v.m||{};
  return{ancho:rr2(m.ancho??Math.max(.4,(fx1-fx0)*r.W)),alto:rr2(m.alto??Math.max(.4,(fyt-fyb)*r.H)),ante:win?rr2(m.ante??Math.max(0,fyb*r.H)):0,pos:rr2(Math.max(0,Math.min(r.W,(fx0+fx1)/2*r.W))),win}}
/* revisión común: en el recorrido en vivo (pre='vfa') y en las fotos del proyecto (pre='pfa') */
function fReviewHTML(r,T,i,pre){const L=FLADO[i];const c=r.caja,hd='<i class="fh" data-fh="tl"></i><i class="fh" data-fh="tr"></i><i class="fh" data-fh="bl"></i><i class="fh" data-fh="br"></i>';
  const box=(b,cl,t,key)=>`<span class="${cl}" data-fbox="${key}" style="left:${b[0]*100}%;top:${b[1]*100}%;width:${(b[2]-b[0])*100}%;height:${(b[3]-b[1])*100}%">${t?`<em>${t}</em>`:''}${hd}</span>`;
  const TH=r.TH||T.alto||r.techo.alto||1.5,yA=c[1]-(TH/(r.H||2.4))*(c[3]-c[1]);
  const roof=T.tipo&&T.tipo!=='plana'?`<svg class="froof" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${(T.cumbrera==='perpendicular'?[[c[0],c[1]],[(c[0]+c[2])/2,yA],[c[2],c[1]]]:T.tipo==='un-agua'?[[c[0],c[1]],[c[0],yA],[c[2],c[1]]]:[[c[0],c[1]],[c[0]+(c[2]-c[0])*.18,yA],[c[2]-(c[2]-c[0])*.18,yA],[c[2],c[1]]]).map(q=>`${q[0]*100},${q[1]*100}`).join(' ')}"/></svg><span class="fapex" data-fbox="apex" style="left:${(c[0]+c[2])/2*100}%;top:${yA*100}%"></span>`:'';
  const on=r.vanos.filter(v=>v.on);const nP=on.filter(v=>v.tipo==='puerta').length,nV=on.filter(v=>v.tipo==='ventana'||v.tipo==='ventanal').length,nG=on.filter(v=>v.tipo==='porton_garage').length;
  const resumen=[nP?`${nP} puerta${nP>1?'s':''}`:'',nV?`${nV} ventana${nV>1?'s':''}`:'',nG?'portón de garaje':'',T.tipo?`techo ${FTECHO[T.tipo].toLowerCase()}`:'',r.pisos>1?`${r.pisos} pisos`:''].filter(Boolean).join(' · ');
  const chips=(k,opts,cur)=>`<div class="chips">${Object.entries(opts).map(([v,l])=>`<button class="chip" data-${pre}="set:${k}:${v}" aria-pressed="${cur===v}">${l}</button>`).join('')}</div>`;
  const nin=(lab,k,v)=>`<label class="fld"><span>${lab}</span><div class="inp"><input data-${pre}n="${k}" inputmode="decimal" value="${String(rr2(v)).replace('.',',')}"><em>m</em></div></label>`;
  const cnt={};const rows=r.vanos.map((v,k)=>{const t=FVANO[v.tipo];cnt[t]=(cnt[t]||0)+1;const M=fVanoMed(r,v);const f=(campo,val,lab)=>`<label class="vmini"><span>${lab}</span><input data-${pre}v="${k}:${campo}" inputmode="decimal" value="${String(val).replace('.',',')}"></label>`;
    return`<div class="fvrow${v.on?'':' off'}"><button class="chip" data-${pre}="van:${k}" aria-pressed="${v.on}">${t} ${cnt[t]}</button>${v.on?`${f('ancho',M.ancho,'Ancho')}${f('alto',M.alto,'Alto')}${M.win?f('ante',M.ante,'Antepecho'):''}<span class="lbl">a ${fmt(M.pos,1)} m</span>`:'<span class="lbl">Quitado</span>'}</div>`}).join('');
  r.els=r.els||[];const els=r.els.map((x,k)=>x.on?box(x.caja,'fel',x.nombre||ELT[x.tipo].n,'e:'+k):'').join('');
  const erows=r.els.map((x,k)=>{const f=(campo,val,lab)=>`<label class="vmini"><span>${lab}</span><input data-${pre}e="${k}:${campo}" inputmode="decimal" value="${String(rr2(val)).replace('.',',')}"></label>`;const T=ELT[x.tipo],D=fElDims(r,x);
    return`<div class="fvrow${x.on?'':' off'}"><button class="chip" data-${pre}="el:${k}" aria-pressed="${x.on}">${esc(x.nombre||T.n)}</button>${x.on?`${f('ancho',D.ancho,T.k==='linea'?'Largo':'Ancho')}${T.k==='area'||T.k==='vol'?f('fondo',D.fondo,'Fondo'):''}${f('dist',D.dist,'Separación')}${(MATOPC[MATGRP[x.tipo]]&&x.mat)?`<span class="lbl">${esc(MATOPC[MATGRP[x.tipo]][x.mat].n)}</span>`:''}`:'<span class="lbl">Quitado</span>'}</div>`}).join('');
  const D=r.draw,PK=r.pick;const pl=q=>q.map(p=>`${p[0]*100},${p[1]*100}`).join(' ');
  const polys=`<svg class="fpoly" viewBox="0 0 100 100" preserveAspectRatio="none">${[r.muroPoly&&`<polygon class="pm" points="${pl(r.muroPoly)}"/>`,r.techoPoly&&`<polygon class="pt" points="${pl(r.techoPoly)}"/>`,...r.vanos.filter(v=>v.on&&v.poly).map(v=>`<polygon class="pv" points="${pl(v.poly)}"/>`),...(r.els||[]).filter(x=>x.on&&x.poly).map(x=>`<polygon class="pe" points="${pl(x.poly)}"/>`),
    D&&D.pts.length?`<polyline class="pd" points="${pl(D.pts)}"/>${D.pts.map(p=>`<circle class="pdp" cx="${p[0]*100}" cy="${p[1]*100}" r="1.4"/>`).join('')}`:'',PK?`<polygon class="pd" points="${pl(PK.poly)}"/>`:''].filter(Boolean).join('')}</svg>`;
  const lados=`<div class="fld"><span>Esta foto es</span><div class="chips">${FLADO.map((l,j)=>`<button class="chip" data-${pre}="lado:${j}" aria-pressed="${j===i}">${l.n}</button>`).join('')}</div></div>`;
  const medidas=`<div class="vin vdims">${nin(`Ancho de la ${L.n.toLowerCase()}`,'W',r.W)}${nin('Alto del muro','H',r.H)}</div>${pre==='vfa'?`<div class="vacts"><button class="btn sm" data-vfa="medw">Medir el ancho con la cámara</button></div>`:''}`;
  const reves=`<div class="fld"><span>Revestimiento de esta fachada</span>${chips('rev',Object.fromEntries(Object.entries(MATS.revExt.opts).map(([k,o])=>[k,o.n])),r.mat.revExt||'')}</div>`;
  const dib=D?`<div class="fdraw"><b>Toca la foto en cada esquina de lo que quieres delinear</b> (${D.pts.length} punto${D.pts.length===1?'':'s'}).<div class="vacts"><button class="btn sm" data-${pre}="dpop">Deshacer punto</button><button class="btn sm pri" data-${pre}="dfin" ${D.pts.length<3?'disabled':''}>Cerrar figura</button><button class="btn sm ghost" data-${pre}="dx">Cancelar</button></div></div>`
    :PK?fPickHTML(r,PK,pre):`<div class="vacts"><button class="btn pri" data-${pre}="dini">✏️ Delinear con puntos y nombrar</button></div>`;
  return`${r.sinFoto?fSinFotoHTML(r,pre):r.manual?`<p class="note warn">${r.err?esc(r.err)+' ':''}Delinea tú cada elemento con los puntos: muro, puertas, ventanas, techo, terrazas…</p>`:''}${r.sinFoto?'':lados}
    <div class="vthumb fthumb"><span class="vti" data-fed="${pre}"${D?' data-draw="1"':''}><img src="${r.img}" alt="${r.sinFoto?'Lienzo para dibujar la fachada':'Fachada analizada'}" draggable="false">${roof}${polys}${box(c,'fmuro','','m')}${els}${r.vanos.map((v,k)=>v.on?box(v.caja,'fvano',v.tipo==='puerta'?'P':v.tipo==='porton_garage'?'G':'V','v:'+k):'').join('')}</span></div>
    ${dib}
    <p class="vh">También puedes arrastrar los recuadros o sus esquinas${T.tipo&&T.tipo!=='plana'?', y el punto blanco para la altura del techo':''}.</p>
    <div class="chips">${Object.entries(FVANO).map(([k,n])=>`<button class="chip" data-${pre}="add:${k}">+ ${n}</button>`).join('')}</div>
    <p class="vq">${esc(resumen||'Sin puertas ni ventanas reconocidas')}</p>${r.resumen?`<p class="vh">${esc(r.resumen)}</p>`:''}
    ${i===0&&r.rumbo!=null?`<p class="vh">🧭 Norte registrado: mirando hacia la casa estás a ${Math.round(r.rumbo)}° (${rumboTxt(r.rumbo)}).</p>`:''}
    ${medidas}${reves}
    <div class="fld"><span>Puertas y ventanas: corrige las medidas o toca el nombre para quitarla ${queEs('antepecho')}</span>${rows||'<span class="lbl">Ninguna</span>'}</div>
    <div class="fld"><span>Elementos constructivos frente a esta fachada (terrazas, escaleras, pisos, pilares, cierres…)</span>${erows||'<span class="lbl">Ninguno reconocido</span>'}
      <div class="chips">${['terraza','escalera','radier','camino','pilar','baranda','cobertizo','jardinera','reja','porton'].map(k=>`<button class="chip" data-${pre}="adde:${k}">+ ${ELT[k].n}</button>`).join('')}</div></div>
    ${i===0?`<div class="vin vdims">${nin('Distancia de la fachada a la reja o portón (antejardín)','DR',r.distReja||+P.casa.retiroFrontal||4)}</div>`:''}
    <div class="fld"><span>Techo ${queEs('aguas')}</span>${chips('techo',FTECHO,T.tipo||'')}${T.tipo&&T.tipo!=='plana'?chips('cumbrera',{paralela:'Cumbrera a lo ancho',perpendicular:'Cumbrera hacia el fondo'},T.cumbrera||'paralela'):''}${T.tipo&&T.tipo!=='plana'?`<div class="vin vdims">${nin('Altura del techo sobre el muro','TH',T.alto||r.techo.alto||1.5)}</div>`:''}${chips('cub',Object.fromEntries(Object.entries(MATS.cubierta.opts).map(([k,o])=>[k,o.n])),r.techo.cubierta||'')}${T.tipo?techuHTML(true):''}</div>
    ${r.mat.revExt||r.techo.cubierta?`<p class="vh">Materiales: ${[r.mat.revExt?MATS.revExt.opts[r.mat.revExt].n:'',r.techo.cubierta?MATS.cubierta.opts[r.techo.cubierta].n:''].filter(Boolean).join(' · ')}.</p>`:''}
    <div class="vacts"><button class="btn pri" data-${pre}="ok:${i}">Confirmar y dibujar</button><button class="btn" data-${pre}="foto:${i}">${r.sinFoto?'Mejor tomar una foto':'Otra foto'}</button></div>`}
/* ---------- delinear con puntos y nombrar ---------- */
const FPICK={muro:'Muro de la fachada',techo:'Techo',puerta:'Puerta',ventana:'Ventana',ventanal:'Ventanal',porton_garage:'Portón de garaje',
  terraza:'Terraza',escalera:'Escalera',radier:'Radier o piso',camino:'Camino',estacionamiento:'Estacionamiento',pilar:'Pilar',baranda:'Baranda',cobertizo:'Cobertizo o corredor',pergola:'Pérgola',
  edificacion:'Ampliación o volumen',jardinera:'Jardinera',reja:'Reja',porton:'Portón',muroCierre:'Muro de cierre',muroContencion:'Muro de contención',chimenea:'Chimenea',otro:'Otro'};
function fPickMats(t){if(t==='muro')return Object.fromEntries(Object.entries(MATS.revExt.opts).map(([k,o])=>[k,o.n]));if(t==='techo')return Object.fromEntries(Object.entries(MATS.cubierta.opts).map(([k,o])=>[k,o.n]));
  const tt=t==='muroCierre'?'muro':t;const g=MATOPC[MATGRP[tt]];return g?Object.fromEntries(Object.entries(g).map(([k,o])=>[k,o.n])):null}
function fPickHTML(r,PK,pre){const ms=PK.tipo?fPickMats(PK.tipo):null;
  return`<div class="fdraw"><b>¿Qué delineaste?</b><div class="chips">${Object.entries(FPICK).map(([k,n])=>`<button class="chip" data-${pre}="ptipo:${k}" aria-pressed="${PK.tipo===k}">${n}</button>`).join('')}</div>
    ${PK.tipo?`<label class="fld"><span>Nombre</span><div class="inp"><input data-${pre}pn value="${esc(PK.nombre||FPICK[PK.tipo])}"></div></label>
      ${ms?`<div class="fld"><span>Material</span><div class="chips">${Object.entries(ms).map(([k,n])=>`<button class="chip" data-${pre}="pmat:${k}" aria-pressed="${PK.mat===k}">${n}</button>`).join('')}</div></div>`:''}
      <div class="vacts"><button class="btn pri" data-${pre}="padd">Agregar y dibujar</button><button class="btn ghost" data-${pre}="dx">Cancelar</button></div>`:`<div class="vacts"><button class="btn ghost" data-${pre}="dx">Cancelar</button></div>`}</div>`}
function fPickAdd(r,T){const PK=r.pick;if(!PK||!PK.tipo)return;const q=PK.poly,xs=q.map(p=>p[0]),ys=q.map(p=>p[1]),bb=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];const t=PK.tipo;
  if(t==='muro'){r.caja=bb;r.muroPoly=q;if(PK.mat)r.mat.revExt=PK.mat}
  else if(FVANO[t])r.vanos.push({tipo:t,caja:bb,on:true,poly:q});
  else if(t==='techo'){r.techoPoly=q;const c=r.caja;r.TH=rr2(Math.max(.2,(c[1]-bb[1])/((c[3]-c[1])||1)*(r.H||2.4)));const top=ys.filter(y=>y<bb[1]+(c[1]-bb[1])*.25).length;
    T.tipo=T.tipo&&T.tipo!=='plana'?T.tipo:'dos-aguas';T.cumbrera=top<=1?'perpendicular':'paralela';T.alto=r.TH;if(PK.mat){r.techo.cubierta=PK.mat;T.cubierta=PK.mat}}
  else{const tipo=t==='muroCierre'?'muro':t;(r.els=r.els||[]).push({tipo,caja:bb,dist:0,on:true,poly:q,nombre:PK.nombre&&PK.nombre!==FPICK[t]?PK.nombre:null,mat:PK.mat||null})}
  r.pick=null;r.draw=null}
/* ---------- delinear sobre la foto: mover y ajustar recuadros con el dedo ---------- */
function fEdState(pre){if(pre==='vfa')return VV?.fRes;if(pre==='pfa')return FP?.res;return null}
function fEdCommit(pre){if(pre==='vfa'){vFachadaPreview(VV.fRes.lado);vPanel()}else if(pre==='pfa')fProyPinta();else if(pre==='det')vDetBoxCommit()}
(function(){let D=null;const clamp=v=>Math.max(0,Math.min(1,v));
  document.addEventListener('pointerdown',e=>{const host=e.target.closest('.vti[data-fed]');if(!host)return;
    if(host.dataset.draw){e.preventDefault();const r=fEdState(host.dataset.fed);if(!r?.draw)return;const rc=host.getBoundingClientRect();r.draw.pts.push([clamp((e.clientX-rc.left)/rc.width),clamp((e.clientY-rc.top)/rc.height)]);if(host.dataset.fed==='vfa')vPanel();else fProyPinta();return}
    const bx=e.target.closest('[data-fbox]');if(!bx)return;e.preventDefault();
    const pre=host.dataset.fed,key=bx.dataset.fbox,h=e.target.closest('[data-fh]')?.dataset.fh||'move',rc=host.getBoundingClientRect();
    const el=bx,st={l:parseFloat(el.style.left)/100,t:parseFloat(el.style.top)/100,w:parseFloat(el.style.width||0)/100,h:parseFloat(el.style.height||0)/100};
    D={pre,key,h,rc,x:e.clientX,y:e.clientY,el,st,host};try{host.setPointerCapture(e.pointerId)}catch(x){}});
  document.addEventListener('pointermove',e=>{if(!D)return;const dx=(e.clientX-D.x)/D.rc.width,dy=(e.clientY-D.y)/D.rc.height,s=D.st;let l=s.l,t=s.t,w=s.w,h=s.h;
    if(D.key==='apex'){t=clamp(s.t+dy);D.el.style.top=t*100+'%';return}
    if(D.h==='move'){l=clamp(s.l+dx);t=clamp(s.t+dy)}else{if(D.h.includes('l')){l=clamp(s.l+dx);w=s.w-(l-s.l)}if(D.h.includes('r'))w=s.w+dx;if(D.h.includes('t')){t=clamp(s.t+dy);h=s.h-(t-s.t)}if(D.h.includes('b'))h=s.h+dy}
    w=Math.max(.02,Math.min(1-l,w));h=Math.max(.02,Math.min(1-t,h));Object.assign(D.el.style,{left:l*100+'%',top:t*100+'%',width:w*100+'%',height:h*100+'%'});D.cur=[l,t,l+w,t+h]});
  const up=()=>{if(!D)return;const d=D;D=null;const r=d.pre==='det'?null:fEdState(d.pre);
    if(d.key==='apex'&&r){const c=r.caja,yA=parseFloat(d.el.style.top)/100;r.TH=rr2(Math.max(.2,(c[1]-yA)/((c[3]-c[1])||1)*(r.H||2.4)));const T=d.pre==='vfa'?(VV.techo||(VV.techo={...r.techo})):FP.T;T.alto=r.TH}
    else if(d.cur){if(d.pre==='det'){VV._detBox=d.cur}else if(d.key==='m')r.caja=d.cur;else if(d.key.startsWith('e:')){const x=r.els[+d.key.split(':')[1]];x.caja=d.cur;delete x.ancho}else{const v=r.vanos[+d.key.split(':')[1]];v.caja=d.cur;delete v.m}}
    else return;fEdCommit(d.pre)};
  document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up)})();
/* agrega una puerta o ventana al centro del muro, para delinearla */
function fAddVano(r,tipo){const c=r.caja,cw=c[2]-c[0],ch=c[3]-c[1],W=r.W||9,H=r.H||2.4;const w=(tipo==='puerta'?.9:tipo==='porton_garage'?2.8:tipo==='ventanal'?2.2:1.2)/W*cw,h=(tipo==='puerta'?2.05:tipo==='porton_garage'?2.1:tipo==='ventanal'?2:1.1)/H*ch;
  const bot=tipo==='ventana'?c[3]-1/H*ch:c[3];let x0=(c[0]+c[2])/2-w/2;const gap=.4/W*cw,libre=x=>!r.vanos.some(v=>v.on&&x<v.caja[2]+gap&&x+w>v.caja[0]-gap);
  if(!libre(x0)){for(let x=c[0]+gap;x+w<=c[2]-gap;x+=gap/2)if(libre(x)){x0=x;break}}r.vanos.push({tipo,caja:[x0,Math.max(0,bot-h),x0+w,bot],on:true})}
/* agrega un elemento constructivo al pie del muro, para delinearlo */
function fAddEl(r,tipo){const c=r.caja,cw=c[2]-c[0],T=ELT[tipo];const w=Math.min(cw,((T.w||T.len||1.5))/(r.W||9)*cw);const x0=(c[0]+c[2])/2-w/2;(r.els=r.els||[]).push({tipo,caja:[x0,Math.min(.97,c[3]-.04),x0+w,Math.min(1,c[3]+.08)],dist:0,on:true})}
/* el croquis 3D se actualiza mientras se delinea */
function vFachadaPreview(i){const r=VV.fRes;if(!r)return;if(!r._snap){vSnap();r._snap=1}
  VV.marks=VV.marks.filter(m=>!(m.side===i&&m.src==='fachada'));
  for(const v of r.vanos){if(!v.on)continue;const M=fVanoMed(r,v);VV.marks.push({id:uid(),side:i,pos:M.pos,tipo:M.win?'ventana':'puerta',ancho:M.ancho,alto:M.alto,antepecho:M.ante,src:'fachada',vano:v.tipo})}
  (VV.fachW=VV.fachW||{})[i]=r.W;VV.altoMuro=r.H;VV.pisos=Math.max(VV.pisos||1,r.pisos);
  const T=VV.techo||r.techo;if(T.tipo)VV.techo={tipo:T.tipo,cumbrera:T.cumbrera||'paralela',alto:r.TH||T.alto||r.techo.alto||null,cubierta:T.cubierta||r.techo.cubierta||null};
  {const cp=vCasaPrevia(),W=VV.sides.length?vSideLen(0)||r.W:cp?.w||r.W,L=VV.sides.length?vSideLen(1)||r.W*.8:cp?.l||r.W*.8;VV.elems=VV.elems.filter(e=>!(e.src==='fachada'&&e.fach===i));VV.elems.push(...fElementos(r,i,W,L))}
  if(i===0&&r.DR){P.casa.retiroFrontal=rr2(r.DR)}
  V3.sig='';vCroquis()}
/* medidas de un elemento frente a la fachada */
function fElDims(r,x){const T=ELT[x.tipo];const lin=T.k==='linea';const c=r.caja,cw=(c[2]-c[0])||1;const fw=(x.caja[2]-x.caja[0])/cw*(r.W||9);
  const cierre=['reja','porton','cerco','malla','muro'].includes(x.tipo);
  return{ancho:rr2(x.ancho||Math.max(.3,fw)||T.w||T.len),fondo:rr2(x.fondo||T.l||T.w||1),dist:rr2(x.distU??(cierre&&r.lado===0&&r.distReja?r.distReja:x.dist||0)),alto:x.alto||null,
    s:((x.caja[0]+x.caja[2])/2-c[0])/cw*(r.W||9)}}
/* marco de una fachada en la planta: inicio, dirección a lo largo y normal hacia afuera */
function fMarco(i,W,L){if(VV&&VV.sides?.length>i){const {pts}=vPoly();const a=pts[i],b=pts[i+1];if(a&&b){const d=Math.hypot(b[0]-a[0],b[1]-a[1])||1,u=[(b[0]-a[0])/d,(b[1]-a[1])/d];return{o:a,u,n:[u[1],-u[0]]}}}
  return[{o:[0,0],u:[1,0],n:[0,-1]},{o:[W,0],u:[0,1],n:[1,0]},{o:[W,L],u:[-1,0],n:[0,1]},{o:[0,L],u:[0,-1],n:[-1,0]}][i]}
/* convierte lo reconocido en elementos del croquis */
function fElementos(r,i,W,L){const M=fMarco(i,W,L),out=[];
  for(const x of r.els||[]){if(!x.on)continue;const T=ELT[x.tipo],D=fElDims(r,x);const off=T.k==='linea'||T.k==='punto'?D.dist:D.dist+D.fondo/2;
    const p=[M.o[0]+M.u[0]*D.s+M.n[0]*off,M.o[1]+M.u[1]*D.s+M.n[1]*off];const e=elemNew(x.tipo,p,M.u);
    if(T.k==='linea'){elSetLen(e,D.ancho);elMove(e,-(e.b[0]-e.a[0])/2*0,0);const cx=(e.a[0]+e.b[0])/2,cy=(e.a[1]+e.b[1])/2;elMove(e,p[0]-cx,p[1]-cy)}
    else if(T.k==='punto'){if(x.ancho)e.w=e.l=Math.min(D.ancho,3)}else{e.w=D.ancho;e.l=D.fondo}
    if(D.alto&&(T.k!=='area'||['terraza','escalera','rampa','jardinera'].includes(x.tipo)))e.h=D.alto;if(x.mat)e.mat=x.mat;if(x.nombre)e.nombre=x.nombre;e.det=x.det;e.src='fachada';e.fach=i;e.est=true;out.push(e)}
  return out}
const rumboTxt=h=>['norte','noreste','este','sureste','sur','suroeste','oeste','noroeste'][Math.round(((h%360)+360)%360/45)%8];

/* aplica la fachada confirmada al recorrido */
function vFachadaOk(i){const r=VV.fRes;if(!r)return;vFachadaPreview(i);
  VV.matIA=Object.assign(VV.matIA||{},Object.fromEntries(Object.entries(r.mat).filter(([,v])=>v)));if(r.techo.cubierta)VV.matIA.cubierta=r.techo.cubierta;
  if(i===0&&r.rumbo!=null)VV.norte=Math.round(r.rumbo);if(r.mat.revExt)(VV.revFach=VV.revFach||{})[i]=r.mat.revExt;
  fGuardarRel(r);if(r.sinFoto)(P.fachDib=P.fachDib||{})[FKEY[i]]=true;(VV.fach=VV.fach||{})[i]=true;VV.fRes=null;toast(`${FLADO[i].n} dibujada en el croquis.`);vPanel();V3.sig='';vCroquis()}

/* acciones comunes de dibujo y selección (r: resultado, T: techo, pinta: redibujar, prev: actualizar croquis) */
function fAccion(a,x,y,r,T,pinta,prev){
  switch(a){
    case 'dini':r.draw={pts:[]};r.pick=null;pinta();return true;
    case 'dpop':r.draw?.pts.pop();pinta();return true;
    case 'dfin':if(r.draw?.pts.length>=3){r.pick={poly:r.draw.pts};r.draw=null}pinta();return true;
    case 'dx':r.draw=null;r.pick=null;pinta();return true;
    case 'ptipo':if(r.pick){r.pick.tipo=x;r.pick.nombre=null;r.pick.mat=null}pinta();return true;
    case 'pmat':if(r.pick)r.pick.mat=x;pinta();return true;
    case 'padd':fPickAdd(r,T);prev();pinta();toast('Agregado y dibujado en el croquis.');return true;
    case 'set':if(x==='rev'){r.mat.revExt=y;r.matUser=1}else if(x==='cub'){r.techo.cubierta=y;T.cubierta=y}else return false;prev();pinta();return true}
  return false}
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.vfapn!=null&&VV?.fRes?.pick)VV.fRes.pick.nombre=t.value.trim();if(t.dataset&&t.dataset.pfapn!=null&&FP?.res?.pick)FP.res.pick.nombre=t.value.trim()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-vfa]');if(!b||!VV)return;const [a,x,y]=b.dataset.vfa.split(':');const r=VV.fRes;
  if(r){const T=VV.techo||(VV.techo={...r.techo});if(fAccion(a,x,y,r,T,()=>vPanel(),()=>vFachadaPreview(r.lado)))return}
  switch(a){
    case 'lado':{if(!r)break;const old=r.lado,j=+x;VV.marks=VV.marks.filter(m=>!(m.side===old&&m.src==='fachada'));VV.elems=VV.elems.filter(q=>!(q.src==='fachada'&&q.fach===old));r.lado=j;r.W=fAnchoConocido(j)||r.W;r._snap=1;vFachadaPreview(j);vPanel();toast(`Ahora es: ${FLADO[j].n}.`);break}
    case 'medw':{if(!r)break;const prev=VV.st;vMeas({label:`Mide el ancho de la ${FLADO[r.lado].n.toLowerCase()}, de esquina a esquina`,help:VV.eng==='ar'?'Apunta a una esquina, marca, y luego a la otra.':'Camina de una esquina a la otra junto al muro, o escribe la medida.',kind:'h',then:v=>{r.W=v;VV.st=prev;vFachadaPreview(r.lado);vPanel()}});break}
    case 'foto':vFachadaFoto(+x);break;
    case 'ok':vFachadaOk(+x);if(VV.guia)vGuiaNext();break;
    case 'van':if(r){r.vanos[+x].on=!r.vanos[+x].on;vFachadaPreview(r.lado);vPanel()}break;
    case 'add':if(r){fAddVano(r,x);vFachadaPreview(r.lado);vPanel()}break;
    case 'el':if(r){r.els[+x].on=!r.els[+x].on;vFachadaPreview(r.lado);vPanel()}break;
    case 'adde':if(r){fAddEl(r,x);vFachadaPreview(r.lado);vPanel()}break;
    case 'set':{if(!r)break;const T=VV.techo||(VV.techo={...r.techo});T[x]=y;if(x==='techo'){T.tipo=y;fRelienzo(r,T)}vFachadaPreview(r.lado);vPanel();break}}});
document.addEventListener('change',e=>{const t=e.target;if(!VV||!t.dataset||!VV.fRes)return;if(t.dataset.vfan){const v=num(t.value);if(v>0){VV.fRes[t.dataset.vfan==='TH'?'TH':t.dataset.vfan]=v;fRelienzo(VV.fRes,VV.techo);vFachadaPreview(VV.fRes.lado);vPanel()}}
  if(t.dataset.vfae){const [k,campo]=t.dataset.vfae.split(':');const v=num(t.value);if(v>=0){const x=VV.fRes.els[+k];if(campo==='dist')x.distU=v;else x[campo]=v;vFachadaPreview(VV.fRes.lado);vPanel()}}
  if(t.dataset.vfav){const [k,campo]=t.dataset.vfav.split(':');const v=num(t.value);if(v>=0){const vn=VV.fRes.vanos[+k];vn.m=Object.assign(vn.m||{},{[campo]:v});vFachadaPreview(VV.fRes.lado);vPanel()}}});

/* ---------- fotos del proyecto: identificar componentes de una fachada ya fotografiada ---------- */
const FKEY=['frontal','derecha','posterior','izquierda'];
let FP=null;
async function fProyAbrir(k){const i=FKEY.indexOf(k);const ref=P.fotos[k]?.[P.fotos[k].length-1];if(i<0||!ref)return;
  FP={i,k,busy:true,res:null,T:null};fProyPinta();
  try{const blob=await (await fetch(phSrc(ref))).blob();const r=await fAnalizar(blob,i);r.img=phSrc(ref);r.lado=i;r.DR=r.distReja||null;
    const c=P.casa;r.W=(i%2===0?+c.ancho:+c.largo)||r.ancho||(i%2===0?9:8);r.H=r.alto||+c.altura||2.4;FP.res=r;FP.T={...r.techo,tipo:r.techo.tipo||c.techo,cumbrera:r.techo.cumbrera||c.cumbrera}}
  catch(err){FP.err=iaErrorMsg(err)+(err?.message?` (${err.message})`:'')}FP.busy=false;fProyPinta()}
function fProyPinta(){let ov=$('#fov');if(!FP){ov?.remove();document.body.classList.remove('noscroll');return}
  if(!ov){ov=document.createElement('div');ov.id='fov';ov.className='fov';document.body.appendChild(ov);document.body.classList.add('noscroll')}
  const L=FLADO[FP.i];ov.innerHTML=`<div class="fovp"><div class="row sb"><h3>${esc(L.n)}: componentes</h3><button class="btn sm dark" data-pfa="cerrar" aria-label="Cerrar">✕</button></div>
    ${FP.busy?'<p class="note"><b>La IA está analizando la foto…</b> Reconoce el muro, las aguas del techo, puertas, ventanas y materiales.</p>':FP.err?`<p class="note warn">${esc(FP.err)}</p>`:fReviewHTML(FP.res,FP.T,FP.i,'pfa').replace(/<button class="btn" data-pfa="foto:\d">[^<]*<\/button>/,'')}</div>`}
function fProyOk(){const r=FP.res,i=FP.i,c=P.casa;const lado=VSIDE[i].k;
  if(i%2===0)c.ancho=rr2(r.W);else c.largo=rr2(r.W);if(!(+c.largo>0))c.largo=rr2(r.W*.8);if(!(+c.ancho>0))c.ancho=rr2(r.W);c.altura=rr2(r.H);
  const T=FP.T;if(T.tipo){c.techo=T.tipo;c.cumbrera=T.cumbrera||c.cumbrera;if(r.TH||T.alto)c.hTecho=rr2(r.TH||T.alto)}
  for(const [cat,v] of Object.entries({...r.mat,cubierta:r.techo.cubierta}))if(v&&MATS[cat]?.opts[v]&&(!P.mat[cat]||r.matUser||cat==='cubierta'))P.mat[cat]=v;
  if(r.mat.revExt)(P.mat.revFach=P.mat.revFach||{})[lado]=r.mat.revExt;
  P.marcas=(P.marcas||[]).filter(m=>!(m.lado===lado&&m.src==='fachada'));let n=0;
  for(const v of r.vanos){if(!v.on)continue;const M=fVanoMed(r,v);P.marcas.push({id:uid(),lado,coord:rr2(vMarkCoord({side:i,pos:M.pos},+c.ancho,+c.largo)),tipo:M.win?'ventana':'puerta',ancho:M.ancho,alto:M.alto,antepecho:M.ante,src:'fachada'});n++}
  {const W=+c.ancho,L=+c.largo;P.elementos=(P.elementos||[]).filter(e=>!(e.src==='fachada'&&e.fach===i));const ne=fElementos(r,i,W,L);P.elementos.push(...ne);n+=0;if(ne.length)toast(`${ne.length} elemento${ne.length>1?'s':''} constructivo${ne.length>1?'s':''} agregado${ne.length>1?'s':''} al terreno.`)}
  if(i===0&&r.DR)c.retiroFrontal=rr2(r.DR);fGuardarRel(r);if(r.sinFoto)(P.fachDib=P.fachDib||{})[FKEY[i]]=true;
  persist();FP=null;fProyPinta();
  if(P.recintos.some(valid))placeMarks();else{render();toast(`${n} vano${n===1?'':'s'} registrado${n===1?'':'s'} en la ${FLADO[i].n.toLowerCase()}. Se ubicarán en los recintos cuando los agregues.`)}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-pfa],[data-fia]');if(!b)return;
  if(b.dataset.fia){fProyAbrir(b.dataset.fia);return}const [a,x,y]=b.dataset.pfa.split(':');if(!FP)return;const r=FP.res;
  if(r&&fAccion(a,x,y,r,FP.T,fProyPinta,()=>{}))return;
  if(a==='lado'&&r){FP.i=+x;r.lado=+x;const c=P.casa;r.W=(FP.i%2===0?+c.ancho:+c.largo)||r.W;fProyPinta();return}
  if(a==='cerrar'){FP=null;fProyPinta()}else if(a==='van'&&r){r.vanos[+x].on=!r.vanos[+x].on;fProyPinta()}else if(a==='set'&&r){FP.T[x]=y;if(x==='techo'){FP.T.tipo=y;fRelienzo(r,FP.T)}fProyPinta()}else if(a==='add'&&r){fAddVano(r,x);fProyPinta()}else if(a==='el'&&r){r.els[+x].on=!r.els[+x].on;fProyPinta()}else if(a==='adde'&&r){fAddEl(r,x);fProyPinta()}else if(a==='ok'&&r)fProyOk()});
document.addEventListener('change',e=>{const t=e.target;if(!FP?.res||!t.dataset)return;if(t.dataset.pfan){const v=num(t.value);if(v>0){if(t.dataset.pfan==='TH')FP.res.TH=v;else FP.res[t.dataset.pfan]=v;fRelienzo(FP.res,FP.T);setTimeout(fProyPinta,0)}}
  if(t.dataset.pfae){const [k,campo]=t.dataset.pfae.split(':');const v=num(t.value);if(v>=0){const x=FP.res.els[+k];if(campo==='dist')x.distU=v;else x[campo]=v;fProyPinta()}}
  if(t.dataset.pfav){const [k,campo]=t.dataset.pfav.split(':');const v=num(t.value);if(v>=0){const vn=FP.res.vanos[+k];vn.m=Object.assign(vn.m||{},{[campo]:v});fProyPinta()}}});

/* ---------- fachada sin foto: dibujarla sobre una cuadrícula a escala ----------
   Cuando el terreno no permite fotografiar una fachada (muy pegada al vecino, vegetación, sin distancia),
   se dibuja sobre un lienzo con el muro a escala y una cuadrícula de 50 cm: se agregan puertas, ventanas y el techo,
   se arrastran a su lugar y se corrigen las medidas. También se puede partir de la fachada opuesta, reflejada. */
function fLienzo(W,H,TH){const cw=1200;const th=TH>0?TH:0;const k=Math.min(1080/W,520/(H+th+.3));const chh=Math.round((H+th+.6)*k+110);const cv=document.createElement('canvas');cv.width=cw;cv.height=chh;const g=cv.getContext('2d');
  const x0=(cw-W*k)/2,yb=chh-80,y0=yb-H*k;
  g.fillStyle='#fbfaf7';g.fillRect(0,0,cw,chh);
  g.strokeStyle='#e6e2d9';g.lineWidth=1;for(let x=x0%(k*.5);x<cw;x+=k*.5){g.beginPath();g.moveTo(x,0);g.lineTo(x,yb);g.stroke()}for(let y=yb;y>0;y-=k*.5){g.beginPath();g.moveTo(0,y);g.lineTo(cw,y);g.stroke()}
  g.strokeStyle='#d3cdc0';for(let x=x0%k;x<cw;x+=k){g.beginPath();g.moveTo(x,0);g.lineTo(x,yb);g.stroke()}for(let y=yb;y>0;y-=k){g.beginPath();g.moveTo(0,y);g.lineTo(cw,y);g.stroke()}
  g.fillStyle='#ece6da';g.fillRect(0,yb,cw,chh-yb);g.strokeStyle='#5b5246';g.lineWidth=3;g.beginPath();g.moveTo(0,yb);g.lineTo(cw,yb);g.stroke();
  g.fillStyle='rgba(255,255,255,.75)';g.fillRect(x0,y0,W*k,H*k);g.setLineDash([10,6]);g.strokeStyle='#8a8170';g.lineWidth=2;g.strokeRect(x0,y0,W*k,H*k);g.setLineDash([]);
  g.fillStyle='#6d6556';g.font='600 22px sans-serif';g.textAlign='center';for(let m=0;m<=Math.floor(W);m++)g.fillText(m+' m',x0+m*k,yb+32);
  g.textAlign='left';g.font='600 24px sans-serif';g.fillText('Dibujo sin foto · cuadrícula de 50 cm',24,chh-24);
  return{img:cv.toDataURL('image/png'),caja:[x0/cw,y0/chh,(x0+W*k)/cw,yb/chh]}}
/* vuelve a generar el lienzo si cambian ancho, alto o techo, manteniendo lo dibujado en su lugar relativo al muro */
function fRelienzo(r,T){if(!r.sinFoto)return;const old=r.caja,ow=old[2]-old[0]||1,oh=old[3]-old[1]||1,oW=r._W||r.W,oH=r._H||r.H;const W=r.W||9,H=r.H||2.4;const L=fLienzo(W,H,T&&T.tipo&&T.tipo!=='plana'?(r.TH||T.alto||1.5):0);const c=L.caja,cw=c[2]-c[0],ch=c[3]-c[1];
  /* conserva las medidas en metros: distancia desde la esquina izquierda y altura desde el suelo */
  const mx=x=>(x-old[0])/ow*oW,my=y=>(old[3]-y)/oh*oH;const map=b=>[c[0]+mx(b[0])/W*cw,c[3]-my(b[1])/H*ch,c[0]+mx(b[2])/W*cw,c[3]-my(b[3])/H*ch];r._W=W;r._H=H;
  for(const v of r.vanos)v.caja=map(v.caja);for(const x of r.els||[])x.caja=map(x.caja);r.caja=c;r.img=L.img}
function fSinFoto(i,T){const c=P.casa;const W=(VV?fAnchoConocido(i):null)||(i%2===0?+c.ancho:+c.largo)||(i%2===0?9:8),H=+c.altura||2.4;const tt=T?.tipo||c.techo;const TH=tt&&tt!=='plana'?(T?.alto||+c.hTecho||1.5):0;
  const r=fBlank();const L=fLienzo(W,H,TH);Object.assign(r,{img:L.img,caja:L.caja,W,H,_W:W,_H:H,lado:i,sinFoto:true,manual:true,resumen:''});r.techo.tipo=tt||null;r.techo.cumbrera=T?.cumbrera||c.cumbrera||'paralela';r.techo.alto=TH||null;r.mat.revExt=(P.mat.revFach||{})[VSIDE[i].k]||P.mat.revExt||null;
  return r}
/* guarda la fachada dibujada o revisada (relativa al muro) para poder reflejarla en la opuesta */
function fGuardarRel(r){const c=r.caja,cw=c[2]-c[0]||1,ch=c[3]-c[1]||1;(P.fachRel=P.fachRel||{})[r.lado]={W:r.W,H:r.H,vanos:r.vanos.filter(v=>v.on).map(v=>({tipo:v.tipo,m:v.m||null,b:[(v.caja[0]-c[0])/cw,(v.caja[1]-c[1])/ch,(v.caja[2]-c[0])/cw,(v.caja[3]-c[1])/ch]}))};persist()}
function fCopiarOpuesta(r){const o=P.fachRel?.[(r.lado+2)%4];if(!o)return false;const c=r.caja,cw=c[2]-c[0],ch=c[3]-c[1];
  r.vanos=o.vanos.map(v=>({tipo:v.tipo,on:true,m:v.m?{...v.m}:null,caja:[c[0]+(1-v.b[2])*cw,c[1]+v.b[1]*ch,c[0]+(1-v.b[0])*cw,c[1]+v.b[3]*ch]}));return true}
function fSinFotoHTML(r,pre){const op=P.fachRel?.[(r.lado+2)%4];
  return`<div class="note sinfoto"><b>Fachada dibujada sin foto.</b> El recuadro punteado es el muro a escala, con cuadrícula de 50 cm. Agrega puertas y ventanas con los botones de abajo, arrástralas a su lugar y corrige sus medidas. Si no la puedes ver, pregunta al dueño o mírala desde el terreno vecino.
    ${op?`<div class="vacts"><button class="btn sm" data-${pre}="opuesta">Partir de la ${esc(FLADO[(r.lado+2)%4].n.toLowerCase())}, reflejada</button></div>`:''}</div>`}
/* en vivo */
function vFachadaDibujar(i){vSnap();const r=fSinFoto(i,VV.techo);VV.fRes=r;VV.techo=VV.techo||{...r.techo};vFachadaPreview(i);vPanel();toast('Dibuja la fachada sobre la cuadrícula.')}
document.addEventListener('click',e=>{const b=e.target.closest('[data-vfa="opuesta"],[data-pfa="opuesta"],[data-vfd],[data-pfd]');if(!b)return;
  if(b.dataset.vfd!=null){if(VV)vFachadaDibujar(+b.dataset.vfd);return}
  if(b.dataset.pfd!=null){const k=b.dataset.pfd,i=FKEY.indexOf(k);const c=P.casa;const r=fSinFoto(i,{tipo:c.techo,cumbrera:c.cumbrera,alto:+c.hTecho||0});FP={i,k,busy:false,res:r,T:{...r.techo,tipo:c.techo,cumbrera:c.cumbrera}};fProyPinta();return}
  if(b.dataset.vfa==='opuesta'&&VV?.fRes){if(fCopiarOpuesta(VV.fRes)){vFachadaPreview(VV.fRes.lado);vPanel();toast('Copiada y reflejada: ajusta lo que sea distinto.')}return}
  if(b.dataset.pfa==='opuesta'&&FP?.res){if(fCopiarOpuesta(FP.res)){fProyPinta();toast('Copiada y reflejada: ajusta lo que sea distinto.')}}});
