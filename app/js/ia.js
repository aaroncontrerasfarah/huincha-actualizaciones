/* Huincha — análisis de fotos con IA.
   - Vista previa dentro de Claude: capacidad "sample" de la página.
   - App instalada: el servidor de Huincha (window.HUINCHA_IA_URL, ver servidor/huincha-ia.gs), que guarda la clave
     del dueño de la app. El usuario no configura nada. En la fase de pruebas usa el nivel gratuito de Gemini.
   - Opcional: clave propia de la API de Claude guardada en el equipo. */
"use strict";
const IA=(()=>{let ns;const KEY='huincha.iakey',MODEL='claude-sonnet-5-5';
  async function sampleNS(){if(ns!==undefined)return ns;ns=null;try{const s=await window.claude?.use?.('sample');if(s){const lim=await s.limits().catch(()=>null);if(lim&&lim.images)ns=s}}catch(e){ns=null}return ns}
  const key=()=>{try{return localStorage.getItem(KEY)||''}catch(e){return''}};
  function setKey(k){try{k?localStorage.setItem(KEY,k):localStorage.removeItem(KEY)}catch(e){}}
  const srv=()=>String(window.HUINCHA_IA_URL||'').trim();
  async function mode(){if(await sampleNS())return'claude';if(key())return'api';if(srv())return'servidor';return null}
  const keys=cat=>Object.keys(MATS[cat].opts).join(', ');
  function prompt(ctx){return`Eres el asistente de una app chilena de levantamiento de viviendas. Analiza la foto adjunta.
Contexto del levantamiento: ${ctx}
Responde SOLO con un objeto JSON, sin texto adicional, con esta forma:
{"descripcion":"una o dos frases de lo que se ve",
 "elementos":[{"tipo":"puerta|ventana|puerta-ventana|escalera|pilotes|baranda|otro","detalle":"texto breve"}],
 "volumenes":[{"tipo":"domo|segundo|ampliacion|terraza|cobertizo|otro","forma":"circulo|rect","detalle":"qué es y dónde está respecto de la casa"}],
 "materiales":{"revExt":null,"cubierta":null,"ventanas":null,"zocalo":null,"estructura":null},
 "guia":"una instrucción breve (máximo 10 palabras) para que el usuario capture lo que falta, por ejemplo: camina en línea recta hacia el fondo, sube la escalera, abre la puerta, acércate al portón; o null",
 "preguntas":["preguntas concretas que el usuario debe responder en terreno para completar planos y 3D (máximo 4)"]}
Claves válidas para materiales (usa null si no se distingue): revExt: ${keys('revExt')}; cubierta: ${keys('cubierta')}; ventanas: ${keys('ventanas')}; zocalo: ${keys('zocalo')}; estructura: ${keys('estructura')}.
En "volumenes" incluye solo construcciones fuera del contorno rectangular de la casa (domos, segundos pisos o altillos, estructuras sobre pilotes, terrazas, ampliaciones, quinchos).
No inventes medidas. Si estimas una dimensión, dilo como estimación dentro de "detalle". Escribe en español de Chile.`}
  /* Envía la foto y la instrucción a la IA disponible y devuelve el objeto JSON de la respuesta */
  async function ask(blob,txt,max){const m=await mode();if(!m)throw Object.assign(new Error('Sin IA configurada'),{code:'sin-ia'});
    if(m==='claude'){const s=await sampleNS();return await s.json(txt,{images:[blob],modelTier:'default'})}
    const b64=await Store.toB64(blob);let t;
    if(m==='servidor'){let r;try{r=await fetch(srv(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({app:'huincha',prompt:txt,imagen:b64,mime:blob.type||'image/jpeg'})})}catch(e){throw Object.assign(new Error('Sin conexión'),{code:'red'})}
      if(!r.ok)throw Object.assign(new Error('El servidor respondió '+r.status),{code:'api'});const j=await r.json();
      if(j.error)throw Object.assign(new Error(j.error),{code:j.codigo===429?'cuota':'api'});t=String(j.texto||'')}
    else{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:MODEL,max_tokens:max,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:blob.type||'image/jpeg',data:b64}},{type:'text',text:txt}]}]})});
      if(!r.ok)throw Object.assign(new Error('La API respondió '+r.status),{code:r.status===401?'clave':r.status===429?'cuota':'api'});
      const j=await r.json();t=(j.content||[]).map(c=>c.text||'').join('')}
    const mm=t.match(/\{[\s\S]*\}/);try{return JSON.parse(mm?mm[0]:t)}catch(e){throw Object.assign(new Error('Respuesta no válida'),{code:'api'})}}
  /* Prueba rápida de la conexión con una imagen pequeña */
  async function test(){const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');g.fillStyle='#3E9CC4';g.fillRect(0,0,64,64);
    const b=await new Promise(r=>cv.toBlob(r,'image/jpeg',.9));const t0=performance.now();const o=await ask(b,'Responde SOLO con JSON: {"ok":true,"color":"nombre del color de la imagen en español"}',100);return{color:o.color||'?',ms:Math.round(performance.now()-t0)}}
  async function analyze(blob,ctx){return clean(await ask(blob,prompt(ctx),1500))}
  function clean(o){o=o||{};const mat={};for(const [k,v] of Object.entries(o.materiales||{}))if(v&&MATS[k]?.opts[v])mat[k]=v;
    return{descripcion:String(o.descripcion||''),elementos:Array.isArray(o.elementos)?o.elementos.slice(0,12):[],volumenes:(Array.isArray(o.volumenes)?o.volumenes:[]).filter(v=>VOLT[v.tipo]).slice(0,4),materiales:mat,preguntas:(Array.isArray(o.preguntas)?o.preguntas:[]).map(String).filter(Boolean).slice(0,4)}}
  /* Reconocimiento de elementos en un cuadro del recorrido en vivo.
     Devuelve dónde toca el suelo cada elemento (x, y de 0 a 1 en la imagen) y medidas estimadas. */
  function promptDet(ctx){const tipos=Object.entries(ELT).map(([k,t])=>`${k} (${t.n})`).join(', ');
    return`Eres el asistente de una app chilena que levanta planos de casas y terrenos mientras el usuario camina con la cámara.
Contexto: ${ctx}
Actúa como un arquitecto o constructor con experiencia en viviendas chilenas (urbanas, de condominio y parcelas rurales).
Primero entiende de qué terreno se trata (tipo de propiedad, pendiente, cómo se organiza la casa y el patio). Luego reconoce por su forma, material y función TODOS los elementos constructivos y de paisaje que deben ir en el plano: cierres y portones, caminos de acceso, estacionamientos, radieres y pisos exteriores, terrazas, escaleras, rampas, barandas, pilares, muros de contención, construcciones, ampliaciones, cobertizos, piscinas, jardineras y vegetación.
Ignora siempre lo que no es parte de la construcción ni del terreno: autos, bicicletas, personas, animales, muebles sueltos, herramientas, basura, ropa tendida u objetos temporales.
Responde SOLO con JSON, sin texto adicional:
{"escena":{"terreno":"tipo de terreno en pocas palabras","pendiente":"plano|suave|fuerte","resumen":"una frase con lo esencial del lugar"},
 "objetos":[{"tipo":"clave","alt":["otra clave posible"],"nombre":null,"caja":[0.3,0.4,0.7,0.9],"x":0.5,"y":0.8,"dist":4.5,"ancho":3,"largo":2,"alto":1.8,"material":"clave de material o null","forma":"rect|L|circulo|libre","pisos":1,"techo":"plano|una_agua|dos_aguas","conf":0.8,"detalle":"material y estado, breve"}],
 "preguntas":["máximo 2 preguntas breves al usuario sobre lo que no se puede saber por la foto y hace falta para el plano"],
 "vanos":[{"tipo":"puerta|ventana","x":0.4,"y":0.9,"ancho":0.9,"alto":2.0}],
 "piso":null}
Claves válidas para "tipo" en objetos: ${tipos}.
- "x","y": posición en la imagen (0 = izquierda/arriba, 1 = derecha/abajo) del punto donde el elemento toca el suelo, en su centro. Para cierres (reja, portón, cerco, muro, malla) da el centro del tramo visible y en "ancho" su largo.
- "dist": distancia estimada en metros desde la cámara hasta ese punto. "ancho" y "largo": medidas en planta estimadas; "alto": altura estimada.
- Si un elemento constructivo no calza con ninguna clave (por ejemplo horno de barro, leñera, gallinero, pozo, fogón, muro de contención, canaleta), usa "otro" y pon en "nombre" cómo se llama, en dos o tres palabras.
- Instalaciones exteriores: tapas cuadradas de 60 cm de hormigón o fierro en el suelo son cámaras de inspección (camaraIns); una loseta o tapa grande de hormigón en el patio puede ser la fosa séptica (fosa) o el pozo absorbente (pozoAbs); el medidor de agua en un nicho junto a la reja es medidorAgua; el medidor eléctrico en poste o pilastra es medidorLuz; el nicho de gas o los balones son medidorGas.
- "alt": otras claves que también podrían ser (por ejemplo cobertizo o carport), solo si dudas; si no, [].
- Estima las medidas comparando con referencias conocidas: puertas de 2 m de alto, bloques o ladrillos, paños de reja de 2 a 2,5 m, peldaños de 18 cm.
- "caja": rectángulo que encierra el elemento en la imagen [x0,y0,x1,y1] de 0 a 1.
- Las construcciones (la casa, una ampliación, un segundo piso, una pieza o bodega de material sólido) van con tipo "edificacion": pon en "nombre" qué es (casa principal, ampliación, segundo piso, pieza exterior…), en "forma" su planta aproximada (rect, L, circulo o libre si es irregular), "pisos" y "techo". Dibuja la casa apenas la veas, aunque solo se vea una fachada.
- "material": para portón, reja, cerco y malla: ${Object.keys(MATOPC.cierre).join(', ')}; para muro: ${Object.keys(MATOPC.muro).join(', ')}; para edificacion: ${Object.keys(MATOPC.edif).join(', ')}; para quincho, cobertizo, carport, pérgola, bodega o galpón: ${Object.keys(MATOPC.liviana).join(', ')}; si no se distingue, null.
- "vanos": puertas y ventanas en los muros de la casa (no portones de rejas).
- "piso": si se ve el piso de un recinto interior, una de estas claves: ${Object.keys(MATS.piso.opts).join(', ')}; si no, null.
- Incluye como máximo 8 objetos, solo los que se distinguen con claridad, y "conf" entre 0 y 1. No incluyas personas, autos ni muebles sueltos.
Escribe "detalle" en español de Chile.`}
  async function detect(blob,ctx){const o=await ask(blob,promptDet(ctx),1200);
    const n01=v=>Math.max(0,Math.min(1,+v||0)),pos=v=>+v>0?+v:null;
    const es=o?.escena&&typeof o.escena==='object'?{terreno:String(o.escena.terreno||''),pendiente:String(o.escena.pendiente||''),resumen:String(o.escena.resumen||'')}:null;
    const pq=(Array.isArray(o?.preguntas)?o.preguntas:[]).map(String).filter(Boolean).slice(0,2);
    return{escena:es,preguntas:pq,guia:o?.guia?String(o.guia).slice(0,90):null,objetos:(Array.isArray(o?.objetos)?o.objetos:[]).filter(x=>ELT[x.tipo]).slice(0,8).map(x=>({tipo:x.tipo,alt:(Array.isArray(x.alt)?x.alt:[]).filter(k=>ELT[k]&&k!==x.tipo).slice(0,3),nombre:x.tipo==='otro'&&x.nombre?String(x.nombre).slice(0,40):null,x:n01(x.x??.5),y:n01(x.y??.8),dist:pos(x.dist),ancho:pos(x.ancho),largo:pos(x.largo),alto:pos(x.alto),conf:Math.max(0,Math.min(1,+x.conf||.5)),detalle:String(x.detalle||''),
      caja:Array.isArray(x.caja)&&x.caja.length===4?x.caja.map(n01):null,material:(MATOPC[MATGRP[x.tipo]]||{})[x.material]?x.material:null,
      forma:FORMAS[x.forma]?x.forma:null,pisos:Math.max(1,Math.min(4,Math.round(+x.pisos||1))),techo:TECHOS[x.techo]?x.techo:null,
      nombreE:x.tipo==='edificacion'&&x.nombre?String(x.nombre).slice(0,40):null})),
      vanos:(Array.isArray(o?.vanos)?o.vanos:[]).filter(v=>v.tipo==='puerta'||v.tipo==='ventana').slice(0,6).map(v=>({tipo:v.tipo,x:n01(v.x??.5),y:n01(v.y??.9),ancho:pos(v.ancho),alto:pos(v.alto)})),
      piso:MATS.piso.opts[o?.piso]?o.piso:null}}
  return{mode,analyze,detect,test,ask,key,setKey}})();

