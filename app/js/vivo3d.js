/* Huincha — croquis 3D del recorrido en vivo, elementos del terreno, reconocimiento con IA y deshacer.
   Se apoya en el estado VV de vivo.js. Coordenadas de planta de la casa: x a lo largo de la fachada, y hacia el fondo. */
"use strict";
const V3={r:null,scene:null,cam:null,root:null,dyn:null,host:null,sig:'',th:-0.75,ph:1.12,rad:18,tgt:[4,3],user:0,raf:0,dirty:true,ptrs:new Map(),pinch:0,moved:0};

/* ---------- deshacer y rehacer ---------- */
const VSNAP=['st','i','sides','corners','marks','vols','rooms','elems','dims','closeErr','anchor','steps','heads','counting','h0','fachW','techo','altoMuro','norte','pisos','fach'];
function vSnap(){if(!VV)return;const s={};for(const k of VSNAP)s[k]=VV[k]===undefined?null:JSON.parse(JSON.stringify(VV[k]));VV.hist.push(s);if(VV.hist.length>60)VV.hist.shift();VV.fut=[];vUndoBtns()}
function vRestore(s){for(const k of VSNAP)VV[k]=JSON.parse(JSON.stringify(s[k]));
  if(!Array.isArray(VV.heads))VV.heads=[];if(VV.steps==null)VV.steps=0;VV.counting=!!VV.counting;
  VV.meas=null;VV.vol=null;VV.room=null;VV.edit=null;VV.ia=null;VV.place=null;VV.sub=null;VV.sel=null;if(VV.eng==='ar'&&VV.st==='walk'&&!VV.anchor)VV.anchor=VV.corners[VV.corners.length-1]||null}
function vCur(){const s={};for(const k of VSNAP)s[k]=VV[k]===undefined?null:JSON.parse(JSON.stringify(VV[k]));return s}
function vUndo(){if(!VV.hist.length){toast('No hay nada que deshacer.');return}VV.fut.push(vCur());vRestore(VV.hist.pop());toast('Deshecho.');vPanel();vCroquis();vUndoBtns()}
function vRedo(){if(!VV.fut.length)return;VV.hist.push(vCur());vRestore(VV.fut.pop());toast('Rehecho.');vPanel();vCroquis();vUndoBtns()}
function vUndoBtns(){const u=$('#vundo'),r=$('#vredo');if(u)u.disabled=!VV?.hist.length;if(r)r.disabled=!VV?.fut.length}

/* ---------- posición actual en la planta ---------- */
const deg=Math.PI/180;
function vToHouse(p){const c=VV.corners;if(VV.arRef?.prio)return vArRefPlan(p);if(c.length>=2)return vArPlan(p);if(VV.arRef)return vArRefPlan(p);if(c.length===1)return[p[0]-c[0][0],-(p[2]-c[0][2])];return[p[0],-p[2]]}
/* Elementos marcados con realidad aumentada antes de conocer el frente: se reubican cuando ya hay dos esquinas */
function vFixAR(){if(VV.eng!=='ar'||VV.corners.length<2)return;for(const e of VV.elems){if(!e._ar)continue;const k=eltOf(e).k;
    if(k==='linea'){e.a=vToHouse(e._ar[0]);e.b=vToHouse(e._ar[1]||e._ar[0])}else if(e._ar.length>=2&&k!=='punto'){const a=vToHouse(e._ar[0]),b=vToHouse(e._ar[1]);e.x=(a[0]+b[0])/2;e.y=(a[1]+b[1])/2}else{const q=vToHouse(e._ar[0]);e.x=q[0];e.y=q[1]}
    delete e._ar}}
/* Dirección de la cámara en la planta según la brújula (pasos) */
function vHeadDir(h){if(h==null||VV.h0==null)return null;const a=(h-VV.h0)*deg;return[Math.cos(a),-Math.sin(a)]}
function vHere(){
  if(VV.eng==='ar'){const a=VV.ar;if(!a?.cam||(VV.corners.length<1&&!VV.arRef))return null;const p=vToHouse(a.cam),q=vToHouse([a.cam[0]+a.fwd[0],a.cam[1],a.cam[2]+a.fwd[2]]);const d=[q[0]-p[0],q[1]-p[1]],n=Math.hypot(...d)||1;return{p,dir:[d[0]/n,d[1]/n]}}
  const {pts,ang}=vPoly(),cur=pts[pts.length-1],wd=[Math.cos(ang),Math.sin(ang)];
  if(VV.st==='walk'){const d=VV.counting?VV.steps*VV.paso:0;const p=[cur[0]+wd[0]*d,cur[1]+wd[1]*d];VV.dr=p.slice();return{p,dir:vHeadDir(VV.head)||VV.fixDir||wd}}
  return{p:VV.dr||cur,dir:vHeadDir(VV.head)||VV.fixDir||wd}}
/* Un paso detectado fuera de la medición de lados: mueve la posición estimada */
function vDR(){if(!VV||VV.eng==='ar'||VV.st==='walk'||!VV.dr)return;const d=vHeadDir(VV.head);if(!d)return;VV.dr=[VV.dr[0]+d[0]*VV.paso,VV.dr[1]+d[1]*VV.paso];vCroquis()}

/* ---------- vista 3D ---------- */
function vSvgDrag(){const svg=$('#vsvg');if(!svg||svg._drag)return;svg._drag=1;
  const toPlan=ev=>{const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const q=pt.matrixTransform(svg.getScreenCTM().inverse());return[q.x,-q.y]};
  svg.addEventListener('pointerdown',ev=>{const h=ev.target.closest('[data-vh]');if(!h)return;const e=VV.elems.find(q=>q.id===VV.sel);if(!e||!e.pts)return;ev.preventDefault();vSnap();VV.drag={i:+h.dataset.vh};svg.setPointerCapture(ev.pointerId)});
  svg.addEventListener('pointermove',ev=>{if(!VV?.drag)return;const e=VV.elems.find(q=>q.id===VV.sel);if(!e)return;const [px,py]=toPlan(ev),c=Math.cos(-(e.rot||0)),s2=Math.sin(-(e.rot||0)),dx=px-e.x,dy=py-e.y;
    e.pts[VV.drag.i]=[rr2(dx*c-dy*s2),rr2(dx*s2+dy*c)];vCroquis()});
  const end=()=>{if(!VV?.drag)return;VV.drag=null;const e=VV.elems.find(q=>q.id===VV.sel);if(e?.pts){const xs=e.pts.map(p=>p[0]),ys=e.pts.map(p=>p[1]);e.w=rr2(Math.max(...xs)-Math.min(...xs));e.l=rr2(Math.max(...ys)-Math.min(...ys))}vCroquis();vPanel()};
  svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end)}
function v3dInit(){vSvgDrag();const host=$('#v3d');if(!host||!window.THREE)return;V3.host=host;
  const r=new THREE.WebGLRenderer({antialias:true,alpha:false});r.setPixelRatio(Math.min(devicePixelRatio||1,2));r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;
  r.setClearColor(0xffffff);r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(r.domElement);V3.r=r;
  const S=new THREE.Scene();V3.scene=S;S.fog=new THREE.Fog(0xe9eef0,40,120);
  V3.hemi=new THREE.HemisphereLight(0xffffff,0x9a9f94,.9);S.add(V3.hemi);const sun=new THREE.DirectionalLight(0xffffff,.85);sun.position.set(-10,18,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:80});sun.shadow.bias=-0.0005;S.add(sun);S.add(sun.target);V3.sun=sun;
  V3.gmC=new THREE.MeshLambertMaterial({color:0xffffff});V3.gmK=new THREE.MeshStandardMaterial({color:new THREE.Color('#d9dccf').convertSRGBToLinear(),roughness:1});
  const gr=new THREE.Mesh(new THREE.PlaneGeometry(400,400),V3.gmC);gr.rotation.x=-Math.PI/2;gr.position.y=-.01;gr.receiveShadow=true;gr.userData.noSketch=true;S.add(gr);V3.ground=gr;
  const grid=new THREE.GridHelper(200,200,0xdfe2e3,0xebedee);grid.position.y=0;S.add(grid);V3.grid=grid;
  V3.cam=new THREE.PerspectiveCamera(50,1,.1,400);V3.dyn=new THREE.Group();S.add(V3.dyn);
  const el=r.domElement;el.style.touchAction='none';
  el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);V3.ptrs.set(e.pointerId,[e.clientX,e.clientY]);V3.moved=0;V3.down=[e.clientX,e.clientY];if(V3.ptrs.size===2){const [a,b]=[...V3.ptrs.values()];V3.pinch=Math.hypot(a[0]-b[0],a[1]-b[1])}});
  el.addEventListener('pointermove',e=>{if(!V3.ptrs.has(e.pointerId))return;const o=V3.ptrs.get(e.pointerId);const dx=e.clientX-o[0],dy=e.clientY-o[1];V3.ptrs.set(e.pointerId,[e.clientX,e.clientY]);V3.moved+=Math.abs(dx)+Math.abs(dy);
    if(V3.ptrs.size===1){V3.th-=dx*.008;V3.ph=Math.max(.15,Math.min(1.45,V3.ph-dy*.006))}
    else if(V3.ptrs.size===2){const [a,b]=[...V3.ptrs.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(V3.pinch)V3.rad=Math.max(3,Math.min(90,V3.rad*V3.pinch/d));V3.pinch=d}
    V3.user=1;V3.dirty=true});
  const up=e=>{V3.ptrs.delete(e.pointerId);if(V3.ptrs.size<2)V3.pinch=0;if(V3.moved<8&&e.type==='pointerup')v3dPick(e)};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  el.addEventListener('wheel',e=>{e.preventDefault();V3.rad=Math.max(3,Math.min(90,V3.rad*(e.deltaY>0?1.1:.9)));V3.user=1;V3.dirty=true},{passive:false});
  el.addEventListener('dblclick',()=>{V3.user=0;V3.sig='';vCroquis()});
  const loop=()=>{if(!V3.r)return;V3.raf=requestAnimationFrame(loop);v3dSize();if(V3.dirty){V3.dirty=false;v3dCam();V3.r.render(V3.scene,V3.cam)}};loop()}
