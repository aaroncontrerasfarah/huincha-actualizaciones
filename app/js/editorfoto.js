/* Huincha — editor de foto de cada estación.
   1. Se marca la referencia (por ejemplo las dos esquinas de abajo del muro, cuyo largo se conoce por el mapa).
   2. La IA propone lo que reconoce (líneas punteadas); se acepta, se corrige o se borra.
   3. Se dibujan recuadros, polígonos o líneas; cada uno con su tipo, material y medidas. La medida escrita manda;
      la calculada con la escala es solo sugerencia, y las medidas raras se marcan en rojo.
   Coordenadas de las formas: 0 a 1 relativas a la imagen (u hacia la derecha, v hacia abajo). */
"use strict";
const EF={est:null,foto:null,tool:null,sel:null,cur:[],drag:null,busy:false};
const EF_TIPOS_POR_ESTACION={
  fachada:['muro','agua','adosada','puerta','ventana','ventanal','porton_garage','piso','terraza','escalera','baranda','pilar','cobertizo','balcon','pilote'],
  frente:['reja','porton','muro','cerco','malla','pilar','medidorAgua','medidorLuz','piso','camino','arbol'],
  objeto:['cobertizo','quincho','bodega','carport','pergola','piscina','terraza','deck','radier','piso','escalera','baranda','pilar','muro','agua','puerta','ventana','pilote','balcon','altillo'],
  fondo:['cerco','muro','reja','malla','arbol','arbusto','bodega','fosa','camaraIns','estanque','piso'],
  libre:['adosada','cobertizo','quincho','bodega','piscina','terraza','deck','radier','piso','escalera','baranda','pilar','reja','porton','cerco','muro','arbol','estanque','pilote','balcon','agua','puerta','ventana']};
/* pasos guiados para la foto de una fachada */
const EF_PASOS_FACHADA=[
  {k:'muro',tool:'muro4',tipo:'muro',t:'Muro',ins:'Toca las 4 esquinas del muro de esta fachada (en cualquier orden). Con el ancho del mapa la app calcula la escala de toda la foto.'},
  {k:'techo',tool:'poli',tipo:'agua',t:'Techo',ins:'Toca, de izquierda a derecha, los puntos del borde del techo: alero, cumbrera y alero (o cada quiebre). Luego «Terminar». Si el techo es plano, toca «No hay».'},
  {k:'ventana',tool:'caja',tipo:'ventana',t:'Ventanas',ins:'Arrastra un recuadro sobre cada ventana. Cuando no queden, toca «Siguiente».'},
  {k:'puerta',tool:'caja',tipo:'puerta',t:'Puertas',ins:'Arrastra un recuadro sobre cada puerta (y portón de garaje). Cuando no queden, toca «Siguiente».'},
  {k:'otros',tool:null,tipo:null,t:'Otros',ins:'¿Hay algo más? Construcción adosada, terraza, escalera, pilar, cobertizo, baranda… Elige una herramienta, márcalo y di qué es. Si no hay, guarda.'}];
const EF_TN={adosada:'Construcción adosada',muro:'Muro',agua:'Agua del techo',puerta:'Puerta',ventana:'Ventana',ventanal:'Ventanal',porton_garage:'Portón de garaje',piso:'Piso'};
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
  EF.blob=blob||null;EF.paso=est.tipo==='fachada'?(EF.foto.formas.some(f=>f.tipo==='muro')?EF_PASOS_FACHADA.length-1:0):null;efAplicarPaso();
  let ov=$('#efov');if(!ov){ov=document.createElement('div');ov.id='efov';ov.className='efov';document.body.appendChild(ov)}ov.hidden=false;efPinta()}
