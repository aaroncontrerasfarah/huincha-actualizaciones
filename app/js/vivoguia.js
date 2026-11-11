/* Huincha — recorrido guiado.
   La app conduce el levantamiento completo: primero el terreno en el mapa, después la fachada del terreno (rejas,
   portón), el acceso, el contorno de la casa, el patio y el interior. Mientras se camina, la IA revisa la cámara,
   dibuja en el croquis lo que reconoce y da la siguiente instrucción ("camina en línea recta", "sube la escalera"…).
   Lo que reconoce con mucha seguridad queda dibujado; lo dudoso se pregunta al terminar cada etapa. */
"use strict";
const GUIA=[
  {k:'mapa',t:'Terreno en el mapa',ins:'Primero, marca los deslindes del terreno en el mapa satelital.'},
  {k:'frente',t:'Frente del terreno',ins:'Párate en la vereda frente a la casa. Apunta la cámara a la reja y al portón, y muévela despacio de izquierda a derecha.',auto:1},
  {k:'fach0',fach:0,t:'Fachada principal',ins:'Foto de la fachada principal completa, con su techo.'},
  {k:'acceso',t:'Acceso',ins:'Entra por el portón y camina en línea recta hacia la puerta de la casa, con la cámara al frente.',auto:1,camina:1},
  {k:'contorno',t:'Contorno de la casa',ins:'Ahora recorre la casa por fuera, esquina por esquina.'},
  {k:'fach1',fach:1,t:'Costado derecho',ins:'Foto del costado derecho completo, con su techo.'},
  {k:'fach2',fach:2,t:'Fachada posterior',ins:'Foto de la fachada de atrás completa, con su techo.'},
  {k:'fach3',fach:3,t:'Costado izquierdo',ins:'Foto del costado izquierdo completo, con su techo.'},
  {k:'patio1',t:'Patio: costado izquierdo',ins:'Camina hacia el fondo por el costado izquierdo del terreno. Apunta a todo lo que haya: quincho, piscina, árboles, bodega.',auto:1,camina:1},
  {k:'patio2',t:'Patio: fondo',ins:'Recorre el fondo del terreno de lado a lado, apuntando al deslinde y a lo que esté cerca.',auto:1,camina:1},
  {k:'patio3',t:'Patio: costado derecho',ins:'Vuelve hacia la calle por el costado derecho, apuntando a lo que haya entre la casa y el deslinde.',auto:1,camina:1},
  {k:'interior',t:'Interior',ins:'Abre la puerta principal y entra. La IA reconoce cada recinto mientras recorres la casa.'},
  {k:'detalles',t:'Detalles y medidas',ins:'Ya está la forma general. Ahora medimos con precisión lo que quedó estimado.'}
];
const GAUTO_SEG=7,GAUTO_OK=.85;
function vGuia(){return VV&&VV.guia?GUIA[VV.guia.i]:null}
/* largo de un lado del terreno (si se midió en el mapa), para dar instrucciones con metros */
function vLadoTerreno(k){const lo=P.lote;if(!(lo.frente>0))return null;return k==='fondo'?lo.frente:lo.fondo}

/* ---------- posición inicial en la vereda ---------- */
function vPoseInicial(silencio){const rf=+P.casa.retiroFrontal||3,S=[0,-(rf+.5)];
  if(VV.eng==='ar'){const a=VV.ar;if(!a?.cam||a.tracking!=='TRACKING'){if(!silencio)toast('Mueve el equipo lentamente hasta que la realidad aumentada reconozca el suelo.');return false}VV.arRef={c:a.cam.slice(),f:a.fwd.slice(),S}}
  else{if(VV.head!=null)VV.h0=(VV.head+90)%360;VV.dr=S}
  return true}
/* conversión de un punto de realidad aumentada a la planta usando la posición inicial (antes de marcar esquinas) */
function vArRefPlan(p){const R=VV.arRef;if(!R)return null;let fx=R.f[0],fz=R.f[2];const n=Math.hypot(fx,fz)||1;fx/=n;fz/=n;const rx=-fz,rz=fx;const dx=p[0]-R.c[0],dz=p[2]-R.c[2];return[R.S[0]+dx*rx+dz*rz,R.S[1]+dx*fx+dz*fz]}