function v3dSize(){const h=V3.host;if(!h||!V3.r)return;const w=h.clientWidth,ht=h.clientHeight;if(!w||!ht)return;if(V3.w!==w||V3.h!==ht){V3.w=w;V3.h=ht;V3.r.setSize(w,ht,false);V3.r.domElement.style.width=w+'px';V3.r.domElement.style.height=ht+'px';V3.cam.aspect=w/ht;V3.cam.updateProjectionMatrix();V3.dirty=true}}
function v3dCam(){const [tx,ty]=V3.tgt,c=V3.cam,R=V3.rad;c.position.set(tx+R*Math.sin(V3.ph)*Math.sin(V3.th),R*Math.cos(V3.ph),-ty+R*Math.sin(V3.ph)*Math.cos(V3.th));c.lookAt(tx,0.8,-ty)}
function v3dDispose(){cancelAnimationFrame(V3.raf);if(V3.r){V3.r.dispose();V3.r.domElement.remove()}Object.assign(V3,{r:null,scene:null,root:null,dyn:null,host:null,sig:'',user:0})}
function v3dPick(e){if(!V3.root)return;const rc=V3.r.domElement.getBoundingClientRect();const m=new THREE.Vector2((e.clientX-rc.left)/rc.width*2-1,-(e.clientY-rc.top)/rc.height*2+1);
  const ray=new THREE.Raycaster();ray.setFromCamera(m,V3.cam);const hit=ray.intersectObjects(V3.root.children,true).find(h=>h.object.userData.elem||h.object.userData.side!=null);
  if(!hit){if(VV.sel){VV.sel=null;if(VV.sub==='edit')VV.sub=null;vPanel();vCroquis()}return}
  if(hit.object.userData.elem){vSelElem(hit.object.userData.elem);return}
  if(hit.object.userData.side!=null&&VV.sides[hit.object.userData.side]){VV.edit=hit.object.userData.side;vPanel()}}

/* Arma la escena cuando cambia algo; lo que se mueve (posición y lado en curso) se actualiza siempre */
function v3dUpdate(){if(!V3.r||!VV)return;vFixAR();
  const sig=JSON.stringify([VV.sides,VV.techo,VV.fachW,VV.altoMuro,VV.pisos,VV.marks.map(m=>[m.side,m.pos,m.tipo,m.sug,m.ancho,m.alto,m.antepecho]),VV.vols,VV.vol,VV.elems,VV.sel,VV.dims,VV.st==='walk']);
  if(sig!==V3.sig){V3.sig=sig;v3dBuild()}
  v3dDyn();V3.dirty=true}
