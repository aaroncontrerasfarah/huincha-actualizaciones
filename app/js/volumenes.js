/* Huincha — volúmenes especiales fuera del contorno de la casa:
   domo, segundo piso / altillo sobre pilotes, ampliación, terraza, cobertizo u otro.
   Cada volumen se ubica respecto de un muro de la casa (lado), centrado en un recinto o a una distancia dada. */
"use strict";
const VOLT={
  domo:{n:'Domo',forma:'circulo',icon:'◠'},
  segundo:{n:'Segundo piso / altillo',forma:'rect',icon:'▭'},
  ampliacion:{n:'Ampliación',forma:'rect',icon:'▭'},
  terraza:{n:'Terraza',forma:'rect',icon:'▱'},
  cobertizo:{n:'Cobertizo / quincho',forma:'rect',icon:'⌂'},
  otro:{n:'Otro volumen',forma:'rect',icon:'▢'}
};
const VLADO={posterior:'Atrás',izquierdo:'Izquierda',derecho:'Derecha',frontal:'Adelante'};
const VAPOYO={pilotes:'Sobre pilotes',suelo:'Directo en el suelo',voladizo:'En voladizo'};
const VACCESO={pasarela:'Pasarela o rampa',escalera:'Escalera',puerta:'Puerta directa'};
const VCUB={lona:{n:'Lona / PVC',col:'#F1F0EA'},policarbonato:{n:'Policarbonato',col:'#CFE3EA'},madera:{n:'Madera / tejuela',col:'#8C6A48'},igual:{n:'Igual que la casa',col:''}};
function volBlank(tipo='otro'){return{id:'v'+Math.random().toString(36).slice(2,8),tipo,nombre:VOLT[tipo]?.n||'Volumen',forma:VOLT[tipo]?.forma||'rect',lado:'posterior',desde:null,off:null,sep:0,
  diam:null,ancho:null,largo:null,altura:null,nivel:null,apoyo:null,nPil:null,acceso:null,cubierta:tipo==='domo'?null:'igual',origen:'manual'}}

/* Geometría en planta (coordenadas de la casa: x a la derecha, y hacia el fondo) */
function volGeom(v){const c=P.casa,W=+c.ancho||0,L=+c.largo||0;if(!(W>0&&L>0))return null;const circ=v.forma==='circulo';
  const along=circ?(+v.diam||0):(+v.ancho||0),out=circ?(+v.diam||0):(+v.largo||0);if(!(along>0&&out>0))return null;
  const r=room(v.desde),sep=Math.max(0,+v.sep||0),side=v.lado||'posterior',hz=side==='posterior'||side==='frontal';
  let off=valid(r)?(hz?r.x+r.ancho/2:r.y+r.largo/2):(v.off!=null&&v.off!==''?+v.off:(hz?W/2:L/2));
  let cx,cy,w,h;if(side==='posterior'){cx=off;cy=L+sep+out/2;w=along;h=out}else if(side==='frontal'){cx=off;cy=-sep-out/2;w=along;h=out}
  else if(side==='izquierdo'){cx=-sep-out/2;cy=off;w=out;h=along}else{cx=W+sep+out/2;cy=off;w=out;h=along}
  const nivel=Math.max(0,+v.nivel||0),alt=Math.max(0,+v.altura||0);
  /* pasarela: franja de 1 m entre el muro y el volumen */
  let bridge=null;if(v.acceso==='pasarela'&&sep>0.05){if(side==='posterior')bridge={x0:off-.5,x1:off+.5,y0:L,y1:L+sep+(circ?.25:0)};else if(side==='frontal')bridge={x0:off-.5,x1:off+.5,y0:-sep-(circ?.25:0),y1:0};
    else if(side==='izquierdo')bridge={x0:-sep-(circ?.25:0),x1:0,y0:off-.5,y1:off+.5};else bridge={x0:W,x1:W+sep+(circ?.25:0),y0:off-.5,y1:off+.5}}
  return{cx,cy,w,h,x0:cx-w/2,x1:cx+w/2,y0:cy-h/2,y1:cy+h/2,circ,r:circ?along/2:0,nivel,alt,sep,off,side,bridge,v}}
