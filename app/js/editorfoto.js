/* Huincha — editor de foto de cada estación.
   1. Se marca la referencia (por ejemplo las dos esquinas de abajo del muro, cuyo largo se conoce por el mapa).
   2. La IA propone lo que reconoce (líneas punteadas); se acepta, se corrige o se borra.
   3. Se dibujan recuadros, polígonos o líneas; cada uno con su tipo, material y medidas. La medida escrita manda;
      la calculada con la escala es solo sugerencia, y las medidas raras se marcan en rojo.
   Coordenadas de las formas: 0 a 1 relativas a la imagen (u hacia la derecha, v hacia abajo). */
"use strict";
const EF={est:null,foto:null,tool:null,sel:null,cur:[],drag:null,busy:false};
const EF_TIPOS_POR_ESTACION={
  fachada:['muro','agua','puerta','ventana','ventanal','porton_garage','piso','terraza','escalera','baranda','pilar','cobertizo','balcon','pilote'],
  frente:['reja','porton','muro','cerco','malla','pilar','medidorAgua','medidorLuz','piso','camino','arbol'],
  objeto:['cobertizo','quincho','bodega','carport','pergola','piscina','terraza','deck','radier','piso','escalera','baranda','pilar','muro','agua','puerta','ventana','pilote','balcon','altillo'],
  fondo:['cerco','muro','reja','malla','arbol','arbusto','bodega','fosa','camaraIns','estanque','piso'],
  libre:['cobertizo','quincho','bodega','piscina','terraza','deck','radier','piso','escalera','baranda','pilar','reja','porton','cerco','muro','arbol','estanque','pilote','balcon','agua','puerta','ventana']};
const EF_TN={muro:'Muro',agua:'Agua del techo',puerta:'Puerta',ventana:'Ventana',ventanal:'Ventanal',porton_garage:'Portón de garaje',piso:'Piso'};
const efNom=t=>EF_TN[t]||ELT[t]?.n||t||'Sin tipo';
if(typeof PICTO==='object'){PICTO.agua=PICTO.agua||'<path d="M2 16L12 6l10 10M5 13v7M19 13v7"/>';PICTO.piso=PICTO.piso||'<path d="M2 17l6-6h14l-6 6zM2 17v2h14v-2"/>';PICTO.ventanal=PICTO.ventanal||'<rect x="3" y="5" width="18" height="15"/><path d="M12 5v15"/>';PICTO.porton_garage=PICTO.porton_garage||'<path d="M3 21V8l9-4 9 4v13M6 21v-9h12v9M6 15h12M6 18h12"/>'}
/* materiales posibles según el tipo */
function efMats(t){if(t==='muro')return MATS.revExt?.opts;if(t==='agua')return MATS.cubierta?.opts;if(t==='puerta')return MATS.puertas?.opts;if(['ventana','ventanal'].includes(t))return MATS.ventanas?.opts;if(t==='piso')return MATOPC.piso;return MATOPC[MATGRP[t]]||null}
/* qué medidas pide cada tipo */
function efCampos(f){if(f.geo==='linea')return[['largo','Largo']];const c=[['ancho','Ancho'],['alto','Alto']];
  if(['ventana','ventanal'].includes(f.tipo))c.push(['sobre','Desde el suelo (antepecho)']);if(['piso','terraza','cobertizo','escalera','balcon','deck','radier','carport','pergola','quincho','bodega','piscina'].includes(f.tipo))c.push(['fondo','Fondo (hacia adentro)']);if(['balcon','altillo'].includes(f.tipo))c.push(['sobre','Altura sobre el suelo']);return c}

/* ---------- medidas por escala ---------- */
function efMedidas(foto,f){const R=foto?.ref;if(!R?.pts||R.pts.length<2||!(R.largo>0)||!f?.pts?.length)return null;const w=foto.w||1,h=foto.h||1;
  const dpx=Math.hypot((R.pts[1][0]-R.pts[0][0])*w,(R.pts[1][1]-R.pts[0][1])*h);if(!(dpx>0))return null;const k=R.largo/dpx,suelo=(R.pts[0][1]+R.pts[1][1])/2;
  const us=f.pts.map(p=>p[0]),vs=f.pts.map(p=>p[1]);const r2=v=>Math.round(v*100)/100;
  let largo=0;for(let i=0;i<f.pts.length-1;i++)largo+=Math.hypot((f.pts[i+1][0]-f.pts[i][0])*w,(f.pts[i+1][1]-f.pts[i][1])*h)*k;
  return{ancho:r2((Math.max(...us)-Math.min(...us))*w*k),alto:r2((Math.max(...vs)-Math.min(...vs))*h*k),sobre:r2(Math.max(0,(suelo-Math.max(...vs))*h*k)),largo:r2(largo)}}