function v3dBuild(){const S=V3.scene;if(V3.root){S.remove(V3.root);V3.root.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  const root=new THREE.Group();V3.root=root;S.add(root);
  const H=+P.casa.altura||2.4,{pts}=vPoly();const wallM=new THREE.MeshStandardMaterial({color:new THREE.Color('#efe9dc').convertSRGBToLinear(),roughness:.9});
  const box=(w,h,d,mat,x,y,z,ry=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.rotation.y=ry;root.add(m);return m};
  /* muros del contorno */
  for(let j=0;j<VV.sides.length;j++){const a=pts[j],b=pts[j+1];if(!a||!b)continue;const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<.05)continue;const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
    const w=box(L+.15,H,.15,wallM,(a[0]+b[0])/2,H/2,-(a[1]+b[1])/2,ang);w.userData.side=j;
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(w.geometry),new THREE.LineBasicMaterial({color:0x14191a}));w.add(edge)}
  /* contorno cerrado: radier bajo la casa y losa de techo con alero, como en un croquis de volumen */
  if(VV.sides.length>=3&&VV.sides[VV.sides.length-1]?.closing){const poly=pts.slice(0,-1);
    const slab=(off,y,t,mat)=>{const c=poly.reduce((a,q)=>[a[0]+q[0]/poly.length,a[1]+q[1]/poly.length],[0,0]);const sh=new THREE.Shape(poly.map(q=>{const dx=q[0]-c[0],dy=q[1]-c[1],d=Math.hypot(dx,dy)||1;return new THREE.Vector2(q[0]+dx/d*off*1.41,q[1]+dy/d*off*1.41)}));
      const g=new THREE.ExtrudeGeometry(sh,{depth:t,bevelEnabled:false});g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.y=y;root.add(m);return m};
    slab(.1,0,.15,new THREE.MeshStandardMaterial({color:0xd8d4cc,roughness:1})).userData.sk='gris';
    const T=VV.techo;if(T&&T.tipo==='dos-aguas'&&poly.length===4){const xs=poly.map(q=>q[0]),ys=poly.map(q=>q[1]);const W=Math.max(...xs)-Math.min(...xs),Lr=Math.max(...ys)-Math.min(...ys);
      const r=elRoof(W,Lr,T.cumbrera,T.alto||0,new THREE.MeshStandardMaterial({color:0x9b4a33,roughness:.8}));r.position.set(Math.min(...xs)+W/2,H,-(Math.min(...ys)+Lr/2));root.add(r)}
    else{const techo=slab(+P.casa.alero||.5,H,.22,new THREE.MeshStandardMaterial({color:0xf4f2ee,roughness:.9}));techo.userData.sk='blanco';if(T?.tipo==='un-agua')techo.rotation.x=.05}}
  /* puertas y ventanas marcadas */
  const cp0=vCasaPrevia(),rect=cp0&&cp0.forma==='rect'?[[0,0],[cp0.w,0],[cp0.w,cp0.l],[0,cp0.l],[0,0]]:null;
  for(const m of VV.marks){if(m.tipo==='otro')continue;const j=m.side,a=(VV.sides.length?pts:rect||pts)[j];if(!a)continue;const b=(VV.sides.length?pts:rect||pts)[j+1]||null;const {ang}=vPoly();
    const dir=b?Math.atan2(b[1]-a[1],b[0]-a[0]):ang;const L=vSideLen(j)||(b?Math.hypot(b[0]-a[0],b[1]-a[1]):0)||m.pos||1;const t=b?Math.min(1,(m.pos||0)/L):0;const px=b?a[0]+(b[0]-a[0])*t:a[0]+Math.cos(dir)*(m.pos||0),py=b?a[1]+(b[1]-a[1])*t:a[1]+Math.sin(dir)*(m.pos||0);
    const isP=m.tipo==='puerta',w=+m.ancho||(isP?.9:1.2),h=+m.alto||(isP?2.05:1.1),z0=m.antepecho!=null?+m.antepecho:(isP?0:1);const nx=Math.sin(dir)*.1,ny=-Math.cos(dir)*.1;
    if(m.sug){box(w,h,.08,new THREE.MeshBasicMaterial({color:0xf2b705,transparent:true,opacity:.5}),px+nx,z0+h/2,-(py+ny),dir);continue}
    const fr=new THREE.MeshStandardMaterial({color:0x3c4144,roughness:.6}),cx=px+nx,cz=-(py+ny),c=Math.cos(dir),s2=Math.sin(dir);
    /* marco */for(const [u,v,ww,hh] of [[0,h/2-.03,w,.06],[0,-h/2+.03,w,.06],[-w/2+.03,0,.06,h],[w/2-.03,0,.06,h]]){const b=box(ww,hh,.1,fr,cx+u*c,z0+h/2+v,cz-u*s2,dir);b.userData.sk='oscuro'}
    const pane=box(w-.1,h-.1,.03,isP?new THREE.MeshStandardMaterial({color:0x7a4e2d}):new THREE.MeshStandardMaterial({color:0x9fbfcc,transparent:true,opacity:.35}),cx,z0+h/2,cz,dir);pane.userData.sk=isP?'tablas':'vidrio';
    if(!isP){const mu=box(.04,h-.1,.05,fr,cx,z0+h/2,cz,dir);mu.userData.sk='oscuro'}}
  /* volúmenes fuera del contorno (domo, segundo piso…) */
  const D=vDims();for(const v of [...VV.vols,VV.vol].filter(Boolean)){const g=vLiveVol(v,D.W||vSideLen(0)||0,D.L||vSideLen(1)||0);if(!g)continue;const z0=+v.nivel||0;const mat=new THREE.MeshStandardMaterial({color:0xf2c94c,roughness:.7,transparent:true,opacity:.85});
    if(g.circ){const s=new THREE.Mesh(new THREE.SphereGeometry(g.r,24,12,0,Math.PI*2,0,Math.PI/2),mat);s.position.set(g.cx,z0,-g.cy);root.add(s)}
    else box(g.w,2.4,g.h,mat,g.cx,z0+1.2,-g.cy);
    if(z0>0.3){const pm=new THREE.MeshStandardMaterial({color:0x6b5038});const r=g.circ?g.r*.7:0;for(const [u,w] of g.circ?[[r,0],[-r,0],[0,r],[0,-r]]:[[g.w/2-.1,g.h/2-.1],[-g.w/2+.1,g.h/2-.1],[g.w/2-.1,-g.h/2+.1],[-g.w/2+.1,-g.h/2+.1]])box(.12,z0,.12,pm,g.cx+u,z0/2,-(g.cy+w))}}
  /* foto aérea propia sobre el suelo del croquis */
  {const A=P.lote.aerea;if(A?.plan?.length===3){const ox=+P.casa.retiroIzq||0,oy=+P.casa.retiroFrontal||0;const [a,b,c]=A.plan.map(q=>[q[0]-ox,q[1]-oy]);const d=[b[0]+c[0]-a[0],b[1]+c[1]-a[1]];
    if(!V3.aerTex||V3.aerRef!==A.ref){V3.aerRef=A.ref;V3.aerTex=new THREE.TextureLoader().load(phSrc(A.ref),()=>{V3.dirty=true});V3.aerTex.encoding=THREE.sRGBEncoding}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([a[0],.01,-a[1],b[0],.01,-b[1],d[0],.01,-d[1],c[0],.01,-c[1]],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,1,1,1,0,0,0],2));g.setIndex([0,3,1,1,3,2]);
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:V3.aerTex,side:THREE.DoubleSide,transparent:true,opacity:.92,depthWrite:false}));m.userData.noSketch=true;m.renderOrder=-1;root.add(m)}}
  /* deslindes del terreno (medidos en el mapa o escritos), ubicados según los retiros de la casa */
  {const LP=vLotePlan();if(LP){const pts3=LP.map(q=>new THREE.Vector3(q[0],.03,-q[1]));const ln=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts3),new THREE.LineDashedMaterial({color:0x3a4044,dashSize:.6,gapSize:.3}));ln.computeLineDistances();ln.userData.noSketch=true;root.add(ln);
    for(const q of LP){const m=new THREE.Mesh(new THREE.BoxGeometry(.15,1.2,.15),new THREE.MeshStandardMaterial({color:0x8b6440}));m.position.set(q[0],.6,-q[1]);root.add(m)}}}
  {const cp=vCasaPrevia();if(cp){const g=elem3D(cp);g.traverse(m=>{if(m.isMesh)m.userData.elem=null});root.add(g)}}
  vRooms3D(root);
  /* elementos */
  for(const e of VV.elems){const g=elem3D(e);root.add(g);if(e.id===VV.sel){const bh=new THREE.BoxHelper(g,0xff5a1f);bh.userData.noSketch=true;root.add(bh)}}
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  if(VV.estilo!=='color')sketchify(root,{shadows:true});v3dStyle()
  /* encuadre automático hasta que el usuario mueva la vista */
  {const bb=new THREE.Box3().setFromObject(root);if(!bb.isEmpty()){const c=bb.getCenter(new THREE.Vector3());V3.sun.target.position.set(c.x,0,c.z);V3.sun.position.set(c.x-10,18,c.z+12)}}
  if(!V3.user){const bb=new THREE.Box3().setFromObject(root);if(!bb.isEmpty()){const c=bb.getCenter(new THREE.Vector3()),s=bb.getSize(new THREE.Vector3());V3.tgt=[c.x,-c.z];V3.rad=Math.max(8,Math.max(s.x,s.z)*1.35+4)}else{V3.tgt=[0,0];V3.rad=14}}}
function v3dStyle(){const c=VV.estilo!=='color';V3.r.setClearColor(c?0xffffff:0xe9eef0);V3.ground.material=c?V3.gmC:V3.gmK;V3.scene.fog.color.set(c?0xffffff:0xe9eef0);V3.hemi.intensity=c?.95:.85}
function v3dDyn(){const G=V3.dyn;while(G.children.length){const o=G.children.pop();o.geometry?.dispose()}
  const {pts,ang}=vPoly(),cur=pts[pts.length-1];
  /* lado en curso */
  if(VV.st==='walk'){let e=null;if(VV.eng==='ar'){const c=VV.ar?.centro?.p;if(c){if(VV.corners.length>=2)e=vArPlan(c);else if(VV.corners.length===1){const d=hdist(VV.corners[0],c);e=[cur[0]+d*Math.cos(ang),cur[1]+d*Math.sin(ang)]}}}
    else if(VV.counting){const d=VV.steps*VV.paso;e=[cur[0]+d*Math.cos(ang),cur[1]+d*Math.sin(ang)]}
    if(e){const L=Math.hypot(e[0]-cur[0],e[1]-cur[1]);if(L>.05){const m=new THREE.Mesh(new THREE.BoxGeometry(L,+P.casa.altura||2.4,.06),new THREE.MeshBasicMaterial({color:0xe08a00,transparent:true,opacity:.35,depthWrite:false}));m.position.set((cur[0]+e[0])/2,(+P.casa.altura||2.4)/2,-(cur[1]+e[1])/2);m.rotation.y=Math.atan2(e[1]-cur[1],e[0]-cur[0]);G.add(m)}}}
  /* dónde estás */
  const here=vHere();if(here){const m=new THREE.Mesh(new THREE.ConeGeometry(.35,.9,16),new THREE.MeshBasicMaterial({color:0xff5a1f}));m.rotation.z=-Math.PI/2;const g=new THREE.Group();g.add(m);m.position.x=.2;g.position.set(here.p[0],.5,-here.p[1]);g.rotation.y=Math.atan2(here.dir[1],here.dir[0]);G.add(g)}}

/* polígono del terreno en la planta de la casa */
function vLotePlan(){const LP=typeof lotPoly==='function'?lotPoly():null;if(!LP)return null;const c=P.casa,ox=+c.retiroIzq||0,oy=+c.retiroFrontal||0;return LP.map(q=>[q[0]-ox,q[1]-oy])}
/* ---------- croquis 2D: elementos ---------- */
function vCasaPrevia(){const c=P.casa,F=VV.fachW||{};if(VV.sides.length)return null;const W=+c.ancho||F[0]||F[2]||0,L=+c.largo||F[1]||F[3]||(W?W*.8:0);if(!(W>0&&L>0))return null;
  const T=VV.techo,tt=T?.tipo||c.techo;const cm=+c.ancho>0&&c.contornoMapa;
  return{id:'casa0',t:'edificacion',nombre:'Casa',x:W/2,y:L/2,w:W,l:L,rot:0,forma:cm?'libre':'rect',pts:cm?c.contornoMapa.map(q=>[q[0]-W/2,q[1]-L/2]):null,pisos:VV.pisos||1,techo:tt==='plana'?'plano':tt==='dos-aguas'?'dos_aguas':'una_agua',cumbrera:T?.cumbrera||c.cumbrera,hTecho:T?.alto||0,h:VV.altoMuro||+c.altura||2.4}}