function volPilotes(g){const n=Math.max(0,Math.round(+g.v.nPil||0));if(g.v.apoyo!=='pilotes'||!n)return[];const out=[];
  if(g.circ){const k=n>6?n-1:n;for(let i=0;i<k;i++){const a=i/k*Math.PI*2+Math.PI/k;out.push([g.cx+Math.cos(a)*g.r*.78,g.cy+Math.sin(a)*g.r*.78])}if(n>6)out.push([g.cx,g.cy])}
  else{const ins=.15,xs=[g.x0+ins,g.x1-ins],ys=[g.y0+ins,g.y1-ins];const pts=[[xs[0],ys[0]],[xs[1],ys[0]],[xs[1],ys[1]],[xs[0],ys[1]]];
    for(let k=4;k<n;k++){const i=k-4,long=g.w>=g.h,t=(Math.floor(i/2)+1)/(Math.ceil((n-4)/2)+1);pts.push(long?[xs[0]+(xs[1]-xs[0])*t,i%2?ys[1]:ys[0]]:[i%2?xs[1]:xs[0],ys[0]+(ys[1]-ys[0])*t])}
    out.push(...pts.slice(0,Math.max(n,0)))}
  return out}
const vols=()=>(P.volumenes||[]).map(volGeom).filter(Boolean);
/* Caja que contiene la casa y sus volúmenes, en coordenadas de la casa */
function houseVolBox(){const c=P.casa,b={x0:0,x1:+c.ancho||0,y0:0,y1:+c.largo||0};for(const g of vols()){b.x0=Math.min(b.x0,g.x0);b.x1=Math.max(b.x1,g.x1);b.y0=Math.min(b.y0,g.y0);b.y1=Math.max(b.y1,g.y1)}b.w=b.x1-b.x0;b.h=b.y1-b.y0;return b}
const volLabel=g=>`${g.v.nombre.toUpperCase()}`;
const volSub=g=>`${g.circ?'Ø '+fmt(g.r*2):fmt(g.circ?0:+g.v.ancho)+' × '+fmt(+g.v.largo)} · NPT +${fmt(g.nivel)}`;

/* ---------- dibujo 2D ---------- */
function volPlanSVG(X,Y,s,fs,sheet){let h='';for(const g of vols()){const el=g.nivel>0.3;
    if(g.bridge){const b=g.bridge;h+=rect(X(b.x0),Y(b.y1),(b.x1-b.x0)*s,(b.y1-b.y0)*s,'vbr')}
    h+=g.circ?`<circle class="vol${el?' up':''}" cx="${r2(X(g.cx))}" cy="${r2(Y(g.cy))}" r="${r2(g.r*s)}"/>`:rect(X(g.x0),Y(g.y1),g.w*s,g.h*s,'vol'+(el?' up':''));
    if(g.circ&&g.v.tipo==='domo')for(let k=0;k<3;k++)h+=`<circle class="vin" cx="${r2(X(g.cx))}" cy="${r2(Y(g.cy))}" r="${r2(g.r*s*(k+1)/4)}"/>`;
    for(const [px,py] of volPilotes(g))h+=rect(X(px)-.1*s,Y(py)-.1*s,.2*s,.2*s,'pil');
    const f=Math.min(fs,(g.w*s*.8)/(Math.max(g.v.nombre.length,4)*.55));h+=text(X(g.cx),Y(g.cy)-f*.1,volLabel(g),f,'text-anchor="middle" font-weight="700"','tx'+(sheet?' halo':''))+text(X(g.cx),Y(g.cy)+f*1.05,volSub(g),f*.72,'text-anchor="middle"','tx tm mono'+(sheet?' halo':''))}
  return h}
