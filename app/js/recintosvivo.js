/* Huincha — recintos por dentro, reconocidos con la cámara.
   En la etapa Interior la IA mira la cámara cada pocos segundos: reconoce qué recinto es (cocina, baño, dormitorio…),
   estima sus medidas y el piso, y lo propone. El usuario solo confirma, corrige o mide con la cámara.
   Con realidad aumentada el recinto queda ubicado donde está el usuario dentro de la casa y se dibuja en el croquis. */
"use strict";
async function iaRecinto(blob,ctx){
  const pr=`Eres el asistente de una app chilena de levantamiento de viviendas. La foto es del interior de una casa, tomada por quien está haciendo el levantamiento.
Contexto: ${ctx}
Responde SOLO con un objeto JSON, sin texto adicional:
{"es_recinto":true o false (false si no se ve un recinto interior: pared muy de cerca, exterior, imagen borrosa),
 "tipo":"una de: ${Object.keys(TIPOS).join(', ')}",
 "nombre":"cómo se llama en dos o tres palabras (ej. dormitorio principal, baño de visitas, cocina americana)",
 "ancho":número en metros (de lado a lado, como se ve en la foto), "largo":número en metros (de adelante hacia el fondo), "alto":número en metros (piso a cielo),
 "piso":"una de: ${Object.keys(MATS.piso.opts).join(', ')}, o null",
 "muros":"una de: ${Object.keys(MATS.muroInt.opts).join(', ')}, o null",
 "puertas":número de puertas visibles, "ventanas":número de ventanas visibles,
 "artefactos":{"clave":cantidad} con lo que se ve, usando estas claves: ${Object.entries(ARTF).map(([k,t])=>k+' ('+t.n+(t.u==='ml'?', en metros lineales':'')+')').join(', ')}. Cuenta enchufes, interruptores y luminarias si se ven.
 "conf":número entre 0 y 1 de qué tan seguro estás del tipo de recinto,
 "guia":"instrucción breve (máximo 10 palabras) para ver mejor el recinto, o null"}
Estima las medidas comparando con referencias: puertas de 2 m de alto y 0,8 m de ancho, cerámicas de 30 o 60 cm, camas de 2 m de largo, muebles de cocina de 60 cm de fondo y 90 cm de alto, WC de 70 cm.
La cocina tiene muebles, lavaplatos o encimera; el baño, WC, lavamanos o ducha; el dormitorio, cama o clóset; el living-comedor, sillones o mesa de comedor; la logia, lavadora; el pasillo es angosto y largo.
Escribe en español de Chile.`;
  const o=await IA.ask(blob,pr,500);const pos=v=>+v>0&&+v<30?+v:null;
  return{es:o?.es_recinto!==false&&!!TIPOS[o?.tipo],tipo:TIPOS[o?.tipo]?o.tipo:'otro',nombre:o?.nombre?String(o.nombre).slice(0,40):null,
    ancho:pos(o?.ancho),largo:pos(o?.largo),alto:+o?.alto>1.8&&+o.alto<6?+o.alto:null,
    piso:MATS.piso.opts[o?.piso]?o.piso:null,muros:MATS.muroInt.opts[o?.muros]?o.muros:null,
    puertas:Math.max(0,Math.round(+o?.puertas||0)),ventanas:Math.max(0,Math.round(+o?.ventanas||0)),
    art:Object.fromEntries(Object.entries(o?.artefactos&&typeof o.artefactos==='object'?o.artefactos:{}).filter(([k,v])=>ARTF[k]&&+v>0).map(([k,v])=>[k,ARTF[k].u==='ml'?Math.round(Math.min(+v,15)*10)/10:Math.min(20,Math.round(+v))])),conf:Math.max(0,Math.min(1,+o?.conf||0)),guia:o?.guia?String(o.guia).slice(0,90):null}}

