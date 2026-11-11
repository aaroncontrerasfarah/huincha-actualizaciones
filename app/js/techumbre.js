/* Huincha — techumbre completa: estructura (cerchas o vigas), costaneras, entablado, bajo cubierta,
   aislación, cielo y hojalatería. Se pregunta al hablar del techo (fotos de fachada, paso Casa) y alimenta
   la cubicación y las especificaciones técnicas. Datos en P.techumbre. */
"use strict";
const TECHU={
  estructura:{lab:'Estructura del techo',ay:'cercha',opts:{cercha:'Cerchas (armaduras)',vigas:'Vigas y cabios',losa:'Losa de hormigón'}},
  cerchaMat:{lab:'Material de las cerchas',si:t=>t.estructura!=='losa',opts:{pino:'Pino dimensionado',impregnado:'Pino impregnado',laminada:'Madera laminada',metalcon:'Acero galvanizado (Metalcon)',acero:'Perfiles de acero'}},
  cerchaTipo:{lab:'Tipo de cercha',si:t=>t.estructura!=='losa'&&t.estructura!=='vigas',opts:{fink:'Fink (en W)',howe:'Howe',pratt:'Pratt',pendolon:'Pendolón (rey)',tijera:'Tijera',mansarda:'Mansarda'}},
  seccion:{lab:'Escuadría o perfil',si:t=>t.estructura!=='losa',opts:t=>/metalcon|acero/.test(t.cerchaMat||'')?{'90CA085':'90CA085','100CA085':'100CA085','150CA085':'150CA085','C100':'Perfil C 100','C150':'Perfil C 150'}:{'2x3':'2×3"','2x4':'2×4"','2x5':'2×5"','2x6':'2×6"','2x8':'2×8"'}},
  sep:{lab:'Separación entre cerchas',si:t=>t.estructura!=='losa',num:'m',opts:{'0.6':'0,60 m','0.9':'0,90 m','1.0':'1,00 m','1.2':'1,20 m'}},
  costMat:{lab:'Costaneras',si:t=>t.estructura!=='losa',opts:{pino2x2:'Pino 2×2"',pino2x3:'Pino 2×3"',omega:'Perfil omega galvanizado',ninguna:'Sin costaneras'}},
  costSep:{lab:'Separación de costaneras',si:t=>t.estructura!=='losa'&&t.costMat&&t.costMat!=='ninguna',num:'m',opts:{'0.3':'0,30 m','0.4':'0,40 m','0.6':'0,60 m','0.9':'0,90 m'}},
  entablado:{lab:'Entablado bajo la cubierta',si:t=>t.estructura!=='losa',opts:{osb:'Placa OSB',terciado:'Terciado estructural',ninguno:'Sin entablado'}},
  bajoCub:{lab:'Bajo cubierta (impermeable)',opts:{fieltro:'Fieltro asfáltico',membrana:'Membrana hidrófuga respirable',ninguna:'Sin bajo cubierta'}},
  aislacion:{lab:'Aislación térmica',opts:{lanaVidrio:'Lana de vidrio',lanaMineral:'Lana mineral',poliestireno:'Poliestireno expandido',poliuretano:'Poliuretano',celulosa:'Celulosa',ninguna:'Sin aislación'}},
  aislEsp:{lab:'Espesor de la aislación',si:t=>t.aislacion&&t.aislacion!=='ninguna',num:'mm',opts:{'50':'50 mm','80':'80 mm','100':'100 mm','120':'120 mm','160':'160 mm','200':'200 mm'}},
  barrera:{lab:'Barrera de vapor',si:t=>t.aislacion&&t.aislacion!=='ninguna',opts:{si:'Sí (polietileno)',no:'No'}},
  canal:{lab:'Canales de agua lluvia',opts:{zinc:'Zinc',pvc:'PVC',cobre:'Cobre',ninguna:'Sin canales'}},
  bajadas:{lab:'Bajadas de agua lluvia',si:t=>t.canal&&t.canal!=='ninguna',opts:{'1':'1','2':'2','3':'3','4':'4','6':'6'}},
  cumbreraRem:{lab:'Remate de cumbrera',opts:{zinc:'Caballete de zinc',ceramica:'Cumbrera de teja',prepintado:'Caballete prepintado',ninguno:'No aplica'}}
};
const techuOpts=(k,t)=>{const o=TECHU[k].opts;return typeof o==='function'?o(t):o};
function techuVal(k){const t=P.techumbre||{};const v=t[k];if(!v)return null;const o=techuOpts(k,t);return o[v]||v}
/* faltantes, para el asistente */
function techuFaltan(){const t=P.techumbre||{};if(P.casa.techo==='plana'&&t.estructura!=='vigas')t.estructura=t.estructura||'losa';
  return Object.entries(TECHU).filter(([k,d])=>(!d.si||d.si(t))&&!t[k]).map(([k])=>k)}
