/* Huincha — complementos de las láminas: planta de cubierta, cotas de volúmenes en el emplazamiento,
   fundación, cerchas y niveles en los cortes, y cuadro de puertas y ventanas.
   Usa las primitivas de dibujo de app.js (rect, line, poly, text, dimH, dimV, fmt, r2). */
"use strict";

/* ---------- cotas de los volúmenes (domos, segundos pisos, etc.) en el emplazamiento ---------- */
function volCotasSVG(X,Y,s,fs,hx,hy){let h='';const LP=lotPoly(),c=P.casa;if(typeof vols!=='function')return h;
  const cota=(p,q,lab)=>{const [x1,y1,x2,y2]=[X(p[0]),Y(p[1]),X(q[0]),Y(q[1])];
    return`<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" style="stroke:#1b1e20;stroke-width:.25"/><circle cx="${r2(x1)}" cy="${r2(y1)}" r=".5" style="fill:#1b1e20"/><circle cx="${r2(x2)}" cy="${r2(y2)}" r=".5" style="fill:#1b1e20"/>`+
      `<text x="${r2((x1+x2)/2+fs*.4)}" y="${r2((y1+y2)/2-fs*.3)}" font-size="${r2(fs*.72)}" class="tx mono" style="fill:#1b1e20">${lab}</text>`};
  /* punto del contorno del volumen más cercano a p y su distancia */
  const borde=(g,p)=>{if(g.circ){const cx=hx+g.cx,cy=hy+g.cy,d=Math.hypot(p[0]-cx,p[1]-cy)||1;return{pt:[cx+(p[0]-cx)*g.r/d,cy+(p[1]-cy)*g.r/d],d:d-g.r}}
    const x=Math.max(hx+g.x0,Math.min(hx+g.x1,p[0])),y=Math.max(hy+g.y0,Math.min(hy+g.y1,p[1]));return{pt:[x,y],d:Math.hypot(p[0]-x,p[1]-y)}};
  for(const g of vols()){const ctr=[hx+g.cx,hy+g.cy];
    h+=text(X(ctr[0]),Y(ctr[1])+fs*.35,(g.v.nombre||'Volumen').toUpperCase(),fs*.8,'text-anchor="middle" font-weight="700"','tx');
    h+=text(X(ctr[0]),Y(ctr[1])+fs*1.4,g.circ?'Ø '+fmt(g.r*2):fmt(g.w)+' × '+fmt(g.h),fs*.65,'text-anchor="middle"','tx tm mono');
    /* al deslinde más cercano */
    if(LP){let best=null;LP.forEach((a,i)=>{const b=LP[(i+1)%LP.length],q=segCerca(ctr,a,b),e=borde(g,q),d=Math.hypot(q[0]-e.pt[0],q[1]-e.pt[1]);if(!best||d<best.d)best={d,p:e.pt,q}});
      if(best&&best.d>.3)h+=cota(best.p,best.q,fmt(best.d))}
    /* a la casa */
    const qx=Math.max(hx,Math.min(hx+c.ancho,ctr[0])),qy=Math.max(hy,Math.min(hy+c.largo,ctr[1])),e=borde(g,[qx,qy]);
    const dc=Math.hypot(qx-e.pt[0],qy-e.pt[1]);if(dc>.2)h+=cota(e.pt,[qx,qy],fmt(dc))}
  return h}