/* Extensión horizontal y altura de los volúmenes vistos en una elevación (u: coordenada horizontal de la elevación) */
function elevAxis(side){const c=P.casa,W=c.ancho,L=c.largo;return{frontal:{al:'x',u:x=>x},posterior:{al:'x',u:x=>W-x},izquierda:{al:'y',u:y=>L-y},derecha:{al:'y',u:y=>y}}[side]}
function volElevRange(side){const E=elevAxis(side);let lo=Infinity,hi=-Infinity,zt=0;for(const g of vols()){const a=E.al==='x'?[g.x0,g.x1]:[g.y0,g.y1];const u=a.map(E.u);lo=Math.min(lo,...u);hi=Math.max(hi,...u);zt=Math.max(zt,g.nivel+(g.v.tipo==='terraza'?1:g.alt)+.2)}return{lo,hi,zt}}
function volElevSVG(side,U,Z,s,front){const E=elevAxis(side);const near={frontal:'frontal',posterior:'posterior',izquierda:'izquierdo',derecha:'derecho'}[side];let h='';
  for(const g of vols()){if((g.side===near)!==front)continue;const cp=E.al==='x'?g.cx:g.cy,hw=(E.al==='x'?g.w:g.h)/2,u0=U(cp-hw),u1=U(cp+hw),xa=Math.min(u0,u1),xb=Math.max(u0,u1);
    for(const [px,py] of volPilotes(g)){const u=U(E.al==='x'?px:py);h+=line(u,Z(0),u,Z(g.nivel),'bold')}
    if(g.nivel>0.05||g.v.tipo==='terraza')h+=rect(xa,Z(g.nivel),xb-xa,.15*s,'vdeck');
    if(g.v.tipo==='terraza'||g.nivel>0.4)h+=line(xa,Z(g.nivel+.95),xb,Z(g.nivel+.95),'th')+line(xa,Z(g.nivel),xa,Z(g.nivel+.95),'th')+line(xb,Z(g.nivel),xb,Z(g.nivel+.95),'th');
    if(g.circ&&g.alt>0){const rx=(xb-xa)/2,ry=g.alt*s;h+=`<path class="vfac" d="M${r2(xa)},${r2(Z(g.nivel))} A${r2(rx)},${r2(ry)} 0 0 1 ${r2(xb)},${r2(Z(g.nivel))} Z"/>`;
      for(const t of [.35,.7])h+=`<path class="th" d="M${r2(xa+rx*(1-Math.sqrt(1-t*t)))},${r2(Z(g.nivel+g.alt*t))} L${r2(xb-rx*(1-Math.sqrt(1-t*t)))},${r2(Z(g.nivel+g.alt*t))}"/>`}
    else if(g.v.tipo!=='terraza'&&g.alt>0){h+=rect(xa,Z(g.nivel+g.alt),xb-xa,g.alt*s,'vfac');h+=rect(xa-.2*s,Z(g.nivel+g.alt+.2),xb-xa+.4*s,.2*s,'roofE')}
    if(g.bridge&&g.nivel>0.05&&(E.al==='x'?(g.side==='izquierdo'||g.side==='derecho'):(g.side==='posterior'||g.side==='frontal'))){const b=g.bridge,a0=E.al==='x'?b.x0:b.y0,a1=E.al==='x'?b.x1:b.y1;const wallU=E.al==='x'?(g.side==='izquierdo'?0:P.casa.ancho):(g.side==='frontal'?0:P.casa.largo);
      const far=Math.abs(a0-wallU)<Math.abs(a1-wallU)?a1:a0;h+=line(U(wallU),Z(0),U(far),Z(g.nivel),'bold')}
    h+=text((xa+xb)/2,Z(g.nivel+(g.alt||1)/2)+1,g.v.nombre.toUpperCase(),2,'text-anchor="middle" font-weight="700"','tx tm')}
  return h}
function volSiteSVG(X,Y,s,hx,hy){let h='';for(const g of vols()){h+=g.circ?`<circle class="dash" cx="${r2(X(hx+g.cx))}" cy="${r2(Y(hy+g.cy))}" r="${r2(g.r*s)}"/>`:rect(X(hx+g.x0),Y(hy+g.y1),g.w*s,g.h*s,'dash')}return h}