/* Contexto breve del proyecto para la IA */
function iaContexto(extra=''){const c=P.casa;return[`casa ${c.ancho>0?fmt(c.ancho)+' × '+fmt(c.largo)+' m':'sin medidas aún'}`,`${P.recintos.length} recintos`,(P.volumenes||[]).length?'volúmenes: '+P.volumenes.map(v=>v.nombre).join(', '):'',extra].filter(Boolean).join('; ')}
/* Resultado del análisis, con acciones para aplicar lo detectado */
function iaResultHTML(r){const M=P.mat;return`<div class="iares"><p><b>La IA ve:</b> ${esc(r.descripcion||'—')}</p>
  ${r.elementos.length?`<div class="chips">${r.elementos.map(e=>`<span class="chip">${esc(e.tipo)}${e.detalle?' · '+esc(e.detalle):''}</span>`).join('')}</div>`:''}
  ${r.volumenes.length?`<div class="fld"><span>Fuera del contorno</span>${r.volumenes.map(v=>`<div class="row sb"><span>${esc(VOLT[v.tipo].n)}${v.detalle?' — '+esc(v.detalle):''}</span><button class="btn sm pri" data-iavol="${v.tipo}:${v.forma==='circulo'?'circulo':'rect'}">Agregar</button></div>`).join('')}</div>`:''}
  ${Object.keys(r.materiales).length?`<div class="fld"><span>Materiales sugeridos</span>${Object.entries(r.materiales).map(([k,v])=>`<div class="row sb"><span>${esc(MATS[k].lab)}: ${esc(mn(k,v))}</span>${M[k]===v?'<span class="lbl">Ya elegido</span>':`<button class="btn sm" data-iamat="${k}:${v}">Aplicar</button>`}</div>`).join('')}</div>`:''}
  ${r.preguntas.length?`<div class="fld"><span>Preguntas para completar</span><ul class="iaq">${r.preguntas.map(q=>`<li>${esc(q)}</li>`).join('')}</ul><small>Quedan anotadas en el asistente.</small></div>`:''}</div>`}