function vElemSVG(){let h=vRoomsSVG();{const cp=vCasaPrevia();if(cp)h+=`<polygon class="vcasa0" points="${elFoot(cp).map(q=>`${q[0]},${-q[1]}`).join(' ')}"/><text x="${cp.x}" y="${-cp.y}" text-anchor="middle" class="vtx">Casa (del mapa)</text>`}{const LP=vLotePlan();if(LP)h+=`<polygon class="vlot" points="${LP.map(q=>`${q[0]},${-q[1]}`).join(' ')}"/>`}for(const e of VV.elems){const T=eltOf(e),cl=`vel${e.sug?' sug':''}${e.id===VV.sel?' sel':''}`;const P2=p=>`${p[0]},${-p[1]}`;
    if(T.k==='linea')h+=`<g class="${cl}" data-vel="${e.id}"><line x1="${e.a[0]}" y1="${-e.a[1]}" x2="${e.b[0]}" y2="${-e.b[1]}" class="ln" style="stroke:${T.col}"/><line x1="${e.a[0]}" y1="${-e.a[1]}" x2="${e.b[0]}" y2="${-e.b[1]}" class="hit"/></g>`;
    else if(T.k==='punto')h+=`<g class="${cl}" data-vel="${e.id}"><circle cx="${e.x}" cy="${-e.y}" r="${Math.max(.25,(e.w||1)/2)}" style="fill:${T.col}"/></g>`;
    else h+=`<g class="${cl}" data-vel="${e.id}"><polygon points="${elFoot(e).map(P2).join(' ')}" style="fill:${T.col}"/>${T.k==='vol'||e.t==='piscina'?`<text x="${e.x}" y="${-e.y+.2}" text-anchor="middle" class="vtx">${esc(elNombre(e))}</text>`:''}</g>`}
  const sel=VV.elems.find(e=>e.id===VV.sel);if(sel&&sel.forma==='libre'&&sel.pts)elFoot(sel).forEach((q,i)=>{h+=`<circle class="vvh" data-vh="${i}" cx="${q[0]}" cy="${-q[1]}" r=".4"/>`});
  const here=VV.eng==='pasos'&&VV.st!=='walk'&&VV.dr?VV.dr:null;if(here)h+=`<circle class="vme" cx="${here[0]}" cy="${-here[1]}" r=".35"/>`;
  return h}

/* ---------- agregar elementos ---------- */
const veBtn=(act,lab,cl='btn')=>`<button class="${cl}" type="button" data-ve="${act}">${lab}</button>`;
function vSelElem(id){VV.sel=id;VV.sub='edit';VV.place=null;vPanel();vCroquis()}
function vPalHTML(){return`<p class="vq">${VV.retype?'¿Qué es entonces?':'¿Qué quieres agregar?'}</p>${ELT_GRUPOS.map(g=>`<div class="fld"><span>${g}</span><div class="chips">${Object.entries(ELT).filter(([,t])=>t.g===g).map(([k,t])=>`<button class="chip" data-ve="pick:${k}">${t.n}</button>`).join('')}</div></div>`).join('')}
  <div class="vacts">${veBtn('x','Cancelar','btn ghost')}</div>`}
function vPlaceHTML(){const pl=VV.place,T=ELT[pl.t],ar=VV.eng==='ar';const need=T.k==='punto'?1:2,n=pl.pts.length;
  if(ar){const what=T.k==='linea'?(n?'el otro extremo':'un extremo'):T.k==='punto'?'el centro, donde toca el suelo':(n?'la esquina opuesta':'una esquina');
    return`<p class="vq">${esc(T.n)}: apunta la mira a ${what} y toca «Marcar».</p><p class="vh">${T.k==='linea'?'Se mide el largo entre los dos extremos.':T.k==='punto'?'Después podrás ajustar el tamaño.':'Marca dos esquinas opuestas, en diagonal.'}</p>
      <div class="vacts">${veBtn('mark','Marcar','btn pri')}${veBtn('typ','Usar medidas típicas aquí','btn')}${veBtn('x','Cancelar','btn ghost')}</div>`}
  return`<p class="vq">${esc(T.n)}: ¿dónde está?</p><p class="vh">Apunta la cámara hacia él. Se ubica en la dirección de la cámara a la distancia que indiques; después puedes moverlo y ajustar sus medidas.</p>
    <div class="vin"><label class="fld"><span>Distancia desde ti</span><div class="inp"><input id="ve-dist" inputmode="decimal" placeholder="0"><em>m</em></div></label></div>
    <div class="vacts">${veBtn('here','Ubicar','btn pri')}${veBtn('x','Cancelar','btn ghost')}</div>`}
function vEditExtras(e){const T=eltOf(e);let h='';const chips=(k,opts,cur)=>`<div class="chips">${Object.entries(opts).map(([v,l])=>`<button class="chip" data-ve="vset:${k}:${v}" aria-pressed="${String(cur)===String(v)}">${l}</button>`).join('')}</div>`;
  if(T.k==='area'||T.k==='vol'){h+=`<div class="fld"><span>Forma</span>${chips('forma',FORMAS,e.forma||'rect')}</div>`;
    if(e.forma==='libre')h+=`<div class="vacts">${veBtn('v2d','Mover vértices en 2D','btn sm')}${veBtn('vaddv','+ vértice','btn sm')}${veBtn('vdelv','− vértice','btn sm')}</div>`}
  if(T.edif)h+=`<div class="fld"><span>Pisos</span>${chips('pisos',{1:'1',2:'2',3:'3'},e.pisos||1)}</div><div class="fld"><span>Techo</span>${chips('techo',TECHOS,e.techo||'dos_aguas')}</div>`;
  const mo=elMatOpts(e);if(mo)h+=`<div class="fld"><span>Material</span>${chips('mat',Object.fromEntries(Object.entries(mo).map(([k,m])=>[k,m.n])),e.mat||'')}</div>`;
  if(T.edif)h=`<label class="fld"><span>Nombre</span><div class="inp"><input data-vname value="${esc(elNombre(e))}"></div></label>`+h;
  return h}
function vEditHTML(){const e=VV.elems.find(x=>x.id===VV.sel);if(!e){VV.sub=null;return''}const T=eltOf(e);
  const f=(lab,k,v)=>`<label class="fld"><span>${lab}</span><div class="inp"><input data-vef="${k}" inputmode="decimal" value="${String(rr2(v)).replace('.',',')}"><em>m</em></div></label>`;
  const dims=T.k==='linea'?f('Largo','len',elLen(e))+f('Alto','h',e.h):T.k==='punto'?f('Diámetro','w',e.w)+f('Alto','h',e.h):f('Ancho','w',e.w)+f('Largo','l',e.l)+(T.k==='vol'||e.t==='piscina'||e.t==='escalera'||e.t==='jardinera'?f(e.t==='piscina'?'Profundidad':'Alto','h',e.h):'');
  return`<p class="vq">${esc(elNombre(e))}${e.sug?' <span class="badge">Reconocido por la IA</span>':''}</p>${e.det?`<p class="vh">${esc(e.det)}</p>`:''}
    <div class="vin vdims">${dims}</div>${vEditExtras(e)}
    <div class="vpad"><span class="lbl">Mover 25 cm</span>${veBtn('mv:-1:0','←','btn sm')}${veBtn('mv:0:-1','Hacia la calle','btn sm')}${veBtn('mv:0:1','Hacia el fondo','btn sm')}${veBtn('mv:1:0','→','btn sm')}${T.k!=='punto'?veBtn('rot','Girar 15°','btn sm')+veBtn('rot90','Girar 90°','btn sm'):''}</div>
    <div class="vacts">${e.sug?veBtn('ok:'+e.id,'Aceptar','btn pri'):veBtn('done','Listo','btn pri')}${veBtn('del:'+e.id,e.sug?'Descartar':'Eliminar','btn danger')}</div>`}