/* ---------- planta de cubierta ---------- */
function cubiertaSVG(o){const c=P.casa,W=+c.ancho,L=+c.largo,a=+c.alero||0,hT=+c.hTecho||0,s=o.s,fs=o.fs||2.4,T=P.techumbre||{};
  const X=x=>o.ox+x*s,Y=y=>o.oy+(L-y)*s;let h='';
  const pend=run=>run>0?Math.round(hT/run*100):0;
  const flecha=(x,y,dx,dy,lab)=>{const L2=Math.hypot(dx,dy)||1,ux=dx/L2,uy=dy/L2,len=Math.min(2.2,Math.max(1.2,(W+L)/14));
    const x1=X(x-ux*len/2),y1=Y(y-uy*len/2),x2=X(x+ux*len/2),y2=Y(y+uy*len/2),ang=Math.atan2(y2-y1,x2-x1),k=fs*.55;
    return line(x1,y1,x2,y2,'ln')+`<polygon class="na" points="${ptsS([[x2,y2],[x2-k*Math.cos(ang-.4),y2-k*Math.sin(ang-.4)],[x2-k*Math.cos(ang+.4),y2-k*Math.sin(ang+.4)]])}"/>`+
      text((x1+x2)/2+(Math.abs(uy)>.5?fs*.6:0),(y1+y2)/2-(Math.abs(uy)>.5?0:fs*.5),lab,fs*.72,Math.abs(uy)>.5?'':'text-anchor="middle"','tx mono')};
  /* paños con la textura de la cubierta, alero y muros bajo el techo */
  h+=rect(X(-a),Y(L+a),(W+2*a)*s,(L+2*a)*s,'roofE',`style="fill:url(#rx${o.sfx||''})"`);
  h+=rect(X(0),Y(L),W*s,L*s,'dash');
  const tipo=c.techo||'dos-aguas',lines=[];let ridge=null;
  if(tipo==='dos-aguas'){if(c.cumbrera==='paralela'){ridge=[[-a,L/2],[W+a,L/2]];h+=flecha(W/2,L*.78,0,1,'i = '+pend(L/2)+' %')+flecha(W/2,L*.22,0,-1,'i = '+pend(L/2)+' %')}
    else{ridge=[[W/2,-a],[W/2,L+a]];h+=flecha(W*.25,L/2,-1,0,'i = '+pend(W/2)+' %')+flecha(W*.75,L/2,1,0,'i = '+pend(W/2)+' %')}}
  else if(tipo==='cuatro-aguas'){const sp=Math.min(W,L)/2,r1=W>=L?[sp,L/2]:[W/2,sp],r2v=W>=L?[W-sp,L/2]:[W/2,L-sp];ridge=[r1,r2v];
    for(const [cx,cy,rp] of [[-a,-a,r1],[-a,L+a,r1],[W+a,-a,r2v],[W+a,L+a,r2v]])lines.push([[cx,cy],rp]);
    const ip=pend(sp);h+=flecha(W/2,L*.12+.4,0,-1,'i = '+ip+' %')+flecha(W/2,L*.88-.4,0,1,'i = '+ip+' %')+flecha(W*.08+.4,L/2,-1,0,'i = '+ip+' %')+flecha(W*.92-.4,L/2,1,0,'i = '+ip+' %')}
  else if(tipo==='un-agua')h+=flecha(W/2,L/2,0,1,'i = '+pend(L)+' %');
  else h+=flecha(W/2,L/2,0,1,'i = 2 % (mín.)');
  if(ridge)h+=line(X(ridge[0][0]),Y(ridge[0][1]),X(ridge[1][0]),Y(ridge[1][1]),'bold')+text(X((ridge[0][0]+ridge[1][0])/2)+fs*.5,Y((ridge[0][1]+ridge[1][1])/2)-fs*.5,'CUMBRERA',fs*.7,'','tx tm');
  for(const [p,q] of lines)h+=line(X(p[0]),Y(p[1]),X(q[0]),Y(q[1]),'ln');
  /* canales en los bordes bajos y bajadas de agua lluvia en las esquinas */
  const canal=T.canal&&T.canal!=='ninguna'?T.canal:(T.canal==='ninguna'?null:'zinc');
  if(canal){const bordes=tipo==='dos-aguas'?(c.cumbrera==='paralela'?[[[-a,-a],[W+a,-a]],[[-a,L+a],[W+a,L+a]]]:[[[-a,-a],[-a,L+a]],[[W+a,-a],[W+a,L+a]]])
      :tipo==='un-agua'?[[[-a,L+a],[W+a,L+a]]]:[[[-a,-a],[W+a,-a]],[[W+a,-a],[W+a,L+a]],[[W+a,L+a],[-a,L+a]],[[-a,L+a],[-a,-a]]];
    for(const [p,q] of bordes){const off=.12,nx=p[0]===q[0]?(p[0]<W/2?-off:off):0,ny=p[1]===q[1]?(p[1]<L/2?-off:off):0;h+=line(X(p[0]+nx),Y(p[1]+ny),X(q[0]+nx),Y(q[1]+ny),'th')}
    const nb=Math.max(1,+T.bajadas||(bordes.length>2?4:2)),esq=[];for(const [p,q] of bordes){esq.push(p,q)}
    const uniq=[];for(const p of esq)if(!uniq.some(u=>Math.hypot(u[0]-p[0],u[1]-p[1])<.1))uniq.push(p);
    uniq.slice(0,nb).forEach(p=>{h+=`<circle class="tag" cx="${r2(X(p[0]))}" cy="${r2(Y(p[1]))}" r="${r2(fs*.45)}"/>`+text(X(p[0])+fs*.7,Y(p[1])+(p[1]<L/2?fs*1.2:-fs*.5),'BLL',fs*.6,'','tx tm')})}
  /* volúmenes especiales (domos, etc.) con su propia cubierta */
  if(typeof vols==='function')for(const g of vols()){h+=g.circ?`<circle class="vol" cx="${r2(X(g.cx))}" cy="${r2(Y(g.cy))}" r="${r2(g.r*s)}"/>`:rect(X(g.x0),Y(g.y1),g.w*s,g.h*s,'vol');
    h+=text(X(g.cx),Y(g.cy)+fs*.35,(g.v.nombre||'Volumen').toUpperCase(),fs*.75,'text-anchor="middle" font-weight="700"','tx')}
  /* cotas generales */
  h+=dimH(X(-a),X(W+a),Y(-a)+fs*2.2,fmt(W+2*a),fs*.8)+dimV(Y(L+a),Y(-a),X(W+a)+fs*2.2,fmt(L+2*a),fs*.8);
  if(a>0)h+=dimH(X(-a),X(0),Y(-a)+fs*4.2,fmt(a),fs*.7);
  return h}