/* ---------- panel ---------- */
function vGuiaHTML(){const g=vGuia();if(!g)return'';const i=VV.guia.i,n=GUIA.length;const pend=vSugPend().length;
  const head=`<div class="gprog"><span class="lbl">Recorrido guiado · ${i+1} de ${n}</span><div class="gbar"><i style="width:${Math.round(i/(n-1)*100)}%"></i></div></div><p class="vq">${esc(g.t)}${({mapa:'deslindes',frente:'frente',fach0:'fachadaPrincipal',acceso:'antejardin',contorno:'contorno',fach1:'costados',fach2:'posterior',fach3:'costados',patio1:'laterales',patio2:'fondo',patio3:'laterales',detalles:'cubicacion'})[g.k]?' '+queEs(({mapa:'deslindes',frente:'frente',fach0:'fachadaPrincipal',acceso:'antejardin',contorno:'contorno',fach1:'costados',fach2:'posterior',fach3:'costados',patio1:'laterales',patio2:'fondo',patio3:'laterales',detalles:'cubicacion'})[g.k]):''}</p>`;
  if(g.k==='mapa'){const ok=P.lote.geo||(P.lote.frente>0&&P.lote.fondo>0);
    return head+`<p class="vh">${ok?`Ya está medido: ${fmt(P.lote.frente,1)} × ${fmt(P.lote.fondo,1)} m${P.lote.geo?' en el mapa':''}. Puedes revisarlo o seguir.`:esc(g.ins)+' Así la app sabe dónde están los deslindes y el croquis parte con el terreno dibujado.'}</p>
      <div class="vacts">${ok?vgBtn('next','Seguir','btn pri')+vgBtn('mapa','Revisar en el mapa','btn'):vgBtn('mapa','Abrir el mapa','btn pri')+vgBtn('next','Ahora no','btn')}</div>${vgSalir()}`}
  if(g.fach!=null)return head+vFachadaHTML(g.fach)+`<div class="vacts">${vgBtn('next',VV.fach?.[g.fach]?'Siguiente':'Saltar esta fachada','btn ghost')}${vgBtn('prev','Volver','btn ghost')}</div>`;
  if(g.k==='detalles'){const L=VV.elems.filter(e=>!e.sug);const est=L.filter(e=>e.est!==false);
    return head+`<p class="vh">${esc(g.ins)} ${est.length?`Quedan ${est.length} con medidas estimadas.`:'Todo está medido.'}</p>
      <div class="vlist">${L.map(e=>`<div class="vli"><button class="lnk" data-ve="sel:${e.id}"><b>${esc(elNombre(e))}</b><small>${elMedidas(e)} · ${e.est!==false?'estimado':'medido'}</small></button>${e.est!==false?`<button class="btn sm pri" data-ve="dmed:${e.id}">Medir</button>`:'<span class="lbl">✓</span>'}</div>`).join('')}</div>
      <div class="vacts">${vgBtn('fin','Terminar el levantamiento','btn pri')}</div>`}
  if(g.k==='frente'&&!VV.ubicado)return head+`<p class="vh">Primero dile a la app dónde estás en el terreno: así calcula bien dónde queda cada cosa que señales con la cámara.</p><div class="vacts"><button class="btn pri" data-ve="ubic">📍 Indicar dónde estoy</button></div>${vgSalir()}`;
  let ins=g.ins;if(g.k==='patio1'||g.k==='patio3'){const L=vLadoTerreno('lado');if(L)ins+=` Son unos ${fmt(L,0)} m.`}if(g.k==='patio2'){const L=vLadoTerreno('fondo');if(L)ins+=` Son unos ${fmt(L,0)} m.`}
  const hecho=VV.elems.filter(e=>e.etapa===g.k&&!e.sug).length;
  const pie=g.camina&&VV.eng!=='ar'?`<p class="vh">${VV.dr&&VV.dr[1]<-0.3?`Estás a unos ${fmt(-VV.dr[1],1)} m de la fachada.`:''}</p>`:'';
  return head+`<p class="vh">${esc(ins)}</p>${pie}
    <p class="vh">${VV.detBusy?'La IA está mirando…':VV.auto?'La IA revisa la cámara cada pocos segundos y dibuja lo que reconoce.':''}${hecho?` Registrado en esta etapa: ${hecho}.`:''}${pend?` Por confirmar: ${pend}.`:''}</p>
    <div class="vacts">${vgBtn('next',pend?`Confirmar ${pend} y seguir`:'Listo, siguiente','btn pri')}${vgBtn('prev','Volver','btn ghost')}</div>${vgSalir()}`}