/* Validación: la IA pregunta por cada cosa que cree ver, una a la vez, con la foto y el punto marcado */
const ART={baranda:'una',muroContencion:'un',camino:'un',estacionamiento:'un',terraza:'una',rampa:'una',pilar:'un',chimenea:'una',edificacion:'una',porton:'un',reja:'una',cerco:'un',malla:'una',muro:'un',radier:'un',ceramico:'un piso de',baldosa:'un piso de',deck:'un',pasto:'',gravilla:'',tierra:'',piscina:'una',jardinera:'una',escalera:'una',quincho:'un',cobertizo:'un',carport:'un',pergola:'una',bodega:'una',galpon:'un',arbol:'un',arbusto:'un',palmera:'una',poste:'un',estanque:'un',medidor:'un',otro:'un elemento:'};
function vSugPend(){const E=VV.elems.filter(e=>e.sug).map(e=>({k:'e',o:e})),M=VV.marks.filter(m=>m.sug).map(m=>({k:'m',o:m}));return[...E,...M]}
/* Validación de cada cosa reconocida, en tres pasos cortos: qué es → cuánto mide (y forma) → de qué material */
function vSugHTML(){const L=vSugPend();if(!L.length){VV.sub=null;VV.sel=null;VV.val=null;return''}
  const it=L[0],o=it.o,img=o.fr&&VV.frames[o.fr];
  const foto=img?`<div class="vthumb"><span class="vti"${o.caja&&it.k==='e'?' data-fed="det"':''}><img src="${img}" alt="Imagen analizada" draggable="false">${o.caja?`<span class="vbox" data-fbox="d" style="left:${o.caja[0]*100}%;top:${o.caja[1]*100}%;width:${(o.caja[2]-o.caja[0])*100}%;height:${(o.caja[3]-o.caja[1])*100}%"><i class="fh" data-fh="tl"></i><i class="fh" data-fh="tr"></i><i class="fh" data-fh="bl"></i><i class="fh" data-fh="br"></i></span>`:`<span class="vdot" style="left:${(o.ix??.5)*100}%;top:${(o.iy??.5)*100}%"></span>`}</span></div>`:'';
  const esc0=VV.escena&&!VV.escenaVista?`<p class="vh"><b>Terreno:</b> ${esc(VV.escena.terreno)}${VV.escena.pendiente?' · '+esc(VV.escena.pendiente):''}. ${esc(VV.escena.resumen)}</p>`:'';
  if(esc0)setTimeout(()=>{if(VV)VV.escenaVista=1},0);
  const prog=`<span class="lbl">Validar · ${L.length===1?'última':`quedan ${L.length}`}</span>`;
  const pie=`<div class="vacts">${veBtn('okall','Aceptar todo lo que queda','btn sm ghost')}${veBtn('x','Después','btn sm ghost')}</div>`;
  if(it.k==='m'){const q=`¿Hay ${o.tipo==='puerta'?'una puerta':'una ventana'} aquí, en ${esc(sideName(o.side)).toLowerCase()}, a unos ${fmt(o.pos,1)} m de la esquina?`;
    return`${prog}${esc0}${foto}<p class="vq">${q}</p><div class="vacts">${veBtn('mok:'+o.id,'Sí','btn pri')}${veBtn('mswap:'+o.id,o.tipo==='puerta'?'Es una ventana':'Es una puerta','btn')}${veBtn('mdel:'+o.id,'No','btn')}</div>${pie}`}
  if(!VV.val||VV.val.id!==o.id)VV.val={id:o.id,paso:o.conf>=GAUTO_OK?'med':'id'};
  if(VV.sel!==o.id){VV.sel=o.id;setTimeout(()=>{V3.sig='';vCroquis()},0)}
  const T=eltOf(o),n=elNombre(o),art=T.edif?(/casa|vivienda/i.test(n)?'la':/piso|pieza|bodega|ampliaci/i.test(n)?(/piso/i.test(n)?'un':'una'):'una'):(ART[o.t]??'un'),nl=esc(n.toLowerCase());
  if(VV.val.paso==='id'){const alts=(o.alt||[]).map(k=>veBtn(`retype:${o.id}:${k}`,`Es ${ART[k]??''} ${ELT[k].n.toLowerCase()}`.replace(/\s+/g,' '),'btn'));
    return`${prog}${esc0}${foto}<p class="vq">¿Esto es ${art} ${nl}?</p><p class="vh">${o.det?esc(o.det)+' · ':''}${o.conf?`${Math.round(o.conf*100)}% seguro`:''}</p>
      <div class="vacts">${veBtn('vok:id','Sí','btn pri')}${alts.join('')}${veBtn('other:'+o.id,'Es otra cosa','btn')}${veBtn('del:'+o.id,'No hay nada','btn')}</div>${pie}`}
  if(VV.val.paso==='med'){const f=(lab,k,v)=>`<label class="fld"><span>${lab}</span><div class="inp"><input data-vvf="${k}" inputmode="decimal" value="${String(rr2(v)).replace('.',',')}"><em>m</em></div></label>`;
    const chips=(k,opts,cur)=>`<div class="chips">${Object.entries(opts).map(([v,l])=>`<button class="chip" data-ve="vset:${k}:${v}" aria-pressed="${String(cur)===String(v)}">${l}</button>`).join('')}</div>`;
    let body='';
    if(T.k==='linea')body=`<div class="vin vdims">${f('Largo','len',elLen(o))}${f('Alto','h',o.h)}</div>`;
    else if(T.k==='punto')body=`<div class="vin vdims">${f('Diámetro','w',o.w)}${f('Alto','h',o.h)}</div>`;
    else{body=`<div class="fld"><span>Forma de la planta</span>${chips('forma',FORMAS,o.forma||'rect')}</div><div class="vin vdims">${f(o.forma==='circulo'?'Diámetro':'Ancho','w',o.w)}${o.forma==='circulo'?'':f('Largo','l',o.l)}${T.k==='vol'&&!T.edif?f('Alto','h',o.h):''}</div>`;
      if(T.edif)body+=`<div class="fld"><span>Pisos</span>${chips('pisos',{1:'1',2:'2',3:'3'},o.pisos||1)}</div><div class="fld"><span>Techo</span>${chips('techo',TECHOS,o.techo||'dos_aguas')}</div>`;
      if(o.forma==='libre')body+=`<p class="vh">Ajusta los vértices arrastrándolos en la vista 2D del croquis.</p>`}
    return`${prog}${foto}<p class="vq">${o.conf>=GAUTO_OK?`Veo ${art} ${nl}. `:''}¿Cuánto mide?</p><p class="vh">Medidas estimadas por la IA; corrígelas si las conoces o mídelas con la cámara.</p>${body}
      <div class="vacts">${veBtn('vok:med','Usar estas medidas','btn pri')}${T.k!=='punto'?veBtn('vmed','Medir con la cámara','btn'):''}${o.conf>=GAUTO_OK?veBtn('other:'+o.id,'Es otra cosa','btn')+veBtn('del:'+o.id,'No hay nada','btn'):''}</div>${pie}`}
  const opts=elMatOpts(o)||{};
  return`${prog}<p class="vq">¿De qué material es ${art} ${nl}?</p><div class="chips vmats">${Object.entries(opts).map(([k,m])=>`<button class="chip" data-ve="vmat:${k}" aria-pressed="${o.mat===k}">${m.n}</button>`).join('')}<button class="chip" data-ve="vmat:">No sé</button></div>${pie}`}
/* el usuario ajustó el recuadro del elemento en la foto: sus medidas cambian en la misma proporción */
function vDetBoxCommit(){const e=VV.elems.find(q=>q.id===VV.val?.id);const nb=VV._detBox;VV._detBox=null;if(!e||!nb||!e.caja)return;vSnap();
  const rw=(nb[2]-nb[0])/((e.caja[2]-e.caja[0])||1),rh=(nb[3]-nb[1])/((e.caja[3]-e.caja[1])||1),T=eltOf(e);
  if(T.k==='linea')elSetLen(e,rr2(elLen(e)*rw));else{e.w=rr2(e.w*rw);if(T.k==='punto')e.l=e.w;else if(e.forma==='libre'&&e.pts)e.pts=e.pts.map(p=>[p[0]*rw,p[1]])}
  if(T.k!=='area'||e.t==='piscina')e.h=rr2((+e.h||T.h||1)*rh);e.caja=nb;vPanel();vCroquis()}