function cubiertaNotas(){const c=P.casa,T=P.techumbre||{},M=P.mat;const tech={plana:'Techo plano','un-agua':'Una agua','dos-aguas':'Dos aguas','cuatro-aguas':'Cuatro aguas'}[c.techo||'dos-aguas']||c.techo;
  const o=(k,v)=>TECHU?.[k]?.opts&&typeof TECHU[k].opts==='object'?TECHU[k].opts[v]:v;
  return[['Forma',tech],['Cubierta',mn('cubierta',M.cubierta)],['Altura de cumbrera sobre el cielo',c.hTecho>0?fmt(c.hTecho)+' m':'—'],['Alero',(+c.alero||0)>0?fmt(c.alero)+' m':'Sin alero'],
    ['Estructura',T.estructura?o('estructura',T.estructura)+(T.cerchaMat?' · '+o('cerchaMat',T.cerchaMat):'')+(T.sep?' @ '+String(T.sep).replace('.',',')+' m':''):'—'],
    ['Canales y bajadas',T.canal==='ninguna'?'Sin canales':(o('canal',T.canal||'zinc')+' · '+(T.bajadas||((c.techo==='cuatro-aguas'||c.techo==='plana')?4:2))+' bajadas (BLL)')]]}

/* ---------- cortes: fundación, cerchas y niveles ---------- */
function sectExtrasSVG(G,which,o,ctx){const c=P.casa,H=hCasa(),s=o.s,fs=o.fs||2.4,{U,Z,len,depth,rz,isA}=ctx,T=P.techumbre||{},f=P.fund||{};let h='';
  const np=typeof nivelPiso==='function'?nivelPiso():0,elev=np>.05||/pilotes|poyos/.test(f.tipo||''),ng=elev?-Math.max(np,.4):-.15;
  /* fundación bajo cada muro cortado */
  const cutAx=isA?'v':'h';
  if(!elev){for(const l of G.lines){if(l.ax!==cutAx)continue;if(!l.iv.some(([p,q])=>p<depth-EPS&&q>depth+EPS))continue;
      const t=l.t,cw=l.ext?Math.max(.4,t+.2):Math.max(.3,t+.1),cd=l.ext?.6:.4;
      h+=rect(U(l.c-cw/2),Z(ng),cw*s,cd*s,'slab')+rect(U(l.c-t/2),Z(0),t*s,(-ng)*s,'slab')}}
  else{const sep=+f.sep||1.5,n=Math.max(1,Math.round(len/sep));
    for(let i=0;i<=n;i++){const u=len*i/n;h+=rect(U(u-.075),Z(0),.15*s,(-ng)*s,'cut')+rect(U(u-.2),Z(ng),.4*s,.35*s,'slab')}
    h+=text(U(len/2),Z(ng/2)+fs*.3,(f.tipo==='poyos'?'POYOS':'PILOTES')+' @ '+fmt(len/n)+' m',fs*.65,'text-anchor="middle"','tx tm')}
  /* cerchas: si el corte muestra la pendiente se dibuja la cercha; si corre a lo largo de la cumbrera, sus piezas cortadas */
  if(c.techo!=='plana'&&T.estructura!=='losa'){const zs=[0,len*.25,len*.5,len*.75,len].map(rz),var_=Math.max(...zs)-Math.min(...zs);
    if(var_>.3){let xp=0,zp=-1;for(let i=0;i<=40;i++){const u=len*i/40,z=rz(u);if(z>zp){zp=z;xp=u}}
      const b1=len/3,b2=len*2/3,t1=xp/2,t3=(xp+len)/2;
      h+=line(U(0),Z(H),U(len),Z(H),'bold');
      for(const [p,q] of [[[xp,H],[xp,zp]],[[b1,H],[t1,rz(t1)]],[[b1,H],[xp,zp]],[[b2,H],[xp,zp]],[[b2,H],[t3,rz(t3)]]])h+=line(U(p[0]),Z(p[1]),U(q[0]),Z(q[1]),'ln');
      const lab='CERCHA '+(T.cerchaTipo&&TECHU?.cerchaTipo?.opts?.[T.cerchaTipo]?TECHU.cerchaTipo.opts[T.cerchaTipo].toUpperCase():'')+(T.sep?' @ '+String(T.sep).replace('.',',')+' m':'');
      h+=text(U(xp),Z(H)-fs*.5,lab.trim(),fs*.65,'text-anchor="middle"','tx tm')}
    else{const sp=+T.sep||.9,n=Math.floor(len/sp);for(let i=0;i<=n;i++){const u=Math.min(len,i*sp);const k=.08*s+.25;
        h+=rect(U(u)-k/2,Z(rz(u))+.2,k,k,'pil')+rect(U(u)-k/2,Z(H)-k,k,k,'pil')}
      h+=text(U(len/2),Z(H)-fs*.5,'CERCHAS CORTADAS'+(T.sep?' @ '+String(T.sep).replace('.',',')+' m':''),fs*.65,'text-anchor="middle"','tx tm')}}
  /* aislación sobre el cielo */
  if(T.aislacion&&T.aislacion!=='ninguna'){const e=Math.max(.05,(+T.aislEsp||100)/1000);h+=rect(U(0),Z(H+e),len*s,e*s,'vbr')}
  /* niveles a la derecha */
  const lx=U(len+(+c.alero||0))+fs*3,mz=Math.max(...[0,len/2,len].map(rz));
  const nv=[[0,'NPT ±0,00'],...Array.from({length:nPisos()-1},(_,i)=>[zPiso(i+1),'NPT '+(i+2)+'º piso +'+fmt(zPiso(i+1))]),[ng,'NTN '+(ng<0?'−':'+')+fmt(Math.abs(ng))],[H,'Cielo +'+fmt(H)],...(mz-H>.05?[[mz,(Math.max(...[0,len*.25,len*.5,len*.75,len].map(rz))-Math.min(...[0,len*.25,len*.5,len*.75,len].map(rz))>.3?'Cumbrera +':'Techo +')+fmt(mz)]]:[])];
  for(const [z,lab] of nv){const y=Z(z);h+=line(lx-fs*.3,y,lx+fs*4.4,y,'th')+`<polygon class="na" points="${ptsS([[lx,y],[lx-fs*.35,y-fs*.6],[lx+fs*.35,y-fs*.6]])}"/>`+text(lx+fs*.6,y-fs*.25,lab,fs*.72,'','tx mono')}
  return h}