/* posición del usuario dentro de la casa (si se conoce) */
function vRecPos(){const h=vHere();if(!h)return null;const W=+P.casa.ancho||vDims().W||0,L=+P.casa.largo||vDims().L||0;
  if(!(W>0&&L>0))return null;const [x,y]=h.p;if(x<-.3||y<-.3||x>W+.3||y>L+.3)return null;return[Math.max(0,Math.min(W,x)),Math.max(0,Math.min(L,y))]}
/* rectángulo del recinto en la planta de la casa */
function vRecRect(r){if(!r.pos)return null;const W=+P.casa.ancho||vDims().W||0,L=+P.casa.largo||vDims().L||0;const a=+r.ancho||3,l=+r.largo||3;
  let x=r.pos[0]-a/2,y=r.pos[1]-l/2;if(W>0){x=Math.max(0,Math.min(Math.max(0,W-a),x))}if(L>0){y=Math.max(0,Math.min(Math.max(0,L-l),y))}return{x,y,w:a,l}}
function vRecNombre(tipo,nombre){const t=TIPOS[tipo]||TIPOS.otro;const cnt=VV.rooms.filter(r=>r.tipo===tipo).length+P.recintos.filter(r=>r.tipo===tipo).length;
  const base=nombre&&tipo!=='living'&&tipo!=='cocina'?nombre.charAt(0).toUpperCase()+nombre.slice(1):t.n;return(tipo==='dormitorio'||tipo==='bano')&&cnt&&base===t.n?`${t.n} ${cnt+1}`:base}

/* revisión automática */
async function vRecDetect(manual){if(!VV||VV.rBusy||VV.st!=='rooms'||VV.meas)return;if(!(await IA.mode())){if(manual)toast('La IA no está conectada: elige el recinto a mano.');VV.rauto=false;vPanel();return}
  VV.rBusy=true;vIaEstado('busy','La IA está mirando el recinto…');vPanel();
  try{const blob=await vGrab();if(!blob)return;const pos=vRecPos();const ya=VV.rooms.map(r=>r.nombre).join(', ');
    const r=await iaRecinto(blob,iaContexto('recorriendo el interior'+(ya?'; ya registrados: '+ya:'')));if(!VV)return;
    if(r.guia){VV.iaGuia={txt:r.guia,t:Date.now()}}
    if(!r.es||r.conf<.45){vIaEstado('ok','No se distingue el recinto. Apunta a un rincón para ver dos muros y el piso.');if(manual)toast('No reconocí el recinto: apunta a un rincón o elígelo abajo.');return}
    /* ¿ya está registrado este recinto? (mismo tipo y el usuario dentro de él) */
    const dup=VV.rooms.find(q=>q.tipo===r.tipo&&(pos&&q.pos?(()=>{const R=vRecRect(q);return pos[0]>=R.x-.3&&pos[0]<=R.x+R.w+.3&&pos[1]>=R.y-.3&&pos[1]<=R.y+R.l+.3})():!pos&&!manual&&q===VV.rooms[VV.rooms.length-1]));
    if(dup&&!manual){vIaEstado('ok',`Sigues en ${dup.nombre}. Pasa al siguiente recinto.`);return}
    {const tip=artTipico({tipo:r.tipo,ancho:r.ancho,largo:r.largo});for(const k of Object.keys(tip))if(!ARTF[k].el&&r.art[k]==null&&['bano','cocina','logia'].includes(r.tipo)&&['wc','lavamanos','lavaplatos','lavadora'].includes(k))r.art[k]=tip[k];if(r.art.interruptor==null)r.art.interruptor=1;if(r.art.luminaria==null)r.art.luminaria=tip.luminaria}
    VV.rsug={...r,nombre:vRecNombre(r.tipo,r.nombre),pos,blob,url:URL.createObjectURL(blob)};vIaEstado('ok',`La IA ve: ${TIPOS[r.tipo].n.toLowerCase()}`);try{navigator.vibrate?.(60)}catch(e){}}
  catch(err){vIaEstado('err',iaErrorMsg(err));VV.rNext=Date.now()+(err?.code==='cuota'?60000:20000);if(manual)toast(iaErrorMsg(err))}
  finally{if(VV){VV.rBusy=false;vPanel();vCroquis()}}}