/* ---------- asistente ---------- */
function volCH(need,rev){const R=P.recintos.filter(valid);
  for(const v of P.volumenes||[]){const n=v.nombre||'el volumen',b={step:3,vol:v.id};
    if(v.forma==='circulo')need(v.diam>0,{...b,msg:`¿Cuánto mide ${n} de diámetro?`,hint:'De borde a borde, pasando por el centro. Si no puedes cruzarlo, mide el contorno y divídelo por 3,14.',field:'vo-diam'});
    else{need(v.ancho>0,{...b,msg:`¿Cuánto mide ${n} a lo ancho, paralelo al muro de la casa?`,hint:'Mide por fuera, de esquina a esquina.',field:'vo-ancho'});need(v.largo>0,{...b,msg:`¿Cuánto sobresale ${n} hacia afuera?`,hint:'Desde el muro de la casa (o desde su borde más cercano) hasta su borde más lejano.',field:'vo-largo'})}
    need(v.nivel!=null&&v.nivel!=='',{...b,msg:`¿A qué altura está el piso de ${n} respecto del piso de la casa?`,hint:'Escribe 0 si está al mismo nivel. Si está más alto, sobre pilotes, mide desde el piso de la casa hasta su piso.',field:'vo-nivel'});
    if(v.tipo!=='terraza')need(v.altura>0,{...b,msg:v.forma==='circulo'?`¿Qué altura tiene ${n} en su punto más alto, medido desde su piso?`:`¿Qué altura interior tiene ${n}?`,hint:'Si no puedes medirla, estímala con una foto lateral.',field:'vo-altura'});
    need(v.apoyo,{...b,msg:`¿Cómo se sostiene ${n}?`,hint:'Sobre pilotes, apoyado directo en el suelo o en voladizo desde la casa.',field:'vo-apoyo'});
    if(v.apoyo==='pilotes')need(v.nPil>0,{...b,msg:`¿Cuántos pilotes tiene ${n}?`,hint:'Cuenta los apoyos que llegan al suelo.',field:'vo-nPil'});
    if(R.length)need(v.desde||v.off!=null,{...b,msg:`¿Desde qué recinto se llega a ${n}?`,hint:'Así la app lo ubica frente a ese recinto. Si no se conecta con la casa, indica la distancia desde la esquina.',field:'vo-desde'});
    need(v.acceso,{...b,msg:`¿Cómo se llega a ${n}?`,hint:'Por una pasarela o rampa, por una escalera o por una puerta directa desde la casa.',field:'vo-acceso'});
    if(v.tipo==='domo')need(v.cubierta,{...b,msg:`¿De qué es la cubierta de ${n}?`,hint:'Lona o PVC, policarbonato, madera o igual que el techo de la casa.',field:'vo-cubierta'});
    if(v.acceso==='pasarela'&&!(+v.sep>0))rev(false,{id:'sep-'+v.id,...b,msg:`¿Qué largo tiene la pasarela hasta ${n}?`,hint:'Es la distancia entre el muro de la casa y el borde del volumen. Si está pegado a la casa, confirma.',field:'vo-sep'})}
  if(P.casa.ancho>0&&P.casa.largo>0&&!(P.volumenes||[]).length)rev(false,{id:'vol-check',step:3,msg:'¿La casa tiene algo fuera de su contorno?',hint:'Por ejemplo un domo, una terraza, un segundo piso o altillo sobre pilotes, una ampliación o un quincho. Si no hay nada, confirma.',field:'vols'})}