/* ---------- cuadro de puertas y ventanas ---------- */
function vanosLista(){const out=[];for(const v of P.vanos||[]){const tipo=/puerta/.test(v.tipo||'')?(v.tipo==='puerta-ventana'?'Puerta-ventana':'Puerta'):'Ventana';
    out.push({tipo,ancho:+v.ancho||0,alto:+v.alto||0,ant:+v.antepecho||0,rec:(typeof room==='function'&&room(v.recinto)?.nombre)||'—'})}
  /* agrupar por tipo y medida */
  const g=new Map();for(const v of out){const k=v.tipo+'|'+v.ancho+'|'+v.alto+'|'+v.ant;const e=g.get(k)||Object.assign({n:0,recs:new Set()},v);e.n++;e.recs.add(v.rec);g.set(k,e)}
  let iP=0,iV=0;return[...g.values()].sort((a,b)=>a.tipo.localeCompare(b.tipo)||b.ancho-a.ancho).map(e=>Object.assign(e,{cod:(e.tipo==='Ventana'?'V':'P')+(e.tipo==='Ventana'?++iV:++iP)}))}
function cuadroVanosSVG(x,y,w,f){const L=vanosLista();if(!L.length)return'';let h=text(x,y-1.5,'CUADRO DE PUERTAS Y VENTANAS',f*1.2,'font-weight="700" letter-spacing=".4"');
  const cols=[['Cód.',.1],['Tipo',.24],['Ancho',.14],['Alto',.14],['Antep.',.14],['Cant.',.1],['',.14]];const rh=f*2.2;
  let cx=x;h+=rect(x,y,w,rh,'thead');for(const [t,k] of cols){h+=text(cx+1,y+rh*.68,t,f*.85,'font-weight="700"');cx+=w*k}
  L.slice(0,12).forEach((e,i)=>{const yy=y+rh*(i+1);h+=rect(x,yy,w,rh,'cell');const vals=[e.cod,e.tipo,fmt(e.ancho),fmt(e.alto),e.tipo==='Ventana'?fmt(e.ant):'—',String(e.n),''];
    let cx2=x;vals.forEach((v,j)=>{h+=text(cx2+1,yy+rh*.68,v,f*.85,'',j>=2?'tx mono':'tx');cx2+=w*cols[j][1]})});
  if(L.length>12)h+=text(x,y+rh*14,'… y '+(L.length-12)+' tipos más (ver especificaciones)',f*.8,'','tx tm');
  return h}

