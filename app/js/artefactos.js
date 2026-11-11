/* Huincha — artefactos e instalaciones.
   Artefactos por recinto (baño, cocina, logia, clósets), puntos eléctricos (enchufes, interruptores, luminarias,
   tablero), agua caliente y gas. Se proponen solos al reconocer el recinto con la cámara y se ajustan en el paso
   Recintos. Las instalaciones generales (agua potable, alcantarillado o fosa, gas, empalme eléctrico) se preguntan en
   el paso Casa; lo exterior (fosa séptica, pozo absorbente, cámaras) se reconoce al recorrer el patio.
   Todo va a la planta de arquitectura, a la lámina de instalaciones, a la cubicación y a las especificaciones. */
"use strict";
/* u: un (unidades) o ml (metros lineales). w,l: tamaño del símbolo en planta. en: recintos donde se sugiere. */
const ARTF={
  wc:{n:'WC',g:'Sanitarios',w:.4,l:.7,en:['bano'],ab:'WC',muro:1},
  lavamanos:{n:'Lavamanos',g:'Sanitarios',w:.5,l:.42,en:['bano'],ab:'LV',muro:1},
  vanitorio:{n:'Vanitorio',g:'Sanitarios',w:.8,l:.5,en:['bano'],ab:'VT',muro:1},
  ducha:{n:'Ducha',g:'Sanitarios',w:.8,l:.8,en:['bano'],ab:'DU',muro:1},
  tina:{n:'Tina',g:'Sanitarios',w:1.6,l:.7,en:['bano'],ab:'TI',muro:1},
  bidet:{n:'Bidet',g:'Sanitarios',w:.38,l:.55,en:[],ab:'BD',muro:1},
  lavaplatos:{n:'Lavaplatos',g:'Cocina',w:1,l:.5,en:['cocina'],ab:'LP',muro:1},
  cocinaArt:{n:'Cocina o encimera',g:'Cocina',w:.6,l:.6,en:['cocina'],ab:'CO',muro:1},
  horno:{n:'Horno empotrado',g:'Cocina',w:.6,l:.6,en:[],ab:'HO',muro:1},
  campana:{n:'Campana',g:'Cocina',w:.6,l:.4,en:['cocina'],ab:'CA',muro:1},
  refrigerador:{n:'Refrigerador',g:'Cocina',w:.7,l:.7,en:['cocina'],ab:'RF',muro:1},
  muebleBase:{n:'Mueble base de cocina',g:'Cocina',u:'ml',l:.6,en:['cocina'],ab:'MB',muro:1},
  muebleAereo:{n:'Mueble aéreo',g:'Cocina',u:'ml',l:.35,en:['cocina'],ab:'MA',muro:1,soloPlano:0},
  lavadora:{n:'Lavadora',g:'Logia',w:.6,l:.6,en:['logia'],ab:'LA',muro:1},
  lavadero:{n:'Lavadero',g:'Logia',w:.6,l:.5,en:['logia'],ab:'LD',muro:1},
  secadora:{n:'Secadora',g:'Logia',w:.6,l:.6,en:[],ab:'SE',muro:1},
  closet:{n:'Clóset',g:'Muebles',u:'ml',l:.6,en:['dormitorio'],ab:'CL',muro:1},
  enchufe:{n:'Enchufe',g:'Electricidad',el:1,en:['living','cocina','dormitorio','escritorio','logia','bano'],ab:'E'},
  enchufe16:{n:'Enchufe de fuerza (16 A)',g:'Electricidad',el:1,en:['cocina','logia'],ab:'F'},
  interruptor:{n:'Interruptor',g:'Electricidad',el:1,en:Object.keys(TIPOS),ab:'S'},
  luminaria:{n:'Luminaria',g:'Electricidad',el:1,en:Object.keys(TIPOS),ab:'L'},
  tablero:{n:'Tablero eléctrico',g:'Electricidad',el:1,en:[],ab:'TE'},
  timbre:{n:'Timbre o citófono',g:'Electricidad',el:1,en:[],ab:'T'},
  calefont:{n:'Calefont',g:'Agua y gas',w:.4,l:.25,en:[],ab:'CF',muro:1},
  termo:{n:'Termo eléctrico',g:'Agua y gas',w:.5,l:.5,en:[],ab:'TM',muro:1},
  llavePaso:{n:'Llave de paso',g:'Agua y gas',el:1,en:[],ab:'LL'},
  balonGas:{n:'Balón de gas',g:'Agua y gas',w:.4,l:.4,en:[],ab:'GL',muro:1},
  estufa:{n:'Estufa o salamandra',g:'Clima',w:.7,l:.6,en:[],ab:'ES'},
  aire:{n:'Aire acondicionado',g:'Clima',el:1,en:[],ab:'AA'},
  radiador:{n:'Radiador',g:'Clima',w:.8,l:.12,en:[],ab:'RD',muro:1}};
