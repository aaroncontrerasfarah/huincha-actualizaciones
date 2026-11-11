/* Huincha — elementos de la casa y del terreno que se reconocen o agregan durante el recorrido:
   cierres (reja, portón, cerco, muro), pisos y superficies (radier, cerámico, pasto, deck, piscina),
   construcciones livianas (quincho, cobertizo, bodega) y vegetación.
   Coordenadas en metros con origen en la esquina frontal izquierda de la casa: x hacia la derecha, y hacia el fondo.
   Tipos de forma: "linea" (a→b), "area" y "vol" (rectángulo centrado en x,y de w × l girado rot), "punto" (centro y diámetro w). */
"use strict";
const ELT={
  porton:{n:'Portón',g:'Cierres',k:'linea',len:3.5,h:1.8,tex:'bars',col:'#3A3D40'},
  reja:{n:'Reja',g:'Cierres',k:'linea',len:4,h:1.5,tex:'bars',col:'#2E3236'},
  cerco:{n:'Cerco de madera',g:'Cierres',k:'linea',len:4,h:1.8,tex:'fenceWood',col:'#8B6440'},
  malla:{n:'Malla',g:'Cierres',k:'linea',len:4,h:1.5,tex:'mesh',col:'#55606A'},
  baranda:{n:'Baranda',g:'Cierres',k:'linea',len:3,h:1,tex:'bars',col:'#3A3D40'},
  muroContencion:{n:'Muro de contención',g:'Cierres',k:'linea',len:4,h:1,tex:'concrete',col:'#A9A59C',grueso:.25},
  muro:{n:'Muro o pandereta',g:'Cierres',k:'linea',len:4,h:2,tex:'stucco',col:'#C9C3B8'},
  camino:{n:'Camino de acceso',g:'Pisos',k:'area',w:1.2,l:5,h:.04,tex:'pavers',col:'#BDB8AE'},
  estacionamiento:{n:'Estacionamiento',g:'Pisos',k:'area',w:3,l:5,h:.08,tex:'concrete',col:'#B9B6AE'},
  radier:{n:'Radier',g:'Pisos',k:'area',w:3,l:3,h:.1,tex:'concrete',col:'#B4B1AA'},
  ceramico:{n:'Cerámico',g:'Pisos',k:'area',w:3,l:3,h:.06,tex:'ceramica',col:'#C9B9A3'},
  baldosa:{n:'Baldosas',g:'Pisos',k:'area',w:3,l:3,h:.06,tex:'pavers',col:'#B7B3AB'},
  deck:{n:'Deck de madera',g:'Pisos',k:'area',w:3,l:3,h:.3,tex:'flotante',col:'#8A6A48'},
  pasto:{n:'Pasto',g:'Pisos',k:'area',w:4,l:4,h:.02,tex:'grass',col:'#5E7F3A'},
  gravilla:{n:'Gravilla',g:'Pisos',k:'area',w:3,l:3,h:.03,tex:'gravel',col:'#A39C8F'},
  tierra:{n:'Tierra',g:'Pisos',k:'area',w:3,l:3,h:.02,tex:'dirt',col:'#8A6B4D'},
  terraza:{n:'Terraza',g:'Patio',k:'area',w:4,l:2.5,h:.3,tex:'concrete',col:'#C8C3BA'},
  rampa:{n:'Rampa',g:'Patio',k:'area',w:1.2,l:3,h:.3,tex:'concrete',col:'#B4B1AA'},
  piscina:{n:'Piscina',g:'Patio',k:'area',w:3,l:6,h:1.4,col:'#3E9CC4'},
  jardinera:{n:'Jardinera',g:'Patio',k:'area',w:2,l:.6,h:.45,col:'#8A6B4D'},
  escalera:{n:'Escalera',g:'Patio',k:'area',w:1,l:2,h:1,col:'#B4B1AA'},
  edificacion:{n:'Construcción',g:'Construcciones',k:'vol',w:6,l:5,h:2.5,col:'#E8E2D6',edif:1},
  quincho:{n:'Quincho',g:'Construcciones',k:'vol',w:4,l:3,h:2.5,col:'#8B6440'},
  cobertizo:{n:'Cobertizo',g:'Construcciones',k:'vol',w:3,l:3,h:2.4,col:'#7A7F84'},
  carport:{n:'Estacionamiento techado',g:'Construcciones',k:'vol',w:3,l:5,h:2.4,col:'#7A7F84'},
  pergola:{n:'Pérgola',g:'Construcciones',k:'vol',w:3,l:3,h:2.4,col:'#8B6440',abierta:1},
  bodega:{n:'Bodega',g:'Construcciones',k:'vol',w:2,l:2,h:2.2,col:'#A89F8E',cerrado:1},
  galpon:{n:'Galpón',g:'Construcciones',k:'vol',w:5,l:6,h:3,col:'#9AA0A3',cerrado:1},
  arbol:{n:'Árbol',g:'Vegetación',k:'punto',w:3,h:5,col:'#4C7A34'},
  arbusto:{n:'Arbusto',g:'Vegetación',k:'punto',w:1.2,h:1,col:'#5B8A3C'},
  palmera:{n:'Palmera',g:'Vegetación',k:'punto',w:2.5,h:6,col:'#5B8A3C'},
  pilar:{n:'Pilar',g:'Otros',k:'punto',w:.3,h:2.4,col:'#B4B1AA'},
  chimenea:{n:'Chimenea',g:'Otros',k:'punto',w:.6,h:1.2,col:'#8E8A84'},
  poste:{n:'Poste',g:'Otros',k:'punto',w:.25,h:6,col:'#6B5A48'},
  estanque:{n:'Estanque de agua',g:'Otros',k:'punto',w:1.2,h:1.6,col:'#2F3A40'},
  medidor:{n:'Medidor o nicho',g:'Otros',k:'punto',w:.6,h:1.2,col:'#9AA0A3'},
  fosa:{n:'Fosa séptica',g:'Instalaciones',k:'area',w:1.5,l:2.5,h:.08,tex:'concrete',col:'#7E8B6E'},
  pozoAbs:{n:'Pozo absorbente',g:'Instalaciones',k:'punto',w:1.5,h:.08,col:'#8E9A7A'},
  camaraIns:{n:'Cámara de inspección',g:'Instalaciones',k:'punto',w:.6,h:.06,col:'#8F9496'},
  camaraDesg:{n:'Cámara desgrasadora',g:'Instalaciones',k:'punto',w:.6,h:.06,col:'#8F9496'},
  medidorAgua:{n:'Medidor de agua',g:'Instalaciones',k:'punto',w:.4,h:.3,col:'#5B7F95'},
  medidorLuz:{n:'Medidor eléctrico (empalme)',g:'Instalaciones',k:'punto',w:.4,h:1.6,col:'#6A6F73'},
  medidorGas:{n:'Medidor o nicho de gas',g:'Instalaciones',k:'punto',w:.5,h:1,col:'#C6A04A'},
  otro:{n:'Otro elemento',g:'Otros',k:'punto',w:1,h:1,col:'#B4471A'}
};
/* Materiales que se preguntan por tipo de elemento (tex/col: cómo se dibuja) */
const MATOPC={
  cierre:{metal:{n:'Metálico',tex:'bars',col:'#3A3D40'},madera:{n:'Madera',tex:'fenceWood',col:'#8B6440'},malla:{n:'Malla',tex:'mesh',col:'#55606A'},pvc:{n:'PVC',tex:'flat',col:'#EDEDED'},vidrio:{n:'Vidrio o policarbonato',tex:'flat',col:'#CFE3EA'}},
  muro:{albanileria:{n:'Albañilería (ladrillo)',tex:'brick',col:'#A9573D'},bloque:{n:'Bloque de cemento',tex:'block',col:'#B9B6AE'},hormigon:{n:'Hormigón',tex:'concrete',col:'#B4B1AA'},pandereta:{n:'Pandereta',tex:'concrete',col:'#C9C3B8'},piedra:{n:'Piedra',tex:'stone',col:'#9A948A'},adobe:{n:'Adobe',tex:'stucco',col:'#C9A27E'}},
  edif:{albanileria:{n:'Albañilería (ladrillo)',tex:'brick',col:'#B5644A'},estuco:{n:'Estucada / pintada',tex:'stucco',col:'#E2D8C4'},madera:{n:'Madera',tex:'siding',col:'#A57B52'},fibrocemento:{n:'Fibrocemento / metalcon',tex:'siding',col:'#D9D4CC'},hormigon:{n:'Hormigón',tex:'concrete',col:'#B4B1AA'},adobe:{n:'Adobe',tex:'stucco',col:'#C9A27E'},mixta:{n:'Mixta',tex:'stucco',col:'#D8CDB8'}},
  liviana:{madera:{n:'Madera',tex:'woodV',col:'#8B6440'},metal:{n:'Metal',tex:'flat',col:'#7A7F84'},policarbonato:{n:'Techo de policarbonato',tex:'flat',col:'#CFE3EA'},zinc:{n:'Techo de zinc',tex:'steelRoof',col:'#9AA0A3'},albanileria:{n:'Albañilería',tex:'brick',col:'#A9573D'}},
  piso:{hormigon:{n:'Hormigón / radier',tex:'concrete',col:'#B4B1AA'},ceramica:{n:'Cerámica',tex:'ceramica',col:'#C9B9A3'},baldosa:{n:'Baldosa',tex:'pavers',col:'#B7B3AB'},madera:{n:'Madera (deck)',tex:'flotante',col:'#8A6A48'},piedra:{n:'Piedra',tex:'stone',col:'#9A948A'},gravilla:{n:'Gravilla',tex:'gravel',col:'#A39C8F'},asfalto:{n:'Asfalto',tex:'asphalt',col:'#55595B'}},
  piscina:{hormigon:{n:'Hormigón',col:'#3E9CC4'},fibra:{n:'Fibra de vidrio',col:'#4FB0D6'},lona:{n:'Estructural de lona',col:'#5AA6C8'}},
  escalera:{hormigon:{n:'Hormigón',tex:'concrete',col:'#B4B1AA'},madera:{n:'Madera',tex:'woodV',col:'#8B6440'},metal:{n:'Metal',tex:'flat',col:'#5C6266'},piedra:{n:'Piedra',tex:'stone',col:'#9A948A'}}};