setInterval(()=>{if(VV&&VV.st==='rooms'&&VV.rauto&&!VV.rsug&&!VV.rBusy&&!VV.meas&&document.visibilityState==='visible'&&Date.now()>(VV.rNext||0))vRecDetect(false)},6000);

/* panel */
function vRoomsHTML(tools){const s=VV.rsug;const reg=VV.rooms.length?`<p class="vh">Registrados: ${VV.rooms.map(r=>`<b>${esc(r.nombre)}</b> ${fmt(r.ancho,1)} × ${fmt(r.largo,1)} m${r.est?' (estimado)':''}`).join(' · ')}.</p>`:'';
  if(s){const f=(lab,k,v)=>`<label class="fld"><span>${lab}</span><div class="inp"><input id="vr-${k}" inputmode="decimal" value="${v?String(rr2(v)).replace('.',','):''}" placeholder="0"><em>m</em></div></label>`;
    return`<div class="vrsug"><img src="${s.url}" alt="Vista del recinto"><div><p class="vq">Estás en: ${esc(s.nombre)}</p><p class="vh">${s.ancho&&s.largo?`Mide aprox. ${fmt(s.ancho,1)} × ${fmt(s.largo,1)} m (estimado por la IA)`:'La IA no pudo estimar sus medidas'}${s.piso?` · piso de ${esc(MATS.piso.opts[s.piso].n.toLowerCase())}`:''}${s.puertas||s.ventanas?` · ${s.puertas} puerta${s.puertas===1?'':'s'}, ${s.ventanas} ventana${s.ventanas===1?'':'s'}`:''}.</p></div></div>
      <div class="fld"><span>¿Qué recinto es?</span><div class="chips">${Object.entries(TIPOS).map(([k,t])=>`<button class="chip" data-vr="tipo:${k}" aria-pressed="${s.tipo===k}">${t.n}</button>`).join('')}</div></div>
      <div class="vin vdims">${f('Ancho (izq. a der.)','a',s.ancho)}${f('Largo (hacia el fondo)','l',s.largo)}</div>
      <div class="fld"><span>Artefactos e instalaciones que se ven${Object.keys(s.art||{}).length?' (corrige las cantidades)':''}</span>${artEditHTML(s.art,s.tipo,'vr')}</div>
      <div class="vacts">${vrBtn('ok','Guardar recinto','btn pri')}${vrBtn('medir','📏 Medir con la cámara','btn')}${vrBtn('no','No es un recinto','btn ghost')}</div>${s.pos?'<p class="vh">Queda ubicado donde estás dentro de la casa.</p>':'<p class="vh">Indica dónde estás con «📍» para ubicarlo en la planta; si no, la app lo acomoda y podrás moverlo después.</p>'}`}
  return`<p class="vq">Recorre la casa por dentro, recinto por recinto</p>
    <p class="vh">${VV.rauto?'Entra a cada recinto y apunta a un rincón: la IA reconoce qué es (cocina, baño, dormitorio…), estima sus medidas y te pide confirmar.':'La revisión automática está pausada.'}${VV.rBusy?' Mirando…':''}</p>${reg}
    <div class="vacts">${vrBtn('ya','Reconocer ahora','btn pri')}${vrBtn('auto',VV.rauto?'Pausar revisión automática':'Reanudar revisión automática','btn sm')}</div>
    <details class="vrman"><summary>¿No lo reconoce? Elígelo tú</summary><div class="chips">${Object.entries(TIPOS).map(([k,t])=>`<button class="chip" data-va="room:${k}">${t.n}</button>`).join('')}</div></details>
    <div class="vacts">${vBtn('fin',VV.rooms.length?'Terminé los recintos':'Más tarde','btn ghost')}</div>${tools}`}