const ART_G=['Sanitarios','Cocina','Logia','Muebles','Electricidad','Agua y gas','Clima'];
/* cantidad típica al reconocer un recinto sin detalle de la IA */
function artTipico(r){const t=r.tipo,a=+r.ancho||3,l=+r.largo||3,per=2*(a+l);const o={};
  if(t==='bano')Object.assign(o,{wc:1,lavamanos:1,ducha:1});if(t==='cocina')Object.assign(o,{lavaplatos:1,cocinaArt:1,campana:1,refrigerador:1,muebleBase:Math.max(1.8,Math.round(Math.max(a,l)*10)/10)});
  if(t==='logia')Object.assign(o,{lavadora:1,lavadero:1});if(t==='dormitorio')o.closet=Math.round(Math.min(a,l)*.6*10)/10;
  if(t!=='pasillo'&&t!=='bodega')o.enchufe=Math.max(1,Math.round(per/3.5));if(t==='cocina')o.enchufe16=1;o.interruptor=1;o.luminaria=a*l>16?2:1;return o}
const artU=k=>ARTF[k]?.u||'un';
const artFmt=(k,v)=>artU(k)==='ml'?fmt(v,1)+' ml':String(v);

/* ---------- editor (paso Recintos y validación en vivo) ---------- */
function artEditHTML(art,tipo,pre){art=art||{};const sug=new Set(Object.keys(ARTF).filter(k=>ARTF[k].en.includes(tipo)));const vis=Object.keys(ARTF).filter(k=>sug.has(k)||art[k]);
  const row=k=>{const v=+art[k]||0,ml=artU(k)==='ml';return`<div class="artr${v?' on':''}"><span>${esc(ARTF[k].n)}</span><span class="artc"><button type="button" class="btn sm ghost" data-art="${pre}:${k}:-" aria-label="Menos ${esc(ARTF[k].n)}">−</button><b>${v?artFmt(k,v):'—'}</b><button type="button" class="btn sm ghost" data-art="${pre}:${k}:+" aria-label="Más ${esc(ARTF[k].n)}">+</button></span></div>`};
  const resto=Object.keys(ARTF).filter(k=>!vis.includes(k));
  return`<div class="artbox">${ART_G.map(g=>{const ks=vis.filter(k=>ARTF[k].g===g);return ks.length?`<div class="artg"><span class="lbl">${g}</span>${ks.map(row).join('')}</div>`:''}).join('')}
    ${resto.length?`<details class="artmas"><summary>Agregar otro artefacto o punto</summary><div class="chips">${resto.map(k=>`<button type="button" class="chip" data-art="${pre}:${k}:+">+ ${esc(ARTF[k].n)}</button>`).join('')}</div></details>`:''}</div>`}
function artCambiar(art,k,d){const ml=artU(k)==='ml',paso=ml?.3:1;let v=(+art[k]||0)+(d==='+'?paso:-paso);v=ml?Math.round(v*10)/10:Math.round(v);if(v<=0)delete art[k];else art[k]=v}
document.addEventListener('click',e=>{const b=e.target.closest('[data-art]');if(!b)return;const [pre,k,d]=b.dataset.art.split(':');
  if(pre==='vr'){const s=VV?.rsug;if(!s)return;s.art=s.art||{};artCambiar(s.art,k,d);vPanel();return}
  const r=room(pre.slice(2));if(!r)return;r.art=r.art||{};artCambiar(r.art,k,d);persist();const y=window.scrollY;render();window.scrollTo(0,y)});