const MATGRP={baranda:'cierre',muroContencion:'muro',terraza:'piso',camino:'piso',estacionamiento:'piso',radier:'piso',rampa:'piso',porton:'cierre',reja:'cierre',cerco:'cierre',malla:'cierre',muro:'muro',edificacion:'edif',quincho:'liviana',cobertizo:'liviana',carport:'liviana',pergola:'liviana',bodega:'liviana',galpon:'liviana',piscina:'piscina',escalera:'escalera'};
const elMatOpts=e=>MATOPC[MATGRP[e.t]]||null;
const elMat=e=>{const o=elMatOpts(e);return o&&e.mat?o[e.mat]:null};
const FORMAS={rect:'Rectangular',L:'En L',circulo:'Circular',libre:'Otra forma'};
const TECHOS={plano:'Plano',una_agua:'Una agua',dos_aguas:'Dos aguas'};
const ELT_GRUPOS=['Cierres','Pisos','Patio','Construcciones','Vegetación','Instalaciones','Otros'];
const eltOf=e=>ELT[e.t]||ELT.otro;
const elNombre=e=>e.nombre||eltOf(e).n;

/* Elemento nuevo en el punto p=[x,y]; dir=[dx,dy] orienta cierres y rectángulos */
function elemNew(t,p,dir){const T=ELT[t]||ELT.otro,rot=dir?Math.atan2(dir[1],dir[0]):0;const e={id:uid(),t,h:T.h};
  if(T.k==='linea'){const L=T.len,c=Math.cos(rot),s=Math.sin(rot);e.a=[p[0],p[1]];e.b=[p[0]+c*L,p[1]+s*L]}
  else{e.x=p[0];e.y=p[1];e.w=T.w;e.l=T.l??T.w;e.rot=T.k==='punto'?0:rot}
  if(T.edif){e.forma='rect';e.pisos=1;e.techo='dos_aguas'}
  return e}