/* ---------- paso Casa: tarjeta de volúmenes ---------- */
function volCardHTML(){const L=P.volumenes||[];if(!L.find(x=>x.id===UI.vol))UI.vol=L[0]?.id||null;const v=L.find(x=>x.id===UI.vol);
  const segV=(f,opts)=>`<div class="seg" id="vo-${f}" tabindex="-1">${Object.entries(opts).map(([k,n])=>`<button class="btn sm" type="button" data-vf="${f}:${k}" aria-pressed="${v[f]===k}">${n.n||n}</button>`).join('')}</div>`;
  const nv=(lab,f,unit='m',hint='')=>`<label class="fld"><span>${lab}</span><div class="inp"><input id="vo-${f}" data-volf="${f}" data-num inputmode="decimal" value="${v[f]!=null&&v[f]!==''?String(v[f]).replace('.',','):''}" placeholder="${f==='nivel'||f==='sep'?'0':'0,00'}" autocomplete="off"><em>${unit}</em></div>${hint?`<small>${hint}</small>`:''}</label>`;
  return`<div class="card" id="vols" tabindex="-1"><div class="row sb"><h3>Volúmenes especiales</h3><span class="lbl">${L.length?L.length+' registrado'+(L.length>1?'s':''):'Fuera del contorno de la casa'}</span></div>
   <p class="note">Domos, segundos pisos o altillos sobre pilotes, terrazas, ampliaciones o quinchos. Se dibujan en planta, elevaciones y 3D.</p>
   <div class="chips">${Object.entries(VOLT).map(([k,t])=>`<button class="chip" type="button" data-addvol="${k}">+ ${t.n}</button>`).join('')}</div>
   ${L.length?`<div class="chips">${L.map(x=>`<button class="chip" type="button" data-selvol="${x.id}" aria-pressed="${x.id===UI.vol}"><span class="w ${volGeom(x)&&x.apoyo&&x.acceso?'ok':''}"></span>${esc(x.nombre)}</button>`).join('')}</div>`:''}
   ${v?`<div class="card vform"><input class="titlein" data-volf="nombre" value="${esc(v.nombre)}" aria-label="Nombre del volumen">
     <div class="fld"><span>Forma</span><div class="seg"><button class="btn sm" data-vf="forma:circulo" aria-pressed="${v.forma==='circulo'}">Circular (domo)</button><button class="btn sm" data-vf="forma:rect" aria-pressed="${v.forma==='rect'}">Rectangular</button></div></div>
     <div class="g2">${v.forma==='circulo'?nv('Diámetro','diam'):nv('Ancho (paralelo al muro)','ancho')+nv('Largo (hacia afuera)','largo')}${v.tipo!=='terraza'?nv(v.forma==='circulo'?'Altura del domo':'Altura interior','altura'):''}${nv('Altura del piso sobre el piso de la casa','nivel','m','0 si está al mismo nivel.')}</div>
     <div class="fld"><span>Cómo se sostiene</span>${segV('apoyo',VAPOYO)}</div>${v.apoyo==='pilotes'?`<div class="g2">${nv('Número de pilotes','nPil','un')}</div>`:''}
     <div class="fld"><span>Hacia qué lado de la casa</span>${segV('lado',VLADO)}</div>
     <div class="g2"><label class="fld"><span>Se llega desde</span><div class="inp sel"><select id="vo-desde" data-volf="desde"><option value="">${P.recintos.filter(valid).length?'Elegir recinto…':'Sin recintos aún'}</option>${P.recintos.filter(valid).map(r=>`<option value="${r.id}" ${v.desde===r.id?'selected':''}>${esc(r.nombre)}</option>`).join('')}</select></div></label>
       ${v.desde?'':nv('Centro a esta distancia de la esquina','off','m','Desde la esquina izquierda de ese lado, mirando la casa desde afuera.')}${nv('Separación del muro','sep','m','0 si está pegado a la casa.')}</div>
     <div class="fld"><span>Cómo se llega</span>${segV('acceso',VACCESO)}</div>
     ${v.tipo==='domo'?`<div class="fld"><span>Cubierta</span>${segV('cubierta',VCUB)}</div>`:''}
     <div class="row"><button class="btn sm" data-step="${S_3D}">Ver en 3D</button><button class="btn sm danger" data-act="delvol" id="btnDelVol">Eliminar volumen</button></div></div>`:''}</div>`}
/* clics y campos de la tarjeta (se enganchan al documento; solo actúan sobre sus propios atributos) */
document.addEventListener('click',e=>{const b=e.target.closest('[data-addvol],[data-selvol],[data-vf]');if(!b)return;const d=b.dataset;
  if(d.addvol){const v=volBlank(d.addvol);(P.volumenes=P.volumenes||[]).push(v);UI.vol=v.id;persist();if(UI.step!==3){UI.step=3;saveUI();renderHeader.done=0}render();document.getElementById('vols')?.scrollIntoView({block:'start'});toast(`${v.nombre} agregado. El asistente te irá preguntando sus medidas.`);return}
  if(d.selvol){UI.vol=d.selvol;render();return}
  if(d.vf){const i=d.vf.indexOf(':'),f=d.vf.slice(0,i),k=d.vf.slice(i+1);const v=(P.volumenes||[]).find(x=>x.id===UI.vol);if(!v)return;v[f]=k;if(f==='apoyo'&&k==='pilotes'&&!v.nPil)v.nPil=null;persist();const y=window.scrollY;render();window.scrollTo(0,y)}});
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||t.dataset.volf==null||t.tagName==='SELECT')return;const v=(P.volumenes||[]).find(x=>x.id===UI.vol);if(!v)return;const f=t.dataset.volf;
  v[f]=t.hasAttribute('data-num')?(t.value.trim()===''?null:num(t.value)):t.value;persist();refreshLive();const vc=document.querySelector(`[data-selvol="${v.id}"]`);if(vc&&f==='nombre')vc.lastChild.textContent=v.nombre});