const efMed=(foto,f,k)=>{const v=f.med?.[k];if(v>0||(k==='sobre'&&v===0))return v;const m=efMedidas(foto,f);return m?m[k]:null};
function efAviso(f,m){const g=k=>f.med?.[k]>0?f.med[k]:m?.[k];const alto=g('alto'),ancho=g('ancho');
  if(['puerta','porton_garage'].includes(f.tipo)&&alto>3)return`Una ${f.tipo==='puerta'?'puerta':'puerta de garaje'} de ${fmt(alto,2)} m de alto es poco común: revisa la referencia o escribe la medida.`;
  if(['ventana','ventanal'].includes(f.tipo)&&((alto>0&&alto<.3)||(ancho>0&&ancho<.3)))return'Una ventana de menos de 30 cm es poco común: revisa la medida.';
  if(f.tipo==='muro'&&alto>8)return`Un muro de ${fmt(alto,1)} m de alto es poco común: ¿la referencia está bien marcada?`;
  return null}

/* ---------- abrir ---------- */
function efRefDefecto(est){if(est.tipo==='fachada')return(casaLados().find(l=>l.k===est.ref)||{}).largo||null;if(est.tipo==='frente'||est.tipo==='fondo')return+P.lote.frente||null;
  if(est.tipo==='objeto'){const e=(P.elementos||[]).find(x=>x.id===est.ref);return e?Math.max(+e.w||0,+e.l||0)||null:null}return null}
async function efAbrir(est,blob,idx){EF.est=est;EF.sel=null;EF.cur=[];EF.tool=null;EF.refN=0;
  if(blob){let w=1,h=1;try{const bm=await createImageBitmap(blob);w=bm.width;h=bm.height}catch(e){}const img=await storePhoto(blob);
    EF.foto={id:uid(),img,w,h,ref:{pts:null,largo:efRefDefecto(est)},formas:[]};est.fotos.push(EF.foto);est.estado='foto';persist();EF.tool='ref';EF.blob=blob}
  else{EF.foto=est.fotos[idx||0];EF.blob=null}
  let ov=$('#efov');if(!ov){ov=document.createElement('div');ov.id='efov';ov.className='efov';document.body.appendChild(ov)}ov.hidden=false;efPinta();
  if(blob)efIA(est,EF.foto,blob)}
function efCerrar(){const ov=$('#efov');if(ov)ov.hidden=true;EF.est=null;if(typeof estPinta==='function')estPinta()}