const elLen=e=>Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1]);
function elCenter(e){return eltOf(e).k==='linea'?[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2]:[e.x,e.y]}
/* esquinas en planta de un rectángulo */
function elCorners(e){const c=Math.cos(e.rot||0),s=Math.sin(e.rot||0),w=(e.w||1)/2,l=(e.l||1)/2;return[[-w,-l],[w,-l],[w,l],[-w,l]].map(([u,v])=>[e.x+u*c-v*s,e.y+u*s+v*c])}
/* mover todo el elemento */
/* planta del elemento según su forma: puntos locales (sin girar) y en la planta */
function elLocalFoot(e){const w=(+e.w||1)/2,l=(+e.l||+e.w||1)/2,f=e.forma||'rect';
  if(f==='libre'&&Array.isArray(e.pts)&&e.pts.length>=3)return e.pts;
  if(f==='L'){const cw=w*2*.45,cl=l*2*.45;return[[-w,-l],[w,-l],[w,l-cl],[w-cw,l-cl],[w-cw,l],[-w,l]]}
  if(f==='circulo'){const r=w,out=[];for(let i=0;i<28;i++){const a=i/28*Math.PI*2;out.push([Math.cos(a)*r,Math.sin(a)*r])}return out}
  return[[-w,-l],[w,-l],[w,l],[-w,l]]}