document.addEventListener('change',e=>{const t=e.target;if(t.tagName!=='SELECT'||t.dataset.volf==null)return;const v=(P.volumenes||[]).find(x=>x.id===UI.vol);if(!v)return;v[t.dataset.volf]=t.value||null;persist();const y=window.scrollY;render();window.scrollTo(0,y)});

/* ---------- especificaciones y cubicación ---------- */
function volSpecRows(){return vols().map(g=>{const v=g.v;const parts=[g.circ?`${v.tipo==='domo'?'Domo':'Volumen circular'} Ø ${fmt(g.r*2)} m, altura ${fmt(g.alt)} m`:`${fmt(+v.ancho)} × ${fmt(+v.largo)} m${g.alt?', altura '+fmt(g.alt)+' m':''}`,
    g.nivel>0?`piso a +${fmt(g.nivel)} m`:'al nivel de la casa',v.apoyo?VAPOYO[v.apoyo].toLowerCase()+(v.apoyo==='pilotes'&&v.nPil?` (${v.nPil})`:''):'',
    `${VLADO[g.side].toLowerCase()} de la casa`+(room(v.desde)?`, frente a ${room(v.desde).nombre.toLowerCase()}`:''),v.acceso?'acceso por '+VACCESO[v.acceso].toLowerCase():'',v.tipo==='domo'&&v.cubierta?'cubierta '+VCUB[v.cubierta].n.toLowerCase():''].filter(Boolean);
  return[v.nombre,parts.join(', ')]})}
function volCubica(){const rows=[];for(const g of vols()){const a=g.circ?Math.PI*g.r*g.r:g.w*g.h;rows.push([`${g.v.nombre}: superficie de piso`,'m²',a]);if(g.circ&&g.alt>0){const rr=g.r,hh=g.alt;rows.push([`${g.v.nombre}: cubierta`,'m²',Math.PI*(rr*rr+hh*hh)])}
  const np=volPilotes(g).length;if(np)rows.push([`${g.v.nombre}: pilotes`,'un',np]);if(g.bridge){const b=g.bridge;rows.push([`${g.v.nombre}: pasarela`,'m²',(b.x1-b.x0)*(b.y1-b.y0)])}}return rows}
const volArea=()=>vols().reduce((t,g)=>t+(g.circ?Math.PI*g.r*g.r:g.w*g.h),0);