/* ---------- propuesta de la IA ---------- */
async function efIA(est,foto,blob){if(!(await IA.mode()))return;EF.busy=true;efPinta();
  try{const caja=(c,tipo,ex={})=>({id:uid(),tipo,geo:'caja',pts:[[c[0],c[1]],[c[2],c[3]]],med:{},mat:null,sug:true,...ex});const add=[];
    if(est.tipo==='fachada'){const i=['frontal','derecho','posterior','izquierdo'].indexOf(est.ref);const r=await iaFachada(blob,FLADO[Math.max(0,i)].n.toLowerCase());
      if(r.caja){add.push(caja(r.caja,'muro',{mat:r.mat?.revExt||null}));if(!foto.ref.pts)foto.ref.pts=[[r.caja[0],r.caja[3]],[r.caja[2],r.caja[3]]]}
      for(const v of r.vanos||[])add.push(caja(v.caja,v.tipo));for(const x of r.els||[])add.push(caja(x.caja,x.tipo,{mat:x.mat||null}));
      if(r.techo?.tipo&&r.techo.tipo!=='plana'&&r.caja){const c=r.caja,hT=Math.min(c[1]*.9,(c[3]-c[1])*.6);add.push({id:uid(),tipo:'agua',geo:'poli',pts:[[c[0],c[1]],[(c[0]+c[2])/2,c[1]-hT],[c[2],c[1]]],med:{},mat:r.techo.cubierta||null,sug:true})}}
    else{const tipos=EF_TIPOS_POR_ESTACION[est.tipo]||EF_TIPOS_POR_ESTACION.libre;
      const o=await IA.ask(blob,`Eres arquitecto. En esta foto de un terreno con vivienda en Chile, marca los elementos constructivos que se ven.\nResponde SOLO con JSON: {"elementos":[{"tipo":"una de: ${tipos.join(', ')}","caja":[x0,y0,x1,y1] entre 0 y 1 (0,0 arriba a la izquierda),"material":"texto corto o null"}]}\n${typeof IA_CHILE!=='undefined'?IA_CHILE:''}\nNo marques autos, personas, muebles ni objetos sueltos.`,900);
      for(const x of (o?.elementos||[]).slice(0,14)){const c=x.caja;if(!tipos.includes(x.tipo)||!Array.isArray(c)||c.length!==4)continue;const q=c.map(v=>Math.max(0,Math.min(1,+v||0)));if(q[2]-q[0]<.01||q[3]-q[1]<.01)continue;
        const lin=ELT[x.tipo]?.k==='linea';add.push(lin?{id:uid(),tipo:x.tipo,geo:'linea',pts:[[q[0],q[3]],[q[2],q[3]]],med:{},mat:null,sug:true}:caja(q,x.tipo))}}
    if(EF.foto===foto){foto.formas.push(...add);if(foto.ref.pts&&EF.tool==='ref')EF.tool=null;persist()}
    if(add.length)toast(`La IA marcó ${add.length} elemento${add.length>1?'s':''}: revísalos y corrige lo que haga falta.`)}
  catch(err){toast((typeof iaErrorMsg==='function'?iaErrorMsg(err):'La IA no respondió.')+' Puedes marcar tú los elementos.')}
  finally{EF.busy=false;if(EF.foto===foto)efPinta()}}

/* ---------- dibujo ---------- */
function efSVG(){const F=EF.foto,w=F.w,h=F.h,X=p=>(p[0]*w).toFixed(1)+','+(p[1]*h).toFixed(1),hr=Math.max(w,h)*.018,fs=Math.max(w,h)*.04;let s='';
  const R=F.ref;if(R.pts){const [a,b]=R.pts;s+=`<line x1="${a[0]*w}" y1="${a[1]*h}" x2="${b[0]*w}" y2="${b[1]*h}" class="ef-ref"/><text x="${(a[0]+b[0])/2*w}" y="${(a[1]+b[1])/2*h-fs*.5}" font-size="${fs}" class="ef-reft">${R.largo>0?fmt(R.largo,2)+' m':'¿cuánto mide?'}</text>`;R.pts.forEach((p,i)=>s+=`<circle cx="${p[0]*w}" cy="${p[1]*h}" r="${hr}" class="ef-h ref" data-h="ref:${i}"/>`)}
  for(const f of F.formas){const sel=f.id===EF.sel,cl=`ef-f ${f.sug?'sug':''} ${sel?'on':''} ${f.tipo?'':'sintipo'}`;const T=ELT[f.tipo];const col=f.tipo==='agua'?'#c0392b':['puerta','ventana','ventanal','porton_garage'].includes(f.tipo)?'#2b7bf3':T?.col||'#e0a800';
    if(f.geo==='caja'){const [a,b]=f.pts;s+=`<rect x="${Math.min(a[0],b[0])*w}" y="${Math.min(a[1],b[1])*h}" width="${Math.abs(b[0]-a[0])*w}" height="${Math.abs(b[1]-a[1])*h}" class="${cl}" style="stroke:${col}" data-f="${f.id}"/>`}
    else if(f.geo==='poli')s+=`<polygon points="${f.pts.map(X).join(' ')}" class="${cl}" style="stroke:${col}" data-f="${f.id}"/>`;
    else s+=`<polyline points="${f.pts.map(X).join(' ')}" class="${cl} lin" style="stroke:${col}" data-f="${f.id}"/>`;
    const us=f.pts.map(p=>p[0]),vs=f.pts.map(p=>p[1]);const m=efMedidas(F,f),av=efAviso(f,m);
    s+=`<text x="${Math.min(...us)*w}" y="${Math.min(...vs)*h-fs*.35}" font-size="${fs*.8}" class="ef-lab${av?' warn':''}">${esc(efNom(f.tipo))}${av?' ⚠':''}</text>`;
    if(sel)f.pts.forEach((p,i)=>s+=`<circle cx="${p[0]*w}" cy="${p[1]*h}" r="${hr}" class="ef-h" data-h="${f.id}:${i}"/>`)}
  if(EF.cur.length)s+=`<polyline points="${EF.cur.map(X).join(' ')}" class="ef-cur"/>`+EF.cur.map(p=>`<circle cx="${p[0]*w}" cy="${p[1]*h}" r="${hr*.7}" class="ef-h cur"/>`).join('');
  return`<svg class="efsvg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${s}</svg>`}