function elFoot(e){const c=Math.cos(e.rot||0),s=Math.sin(e.rot||0);return elLocalFoot(e).map(([u,v])=>[e.x+u*c-v*s,e.y+u*s+v*c])}
/* pasa una forma a "libre" para poder mover sus vértices */
function elToLibre(e){if(e.forma!=='libre'||!Array.isArray(e.pts))e.pts=elLocalFoot(e).map(p=>p.slice());e.forma='libre'}
function elMove(e,dx,dy){if(eltOf(e).k==='linea'){e.a=[e.a[0]+dx,e.a[1]+dy];e.b=[e.b[0]+dx,e.b[1]+dy]}else{e.x+=dx;e.y+=dy}}
function elRotate(e,da){if(eltOf(e).k==='linea'){const [cx,cy]=elCenter(e),c=Math.cos(da),s=Math.sin(da);const r=p=>[cx+(p[0]-cx)*c-(p[1]-cy)*s,cy+(p[0]-cx)*s+(p[1]-cy)*c];e.a=r(e.a);e.b=r(e.b)}else e.rot=(e.rot||0)+da}
function elSetLen(e,L){const [cx,cy]=elCenter(e),d=elLen(e)||1,ux=(e.b[0]-e.a[0])/d,uy=(e.b[1]-e.a[1])/d;e.a=[cx-ux*L/2,cy-uy*L/2];e.b=[cx+ux*L/2,cy+uy*L/2]}
function elMedidas(e){const T=eltOf(e);if(T.edif)return`${fmt(e.w,1)} × ${fmt(e.l,1)} m · ${FORMAS[e.forma||'rect'].toLowerCase()} · ${e.pisos||1} piso${(e.pisos||1)>1?'s':''} · techo ${(TECHOS[e.techo]||'').toLowerCase()}${elMat(e)?' · '+elMat(e).n.toLowerCase():''}`;if(T.k==='linea')return`${fmt(elLen(e),1)} m de largo · ${fmt(e.h,1)} m de alto`;if(T.k==='punto')return`${fmt(e.w,1)} m de diámetro · ${fmt(e.h,1)} m de alto`;
  return`${fmt(e.w,1)} × ${fmt(e.l,1)} m`+(T.k==='vol'?` · ${fmt(e.h,1)} m de alto`:e.t==='piscina'?` · ${fmt(e.h,1)} m de profundidad`:'')}
/* distancia en planta de un punto al elemento (para no duplicar lo reconocido) */
function elDist(e,p){const T=eltOf(e);if(T.k==='linea'){const ax=e.a[0],ay=e.a[1],dx=e.b[0]-ax,dy=e.b[1]-ay,L2=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((p[0]-ax)*dx+(p[1]-ay)*dy)/L2));return Math.hypot(p[0]-ax-dx*t,p[1]-ay-dy*t)}
  const c=elCenter(e);return Math.max(0,Math.hypot(p[0]-c[0],p[1]-c[1])-Math.min(e.w||1,e.l||e.w||1)/2)}