/* ---------- 3D ---------- */
function buildVols3D(add,hb,mExt,mRoofHouse){const deck=mStd('flotante','#8A6A48',{rough:.8}),pil=mStd('woodV','#6B5038',{rough:.85}),rail=mStd('flat','#3A3D3F',{rough:.5,metal:.4});
  for(const g of vols()){const v=g.v,z0=g.nivel,tz=.15;
    const posts=volPilotes(g);for(const [px,py] of posts){const cg=new THREE.CylinderGeometry(.09,.1,z0+0.17,10);const w=V.toW(px,py,(z0-0.17)/2);cg.translate(w.x,w.y,w.z);add(cg,pil)}
    if(g.circ){const rd=g.r+.45;if(z0>0.05||v.apoyo==='pilotes'){const dg=new THREE.CylinderGeometry(rd,rd,tz,40);uvWorld(dg);const w=V.toW(g.cx,g.cy,z0-tz/2);dg.translate(w.x,w.y,w.z);add(dg,deck)}
      if(g.alt>0){const cub=VCUB[v.cubierta||'lona']||VCUB.lona;let m;if(v.cubierta==='igual')m=mRoofHouse;else if(v.cubierta==='policarbonato'){if(!MC.has('policarb'))MC.set('policarb',new THREE.MeshStandardMaterial({color:lin(cub.col),roughness:.15,metalness:0,transparent:true,opacity:.5,side:THREE.DoubleSide,flatShading:true,depthWrite:false}));m=MC.get('policarb')}
        else{const k='domo|'+cub.col;if(!MC.has(k))MC.set(k,new THREE.MeshStandardMaterial({color:lin(cub.col),roughness:v.cubierta==='madera'?.8:.9,flatShading:true,side:THREE.DoubleSide}));m=MC.get(k)}
        const sg=new THREE.SphereGeometry(g.r,14,7,0,Math.PI*2,0,Math.PI/2);sg.scale(1,g.alt/g.r,1);const w=V.toW(g.cx,g.cy,z0);sg.translate(w.x,w.y,w.z);add(sg,m,{cast:v.cubierta!=='policarbonato'});
        const fr=new THREE.EdgesGeometry(sg,20);const ls=new THREE.LineSegments(fr,new THREE.LineBasicMaterial({color:v.cubierta==='policarbonato'?0x8fa3aa:0xc9c6bd}));V.root.add(ls)}
      if(z0>0.4){const tg=new THREE.TorusGeometry(rd-.05,.025,6,48);tg.rotateX(Math.PI/2);const w=V.toW(g.cx,g.cy,z0+.95);tg.translate(w.x,w.y,w.z);add(tg,rail);
        for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const pg=new THREE.CylinderGeometry(.02,.02,.95,6);const w2=V.toW(g.cx+Math.cos(a)*(rd-.05),g.cy+Math.sin(a)*(rd-.05),z0+.475);pg.translate(w2.x,w2.y,w2.z);add(pg,rail)}}}
    else{const top=z0+(v.tipo==='terraza'?0:g.alt);if(z0>0.05||v.tipo==='terraza')add(hb(g.x0,g.x1,g.y0,g.y1,z0-tz,z0),deck);
      if(v.tipo==='cobertizo'){for(const [px,py] of [[g.x0+.1,g.y0+.1],[g.x1-.1,g.y0+.1],[g.x1-.1,g.y1-.1],[g.x0+.1,g.y1-.1]])add(hb(px-.06,px+.06,py-.06,py+.06,z0,top),pil);add(hb(g.x0-.2,g.x1+.2,g.y0-.2,g.y1+.2,top,top+.15),mRoofHouse)}
      else if(v.tipo!=='terraza'&&g.alt>0){add(hb(g.x0,g.x1,g.y0,g.y1,z0,top),mExt);add(hb(g.x0-.25,g.x1+.25,g.y0-.25,g.y1+.25,top,top+.18),mRoofHouse)}
      if(v.tipo==='terraza'||(z0>0.4&&v.tipo==='cobertizo')){for(const [a,b] of [[[g.x0,g.y0],[g.x1,g.y0]],[[g.x1,g.y0],[g.x1,g.y1]],[[g.x1,g.y1],[g.x0,g.y1]],[[g.x0,g.y1],[g.x0,g.y0]]]){const xs=[a[0],b[0]].sort((p,q)=>p-q),ys=[a[1],b[1]].sort((p,q)=>p-q);add(hb(xs[0]-.02,xs[1]+.02,ys[0]-.02,ys[1]+.02,z0+.9,z0+.95),rail)}}}
    if(g.bridge){const b=g.bridge;const hzSide=g.side==='posterior'||g.side==='frontal';const len=hzSide?b.y1-b.y0:b.x1-b.x0,wid=hzSide?b.x1-b.x0:b.y1-b.y0;
      const hyp=Math.hypot(len,z0),ang=Math.atan2(z0,len);const bg=hzSide?new THREE.BoxGeometry(wid,.1,hyp):new THREE.BoxGeometry(hyp,.1,wid);uvWorld(bg);
      const m=add(bg,deck);m.position.copy(V.toW((b.x0+b.x1)/2,(b.y0+b.y1)/2,z0/2-.05));
      if(hzSide)m.rotation.x=(g.side==='posterior'?1:-1)*ang;else m.rotation.z=(g.side==='derecho'?1:-1)*ang}
    if(v.acceso==='escalera'&&z0>0.3){const n=Math.ceil((z0+0.17)/0.18),run=.28,wid=1.0,hzSide=g.side==='posterior'||g.side==='frontal';const dir=g.side==='posterior'||g.side==='derecho'?1:-1;
      for(let i=0;i<n;i++){const zt=-0.17+(i+1)*(z0+0.17)/n;if(hzSide){const ys=g.side==='posterior'?[g.y1+.45+(n-1-i)*run,g.y1+.45+(n-i)*run]:[g.y0-.45-(n-i)*run,g.y0-.45-(n-1-i)*run];add(hb(g.cx-wid/2,g.cx+wid/2,ys[0],ys[1],zt-.05,zt),deck)}
        else{const xs=g.side==='derecho'?[g.x1+.45+(n-1-i)*run,g.x1+.45+(n-i)*run]:[g.x0-.45-(n-i)*run,g.x0-.45-(n-1-i)*run];add(hb(xs[0],xs[1],g.cy-wid/2,g.cy+wid/2,zt-.05,zt),deck)}}}}}