function vAceptar(e){vSnap();delete e.sug;delete e.alt;VV.val=null;VV.sel=null;VV.escenaVista=1;VV.sub=vSugPend().length?'sug':null;vPanel();vCroquis()}
function vListHTML(){const E=VV.elems,M=VV.marks;
  return`<p class="vq">Lo registrado</p>${!E.length&&!M.length?'<p class="vh">Todavía no hay elementos ni puertas o ventanas.</p>':''}
    <div class="vlist">${E.map(e=>`<div class="vli"><button class="lnk" data-ve="sel:${e.id}"><b>${esc(elNombre(e))}${e.sug?' (sugerido)':''}</b><small>${elMedidas(e)}</small></button>${veBtn('del:'+e.id,'✕','btn sm')}</div>`).join('')}
      ${M.map(m=>`<div class="vli"><span><b>${m.tipo==='puerta'?'Puerta':m.tipo==='ventana'?'Ventana':'Algo distinto'}</b><small>${esc(sideName(m.side))} · a ${fmt(m.pos,1)} m</small></span>${veBtn('mdel:'+m.id,'✕','btn sm')}</div>`).join('')}</div>
    <div class="vacts">${veBtn('x','Cerrar','btn pri')}</div>`}
function vSubHTML(){switch(VV.sub){case 'senal':return vSenalHTML();case 'pal':return vPalHTML();case 'place':return vPlaceHTML();case 'edit':return vEditHTML();case 'sug':return vSugHTML();case 'list':return vListHTML()}return''}
function vToolsHTML(){const n=VV.elems.filter(e=>e.sug).length+VV.marks.filter(m=>m.sug).length;
  return`${veBtn('senal',VV.senal?'👆 Toca la cámara…':'👆 Señalar','btn sm pri')}${veBtn('ubic',VV.ubicado?'📍 Corregir mi ubicación':'📍 ¿Dónde estoy?','btn sm')}${veBtn('pal','+ Elemento','btn sm')}${veBtn('det',VV.detBusy?'Reconociendo…':'Reconocer con IA','btn sm')}${veBtn('auto',VV.auto?'Automático: sí':'Automático: no','btn sm ghost')}${n?veBtn('sug',`Validar ${n}`,'btn sm pri'):''}${veBtn('list','Lista','btn sm ghost')}`}

/* Cambia el tipo de un elemento reconocido, manteniendo su ubicación */
function vRetype(id,t){const e=VV.elems.find(k=>k.id===id);if(!e||!ELT[t])return;vSnap();const c=elCenter(e),T=ELT[t];
  const ang=eltOf(e).k==='linea'?Math.atan2(e.b[1]-e.a[1],e.b[0]-e.a[0]):(e.rot||0);const n=elemNew(t,c,[Math.cos(ang),Math.sin(ang)]);
  if(T.k==='linea')elMove(n,-(n.b[0]-n.a[0])/2,-(n.b[1]-n.a[1])/2);
  Object.assign(n,{id:e.id,det:e.det,fr:e.fr,ix:e.ix,iy:e.iy});const i=VV.elems.indexOf(e);VV.elems[i]=n;VV.sub=vSugPend().length?'sug':null;toast(`Cambiado a ${T.n.toLowerCase()}.`);vPanel();vCroquis()}
/* Agrega un elemento en la planta y lo deja seleccionado para ajustarlo */
function vAddElem(e,{select=true}={}){VV.elems.push(e);if(select){VV.sel=e.id;VV.sub='edit'}VV.place=null;vPanel();vCroquis()}

/* ---------- reconocimiento con IA ---------- */
async function vCrop(blob,aspect){/* recorta la foto al formato de la pantalla para que x,y coincidan con la mira */
  try{const bm=await createImageBitmap(blob);let w=bm.width,h=bm.height,sx=0,sy=0;if(w/h>aspect){const nw=h*aspect;sx=(w-nw)/2;w=nw}else{const nh=w/aspect;sy=(h-nh)/2;h=nh}
    const k=Math.min(1,1280/Math.max(w,h));const cv=document.createElement('canvas');cv.width=Math.round(w*k);cv.height=Math.round(h*k);cv.getContext('2d').drawImage(bm,sx,sy,w,h,0,0,cv.width,cv.height);
    return await new Promise(r=>cv.toBlob(b=>r(b||blob),'image/jpeg',.82))}catch(e){return blob}}
function vDetCtx(){const lugar=VV.st==='walk'||VV.st==='confirm'?`caminando junto a: ${sideName(VV.i).toLowerCase()} de la casa`:VV.room?`dentro del recinto ${VV.room.nombre}`:'recorriendo el terreno alrededor de la casa';
  const ya=[...new Set(VV.elems.map(e=>elNombre(e)))];const es=VV.escena?`; ya se sabe del lugar: ${VV.escena.terreno}, pendiente ${VV.escena.pendiente}. ${VV.escena.resumen}`:'';
  return iaContexto(lugar+es+(ya.length?'; ya registrados (no repetir si son los mismos): '+ya.join(', '):''))}
async function vDetect(auto){if(!VV||VV.detBusy)return;const m=await IA.mode();if(!m){vIaEstado('err','La IA no está conectada en esta versión de la app.');if(!auto)toast('La IA todavía no está conectada en esta versión de la app. Puedes agregar los elementos con «+ Elemento».');VV.auto=false;vPanel();return}
  if(VV.guia&&!VV.guia.ok&&!VV.ubicado&&vPoseInicial(true))VV.guia.ok=1;
  VV.detBusy=true;vIaEstado('busy','La IA está mirando…');vPanel();let n=0;const nAuto=[];
  try{let blob=await vGrab();if(!blob)return;const ar=VV.eng==='ar';
    const asp=ar&&VV.ar?.w?VV.ar.w/VV.ar.h:null;if(asp)blob=await vCrop(blob,asp);
    const here=vHere(),hfov=ar&&VV.ar?.proj?2*Math.atan(1/VV.ar.proj[0])/deg:(()=>{const v=$('#vvid');return v&&v.videoWidth>v.videoHeight?63:48})();
    const snap=vCur();const res=await IA.detect(blob,vDetCtx());if(!VV)return;
    const fid='f'+Date.now();VV.frames[fid]=URL.createObjectURL(blob);const fk=Object.keys(VV.frames);while(fk.length>8){const k=fk.shift();if(!VV.elems.some(e=>e.fr===k)&&!VV.marks.some(m=>m.fr===k)){URL.revokeObjectURL(VV.frames[k]);delete VV.frames[k]}}
    if(res.preguntas?.length)iaGuardarPreguntas({preguntas:res.preguntas},1);
    if(res.escena&&res.escena.terreno&&!VV.escena){VV.escena=res.escena;toast(`Terreno reconocido: ${res.escena.terreno}${res.escena.pendiente?', '+res.escena.pendiente:''}.`)}
    for(const o of res.objetos){const T=ELT[o.tipo];let pt=null,arRaw=null;
      if(ar){try{const r=await arPlugin().hitTest({x:o.x,y:o.y});arRaw=r.p}catch(e){}
        if(!arRaw&&VV.ar?.cam&&o.dist){const f=VV.ar.fwd,a=-(o.x-.5)*hfov*deg,c=Math.cos(a),s=Math.sin(a);const dx=f[0]*c+f[2]*s,dz=-f[0]*s+f[2]*c,n2=Math.hypot(dx,dz)||1;arRaw=[VV.ar.cam[0]+dx/n2*o.dist,VV.ar.cam[1]-1.4,VV.ar.cam[2]+dz/n2*o.dist]}
        if(arRaw)pt=vToHouse(arRaw)}
      else if(here){const d=o.dist||3,base=Math.atan2(here.dir[1],here.dir[0])-(o.x-.5)*hfov*deg;pt=[here.p[0]+Math.cos(base)*d,here.p[1]+Math.sin(base)*d]}
      if(!pt)continue;const size=Math.max(o.ancho||T.w||T.len||1,o.largo||0);
      const principal=o.tipo==='edificacion'&&/casa|vivienda/i.test(o.nombreE||'')&&!/ampl|pieza|segundo|bodega/i.test(o.nombreE||'');
      if(principal&&(VV.sides.length||+P.casa.ancho>0||VV.elems.some(e=>e.principal)))continue;
      if(VV.elems.some(e=>e.t===o.tipo&&(o.tipo!=='otro'||e.nombre===o.nombre)&&elDist(e,pt)<Math.max(1.5,size*.6)))continue;
      const view=here?Math.atan2(pt[1]-here.p[1],pt[0]-here.p[0]):0;const perp=[-Math.sin(view),Math.cos(view)];
      const e=elemNew(o.tipo,pt,T.k==='linea'?perp:[1,0]);if(T.k==='linea'){if(o.ancho)elSetLen(e,o.ancho);/* elemNew parte desde pt: centrarlo */elMove(e,-(e.b[0]-e.a[0])/2,-(e.b[1]-e.a[1])/2)}
      else{if(o.ancho)e.w=o.ancho;if(o.largo)e.l=o.largo;if(T.k==='punto')e.l=e.w}
      if(o.alto)e.h=T.k==='area'&&o.tipo!=='piscina'&&o.tipo!=='escalera'&&o.tipo!=='jardinera'?e.h:o.alto;
      e.sug=true;if(o.material)e.mat=o.material;if(o.forma){e.forma=o.forma;if(o.forma==='libre')elToLibre(e)}if(T.edif){e.pisos=o.pisos||1;e.techo=o.techo||'dos_aguas';e.h=Math.max(2.4,o.alto||2.5*e.pisos);e.nombre=o.nombreE||null;e.principal=principal}e.caja=o.caja;e.est=true;e.etapa=vGuia()?.k||null;e.conf=o.conf;e.det=o.detalle;e.fr=fid;e.ix=o.x;e.iy=o.y;e.alt=o.alt;if(o.nombre)e.nombre=o.nombre;if(arRaw&&VV.corners.length<2)e._ar=[arRaw];VV.elems.push(e);n++}
    /* puertas y ventanas sobre el lado que se está recorriendo */
    if(VV.st==='walk'||VV.st==='confirm'){for(const v of res.vanos){let pos=vLiveDist()||0;
        if(ar&&VV.anchor){try{const r=await arPlugin().hitTest({x:v.x,y:v.y});pos=hdist(VV.anchor,r.p)}catch(e){continue}}
        if(VV.marks.some(m=>m.side===VV.i&&m.tipo===v.tipo&&Math.abs((m.pos||0)-pos)<.8))continue;VV.marks.push({id:uid(),side:VV.i,pos,tipo:v.tipo,sug:true,t:vRecT(),fr:fid,ix:v.x,iy:v.y});n++}}
    if(res.piso&&VV.room){VV.room.piso=res.piso;toast(`Piso de ${VV.room.nombre}: ${MATS.piso.opts[res.piso].n}.`)}
    vCajas(res.objetos,ar);VV.iaErr=null;VV.iaNext=0;vIaEstado('ok',res.objetos.length?`La IA ve: ${res.objetos.map(o=>o.nombreE||o.nombre||ELT[o.tipo].n).join(', ')}`:'La IA no ve elementos nuevos aquí. Apunta a la reja, el portón o la casa.');
    if(res.guia){VV.iaGuia={txt:res.guia,t:Date.now()};try{navigator.vibrate?.(60)}catch(e){}}
    if(nAuto.length)toast('Dibujado: '+nAuto.join(', ')+'.');
    if(n){VV.hist.push(snap);VV.fut=[];const pend=vSugPend().length;if(pend){if(!VV.sub&&!VV.meas)VV.sub='sug';else toast(`La IA encontró ${n} elemento${n>1?'s':''}: valídalo${n>1?'s':''} con «Validar».`)}}
    else if(!auto)toast('La IA no reconoció elementos nuevos en esta imagen.')}
  catch(err){const msg=iaErrorMsg(err)+(err?.code==='api'&&err?.message?` (${err.message})`:'');VV.iaErr=msg;VV.iaNext=Date.now()+(err?.code==='cuota'?60000:20000);vIaEstado('err',msg);if(!auto)toast(msg)}
  finally{if(VV){VV.detBusy=false;vPanel();vCroquis();vUndoBtns()}}}