function efPanelHTML(){const F=EF.foto,est=EF.est,f=F.formas.find(x=>x.id===EF.sel);
  if(EF.tool==='ref')return`<p class="vq">Paso 1: la referencia</p><p class="vh">${est.tipo==='fachada'?'Toca las dos esquinas de abajo del muro de esta fachada (donde el muro toca el suelo).':'Toca los dos extremos de algo cuyo largo conozcas (el ancho del portón, un muro, la reja de lado a lado).'} Con esa medida la app calcula las demás.</p>
    <label class="fld"><span>¿Cuánto mide?${efRefDefecto(est)?' (según el mapa)':''}</span><div class="inp"><input data-efr inputmode="decimal" value="${F.ref.largo>0?String(F.ref.largo).replace('.',','):''}" placeholder="0"><em>m</em></div></label>
    <div class="row">${F.ref.pts?`<button class="btn pri" data-ef="refok">Listo, seguir</button>`:''}<button class="btn ghost" data-ef="refno">Saltar (escribiré las medidas)</button></div>`;
  if(f){const ts=EF_TIPOS_POR_ESTACION[est.tipo]||EF_TIPOS_POR_ESTACION.libre;const mats=f.tipo?efMats(f.tipo):null;const m=efMedidas(F,f),av=efAviso(f,m);
    const mapa=efVinculoCandidatos(f);
    return`<div class="row sb"><b>${picto(f.tipo)}${esc(efNom(f.tipo))}${f.sug?' <span class="lbl">propuesto por la IA</span>':''}</b><span class="row">${f.sug?`<button class="btn sm pri" data-ef="ok">Está bien</button>`:''}<button class="btn sm danger" data-ef="del">Borrar</button><button class="btn sm" data-ef="cerrarf">Listo</button></span></div>
      <div class="fld"><span>¿Qué es?</span><div class="pics">${ts.map(k=>`<button type="button" class="picb${f.tipo===k?' on':''}" data-ef="tipo:${k}">${picto(k)}<span>${esc(efNom(k))}</span></button>`).join('')}</div></div>
      ${mats?`<div class="fld"><span>Material</span><div class="chips">${Object.entries(mats).map(([k,o])=>`<button class="chip" data-ef="mat:${k}" aria-pressed="${f.mat===k}">${esc(o.n||k)}</button>`).join('')}</div></div>`:''}
      <div class="fld"><span>Medidas (escribe la real si la tomaste${m?'; en gris, lo que calcula la app':''})</span><div class="efmeds">${efCampos(f).map(([k,l])=>`<label class="efm"><span>${l}</span><span class="inp sm"><input data-efm="${k}" inputmode="decimal" value="${f.med?.[k]>0||f.med?.[k]===0?String(f.med[k]).replace('.',','):''}" placeholder="${m&&m[k]!=null?String(m[k]).replace('.',','):'—'}"><em>m</em></span></label>`).join('')}</div>${av?`<p class="note warn">${esc(av)}</p>`:''}${!m?'<p class="vh">Marca la referencia para que la app calcule las medidas.</p>':''}</div>
      ${mapa.length?`<div class="fld"><span>¿Es algo que marcaste en el mapa?</span><div class="chips">${mapa.map(e=>`<button class="chip" data-ef="vin:${e.id}" aria-pressed="${f.vinculo===e.id}">${esc(elNombre(e))}</button>`).join('')}<button class="chip" data-ef="vin:" aria-pressed="${!f.vinculo}">No, es nuevo</button></div></div>`:''}`}
  const nsug=F.formas.filter(x=>x.sug).length,nsin=F.formas.filter(x=>!x.tipo).length;
  return`<p class="vq">${EF.busy?'La IA está mirando la foto…':F.formas.length?'Revisa y completa lo marcado':'Marca lo que se ve'}</p>
    <p class="vh">${EF.tool==='caja'?'Arrastra sobre la foto para encerrar el elemento (puerta, ventana, cobertizo…).':EF.tool==='poli'?`Toca cada esquina en orden (${EF.cur.length}) y luego «Terminar». Sirve para aguas del techo y formas irregulares.`:EF.tool==='linea'?`Toca dónde empieza y dónde termina (pisos, rejas, barandas)${EF.cur.length?' — falta el final':''}.`:'Elige una herramienta y marca sobre la foto. Toca algo marcado para decir qué es, su material y sus medidas.'}</p>
    ${nsug?`<div class="row"><button class="btn sm" data-ef="okall">Aceptar los ${nsug} propuestos por la IA</button></div>`:''}${nsin?`<p class="note warn">${nsin} sin tipo: tócalos y elige qué son.</p>`:''}
    <div class="row"><button class="btn pri" data-ef="guardar">Guardar y dibujar en el croquis</button></div>`}