/* ---------- ubicación referencial de los símbolos dentro del recinto ---------- */
function artLayout(r){const out=[];const A=r.art||{};const x0=r.x,y0=r.y,W=r.ancho,L=r.largo;if(!(W>0&&L>0))return out;
  /* muebles y artefactos: a lo largo del muro del fondo, luego derecho e izquierdo */
  const muros=[{a:[x0,y0+L],d:[1,0],n:[0,-1],len:W},{a:[x0+W,y0+L],d:[0,-1],n:[-1,0],len:L},{a:[x0,y0],d:[0,1],n:[1,0],len:L}];let mi=0,pos=.1;
  for(const k of Object.keys(A)){const T=ARTF[k];if(!T||T.el||!T.muro||k==='muebleAereo')continue;const n=artU(k)==='ml'?1:A[k];
    for(let i=0;i<n;i++){let w=artU(k)==='ml'?+A[k]:T.w,l=T.l;let m=muros[mi];if(pos+w>m.len-.05&&mi<muros.length-1){mi++;pos=.1;m=muros[mi]}w=Math.min(w,m.len-.1);
      const c=[m.a[0]+m.d[0]*(pos+w/2)+m.n[0]*l/2,m.a[1]+m.d[1]*(pos+w/2)+m.n[1]*l/2];const rot=Math.atan2(m.d[1],m.d[0]);out.push({k,c,w,l,rot});pos+=w+.08}}
  for(const k of ['estufa'])if(A[k])out.push({k,c:[x0+W/2,y0+L*.3],w:ARTF[k].w,l:ARTF[k].l,rot:0});
  /* puntos eléctricos: luminarias al centro, enchufes repartidos en el perímetro, interruptor junto a la entrada */
  const nl=+A.luminaria||0;for(let i=0;i<nl;i++)out.push({k:'luminaria',c:[x0+W*(i+1)/(nl+1),y0+L/2],el:1});
  const per=2*(W+L),pt=t=>{t=((t%per)+per)%per;if(t<W)return[x0+t,y0+.08];t-=W;if(t<L)return[x0+W-.08,y0+t];t-=L;if(t<W)return[x0+W-t,y0+L-.08];t-=W;return[x0+.08,y0+L-t]};
  const ne=(+A.enchufe||0)+(+A.enchufe16||0);for(let i=0;i<ne;i++)out.push({k:i<(+A.enchufe||0)?'enchufe':'enchufe16',c:pt(per*(i+.5)/ne+W*.3),el:1});
  for(let i=0;i<(+A.interruptor||0);i++)out.push({k:'interruptor',c:[x0+.25+i*.2,y0+.08],el:1});
  for(const k of ['tablero','timbre','llavePaso','aire'])for(let i=0;i<(+A[k]||0);i++)out.push({k,c:pt(per*(.15+i*.1)),el:1});
  return out}
/* símbolos en planta (modo 'arq': artefactos y muebles; 'ins': todo, con instalaciones) */
function artSVG(X,Y,s,modo,fs){let h='';const sw=Math.max(.15,s*.012);
  for(const r of P.recintos.filter(valid))for(const it of artLayout(r)){const T=ARTF[it.k];if(it.el&&modo==='arq')continue;const [cx,cy]=[X(it.c[0]),Y(it.c[1])];
    if(it.el){const rr=Math.max(.9,s*.09);if(it.k==='luminaria')h+=`<g class="asym"><circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(rr*1.2)}" style="fill:#fff;stroke:#1b1e20;stroke-width:${sw}"/><path d="M${r2(cx-rr*.85)},${r2(cy-rr*.85)}L${r2(cx+rr*.85)},${r2(cy+rr*.85)}M${r2(cx+rr*.85)},${r2(cy-rr*.85)}L${r2(cx-rr*.85)},${r2(cy+rr*.85)}" style="stroke:#1b1e20;stroke-width:${sw}"/></g>`;
      else h+=`<g class="asym"><circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(rr)}" style="fill:${it.k==='enchufe16'?'#1b1e20':'#fff'};stroke:#1b1e20;stroke-width:${sw}"/><text x="${r2(cx)}" y="${r2(cy+rr*.42)}" font-size="${r2(rr*1.1)}" text-anchor="middle" class="tx" style="fill:${it.k==='enchufe16'?'#fff':'#1b1e20'}">${T.ab}</text></g>`;continue}
    const w=it.w*s,l=it.l*s,deg=-it.rot*180/Math.PI;
    h+=`<g transform="translate(${r2(cx)} ${r2(cy)}) rotate(${r2(deg)})"><rect x="${r2(-w/2)}" y="${r2(-l/2)}" width="${r2(w)}" height="${r2(l)}" rx="${it.k==='wc'||it.k==='lavamanos'||it.k==='tina'?r2(Math.min(w,l)*.3):0}" style="fill:#fff;stroke:#1b1e20;stroke-width:${sw}${artU(it.k)==='ml'?';stroke-dasharray:'+r2(s*.08)+' '+r2(s*.04):''}"/>${Math.min(w,l)>fs*1.2?`<text x="0" y="${r2(fs*.3)}" font-size="${r2(Math.min(fs*.75,l*.45))}" text-anchor="middle" class="tx">${T.ab}</text>`:''}</g>`}
  return h}