/* bloque de preguntas (pre: dónde se muestra, para redibujar) */
function techuHTML(compacto){const t=P.techumbre=P.techumbre||{};const falt=techuFaltan();
  const filas=Object.entries(TECHU).filter(([,d])=>!d.si||d.si(t)).map(([k,d])=>{const o=techuOpts(k,t);
    return`<div class="fld tch"><span>${d.lab}${k==='estructura'?' '+queEs('cercha'):''}</span><div class="chips">${Object.entries(o).map(([v,l])=>`<button class="chip" data-tch="${k}:${v}" aria-pressed="${String(t[k])===v}">${l}</button>`).join('')}</div></div>`}).join('');
  const cab=`<b>Estructura y capas del techo</b> <span class="lbl">${falt.length?`faltan ${falt.length} datos`:'completa ✓'}</span>`;
  return compacto?`<details class="tchbox"${falt.length?' open':''}><summary>${cab}</summary><p class="vh">Si no se ve, mira por la trampa del entretecho o pregunta al dueño. Puedes dejar en blanco lo que no sepas.</p>${filas}</details>`
    :`<div class="card" id="techumbre"><div class="row sb"><h3>Techumbre</h3><span class="lbl">${falt.length?`faltan ${falt.length}`:'completa ✓'}</span></div><p class="note">Estructura, costaneras, aislación y hojalatería: se usan en la cubicación y las especificaciones. Si no se ve, mira por la trampa del entretecho.</p>${filas}</div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-tch]');if(!b)return;const [k,v]=b.dataset.tch.split(':');const t=P.techumbre=P.techumbre||{};t[k]=String(t[k])===v?null:v;
  if(k==='cerchaMat')t.seccion=null;persist();
  if($('#fov')&&typeof fProyPinta==='function')fProyPinta();else if(typeof VV!=='undefined'&&VV&&$('#vivo'))vPanel();else{const y=window.scrollY;render();window.scrollTo(0,y)}});

/* ---------- cubicación de la techumbre ---------- */
function techuCubica(){const c=P.casa,t=P.techumbre||{},rows=[];const W=+c.ancho||0,L=+c.largo||0,a=+c.alero||0,h=+c.hTecho||0;if(!(W>0&&L>0)||c.techo==='plana')return rows;
  const ri=roofInfo(),par=c.cumbrera==='paralela',dos=c.techo==='dos-aguas';
  if(t.estructura&&t.estructura!=='losa'){const sep=+t.sep||(t.estructura==='vigas'?0.6:0.9);const largoCumbrera=dos?(par?W:L):W,luz=dos?(par?L:W):L;const n=Math.floor(largoCumbrera/sep)+1;
    const S=luz+2*a,sup=dos?2*Math.hypot(S/2,h):Math.hypot(S,h);const webs={fink:1.0,howe:1.1,pratt:1.1,pendolon:.5,tijera:.6,mansarda:1.3}[t.cerchaTipo]||1.0;
    const ml=t.estructura==='vigas'?sup:sup+luz+webs*luz;const mat=techuVal('cerchaMat')||'';const sec=t.seccion?' '+techuVal('seccion'):'';
    rows.push([(t.estructura==='vigas'?'Cabios':'Cerchas')+(t.cerchaTipo&&t.estructura==='cercha'?' tipo '+techuVal('cerchaTipo').toLowerCase():'')+(mat?' de '+mat.toLowerCase():'')+` a ${fmt(sep,2)} m`,'un',n]);
    rows.push([`${t.estructura==='vigas'?'Material para cabios':'Material para cerchas'}${mat?' ('+mat.toLowerCase()+sec+')':''}`,'ml',n*ml]);
    if(t.costMat&&t.costMat!=='ninguna'){const cs=+t.costSep||.6;rows.push([`Costaneras ${techuVal('costMat').toLowerCase()} a ${fmt(cs,2)} m`,'ml',ri.area/cs])}
    if(t.entablado&&t.entablado!=='ninguno')rows.push([techuVal('entablado'),'m²',ri.area*1.05])}
  if(t.bajoCub&&t.bajoCub!=='ninguna')rows.push([`Bajo cubierta: ${techuVal('bajoCub').toLowerCase()} (con traslapos)`,'m²',ri.area*1.12]);
  if(t.aislacion&&t.aislacion!=='ninguna'){rows.push([`Aislación: ${techuVal('aislacion').toLowerCase()}${t.aislEsp?' '+t.aislEsp+' mm':''}`,'m²',W*L]);if(t.barrera==='si')rows.push(['Barrera de vapor (polietileno)','m²',W*L*1.1])}
  if(t.canal&&t.canal!=='ninguna'){rows.push([`Canales de ${techuVal('canal').toLowerCase()}`,'ml',ri.eaves||0]);if(t.bajadas)rows.push(['Bajadas de agua lluvia','un',+t.bajadas])}
  if(dos&&t.cumbreraRem&&t.cumbreraRem!=='ninguno')rows.push([`Remate de cumbrera: ${techuVal('cumbreraRem').toLowerCase()}`,'ml',(par?W:L)+2*a]);
  return rows}
function techuSpec(){const t=P.techumbre||{},out=[];if(!Object.keys(t).length)return out;
  if(t.estructura)out.push(['Estructura de techumbre',[techuVal('estructura'),t.cerchaTipo&&t.estructura==='cercha'?'tipo '+techuVal('cerchaTipo').toLowerCase():'',t.cerchaMat?techuVal('cerchaMat').toLowerCase():'',t.seccion?techuVal('seccion'):'',t.sep?'a '+techuVal('sep'):''].filter(Boolean).join(', ')]);
  if(t.costMat)out.push(['Costaneras',techuVal('costMat')+(t.costSep?', a '+techuVal('costSep'):'')+(t.entablado?'; '+techuVal('entablado').toLowerCase():'')]);
  if(t.bajoCub)out.push(['Bajo cubierta',techuVal('bajoCub')]);
  if(t.aislacion)out.push(['Aislación térmica del techo',techuVal('aislacion')+(t.aislEsp?', '+t.aislEsp+' mm':'')+(t.barrera==='si'?', con barrera de vapor':'')]);
  if(t.canal)out.push(['Hojalatería',t.canal==='ninguna'?'Sin canales':`Canales de ${techuVal('canal').toLowerCase()}${t.bajadas?', '+t.bajadas+' bajada'+(+t.bajadas>1?'s':''):''}${t.cumbreraRem&&t.cumbreraRem!=='ninguno'?', '+techuVal('cumbreraRem').toLowerCase():''}`]);
  return out}