function efAplicarPaso(){const p=EF.paso!=null?EF_PASOS_FACHADA[EF.paso]:null;EF.cur=[];EF.sel=null;if(!p){EF.tipoAuto=null;return}EF.tool=p.tool;EF.tipoAuto=p.tipo}
function efSigPaso(){if(EF.paso==null)return;EF.paso=Math.min(EF_PASOS_FACHADA.length-1,EF.paso+1);efAplicarPaso();efPinta()}
/* la escala sale de las dos esquinas de abajo del muro, de izquierda a derecha */
function efRefDesdeMuro(foto,m){const b=m.pts.slice().sort((a,c)=>c[1]-a[1]).slice(0,2).sort((a,c)=>a[0]-c[0]);foto.ref.pts=b.map(p=>p.slice());if(!(foto.ref.largo>0))foto.ref.largo=efRefDefecto(EF.est)}
/* ordena los puntos de un cuadrilátero alrededor de su centro (para dibujarlo bien aunque se toquen en desorden) */
function efOrdenar(pts){const c=[pts.reduce((s,p)=>s+p[0],0)/pts.length,pts.reduce((s,p)=>s+p[1],0)/pts.length];return pts.slice().sort((a,b)=>Math.atan2(a[1]-c[1],a[0]-c[0])-Math.atan2(b[1]-c[1],b[0]-c[0]))}
function efCerrar(){const ov=$('#efov');if(ov)ov.hidden=true;EF.est=null;if(typeof estPinta==='function')estPinta()}

/* ---------- propuesta de la IA ---------- */
async function efIA(est,foto,blob){if(!blob){try{blob=await (await fetch(phSrc(foto.img))).blob()}catch(e){}}if(!blob||!(await IA.mode())){toast('La IA no está disponible ahora: marca tú los elementos.');return}EF.busy=true;efPinta();
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
  const coh=efCoherencia(F);const cohH=coh.length?`<ul class="efcoh">${coh.map(t=>`<li>⚠ ${esc(t)}</li>`).join('')}</ul>`:'';
  if(EF.paso!=null){const p=EF_PASOS_FACHADA[EF.paso],n=EF_PASOS_FACHADA.length,ult=EF.paso===n-1;
    return`<div class="efpasos">${EF_PASOS_FACHADA.map((q,i)=>`<button class="efpaso${i===EF.paso?' on':''}${i<EF.paso?' ok':''}" data-ef="paso:${i}">${i+1}. ${q.t}</button>`).join('')}</div>
      <p class="vq">Paso ${EF.paso+1} de ${n}: ${p.t}</p><p class="vh">${p.ins}</p>${p.k==='muro'&&EF.cur.length?`<p class="vh">${EF.cur.length} de 4 esquinas.</p>`:''}
      ${p.k==='muro'?`<label class="fld"><span>Ancho del muro${efRefDefecto(EF.est)?' (según el mapa)':''}</span><div class="inp"><input data-efr inputmode="decimal" value="${F.ref.largo>0?String(F.ref.largo).replace('.',','):''}" placeholder="escríbelo"><em>m</em></div></label>`:''}
      <div class="row">${EF.cur.length&&p.k==='techo'?`<button class="btn pri" data-ef="fin">Terminar</button>`:''}${!ult?`<button class="btn${p.k==='ventana'||p.k==='puerta'?' pri':''}" data-ef="sig">Siguiente</button>`:''}${p.k==='techo'||p.k==='ventana'||p.k==='puerta'?`<button class="btn ghost" data-ef="nohay">No hay</button>`:''}${p.k==='muro'?`<button class="btn ghost" data-ef="sig">Saltar</button>`:''}</div>
      ${cohH}${ult?`<div class="row"><button class="btn pri" data-ef="guardar">Guardar y dibujar en el croquis</button></div>`:''}`}
  const nsug=F.formas.filter(x=>x.sug).length,nsin=F.formas.filter(x=>!x.tipo).length;
  return`<p class="vq">${EF.busy?'La IA está mirando la foto…':F.formas.length?'Revisa y completa lo marcado':'Marca lo que se ve'}</p>
    <p class="vh">${EF.tool==='caja'?'Arrastra sobre la foto para encerrar el elemento (puerta, ventana, cobertizo…).':EF.tool==='poli'?`Toca cada esquina en orden (${EF.cur.length}) y luego «Terminar». Sirve para aguas del techo y formas irregulares.`:EF.tool==='linea'?`Toca dónde empieza y dónde termina (pisos, rejas, barandas)${EF.cur.length?' — falta el final':''}.`:'Elige una herramienta y marca sobre la foto. Toca algo marcado para decir qué es, su material y sus medidas.'}</p>
    ${nsug?`<div class="row"><button class="btn sm" data-ef="okall">Aceptar los ${nsug} propuestos por la IA</button></div>`:''}${nsin?`<p class="note warn">${nsin} sin tipo: tócalos y elige qué son.</p>`:''}
    ${cohH}<div class="row"><button class="btn pri" data-ef="guardar">Guardar y dibujar en el croquis</button></div>`}