function efVinculoCandidatos(f){if(!f.tipo||!ELT[f.tipo])return[];const fam={cobertizo:['cobertizo','carport','pergola'],carport:['carport','cobertizo'],terraza:['terraza','deck','radier'],deck:['deck','terraza'],radier:['radier','terraza','estacionamiento','camino'],piso:['radier','ceramico','terraza','deck','camino']}[f.tipo]||[f.tipo];
  return(P.elementos||[]).filter(e=>fam.includes(e.t)).slice(0,6)}
let efPintando=false;function efPinta(){const ov=$('#efov');if(!ov||!EF.foto||efPintando)return;efPintando=true;try{efPinta0(ov)}finally{efPintando=false}}
function efPinta0(ov){const F=EF.foto,src=phSrc(F.img)||'';
  ov.innerHTML=`<div class="efpan"><div class="row sb"><div><span class="lbl">${esc(EF.est.n)}</span></div><button class="btn sm dark" data-ef="cerrar" aria-label="Cerrar">✕</button></div>
    <div class="eftools">${[['ref','📏 Referencia'],['caja','▭ Recuadro'],['poli','⬠ Polígono'],['linea','╱ Línea']].map(([k,l])=>`<button class="btn sm${EF.tool===k?' pri':''}" data-ef="tool:${k}">${l}</button>`).join('')}${EF.cur.length?`<button class="btn sm pri" data-ef="fin">Terminar</button><button class="btn sm ghost" data-ef="undo">Deshacer</button>`:''}</div>
    <div class="efwrap"><span class="efimg"><img src="${src}" alt="Foto de ${esc(EF.est.n)}" draggable="false">${efSVG()}</span></div>
    <div class="efside">${efPanelHTML()}</div></div>`}

/* ---------- interacción ---------- */
const efUV=e=>{const s=$('#efov svg.efsvg');if(!s)return null;const r=s.getBoundingClientRect();return[Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))]};
const efRepinta=()=>{const s=$('#efov svg.efsvg');if(s)s.outerHTML=efSVG()};
document.addEventListener('pointerdown',e=>{if(!$('#efov')||$('#efov').hidden||!e.target.closest('#efov svg.efsvg'))return;const p=efUV(e);if(!p)return;e.preventDefault();const F=EF.foto;
  const hd=e.target.closest('[data-h]');if(hd){const [a,i]=hd.dataset.h.split(':');EF.drag={a,i:+i};return}
  if(EF.tool==='caja'){EF.drag={nueva:{id:uid(),tipo:null,geo:'caja',pts:[p,p.slice()],med:{},mat:null}};F.formas.push(EF.drag.nueva);return}
  if(EF.tool==='ref'){if(!EF.refN||EF.refN>=2){F.ref.pts=[p,p.slice()];EF.refN=1}else{F.ref.pts[1]=p;EF.refN=2}EF.drag={a:'ref',i:1};return}
  if(EF.tool==='poli'||EF.tool==='linea'){EF.cur.push(p);if(EF.tool==='linea'&&EF.cur.length===2)efFin();else efPinta();return}
  const fe=e.target.closest('[data-f]');EF.sel=fe?fe.dataset.f:null;efPinta()});