setInterval(()=>{if(VV&&VV.auto&&!VV.detBusy&&!VV.sub&&!VV.meas&&document.visibilityState==='visible'&&Date.now()>(VV.iaNext||0))vDetect(true)},5000);
/* estado de la IA sobre la cámara */
function vIaEstado(k,txt){const el=$('#viast');if(!el)return;el.className='viast '+k;el.innerHTML=k==='err'?`<b>IA sin respuesta</b> ${esc(txt)} <button type="button" data-ve="det">Reintentar</button>`:esc(txt)}

/* recuadros sobre la cámara con lo que la IA reconoció */
function vCajas(objs,ar){const host=$('#vdet');if(!host)return;host.innerHTML='';const cam=$('#vcam');if(!cam)return;const W=cam.clientWidth,H=cam.clientHeight;let map;
  if(ar)map=(x,y)=>[x*W,y*H];else{const v=$('#vvid');const vw=v?.videoWidth||W,vh=v?.videoHeight||H,k=Math.max(W/vw,H/vh),dw=vw*k,dh=vh*k,ox=(W-dw)/2,oy=(H-dh)/2;map=(x,y)=>[ox+x*dw,oy+y*dh]}
  for(const o of objs){if(!o.caja)continue;const [x0,y0]=map(o.caja[0],o.caja[1]),[x1,y1]=map(o.caja[2],o.caja[3]);const d=document.createElement('div');d.className='vcaja';Object.assign(d.style,{left:x0+'px',top:y0+'px',width:Math.max(10,x1-x0)+'px',height:Math.max(10,y1-y0)+'px'});
    d.innerHTML=`<span>${esc(o.nombreE||o.nombre||ELT[o.tipo].n)}</span>`;host.appendChild(d)}
  clearTimeout(VV._cajasT);VV._cajasT=setTimeout(()=>{if($('#vdet'))$('#vdet').innerHTML=''},7000)}