/* ---------- 3D: grupo en coordenadas de three (x, altura, -y) ---------- */
function elem3D(e,o={}){const T=eltOf(e),g=new THREE.Group();g.userData.elem=e.id;
  const M=(tex,col,q={})=>typeof mStd==='function'?mStd(tex||'flat',col,q):new THREE.MeshStandardMaterial({color:col});
  const box=(w,h,d,mat,x=0,y=0,z=0)=>{const geo=new THREE.BoxGeometry(Math.max(.01,w),Math.max(.01,h),Math.max(.01,d));if(typeof uvWorld==='function')uvWorld(geo);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  const cyl=(r1,r2,h,mat,x=0,y=0,z=0,seg=14)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),mat);m.position.set(x,y,z);g.add(m);return m};
  const H=+e.h||T.h||1;const MT=elMat(e);
  const ext=(pts,depth,mat,y=0)=>{const sh=new THREE.Shape(pts.map(q=>new THREE.Vector2(q[0],q[1])));const geo=new THREE.ExtrudeGeometry(sh,{depth:Math.max(.01,depth),bevelEnabled:false});geo.rotateX(-Math.PI/2);if(typeof uvWorld==='function')uvWorld(geo);const m=new THREE.Mesh(geo,mat);m.position.y=y;g.add(m);return m};
  const grow=(pts,d)=>{const n=pts.length;return pts.map((p,i)=>{const a=pts[(i+n-1)%n],b=pts[(i+1)%n];const n1=[a[1]-p[1],p[0]-a[0]],n2=[p[1]-b[1],b[0]-p[0]];const nn=(v)=>{const L=Math.hypot(v[0],v[1])||1;return[v[0]/L,v[1]/L]};const u=nn(n1),v=nn(n2);const m=nn([u[0]+v[0],u[1]+v[1]]);const area=pts.reduce((s,q,j)=>{const r=pts[(j+1)%n];return s+q[0]*r[1]-r[0]*q[1]},0);const sg=area>0?-1:1;return[p[0]+m[0]*d*sg,p[1]+m[1]*d*sg]})};
  if((T.k==='vol'||T.k==='area')&&(T.edif||(e.forma&&e.forma!=='rect'))){const F=elLocalFoot(e);
    if(T.edif){const pis=Math.max(1,+e.pisos||1),HH=Math.max(2.2,+e.h||2.5*pis);const wm=M(MT?.tex||'stucco',MT?.col||T.col,{rough:.9});
      ext(F,HH,wm);for(let k=1;k<pis;k++)ext(grow(F,.05),.12,M('flat','#D9D6CF'),HH*k/pis-.06);
      const rm=M('flat','#8E8A84',{rough:.8});
      if(e.techo==='dos_aguas'&&(e.forma||'rect')==='rect'){const m=elRoof(+e.w,+e.l,e.cumbrera,+e.hTecho||0,rm);m.position.y=HH;g.add(m)}
      else if(e.forma==='circulo'&&e.techo!=='plano'){const c=new THREE.Mesh(new THREE.ConeGeometry((+e.w)/2+.3,Math.min(2,(+e.w)*.25),28),rm);c.position.y=HH+Math.min(2,(+e.w)*.25)/2;g.add(c)}
      else{const r=ext(grow(F,.3),.22,rm,HH);if(e.techo==='una_agua')r.rotation.x=.06}}
    else if(T.k==='vol'){const post=M(MT?.tex==='brick'?'brick':'woodV',MT?.col||'#6B5038',{rough:.85});for(const q of F)box(.12,H,.12,post,q[0],H/2,-q[1]);
      if(T.cerrado)ext(F,H,M(MT?.tex||'fenceWood',MT?.col||T.col,{rough:.85}));const r=ext(grow(F,.2),.06,M(MT&&/policarb/.test(e.mat)?'flat':'flat',MT?.col||T.col,{rough:.6}),H);r.userData.sk=e.mat==='policarbonato'?'vidrio':undefined;ext(F,.05,M('concrete','#B4B1AA'))}
    else ext(F,e.t==='piscina'?.06:H,M(T.tex,MT?.col||T.col,{rough:.9}));
    g.position.set(e.x,0,-e.y);g.rotation.y=e.rot||0}
  else if(T.k==='linea'){const L=elLen(e)||.1;const ang=Math.atan2(e.b[1]-e.a[1],e.b[0]-e.a[0]);
    const inner=new THREE.Group();inner.position.set((e.a[0]+e.b[0])/2,0,-(e.a[1]+e.b[1])/2);inner.rotation.y=ang;g.add(inner);
    const put=m=>{g.remove(m);inner.add(m);return m};
    const tx=MT?.tex||T.tex;const mat=M(tx,MT?.col||T.col,{rough:.6,metal:tx==='bars'||tx==='mesh'?.4:0,side:1});
    put(box(L,H,T.grueso||(e.t==='muro'?.15:.04),mat,0,H/2,0));
    if(e.t!=='muro'&&!T.grueso){const pm=M('flat','#2F3336',{rough:.5,metal:.3}),n=Math.max(1,Math.round(L/2.4));for(let k=0;k<=n;k++)put(box(.08,H+.05,.08,pm,-L/2+L*k/n,(H+.05)/2,0))}
    if(e.t==='porton')put(box(L,.08,.06,M('flat','#2F3336',{metal:.3}),0,H,0))}
  else if(T.k==='punto'){const R=(+e.w||T.w)/2;
    if(e.t==='arbol'){cyl(.12,.18,H*.45,M('bark','#5A4330',{rough:1}),0,H*.225,0);const c=new THREE.Mesh(new THREE.IcosahedronGeometry(R,1),M('flat',T.col,{rough:1}));c.position.y=H*.45+R*.8;c.scale.y=Math.max(.6,(H*.55)/(R*1.8));g.add(c)}
    else if(e.t==='palmera'){cyl(.13,.17,H,M('bark','#7A6650',{rough:1}),0,H/2,0);for(let k=0;k<7;k++){const f=box(R,.04,.35,M('flat',T.col,{rough:1}),Math.cos(k*.9)*R/2,H,-Math.sin(k*.9)*R/2);f.rotation.y=k*.9;f.rotation.z=-.35}}
    else if(e.t==='arbusto'){const c=new THREE.Mesh(new THREE.IcosahedronGeometry(R,1),M('flat',T.col,{rough:1}));c.position.y=H/2;c.scale.y=H/(2*R);g.add(c)}
    else if(e.t==='poste')cyl(R*.6,R,H,M('flat',T.col,{rough:.9}),0,H/2,0,10);
    else if(e.t==='estanque'){cyl(R,R,H,M('flat',T.col,{rough:.5}),0,H/2,0,20);cyl(R*.3,R*.3,.15,M('flat','#22292D'),0,H+.07,0)}
    else box(R*2,H,R*2,M('flat',T.col,{rough:.8}),0,H/2,0);
    g.position.set(e.x,0,-e.y)}
  else{const W=+e.w||T.w,Lg=+e.l||T.l||W;
    if(T.k==='area'){
      if(e.t==='piscina'){const bord=M('concrete','#D9D6CF',{rough:.8}),b=.3;
        box(W+2*b,.06,b,bord,0,.03,Lg/2+b/2);box(W+2*b,.06,b,bord,0,.03,-Lg/2-b/2);box(b,.06,Lg,bord,W/2+b/2,.03,0);box(b,.06,Lg,bord,-W/2-b/2,.03,0);
        const water=new THREE.Mesh(new THREE.PlaneGeometry(W,Lg),new THREE.MeshStandardMaterial({color:new THREE.Color(T.col).convertSRGBToLinear(),roughness:.08,metalness:.1,transparent:true,opacity:.85}));water.rotation.x=-Math.PI/2;water.position.y=-.08;water.userData.sk='agua';g.add(water);
        box(W,.02,Lg,M('flat','#2C7FA6'),0,-Math.min(H,2),0)}
      else if(e.t==='jardinera'){box(W,H,Lg,M('flat','#9A8F80',{rough:.9}),0,H/2,0);box(W-.1,.03,Lg-.1,M('dirt','#6E5137',{rough:1}),0,H+.01,0);
        for(let k=0;k<Math.max(1,Math.round(W/.7));k++){const c=new THREE.Mesh(new THREE.IcosahedronGeometry(.25,0),M('flat','#5B8A3C',{rough:1}));c.position.set(-W/2+.35+k*.7,H+.2,0);g.add(c)}}
      else if(e.t==='escalera'){const n=Math.max(2,Math.round(H/.18)),st=Lg/n;for(let k=0;k<n;k++)box(W,H*(k+1)/n,st,M('concrete',T.col,{rough:.9}),0,H*(k+1)/n/2,Lg/2-st*(k+.5))}
      else box(W,H,Lg,M(MT?.tex||T.tex,MT?.col||T.col,{rough:.9}),0,H/2,0)}
    else{/* construcción liviana: pilares y techo de una agua */
      const post=M('woodV','#6B5038',{rough:.85}),roof=M('flat',T.col,{rough:.6,metal:.2}),p=.12;
      for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,1]])box(p,H,p,post,u*(W/2-p/2),H/2,v*(Lg/2-p/2));
      if(T.cerrado){const wall=M(MT?.tex||'fenceWood',MT?.col||T.col,{rough:.85});box(W,H,.06,wall,0,H/2,Lg/2-.03);box(W,H,.06,wall,0,H/2,-Lg/2+.03);box(.06,H,Lg,wall,W/2-.03,H/2,0);box(.06,H,Lg,wall,-W/2+.03,H/2,0)}
      if(T.abierta){for(let k=0;k<Math.round(Lg/.5);k++)box(W+.3,.12,.06,post,0,H+.06,-Lg/2+.25+k*.5)}
      else{const r=box(W+.4,.06,Lg+.4,roof,0,H+.15,0);r.rotation.x=.08}
      if(e.t==='quincho'){box(1.2,.9,.6,M('brick','#9C5A3C',{rough:.9}),0,.45,Lg/2-.4);box(1.2,.05,.6,M('flat','#2B2B2B',{metal:.6}),0,.92,Lg/2-.4)}
      box(W,.05,Lg,M('concrete','#B4B1AA',{rough:.9}),0,.025,0)}
    g.position.set(e.x,0,-e.y);g.rotation.y=e.rot||0}
  if(e.sug||o.ghost){const gm=new THREE.MeshBasicMaterial({color:0xf2b705,transparent:true,opacity:.42,depthWrite:false});g.traverse(m=>{if(m.isMesh)m.material=gm})}
  g.traverse(m=>{if(m.isMesh){m.castShadow=!!o.shadows;m.receiveShadow=!!o.shadows;m.userData.elem=e.id}});
  return g}