const vgBtn=(a,l,cl='btn')=>`<button class="${cl}" type="button" data-vg="${a}">${l}</button>`;
const vgSalir=()=>`<div class="vacts">${vgBtn('libre','Medir sin guía','btn sm ghost')}</div>`;
/* instrucción grande sobre la cámara */
function vGuiaBanner(){const el=$('#vguia');if(!el||!VV)return;const g=vGuia();let t='';
  if(VV.iaGuia&&Date.now()-VV.iaGuia.t<20000)t=VV.iaGuia.txt;
  else if(g&&g.fach!=null&&VV.st==='guia')t=VV.fBusy?'Analizando la fachada…':VV.fRes?'Revisa lo que reconoció la IA':FLADO[g.fach].ins;
  else if(g&&VV.st==='guia')t=g.ins;
  else if(g&&g.k==='contorno'){t=VV.st==='walk'?(VV.i===0?'Camina en línea recta junto a la fachada':'Gira y sigue junto al muro'):VV.st==='intro'?'Ve a la esquina izquierda de la fachada':''}
  else if(g&&g.k==='interior'&&VV.st==='rooms')t=VV.rsug?'Confirma el recinto':'Entra a cada recinto y apunta a un rincón';
  el.hidden=!t;el.textContent=t}

/* ---------- avanzar ---------- */
function vGuiaIr(i){const n=GUIA.length;if(i>=n){VV.guia.i=n-1;VV.st='done';VV.auto=false;vPanel();return}
  VV.guia.i=Math.max(0,i);const g=GUIA[VV.guia.i];VV.iaGuia=null;
  if(g.k==='contorno'){VV.auto=true;VV.st=VV.sides.length&&VV.sides[VV.sides.length-1]?.closing?'extras':'intro';vPanel();vCroquis();return}
  if(g.k==='interior'){VV.auto=false;VV.st='rooms';VV.rauto=true;vPanel();vCroquis();setTimeout(()=>vRecDetect(false),900);return}
  if(g.k==='detalles'){VV.auto=false;VV.st='guia';vPanel();vCroquis();return}
  if(g.fach!=null){VV.auto=false;VV.st='guia';VV.fRes=null;vPanel();vCroquis();return}
  VV.st='guia';VV.auto=true;if(g.k==='frente'&&!VV.ubicado)setTimeout(()=>{if(VV&&!VV.ubicado&&!VV.ub)vUbicar('inicio')},400);if(!VV.rec)vRecStart();vPanel();vCroquis();setTimeout(()=>vDetect(true),500)}
function vGuiaNext(){if(vSugPend().length){VV.guia.alSeguir=1;VV.sub='sug';vPanel();return}vGuiaIr(VV.guia.i+1)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-vg]');if(!b||!VV)return;
  switch(b.dataset.vg){
    case 'next':vGuiaNext();break;
    case 'prev':vGuiaIr(VV.guia.i-1);break;
    case 'fin':VV.st='done';VV.auto=false;vPanel();break;
    case 'pose':if(vPoseInicial()){VV.guia.ok=1;toast('Listo. Ahora apunta a la reja y al portón.');vGuiaIr(VV.guia.i)}break;
    case 'mapa':UI.trasMapa='vivo';vivoClose().then(()=>openMap());break;
    case 'libre':VV.guia=null;VV.auto=false;VV.st=VV.sides.length?VV.st==='guia'?'extras':VV.st:'intro';$('#vguia')&&($('#vguia').hidden=true);vPanel();break}});
/* después de validar lo pendiente, sigue a la etapa siguiente */
setInterval(()=>{if(VV&&VV.guia&&VV.guia.alSeguir&&!vSugPend().length&&VV.sub!=='sug'){VV.guia.alSeguir=0;vGuiaIr(VV.guia.i+1)}vGuiaBanner()},700);