/* ---------- redes esquemáticas en la lámina de instalaciones ----------
   Agua potable (AP) desde el medidor o el frente hasta cada recinto húmedo; aguas servidas (AS) desde cada artefacto
   hasta la cámara de salida (frente si hay alcantarillado, fosa si la hay); tablero eléctrico (TE) junto a la entrada. */
const HUMEDOS=['wc','lavamanos','vanitorio','ducha','tina','bidet','lavaplatos','lavadora','lavadero'];
function instRedesSVG(X,Y,s,fs){const c=P.casa,W=c.ancho,L=c.largo,I=P.instal||{};let h='';
  const ox=+c.retiroIzq||0,oy=+c.retiroFrontal||0,elC=t=>{const e=(P.elementos||[]).find(e=>e.t===t);return e?[elCenter(e)[0]-ox,elCenter(e)[1]-oy]:null};
  const pts=[];for(const r of P.recintos.filter(valid)){const it=artLayout(Object.keys(r.art||{}).length?r:Object.assign({},r,{art:artTipico(r)})).filter(i=>HUMEDOS.includes(i.k));if(it.length)pts.push({r,c:[it.reduce((t,i)=>t+i.c[0],0)/it.length,it.reduce((t,i)=>t+i.c[1],0)/it.length]})}
  if(!pts.length)return'';
  const fosa=elC('fosa'),med=elC('medidorAgua'),sale=I.alcant&&I.alcant!=='red'&&fosa?fosa:[W*.5,-1.2];
  /* troncal de AS a 0,4 m del muro más cercano a la salida, para no cruzar recintos en diagonal */
  const asY=sale[1]<L/2?.35:L-.35,AS=[];for(const p of pts)AS.push([[p.c[0],p.c[1]],[p.c[0],asY]]);
  const xs=pts.map(p=>p.c[0]).concat(sale[0]);AS.push([[Math.min(...xs),asY],[Math.max(...xs),asY]]);AS.push([[sale[0],asY],sale]);
  for(const [p,q] of AS)h+=`<line x1="${r2(X(p[0]))}" y1="${r2(Y(p[1]))}" x2="${r2(X(q[0]))}" y2="${r2(Y(q[1]))}" style="stroke:#1b1e20;stroke-width:.45;stroke-dasharray:2.4 .8 .5 .8;fill:none"/>`;
  h+=`<rect x="${r2(X(sale[0])-1.4)}" y="${r2(Y(sale[1])-1.4)}" width="2.8" height="2.8" style="fill:#fff;stroke:#1b1e20;stroke-width:.3"/>`+text(X(sale[0])+2,Y(sale[1])+fs*.3,fosa&&sale===fosa?'FOSA':'C.I. salida',fs*.6,'','tx');
  /* AP: entra por el medidor (o el frente) y corre a 0,6 m del frente */
  const ent=med||[W*.12,-1.2],apY=.6;const AP=[[ent,[ent[0],apY]]];const xs2=pts.map(p=>p.c[0]).concat(ent[0]);AP.push([[Math.min(...xs2),apY],[Math.max(...xs2),apY]]);
  for(const p of pts)AP.push([[p.c[0]+.25,apY],[p.c[0]+.25,p.c[1]]]);
  for(const [p,q] of AP)h+=`<line x1="${r2(X(p[0]))}" y1="${r2(Y(p[1]))}" x2="${r2(X(q[0]))}" y2="${r2(Y(q[1]))}" style="stroke:#1b1e20;stroke-width:.25;fill:none"/>`;
  h+=`<circle cx="${r2(X(ent[0]))}" cy="${r2(Y(ent[1]))}" r="1.2" style="fill:#fff;stroke:#1b1e20;stroke-width:.3"/>`+text(X(ent[0])+1.8,Y(ent[1])+fs*.3,med?'MAP':'AP',fs*.6,'','tx');
  /* tablero eléctrico junto a la puerta principal */
  let te=[.6,.3];try{const G=geom(),fl=G.lines.find(l=>l.ax==='h'&&Math.abs(l.c)<.05),op=fl&&fl.ops.find(o=>!o.isWin);if(op)te=[op.e+.45,.3]}catch(e){}h+=`<rect x="${r2(X(te[0])-1.6)}" y="${r2(Y(te[1])-1)}" width="3.2" height="2" style="fill:#1b1e20"/>`+text(X(te[0]),Y(te[1])-1.6,'TE',fs*.6,'text-anchor="middle" font-weight="700"','tx');
  return h}