/* techo a dos aguas sobre un rectángulo w × l centrado; cumbrera "paralela" corre a lo ancho (eje x) */
function elRoof(w,l,cumbrera,hr,mat){const a=.3,par=cumbrera==='paralela';const span=(par?l:w)/2+a,len=(par?w:l)/2+a;const h=hr>0?hr:Math.min(2,(par?l:w)*.22);
  const sh=new THREE.Shape([new THREE.Vector2(-span,0),new THREE.Vector2(span,0),new THREE.Vector2(0,h)]);const geo=new THREE.ExtrudeGeometry(sh,{depth:len*2,bevelEnabled:false});geo.translate(0,0,-len);
  if(par)geo.rotateY(Math.PI/2);const m=new THREE.Mesh(geo,mat||new THREE.MeshStandardMaterial({color:0x8e8a84}));m.userData.sk='blanco';return m}
/* Todos los elementos del proyecto en el recorrido 3D (ox, oz: retiros de la casa en el terreno) */
function buildElems3D(root,ox,oz){for(const e of P.elementos||[]){const g=elem3D(e,{shadows:true});g.position.x+=ox;g.position.z-=oz;if(e.proy)g.traverse(m=>{if(m.isMesh){m.material=new THREE.MeshStandardMaterial({color:0xff7a33,transparent:true,opacity:.55,roughness:.8});m.userData.noSketch=true;m.castShadow=false}});root.add(g)}}