function efVinculoCandidatos(f){if(!f.tipo||!ELT[f.tipo])return[];const fam={cobertizo:['cobertizo','carport','pergola'],carport:['carport','cobertizo'],terraza:['terraza','deck','radier'],deck:['deck','terraza'],radier:['radier','terraza','estacionamiento','camino'],piso:['radier','ceramico','terraza','deck','camino']}[f.tipo]||[f.tipo];
  return(P.elementos||[]).filter(e=>fam.includes(e.t)).slice(0,6)}
let efPintando=false;function efPinta(){const ov=$('#efov');if(!ov||!EF.foto||efPintando)return;efPintando=true;try{efPinta0(ov)}finally{efPintando=false}}
function efPinta0(ov){const F=EF.foto,src=phSrc(F.img)||'';
  ov.innerHTML=`<div class="efpan"><div class="row sb"><div><span class="lbl">${esc(EF.est.n)}</span></div><button class="btn sm dark" data-ef="cerrar" aria-label="Cerrar">✕</button></div>
    <div class="eftools">${[['ref','📏 Referencia'],['caja','▭ Recuadro'],['poli','⬠ Polígono'],['linea','╱ Línea']].map(([k,l])=>`<button class="btn sm${EF.tool===k?' pri':''}" data-ef="tool:${k}">${l}</button>`).join('')}${EF.cur.length?`<button class="btn sm pri" data-ef="fin">Terminar</button><button class="btn sm ghost" data-ef="undo">Deshacer</button>`:''}<button class="btn sm" data-ef="ia"${EF.busy?' disabled':''}>✨ Ayúdame a marcar</button></div>
    <div class="efwrap"><span class="efimg"><img src="${src}" alt="Foto de ${esc(EF.est.n)}" draggable="false">${efSVG()}</span></div>${efElevSVG(F)}
    <div class="efside">${efPanelHTML()}</div></div>`}

/* ---------- interacción ---------- */
const efUV=e=>{const s=$('#efov svg.efsvg');if(!s)return null;const r=s.getBoundingClientRect();return[Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))]};
const efRepinta=()=>{const s=$('#efov svg.efsvg');if(s)s.outerHTML=efSVG();const e=$('#efov .efelevw');if(e)e.outerHTML=efElevSVG(EF.foto)};
document.addEventListener('pointerdown',e=>{if(!$('#efov')||$('#efov').hidden||!e.target.closest('#efov svg.efsvg'))return;const p=efUV(e);if(!p)return;e.preventDefault();const F=EF.foto;
  const hd=e.target.closest('[data-h]');if(hd){const [a,i]=hd.dataset.h.split(':');EF.drag={a,i:+i};return}
  if(EF.tool==='muro4'){EF.cur.push(p);if(EF.cur.length===4){const m={id:uid(),tipo:'muro',geo:'poli',pts:efOrdenar(EF.cur),med:{},mat:null};F.formas=F.formas.filter(x=>x.tipo!=='muro');F.formas.push(m);efRefDesdeMuro(F,m);persist();efSigPaso()}else efPinta();return}
  if(EF.tool==='caja'){EF.drag={nueva:{id:uid(),tipo:EF.tipoAuto||null,geo:'caja',pts:[p,p.slice()],med:{},mat:null}};F.formas.push(EF.drag.nueva);return}
  if(EF.tool==='ref'){if(!EF.refN||EF.refN>=2){F.ref.pts=[p,p.slice()];EF.refN=1}else{F.ref.pts[1]=p;EF.refN=2}EF.drag={a:'ref',i:1};return}
  if(EF.tool==='poli'||EF.tool==='linea'){EF.cur.push(p);if(EF.tool==='linea'&&EF.cur.length===2)efFin();else efPinta();return}
  const fe=e.target.closest('[data-f]');EF.sel=fe?fe.dataset.f:null;efPinta()});