/* ---------- acciones ---------- */
document.addEventListener('click',async ev=>{const b=ev.target.closest('[data-ve],[data-vel],[data-v3]');if(!b||!VV)return;
  if(b.dataset.vel){vSelElem(b.dataset.vel);return}
  if(b.dataset.v3){const a=b.dataset.v3;
    if(a==='undo')vUndo();else if(a==='redo')vRedo();
    else if(a==='vista'){VV.view=VV.view==='3d'?'2d':'3d';$('#vcro').dataset.view=VV.view;b.textContent=VV.view==='3d'?'Ver 2D':'Ver 3D';const lb=$('#vcro .vcro-lbl');if(lb)lb.textContent=VV.view==='3d'?'Croquis 3D · arrastra para girar · toca un elemento para editarlo':'Croquis · toca una medida o un elemento para corregirlo';V3.sig='';vCroquis()}
    else if(a==='big'){$('#vivo').classList.toggle('crobig');V3.dirty=true;setTimeout(()=>{V3.w=0;vCroquis()},60)}
    else if(a==='estilo'){VV.estilo=VV.estilo==='color'?'croquis':'color';b.textContent=VV.estilo==='color'?'Croquis':'Color';V3.sig='';vCroquis()}
    else if(a==='fit'){V3.user=0;V3.sig='';vCroquis()}
    return}
  const [a,x,y,z]=b.dataset.ve.split(':');const e=VV.elems.find(q=>q.id===(a==='sel'?x:VV.sel));
  switch(a){
    case 'pal':VV.sub='pal';VV.sel=null;vPanel();break;
    case 'pick':if(VV.retype){vRetype(VV.retype,x);VV.retype=null;break}VV.place={t:x,pts:[]};VV.sub='place';vPanel();break;
    case 'retype':vRetype(x,y);break;
    case 'vok':{const q=VV.elems.find(k=>k.id===VV.val?.id);if(!q)break;if(x==='id'){VV.val.paso='med';vPanel();break}
      if(elMatOpts(q))VV.val.paso='mat',vPanel();else vAceptar(q);break}
    case 'vmat':{const q=VV.elems.find(k=>k.id===VV.val?.id);if(!q)break;if(x)q.mat=x;vAceptar(q);toast(`${elNombre(q)} agregado al croquis.`);break}
    case 'vset':{const q=VV.elems.find(k=>k.id===VV.sel);if(!q)break;vSnap();if(x==='pisos'){q.pisos=+y;q.h=2.5*q.pisos}else q[x]=y;if(x==='forma'&&y==='libre')elToLibre(q);if(x==='forma'&&y==='circulo')q.l=q.w;vPanel();vCroquis();break}
    case 'vmed':{const q=VV.elems.find(k=>k.id===VV.sel);if(!q)break;const T=eltOf(q),prev=VV.st,sub=VV.sub;VV.sub=null;
      vMeas({label:T.k==='linea'?`Mide el largo de ${elNombre(q).toLowerCase()}`:`Mide el ancho de ${elNombre(q).toLowerCase()}`,help:VV.eng==='ar'?'Apunta a un extremo, marca, y luego al otro.':'Camina de un extremo al otro, o escribe la medida.',kind:'h',
        then:v=>{if(T.k==='linea')elSetLen(q,v);else{q.w=v;if(q.forma==='circulo')q.l=v}q.est=false;VV.st=prev;VV.sub=sub;vPanel();vCroquis()}});break}
    case 'dmed':{const q=VV.elems.find(k=>k.id===x);if(!q)break;VV.sel=x;const T=eltOf(q),prev=VV.st;
      const pasos=T.k==='linea'?[['len','el largo']]:T.k==='punto'?[['w','el diámetro']]:q.forma==='circulo'?[['w','el diámetro']]:[['w','el ancho'],['l','el largo']];
      const sig=i=>{if(i>=pasos.length){q.est=false;VV.st=prev;VV.sel=null;vPanel();vCroquis();toast(`${elNombre(q)} medido.`);return}const [k,lab]=pasos[i];
        vMeas({label:`${elNombre(q)}: mide ${lab}`,help:VV.eng==='ar'?'Apunta a un extremo, marca, y luego al otro.':'Camina de un extremo al otro, o escribe la medida.',kind:'h',then:v=>{if(k==='len')elSetLen(q,v);else q[k]=v;sig(i+1)}})};
      vSnap();sig(0);break}
    case 'vaddv':{const q=VV.elems.find(k=>k.id===VV.sel);if(!q)break;vSnap();elToLibre(q);let bi=0,bl=0;q.pts.forEach((p,i)=>{const r=q.pts[(i+1)%q.pts.length],l=Math.hypot(r[0]-p[0],r[1]-p[1]);if(l>bl){bl=l;bi=i}});
      const a=q.pts[bi],c=q.pts[(bi+1)%q.pts.length];q.pts.splice(bi+1,0,[(a[0]+c[0])/2,(a[1]+c[1])/2]);vPanel();vCroquis();break}
    case 'vdelv':{const q=VV.elems.find(k=>k.id===VV.sel);if(!q||!q.pts||q.pts.length<=3)break;vSnap();q.pts.pop();vPanel();vCroquis();break}
    case 'v2d':{VV.view='2d';$('#vcro').dataset.view='2d';const vb=document.querySelector('[data-v3="vista"]');if(vb)vb.textContent='Ver 3D';vCroquis();break}
    case 'other':VV.retype=x;VV.sub='pal';vPanel();break;
    case 'mswap':{const m=VV.marks.find(k=>k.id===x);if(m){vSnap();m.tipo=m.tipo==='puerta'?'ventana':'puerta';delete m.sug}vPanel();vCroquis();break}
    case 'x':VV.sub=null;VV.place=null;VV.sel=null;VV.retype=null;if(VV.escena)VV.escenaVista=1;vPanel();vCroquis();break;
    case 'mark':{const p=await arFix();if(!p)break;const pl=VV.place,T=ELT[pl.t];pl.pts.push(p);const need=T.k==='punto'?1:2;
      if(pl.pts.length<need){toast('Listo. Ahora el otro punto.');vPanel();break}
      vSnap();const H=pl.pts.map(vToHouse);let el;
      if(T.k==='linea'){el=elemNew(pl.t,H[0],[H[1][0]-H[0][0],H[1][1]-H[0][1]]);el.b=H[1]}
      else if(T.k==='punto')el=elemNew(pl.t,H[0]);
      else{el=elemNew(pl.t,[(H[0][0]+H[1][0])/2,(H[0][1]+H[1][1])/2]);el.w=Math.max(.3,Math.abs(H[1][0]-H[0][0]));el.l=Math.max(.3,Math.abs(H[1][1]-H[0][1]))}
      if(VV.corners.length<2)el._ar=pl.pts.slice();vAddElem(el);toast(`${T.n} agregado.`);break}
    case 'typ':{const p=await arFix();if(!p)break;vSnap();const h=vHere();const el=elemNew(VV.place.t,vToHouse(p),h?[-h.dir[1],h.dir[0]]:[1,0]);if(VV.corners.length<2)el._ar=[p];vAddElem(el);break}
    case 'here':{const h=vHere();if(!h){toast('Marca primero la esquina inicial de la casa.');break}const dEl=$('#ve-dist');const d=dEl&&dEl.value.trim()?num(dEl.value)||0:0;vSnap();
      const el=elemNew(VV.place.t,[h.p[0]+h.dir[0]*d,h.p[1]+h.dir[1]*d],ELT[VV.place.t].k==='linea'?[-h.dir[1],h.dir[0]]:[1,0]);vAddElem(el);break}
    case 'sel':vSelElem(x);break;
    case 'mv':if(e){vSnap();elMove(e,+x*.25,+y*.25);vPanel();vCroquis()}break;
    case 'rot':if(e){vSnap();elRotate(e,15*deg);vCroquis()}break;
    case 'rot90':if(e){vSnap();elRotate(e,90*deg);vCroquis()}break;
    case 'done':VV.sub=VV.elems.some(q=>q.sug)?'sug':null;VV.sel=null;vPanel();vCroquis();break;
    case 'ok':{const q=VV.elems.find(k=>k.id===x);VV.escenaVista=1;if(q){vSnap();delete q.sug;delete q.alt}VV.sel=null;VV.sub=VV.elems.some(k=>k.sug)||VV.marks.some(k=>k.sug)?'sug':null;vPanel();vCroquis();break}
    case 'del':vSnap();VV.elems=VV.elems.filter(k=>k.id!==x);if(VV.sel===x)VV.sel=null;VV.sub=VV.sub==='list'?'list':VV.elems.some(k=>k.sug)||VV.marks.some(k=>k.sug)?'sug':null;vPanel();vCroquis();break;
    case 'mok':{const m=VV.marks.find(k=>k.id===x);VV.escenaVista=1;if(m){vSnap();delete m.sug}vPanel();vCroquis();break}
    case 'mdel':vSnap();VV.marks=VV.marks.filter(k=>k.id!==x);vPanel();vCroquis();break;
    case 'okall':vSnap();VV.elems.forEach(k=>delete k.sug);VV.marks.forEach(k=>delete k.sug);VV.sub=null;VV.sel=null;vPanel();vCroquis();toast('Elementos aceptados.');break;
    case 'delall':vSnap();VV.elems=VV.elems.filter(k=>!k.sug);VV.marks=VV.marks.filter(k=>!k.sug);VV.sub=null;VV.sel=null;vPanel();vCroquis();break;
    case 'sug':VV.sub='sug';vPanel();break;
    case 'list':VV.sub='list';vPanel();break;
    case 'det':vDetect(false);break;
    case 'auto':VV.auto=!VV.auto;vPanel();toast(VV.auto?'La IA revisará la cámara cada 9 segundos mientras caminas. Cada revisión tiene un costo pequeño en tu cuenta de Claude.':'Reconocimiento automático detenido.');if(VV.auto)vDetect(true);break}});
/* medidas escritas en la validación */
document.addEventListener('change',ev=>{const t=ev.target;if(!VV||!t.dataset||!t.dataset.vvf)return;const e=VV.elems.find(q=>q.id===VV.sel);const v=num(t.value);if(!e||!(v>0))return;
  const k=t.dataset.vvf;if(k==='len')elSetLen(e,v);else{if(e.forma==='libre'&&(k==='w'||k==='l')&&e.pts){const i=k==='w'?0:1,ext=Math.max(...e.pts.map(p=>p[i]))-Math.min(...e.pts.map(p=>p[i]))||1;e.pts=e.pts.map(p=>{const q=p.slice();q[i]*=v/ext;return q})}e[k]=v;if(eltOf(e).k==='punto'&&k==='w')e.l=v}e.est=false;vCroquis()});
document.addEventListener('change',ev=>{const t=ev.target;if(!VV||!t.hasAttribute||!t.hasAttribute('data-vname'))return;const e=VV.elems.find(q=>q.id===VV.sel);if(e){e.nombre=t.value.trim()||null;vCroquis()}});
/* medidas escritas en el panel de edición */
document.addEventListener('change',ev=>{const t=ev.target;if(!VV||!t.dataset||!t.dataset.vef)return;const e=VV.elems.find(q=>q.id===VV.sel);const v=num(t.value);if(!e||!(v>0))return;vSnap();
  if(t.dataset.vef==='len')elSetLen(e,v);else{e[t.dataset.vef]=v;if(eltOf(e).k==='punto'&&t.dataset.vef==='w')e.l=v}vCroquis()});