/* ---------- planta del emplazamiento ---------- */
function elemSiteSVG(X,Y,s,hx,hy){let h='';const P2=p=>`${r2(X(hx+p[0]))},${r2(Y(hy+p[1]))}`;
  for(const e of P.elementos||[]){const T=eltOf(e);const pc=e.proy?'#d9480f':'#1b1e20';const st=`fill:${e.proy?'#ff7a3322':T.k==='vol'?'none':T.col+'55'};stroke:${pc};stroke-width:${T.k==='vol'||e.proy?.6:.3}${e.proy?';stroke-dasharray:2.5 1.2':''}`;
    if(T.k==='linea')h+=`<polyline points="${P2(e.a)} ${P2(e.b)}" style="fill:none;stroke:#1b1e20;stroke-width:${e.t==='muro'?1.2:.6};${e.t==='muro'?'':'stroke-dasharray:2 1'}"/>`;
    else if(T.k==='punto')h+=`<circle cx="${r2(X(hx+e.x))}" cy="${r2(Y(hy+e.y))}" r="${r2(Math.max(.15,(+e.w||1)/2)*s)}" style="${st}"/>`;
    else{h+=`<polygon points="${elFoot(e).map(P2).join(' ')}" style="${st}${T.k==='vol'?';stroke-dasharray:3 1.5':''}"/>`;
      if(T.k==='vol'||e.t==='piscina'||e.t==='fosa'||e.proy){const c=elCenter(e),fz=Math.max(1.6,s*.45);h+=`<text x="${r2(X(hx+c[0]))}" y="${r2(Y(hy+c[1]))}" font-size="${r2(fz)}" text-anchor="middle" class="tx" style="fill:${pc}">${esc(elNombre(e).toUpperCase())}</text><text x="${r2(X(hx+c[0]))}" y="${r2(Y(hy+c[1])+fz*1.15)}" font-size="${r2(fz*.75)}" text-anchor="middle" class="tx mono" style="fill:${pc}">${e.proy?'PROYECTADO · ':''}${fmt(e.w,1)} × ${fmt(e.l,1)}</text>`}}
    if(T.k==='punto'&&T.g==='Instalaciones'){h+=`<text x="${r2(X(hx+e.x)+s*.6)}" y="${r2(Y(hy+e.y))}" font-size="${r2(Math.max(1.4,s*.35))}" class="tx">${esc(elNombre(e))}</text>`}}
  return h}