function instRedesLeyenda(x,y,f){return`<line x1="${x}" y1="${y-.7}" x2="${x+8}" y2="${y-.7}" style="stroke:#1b1e20;stroke-width:.25"/>`+text(x+10,y,'AP agua potable (fría/caliente)',f)+
  `<line x1="${x+62}" y1="${y-.7}" x2="${x+70}" y2="${y-.7}" style="stroke:#1b1e20;stroke-width:.45;stroke-dasharray:2.4 .8 .5 .8"/>`+text(x+72,y,'AS aguas servidas → cámara de salida',f)+
  `<rect x="${x+130}" y="${y-1.7}" width="3.2" height="2" style="fill:#1b1e20"/>`+text(x+135,y,'TE tablero eléctrico · trazado esquemático, verificar en terreno',f)}

/* ---------- curvas de nivel en el emplazamiento (terreno con pendiente) ---------- */
function curvasSVG(X,Y,s,fs,hx,hy){const g=pendTer();if(!(g.p>0))return'';const LP=lotPoly();if(!LP)return'';const c=P.casa,W=+c.ancho||0;
  const zl=(x,y)=>dzTer(x-hx,y-hy),xs=LP.map(p=>p[0]),ys=LP.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const zs=[[x0,y0],[x1,y0],[x0,y1],[x1,y1]].map(p=>zl(...p)),zmin=Math.min(...zs),zmax=Math.max(...zs),paso=zmax-zmin>8?1:.5;
  let h=`<clipPath id="clot"><polygon points="${ptsS(LP.map(p=>[X(p[0]),Y(p[1])]))}"/></clipPath><g clip-path="url(#clot)">`;
  for(let k=Math.ceil(zmin/paso)*paso;k<=zmax+1e-9;k+=paso){let a,b;
    if(g.gy){const y=hy+(k+(g.gx?-g.gx*(0):0))/g.gy;a=[x0,y];b=[x1,y]}else{const x=hx+W/2+k/g.gx;a=[x,y0];b=[x,y1]}
    const fuerte=Math.abs(k/paso)%2<1e-6;h+=`<line x1="${r2(X(a[0]))}" y1="${r2(Y(a[1]))}" x2="${r2(X(b[0]))}" y2="${r2(Y(b[1]))}" style="stroke:#7d8784;stroke-width:${fuerte?.3:.15};stroke-dasharray:${fuerte?'none':'1.2 .8'}"/>`;
    if(fuerte){const lx=g.gy?X(x0)+fs*.6:X(a[0])+fs*.4,ly=g.gy?Y(a[1])-fs*.35:Y(y0)-fs*.6;h+=text(lx,ly,(k>=0?'+':'−')+fmt(Math.abs(k)),fs*.6,'','tx tm mono')}}
  h+='</g>';
  const cx=(x0+x1)/2,cy=(y0+y1)/2,dx=g.gx,dy=g.gy,l=Math.hypot(dx,dy)||1,len=Math.min(x1-x0,y1-y0)*.18,ax=X(cx+dx/l*len*.5),ay=Y(cy+dy/l*len*.5),bx=X(cx-dx/l*len*.5),by=Y(cy-dy/l*len*.5),an=Math.atan2(ay-by,ax-bx),k=fs*.6;
  h+=`<line x1="${r2(bx)}" y1="${r2(by)}" x2="${r2(ax)}" y2="${r2(ay)}" style="stroke:#1b1e20;stroke-width:.3"/><polygon class="na" points="${ptsS([[ax,ay],[ax-k*Math.cos(an-.4),ay-k*Math.sin(an-.4)],[ax-k*Math.cos(an+.4),ay-k*Math.sin(an+.4)]])}"/>`+text(ax+fs*.5,ay,`SUBE ${fmt(g.p*100,0)} %`,fs*.7,'font-weight="700"','tx');
  return h}