const vrBtn=(a,l,cl='btn')=>`<button class="${cl}" type="button" data-vr="${a}">${l}</button>`;
async function vRecGuardar(s,est){vSnap();const fotos=[];if(s.blob)fotos.push(await storePhoto(s.blob));
  VV.rooms.push({tipo:s.tipo,nombre:s.nombre,ancho:s.ancho||3,largo:s.largo||3,alto:s.alto,piso:s.piso,muros:s.muros,pos:s.pos,fotos,est,t:vRecT(),art:s.art&&Object.keys(s.art).length?s.art:null});
  if(s.url)URL.revokeObjectURL(s.url);VV.rsug=null;VV.rNext=Date.now()+8000;toast(`${s.nombre} registrado${est?' con medidas estimadas':''}.`);vPanel();vCroquis()}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-vr]');if(!b||!VV)return;const [a,x]=b.dataset.vr.split(':');const s=VV.rsug;
  const leer=()=>{if(!s)return;const v=id=>{const el=$(id);return el&&el.value.trim()!==''?num(el.value):null};const A=v('#vr-a'),L=v('#vr-l');if(A>0){if(A!==s.ancho)s.medido=1;s.ancho=A}if(L>0){if(L!==s.largo)s.medido=1;s.largo=L}};
  switch(a){
    case 'ya':vRecDetect(true);break;
    case 'auto':VV.rauto=!VV.rauto;vPanel();break;
    case 'tipo':if(s){leer();s.tipo=x;s.nombre=vRecNombre(x,null);if(!Object.keys(s.art||{}).some(k=>!ARTF[k].el))s.art=artTipico(s);vPanel()}break;
    case 'no':if(s){URL.revokeObjectURL(s.url);VV.rsug=null;VV.rNext=Date.now()+8000;vPanel()}break;
    case 'ok':if(s){leer();await vRecGuardar(s,!s.medido)}break;
    case 'medir':if(!s)break;leer();VV.rsug=null;
      vMeas({label:`${s.nombre}: de izquierda a derecha, de muro a muro.`,help:'Paralelo a la fachada principal.',kind:'h',quick:s.ancho?[[s.ancho,`Usar ${fmt(s.ancho,1)} m`]]:null,then:v1=>{s.ancho=v1;
        vMeas({label:`${s.nombre}: de adelante hacia el fondo.`,help:'Desde el muro más cercano a la calle hasta el del fondo.',kind:'h',quick:s.largo?[[s.largo,`Usar ${fmt(s.largo,1)} m`]]:null,then:async v2=>{s.largo=v2;VV.st='rooms';await vRecGuardar(s,false)}})}});break}});

/* croquis: recintos dibujados dentro de la casa */
function vRooms3D(root){for(const r of VV.rooms){const R=vRecRect(r);if(!R)continue;const col=(TIPOS[r.tipo]||TIPOS.otro).c;
  const fl=new THREE.Mesh(new THREE.BoxGeometry(R.w-.06,.04,R.l-.06),new THREE.MeshStandardMaterial({color:col}));fl.position.set(R.x+R.w/2,.03,-(R.y+R.l/2));fl.userData.sk='piso';root.add(fl);
  const h=+r.alto||+P.casa.altura||2.4;const wm=new THREE.MeshStandardMaterial({color:0xf4f1ea,transparent:true,opacity:.5});
  for(const [cx,cy,w,l] of [[R.x+R.w/2,R.y,R.w,.08],[R.x+R.w/2,R.y+R.l,R.w,.08],[R.x,R.y+R.l/2,.08,R.l],[R.x+R.w,R.y+R.l/2,.08,R.l]]){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h*.45,l),wm);m.position.set(cx,h*.225,-cy);root.add(m)}}}
function vRoomsSVG(){let h='';for(const r of VV.rooms){const R=vRecRect(r);if(!R)continue;h+=`<rect class="vroom" x="${R.x}" y="${-(R.y+R.l)}" width="${R.w}" height="${R.l}"/><text x="${R.x+R.w/2}" y="${-(R.y+R.l/2)}" text-anchor="middle" class="vtx">${esc(r.nombre)}</text>`}return h}