function artLeyendaSVG(x,y,f){const usados=new Set();for(const r of P.recintos)for(const k of Object.keys(r.art||{}))usados.add(k);const L=[...usados].filter(k=>ARTF[k]);
  return L.map((k,i)=>text(x+(i%4)*60,y+Math.floor(i/4)*f*1.9,`${ARTF[k].ab} · ${ARTF[k].n}`,f,'','tx')).join('')}

/* ---------- instalaciones generales (paso Casa) ---------- */
const INSTAL={
  agua:{lab:'Agua potable',opts:{red:'Red pública',apr:'APR (agua rural)',pozo:'Pozo propio',camion:'Camión aljibe'}},
  caneria:{lab:'Cañerías de agua',opts:{cobre:'Cobre',ppr:'PPR (termofusión)',pex:'PEX',pvc:'PVC hidráulico',galv:'Fierro galvanizado'}},
  alcant:{lab:'Aguas servidas',opts:{red:'Alcantarillado público',fosa:'Fosa séptica y pozo absorbente',drenes:'Fosa séptica con drenes',planta:'Planta de tratamiento'}},
  desague:{lab:'Desagües',opts:{pvc:'PVC sanitario',hdpe:'HDPE',fundido:'Fierro fundido',ac:'Asbesto cemento (antiguo)'}},
  caliente:{lab:'Agua caliente',opts:{calefont:'Calefont a gas',termo:'Termo eléctrico',solar:'Colector solar',caldera:'Caldera',ninguna:'No tiene'}},
  gas:{lab:'Gas',opts:{red:'Gas de red',balon45:'Balones de 45 kg',balon15:'Balones de 11–15 kg',ninguno:'Sin gas'}},
  empalme:{lab:'Empalme eléctrico',opts:{mono:'Monofásico',tri:'Trifásico'}},
  potencia:{lab:'Potencia contratada',si:i=>i.empalme,opts:{'3':'Hasta 3 kW','6':'6 kW','10':'10 kW','15':'15 kW o más'}},
  canal:{lab:'Canalización eléctrica',opts:{embutida:'Embutida en muros',sobrepuesta:'Sobrepuesta (canaletas)',mixta:'Mixta'}},
  tierra:{lab:'Puesta a tierra',opts:{si:'Sí',no:'No',nose:'No se sabe'}},
  calefaccion:{lab:'Calefacción',opts:{lena:'Leña',pellet:'Pellet',parafina:'Parafina',gas:'Gas',electrica:'Eléctrica',bomba:'Bomba de calor',ninguna:'Sin calefacción'}}};