document.addEventListener('pointermove',e=>{if(!EF.drag)return;const p=efUV(e);if(!p)return;const F=EF.foto,d=EF.drag;
  if(d.nueva)d.nueva.pts[1]=p;else if(d.a==='ref')F.ref.pts[d.i]=p;else{const f=F.formas.find(x=>x.id===d.a);if(f){f.pts[d.i]=p;f.sug=false}}efRepinta()});
document.addEventListener('pointerup',()=>{const d=EF.drag;if(!d)return;EF.drag=null;const F=EF.foto;
  if(d.nueva){const [a,b]=d.nueva.pts;if(Math.abs(b[0]-a[0])<.01||Math.abs(b[1]-a[1])<.01){F.formas=F.formas.filter(x=>x!==d.nueva)}else{d.nueva.pts=[[Math.min(a[0],b[0]),Math.min(a[1],b[1])],[Math.max(a[0],b[0]),Math.max(a[1],b[1])]];if(EF.tipoAuto){EF.sel=null}else{EF.sel=d.nueva.id;EF.tool=null}}}
  persist();efPinta()});
function efFin(){const F=EF.foto,g=EF.tool==='poli'?'poli':'linea';if(EF.cur.length<(g==='poli'?3:2)){toast(g==='poli'?'Marca al menos tres esquinas.':'Marca el inicio y el final.');return}
  const f={id:uid(),tipo:EF.tipoAuto||null,geo:g,pts:EF.cur,med:{},mat:null};F.formas.push(f);EF.cur=[];persist();if(EF.tipoAuto==='agua'){efSigPaso();return}EF.sel=f.id;EF.tool=null;efPinta()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ef]');if(!b||!$('#efov')||$('#efov').hidden)return;const [a,x]=b.dataset.ef.split(':');const F=EF.foto,f=F.formas.find(q=>q.id===EF.sel);
  switch(a){
    case 'cerrar':persist();efCerrar();break;
    case 'tool':EF.tool=EF.tool===x?null:x;EF.cur=[];EF.sel=null;EF.refN=0;EF.tipoAuto=null;if(EF.paso!=null)EF.paso=EF_PASOS_FACHADA.length-1;efPinta();break;
    case 'fin':efFin();break;
    case 'sig':efSigPaso();break;
    case 'nohay':{const p=EF_PASOS_FACHADA[EF.paso];if(p?.k==='techo')F.techoPlano=true;efSigPaso();break}
    case 'paso':EF.paso=+x;efAplicarPaso();efPinta();break;
    case 'ia':efIA(EF.est,F,EF.blob);break;
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

/* ---------- elevación en vivo y coherencia ---------- */
const EF_VANOS=['puerta','ventana','ventanal','porton_garage'];
const efBox=f=>{const us=f.pts.map(p=>p[0]),vs=f.pts.map(p=>p[1]);return[Math.min(...us),Math.min(...vs),Math.max(...us),Math.max(...vs)]};
/* convierte un punto de la foto a metros sobre el muro (x desde la esquina izquierda, y desde el suelo) */
function efMetros(F){const m=F.formas.find(f=>f.tipo==='muro');if(!m)return null;const b=efBox(m);const W=efMed(F,m,'ancho')||F.ref.largo||null,H=efMed(F,m,'alto');if(!(W>0&&H>0))return null;
  return{W,H,b,xy:p=>[(p[0]-b[0])/((b[2]-b[0])||1)*W,(b[3]-p[1])/((b[3]-b[1])||1)*H]}}
function efElevSVG(F){const M=efMetros(F);if(!M)return'<div class="efelevw"><p class="vh">Marca el muro para ver aquí la elevación de esta fachada.</p></div>';
  const {W,H,xy}=M;let top=H,minx=0,maxx=W;const sh=[];
  for(const f of F.formas){if(f.tipo==='muro')continue;const P2=f.pts.map(xy);P2.forEach(p=>{top=Math.max(top,p[1]);minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0])});sh.push([f,P2])}
  const pad=.6,vw=maxx-minx+2*pad,vh=top+2*pad,Y=y=>top+pad-y,X=x=>x-minx+pad,pt=p=>`${X(p[0]).toFixed(2)},${Y(p[1]).toFixed(2)}`;
  let s=`<line x1="0" y1="${Y(0)}" x2="${vw}" y2="${Y(0)}" class="ee-suelo"/><rect x="${X(0)}" y="${Y(H)}" width="${W}" height="${H}" class="ee-muro"/>`;
  for(const [f,P2] of sh){const c=f.tipo==='agua'?'ee-agua':EF_VANOS.includes(f.tipo)?'ee-vano':'ee-otro';
    if(f.geo==='caja'){const x0=Math.min(P2[0][0],P2[1][0]),x1=Math.max(P2[0][0],P2[1][0]),y0=Math.min(P2[0][1],P2[1][1]),y1=Math.max(P2[0][1],P2[1][1]);s+=`<rect x="${X(x0)}" y="${Y(y1)}" width="${x1-x0}" height="${y1-y0}" class="${c}"/>`}
    else s+=`<polyline points="${P2.map(pt).join(' ')}" class="${c}"/>`}
  s+=`<text x="${X(W/2)}" y="${Y(0)+pad*.75}" class="ee-t">${fmt(W,2)} m</text><text x="${X(0)-.15}" y="${Y(H/2)}" class="ee-t v">${fmt(H,2)} m</text>`;
  return`<div class="efelevw"><span class="lbl">Elevación de esta fachada</span><svg class="efelev" viewBox="0 0 ${vw.toFixed(2)} ${vh.toFixed(2)}">${s}</svg></div>`}