document.addEventListener('pointermove',e=>{if(!EF.drag)return;const p=efUV(e);if(!p)return;const F=EF.foto,d=EF.drag;
  if(d.nueva)d.nueva.pts[1]=p;else if(d.a==='ref')F.ref.pts[d.i]=p;else{const f=F.formas.find(x=>x.id===d.a);if(f){f.pts[d.i]=p;f.sug=false}}efRepinta()});
document.addEventListener('pointerup',()=>{const d=EF.drag;if(!d)return;EF.drag=null;const F=EF.foto;
  if(d.nueva){const [a,b]=d.nueva.pts;if(Math.abs(b[0]-a[0])<.01||Math.abs(b[1]-a[1])<.01){F.formas=F.formas.filter(x=>x!==d.nueva)}else{d.nueva.pts=[[Math.min(a[0],b[0]),Math.min(a[1],b[1])],[Math.max(a[0],b[0]),Math.max(a[1],b[1])]];EF.sel=d.nueva.id;EF.tool=null}}
  persist();efPinta()});
function efFin(){const F=EF.foto,g=EF.tool==='poli'?'poli':'linea';if(EF.cur.length<(g==='poli'?3:2)){toast(g==='poli'?'Marca al menos tres esquinas.':'Marca el inicio y el final.');return}
  const f={id:uid(),tipo:null,geo:g,pts:EF.cur,med:{},mat:null};F.formas.push(f);EF.cur=[];EF.sel=f.id;EF.tool=null;persist();efPinta()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ef]');if(!b||!$('#efov')||$('#efov').hidden)return;const [a,x]=b.dataset.ef.split(':');const F=EF.foto,f=F.formas.find(q=>q.id===EF.sel);
  switch(a){
    case 'cerrar':persist();efCerrar();break;
    case 'tool':EF.tool=EF.tool===x?null:x;EF.cur=[];EF.sel=null;EF.refN=0;efPinta();break;
    case 'fin':efFin();break;
    case 'undo':EF.cur.pop();efPinta();break;
    case 'refok':EF.tool=null;efPinta();break;
    case 'refno':EF.tool=null;F.ref.pts=null;efPinta();break;
    case 'tipo':if(f){f.tipo=x;f.sug=false;const ms=efMats(x);if(f.mat&&!(ms&&ms[f.mat]))f.mat=null;persist();efPinta()}break;
    case 'mat':if(f){f.mat=f.mat===x?null:x;persist();efPinta()}break;
    case 'vin':if(f){f.vinculo=x||null;persist();efPinta()}break;
    case 'ok':if(f){f.sug=false;persist();efPinta()}break;
    case 'okall':F.formas.forEach(q=>q.sug=false);persist();efPinta();break;
    case 'del':if(f){F.formas=F.formas.filter(q=>q!==f);EF.sel=null;persist();efPinta()}break;
    case 'cerrarf':EF.sel=null;efPinta();break;
    case 'guardar':{const sin=F.formas.filter(q=>!q.tipo);if(sin.length){EF.sel=sin[0].id;efPinta();toast('Falta decir qué es lo marcado en rojo.');break}
      F.formas.forEach(q=>q.sug=false);const r=typeof volFoto==='function'?volFoto(EF.est,F):null;persist();if(r)toast(`Dibujado en el croquis: ${r.nuevos} nuevo${r.nuevos===1?'':'s'}${r.actualizados?`, ${r.actualizados} actualizado${r.actualizados===1?'':'s'}`:''}.`);efCerrar();break}}});
document.addEventListener('change',e=>{const t=e.target;if(!$('#efov')||$('#efov').hidden)return;const F=EF.foto;
  if(t.dataset.efr!=null){const v=num(t.value);F.ref.largo=v>0?v:null;persist();efRepinta();return}
  if(t.dataset.efm){const f=F.formas.find(q=>q.id===EF.sel);if(!f)return;const v=t.value.trim()===''?null:num(t.value);f.med=f.med||{};if(v>0||(v===0&&t.dataset.efm==='sobre'))f.med[t.dataset.efm]=v;else delete f.med[t.dataset.efm];f.sug=false;persist();setTimeout(efPinta,0)}});