function instalHTML(){const I=P.instal=P.instal||{};const ks=Object.entries(INSTAL).filter(([,d])=>!d.si||d.si(I));const falt=ks.filter(([k])=>!I[k]).length;
  return`<div class="card" id="instal"><div class="row sb"><h3>Instalaciones</h3><span class="lbl">${falt?`faltan ${falt}`:'completas ✓'}</span></div><p class="note">Agua, alcantarillado, gas y electricidad de la casa. Los enchufes, luminarias y artefactos se registran en cada recinto; la fosa, el pozo y las cámaras se ubican en el terreno.</p>
    ${ks.map(([k,d])=>`<div class="fld tch"><span>${d.lab}</span><div class="chips">${Object.entries(d.opts).map(([v,l])=>`<button class="chip" data-ins="${k}:${v}" aria-pressed="${I[k]===v}">${l}</button>`).join('')}</div></div>`).join('')}
    ${/fosa|drenes/.test(I.alcant||'')&&!(P.elementos||[]).some(e=>e.t==='fosa')?`<div class="row"><button class="btn sm pri" data-eladd="fosa">+ Ubicar la fosa séptica en el terreno</button>${I.alcant==='fosa'?'<button class="btn sm" data-eladd="pozoAbs">+ Pozo absorbente</button>':''}<button class="btn sm" data-eladd="camaraIns">+ Cámara de inspección</button></div>`:''}</div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ins]');if(!b)return;const [k,v]=b.dataset.ins.split(':');const I=P.instal=P.instal||{};I[k]=I[k]===v?null:v;persist();const y=window.scrollY;render();window.scrollTo(0,y)});
const insVal=k=>{const I=P.instal||{};return I[k]?INSTAL[k].opts[I[k]]:null};

/* ---------- cubicación y especificaciones ---------- */
function artCubica(){const tot={};for(const r of P.recintos.filter(valid))for(const [k,v] of Object.entries(r.art||{}))if(ARTF[k])tot[k]=(tot[k]||0)+(+v||0);
  const rows=[];for(const g of ART_G)for(const k of Object.keys(ARTF))if(ARTF[k].g===g&&tot[k])rows.push([(ARTF[k].el?'Punto eléctrico: ':g==='Sanitarios'?'Artefacto sanitario: ':'')+ARTF[k].n,artU(k),tot[k]]);
  const ptos=['enchufe','enchufe16','interruptor','luminaria'].reduce((t,k)=>t+(tot[k]||0),0);if(ptos)rows.push(['Total de puntos eléctricos (centros)','un',ptos]);
  const san=['wc','lavamanos','vanitorio','ducha','tina','bidet','lavaplatos','lavadora','lavadero'].reduce((t,k)=>t+(tot[k]||0),0);if(san)rows.push(['Puntos de agua y desagüe','un',san]);
  for(const t of ['fosa','pozoAbs','camaraIns','camaraDesg']){const n=(P.elementos||[]).filter(e=>e.t===t&&!e.proy).length;if(n)rows.push([ELT[t].n,'un',n])}
  return rows}
function instalSpec(){const out=[];const I=P.instal||{};
  if(I.agua||I['caneria'])out.push(['Agua potable',[insVal('agua'),insVal('caneria')?'cañerías de '+insVal('caneria').toLowerCase():'',insVal('caliente')?'agua caliente: '+insVal('caliente').toLowerCase():''].filter(Boolean).join(', ')]);
  if(I.alcant||I.desague)out.push(['Aguas servidas',[insVal('alcant'),insVal('desague')?'desagües de '+insVal('desague').toLowerCase():''].filter(Boolean).join(', ')]);
  if(I.gas)out.push(['Gas',insVal('gas')]);
  if(I.empalme||I.canal)out.push(['Electricidad',[insVal('empalme')?'empalme '+insVal('empalme').toLowerCase():'',insVal('potencia')?insVal('potencia').toLowerCase():'',insVal('canal')?'canalización '+insVal('canal').toLowerCase():'',I.tierra==='si'?'con puesta a tierra':I.tierra==='no'?'sin puesta a tierra':''].filter(Boolean).join(', ')]);
  if(I.calefaccion)out.push(['Calefacción',insVal('calefaccion')]);
  return out}
document.addEventListener('click',e=>{const b=e.target.closest('[data-arttip]');if(!b)return;const r=room(b.dataset.arttip);if(!r)return;r.art=artTipico(r);persist();const y=window.scrollY;render();window.scrollTo(0,y);toast('Agregado lo típico: ajusta las cantidades.')});