function iaGuardarPreguntas(r,step){for(const q of r.preguntas){if((P.iaPreg||[]).some(x=>x.texto===q))continue;(P.iaPreg=P.iaPreg||[]).push({id:'ia-'+Math.random().toString(36).slice(2,8),texto:q,step:step??1})}persist()}
function iaErrorMsg(e){return e?.code==='sin-ia'?'La IA todavía no está conectada en esta versión de la app.':e?.code==='cuota'?'Se alcanzó el límite gratuito de la IA por ahora. Espera un minuto y vuelve a intentar.':e?.code==='red'?'No hay conexión a internet para usar la IA.':e?.code==='clave'?'La clave de API no es válida. Revísala en el paso Proyecto.':'No se pudo analizar la foto. Revisa la conexión e inténtalo de nuevo.'}
/* Acciones comunes de los resultados */
document.addEventListener('click',e=>{const b=e.target.closest('[data-iamat],[data-iavol]');if(!b)return;const d=b.dataset;
  if(d.iamat){const i=d.iamat.indexOf(':');P.mat[d.iamat.slice(0,i)]=d.iamat.slice(i+1);persist();b.outerHTML='<span class="lbl">Aplicado</span>';toast('Material aplicado.');return}
  if(d.iavol){const [tipo,forma]=d.iavol.split(':');if(document.getElementById('vivo')&&typeof vivoStartVol==='function'){vivoStartVol(tipo,forma);return}
    const v=volBlank(tipo);v.forma=forma;v.origen='ia';(P.volumenes=P.volumenes||[]).push(v);UI.vol=v.id;persist();document.getElementById('lb').hidden=true;goStep(3);toast(`${v.nombre} agregado. El asistente te preguntará sus medidas.`)}});