function efCoherencia(F){const out=[];const m=F.formas.find(f=>f.tipo==='muro');const mb=m?efBox(m):null;const vs=F.formas.filter(f=>EF_VANOS.includes(f.tipo));
  if(mb)for(const v of vs){const b=efBox(v);if(b[0]<mb[0]-.01||b[2]>mb[2]+.01||b[1]<mb[1]-.01||b[3]>mb[3]+.01)out.push(`${efNom(v.tipo)} fuera del muro: revisa sus esquinas.`)}
  for(let i=0;i<vs.length;i++)for(let j=i+1;j<vs.length;j++){const a=efBox(vs[i]),b=efBox(vs[j]);const ix=Math.min(a[2],b[2])-Math.max(a[0],b[0]),iy=Math.min(a[3],b[3])-Math.max(a[1],b[1]);if(ix>.005&&iy>.005)out.push(`${efNom(vs[i].tipo)} y ${efNom(vs[j].tipo).toLowerCase()} se montan.`)}
  const M=efMetros(F);const ag=F.formas.find(f=>f.tipo==='agua'&&f.pts.length>=3);
  if(M&&ag){const ys=ag.pts.map(p=>M.xy(p)[1]);const h=Math.max(...ys)-M.H;if(h>0){const pend=h/(M.W/2);if(pend>1.2||pend<.05)out.push(`La pendiente del techo da ${Math.round(pend*100)} %: revisa los puntos del techo.`)}}
  if(M&&+P.casa.altura>0&&Math.abs(M.H-P.casa.altura)/P.casa.altura>.3)out.push(`El muro mide ${fmt(M.H,2)} m de alto y la casa tiene ${fmt(+P.casa.altura,2)} m: revisa las esquinas o escribe la altura.`);
  for(const f of F.formas){const a=efAviso(f,efMedidas(F,f));if(a)out.push(a)}
  return out}