/* ---------- tarjeta en el paso Terreno ---------- */
function elemCardHTML(){const L=P.elementos||[];
  return`<div class="card" id="elems"><div class="row sb"><h3>Elementos del terreno</h3><span class="lbl">${L.length?L.length+' registrado'+(L.length>1?'s':''):'Rejas, portones, pisos, piscina, árboles…'}</span></div>
  ${L.length?`<div class="list">${L.map(e=>{const T=eltOf(e);const ps=T.k!=='linea'?elPosLote(e):null;return`<div class="li elrow"><span><b>${esc(elNombre(e))}</b>${e.proy?' <span class="badge proy">Proyectado</span>':''}${e.est&&!e.proy?' <span class="lbl">estimado</span>':''}<br><small>${esc(T.g)} · ${elMedidas(e)}</small>${ps&&lotPoly()?`<span class="elpos"><label class="inp sm"><input data-elpos="${e.id}:x" inputmode="decimal" value="${String(rr1(ps[0])).replace('.',',')}" aria-label="Distancia al deslinde izquierdo"><em>m del deslinde izq.</em></label><label class="inp sm"><input data-elpos="${e.id}:y" inputmode="decimal" value="${String(rr1(ps[1])).replace('.',',')}" aria-label="Distancia a la línea de calle"><em>m de la calle</em></label></span>`:''}</span>
    <span class="row">${T.k==='linea'?`<label class="inp sm"><input data-elf="${e.id}:len" data-num inputmode="decimal" value="${String(rr1(elLen(e))).replace('.',',')}" aria-label="Largo"><em>m</em></label>`:`<label class="inp sm"><input data-elf="${e.id}:w" data-num inputmode="decimal" value="${String(rr1(e.w)).replace('.',',')}" aria-label="Ancho"><em>m</em></label>${T.k==='punto'?'':`<label class="inp sm"><input data-elf="${e.id}:l" data-num inputmode="decimal" value="${String(rr1(e.l)).replace('.',',')}" aria-label="Largo"><em>m</em></label>`}`}
    <button class="btn sm ghost" data-eldel="${e.id}" aria-label="Eliminar ${esc(elNombre(e))}">✕</button></span></div>`}).join('')}</div>`:'<p class="note">Se agregan solos al recorrer el terreno con «Medir en vivo», o elige uno aquí.</p>'}
  <div class="fld"><span>Agregar a mano</span><div class="chips">${['porton','reja','radier','ceramico','piscina','quincho','cobertizo','arbol','arbusto','fosa','pozoAbs','camaraIns','medidorAgua','medidorLuz'].map(k=>`<button class="chip" data-eladd="${k}">+ ${ELT[k].n}</button>`).join('')}</div></div>
  <p class="note">Se ubican junto a la casa; ajusta su posición en el recorrido en vivo o con las medidas.</p></div>`}
const rr1=v=>Math.round((+v||0)*100)/100;
document.addEventListener('click',e=>{const b=e.target.closest('[data-eldel],[data-eladd]');if(!b||document.getElementById('vivo'))return;
  if(b.dataset.eldel){P.elementos=(P.elementos||[]).filter(x=>x.id!==b.dataset.eldel);persist();const y=window.scrollY;render();window.scrollTo(0,y);return}
  if(b.dataset.eladd){const c=P.casa,W=+c.ancho||8,L=+c.largo||8;const n=(P.elementos||[]).length;const el=elemNew(b.dataset.eladd,[W+2.5+(n%3)*1.5,L/2-(n%4)],[0,1]);(P.elementos=P.elementos||[]).push(el);persist();const y=window.scrollY;render();window.scrollTo(0,y);toast(`${ELT[el.t].n} agregado junto a la casa.`)}});
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!t.dataset.elf||document.getElementById('vivo'))return;const [id,f]=t.dataset.elf.split(':');const el=(P.elementos||[]).find(x=>x.id===id);const v=num(t.value);if(!el||!(v>0))return;
  if(f==='len')elSetLen(el,v);else el[f]=v;persist();refreshLive()});
