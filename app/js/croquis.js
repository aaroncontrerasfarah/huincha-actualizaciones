/* Huincha — estilo "croquis arquitectónico" para las vistas 3D:
   volúmenes blancos con aristas negras, vidrios grises translúcidos y tramas a línea
   (ladrillo, tablas, rejas, cubiertas, pasto), como un render de bocetos a mano. */
"use strict";
const SK={mats:new Map(),line:null};
/* textura de trama: el lienzo representa 1 m × 1 m (las UV de las cajas van en metros) */
function skHatch(kind){const k='h|'+kind;if(SK.mats.has(k))return SK.mats.get(k);
  const N=256,cv=document.createElement('canvas');cv.width=cv.height=N;const g=cv.getContext('2d');
  const clear=kind==='rejas';if(!clear){g.fillStyle='#ffffff';g.fillRect(0,0,N,N)}
  g.strokeStyle=kind==='rejas'?'#22272a':'#7d8488';g.lineWidth=kind==='rejas'?5:2;
  const L=(x1,y1,x2,y2)=>{g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()};
  if(kind==='ladrillo'){const h=N/14,w=N/4;for(let r=0;r<14;r++){L(0,r*h,N,r*h);const off=r%2?w/2:0;for(let x=off;x<N;x+=w)L(x,r*h,x,(r+1)*h)}}
  else if(kind==='tablas'||kind==='rejas'){const n=kind==='rejas'?8:7;for(let i=0;i<n;i++)L((i+.5)*N/n,0,(i+.5)*N/n,N);if(kind==='rejas'){L(0,6,N,6)}}
  else if(kind==='piso'){for(let i=0;i<6;i++)L(0,(i+.5)*N/6,N,(i+.5)*N/6);for(let i=0;i<6;i++){const x=((i*97)%N);L(x,i*N/6,x,(i+1)*N/6)}}
  else if(kind==='cubierta'){for(let i=0;i<10;i++)L((i+.5)*N/10,0,(i+.5)*N/10,N)}
  else if(kind==='baldosa'){g.strokeStyle='#a3a9ac';for(let i=0;i<=3;i++){L(0,i*N/3,N,i*N/3);L(i*N/3,0,i*N/3,N)}}
  else if(kind==='puntos'){g.fillStyle='#8d9498';for(let i=0;i<260;i++){const x=(i*73.13)%N,y=(i*151.7)%N;g.fillRect(x,y,2,2)}}
  else if(kind==='diag'){for(let i=-N;i<N;i+=22)L(i,N,i+N,0)}
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=4;SK.mats.set(k,t);return t}
function skMat(kind){const k='m|'+kind;if(SK.mats.has(k))return SK.mats.get(k);let m;
  const po={polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1};
  if(kind==='vidrio')m=new THREE.MeshLambertMaterial({color:0xc9d3d8,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide});
  else if(kind==='agua')m=new THREE.MeshLambertMaterial({color:0xd7e4ea,transparent:true,opacity:.8});
  else if(kind==='gris')m=new THREE.MeshLambertMaterial({color:0xd9dcdd,...po});
  else if(kind==='oscuro')m=new THREE.MeshLambertMaterial({color:0x8e9496,...po});
  else if(kind==='blanco')m=new THREE.MeshLambertMaterial({color:0xffffff,...po});
  else if(kind==='rejas')m=new THREE.MeshLambertMaterial({map:skHatch('rejas'),transparent:true,alphaTest:.4,side:THREE.DoubleSide});
  else m=new THREE.MeshLambertMaterial({map:skHatch(kind),...po});
  SK.mats.set(k,m);return m}
const SK_TEX={bars:'rejas',mesh:'rejas',brick:'ladrillo',brickRaw:'ladrillo',block:'ladrillo',stone:'ladrillo',fenceWood:'tablas',woodV:'tablas',siding:'tablas',panelWood:'tablas',
  flotante:'piso',parquet:'piso',vinilico:'piso',woodGrain:'piso',teja:'cubierta',steelRoof:'cubierta',shingle:'cubierta',grass:'puntos',gravel:'puntos',dirt:'puntos',
  concrete:'gris',sidewalk:'baldosa',pavers:'baldosa',ceramica:'baldosa',porcelanato:'baldosa',wallTile:'baldosa',asphalt:'oscuro'};
function skKindOf(m,mesh){if(mesh.userData.sk)return mesh.userData.sk;if(!m)return'blanco';
  if(m.transparent&&m.opacity<.6)return'vidrio';const tx=m.userData?.tex;return SK_TEX[tx]||'blanco'}
/* Convierte un grupo a estilo croquis. o.big: no dibujar aristas en piezas mayores a ese tamaño (suelo) */
function sketchify(root,o={}){if(!SK.line)SK.line=new THREE.LineBasicMaterial({color:0x1d2124});
  const meshes=[];root.traverse(m=>{if(m.isMesh&&!m.userData.noSketch)meshes.push(m)});
  for(const m of meshes){const keep=m.material&&m.material.isMeshBasicMaterial;/* sugerencias y marcas en amarillo se mantienen */
    if(!keep){const kind=skKindOf(Array.isArray(m.material)?m.material[0]:m.material,m);m.material=skMat(kind);if(o.shadows){m.castShadow=kind!=='vidrio';m.receiveShadow=true}}
    const g=m.geometry;if(!g)continue;if(!g.boundingSphere)g.computeBoundingSphere();if(o.big&&g.boundingSphere.radius>o.big)continue;
    const ed=new THREE.LineSegments(new THREE.EdgesGeometry(g,25),SK.line);ed.userData.noSketch=true;ed.raycast=()=>{};m.add(ed)}}
