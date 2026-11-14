"use strict";
/* ============ utilidades ============ */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=2)=>(Math.round((+v||0)*10**d)/10**d).toFixed(d).replace('.',',');
const num=v=>{const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:0};
const uid=()=>Math.random().toString(36).slice(2,9);
const EPS=0.005;
const near=(a,b)=>Math.abs(a-b)<0.01;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const r2=v=>Math.round(v*1000)/1000;
const today=()=>{const d=new Date();return d.toISOString().slice(0,10)};

const STEPS=['Proyecto','Fotos','Terreno','Casa','Recintos','Puertas y ventanas','Materiales','Revisión','Planos','Recorrido 3D'];
const S_MAT=6,S_REV=7,S_PLA=8,S_3D=9;
const TIPOS={living:{n:'Living-comedor',hab:1,c:0xc4a072},cocina:{n:'Cocina',hab:1,c:0xd9d4c9},dormitorio:{n:'Dormitorio',hab:1,c:0xb88c5e},bano:{n:'Baño',hab:0,c:0xcadde2},pasillo:{n:'Pasillo',hab:0,c:0xbf9f74},escritorio:{n:'Escritorio',hab:1,c:0xb88c5e},logia:{n:'Logia',hab:0,c:0xd9d4c9},bodega:{n:'Bodega',hab:0,c:0xc6c2b8},otro:{n:'Otro',hab:0,c:0xc9b699}};
const MUROS={frontal:'Frontal',posterior:'Posterior',izquierdo:'Izquierdo',derecho:'Derecho'};
const MUROH={frontal:'hacia la calle',posterior:'hacia el fondo',izquierdo:'a la izquierda, mirando desde la calle',derecho:'a la derecha, mirando desde la calle'};
const VT={puerta:'Puerta',ventana:'Ventana','puerta-ventana':'Puerta-ventana',vano:'Vano libre'};
const FACH={frontal:'principal',posterior:'posterior',izquierda:'lateral izquierda',derecha:'lateral derecha'};

/* ============ datos ============ */
function blank(){return{v:1,ejemplo:false,
  meta:{nombre:'',direccion:'',comuna:'',propietario:'',autor:'',fecha:today()},
  lote:{frente:0,fondo:0,norte:0,norteOk:false,calle:''},
  casa:{ancho:0,largo:0,retiroFrontal:0,retiroIzq:0,altura:2.4,eExt:0.2,eInt:0.15,techo:'dos-aguas',cumbrera:'paralela',hTecho:0,alero:0.5},
  recintos:[],vanos:[],fotos:{frontal:[],posterior:[],izquierda:[],derecha:[],terreno:[]},
  video:{nombre:'',marcas:[],ref:'',size:0},ok:{},cortes:{a:0.37,b:0.5},planos:[],mat:{...MAT_DEF},volumenes:[],marcas:[],elementos:[],iaPreg:[]}}
function sample(){
  const p=blank(); p.ejemplo=true;
  p.meta={nombre:'Casa Los Aromos',direccion:'Parcela 14, Camino Lonquén',comuna:'Talagante',propietario:'Familia Rojas Medina',autor:'',fecha:today()};
  p.lote={frente:20,fondo:35,norte:20,norteOk:true,calle:'Camino Lonquén'};
  p.casa={ancho:11,largo:9,retiroFrontal:6,retiroIzq:4.5,altura:2.4,eExt:0.2,eInt:0.15,techo:'dos-aguas',cumbrera:'paralela',hTecho:1.8,alero:0.5};
  p.mat={...MAT_DEF,zocalo:'piedra',estructura:'albanileria',tabiques:'albanileria',revExt:'estuco',colorExt:'#E2D8C4',cubierta:'teja',colorCubierta:'#9B4A33',piso:'flotante',ventanas:'alBlanco',vidrio:'termopanel',puertas:'madera',cierre:'madera',terreno:'pasto'};
  const R=(id,nombre,tipo,x,y,ancho,largo)=>({id,nombre,tipo,x,y,ancho,largo,fotos:[],t:null});
  p.recintos=[{...R('r1','Living-comedor','living',0,0,5.5,4.5),piso:'porcelanato'},R('r2','Cocina','cocina',5.5,0,3,4.5),R('r3','Escritorio','escritorio',8.5,0,2.5,4.5),
    R('r4','Dormitorio principal','dormitorio',0,4.5,3,4.5),R('r5','Pasillo','pasillo',3,4.5,8,1.2),R('r6','Baño','bano',3,5.7,2.2,3.3),
    {...R('r7','Dormitorio 2','dormitorio',5.2,5.7,3,3.3),color:'#C9D3C2'},R('r8','Dormitorio 3','dormitorio',8.2,5.7,2.8,3.3)];
  const V=(recinto,muro,tipo,dist,ancho,alto,antepecho=0)=>({id:uid(),recinto,muro,tipo,dist,ancho,alto,antepecho});
  p.volumenes=[{...volBlank('domo'),id:'vdomo',nombre:'Domo',diam:5,altura:2.6,nivel:1.2,apoyo:'pilotes',nPil:7,lado:'posterior',off:5.5,sep:1.8,acceso:'pasarela',cubierta:'lona'}];
  p.vanos=[V('r1','frontal','puerta',0.7,1,2.1),V('r1','posterior','vano',3.8,1.2,2.1),V('r1','frontal','ventana',2.9,1.8,1.2,0.9),V('r1','izquierdo','ventana',1.8,1.5,1.2,0.9),
    V('r2','posterior','puerta',0.5,0.8,2),V('r2','frontal','ventana',0.9,1.2,1,1.1),V('r2','izquierdo','vano',1.6,0.9,2.1),
    V('r3','posterior','puerta',0.5,0.8,2),V('r3','frontal','ventana',0.8,1.2,1.2,0.9),V('r3','derecho','ventana',1.5,1.2,1.2,0.9),
    V('r4','derecho','puerta',0.15,0.8,2),V('r4','izquierdo','ventana',1.5,1.5,1.2,0.9),V('r4','posterior','ventana',0.8,1.4,1.2,0.9),
    V('r6','frontal','puerta',0.6,0.7,2),V('r6','posterior','ventana',0.7,0.6,0.5,1.6),
    V('r7','frontal','puerta',2,0.8,2),V('r7','posterior','ventana',0.8,1.4,1.2,0.9),
    V('r8','frontal','puerta',1.8,0.8,2),V('r8','posterior','ventana',0.7,1.4,1.2,0.9),V('r8','derecho','ventana',0.8,1.2,1.2,0.9)];
  return p;
}
function normalize(p){const b=blank();for(const k of ['meta','lote','casa','fotos','video','cortes'])p[k]=Object.assign({},b[k],p[k]||{});
  p.recintos=(p.recintos||[]).map(r=>Object.assign({fotos:[],t:null,tipo:'otro',x:0,y:0,ancho:0,largo:0,piso:null,muroInt:null,color:null},r));p.mat=Object.assign({},MAT_DEF,p.mat||{});p.volumenes=(p.volumenes||[]).map(v=>Object.assign(volBlank(v.tipo),v));p.marcas=p.marcas||[];p.techumbre=p.techumbre&&typeof p.techumbre==='object'?p.techumbre:{};p.instal=p.instal&&typeof p.instal==='object'?p.instal:{};p.elementos=Array.isArray(p.elementos)?p.elementos:[];p.iaPreg=p.iaPreg||[];p.vanos=p.vanos||[];p.ok=p.ok||{};p.planos=p.planos||[];
  for(const k in b.fotos)if(!Array.isArray(p.fotos[k]))p.fotos[k]=[];if(!Array.isArray(p.video.marcas))p.video.marcas=[];return p}

const KEY='huincha.proyecto.v1';
const pid=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let P=normalize(blank());P.id='tmp';
const UI={step:0,room:null,vano:null,sheet:1,zoom:1,mode:'maqueta',roof:true,asst:0,videoURL:null,videoEl:null,frame:null,ready:false,projects:[]};
try{const s=JSON.parse(localStorage.getItem(KEY+'.ui')||'null');if(s){UI.step=clamp(s.step|0,0,9);UI.sheet=clamp(s.sheet|0,0,4)}}catch(e){}

/* Guardado: el proyecto queda como archivo dentro de la app (ver js/store.js) */
let saveT=null,saving=Promise.resolve(),errWarned=false;
let dirty=false;
function persist(){dirty=true;clearTimeout(saveT);saveT=setTimeout(flush,400)}
function flush(){clearTimeout(saveT);if(!dirty||P.id==='tmp')return saving;dirty=false;const snap=P;saving=saving.then(()=>Store.save(snap)).catch(e=>{if(!errWarned){errWarned=true;toast('No se pudo guardar en el teléfono. Revisa el espacio disponible.')}});return saving}
function saveUI(){try{localStorage.setItem(KEY+'.ui',JSON.stringify({step:UI.step,sheet:UI.sheet}))}catch(e){}}
const setCur=id=>{try{localStorage.setItem(KEY+'.actual',id)}catch(e){}};
const getCur=()=>{try{return localStorage.getItem(KEY+'.actual')}catch(e){return null}};
const phSrc=ref=>Store.urlSync(P.id,ref);
const refsOf=p=>[...Object.values(p.fotos).flat(),...p.recintos.flatMap(r=>r.fotos),p.video.ref].filter(Boolean);
async function openProject(id){await flush();const p=await Store.load(id);if(!p)throw new Error('sin proyecto');P=normalize(p);await Store.preload(P.id,refsOf(P));setCur(P.id);
  UI.room=null;UI.vano=null;UI.frame=null;if(UI.videoEl){UI.videoEl.pause();UI.videoEl.removeAttribute('src');UI.videoEl.load()}UI.videoEl=null;UI.videoURL=null;loadVideo()}
function loadVideo(){const ref=P.video.ref;if(!ref)return;const u=Store.urlSync(P.id,ref);if(!u)return;UI.videoURL=u;const v=document.createElement('video');v.src=u;v.controls=true;v.playsInline=true;v.preload='metadata';UI.videoEl=v}
async function createProject(kind,data){await flush();const p=normalize(data||(kind==='ejemplo'?sample():blank()));if(!p.id||p.id==='tmp')p.id=pid();await Store.save(p);await openProject(p.id);await refreshProjects()}
async function refreshProjects(){try{UI.projects=await Store.list()}catch(e){UI.projects=[]}const el=$('#plist');if(el)el.outerHTML=projectsHTML()}
const getp=path=>path.split('.').reduce((o,k)=>o?.[k],P);
function setp(path,v){const ks=path.split('.');let o=P;for(let i=0;i<ks.length-1;i++)o=o[ks[i]];o[ks.at(-1)]=v}
const room=id=>P.recintos.find(r=>r.id===id);
const vano=id=>P.vanos.find(v=>v.id===id);
const valid=r=>r&&r.ancho>0&&r.largo>0;

/* ============ geometría ============ */
function union(iv){iv=iv.slice().sort((a,b)=>a[0]-b[0]);const o=[];for(const [a,b] of iv){if(o.length&&a<=o.at(-1)[1]+EPS)o.at(-1)[1]=Math.max(o.at(-1)[1],b);else o.push([a,b])}return o}
function pieces(iv,cuts){const out=[];for(const [a,b] of iv){let segs=[{a,b,ea:true,eb:true}];
  for(const [s,e] of cuts){const n=[];for(const g of segs){if(e<=g.a+EPS||s>=g.b-EPS){n.push(g);continue}
    if(s>g.a+EPS)n.push({a:g.a,b:s,ea:g.ea,eb:false});if(e<g.b-EPS)n.push({a:e,b:g.b,ea:false,eb:g.eb})}segs=n}
  out.push(...segs)}return out}
function opAbs(v){const r=room(v.recinto);if(!valid(r))return null;const {x,y,ancho:w,largo:l}=r;const d=+v.dist||0,a=+v.ancho||0;let ax,c,s,e,inward,hinge,len;
  switch(v.muro){
    case 'frontal':ax='h';c=y;len=w;s=x+w-d-a;e=x+w-d;inward=1;hinge='e';break;
    case 'posterior':ax='h';c=y+l;len=w;s=x+d;e=x+d+a;inward=-1;hinge='s';break;
    case 'izquierdo':ax='v';c=x;len=l;s=y+l-d-a;e=y+l-d;inward=1;hinge='e';break;
    default:ax='v';c=x+w;len=l;s=y+d;e=y+d+a;inward=-1;hinge='s'}
  const isWin=v.tipo==='ventana';const z0=isWin?(+v.antepecho||0):0,z1=z0+(+v.alto||0);
  return{id:v.id,v,r,ax,c,s,e,inward,hinge,z0,z1,isWin,walk:!isWin,len,valid:a>0&&d>=-EPS&&d+a<=len+EPS&&v.alto>0}}
function corner(v){const r=room(v.recinto);if(!valid(r))return null;
  return{frontal:[r.x+r.ancho,r.y],posterior:[r.x,r.y+r.largo],izquierdo:[r.x,r.y+r.largo],derecho:[r.x+r.ancho,r.y]}[v.muro]}
const lkey=(ax,c)=>ax+':'+Math.round(c*1000);
function geom(){const c=P.casa,W=+c.ancho||0,L=+c.largo||0,H=+c.altura||2.4;const lines=new Map();
  const add=(ax,cc,a,b)=>{if(b-a<EPS)return;const k=lkey(ax,cc);if(!lines.has(k))lines.set(k,{ax,c:cc,iv:[],ops:[]});lines.get(k).iv.push([a,b])};
  if(W>0&&L>0){add('h',0,0,W);add('h',L,0,W);add('v',0,0,L);add('v',W,0,L)}
  for(const r of P.recintos){if(!valid(r))continue;add('h',r.y,r.x,r.x+r.ancho);add('h',r.y+r.largo,r.x,r.x+r.ancho);add('v',r.x,r.y,r.y+r.largo);add('v',r.x+r.ancho,r.y,r.y+r.largo)}
  for(const l of lines.values()){l.iv=union(l.iv);l.ext=W>0&&((l.ax==='h'&&(near(l.c,0)||near(l.c,L)))||(l.ax==='v'&&(near(l.c,0)||near(l.c,W))));l.t=l.ext?(+c.eExt||0.2):(+c.eInt||0.15)}
  const ops=[];for(const v of P.vanos){const o=opAbs(v);if(!o||!o.valid)continue;const l=lines.get(lkey(o.ax,o.c));if(l)l.ops.push(o);ops.push(o)}
  return{W,L,H,lines:[...lines.values()],ops}}
const lineOf=(G,q)=>G.lines.find(l=>l.ax===q.ax&&near(l.c,q.c));
function edgeMatch(q,r){if(q.ax==='h')return(near(q.c,r.y)||near(q.c,r.y+r.largo))&&q.s<r.x+r.ancho-EPS&&q.e>r.x+EPS;
  return(near(q.c,r.x)||near(q.c,r.x+r.ancho))&&q.s<r.y+r.largo-EPS&&q.e>r.y+EPS}
/* quiebres del techo a lo largo de un eje (para elevaciones, cortes y 3D) */
function roofBps(ax){const c=P.casa,W=+c.ancho||0,L=+c.largo||0,a=+c.alero||0,len=ax==='x'?W:L;const b=[-a,0,len/2,len,len+a];if(c.techo==='cuatro-aguas'){const sp=Math.min(W,L)/2;b.push(sp,len-sp)}return[...new Set(b.map(v=>Math.round(v*1000)/1000))].sort((p,q)=>p-q)}
function roofZ(x,y){const c=P.casa,W=c.ancho,L=c.largo,H=c.altura,h=+c.hTecho||0;
  if(c.techo==='plana'||!(W>0&&L>0))return H+0.2;
  if(c.techo==='un-agua')return H+h*(1-y/L);
  if(c.techo==='cuatro-aguas'){const sp=Math.min(W,L)/2;return H+h*Math.min(x,W-x,y,L-y)/sp}
  if(c.cumbrera==='paralela')return H+h*(1-Math.abs(y-L/2)/(L/2));
  return H+h*(1-Math.abs(x-W/2)/(W/2))}
/* ============ terreno: polígono ============ */
/* Polígono del terreno en coordenadas de plano (x a la derecha mirando desde la calle, y hacia el fondo). Rectángulo si no se midió en el mapa. */
function lotPoly(){const lo=P.lote;if(Array.isArray(lo.plan)&&lo.plan.length>=3)return lo.plan;if(lo.frente>0&&lo.fondo>0)return[[0,0],[lo.frente,0],[lo.frente,lo.fondo],[0,lo.fondo]];return null}
const polyArea=p=>{let a=0;for(let i=0;i<p.length;i++){const [x1,y1]=p[i],[x2,y2]=p[(i+1)%p.length];a+=x1*y2-x2*y1}return Math.abs(a)/2};
const lotArea=()=>{const p=lotPoly();return p?polyArea(p):0};
const lotPer=()=>{const p=lotPoly();return p?p.reduce((t,q,i)=>t+Math.hypot(p[(i+1)%p.length][0]-q[0],p[(i+1)%p.length][1]-q[1]),0):0};
function inPoly(x,y,p){let ins=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)ins=!ins}return ins}
/* Caja que contiene terreno y casa, con un mínimo para dibujar */
function lotBox(min=1){const c=P.casa,p=lotPoly()||[[0,0]];const xs=[...p.map(q=>q[0]),c.retiroIzq,c.retiroIzq+(+c.ancho||0)],ys=[...p.map(q=>q[1]),0,c.retiroFrontal+(+c.largo||0)];
  const b={x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(0,...ys),y1:Math.max(...ys)};if(b.x1-b.x0<min)b.x1=b.x0+min;if(b.y1-b.y0<min)b.y1=b.y0+min;b.w=b.x1-b.x0;b.h=b.y1-b.y0;return b}
/* Lado del frente (el que queda sobre y = 0) */
function frontEdge(p){let best=null;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(Math.abs(a[1])<0.05&&Math.abs(b[1])<0.05){const l=Math.abs(b[0]-a[0]);if(!best||l>best.l)best={a,b,l}}}return best}
/* ============ materiales: consultas ============ */
const WET=['bano','cocina','logia'];
const floorOf=r=>r.piso||(WET.includes(r.tipo)?'ceramica':(P.mat.piso||'flotante'));
const wallOf=r=>r.muroInt||(r.tipo==='bano'?'ceramica':(P.mat.muroInt||'pintura'));
const mn=(cat,k)=>MATS[cat]?.opts[k]?.n||'Por definir';
const usesColor=cat=>!!MATS[cat]?.opts[P.mat[cat]]?.useColor;
function roofInfo(){const c=P.casa,W=+c.ancho||0,L=+c.largo||0,h=+c.hTecho||0,a=+c.alero||0;let m=0,eaves=0;
  if(c.techo==='dos-aguas'){const par=c.cumbrera==='paralela';const span=par?L:W;m=span>0?h/(span/2):0;eaves=2*((par?W:L)+2*a)}
  else if(c.techo==='un-agua'){m=L>0?h/L:0;eaves=W+2*a}
  else if(c.techo==='cuatro-aguas'){const sp=Math.min(W,L);m=sp>0?h/(sp/2):0;eaves=2*(W+L+4*a)}
  const f=Math.sqrt(1+m*m);return{m,deg:Math.atan(m)*180/Math.PI,pct:m*100,area:(W+2*a)*(L+2*a)*f,fascia:2*(W+2*a+L+2*a),eaves}}
/* Cubicación referencial: cantidades netas desde las medidas del levantamiento */
function cubica(){const G=geom(),c=P.casa,W=G.W,L=G.L,H=G.H,M=P.mat;const R=P.recintos.filter(valid);const rows=[];if(!(W>0&&L>0))return rows;
  const fl={};for(const r of R){const k=floorOf(r);fl[k]=(fl[k]||0)+r.ancho*r.largo}
  for(const [k,v] of Object.entries(fl))rows.push(['Piso: '+mn('piso',k).toLowerCase(),'m²',v]);
  const top=(x,y)=>c.techo==='plana'?H:Math.max(H,roofZ(x,y));let ext=0;
  for(const [len,f] of [[W,u=>top(u,0)],[W,u=>top(u,L)],[L,u=>top(0,u)],[L,u=>top(W,u)]]){const bp=[0,len/2,len];for(let i=0;i<2;i++)ext+=(bp[i+1]-bp[i])*(f(bp[i])+f(bp[i+1]))/2}
  const opA=q=>(q.e-q.s)*(q.z1-q.z0);const opExt=G.ops.filter(q=>lineOf(G,q)?.ext).reduce((t,q)=>t+opA(q),0);
  const zOn=M.zocalo&&M.zocalo!=='ninguno',zA=zOn?Math.max(0,2*(W+L)*0.6-G.ops.filter(q=>lineOf(G,q)?.ext&&q.z0<0.6).reduce((t,q)=>t+(q.e-q.s)*(0.6-q.z0),0)):0;
  rows.push(['Fachada: '+mn('revExt',M.revExt).toLowerCase(),'m²',Math.max(0,ext-opExt-zA)]);if(zOn)rows.push(['Zócalo: '+mn('zocalo',M.zocalo).toLowerCase(),'m²',zA]);
  const wi={};for(const r of R){const op=G.ops.filter(q=>edgeMatch(q,r)).reduce((t,q)=>t+opA(q),0);const k=wallOf(r)+(roomColor(r)?'|'+r.color:(MATS.muroInt.opts[wallOf(r)]?.useColor?'|'+M.colorInt:''));wi[k]=(wi[k]||0)+2*(r.ancho+r.largo)*H-op}
  for(const [k,v] of Object.entries(wi)){const [kk,cc]=k.split('|');rows.push(['Muros interiores: '+mn('muroInt',kk).toLowerCase()+(cc?' '+colorName(COL_INT,cc).toLowerCase():''),'m²',Math.max(0,v)])}
  rows.push(['Cielo: '+mn('cielo',M.cielo).toLowerCase(),'m²',R.reduce((t,r)=>t+r.ancho*r.largo,0)]);
  const ri=roofInfo();rows.push(['Cubierta: '+mn('cubierta',M.cubierta).toLowerCase()+' (con aleros)','m²',ri.area]);
  rows.push(['Tapacán','ml',ri.fascia]);if(ri.eaves)rows.push(['Canaletas','ml',ri.eaves]);
  const wins=G.ops.filter(q=>q.isWin||q.v.tipo==='puerta-ventana');rows.push(['Ventanas y puertas-ventana','un',wins.length]);rows.push(['Superficie vidriada','m²',wins.reduce((t,q)=>t+opA(q),0)]);
  rows.push(['Puertas','un',G.ops.filter(q=>q.v.tipo==='puerta').length]);
  rows.push(...techuCubica());rows.push(...artCubica());rows.push(...obrasCubica());
  rows.push(...volCubica());
  if(M.cierre&&M.cierre!=='ninguno'&&lotPoly())rows.push(['Cierre: '+mn('cierre',M.cierre).toLowerCase(),'ml',lotPer()-1.2]);
  return rows}
function specRows(){const c=P.casa,M=P.mat,ri=roofInfo();
  return[['Muros exteriores',`${mn('estructura',M.estructura)}, espesor ${fmt(c.eExt)} m`],
    ['Tabiques',`${mn('tabiques',M.tabiques)}, espesor ${fmt(c.eInt)} m`],
    ['Fachada',mn('revExt',M.revExt)+(usesColor('revExt')?', color '+colorName(COL_EXT,M.colorExt).toLowerCase():'')],
    ['Zócalo',M.zocalo&&M.zocalo!=='ninguno'?mn('zocalo',M.zocalo)+(usesColor('zocalo')?', color '+colorName(COL_EXT,M.colorZocalo).toLowerCase():'')+', 0,60 m de alto':'Sin zócalo'],
    ['Tapacán y molduras',mn('molduras',M.molduras)+(usesColor('molduras')?', color '+colorName(COL_MOLD,M.colorMolduras).toLowerCase():'')],
    ['Cubierta',mn('cubierta',M.cubierta)+(usesColor('cubierta')?', color '+colorName(COL_TECHO,M.colorCubierta).toLowerCase():'')],
    ['Techumbre',c.techo==='plana'?'Techo plano':`${c.techo==='dos-aguas'?'Dos aguas':c.techo==='cuatro-aguas'?'Cuatro aguas':'Un agua'}, pendiente ${fmt(ri.pct,0)} % (${fmt(ri.deg,0)}°), alero ${fmt(c.alero)} m`],
    ...techuSpec(),...instalSpec(),
    ['Ventanas',`${mn('ventanas',M.ventanas)}, ${mn('vidrio',M.vidrio).toLowerCase()}`],
    ['Puertas',mn('puertas',M.puertas)+(usesColor('puertas')?', color '+colorName(COL_MOLD,M.colorPuertas).toLowerCase():'')],
    ['Piso general',mn('piso',M.piso)],
    ['Zonas húmedas','Cerámica en baño, cocina y logia, salvo lo indicado por recinto'],
    ['Muros interiores',mn('muroInt',M.muroInt)+(usesColor('muroInt')?', color '+colorName(COL_INT,M.colorInt).toLowerCase():'')+'; baños con cerámica'],
    ['Cielo',`${mn('cielo',M.cielo)}, altura piso-cielo ${fmt(c.altura)} m`],
    ['Patio',mn('terreno',M.terreno)],
    ['Cierre',mn('cierre',M.cierre)],...volSpecRows()]}
const maxZ=()=>P.casa.techo==='plana'?P.casa.altura+0.2:P.casa.altura+(+P.casa.hTecho||0);
function ovl(a,b){const w=Math.min(a.x+a.ancho,b.x+b.ancho)-Math.max(a.x,b.x),h=Math.min(a.y+a.largo,b.y+b.largo)-Math.max(a.y,b.y);return w>0&&h>0?w*h:0}
function freeSpot(r){const c=P.casa;const others=P.recintos.filter(o=>o!==r&&valid(o));
  for(let y=0;y<=c.largo-r.largo+EPS;y+=0.05)for(let x=0;x<=c.ancho-r.ancho+EPS;x+=0.05){const t={x:r2(x),y:r2(y),ancho:r.ancho,largo:r.largo};if(!others.some(o=>ovl(o,t)>0.0001))return t}
  return{x:0,y:0}}

/* ============ asistente: verificación ============ */
let LAST={items:[],pct:0,faltan:0};
function CH(){const it=[],req=[];const c=P.casa,lo=P.lote,m=P.meta;
  const need=(ok,o)=>{req.push(!!ok);if(!ok)it.push({lvl:'falta',...o})};
  const rev=(ok,o)=>{if(!ok&&!P.ok[o.id])it.push({lvl:'revisar',...o})};
  need(m.nombre.trim(),{step:0,msg:'¿Cómo se llama este proyecto?',hint:'Por ejemplo, "Casa Los Aromos". Aparece en la viñeta de cada lámina.',field:'f-meta-nombre'});
  need(m.direccion.trim(),{step:0,msg:'¿Cuál es la dirección del terreno?',hint:'Calle y número, o nombre y número de la parcela.',field:'f-meta-direccion'});
  for(const k in FACH)need(P.fotos[k].length||P.fachDib?.[k],{step:1,msg:`Toma una foto de la fachada ${FACH[k]}.`,hint:'Párate frente a la fachada, lo bastante lejos para que salga completa. Si el terreno no lo permite, tócala en Fotos y elige «No se puede fotografiar: dibujarla».',photo:'f:'+k});
  need(lo.frente>0,{step:2,msg:'¿Cuánto mide el frente del terreno?',hint:'Es el deslinde que da a la calle, de vértice a vértice. Si tienes la escritura o el certificado de número, usa esa medida.',field:'f-lote-frente'});
  need(lo.fondo>0,{step:2,msg:'¿Cuánto mide el fondo del terreno?',hint:'Mide un deslinde lateral, desde la línea de calle hasta el fondo.',field:'f-lote-fondo'});
  need(lo.norteOk,{step:2,msg:'¿Hacia dónde está el norte?',hint:'Párate en la línea de calle mirando hacia el fondo del terreno, abre la brújula del teléfono y anota los grados que marca.',field:'f-lote-norte'});
  if(norteConflicto())need(false,{step:2,msg:'El norte del mapa y el de la brújula no coinciden: elige cuál usar.',hint:'Revisa la tarjeta «El norte no coincide» en el paso Terreno.',field:'norteconf'});
  need(c.ancho>0,{step:3,msg:'¿Cuánto mide la fachada principal de la casa?',hint:'De esquina a esquina, por fuera.',field:'f-casa-ancho'});
  need(c.largo>0,{step:3,msg:'¿Cuánto mide la casa de fondo?',hint:'Mide una fachada lateral, de esquina a esquina.',field:'f-casa-largo'});
  need(c.altura>0,{step:3,msg:'¿Qué altura hay de piso a cielo?',hint:'Mídela dentro de un recinto. Lo habitual está entre 2,30 y 2,50 m.',field:'f-casa-altura'});
  need(c.techo==='plana'||(P.techumbre?.estructura&&P.techumbre?.cerchaMat),{step:3,msg:'¿Cómo es la estructura del techo: cerchas de madera o metálicas, y a qué distancia?',hint:'Mira por la trampa del entretecho con una linterna. Responde en la tarjeta Techumbre, abajo.',field:'techumbre'});
  need(c.techo==='plana'||c.hTecho>0,{step:3,msg:'¿Cuánto sube el techo sobre el cielo, hasta la cumbrera?',hint:'Si no puedes medirlo, estímalo con la foto lateral y compáralo con la elevación de abajo.',field:'f-casa-hTecho'});
  if(lo.fuente==='mapa')rev(false,{id:'lote-mapa',step:2,msg:'Las medidas del terreno vienen del mapa satelital.',hint:'Confírmalas con huincha, al menos el frente. En la imagen el error puede llegar a un metro por lado.',field:'f-lote-frente'});
  if(c.fuente==='vivo')rev(false,{id:'casa-vivo',step:3,msg:'Las medidas de la casa vienen del recorrido en vivo.',hint:c.fuenteDet==='ar'?'Se midieron con realidad aumentada. Comprueba al menos la fachada principal con huincha.':'Se estimaron con pasos (± 5–10 %). Mide al menos la fachada principal y un costado con huincha y corrígelas aquí.',field:'f-casa-ancho'});
  if((P.marcas||[]).length)rev(false,{id:'marcas-'+P.marcas.length,step:5,msg:`Tienes ${P.marcas.length} puerta${P.marcas.length>1?'s':''} o ventana${P.marcas.length>1?'s':''} marcada${P.marcas.length>1?'s':''} en el recorrido en vivo.`,hint:P.recintos.some(valid)?'La app las puede ubicar en el recinto que corresponde a cada muro. Después revisa sus medidas.':'Primero agrega los recintos; después se pueden ubicar solas.',act:P.recintos.some(valid)?'marcas':'',actLab:'Ubicarlas en sus recintos'});
  for(const q of P.iaPreg||[])rev(false,{id:q.id,step:q.step??1,msg:q.texto,hint:'Pregunta de la IA a partir de una foto.',okLab:'Ya lo revisé'});
  if(c.fuente==='mapa')rev(false,{id:'casa-mapa',step:3,msg:'Las medidas de la casa vienen del techo visto en el mapa.',hint:'Mide al menos la fachada principal por fuera, de esquina a esquina, y corrige si hace falta.',field:'f-casa-ancho'});
  const LP=lotPoly(),inLot=()=>{const x0=c.retiroIzq+0.02,x1=c.retiroIzq+c.ancho-0.02,y0=c.retiroFrontal+0.02,y1=c.retiroFrontal+c.largo-0.02;return[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].every(q=>inPoly(q[0],q[1],LP))};
  if(LP&&c.ancho>0&&c.largo>0)need(inLot(),{step:3,msg:'La casa no cabe en el terreno con estas medidas.',hint:'Revisa los retiros, el tamaño de la casa o las medidas del terreno.',field:'f-casa-retiroIzq'});
  rev(!c.hTechoEst,{id:'htecho-est',step:3,msg:'La altura del techo se estimó desde el mapa, con una pendiente típica. ¿La confirmas?',hint:'Compárala con la foto de un costado o mide desde el cielo hasta la cumbrera por la trampa del entretecho.',field:'f-casa-hTecho'});
  rev(!(c.ancho>0)||c.retiroFrontal>0,{id:'antejardin',step:3,msg:'¿La casa está pegada a la línea de calle, sin antejardín?',hint:'Si hay antejardín, mide desde la línea de la reja hasta la fachada.',field:'f-casa-retiroFrontal'});
  need(P.recintos.length,{step:4,msg:'Agrega el primer recinto.',hint:'Agrégalos aquí o regístralos con «Medir en vivo».',addRoom:1});
  {const I=P.instal||{};if(P.recintos.length){need(I.agua,{step:3,msg:'¿De dónde viene el agua potable de la casa?',hint:'Red pública, APR, pozo propio o camión aljibe. Está en la tarjeta Instalaciones.',field:'instal'});need(I.alcant,{step:3,msg:'¿A dónde van las aguas servidas: alcantarillado o fosa séptica?',hint:'Si no hay alcantarillado, ubica después la fosa y el pozo en el terreno.',field:'instal'});need(I.empalme,{step:3,msg:'¿El empalme eléctrico es monofásico o trifásico?',hint:'Mira el medidor: si tiene tres fases (tres cables de llegada) es trifásico.',field:'instal'});
    if(/fosa|drenes/.test(I.alcant||''))need((P.elementos||[]).some(e=>e.t==='fosa'),{step:2,msg:'Ubica la fosa séptica en el terreno.',hint:'Agrégala en Elementos del terreno y escribe su distancia al deslinde y a la casa.',field:'elems'});
    for(const r of P.recintos.filter(valid))if(['bano','cocina','logia'].includes(r.tipo)&&!Object.keys(r.art||{}).some(k=>!ARTF[k]?.el))need(false,{step:4,room:r.id,msg:`¿Qué artefactos tiene ${r.nombre}?`,hint:'WC, lavamanos, ducha, lavaplatos, lavadora… Se usan en los planos y la cubicación.',field:'rform'})}}
  const G=geom();
  for(const r of P.recintos){
    if(!valid(r)){need(false,{step:4,room:r.id,msg:`¿Cuánto mide ${r.nombre}?`,hint:'Ancho y largo de muro a muro. Para medir a eje, suma medio muro por lado (unos 8 cm).',field:'r-ancho'});continue}
    need(r.x>=-EPS&&r.y>=-EPS&&r.x+r.ancho<=c.ancho+EPS&&r.y+r.largo<=c.largo+EPS,{step:4,room:r.id,msg:`${r.nombre} queda fuera del contorno de la casa.`,hint:'Arrástralo dentro del contorno o corrige sus medidas.',field:'r-x'})}
  const R=P.recintos.filter(valid);
  for(let i=0;i<R.length;i++)for(let j=i+1;j<R.length;j++){const a=ovl(R[i],R[j]);if(a>0.02)need(false,{step:4,room:R[j].id,msg:`${R[i].nombre} y ${R[j].nombre} se superponen ${fmt(a)} m².`,hint:'Ajusta la posición o las medidas de uno de los dos.',field:'r-x'})}
  if(R.length&&c.ancho>0&&c.largo>0){const cov=R.reduce((s,r)=>s+ovl(r,{x:0,y:0,ancho:c.ancho,largo:c.largo}),0);const gap=c.ancho*c.largo-cov;
    rev(gap<0.5,{id:'gap',step:4,msg:`Quedan ${fmt(gap,1)} m² de la casa sin recinto asignado.`,hint:'¿Falta un pasillo, un closet o una bodega? Si es un espacio vacío real, confirma.'})}
  for(const r of P.recintos)need(r.fotos.length,{step:1,room:r.id,msg:`Toma una foto de ${r.nombre}.`,hint:'Desde una esquina, mostrando la mayor parte del recinto. Aparecerá en la visita guiada.',photo:'r:'+r.id});
  for(const r of R){need(G.ops.some(q=>q.walk&&edgeMatch(q,r)),{step:5,room:r.id,msg:`¿Por dónde se entra a ${r.nombre}?`,hint:'Agrega su puerta o el vano libre que lo conecta.',add:'puerta'});
    if(TIPOS[r.tipo]?.hab)rev(G.ops.some(q=>q.isWin&&edgeMatch(q,r)),{id:'win-'+r.id,step:5,room:r.id,msg:`${r.nombre} no tiene ventanas registradas. ¿Es correcto?`,hint:'Los recintos habitables casi siempre tienen al menos una ventana.',add:'ventana'})}
  if(R.length)need(G.ops.some(q=>q.walk&&lineOf(G,q)?.ext),{step:5,msg:'¿Por dónde se entra a la casa?',hint:'Agrega la puerta de acceso en un muro exterior.'});
  for(const v of P.vanos){const o=opAbs(v);const r=room(v.recinto);if(!o||!r)continue;const nm=VT[v.tipo].toLowerCase();
    need(o.valid,{step:5,room:r.id,vano:v.id,msg:`La ${nm} de ${r.nombre} no cabe en su muro.`,hint:'Revisa la distancia desde la esquina marcada y el ancho.',field:'v-dist'});
    need(o.z1<=c.altura+EPS,{step:5,room:r.id,vano:v.id,msg:`La ${nm} de ${r.nombre} sobrepasa la altura del cielo.`,hint:'Revisa el alto y el antepecho.',field:'v-alto'})}
  volCH(need,rev);
  const M=P.mat,tech=c.techo==='plana'?'plana':'inclinado',co=MATS.cubierta.opts[M.cubierta];
  need(M.estructura,{step:S_MAT,msg:'¿De qué material son los muros exteriores?',hint:'Fíjate en el canto de una puerta o donde el estuco esté saltado. En casas chilenas lo más común es albañilería de ladrillo.',field:'mat-estructura'});
  need(M.revExt,{step:S_MAT,msg:'¿Qué revestimiento tiene la fachada?',hint:'Compáralo con tu foto de la fachada principal.',field:'mat-revExt'});
  need(co&&(co.techo==='ambos'||co.techo===tech),{step:S_MAT,msg:M.cubierta?'Esa cubierta no corresponde al tipo de techo.':'¿De qué es la cubierta del techo?',hint:M.cubierta?'La losa es para techo plano; las tejas y el zinc, para techos con pendiente.':'Se ve bien desde la calle o en la foto lateral.',field:'mat-cubierta'});
  need(M.piso,{step:S_MAT,msg:'¿Qué piso tienen el living y los dormitorios?',hint:'Baño, cocina y logia quedan con cerámica. Si alguno es distinto, cámbialo abajo, en cada recinto.',field:'mat-piso'});
  need(M.ventanas,{step:S_MAT,msg:'¿De qué son los marcos de las ventanas?',hint:'Mira una ventana de cerca: el aluminio es delgado y frío; el PVC, más grueso.',field:'mat-ventanas'});
  LAST={items:it,pct:req.length?req.filter(Boolean).length/req.length:0,faltan:it.filter(i=>i.lvl==='falta').length};return LAST}

/* ============ dibujo SVG ============ */
const rect=(x,y,w,h,cl,ex='')=>`<rect class="${cl}" x="${r2(x)}" y="${r2(y)}" width="${r2(Math.max(0,w))}" height="${r2(Math.max(0,h))}" ${ex}/>`;
const line=(x1,y1,x2,y2,cl)=>`<line class="${cl}" x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}"/>`;
const ptsS=a=>a.map(p=>r2(p[0])+','+r2(p[1])).join(' ');
const poly=(a,cl,ex='')=>`<polygon class="${cl}" ${ex} points="${ptsS(a)}"/>`;
const text=(x,y,t,fs,ex='',cl='tx')=>`<text class="${cl}" x="${r2(x)}" y="${r2(y)}" font-size="${r2(fs)}" ${ex}>${esc(t)}</text>`;
function dimH(x1,x2,y,lab,fs){if(Math.abs(x2-x1)<0.5)return'';const t=fs*0.45;return line(x1,y,x2,y,'th')+line(x1-t,y+t,x1+t,y-t,'ln')+line(x2-t,y+t,x2+t,y-t,'ln')+line(x1,y-t*1.6,x1,y+t*1.6,'th')+line(x2,y-t*1.6,x2,y+t*1.6,'th')+text((x1+x2)/2,y-fs*0.35,lab,fs,'text-anchor="middle"','tx mono')}
function dimV(y1,y2,x,lab,fs){if(Math.abs(y2-y1)<0.5)return'';const t=fs*0.45;const ym=(y1+y2)/2;return line(x,y1,x,y2,'th')+line(x-t,y1+t,x+t,y1-t,'ln')+line(x-t,y2+t,x+t,y2-t,'ln')+line(x-t*1.6,y1,x+t*1.6,y1,'th')+line(x-t*1.6,y2,x+t*1.6,y2,'th')+text(x-fs*0.35,ym,lab,fs,`text-anchor="middle" transform="rotate(-90 ${r2(x-fs*0.35)} ${r2(ym)})"`,'tx mono')}
function northArrow(cx,cy,r,deg){return`<g transform="rotate(${-deg} ${r2(cx)} ${r2(cy)})"><circle class="ln" cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}"/><polygon class="na" points="${r2(cx)},${r2(cy-r*0.95)} ${r2(cx+r*0.32)},${r2(cy+r*0.55)} ${r2(cx)},${r2(cy+r*0.25)} ${r2(cx-r*0.32)},${r2(cy+r*0.55)}"/></g>`+text(cx,cy-r-1.4*r/6-1,'N',r*0.55,'text-anchor="middle" font-weight="700"')}

function planSVG(G,o){const {s,ox,oy}=o,L=G.L;const X=x=>ox+x*s,Y=y=>oy+(L-y)*s;let h='';const fs=o.fs||2.4;
  for(const r of P.recintos){if(!valid(r))continue;h+=rect(X(r.x),Y(r.y+r.largo),r.ancho*s,r.largo*s,'rf'+(o.sel===r.id?' sel':''),`data-room="${r.id}"`);
    if(o.sheet)h+=rect(X(r.x),Y(r.y+r.largo),r.ancho*s,r.largo*s,'flr',`style="fill:url(#fl-${floorOf(r)}${o.sfx||''})"`)}
  const WR=[];for(const l of G.lines){const t=l.t;for(const p of pieces(l.iv,l.ops.map(q=>[q.s,q.e]))){const a=p.a-(p.ea?t/2:0),b=p.b+(p.eb?t/2:0);
    WR.push(l.ax==='h'?[X(a),Y(l.c+t/2),(b-a)*s,t*s,l.ext]:[X(l.c-t/2),Y(b),t*s,(b-a)*s,l.ext])}}
  if(o.vols!==false)h=volPlanSVG(X,Y,s,fs,o.sheet)+h;
  if(o.sheet)h+=WR.map(w=>rect(w[0],w[1],w[2],w[3],'wo')).join('')+WR.map(w=>rect(w[0],w[1],w[2],w[3],'w '+(w[4]?'we':'wi'))).join('');
  else h+=WR.map(w=>rect(w[0],w[1],w[2],w[3],'w')).join('');
  for(const q of G.ops){const l=lineOf(G,q);const t=l?l.t:P.casa.eInt;const PT=(al,pe)=>q.ax==='h'?[X(al),Y(pe)]:[X(pe),Y(al)];
    if(q.isWin){const A=PT(q.s,q.c-t/2),B=PT(q.e,q.c+t/2);h+=rect(Math.min(A[0],B[0]),Math.min(A[1],B[1]),Math.abs(B[0]-A[0]),Math.abs(B[1]-A[1]),'win');const m1=PT(q.s,q.c),m2=PT(q.e,q.c);h+=line(m1[0],m1[1],m2[0],m2[1],'ln')}
    else if(q.v.tipo==='vano'){for(const al of [q.s,q.e]){const a=PT(al,q.c-t/2),b=PT(al,q.c+t/2);h+=line(a[0],a[1],b[0],b[1],'th')}}
    else{const hg=q.hinge==='e'?q.e:q.s,ot=q.hinge==='e'?q.s:q.e,face=q.c+q.inward*t/2,w=q.e-q.s;const H0=PT(hg,face),LE=PT(hg,face+q.inward*w),J=PT(ot,face);
      const cr=(LE[0]-H0[0])*(J[1]-H0[1])-(LE[1]-H0[1])*(J[0]-H0[0]);h+=line(H0[0],H0[1],LE[0],LE[1],'ln')+`<path class="th" d="M${r2(LE[0])},${r2(LE[1])} A${r2(w*s)},${r2(w*s)} 0 0 ${cr>0?1:0} ${r2(J[0])},${r2(J[1])}"/>`;
      if(q.v.tipo==='puerta-ventana'){const a=PT(q.s,q.c),b=PT(q.e,q.c);h+=line(a[0],a[1],b[0],b[1],'th')}}
    if(o.selVano===q.id){const A=PT(q.s,q.c-t/2-0.18),B=PT(q.e,q.c+t/2+0.18);h+=rect(Math.min(A[0],B[0]),Math.min(A[1],B[1]),Math.abs(B[0]-A[0]),Math.abs(B[1]-A[1]),'rsel')}}
  if(o.sel){const r=room(o.sel);if(valid(r))h+=rect(X(r.x),Y(r.y+r.largo),r.ancho*s,r.largo*s,'rsel','pointer-events="none"')}
  if(o.corner){h+=`<circle class="pt" cx="${r2(X(o.corner[0]))}" cy="${r2(Y(o.corner[1]))}" r="${r2(fs*0.45)}" pointer-events="none"/>`}
  for(const r of P.recintos){if(!valid(r))continue;const cx=X(r.x+r.ancho/2),cy=Y(r.y+r.largo/2);const nm=r.nombre.toUpperCase();
    const f=Math.min(fs,(r.ancho*s*0.86)/(Math.max(nm.length,4)*0.52),r.largo*s/3.4);
    const hl=o.sheet?' halo':'';h+=text(cx,cy-f*0.15,nm,f,'text-anchor="middle" font-weight="700" pointer-events="none"','tx'+hl)+text(cx,cy+f*1.05,fmt(r.ancho*r.largo)+' m²',f*0.82,'text-anchor="middle" pointer-events="none"','tx tm mono'+hl);
    if(o.sheet)h+=text(cx,cy+f*2.1,mn('piso',floorOf(r)).toUpperCase(),f*0.62,'text-anchor="middle" letter-spacing=".3"','tx tm'+hl)}
  if(o.dims){const W=G.W,e=P.casa.eExt/2;const xs=[...new Set(G.lines.filter(l=>l.ax==='v').map(l=>r2(l.c)))].sort((a,b)=>a-b);const ys=[...new Set(G.lines.filter(l=>l.ax==='h').map(l=>r2(l.c)))].sort((a,b)=>a-b);
    const yb=Y(0)+e*s+fs*2.4,xl=X(0)-e*s-fs*2.4;for(let i=0;i<xs.length-1;i++)h+=dimH(X(xs[i]),X(xs[i+1]),yb,fmt(xs[i+1]-xs[i]),fs*0.8);h+=dimH(X(0),X(W),yb+fs*2.6,fmt(W),fs*0.85);
    for(let i=0;i<ys.length-1;i++)h+=dimV(Y(ys[i]),Y(ys[i+1]),xl,fmt(ys[i+1]-ys[i]),fs*0.8);h+=dimV(Y(0),Y(L),xl-fs*2.6,fmt(L),fs*0.85)}
  if(o.cuts){const A=P.cortes.a*L,B=P.cortes.b*G.W,ext=0.9,tr=fs*0.75,ex2=o.dims?P.casa.eExt/2+fs*6.8/s:ext;
    h+=line(X(-ex2),Y(A),X(G.W+ext),Y(A),'cutl')+line(X(B),Y(-ex2),X(B),Y(L+ext),'cutl');
    const tag=(x,y,l,dx,dy)=>`<circle class="tag" cx="${r2(x)}" cy="${r2(y)}" r="${r2(tr)}"/>`+text(x,y+tr*0.36,l,tr*1.05,'text-anchor="middle" font-weight="700"')+`<polygon class="na" points="${ptsS([[x+dx*tr*1.9,y+dy*tr*1.9],[x+dx*tr*1+dy*tr*0.6,y+dy*tr*1-dx*tr*0.6],[x+dx*tr*1-dy*tr*0.6,y+dy*tr*1+dx*tr*0.6]])}"/>`;
    h+=tag(X(-ex2)-tr,Y(A),'A',0,-1)+tag(X(G.W+ext)+tr,Y(A),"A'",0,-1)+tag(X(B),Y(-ex2)+tr,'B',1,0)+tag(X(B),Y(L+ext)-tr,"B'",1,0)}
  return h}

function siteSVG(o){const {s,ox,oy}=o,lo=P.lote,c=P.casa;const fs=o.fs||2.4;const b=o.box||lotBox();const F=lo.frente||0,D=lo.fondo||0;const X=x=>ox+(x-b.x0)*s,Y=y=>oy-y*s;let h='';const LP=lotPoly();
  h+=rect(X(b.x0-3),Y(0),(b.w+6)*s,6*s,'street')+text(X(b.x0+b.w/2),Y(-3)+fs*0.4,(lo.calle?lo.calle:'Calle').toUpperCase(),fs*1.05,'text-anchor="middle" font-weight="700" letter-spacing="1"','tx tm');
  if(LP)h+=poly(LP.map(q=>[X(q[0]),Y(q[1])]),'lot');
  if(c.ancho>0&&c.largo>0){const a=+c.alero||0,hx=c.retiroIzq,hy=c.retiroFrontal;h+=rect(X(hx-a),Y(hy+c.largo+a),(c.ancho+2*a)*s,(c.largo+2*a)*s,'dash')+rect(X(hx),Y(hy+c.largo),c.ancho*s,c.largo*s,'foot');
    h+=volSiteSVG(X,Y,s,hx,hy)+elemSiteSVG(X,Y,s,hx,hy);if(o.dims)h+=elemCotasSVG(X,Y,s,fs);h+=anotSVG(X,Y,s,fs);
    if(c.techo==='cuatro-aguas'){const sp=Math.min(c.ancho,c.largo)/2,r1=c.ancho>=c.largo?[hx+sp,hy+c.largo/2]:[hx+c.ancho/2,hy+sp],r2_=c.ancho>=c.largo?[hx+c.ancho-sp,hy+c.largo/2]:[hx+c.ancho/2,hy+c.largo-sp];h+=line(X(r1[0]),Y(r1[1]),X(r2_[0]),Y(r2_[1]),'dash');for(const [cx,cy,rp] of [[hx,hy,r1],[hx,hy+c.largo,r1],[hx+c.ancho,hy,r2_],[hx+c.ancho,hy+c.largo,r2_]])h+=line(X(cx),Y(cy),X(rp[0]),Y(rp[1]),'dash')}
    if(c.techo==='dos-aguas'){h+=c.cumbrera==='paralela'?line(X(hx-a),Y(hy+c.largo/2),X(hx+c.ancho+a),Y(hy+c.largo/2),'dash'):line(X(hx+c.ancho/2),Y(hy-a),X(hx+c.ancho/2),Y(hy+c.largo+a),'dash')}
    h+=text(X(hx+c.ancho/2),Y(hy+c.largo/2)+fs*0.4,'CASA',fs*1.1,'text-anchor="middle" font-weight="700"')+text(X(hx+c.ancho/2),Y(hy+c.largo/2)+fs*1.7,fmt(c.ancho)+' × '+fmt(c.largo),fs*0.8,'text-anchor="middle"','tx tm mono');
    if(o.dims&&hy>0.5)h+=dimV(Y(0),Y(hy),X(hx+c.ancho*0.25),fmt(hy),fs*0.8);
    if(o.dims&&hx>0.5)h+=dimH(X(0),X(hx),Y(hy+c.largo*0.3),fmt(hx),fs*0.8);
    if(hy>1.2)h+=text(X(hx+c.ancho*0.62),Y(hy/2)+fs*0.35,'ANTEJARDÍN',fs*0.75,'text-anchor="middle" letter-spacing=".5"','tx tm')}
  if(o.dims&&LP&&!lo.plan&&F>0&&D>0){h+=dimH(X(0),X(F),Y(D)-fs*2,fmt(F),fs*0.85)+dimV(Y(0),Y(D),X(F)+fs*2,fmt(D),fs*0.85)}
  else if(o.dims&&LP){const cx=LP.reduce((t,q)=>t+q[0],0)/LP.length,cy=LP.reduce((t,q)=>t+q[1],0)/LP.length;
    LP.forEach((q,i)=>{const r=LP[(i+1)%LP.length],l=Math.hypot(r[0]-q[0],r[1]-q[1]);if(l<0.5)return;const mx=(q[0]+r[0])/2,my=(q[1]+r[1])/2;let nx=-(r[1]-q[1])/l,ny=(r[0]-q[0])/l;if((mx-cx)*nx+(my-cy)*ny<0){nx=-nx;ny=-ny}
      const off=fs*1.1/s,px=X(mx+nx*off),py=Y(my+ny*off);let ang=Math.atan2(-(r[1]-q[1]),r[0]-q[0])*180/Math.PI;if(ang>90)ang-=180;if(ang<-90)ang+=180;
      h+=text(px,py+fs*0.3,fmt(l)+' m',fs*0.8,`text-anchor="middle" transform="rotate(${r2(ang)} ${r2(px)} ${r2(py)})"`,'tx mono')})}
  return h}

function elevSVG(G,side,o){const c=P.casa,W=c.ancho,L=c.largo,H=c.altura,a=+c.alero||0,s=o.s,fs=o.fs||2.4;
  const E={frontal:{al:'x',u:x=>x,near:-a,ax:'h',wc:0,len:W},posterior:{al:'x',u:x=>W-x,near:L+a,ax:'h',wc:L,len:W},izquierda:{al:'y',u:y=>L-y,near:-a,ax:'v',wc:0,len:L},derecha:{al:'y',u:y=>y,near:W+a,ax:'v',wc:W,len:L}}[side];
  const rz=(al,d)=>E.al==='x'?roofZ(al,d):roofZ(d,al);
  const bps=roofBps(E.al),dps=roofBps(E.al==='x'?'y':'x');
  const U=al=>o.ox+E.u(al)*s,Z=z=>o.oy-z*s;let h='';
  const inner=bps.filter(b=>b>=-EPS&&b<=E.len+EPS);
  const top=bps.map(al=>[U(al),Z(Math.max(...dps.map(d=>rz(al,d))))]);const eave=bps.slice().reverse().map(al=>[U(al),Z(rz(al,E.near))]);
  h+=poly([[U(0),Z(0)],[U(E.len),Z(0)],...inner.slice().reverse().map(al=>[U(al),Z(rz(al,E.wc))])],'fac',o.pat?`style="fill:url(#fx${o.sfx||''})"`:'');
  h=volElevSVG(side,U,Z,s,false)+h;
  if(P.mat.zocalo&&P.mat.zocalo!=='ninguno')h+=rect(U(0)<U(E.len)?U(0):U(E.len),Z(0.6),E.len*s,0.6*s,'zoc');
  h+=poly([...top,...eave],'roofE',o.pat?`style="fill:url(#rx${o.sfx||''})"`:'')+`<polyline class="bold" points="${ptsS(top)}"/>`;
  for(const q of G.ops){if(q.ax!==E.ax||!near(q.c,E.wc))continue;const x1=Math.min(U(q.s),U(q.e)),x2=Math.max(U(q.s),U(q.e)),y1=Z(q.z1),y2=Z(q.z0);
    if(q.isWin){h+=rect(x1,y1,x2-x1,y2-y1,'glass');if(q.e-q.s>0.9)h+=line((x1+x2)/2,y1,(x1+x2)/2,y2,'ln');h+=line(x1-0.04*s,y2,x2+0.04*s,y2,'bold')}
    else{h+=rect(x1,y1,x2-x1,y2-y1,q.v.tipo==='vano'?'fac':(q.v.tipo==='puerta-ventana'?'glass':'door'));if(q.v.tipo==='puerta')h+=`<circle class="na" cx="${r2(x2-0.12*s)}" cy="${r2(Z(1))}" r="${r2(0.035*s)}"/>`}}
  h+=volElevSVG(side,U,Z,s,true);const sp=elevSpan(side);
  const gx1=o.ox+sp.lo*s-1*s,gx2=o.ox+sp.hi*s+1*s;h+=line(gx1,Z(0),gx2,Z(0),'gnd');
  const mz=Math.max(...top.map(p=>(o.oy-p[1])/s));const lx=gx2+0.3*s;
  for(const [z,lab] of [[0,'±0,00'],[H,'+'+fmt(H)],...(mz-H>0.05?[[mz,'+'+fmt(mz)]]:[])]){const y=Z(z);h+=line(lx-fs*0.3,y,lx+fs*2.6,y,'th')+`<polygon class="na" points="${ptsS([[lx,y],[lx-fs*0.35,y-fs*0.6],[lx+fs*0.35,y-fs*0.6]])}"/>`+text(lx+fs*0.6,y-fs*0.25,lab,fs*0.75,'','tx mono')}
  if(o.title)h+=text((U(0)+U(E.len))/2,o.oy+fs*2.4,o.title,fs*1.05,'text-anchor="middle" font-weight="700" letter-spacing=".4"');
  if(o.note)h+=text((U(0)+U(E.len))/2,o.oy+fs*3.9,o.note,fs*0.78,'text-anchor="middle"','tx tm');
  return h}

function sectSVG(G,which,o){const c=P.casa,W=c.ancho,L=c.largo,H=c.altura,a=+c.alero||0,s=o.s,fs=o.fs||2.4;const isA=which==='A';
  const depth=isA?P.cortes.a*L:P.cortes.b*W,len=isA?W:L,cutAx=isA?'v':'h';
  const rz=al=>isA?roofZ(al,depth):roofZ(depth,al);const bps=roofBps(isA?'x':'y');
  const U=al=>o.ox+al*s,Z=z=>o.oy-z*s;let h='';
  h+=rect(U(-0.3),Z(0),(len+0.6)*s,0.15*s,'slab');
  h+=line(U(-a-1),Z(-0.15),U(len+a+1),Z(-0.15),'gnd');
  h+=line(U(0),Z(H),U(len),Z(H),'ln');
  const rt=0.16;h+=poly([...bps.map(al=>[U(al),Z(rz(al)+rt)]),...bps.slice().reverse().map(al=>[U(al),Z(rz(al))])],'cut');
  for(const l of G.lines){if(l.ax!==cutAx)continue;if(!l.iv.some(([p,q])=>p<depth-EPS&&q>depth+EPS))continue;const t=l.t;const topZ=l.ext?rz(l.c):H;
    const op=l.ops.find(q=>q.s<depth&&q.e>depth);const x=U(l.c-t/2);
    const wc='cut '+(l.ext?'we':'wi');
    if(!op)h+=rect(x,Z(topZ),t*s,topZ*s,wc);
    else{if(op.z0>0.01)h+=rect(x,Z(op.z0),t*s,op.z0*s,wc);if(op.z1<topZ-0.01)h+=rect(x,Z(topZ),t*s,(topZ-op.z1)*s,wc);if(op.isWin)h+=rect(x+t*s*0.35,Z(op.z1),t*s*0.3,(op.z1-op.z0)*s,'glass')}}
  for(const r of P.recintos){if(!valid(r))continue;const inR=isA?(r.y<depth&&r.y+r.largo>depth):(r.x<depth&&r.x+r.ancho>depth);if(!inR)continue;const u=isA?r.x+r.ancho/2:r.y+r.largo/2;const span=(isA?r.ancho:r.largo)*s;const nm=r.nombre.toUpperCase();const f=Math.min(fs*0.9,span*0.86/(nm.length*0.52));h+=text(U(u),Z(1.1),nm,f,'text-anchor="middle" font-weight="700"','tx tm')}
  h+=dimV(Z(0),Z(H),U(-a)-fs*1.6,fmt(H),fs*0.8);const mz=Math.max(...bps.map(rz));if(mz-H>0.05)h+=dimV(Z(H),Z(mz),U(-a)-fs*1.6,fmt(mz-H),fs*0.8);
  if(o.title)h+=text(U(len/2),o.oy+fs*2.6,o.title,fs*1.05,'text-anchor="middle" font-weight="700" letter-spacing=".4"');
  return h}

/* ============ láminas ============ */
const SHEETS=[{k:'emp',t:'Emplazamiento'},{k:'pla',t:'Planta de arquitectura'},{k:'ele',t:'Elevaciones'},{k:'cor',t:'Cortes'},{k:'ins',t:'Instalaciones'},{k:'esp',t:'Especificaciones'}];
const DENS=[20,25,50,75,100,125,150,200,250,300,400,500,750,1000,1500,2000];
const pick=(wm,hm,aw,ah)=>DENS.find(d=>wm*1000/d<=aw&&hm*1000/d<=ah)||2000;
const SHEET_CSS=`<style>.sheet .w{fill:#1b1e20}.sheet .wo{fill:none;stroke:#1b1e20;stroke-width:.5}.sheet .we{fill:url(#hx)}.sheet .wi{fill:url(#hi)}.sheet .rf,.sheet .hs{fill:none}.sheet .flr{stroke:none}.sheet .halo{paint-order:stroke;stroke:#fff;stroke-width:.9px;stroke-linejoin:round}.sheet .ln{fill:none;stroke:#1b1e20;stroke-width:.25}.sheet .th{fill:none;stroke:#1b1e20;stroke-width:.15}.sheet .bold{fill:none;stroke:#1b1e20;stroke-width:.55}.sheet .dash{fill:none;stroke:#1b1e20;stroke-width:.2;stroke-dasharray:1.5 1}.sheet .lot{fill:none;stroke:#1b1e20;stroke-width:.45;stroke-dasharray:6 1.2 1 1.2}.sheet .win{fill:#fff;stroke:#1b1e20;stroke-width:.18}.sheet .street{fill:#eceeed}.sheet .foot{fill:url(#hl);stroke:#1b1e20;stroke-width:.4}.sheet .fac{fill:#fff;stroke:#1b1e20;stroke-width:.35}.sheet .roofE{fill:#dcdfdd;stroke:#1b1e20;stroke-width:.35}.sheet .glass{fill:#e2ecef;stroke:#1b1e20;stroke-width:.18}.sheet .door{fill:#f2f0eb;stroke:#1b1e20;stroke-width:.18}.sheet .cut{fill:url(#hd);stroke:#1b1e20;stroke-width:.3}.sheet .cut.we{fill:url(#hx)}.sheet .cut.wi{fill:url(#hi)}.sheet .slab{fill:url(#hd);stroke:#1b1e20;stroke-width:.25}.sheet .gnd{stroke:#1b1e20;stroke-width:.7}.sheet .tx{fill:#1b1e20;font-family:Archivo,'Arial Narrow',Arial,sans-serif;font-stretch:85%}.sheet .tm{fill:#5d6763}.sheet .mono{font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-stretch:100%}.sheet .rsel,.sheet .pt{display:none}.sheet .cutl{fill:none;stroke:#1b1e20;stroke-width:.3;stroke-dasharray:5 1 1 1}.sheet .na{fill:#1b1e20}.sheet .tag{fill:#fff;stroke:#1b1e20;stroke-width:.3}.sheet .fr{fill:none;stroke:#1b1e20;stroke-width:.5}.sheet .cell{fill:none;stroke:#1b1e20;stroke-width:.25}.sheet .zoc{fill:#e5e8e6;stroke:#1b1e20;stroke-width:.25}.sheet .vol{fill:#fff;stroke:#1b1e20;stroke-width:.4}.sheet .vol.up{stroke-dasharray:3 1.5}.sheet .vin{fill:none;stroke:#8d9592;stroke-width:.15}.sheet .pil{fill:#1b1e20}.sheet .vbr{fill:#fff;stroke:#1b1e20;stroke-width:.25;stroke-dasharray:1.5 1}.sheet .vfac{fill:#fff;stroke:#1b1e20;stroke-width:.35}.sheet .vdeck{fill:url(#hd);stroke:#1b1e20;stroke-width:.25}.sheet .thead{fill:#e8ebe9;stroke:#1b1e20;stroke-width:.3}.sheet .key{stroke:#1b1e20;stroke-width:.3}</style>`;
/* Achurados de muro según material (en milímetros de papel, como en un plano dibujado) */
function hatchPat(id,type){const P2=(w,inner,bg='#fff',rot='')=>`<pattern id="${id}" width="${w}" height="${w}" patternUnits="userSpaceOnUse"${rot?` patternTransform="rotate(${rot})"`:''}><rect width="${w}" height="${w}" fill="${bg}"/>${inner}</pattern>`;
  switch(type){case 'cross':return P2(1.2,`<line x1="0" y1="0" x2="0" y2="1.2" stroke="#1b1e20" stroke-width=".22"/><line x1="0" y1="0" x2="1.2" y2="0" stroke="#1b1e20" stroke-width=".22"/>`,'#fff',45);
    case 'solid':return P2(1,'','#4a4f4d');
    case 'wood':return P2(2.2,`<line x1="0" y1="0" x2="2.2" y2="2.2" stroke="#6b5a45" stroke-width=".16"/><line x1="2.2" y1="0" x2="0" y2="2.2" stroke="#6b5a45" stroke-width=".16"/>`,'#f3ede2');
    case 'steel':return P2(1.6,`<line x1=".2" y1=".8" x2="1" y2=".8" stroke="#5d6763" stroke-width=".2"/>`,'#e4e7e8');
    case 'dots':return P2(1.2,`<circle cx=".6" cy=".6" r=".22" fill="#5d6763"/>`,'#f6f1ea');
    default:return P2(1,`<line x1="0" y1="0" x2="0" y2="1" stroke="#1b1e20" stroke-width=".28"/>`,'#fff',45)}}
/* Patrones a escala real: pisos, revestimiento de fachada y cubierta (s = mm de papel por metro) */
function scalePats(s,sfx){let h='';const Ln=(x1,y1,x2,y2,w=.14,c='#8d9592')=>`<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${c}" stroke-width="${w}"/>`;
  const pat=(id,w,hh,inner,bg='#fff')=>`<pattern id="${id}${sfx}" width="${r2(w)}" height="${r2(hh)}" patternUnits="userSpaceOnUse"><rect width="${r2(w)}" height="${r2(hh)}" fill="${bg}"/>${inner}</pattern>`;
  const mm=(m,min=.6)=>{let v=m*s;while(v<min)v*=2;return v};
  for(const [k,t] of [['ceramica',.33],['porcelanato',.6]]){const a=mm(t);h+=pat('fl-'+k,a,a,Ln(0,0,a,0,.2)+Ln(0,0,0,a,.2))}
  for(const [k,w,l] of [['flotante',.19,1.2],['vinilico',.18,.9],['parquet',.07,.42]]){const a=mm(w,.5),b=a*l/w;h+=pat('fl-'+k,b,2*a,Ln(0,0,b,0,.16)+Ln(0,a,b,a,.16)+Ln(0,0,0,a,.16)+Ln(b/2,a,b/2,2*a,.16))}
  {const a=mm(.5,1.6);h+=pat('fl-hormigon',a,a,`<circle cx="${r2(a*.3)}" cy="${r2(a*.4)}" r=".15" fill="#9aa19e"/><circle cx="${r2(a*.75)}" cy="${r2(a*.8)}" r=".1" fill="#9aa19e"/>`)}
  {const a=mm(.2,.8);h+=pat('fl-alfombra',a,a,`<circle cx="${r2(a/2)}" cy="${r2(a/2)}" r=".12" fill="#aab0ad"/>`)}
  const k=P.mat.revExt||'estuco',ink='#4d5552';
  if(k==='ladrillo'){const bh=mm(.081,.45),bw=bh*.3/.081;h+=pat('fx',bw,2*bh,Ln(0,0,bw,0,.12,ink)+Ln(0,bh,bw,bh,.12,ink)+Ln(0,0,0,bh,.12,ink)+Ln(bw/2,bh,bw/2,2*bh,.12,ink))}
  else if(k==='fibrocemento'||k==='tinglado'){const a=mm(k==='tinglado'?.15:.2,.5);h+=pat('fx',10,a,Ln(0,a-.08,10,a-.08,.14,ink))}
  else if(k==='piedra'){const a=mm(1,4);const pts='M0,.3 L.35,.25 L.42,0 M.35,.25 L.4,.62 L0,.68 M.4,.62 L.75,.55 L1,.6 M.75,.55 L.7,.2 L1,.15 M.7,.2 L.42,0 M.4,.62 L.45,1 M.75,.55 L.82,1';
    h+=pat('fx',a,a,`<path d="${pts.replace(/(\d*\.?\d+),(\d*\.?\d+)/g,(m,x,y)=>r2(x*a)+','+r2(y*a))}" fill="none" stroke="${ink}" stroke-width=".14"/>`)}
  else if(k==='hormigon'){const w=mm(1.2,3),hh=w/2;h+=pat('fx',w,hh,Ln(0,0,w,0,.12,ink)+Ln(0,0,0,hh,.12,ink)+`<circle cx="${r2(w*.25)}" cy="${r2(hh*.5)}" r=".18" fill="${ink}"/><circle cx="${r2(w*.75)}" cy="${r2(hh*.5)}" r=".18" fill="${ink}"/>`)}
  else{const a=mm(.6,2.4);h+=pat('fx',a,a,`<circle cx="${r2(a*.2)}" cy="${r2(a*.3)}" r=".09" fill="#9aa19e"/><circle cx="${r2(a*.7)}" cy="${r2(a*.15)}" r=".07" fill="#9aa19e"/><circle cx="${r2(a*.55)}" cy="${r2(a*.75)}" r=".08" fill="#9aa19e"/>`)}
  const rk=P.mat.cubierta||'teja',rb='#e4e7e5';
  if(rk==='teja'){const w=mm(.21,.6),hh=w*.35/.21;h+=pat('rx',w,hh,Ln(0,hh-.1,w,hh-.1,.2,ink)+Ln(0,0,0,hh,.12,ink),rb)}
  else if(rk==='asfaltica'){const a=mm(.14,.5),b=a*.333/.14;h+=pat('rx',b,2*a,Ln(0,a,b,a,.14,ink)+Ln(0,2*a-.05,b,2*a-.05,.14,ink)+Ln(0,0,0,a,.12,ink)+Ln(b/2,a,b/2,2*a,.12,ink),rb)}
  else if(rk==='zinc'){const a=mm(.076,.45);h+=pat('rx',a,10,Ln(0,0,0,10,.1,ink),rb)}
  else if(rk==='acero'){const a=mm(.25,.9);h+=pat('rx',a,10,Ln(0,0,0,10,.18,ink)+Ln(a*.14,0,a*.14,10,.1,ink),rb)}
  else h+=pat('rx',10,10,'',rb);
  return h}
const sheetDefs=(s,sfx)=>`<defs><pattern id="hl" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="2" fill="#fff"/><line x1="0" y1="0" x2="0" y2="2" stroke="#9aa19e" stroke-width=".25"/></pattern><pattern id="hd" width="0.9" height="0.9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="0.9" height="0.9" fill="#fff"/><line x1="0" y1="0" x2="0" y2="0.9" stroke="#1b1e20" stroke-width=".3"/></pattern>${hatchPat('hx',MATS.estructura.opts[P.mat.estructura]?.hatch)}${hatchPat('hi',MATS.tabiques.opts[P.mat.tabiques]?.hatch)}${s?scalePats(s,sfx):''}</defs>`;
function vineta(i,den){const m=P.meta;const y0=249,x0=10,x1=410;let h=rect(x0,y0,x1-x0,38,'fr');
  const cells=[[10,249,160,16,'PROYECTO',m.nombre||'—',4.2],[170,249,130,16,'CONTENIDO',SHEETS[i].t,3.6],[300,249,50,16,'ESCALA',den?'1:'+den:'S/E',4.2],[350,249,60,16,'LÁMINA',`L-0${i+1} / 0${SHEETS.length}`,4.2],
    [10,265,160,12,'DIRECCIÓN',[m.direccion,m.comuna].filter(Boolean).join(', ')||'—',3],[170,265,130,12,'PROPIETARIO',m.propietario||'—',3],[300,265,50,12,'LEVANTÓ',m.autor||'—',3],[350,265,60,12,'FECHA',(m.fecha||'').split('-').reverse().join('-')||'—',3]];
  for(const [x,y,w,hh,k,v,f] of cells){h+=rect(x,y,w,hh,'cell')+text(x+2,y+3.2,k,1.9,'letter-spacing=".4"','tx tm')+text(x+2,y+hh-2.2,v.length>60?v.slice(0,58)+'…':v,f,'font-weight="600"')}
  h+=text(12,284.6,'Levantamiento referencial generado con Huincha. Las medidas son las ingresadas en terreno. No válido para trámites municipales sin revisión y firma de un arquitecto.',2.1,'','tx tm');
  return h}
/* Tabla con columnas de ancho fijo; recorta el texto que no cabe */
function tableSVG(x,y,ws,head,rows,rh,f){let h='';const TW=ws.reduce((a,b)=>a+b,0);const fit=(t,w,fz)=>{const n=Math.floor((w-3)/(fz*.5));return t.length>n?t.slice(0,Math.max(1,n-1))+'…':t};
  h+=rect(x,y,TW,rh,'thead');let cx=x;head.forEach((t,i)=>{const num=i>0&&rows.some(r=>typeof r[i]==='number');h+=text(num?cx+ws[i]-1.6:cx+1.6,y+rh*.66,t,f*.8,`font-weight="700" letter-spacing=".3"${num?' text-anchor="end"':''}`);cx+=ws[i]});
  rows.forEach((r,j)=>{const yy=y+rh*(j+1);h+=rect(x,yy,TW,rh,'cell');let c2=x;r.forEach((t,i)=>{const num=typeof t==='number';const tt=num?fmt(t,Number.isInteger(t)?0:2):fit(String(t),ws[i],f);
    h+=text(num?c2+ws[i]-1.6:c2+1.6,yy+rh*.66,tt,f,num?'text-anchor="end"':(i===0?'font-weight="600"':''),num?'tx mono':'tx');c2+=ws[i]})});return h}
function legendSVG(x,y,f){const M=P.mat,c=P.casa;const it=[['hx',`Muro exterior: ${mn('estructura',M.estructura).toLowerCase()}, e = ${fmt(c.eExt)} m`],['hi',`Tabique: ${mn('tabiques',M.tabiques).toLowerCase()}, e = ${fmt(c.eInt)} m`]];
  return it.map(([id,t],i)=>rect(x,y+i*(f*2)-f*.8,f*2.4,f*1.1,'key',`style="fill:url(#${id})"`)+text(x+f*3,y+i*(f*2),t,f,'','tx')).join('')}
function espSVG(){let h='';const R=P.recintos.filter(valid);
  const SR=specRows(),srh=Math.min(7.6,118/(SR.length+1));h+=text(15,21,'ESPECIFICACIONES TÉCNICAS',3.2,'font-weight="700" letter-spacing=".4"')+tableSVG(15,24,[40,152],['PARTIDA','ESPECIFICACIÓN'],SR,srh,Math.min(2.45,srh*.34));
  const ty=24+srh*(SR.length+1)+10;const rh=Math.min(7,(240-ty-4)/(R.length+2));
  h+=text(15,ty-3,'CUADRO DE TERMINACIONES POR RECINTO',3.2,'font-weight="700" letter-spacing=".4"')+tableSVG(15,ty,[44,17,45,46,40],['RECINTO','M²','PISO','MUROS','CIELO'],[...R.map(r=>[r.nombre,r.ancho*r.largo,mn('piso',floorOf(r)),mn('muroInt',wallOf(r))+(roomColorOk(r)?' · '+colorName(COL_INT,roomColor(r)||P.mat.colorInt):''),mn('cielo',P.mat.cielo)]),['Total útil',R.reduce((t,r)=>t+r.ancho*r.largo,0),'','','']],rh,Math.min(2.4,rh*.36));
  const cb=cubica();const crh=Math.min(7.4,(200-24)/(cb.length+1));
  h+=text(217,21,'CUBICACIÓN REFERENCIAL',3.2,'font-weight="700" letter-spacing=".4"')+tableSVG(217,24,[132,18,38],['PARTIDA','UNIDAD','CANTIDAD'],cb.map(r=>[r[0],r[1],r[2]]),crh,2.4);
  const ny=24+crh*(cb.length+1)+6;h+=text(217,ny,'Cantidades netas calculadas desde las medidas del levantamiento.',2.2,'','tx tm')+text(217,ny+3.4,'No incluyen pérdidas, traslapos ni rendimientos de material.',2.2,'','tx tm');
  h+=text(217,ny+12,'SIMBOLOGÍA',3,'font-weight="700" letter-spacing=".4"')+legendSVG(217,ny+18,2.5);
  return h}
function sheetSVG(i){const G=geom();const c=P.casa,lo=P.lote,M=P.mat;let body='',den=100,s=0;const k=SHEETS[i].k;const fs=2.4,sfx='-'+i;
  const ok=c.ancho>0&&c.largo>0;
  if(!ok&&k!=='emp')body=text(210,130,'Faltan las medidas de la casa para dibujar esta lámina.',5,'text-anchor="middle"','tx tm');
  else if(k==='emp'){const b=lotBox(1),F=b.w,D=b.y1;den=pick(F+8,D+12,285,224);s=1000/den;
    const ox=15+(285-F*s)/2,oy=15+224-(224-(D+9)*s)/2-6*s;body=siteSVG({s,ox,oy,fs,dims:true,box:b})+text(15,240,'EMPLAZAMIENTO  ·  ESC. 1:'+den,3.2,'font-weight="700" letter-spacing=".4"');
    body+=northArrow(330,40,9,lo.norte||0);const tx=310,tw=95;let ty=70;const rows=[['Superficie terreno',fmt(lotArea())+' m²'],['Superficie construida (casa)',fmt(c.ancho*c.largo)+' m²'],...obrasSup(false)>0?[['Otras construcciones existentes',fmt(obrasSup(false))+' m²']]:[],...obrasSup(true)>0?[['Construcciones proyectadas',fmt(obrasSup(true))+' m²']]:[],['Ocupación de suelo',lotArea()>0?fmt(c.ancho*c.largo/lotArea()*100,1)+' %':'—'],...(P.volumenes||[]).length?[['Volúmenes especiales',fmt(volArea())+' m²']]:[],['Superficie útil (recintos)',fmt(P.recintos.filter(valid).reduce((a,r)=>a+r.ancho*r.largo,0))+' m²'],['Recintos',String(P.recintos.filter(valid).length)],['Pisos','1'],['Patio',mn('terreno',M.terreno)],['Cierre',mn('cierre',M.cierre)]];
    body+=text(tx,ty-4,'CUADRO DE SUPERFICIES',3,'font-weight="700" letter-spacing=".4"');for(const [a,b] of rows){body+=rect(tx,ty,tw,8,'cell')+text(tx+2,ty+5.4,a,2.5)+text(tx+tw-2,ty+5.4,b,2.5,'text-anchor="end"','tx mono');ty+=8}}
  else if(k==='pla'){const bb=houseVolBox();den=pick(bb.w+5,bb.h+5,390,212);s=1000/den;const ox=15+(390-bb.w*s)/2+0.6*s-bb.x0*s,oy=15+(212-bb.h*s)/2-(c.largo-bb.y1)*s-0.8*s;
    body=planSVG(G,{s,ox,oy,fs:Math.min(3,Math.max(1.8,s*0.26)),dims:true,cuts:true,sheet:true,sfx})+text(15,240,'PLANTA DE ARQUITECTURA  ·  ESC. 1:'+den,3.2,'font-weight="700" letter-spacing=".4"')+text(15,244.6,'Pisos dibujados según terminación · NPT ±0,00',2.2,'','tx tm')+legendSVG(255,238.6,2.2)+northArrow(390,32,7,lo.norte||0);body+=artSVG(x=>ox+x*s,y=>oy+(G.L-y)*s,s,'arq',Math.min(3,Math.max(1.8,s*0.26)))}
  else if(k==='ins'){const bb=houseVolBox();den=pick(bb.w+5,bb.h+5,390,186);s=1000/den;const ox=15+(390-bb.w*s)/2+0.6*s-bb.x0*s,oy=15+(186-bb.h*s)/2-(c.largo-bb.y1)*s-0.8*s;const f2=Math.min(3,Math.max(1.8,s*0.26));
    body=planSVG(G,{s,ox,oy,fs:f2,dims:false,cuts:false,sheet:true,sfx})+artSVG(x=>ox+x*s,y=>oy+(G.L-y)*s,s,'ins',f2)+text(15,210,'PLANTA DE INSTALACIONES Y ARTEFACTOS  ·  ESC. 1:'+den,3.2,'font-weight="700" letter-spacing=".4"')+text(15,214.6,'Ubicación referencial de puntos y artefactos dentro de cada recinto. E enchufe · F enchufe de fuerza · S interruptor · ⊗ luminaria',2.2,'','tx tm')+artLeyendaSVG(15,221,2.2);
    const sp=instalSpec();sp.forEach(([a,b2],i)=>{body+=text(262,221+i*3,(a+': '+b2).slice(0,95),2,'','tx')})}
  else if(k==='ele'){const SP={};for(const sd of ['frontal','posterior','izquierda','derecha'])SP[sd]=elevSpan(sd);den=Math.max(...Object.values(SP).map(q=>pick(q.hi-q.lo+4,q.zt+3.4,195,108)));s=1000/den;
    const note=`Fachada: ${mn('revExt',M.revExt).toLowerCase()}${usesColor('revExt')?' '+colorName(COL_EXT,M.colorExt).toLowerCase():''} · Cubierta: ${mn('cubierta',M.cubierta).toLowerCase()} · Ventanas: ${mn('ventanas',M.ventanas).toLowerCase()}`;
    const cells=[['frontal','ELEVACIÓN PRINCIPAL',15,15,c.ancho],['posterior','ELEVACIÓN POSTERIOR',210,15,c.ancho],['izquierda','ELEVACIÓN LATERAL IZQUIERDA',15,129.5,c.largo],['derecha','ELEVACIÓN LATERAL DERECHA',210,129.5,c.largo]];
    for(const [sd,t,x,y,len] of cells)body+=elevSVG(G,sd,{s,ox:x+(195-(SP[sd].hi-SP[sd].lo)*s)/2-SP[sd].lo*s-4,oy:y+114.5-15,fs:2.2,title:t+'  ·  ESC. 1:'+den,note,pat:true,sfx})}
  else if(k==='cor'){const a=+c.alero||0;const mz=maxZ()+0.6;den=Math.max(pick(c.ancho+2*a+5,mz+2.4,390,108),pick(c.largo+2*a+5,mz+2.4,390,108));s=1000/den;
    body=sectSVG(G,'A',{s,ox:15+(390-c.ancho*s)/2,oy:15+114.5-14,fs:2.2,title:"CORTE A-A'  ·  ESC. 1:"+den})+sectSVG(G,'B',{s,ox:15+(390-c.largo*s)/2,oy:129.5+114.5-14,fs:2.2,title:"CORTE B-B'  ·  ESC. 1:"+den})+legendSVG(255,242,2.2)}
  else{den=0;body=espSVG()}
  return `<svg class="sheet" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 297" width="420mm" height="297mm">${SHEET_CSS}${sheetDefs(s,sfx)}<rect width="420" height="297" fill="#ffffff"/>${rect(10,10,400,277,'fr')}${body}${vineta(i,den)}</svg>`}

/* ============ cabecera y navegación ============ */
function renderHeader(){const ch=CH();$('#pname').textContent=P.meta.nombre||'Proyecto sin nombre';$('#exb').hidden=!P.ejemplo;
  const pct=Math.round(ch.pct*100);$('#tapef').style.width=pct+'%';$('#tapel').textContent=pct+'% levantado';
  const pb=$('#pend');pb.textContent=ch.faltan?`${ch.faltan} pendiente${ch.faltan>1?'s':''}`:'Completo';pb.classList.toggle('zero',!ch.faltan);
  $('#steps').innerHTML=STEPS.map((s,i)=>{const n=ch.items.filter(x=>x.step===i&&x.lvl==='falta').length;const cl=i>=S_REV?'none':(n?'':'ok');
    return`<button class="st" type="button" data-step="${i}" ${UI.step===i?'aria-current="step"':''}><b>${i+1}</b>${s}<i class="${cl}" title="${n?n+' pendientes':'Completo'}"></i></button>`}).join('');
  const cur=$('#steps [aria-current]');if(cur&&cur.scrollIntoView&&!renderHeader.done){cur.scrollIntoView({inline:'center',block:'nearest'});renderHeader.done=1}}
function goStep(i){UI.step=i;UI.asst=0;saveUI();renderHeader.done=0;render();window.scrollTo(0,0);const cur=$('#steps [aria-current]');cur?.scrollIntoView({inline:'center',block:'nearest'})}
const hstep=(i,t,sub)=>`<div class="sh"><span class="sn">Paso ${i+1} de ${STEPS.length}</span><h2>${t}</h2>${sub?`<p>${sub}</p>`:''}</div>`;
const navHTML=i=>`<div class="nav">${i>0?`<button class="btn" data-step="${i-1}">← ${STEPS[i-1]}</button>`:'<span></span>'}${i<STEPS.length-1?`<button class="btn dark" data-step="${i+1}">${STEPS[i+1]} →</button>`:''}</div>`;
const fid=p=>'f-'+p.replace(/\./g,'-');
const tf=(lab,path,ph='',type='text')=>`<label class="fld"><span>${lab}</span><div class="inp"><input id="${fid(path)}" data-bind="${path}" type="${type}" value="${esc(getp(path))}" placeholder="${esc(ph)}" autocomplete="off"></div></label>`;
const showN=v=>v>0?String(v).replace('.',','):'';
const nf=(lab,path,unit='m',hint='',ph='0,00')=>`<label class="fld"><span>${lab}</span><div class="inp"><input id="${fid(path)}" data-bind="${path}" data-num inputmode="decimal" value="${showN(getp(path))}" placeholder="${ph}" autocomplete="off"><em>${unit}</em></div>${hint?`<small>${hint}</small>`:''}</label>`;
const galBtn=target=>`<label class="btn sm ghost"><input type="file" accept="image/*" multiple data-photo="${target}" hidden>Galería</label>`;
const photoBtn=(target,lab='Tomar foto',cl='btn sm')=>`<label class="${cl}"><input type="file" accept="image/*" capture="environment" data-photo="${target}" hidden>${lab}</label>`;

function asstHTML(step){const ch=LAST;const mine=ch.items.filter(i=>i.step===step);
  if(!mine.length){const nx=ch.items.findIndex(i=>i.lvl==='falta');
    return`<section class="asst done" id="asst"><div class="asst-k"><span class="tag">Asistente</span><span>Paso completo</span></div><p class="asst-q">Este paso está listo.</p>${nx>=0?`<p class="asst-h">Lo siguiente que falta: ${esc(ch.items[nx].msg)}</p><div class="asst-a"><button class="btn pri" data-goitem="${nx}">Ir a ${esc(STEPS[ch.items[nx].step])}</button></div>`:`<p class="asst-h">El levantamiento tiene todo lo necesario. Ya puedes revisar los planos y el recorrido 3D.</p><div class="asst-a"><button class="btn pri" data-step="${S_PLA}">Ver planos</button><button class="btn" data-step="${S_3D}">Recorrido 3D</button></div>`}</section>`}
  const k=UI.asst%mine.length;const it=mine[k];const gi=ch.items.indexOf(it);
  return`<section class="asst" id="asst" aria-live="polite"><div class="asst-k"><span class="tag">Asistente</span><span>${mine.length>1?`Pregunta ${k+1} de ${mine.length} en este paso`:'Falta 1 dato en este paso'}</span></div><p class="asst-q">${esc(it.msg)}</p>${it.hint?`<p class="asst-h">${esc(it.hint)}</p>`:''}<div class="asst-a">${actionBtn(it,gi)}${it.lvl==='revisar'?`<button class="btn" data-okid="${it.id}">${esc(it.okLab||'Sí, es correcto')}</button>`:''}${mine.length>1?`<button class="btn ghost" data-asnext>Otra pregunta</button>`:''}</div></section>`}
function actionBtn(it,gi){if(it.act)return`<button class="btn pri" data-act="${it.act}">${esc(it.actLab||'Hacer')}</button>`;if(it.photo)return photoBtn(it.photo,'Tomar foto','btn pri');
  if(it.video)return`<button class="btn pri" data-act="vivo">Recorrido en vivo</button>`+videoBtns(false);
  if(it.add)return`<button class="btn pri" data-addv="${it.add}" data-room="${it.room}">Agregar ${it.add}</button>`;
  if(it.addRoom)return`<button class="btn pri" data-act="addroom">Agregar recinto</button>`;
  return`<button class="btn pri" data-goitem="${gi}">${it.field?'Responder':'Ir'}</button>`}
function goItem(it){if(it.room)UI.room=it.room;if(it.vol)UI.vol=it.vol;if(it.vano){UI.vano=it.vano;UI.room=vano(it.vano)?.recinto||UI.room}
  if(UI.step!==it.step){UI.step=it.step;saveUI();renderHeader.done=0;render()}else render();
  if(it.field){const el=document.getElementById(it.field);if(el){el.scrollIntoView({block:'center'});el.focus({preventScroll:true})}}}

/* ============ pasos ============ */
function rProyecto(){const G=geom(),c=P.casa,lo=P.lote;const R=P.recintos.filter(valid);
  return hstep(0,'Datos del proyecto','Estos datos van en la viñeta de cada lámina. El asistente te irá pidiendo lo que falte, paso a paso.')+
  (P.ejemplo?`<div class="card exban"><h3>Estás viendo una casa de ejemplo</h3><p>Sirve para mirar cómo quedan los planos y el recorrido 3D. Para levantar tu casa, crea un levantamiento nuevo: parte vacío y el asistente te guía.</p><div class="row"><button class="btn pri" data-act="nuevo">Comenzar mi levantamiento</button></div></div>`:'')+
  asstHTML(0)+
  `<div class="card"><div class="row sb"><h3>Mis levantamientos</h3><div class="row"><button class="btn sm pri" data-act="nuevo">+ Nuevo</button><button class="btn sm" data-act="ejemplo">+ Ejemplo</button></div></div>${projectsHTML()}</div>
  <div class="card"><div class="grid">${tf('Nombre del proyecto','meta.nombre','Casa …')}${tf('Dirección','meta.direccion','Calle y número')}${tf('Comuna','meta.comuna')}${tf('Propietario','meta.propietario')}${tf('Levantamiento realizado por','meta.autor','Tu nombre')}${tf('Fecha','meta.fecha','','date')}</div></div>
  <div class="card"><div class="row sb"><h3>Resumen del levantamiento</h3>${P.ejemplo?'<span class="badge">Datos de ejemplo</span>':''}</div>
   <div class="summ"><div><b>${fmt(lotArea(),0)} m²</b><span>Terreno</span></div><div><b>${fmt(c.ancho*c.largo,1)} m²</b><span>Construidos</span></div><div><b>${R.length}</b><span>Recintos</span></div><div><b>${G.ops.length}</b><span>Puertas y ventanas</span></div></div>
   <div class="edbox"><svg class="ed" id="sumPrev"></svg></div>
   <div class="row"><button class="btn pri" data-step="${S_PLA}">Ver planos</button><button class="btn" data-step="${S_3D}">Recorrido 3D</button></div></div>
  <div class="card"><h3>Análisis de fotos con IA</h3><div id="iastat"><p class="note">Revisando…</p></div></div>
  ${typeof Upd!=='undefined'?Upd.cardHTML():''}
  <div class="card"><h3>Archivos de este levantamiento</h3>${storageHTML()}
   <div class="row"><button class="btn sm" data-act="exportjson">Exportar respaldo</button><label class="btn sm"><input type="file" accept=".json,.huincha,application/json" data-import hidden>Importar respaldo</label><button class="btn sm danger" data-act="delproj">Eliminar levantamiento</button></div>
   <p class="note">${Store.native?'Todo queda guardado dentro de la app en este teléfono, aunque no haya señal. ':'Estás usando la versión de prueba en el navegador: los datos quedan en este navegador. '}El respaldo incluye datos y fotos.</p></div>`+navHTML(0)}
function projectsHTML(){const L=UI.projects;if(!L.length)return'<div class="list" id="plist"><div class="li">Cargando…</div></div>';
  return`<div class="list" id="plist">${L.map(x=>`<button class="li" data-openp="${x.id}" aria-pressed="${x.id===P.id}"><span><b>${esc(x.nombre||'Sin nombre')}</b>${x.ejemplo?' <span class="badge">Ejemplo</span>':''}<br><small>${esc(x.direccion||'Sin dirección')}</small></span><small>${x.actualizado?new Date(x.actualizado).toLocaleDateString('es-CL'):''}</small></button>`).join('')}</div>`}
function storageHTML(){const nf=Object.values(P.fotos).flat().length+P.recintos.reduce((a,r)=>a+r.fotos.length,0);
  return`<div class="summ"><div><b>${nf}</b><span>Fotos guardadas</span></div><div><b>${P.planos.length}</b><span>Láminas exportadas</span></div></div>`}
function drawSum(){const svg=$('#sumPrev');if(!svg)return;const c=P.casa;if(!(c.ancho>0&&c.largo>0)){svg.setAttribute('viewBox','0 0 100 24');svg.innerHTML=text(50,13,'El plano aparecerá cuando ingreses las medidas de la casa.',3.4,'text-anchor="middle"','tx tm');return}
  const s=10,pad=10,bb=houseVolBox();svg.setAttribute('viewBox',`${bb.x0*s-pad} ${(c.largo-bb.y1)*s-pad} ${bb.w*s+2*pad} ${bb.h*s+2*pad}`);svg.innerHTML=planSVG(geom(),{s,ox:0,oy:0,fs:3.4})}

function rCaptura(){const slots=[...Object.entries(FACH).map(([k,n])=>({t:'f:'+k,lab:'Fachada '+n,arr:P.fotos[k]})),{t:'f:terreno',lab:'Terreno (opcional)',arr:P.fotos.terreno,opt:1},...P.recintos.map(r=>({t:'r:'+r.id,lab:r.nombre,arr:r.fotos}))];
  return hstep(1,'Fotos','Fotografía cada fachada: la IA reconoce el techo, las puertas y las ventanas, y puedes delinearlas sobre la foto. La app te pedirá las fotos que falten.')+asstHTML(1)+
  `<div class="card vivocard"><div class="row sb"><div><h3>Levantamiento en vivo</h3><p class="note">La cámara muestra el lugar, la IA reconoce lo que ve y el croquis 3D se arma mientras caminas. Pregunta por cada fachada, el techo, puertas, ventanas y lo que hay en el terreno, y propone medidas que puedes corregir.</p></div><button class="btn pri" data-act="vivo">Comenzar recorrido</button></div></div>`+
  `<h3>Fotos solicitadas</h3><div class="slots">${slots.map(s=>`<div class="slot ${s.arr.length||s.opt||P.fachDib?.[s.t.slice(2)]?'ok':''}"><div class="slot-h"><b>${esc(s.lab)}</b><span>${s.arr.length?s.arr.length+' foto'+(s.arr.length>1?'s':''):P.fachDib?.[s.t.slice(2)]?'Dibujada':(s.opt?'Opcional':'Falta')}</span></div>${s.arr.length?`<div class="thumbs">${s.arr.map((d,i)=>`<img class="th" src="${phSrc(d)}" loading="lazy" data-ph="${s.t}|${i}" alt="Foto ${i+1} de ${esc(s.lab)}">`).join('')}</div>`:''}<div class="row">${photoBtn(s.t)}${galBtn(s.t)}${s.arr.length&&typeof FKEY!=='undefined'&&FKEY.includes(s.t.slice(2))&&s.t.startsWith('f:')?`<button class="btn sm pri" data-fia="${s.t.slice(2)}">Identificar componentes</button>`:''}${typeof FKEY!=='undefined'&&s.t.startsWith('f:')&&FKEY.includes(s.t.slice(2))?`<button class="btn sm${s.arr.length?' ghost':''}" data-pfd="${s.t.slice(2)}">${P.fachDib?.[s.t.slice(2)]?'Editar el dibujo':'No se puede fotografiar: dibujarla'}</button>`:''}</div></div>`).join('')}</div>`+navHTML(1)}
const tc=t=>{t=Math.round(t||0);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
function markPanel(){const mp=$('#mpanel');if(!mp)return;if(!UI.frame){mp.innerHTML='';return}
  mp.innerHTML=`<div class="mpanel"><img src="${UI.frame.url}" alt="Cuadro del video"><div class="fl"><label class="fld"><span>¿Qué recinto es?</span><div class="inp"><input id="mk-nombre" placeholder="Ej.: Dormitorio 2" autocomplete="off"></div></label>
   <div class="chips">${Object.entries(TIPOS).map(([k,t])=>`<button class="chip" data-mtipo="${k}" aria-pressed="${UI.frame.tipo===k}">${t.n}</button>`).join('')}</div>
   <div class="row"><button class="btn pri" data-act="mkcreate">Crear recinto con esta foto</button><button class="btn ghost" data-act="mkcancel">Cancelar</button></div></div></div>`;$('#mk-nombre').focus()}
const videoBtns=pri=>`<label class="btn ${pri?'pri':''}"><input type="file" accept="video/*" capture="environment" data-video hidden>${P.video.ref?'Grabar otro video':'Grabar video'}</label><label class="btn"><input type="file" accept="video/*" data-video hidden>Elegir de la galería</label>`;
/* Toma el cuadro actual del video como JPEG (Blob) */
function grabFrame(){const v=UI.videoEl;if(!v||!v.videoWidth)return Promise.resolve(null);const k=Math.min(1,1600/v.videoWidth);const cv=document.createElement('canvas');cv.width=Math.round(v.videoWidth*k);cv.height=Math.round(v.videoHeight*k);
  try{cv.getContext('2d').drawImage(v,0,0,cv.width,cv.height)}catch(e){return Promise.resolve(null)}return new Promise(res=>{try{cv.toBlob(b=>res(b),'image/jpeg',0.82)}catch(e){res(null)}})}
async function storePhoto(blob){return Store.putBlob(P.id,'foto-'+Date.now().toString(36)+uid()+'.jpg',blob)}

function rTerreno(){const lo=P.lote,LP=lotPoly();return hstep(2,'Terreno','Medidas de los deslindes y orientación. Se dibuja el emplazamiento a medida que escribes.')+`<p class="note">¿No sabes qué son los deslindes o el norte? ${queEs('deslindes')}</p>`+asstHTML(2)+norteCardHTML()+
  `<div class="card mapcard"><div class="row sb"><div><h3>Medir en el mapa</h3><p class="note">Marca las esquinas sobre la imagen satelital y la app calcula deslindes, superficie y norte.</p></div><button class="btn ${lo.fuente==='mapa'?'':'pri'}" data-act="mapa">${lo.geo?'Ajustar en el mapa':'Abrir mapa satelital'}</button></div>
   ${lo.fuente==='mapa'&&LP?`<div class="msides">${LP.map((q,i)=>{const r=LP[(i+1)%LP.length];return`<span class="chip">Lado ${i+1}–${(i+1)%LP.length+1} · ${fmt(Math.hypot(r[0]-q[0],r[1]-q[1]),2)} m</span>`}).join('')}</div><p class="note">Terreno de ${LP.length} lados medido en el mapa · ${fmt(lotArea(),1)} m². Si escribes frente o fondo a mano, se usará un rectángulo.</p>`:''}</div>
  <div class="card"><div class="g2">${nf('Frente (deslinde a la calle)','lote.frente')}${nf('Fondo (deslinde lateral)','lote.fondo')}</div>${tf('Nombre de la calle','lote.calle','Ej.: Camino Lonquén')}
   <div class="g2">${`<label class="fld"><span>Norte (grados de brújula)</span><div class="inp"><input id="f-lote-norte" data-bind="lote.norte" data-num inputmode="decimal" value="${lo.norteOk||lo.norte?String(lo.norte).replace('.',','):''}" placeholder="0"><em>°</em></div><small>Mirando desde la calle hacia el fondo.</small></label>`}<div class="row" style="align-items:flex-end">${lo.norteOk?'<span class="lbl">Orientación confirmada.</span>':'<button class="btn" data-act="norte0">El fondo mira al norte (0°)</button>'}</div></div></div>
  <div class="edbox"><svg class="ed" id="sitePrev"></svg><div class="edcap"><span>Emplazamiento</span><span>Línea segmentada: deslindes</span></div></div>
  ${elemCardHTML()}${proyHTML()}`+navHTML(2)}
function drawSite(){const svg=$('#sitePrev');if(!svg)return;const lo=P.lote;const b=lotBox(8),F=b.w,D=b.y1;const s=4,fs=Math.max(2.6,F*s/40);
  const W=(F+12)*s,H=(D+14)*s;svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.innerHTML=siteSVG({s,ox:6*s,oy:H-7*s,fs,dims:true,box:b})+northArrow(W-4.2*s,4.5*s,3*s*0.9,lo.norte||0)}

function rCasa(){const c=P.casa;return hstep(3,'Casa','Volumen, ubicación en el terreno y techumbre. Compara la elevación con tu foto de fachada.')+`<p class="note">¿Dudas con fachada, cumbrera, alero o retiro? ${queEs('fachada')}</p>`+asstHTML(3)+
  `<div class="card"><div class="row sb"><h3>Volumen</h3><button class="btn sm" data-act="vivo">Medir en vivo</button></div><div class="g2">${nf('Frente de la casa','casa.ancho','m','Fachada principal, por fuera.')}${nf('Fondo de la casa','casa.largo','m','Fachada lateral, por fuera.')}${nf('Altura piso a cielo','casa.altura')}${nf('Espesor muro exterior','casa.eExt')}${nf('Espesor tabique interior','casa.eInt')}</div></div>
  <div class="card"><h3>Ubicación en el terreno</h3><div class="g2">${nf('Antejardín','casa.retiroFrontal','m','De la línea de calle a la fachada.')}${nf('Distancia al deslinde izquierdo','casa.retiroIzq','m','Mirando desde la calle.')}</div></div>
  <div class="card"><h3>Techumbre</h3><div class="seg">${[['dos-aguas','Dos aguas'],['cuatro-aguas','Cuatro aguas'],['un-agua','Un agua'],['plana','Plana']].map(([k,n])=>`<button class="btn" data-techo="${k}" aria-pressed="${c.techo===k}">${n}</button>`).join('')}</div>
   ${c.techo==='dos-aguas'?`<div class="seg">${[['paralela','Cumbrera paralela a la calle'],['perpendicular','Cumbrera perpendicular a la calle']].map(([k,n])=>`<button class="btn sm" data-cumbrera="${k}" aria-pressed="${c.cumbrera===k}">${n}</button>`).join('')}</div>`:''}
   ${c.techo==='un-agua'?'<p class="note">La parte alta del techo queda hacia la calle.</p>':''}
   <div class="g2">${c.techo!=='plana'?nf('Altura de cumbrera sobre el cielo','casa.hTecho'):''}${nf('Alero','casa.alero')}</div></div>
  ${volCardHTML()}
  <div class="edbox"><svg class="ed" id="casaPrev"></svg><div class="edcap"><span>Elevación principal y lateral izquierda</span><span>Se actualiza al escribir</span></div></div>`+techuHTML()+instalHTML()+navHTML(3)}
function drawCasa(){const svg=$('#casaPrev');if(!svg)return;const c=P.casa;if(!(c.ancho>0&&c.largo>0&&c.altura>0)){svg.setAttribute('viewBox','0 0 100 24');svg.innerHTML=text(50,13,'Ingresa frente, fondo y altura de la casa.',3.4,'text-anchor="middle"','tx tm');return}
  const s=6,s1=elevSpan('frontal'),s2=elevSpan('izquierda'),mz=Math.max(s1.zt,s2.zt);const w1=(s1.hi-s1.lo+2)*s,w2=(s2.hi-s2.lo+2)*s,gap=12+3*s;const W=w1+w2+gap+30,H=(mz+1.2)*s+16;const G=geom();
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.innerHTML=elevSVG(G,'frontal',{s,ox:8+(1-s1.lo)*s,oy:H-12,fs:3.2,title:'PRINCIPAL'})+elevSVG(G,'izquierda',{s,ox:8+w1+gap+(1-s2.lo)*s,oy:H-12,fs:3.2,title:'LATERAL IZQUIERDA'})}
/* Extensión de una elevación: la casa con sus aleros y los volúmenes especiales */
function elevSpan(sd){const c=P.casa,a=+c.alero||0,len=sd==='frontal'||sd==='posterior'?c.ancho:c.largo,r=volElevRange(sd);return{lo:Math.min(-a,r.lo),hi:Math.max(len+a,r.hi),zt:Math.max(maxZ(),r.zt)}}

function roomChips(sel){return`<div class="chips" id="rchips">${P.recintos.map(r=>{const okk=valid(r)&&r.fotos.length;return`<button class="chip" data-selroom="${r.id}" aria-pressed="${sel===r.id}"><span class="w ${okk?'ok':''}"></span>${esc(r.nombre)}</button>`}).join('')}</div>`}
function rRecintos(){if(!room(UI.room))UI.room=P.recintos[0]?.id||null;const r=room(UI.room);
  return hstep(4,'Recintos','Cada recinto con su ancho, largo y posición. Arrastra los recintos en el plano: se ajustan a los muros cercanos.')+asstHTML(4)+
  `<div class="edbox"><svg class="ed" id="ed"></svg><div class="edcap"><span>Abajo: fachada principal (calle)</span><span>Medidas a eje de muro</span></div></div>
  <div class="row sb"><h3>Recintos (${P.recintos.length})</h3><button class="btn pri sm" data-act="addroom">+ Agregar recinto</button></div>${roomChips(UI.room)}
  ${r?`<div class="card" id="rform"><input class="titlein" id="r-nombre" data-rb="nombre" value="${esc(r.nombre)}" aria-label="Nombre del recinto">
   <div class="g2"><label class="fld"><span>Tipo</span><div class="inp sel"><select id="r-tipo" data-rb="tipo">${Object.entries(TIPOS).map(([k,t])=>`<option value="${k}" ${r.tipo===k?'selected':''}>${t.n}</option>`).join('')}</select></div></label><div class="fld"><span>Superficie</span><div class="area" id="rarea">${valid(r)?fmt(r.ancho*r.largo)+' m²':'—'}</div></div></div>
   <div class="g2">${rnf('Ancho','ancho','Paralelo a la fachada principal.')}${rnf('Largo','largo','Hacia el fondo.')}${rnf('Desde el muro izquierdo','x','Se ajusta al arrastrar.')}${rnf('Desde la fachada principal','y','Se ajusta al arrastrar.')}</div>
   <div class="fld"><span>Fotos de referencia</span><div class="row">${r.fotos.map((d,i)=>`<img class="th" src="${phSrc(d)}" loading="lazy" data-ph="r:${r.id}|${i}" alt="Foto ${i+1}">`).join('')}${photoBtn('r:'+r.id)}${galBtn('r:'+r.id)}</div></div>
   <div class="fld"><span>Artefactos, muebles e instalaciones</span>${artEditHTML(r.art,r.tipo,'r:'+r.id)}${r.art?'':`<button class="btn sm" data-arttip="${r.id}">Sugerir lo típico de ${esc(TIPOS[r.tipo]?.n.toLowerCase()||'este recinto')}</button>`}</div>
   <div class="row"><button class="btn sm" data-act="duproom">Duplicar</button><button class="btn sm" data-addv="puerta" data-room="${r.id}">Agregar puerta o ventana</button><button class="btn sm danger" data-act="delroom" id="btnDelRoom">Eliminar recinto</button></div></div>`:''}`+navHTML(4)}
const rnf=(lab,f,hint)=>{const r=room(UI.room);return`<label class="fld"><span>${lab}</span><div class="inp"><input id="r-${f}" data-rb="${f}" data-num inputmode="decimal" value="${(f==='x'||f==='y')?String(r2(r[f])).replace('.',','):showN(r[f])}" placeholder="0,00" autocomplete="off"><em>m</em></div><small>${hint}</small></label>`};
const EDS=10;
function drawEditor(id='ed'){const svg=$('#'+id);if(!svg)return;const c=P.casa;if(!(c.ancho>0&&c.largo>0)){svg.setAttribute('viewBox','0 0 100 24');svg.innerHTML=text(50,13,'Primero ingresa el frente y fondo de la casa (paso 4).',3.4,'text-anchor="middle"','tx tm');return}
  const pad=12,s=EDS,bb=houseVolBox();svg.setAttribute('viewBox',`${bb.x0*s-pad} ${(c.largo-bb.y1)*s-pad} ${bb.w*s+2*pad} ${bb.h*s+2*pad}`);
  let corner=null;if(id==='vprev'&&UI.vano){const v=vano(UI.vano);if(v)corner=corner_(v)}
  svg.innerHTML=rect(0,0,c.ancho*s,c.largo*s,'hs')+planSVG(geom(),{s,ox:0,oy:0,fs:3.6,sel:UI.room,selVano:id==='vprev'?UI.vano:null,corner})+text(c.ancho*s/2,(c.largo-bb.y0)*s+pad-2.5,'CALLE ↓',3,'text-anchor="middle" letter-spacing="1"','tx tm')}
const corner_=v=>corner(v);

function rVanos(){if(!room(UI.room))UI.room=P.recintos.find(valid)?.id||null;const r=room(UI.room);const vs=P.vanos.filter(v=>v.recinto===UI.room);if(!vano(UI.vano)||vano(UI.vano).recinto!==UI.room)UI.vano=vs[0]?.id||null;const v=vano(UI.vano);
  return hstep(5,'Puertas y ventanas','Para cada recinto, indica en qué muro está cada vano y sus medidas. La distancia se mide desde la esquina marcada con el punto amarillo, por dentro del recinto.')+asstHTML(5)+
  roomChips(UI.room)+`<div class="edbox"><svg class="ed" id="vprev"></svg><div class="edcap"><span>Punto amarillo: esquina desde donde se mide</span><span>Abajo: calle</span></div></div>
  ${r?`<div class="card"><div class="row sb"><h3>${esc(r.nombre)}</h3><div class="row"><button class="btn sm pri" data-addv="puerta" data-room="${r.id}">+ Puerta</button><button class="btn sm pri" data-addv="ventana" data-room="${r.id}">+ Ventana</button><button class="btn sm" data-addv="vano" data-room="${r.id}">+ Vano libre</button></div></div>
   ${vs.length?`<div class="list" id="vlist">${vs.map(x=>{const o=opAbs(x);return`<button class="li" data-selvano="${x.id}" aria-pressed="${x.id===UI.vano}"><span>${VT[x.tipo]} · muro ${MUROS[x.muro].toLowerCase()}</span>${o&&o.valid?`<small>${fmt(x.ancho)} × ${fmt(x.alto)}</small>`:'<span class="x">Revisar</span>'}</button>`}).join('')}</div>`:'<p class="note">Este recinto aún no tiene puertas ni ventanas.</p>'}
   ${v?`<div class="card" id="vform" style="background:var(--surface-2)"><div class="seg">${Object.entries(VT).map(([k,n])=>`<button class="btn sm" data-vtipo="${k}" aria-pressed="${v.tipo===k}">${n}</button>`).join('')}</div>
     <div class="fld"><span>Muro</span><div class="seg">${Object.entries(MUROS).map(([k,n])=>`<button class="btn sm" data-muro="${k}" aria-pressed="${v.muro===k}">${n}</button>`).join('')}</div><small>Muro ${MUROH[v.muro]}.</small></div>
     <div class="g2">${vnf('Distancia desde la esquina','dist')}${vnf('Ancho','ancho')}${vnf('Alto','alto')}${v.tipo==='ventana'?vnf('Antepecho (piso a ventana)','antepecho'):''}</div>
     <div class="row"><button class="btn sm danger" data-act="delvano" id="btnDelVano">Eliminar</button></div></div>`:''}</div>`:'<p class="note">Agrega recintos con medidas en el paso anterior.</p>'}`+navHTML(5)}
const vnf=(lab,f)=>{const v=vano(UI.vano);return`<label class="fld"><span>${lab}</span><div class="inp"><input id="v-${f}" data-vb="${f}" data-num inputmode="decimal" value="${f==='dist'||f==='antepecho'?String(v[f]).replace('.',','):showN(v[f])}" placeholder="0,00" autocomplete="off"><em>m</em></div></label>`};

/* ============ paso Materiales ============ */
const matThumb=(cat,k)=>MatTex.thumb(MATS[cat].opts[k].tex,matColor(cat,k,P.mat),MATS[cat].show||1.4);
function swatches(cat,row){const C=MATS[cat],cur=P.mat[cat],tech=P.casa.techo==='plana'?'plana':'inclinado';
  return`<div class="${row?'swrow':'swg'}">${Object.entries(C.opts).filter(([k,o])=>cat!=='cubierta'||o.techo==='ambos'||o.techo===tech).map(([k,o])=>{const sub=[o.d,o.e?'e\u00a0=\u00a0'+fmt(o.e)+'\u00a0m':''].filter(Boolean).join(' · ');
    return`<button class="sw" type="button" data-mat="${cat}:${k}" aria-pressed="${cur===k}"><img src="${matThumb(cat,k)}" alt=""><b>${esc(o.n)}</b>${sub&&!row?`<small>${esc(sub)}</small>`:''}</button>`}).join('')}</div>`}
function colorDots(cat){const C=MATS[cat];if(!C.palette||!usesColor(cat))return'';const f=C.color,cur=P.mat[f];
  return`<div class="cdots">${C.palette.map(([n,h])=>`<button class="cd" type="button" data-matc="${f}:${h}" aria-pressed="${cur.toLowerCase()===h.toLowerCase()}" title="${n}" aria-label="Color ${n}" style="background:${h}"></button>`).join('')}<label class="cd cpick" title="Otro color" aria-label="Elegir otro color"><input type="color" data-matcol="${f}" value="${cur}"></label><span class="lbl">${esc(colorName(C.palette,cur))}</span></div>`}
const roomColorOk=r=>!!MATS.muroInt.opts[wallOf(r)]?.useColor;
const roomColor=r=>r.color&&roomColorOk(r)?r.color:null;
function msec(cat,extra=''){const C=MATS[cat],k=P.mat[cat];return`<div class="msec" id="mat-${cat}" tabindex="-1"><div class="msh"><h4>${C.lab}</h4><span class="mcur ${k?'':'pend'}">${k?esc(mn(cat,k)):'Por elegir'}</span></div>${swatches(cat)}${colorDots(cat)}${extra}</div>`}
function rMateriales(){const R=P.recintos.filter(valid);const opt=(cat,sel)=>Object.entries(MATS[cat].opts).map(([k,o])=>`<option value="${k}" ${sel===k?'selected':''}>${esc(o.n)}</option>`).join('');
  const seg=(cat)=>`<div class="seg">${Object.entries(MATS[cat].opts).map(([k,o])=>`<button class="btn sm" type="button" data-mat="${cat}:${k}" aria-pressed="${P.mat[cat]===k}">${esc(o.n)}</button>`).join('')}</div>`;
  return hstep(S_MAT,'Materiales','Estructura, revestimientos y terminaciones. Se aplican en los planos, la cubicación y el recorrido 3D.')+asstHTML(S_MAT)+
  `<div class="row"><button class="btn dark" data-step="${S_3D}">Ver en 3D</button><button class="btn" data-step="${S_PLA}">Ver especificaciones</button></div>
  <section class="card mcard"><h3>Obra gruesa</h3>${msec('estructura')}${msec('tabiques')}</section>
  <section class="card mcard"><h3>Fachada y techo</h3>${msec('revExt')}${msec('zocalo')}${msec('molduras')}${msec('cubierta')}</section>
  <section class="card mcard"><h3>Ventanas y puertas</h3>${msec('ventanas',`<div class="fld"><span>Vidrio</span>${seg('vidrio')}</div>`)}${msec('puertas')}</section>
  <section class="card mcard"><h3>Interiores</h3>${msec('piso')}${msec('muroInt')}${msec('cielo')}
   <div class="msec"><div class="msh"><h4>Por recinto</h4><span class="mcur">Solo si es distinto</span></div>
   ${R.length?`<div class="rtab">${R.map(r=>`<div class="rrow"><b>${esc(r.nombre)}</b><label class="fld"><span>Piso</span><div class="inp sel"><select id="rm-${r.id}-piso" data-rmat="${r.id}:piso"><option value="">${esc(mn('piso',floorOf({...r,piso:null})))} (auto)</option>${opt('piso',r.piso)}</select></div></label><label class="fld"><span>Muros</span><div class="inp sel"><select id="rm-${r.id}-muro" data-rmat="${r.id}:muroInt"><option value="">${esc(mn('muroInt',wallOf({...r,muroInt:null})))} (auto)</option>${opt('muroInt',r.muroInt)}</select></div></label>${roomColorOk(r)?`<label class="fld rcol"><span>Color</span><span class="rcolw"><input type="color" id="rc-${r.id}" data-rcol="${r.id}" value="${r.color||P.mat.colorInt}">${r.color?`<button class="btn sm ghost" type="button" data-rcolreset="${r.id}">General</button>`:''}</span></label>`:'<span></span>'}</div>`).join('')}</div>`:'<p class="note">Agrega recintos con medidas para elegir terminaciones por recinto.</p>'}</div></section>
  <section class="card mcard"><h3>Exterior</h3>${msec('terreno')}${msec('cierre')}</section>`+navHTML(S_MAT)}
function setMat(cat,k){P.mat[cat]=k;const o=MATS[cat].opts[k];
  if(cat==='estructura'&&o.e&&Math.abs(P.casa.eExt-o.e)>EPS){P.casa.eExt=o.e;toast(`Espesor de muro exterior ajustado a ${fmt(o.e)} m.`)}
  if(cat==='tabiques'&&o.e&&Math.abs(P.casa.eInt-o.e)>EPS){P.casa.eInt=o.e;toast(`Espesor de tabiques ajustado a ${fmt(o.e)} m.`)}
  persist();matChanged()}
function matChanged(){if(UI.step===S_3D){CH();renderHeader();rebuild3D();drawM3()}else{const y=window.scrollY;render();window.scrollTo(0,y)}}
function rRevision(){const ch=LAST;const falt=ch.items.filter(i=>i.lvl==='falta'),rev=ch.items.filter(i=>i.lvl==='revisar');const R=P.recintos.filter(valid);const tot=R.reduce((a,r)=>a+r.ancho*r.largo,0);
  const item=(it)=>{const gi=ch.items.indexOf(it);return`<div class="rvi ${it.lvl==='revisar'?'rev':''}"><p><span class="k">${it.lvl==='falta'?'Falta':'Revisar'} · ${STEPS[it.step]}</span><br>${esc(it.msg)}<small>${esc(it.hint||'')}</small></p><div class="row">${actionBtn(it,gi)}${it.lvl==='revisar'?`<button class="btn sm" data-okid="${it.id}">${esc(it.okLab||'Es correcto')}</button>`:''}</div></div>`};
  return hstep(S_REV,'Revisión','Todo lo que el asistente necesita antes de generar planos confiables.')+
  `<div class="card"><div class="row sb"><div><div class="big">${Math.round(ch.pct*100)}%</div><span class="lbl">del levantamiento completo</span></div><div class="row"><button class="btn pri" data-step="${S_PLA}">Ver planos</button><button class="btn" data-step="${S_3D}">Recorrido 3D</button></div></div></div>
  ${falt.length?`<h3>Falta (${falt.length})</h3><div class="rv">${falt.map(item).join('')}</div>`:'<div class="asst done"><div class="asst-k"><span class="tag">Asistente</span></div><p class="asst-q">No falta ningún dato obligatorio.</p></div>'}
  ${rev.length?`<h3>Para confirmar (${rev.length})</h3><div class="rv">${rev.map(item).join('')}</div>`:''}
  <div class="card"><h3>Cuadro de recintos</h3><div style="overflow-x:auto"><table class="t"><thead><tr><th>Recinto</th><th class="n">Medidas</th><th class="n">m²</th></tr></thead><tbody>${R.map(r=>`<tr><td>${esc(r.nombre)}</td><td class="n">${fmt(r.ancho)} × ${fmt(r.largo)}</td><td class="n">${fmt(r.ancho*r.largo)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total útil</td><td></td><td class="n">${fmt(tot)}</td></tr></tfoot></table></div></div>`+navHTML(S_REV)}

function rPlanos(){const isCor=SHEETS[UI.sheet].k==='cor';
  return hstep(S_PLA,'Planos','Láminas A3 a escala, con viñeta. Se recalculan con cada dato que agregues.')+
  `<div class="tabs" role="tablist">${SHEETS.map((s,i)=>`<button class="btn" role="tab" data-sheet="${i}" aria-pressed="${UI.sheet===i}">L-0${i+1} ${s.t}</button>`).join('')}</div>
  <div class="row sb"><div class="row"><button class="btn sm" data-zoom="-1" aria-label="Alejar">−</button><span class="lbl mono" id="zl">${Math.round(UI.zoom*100)}%</span><button class="btn sm" data-zoom="1" aria-label="Acercar">+</button></div><span class="lbl">Desliza para recorrer la lámina</span></div>
  ${isCor?`<div class="card"><div class="g2"><label class="fld"><span>Corte A-A' (posición hacia el fondo)</span><input type="range" min="5" max="95" value="${Math.round(P.cortes.a*100)}" data-cut="a" id="cut-a"></label><label class="fld"><span>Corte B-B' (posición desde la izquierda)</span><input type="range" min="5" max="95" value="${Math.round(P.cortes.b*100)}" data-cut="b" id="cut-b"></label></div></div>`:''}
  <div class="sheetbox" id="sheet" style="--z:${UI.zoom}"></div>
  <div class="card"><h3>Descargar</h3><div class="row"><button class="btn pri" data-act="dlsvg">Esta lámina (SVG)</button><button class="btn" data-act="dlhtml">Carpeta completa para imprimir</button><button class="btn" data-act="exportjson">Proyecto (.json)</button></div>
  <p class="note">La carpeta completa es un archivo HTML con las ${SHEETS.length} láminas en tamaño A3. Ábrelo en el navegador y usa Imprimir → Guardar como PDF. Los planos son un levantamiento referencial: para un permiso o una regularización deben ir firmados por un arquitecto.</p></div>`+navHTML(S_PLA)}
function drawSheet(){const b=$('#sheet');if(b)b.innerHTML=sheetSVG(UI.sheet);const t=document.querySelector('.tabs [aria-pressed="true"]');if(t&&t.parentElement)t.parentElement.scrollLeft=t.offsetLeft-16}

function r3D(){return hstep(S_3D,'Recorrido 3D','Maqueta navegable de la casa en su terreno, con visita guiada por cada recinto.')+
  `<div class="viewer" id="viewer"><div class="vbar"><div class="seg">${[['maqueta','Maqueta'],['libre','Caminar'],['guiada','Visita guiada']].map(([k,n])=>`<button class="btn sm" data-mode="${k}" aria-pressed="${UI.mode===k}">${n}</button>`).join('')}</div>${UI.mode==='maqueta'?`<button class="btn sm" data-act="roof" aria-pressed="${!UI.roof}">Quitar techo</button>`:''}<button class="btn sm" data-act="sketch" aria-pressed="${!!UI.sketch}">Croquis</button><button class="btn sm" data-act="m3" aria-pressed="${!!UI.m3}">Materiales</button><button class="btn sm" data-act="fs">Pantalla completa</button></div><div class="m3" id="m3" hidden></div>
   ${UI.mode==='libre'?'<div class="joy" id="joy" aria-label="Control para caminar"><div class="knob" id="knob"></div></div>':''}
   ${UI.mode==='guiada'?'<div class="hud" id="hud"></div>':''}</div>
  <p class="note">${UI.mode==='maqueta'?'Arrastra para girar la maqueta y pellizca para acercar. Quita el techo para ver la distribución.':UI.mode==='libre'?'Usa el control redondo para caminar y arrastra en la imagen para mirar. En computador: teclas W A S D o flechas.':'La visita recorre los recintos en orden, cruzando por sus puertas, y muestra la foto de referencia de cada uno.'}</p>`+navHTML(S_3D)}

/* ============ render ============ */
function render(){CH();renderHeader();stop3D();const m=$('#main');
  m.innerHTML=[rProyecto,rCaptura,rTerreno,rCasa,rRecintos,rVanos,rMateriales,rRevision,rPlanos,r3D][UI.step]();
  if(UI.step===0){drawSum();IA.mode().then(m=>{const el=$('#iastat');if(!el)return;
    const propia=`<details class="iaadv"><summary>Usar mi propia clave de Claude (opcional)</summary><p class="note">Solo si quieres usar Claude en vez de la IA incluida. Cada análisis tiene costo en tu cuenta de Anthropic.</p><div class="row"><div class="inp" style="flex:1;min-width:200px"><input id="ia-key" type="password" placeholder="sk-ant-…" autocomplete="off"></div><button class="btn sm" data-act="iakey">Guardar clave</button></div></details>`;
    el.innerHTML=m==='claude'?'<p class="note">Disponible: en esta vista previa la IA de Claude analiza las fotos sin configurar nada.</p>':
      m==='api'?'<p class="note">Usando tu propia clave de Claude.</p><div class="row"><button class="btn sm" data-act="iakey">Volver a la IA incluida</button></div>':
      m==='servidor'?'<p class="note"><b>Lista para usar.</b> La IA incluida reconoce el terreno y los elementos de las fotos; no necesitas configurar nada. En esta etapa de prueba es gratuita y tiene un límite de usos por minuto.</p><div class="row"><button class="btn sm" data-act="iatest">Probar la IA</button></div>'+propia:
      '<p class="note">La IA todavía no está conectada en esta versión de la app. Puedes medir, armar el croquis y agregar elementos a mano igual.</p>'+propia})}
  if(UI.step===1&&UI.videoEl){$('#vslot').appendChild(UI.videoEl);markPanel()}
  if(UI.step===2)drawSite();if(UI.step===3)drawCasa();if(UI.step===4)drawEditor('ed');if(UI.step===5)drawEditor('vprev');if(UI.step===S_PLA)drawSheet();if(UI.step===S_3D)open3D()}
function refreshLive(){CH();renderHeader();const a=$('#asst');if(a)a.outerHTML=asstHTML(UI.step);
  drawSum();drawSite();drawCasa();drawEditor('ed');if($('#vprev'))drawEditor('vprev');
  const rc=$('#rchips');if(rc)rc.outerHTML=roomChips(UI.room);const ra=$('#rarea');if(ra){const r=room(UI.room);ra.textContent=valid(r)?fmt(r.ancho*r.largo)+' m²':'—'}}

/* ============ eventos ============ */
document.addEventListener('input',e=>{const t=e.target;
  if(t.dataset.bind){const p=t.dataset.bind;setp(p,t.hasAttribute('data-num')?num(t.value):t.value);if(p==='lote.norte')P.lote.norteOk=t.value.trim()!=='';
    if((p==='lote.frente'||p==='lote.fondo')&&P.lote.plan){P.lote.plan=null;P.lote.fuente='';toast('Se usará un terreno rectangular con las medidas que escribas.')}if(P.ejemplo&&p.startsWith('meta'))P.ejemplo=false;persist();refreshLive()}
  else if(t.dataset.rb){const r=room(UI.room);if(!r)return;const f=t.dataset.rb;r[f]=(f==='nombre'||f==='tipo')?t.value:num(t.value);
    if(r.auto&&valid(r)){const sp=freeSpot(r);r.x=sp.x;r.y=sp.y;delete r.auto;const ix=$('#r-x'),iy=$('#r-y');if(ix)ix.value=String(r.x).replace('.',',');if(iy)iy.value=String(r.y).replace('.',',')}
    persist();refreshLive()}
  else if(t.dataset.vb){const v=vano(UI.vano);if(!v)return;v[t.dataset.vb]=num(t.value);persist();refreshLive();const li=$(`[data-selvano="${v.id}"]`);if(li){const o=opAbs(v);li.innerHTML=`<span>${VT[v.tipo]} · muro ${MUROS[v.muro].toLowerCase()}</span>${o&&o.valid?`<small>${fmt(v.ancho)} × ${fmt(v.alto)}</small>`:'<span class="x">Revisar</span>'}`}}
  else if(t.dataset.cut){P.cortes[t.dataset.cut]=(+t.value)/100;persist();drawSheet()}
  else if(t.id==='mk-nombre'&&UI.frame){UI.frame.nombre=t.value}});

let armed=null;
function arm(btn,key,label){if(armed&&armed.key===key&&Date.now()-armed.t<5000){armed=null;return true}armed={key,t:Date.now()};btn.textContent=label;btn.classList.add('danger');setTimeout(()=>{if(armed&&armed.key===key){armed=null;render()}},5000);return false}

document.addEventListener('click',e=>{const b=e.target.closest('button,[data-ph]');if(!b)return;const d=b.dataset;
  if(d.ph){openLB(d.ph);return}
  if(d.step!=null){goStep(+d.step);return}
  if(b.id==='pend'){goStep(S_REV);return}
  if(d.goitem!=null){const it=LAST.items[+d.goitem];if(it)goItem(it);return}
  if(d.asnext!=null){UI.asst++;$('#asst').outerHTML=asstHTML(UI.step);return}
  if(d.okid){P.ok[d.okid]=true;persist();CH();if(UI.step===S_REV||UI.step===S_MAT)render();else refreshLive();return}
  if(d.selroom){UI.room=d.selroom;UI.vano=null;render();return}
  if(d.selvano){UI.vano=d.selvano;render();return}
  if(d.addv){const r=room(d.room||UI.room);if(!r)return;const v={id:uid(),recinto:r.id,muro:'frontal',tipo:d.addv,dist:0.3,ancho:d.addv==='ventana'?1.2:0.8,alto:d.addv==='ventana'?1.0:2.0,antepecho:d.addv==='ventana'?1.0:0};
    P.vanos.push(v);UI.room=r.id;UI.vano=v.id;persist();if(UI.step!==5){UI.step=5;saveUI();renderHeader.done=0}render();$('#vform')?.scrollIntoView({block:'center'});toast(`${VT[v.tipo]} agregada. Elige el muro y sus medidas.`);return}
  if(d.vtipo){const v=vano(UI.vano);if(!v)return;v.tipo=d.vtipo;if(v.tipo==='ventana'&&!v.antepecho)v.antepecho=1;persist();render();return}
  if(d.muro){const v=vano(UI.vano);if(!v)return;v.muro=d.muro;persist();render();return}
  if(d.techo){P.casa.techo=d.techo;persist();render();return}
  if(d.cumbrera){P.casa.cumbrera=d.cumbrera;persist();render();return}
  if(d.sheet!=null){UI.sheet=+d.sheet;saveUI();render();return}
  if(d.zoom){UI.zoom=clamp(UI.zoom*(d.zoom==='1'?1.5:1/1.5),1,4);$('#sheet').style.setProperty('--z',UI.zoom);$('#zl').textContent=Math.round(UI.zoom*100)+'%';return}
  if(d.mode){UI.mode=d.mode;render();return}
  if(d.frame){(async()=>{const f=await grabFrame();if(!f){toast('No se pudo capturar el cuadro. Pausa el video en el momento que quieras.');return}P.fotos[d.frame].push(await storePhoto(f));persist();render();toast('Foto de fachada '+FACH[d.frame]+' guardada.')})();return}
  if(d.mat){const i=d.mat.indexOf(':');setMat(d.mat.slice(0,i),d.mat.slice(i+1));return}
  if(d.rcolreset){const r=room(d.rcolreset);if(r){r.color=null;persist();matChanged()}return}
  if(d.matc){const i=d.matc.indexOf(':');P.mat[d.matc.slice(0,i)]=d.matc.slice(i+1);persist();matChanged();return}
  if(d.m3tab){UI.m3tab=d.m3tab;drawM3();return}
  if(d.openp){if(d.openp===P.id)return;openProject(d.openp).then(()=>{goStep(0);refreshProjects();toast('Levantamiento abierto.')}).catch(()=>toast('No se pudo abrir ese levantamiento.'));return}
  if(d.seek!=null){if(UI.videoEl){UI.videoEl.currentTime=+d.seek;UI.videoEl.pause()}else toast('Abre el video otra vez para ver ese momento.');return}
  if(d.mtipo){if(UI.frame){UI.frame.tipo=d.mtipo;const inp=$('#mk-nombre');if(inp&&!inp.value.trim()){const n=TIPOS[d.mtipo].n;const cnt=P.recintos.filter(r=>r.tipo===d.mtipo).length;inp.value=(d.mtipo==='dormitorio'||d.mtipo==='bano')&&cnt?`${n} ${cnt+1}`:n;UI.frame.nombre=inp.value}document.querySelectorAll('[data-mtipo]').forEach(x=>x.setAttribute('aria-pressed',x===b))}return}
  if(d.act)act(d.act,b)});

function act(a,b){
  switch(a){
  case 'nuevo':createProject('blank').then(()=>{goStep(0);toast('Nuevo levantamiento creado. El asistente te guiará.')});break;
  case 'ejemplo':createProject('ejemplo').then(()=>{goStep(0);toast('Levantamiento de ejemplo creado.')});break;
  case 'delproj':if(arm(b,'delproj','Toca otra vez: se borran datos, fotos y video')){const id=P.id;(async()=>{await flush();await Store.remove(id);UI.projects=await Store.list();if(UI.projects[0])await openProject(UI.projects[0].id);else await createProject('blank');await refreshProjects();goStep(0);toast('Levantamiento eliminado.')})()}break;
  case 'exportjson':exportBackup();break;
  case 'norte0':P.lote.norte=0;P.lote.norteOk=true;persist();render();break;
  case 'addroom':{const n=P.recintos.length+1;const r={id:uid(),nombre:'Recinto '+n,tipo:'otro',x:0,y:0,ancho:0,largo:0,fotos:[],t:null,auto:true};P.recintos.push(r);UI.room=r.id;persist();if(UI.step!==4){UI.step=4;saveUI();renderHeader.done=0}render();$('#r-nombre')?.select();break}
  case 'duproom':{const r=room(UI.room);if(!r)break;const c={...r,id:uid(),nombre:r.nombre+' (copia)',fotos:[],t:null};if(valid(c)){const sp=freeSpot(c);c.x=sp.x;c.y=sp.y}P.recintos.push(c);UI.room=c.id;persist();render();break}
  case 'delroom':if(arm(b,'delroom','Toca otra vez para eliminar')){for(const f of room(UI.room)?.fotos||[])Store.delBlob(P.id,f);P.vanos=P.vanos.filter(v=>v.recinto!==UI.room);P.recintos=P.recintos.filter(r=>r.id!==UI.room);P.video.marcas=P.video.marcas.filter(m=>m.room!==UI.room);UI.room=P.recintos[0]?.id||null;persist();render()}break;
  case 'delvano':if(arm(b,'delvano','Toca otra vez para eliminar')){P.vanos=P.vanos.filter(v=>v.id!==UI.vano);UI.vano=null;persist();render()}break;
  case 'mark':{const v=UI.videoEl;if(!v)break;v.pause();grabFrame().then(f=>{if(!f){toast('Espera a que el video cargue y vuelve a intentarlo.');return}if(UI.frame?.url)URL.revokeObjectURL(UI.frame.url);UI.frame={blob:f,url:URL.createObjectURL(f),t:v.currentTime,tipo:null,nombre:''};markPanel()});break}
  case 'mkcancel':if(UI.frame?.url)URL.revokeObjectURL(UI.frame.url);UI.frame=null;markPanel();break;
  case 'mkcreate':{const F=UI.frame;if(!F)break;UI.frame=null;(async()=>{const ref=await storePhoto(F.blob);URL.revokeObjectURL(F.url);const nm=(F.nombre||'').trim()||(F.tipo?TIPOS[F.tipo].n:'Recinto '+(P.recintos.length+1));const r={id:uid(),nombre:nm,tipo:F.tipo||'otro',x:0,y:0,ancho:0,largo:0,fotos:[ref],t:F.t,auto:true};
    P.recintos.push(r);P.video.marcas.push({t:F.t,room:r.id});persist();render();toast(`${nm} creado. El asistente te pedirá sus medidas.`)})();break}
  case 'dlsvg':saveFile(`${slug()}-L0${UI.sheet+1}-${SHEETS[UI.sheet].k}.svg`,'<?xml version="1.0" encoding="UTF-8"?>\n'+sheetSVG(UI.sheet),'image/svg+xml');break;
  case 'dlhtml':{const pages=SHEETS.map((s,i)=>`<section class="pg">${sheetSVG(i)}</section>`).join('');
    saveFile(slug()+'-planos.html',`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(P.meta.nombre||'Planos')} · Planos</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=IBM+Plex+Mono:wght@400;500&display=swap"><style>@page{size:A3 landscape;margin:0}body{margin:0;background:#888}.pg{width:420mm;height:297mm;margin:0 auto 8mm;background:#fff;page-break-after:always;break-after:page}.pg svg{display:block;width:420mm;height:297mm}@media print{body{background:#fff}.pg{margin:0}}</style></head><body>${pages}</body></html>`,'text/html');break}
  case 'mapa':openMap();break;
  case 'vivo':vivoOpen();break;
  case 'marcas':placeMarks();break;
  case 'iatest':{b.disabled=true;b.textContent='Probando…';IA.test().then(r=>toast(`La IA respondió en ${(r.ms/1000).toFixed(1).replace('.',',')} s (vio el color ${r.color}). Está funcionando.`,true)).catch(e=>toast('La IA no respondió: '+(e?.message||iaErrorMsg(e)),true)).finally(()=>{b.disabled=false;b.textContent='Probar la IA'});break}
  case 'iakey':{const k=($('#ia-key')?.value||'').trim();IA.setKey(k);toast(k?'Clave guardada en este equipo.':'Clave borrada.');render();break}
  case 'm3':UI.m3=!UI.m3;document.querySelectorAll('[data-act="m3"]').forEach(x=>x.setAttribute('aria-pressed',UI.m3));drawM3();break;
  case 'sketch':UI.sketch=!UI.sketch;saveUI();b.setAttribute('aria-pressed',UI.sketch);rebuild3D();break;
  case 'roof':UI.roof=!UI.roof;b.setAttribute('aria-pressed',!UI.roof);applyVis();break;
  case 'fs':{const v=$('#viewer');(v.requestFullscreen?v.requestFullscreen():Promise.reject()).catch(()=>toast('La pantalla completa no está disponible aquí.'));break}
  case 'tprev':tourJump(-1);break;case 'tnext':tourJump(1);break;case 'tplay':tourPlay();break;
  }}
const slug=()=>(P.meta.nombre||'levantamiento').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'levantamiento';

document.addEventListener('change',async e=>{const t=e.target;
  if(t.dataset.matcol){P.mat[t.dataset.matcol]=t.value;persist();matChanged();return}
  if(t.dataset.rcol){const r=room(t.dataset.rcol);if(r){r.color=t.value;persist();matChanged()}return}
  if(t.dataset.rmat){const [rid,f]=t.dataset.rmat.split(':');const r=room(rid);if(r){r[f]=t.value||null;persist();matChanged()}return}
  if(t.dataset.photo!=null&&t.files?.length){const arr=photoArr(t.dataset.photo);if(!arr)return;const files=[...t.files];t.value='';let n=0;
    for(const f of files){const b=await shrink(f);if(b){arr.push(await storePhoto(b));n++}}persist();render();toast(n>1?`${n} fotos guardadas.`:n?'Foto guardada.':'No se pudo leer la foto.');
    const tg=t.dataset.photo;if(n&&/^f:(frontal|derecha|posterior|izquierda)$/.test(tg)&&typeof fProyAbrir==='function')IA.mode().then(m=>{if(m)fProyAbrir(tg.slice(2))})}
  else if(t.dataset.video!=null&&t.files?.[0]){const f=t.files[0];t.value='';await saveVideo(f)}
  else if(t.dataset.import!=null&&t.files?.[0]){const f=t.files[0];t.value='';await importBackup(f)}});
function photoArr(tg){if(tg.startsWith('f:'))return P.fotos[tg.slice(2)];const r=room(tg.slice(2));return r?r.fotos:null}
/* Reduce la foto a 1600 px por lado (suficiente para referencia) y la devuelve como JPEG */
function shrink(file){return new Promise(res=>{const u=URL.createObjectURL(file);const im=new Image();im.onload=()=>{const k=Math.min(1,1600/Math.max(im.width,im.height));const cv=document.createElement('canvas');cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);URL.revokeObjectURL(u);try{cv.toBlob(b=>res(b),'image/jpeg',0.82)}catch(e){res(null)}};im.onerror=()=>{URL.revokeObjectURL(u);res(null)};im.src=u})}
async function saveVideo(f){const ext=((f.name||'').match(/\.\w+$/)||['.mp4'])[0].toLowerCase();const name='video-'+Date.now().toString(36)+ext;const old=P.video.ref;
  const tt=$('#toast');let last=-1;toast('Guardando video en la app… 0 %',true);
  try{await Store.putBlob(P.id,name,f,pr=>{const v=Math.round(pr*100);if(v!==last){last=v;tt.textContent=`Guardando video en la app… ${v} %`}})}
  catch(e){toast('No se pudo guardar el video. Revisa el espacio disponible en el teléfono.');return}
  if(old&&old!==name)Store.delBlob(P.id,old);
  P.video.ref=name;P.video.nombre=f.name||name;P.video.size=f.size||0;dirty=true;await flush();
  if(UI.videoEl){UI.videoEl.pause();UI.videoEl.removeAttribute('src');UI.videoEl.load()}UI.videoEl=null;UI.videoURL=null;loadVideo();
  if(UI.step!==1){UI.step=1;saveUI();renderHeader.done=0}render();toast('Video guardado. Reprodúcelo y marca cada recinto cuando aparezca.')}
/* Respaldo: un archivo .json con los datos y las fotos (el video queda en el teléfono) */
async function exportBackup(){await flush();toast('Preparando respaldo…',true);const media={};
  for(const ref of refsOf(P)){if(ref===P.video.ref||ref.startsWith('data:'))continue;try{const b=await Store.readBase64(P.id,ref);if(b)media[ref]=b}catch(e){}}
  saveFile(slug()+'-respaldo.json',JSON.stringify({huincha:1,proyecto:{...P,video:{...P.video,ref:'',size:0}},media}),'application/json')}
async function importBackup(file){try{const j=JSON.parse(await file.text());const p=j.huincha?j.proyecto:j;if(p.v!==1||!p.casa)throw 0;
    const np=normalize(p);np.id=pid();np.video.ref='';toast('Importando…',true);
    for(const [ref,b64] of Object.entries(j.media||{})){await Store.putBlob(np.id,ref,await Store.fromB64(b64,'image/jpeg'))}
    for(const k in np.fotos)np.fotos[k]=await Promise.all(np.fotos[k].map(x=>x.startsWith('data:')?dataToRef(np.id,x):x));
    for(const r of np.recintos)r.fotos=await Promise.all(r.fotos.map(x=>x.startsWith('data:')?dataToRef(np.id,x):x));
    await createProject('import',np);goStep(0);toast('Levantamiento importado.')}
  catch(err){toast('El archivo no es un respaldo de Huincha válido.')}}
async function dataToRef(id,d){const b=await (await fetch(d)).blob();return Store.putBlob(id,'foto-'+Date.now().toString(36)+uid()+'.jpg',b)}

function openLB(ref){const [tg,i]=ref.split('|');const arr=photoArr(tg);if(!arr||!arr[+i])return;const lb=$('#lb');
  lb.innerHTML=`<img src="${phSrc(arr[+i])}" alt="Foto"><div class="row"><button class="btn" id="lbia">Analizar con IA</button><button class="btn danger" id="lbdel">Eliminar foto</button><button class="btn pri" id="lbclose">Cerrar</button></div><div class="lbia" id="lbres"></div>`;lb.hidden=false;
  $('#lbia').onclick=async ev=>{ev.target.disabled=true;ev.target.textContent='Analizando…';try{const bl=await (await fetch(phSrc(arr[+i]))).blob();const r=await IA.analyze(bl,iaContexto(tg.startsWith('r:')?'foto del recinto '+(room(tg.slice(2))?.nombre||''):'foto de fachada o terreno'));iaGuardarPreguntas(r,tg.startsWith('r:')?4:1);$('#lbres').innerHTML=iaResultHTML(r)}catch(err){$('#lbres').innerHTML=`<p class="note">${esc(iaErrorMsg(err))}</p>`}ev.target.disabled=false;ev.target.textContent='Analizar con IA'};
  $('#lbclose').onclick=()=>{lb.hidden=true};let arm2=false;$('#lbdel').onclick=ev=>{if(!arm2){arm2=true;ev.target.textContent='Toca otra vez para eliminar';return}const [gone]=arr.splice(+i,1);if(gone&&!gone.startsWith('data:'))Store.delBlob(P.id,gone);persist();lb.hidden=true;render()};
  $('#lbclose').focus()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#lb').hidden)$('#lb').hidden=true});

let toastT;function toast(m,stay){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);if(!stay)toastT=setTimeout(()=>t.hidden=true,3400)}

/* Exportar: en la app se guarda en la carpeta del levantamiento y se abre Compartir (WhatsApp, Drive, correo…) */
let DL=null;if(!Store.native&&window.claude)(async()=>{try{DL=await window.claude.use('downloads')}catch(e){DL=null}})();
async function saveFile(name,data,mime){
  if(Store.native){try{const r=await Store.exportFile(P.id,name,data,mime);if(!P.planos.includes(name)){P.planos.push(name);persist()}toast(r==='shared'?'Archivo guardado y compartido.':'Archivo guardado en la app.')}catch(e){toast('No se pudo guardar el archivo.')}return}
  if(DL){try{await DL.save({filename:name,data});toast('Archivo listo: '+name)}catch(e){const c=e?.code;toast(c==='declined'?'Descarga cancelada.':'No se pudo descargar el archivo.')}return}
  const u=URL.createObjectURL(new Blob([data],{type:mime||'application/octet-stream'}));const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Archivo descargado: '+name)}

/* arrastre de recintos en el plano */
let drag=null;
document.addEventListener('pointerdown',e=>{const t=e.target.closest('#ed [data-room], #vprev [data-room]');if(!t)return;const svg=t.ownerSVGElement;const id=t.dataset.room;
  if(svg.id==='vprev'){UI.room=id;UI.vano=null;render();return}
  const r=room(id);if(!r)return;if(UI.room!==id){UI.room=id;const fr=$('#rform');render();}
  const sv=$('#ed');const pt=svgPt(sv,e);drag={id,sx:pt.x,sy:pt.y,rx:r.x,ry:r.y,pid:e.pointerId};try{sv.setPointerCapture(e.pointerId)}catch(err){}e.preventDefault()});
document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pid)return;const sv=$('#ed');if(!sv)return;const r=room(drag.id);const c=P.casa;const pt=svgPt(sv,e);
  let nx=drag.rx+(pt.x-drag.sx)/EDS,ny=drag.ry-(pt.y-drag.sy)/EDS;const others=P.recintos.filter(o=>o!==r&&valid(o));
  const xs=[0,c.ancho,...others.flatMap(o=>[o.x,o.x+o.ancho])],ys=[0,c.largo,...others.flatMap(o=>[o.y,o.y+o.largo])];
  const snap=(v,w,cs)=>{let best=null,bd=0.25;for(const k of cs){for(const cand of [k,k-w]){const dd=Math.abs(v-cand);if(dd<bd){bd=dd;best=cand}}}return best!=null?best:Math.round(v*20)/20};
  nx=clamp(snap(nx,r.ancho,xs),0,Math.max(0,c.ancho-r.ancho));ny=clamp(snap(ny,r.largo,ys),0,Math.max(0,c.largo-r.largo));r.x=r2(nx);r.y=r2(ny);
  drawEditor('ed');const ix=$('#r-x'),iy=$('#r-y');if(ix)ix.value=String(r.x).replace('.',',');if(iy)iy.value=String(r.y).replace('.',',')});
const endDrag=e=>{if(!drag||e.pointerId!==drag.pid)return;drag=null;persist();refreshLive()};
document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
function svgPt(svg,e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())}

/* ============ 3D ============ */
const V={on:false,mode:'maqueta',px:0,py:-3,yaw:0,pitch:-0.05,joy:{x:0,y:0},keys:new Set(),col:[],tour:null};
const lin=h=>new THREE.Color(h).convertSRGBToLinear();
function ensure3D(){if(V.r)return true;if(!window.THREE)return false;let r;
  try{r=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'})}catch(e){return false}
  r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.0;
  r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;V.r=r;V.aniso=Math.min(8,r.capabilities.getMaxAnisotropy());
  const S=new THREE.Scene();V.scene=S;
  /* cielo con degradé y luz ambiental generada desde el mismo cielo */
  const skyGeo=rad=>{const g=new THREE.SphereGeometry(rad,40,20),p=g.attributes.position,cols=[];const top=lin(0x5b8dc2),mid=lin(0xa7c4dd),hor=lin(0xe4ecee),bot=lin(0xb3ab9c);
    for(let i=0;i<p.count;i++){const y=p.getY(i)/rad;const c=y>=0?(y<.16?hor.clone().lerp(mid,y/.16):mid.clone().lerp(top,Math.min(1,(y-.16)/.6))):hor.clone().lerp(bot,Math.min(1,-y*5));cols.push(c.r,c.g,c.b)}
    g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));return g};
  const skyMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false,toneMapped:false});
  V.sky=new THREE.Mesh(skyGeo(450),skyMat);S.add(V.sky);
  try{const pm=new THREE.PMREMGenerator(r);const es=new THREE.Scene();es.add(new THREE.Mesh(skyGeo(40),skyMat));const sun=new THREE.Mesh(new THREE.SphereGeometry(3,16,8),new THREE.MeshBasicMaterial({color:new THREE.Color(7,6.4,5.4)}));sun.position.set(14,26,-14);es.add(sun);S.environment=pm.fromScene(es,0.035).texture;pm.dispose()}catch(e){}
  S.fog=new THREE.Fog(lin(0xdfe8eb),90,400);
  V.hemi=new THREE.HemisphereLight(lin(0xdbe9f6),lin(0x8a826e),0.3);S.add(V.hemi);V.amb=new THREE.AmbientLight(lin(0xfff4e6),0);S.add(V.amb);V.lamp=new THREE.PointLight(lin(0xfff1dd),0,12,1.4);S.add(V.lamp);
  const sl=new THREE.DirectionalLight(lin(0xfff0dc),2.3);sl.castShadow=true;sl.shadow.mapSize.set(2048,2048);sl.shadow.bias=-0.0003;sl.shadow.normalBias=0.025;S.add(sl);S.add(sl.target);V.sunL=sl;
  V.cam=new THREE.PerspectiveCamera(55,1,0.05,1200);
  const cv=r.domElement;const ptrs=new Map();let pinch=0;const dist=()=>{const a=[...ptrs.values()];return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)};
  cv.addEventListener('pointerdown',e=>{try{cv.setPointerCapture(e.pointerId)}catch(err){}ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(ptrs.size===2)pinch=dist()});
  cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
    if(ptrs.size>=2){const d=dist();if(V.mode==='maqueta'&&pinch)V.orb.r=clamp(V.orb.r*pinch/d,3,180);pinch=d;return}
    if(V.mode==='maqueta'){V.orb.th-=dx*0.006;V.orb.ph=clamp(V.orb.ph-dy*0.006,0.12,1.5)}else{V.yaw+=dx*0.005;V.pitch=clamp(V.pitch-dy*0.004,-1.1,1.1)}});
  const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=0};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('wheel',e=>{if(V.mode!=='maqueta')return;e.preventDefault();V.orb.r=clamp(V.orb.r*(1+e.deltaY*0.001),3,180)},{passive:false});
  window.addEventListener('keydown',e=>{if(V.on&&!/INPUT|SELECT/.test(e.target.tagName))V.keys.add(e.key.toLowerCase())});window.addEventListener('keyup',e=>V.keys.delete(e.key.toLowerCase()));
  V.ro=new ResizeObserver(()=>size3D());return true}
function size3D(){const h=$('#viewer');if(!h||!V.r)return;const w=h.clientWidth,ht=h.clientHeight;if(!w||!ht)return;V.r.setSize(w,ht,false);V.cam.aspect=w/ht;V.cam.updateProjectionMatrix()}
function open3D(){const host=$('#viewer');if(!host)return;
  if(!ensure3D()){host.insertAdjacentHTML('beforeend','<div class="v3msg">No se pudo iniciar el motor 3D. Revisa tu conexión y vuelve a abrir este paso.</div>');return}
  const c=P.casa;if(!(c.ancho>0&&c.largo>0&&c.altura>0)){host.insertAdjacentHTML('beforeend','<div class="v3msg">Ingresa las medidas de la casa para generar el recorrido.</div>');return}
  host.prepend(V.r.domElement);V.ro.disconnect();V.ro.observe(host);size3D();host.classList.toggle('dim',!!UI.m3);drawM3();
  const ld=document.createElement('div');ld.className='vload';ld.textContent='Preparando materiales…';host.appendChild(ld);const tok=V.tok=(V.tok||0)+1;
  setTimeout(()=>{if(tok!==V.tok||!document.body.contains(host))return;try{build3D();sk3D()}catch(e){console.error(e);ld.textContent='No se pudo construir el modelo 3D.';return}ld.remove();V.mode=UI.mode;
    if(V.mode==='libre'){initWalk();bindJoy()}if(V.mode==='guiada')startTour();applyVis();V.on=true;V.lt=0;V.raf=requestAnimationFrame(loop)},40)}
function stop3D(){V.on=false;V.tok=(V.tok||0)+1;if(V.raf)cancelAnimationFrame(V.raf);V.keys.clear()}
function rebuild3D(){if(!V.r||!V.on)return;V.keepCam=true;build3D();sk3D();applyVis()}
/* Estilo croquis del recorrido 3D: volúmenes blancos con aristas, fondo blanco */
function sk3D(){const on=!!UI.sketch,S=V.scene;if(!S)return;if(on&&V.root)sketchify(V.root,{big:60,shadows:true});
  if(V.sky)V.sky.visible=!on;S.background=on?new THREE.Color(0xffffff):null;if(S.fog)S.fog.color=on?new THREE.Color(0xffffff):lin(0xdfe8eb);
  if(V.hemi)V.hemi.intensity=on?1.05:0.3;if(V.sunL)V.sunL.intensity=on?1.15:2.3}

/* materiales 3D a partir del catálogo; las coordenadas UV van en metros */
const MC=new Map();
function texFor(tex,col){const k='t|'+tex+'|'+col;if(MC.has(k))return MC.get(k);const t=MatTex.get(tex,col,512);const tx=new THREE.CanvasTexture(t.canvas);
  tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.encoding=THREE.sRGBEncoding;tx.anisotropy=V.aniso||4;tx.repeat.set(1/t.size[0],1/t.size[1]);tx._alpha=t.alpha;MC.set(k,tx);return tx}
function mStd(tex,col,o={}){const k=['m',tex,col,o.rough,o.metal,o.side,o.env].join('|');if(MC.has(k))return MC.get(k);
  const p={roughness:o.rough??.85,metalness:o.metal??0};if(tex&&tex!=='flat'&&tex!=='none'){p.map=texFor(tex,col);if(p.map._alpha){p.alphaTest=.5;p.side=THREE.DoubleSide}}else p.color=lin(col);
  if(o.side)p.side=THREE.DoubleSide;if(o.env!=null)p.envMapIntensity=o.env;const m=new THREE.MeshStandardMaterial(p);m.userData.tex=tex;MC.set(k,m);return m}
function mCat(cat,k,o={}){const op=MATS[cat].opts[k];if(!op)return mStd('flat','#cccccc',o);const {col,...q}=o;if(['piso','muroInt','cielo','puertas'].includes(cat)&&q.env==null)q.env=.35;if(op.rough!=null&&q.rough==null)q.rough=op.rough;if(op.metal!=null&&q.metal==null)q.metal=op.metal;return mStd(op.tex,col||matColor(cat,k,P.mat),q)}
function uvWorld(g){const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){const nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i),ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);let u,v;
    if(ay>=ax&&ay>=az){u=p.getX(i);v=-p.getZ(i)}else if(ax>=az){u=nx>0?-p.getZ(i):p.getZ(i);v=p.getY(i)}else{u=nz>0?p.getX(i):-p.getX(i);v=p.getY(i)}uv[i*2]=u;uv[i*2+1]=v}
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return g}
/* caja en coordenadas del terreno: x hacia la derecha, y hacia el fondo, z altura */
function boxG(x0,x1,y0,y1,z0,z1){const g=new THREE.BoxGeometry(Math.max(.001,x1-x0),Math.max(.001,z1-z0),Math.max(.001,y1-y0));g.translate((x0+x1)/2,(z0+z1)/2,-(y0+y1)/2);return uvWorld(g)}
function sunDir(){const n=-(P.lote.norte||0)*Math.PI/180-0.55,el=0.84;return new THREE.Vector3(Math.sin(n)*Math.cos(el),Math.sin(el),-Math.cos(n)*Math.cos(el))}

function build3D(){const S=V.scene;if(V.root){S.remove(V.root);V.root.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  const root=new THREE.Group();V.root=root;S.add(root);
  const c=P.casa,lo=P.lote,M=P.mat,G=geom();V.G=G;const W=G.W,L=G.L,H=G.H,a=+c.alero||0,e=+c.eExt||0.2;
  const ox=+c.retiroIzq||0,oz=+c.retiroFrontal||0;V.ox=ox;V.oz=oz;
  const LP=lotPoly(),LB=lotBox(4),F=Math.max(LB.x1,ox+W+2),D=Math.max(LB.y1,oz+L+2);V.F=F;V.D=D;V.X0=Math.min(0,LB.x0);
  V.toW=(x,y,z)=>new THREE.Vector3(ox+x,z,-(oz+y));
  const add=(geo,mat,o={})=>{const m=new THREE.Mesh(geo,mat);m.castShadow=o.cast!==false;m.receiveShadow=o.recv!==false;(o.to||root).add(m);return m};
  const hb=(x0,x1,y0,y1,z0,z1)=>boxG(ox+x0,ox+x1,oz+y0,oz+y1,z0,z1);
  const kExt=M.revExt||'estuco',kRoof=MATS.cubierta.opts[M.cubierta]?M.cubierta:(c.techo==='plana'?'losa':'teja');
  const mExt=mCat('revExt',kExt),mTop=mStd('flat','#D6D2CA',{rough:.9}),mIntDef=mCat('muroInt',M.muroInt||'pintura');
  const mFrame=mCat('ventanas',M.ventanas||'alBlanco'),mDoor=mCat('puertas',M.puertas||'madera');
  const mCasing=M.puertas==='madera'||!M.puertas?mDoor:mStd('paint','#EFEDE7',{rough:.6});
  const mConc=mStd('concrete','#B4B1AA',{rough:.9}),mSill=mStd('flat','#D9D6CF',{rough:.8}),mMetal=mStd('flat','#8F918E',{rough:.3,metal:.8});
  if(!MC.has('glass'))MC.set('glass',new THREE.MeshStandardMaterial({color:lin(0x9fbfcc),roughness:.04,metalness:.1,transparent:true,opacity:.3,envMapIntensity:1.6,depthWrite:false,side:THREE.DoubleSide}));const mGlass=MC.get('glass');

  /* entorno: pasto, lote, vereda, solera y calzada */
  const gg=new THREE.PlaneGeometry(700,700);gg.rotateX(-Math.PI/2);gg.translate(F/2,-0.2,-D/2);uvWorld(gg);add(gg,mStd('grass','#56743A',{rough:1}),{cast:false});
  {const sh=new THREE.Shape((LP||[[0,0],[F,0],[F,D],[0,D]]).map(q=>new THREE.Vector2(q[0],q[1])));const lg=new THREE.ShapeGeometry(sh);lg.rotateX(-Math.PI/2);lg.translate(0,-0.17,0);add(lg,mCat('terreno',M.terreno||'pasto',{side:1}),{cast:false})}
  /* caja orientada a lo largo de un lado a→b del terreno (t: tramo 0..1, p: desplazamiento perpendicular) */
  const eb=(a,b,t0,t1,p0,p1,z0,z1)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;const g=new THREE.BoxGeometry(Math.max(.001,(t1-t0)*l),Math.max(.001,z1-z0),Math.max(.001,p1-p0));uvWorld(g);
    const tm=(t0+t1)/2,pc=(p0+p1)/2,cx=a[0]+dx*tm-dy/l*pc,cy=a[1]+dy*tm+dx/l*pc;g.rotateY(Math.atan2(dy,dx));g.translate(cx,(z0+z1)/2,-cy);return g};
  add(boxG(-50,F+50,-2.2,0,-0.2,-0.14),mStd('sidewalk','#BDB9B1',{rough:.9}),{cast:false});
  add(boxG(-50,F+50,-2.36,-2.2,-0.24,-0.1),mStd('flat','#C9C6BF',{rough:.85}),{cast:false});
  add(boxG(-50,F+50,-10,-2.36,-0.24,-0.2),mStd('asphalt','#45484A',{rough:.95}),{cast:false});
  for(let x=-46;x<F+46;x+=6)add(boxG(x,x+3,-6.24,-6.12,-0.2,-0.197),mStd('flat','#ECECE6',{rough:.7}),{cast:false});
  const fd=G.ops.find(q=>q.walk&&q.ax==='h'&&near(q.c,0));const px=ox+(fd?(fd.s+fd.e)/2:W/2);
  if(oz>0.4)add(boxG(px-0.6,px+0.6,0,oz-e/2-0.35,-0.17,-0.15),mStd('pavers','#B7B3AB',{rough:.9}),{cast:false});
  if(fd)add(boxG(px-0.75,px+0.75,oz-e/2-0.38,oz-e/2,-0.17,-0.02),mConc);

  /* sobrecimiento y pisos */
  add(hb(-e/2-0.03,W+e/2+0.03,-e/2-0.03,L+e/2+0.03,-0.17,-0.002),mConc,{cast:false});
  for(const r of P.recintos){if(!valid(r))continue;add(hb(r.x,r.x+r.ancho,r.y,r.y+r.largo,-0.002,0.004),mCat('piso',floorOf(r)),{cast:false})}

  /* muros: cada cara toma el revestimiento del lado al que mira */
  const roomAt=(x,y)=>P.recintos.find(r=>valid(r)&&x>r.x-EPS&&x<r.x+r.ancho+EPS&&y>r.y-EPS&&y<r.y+r.largo+EPS);
  const outside=(x,y)=>x<-EPS||y<-EPS||x>W+EPS||y>L+EPS;
  const side=(x,y)=>{if(outside(x,y))return mExt;const r=roomAt(x,y);return r?mCat('muroInt',wallOf(r),roomColor(r)?{col:r.color}:{}):mIntDef};
  const RV=P.recintos.filter(valid);const brk={h:[...new Set(RV.flatMap(r=>[r.x,r.x+r.ancho]))],v:[...new Set(RV.flatMap(r=>[r.y,r.y+r.largo]))]};
  const split=(ax,a0,b0,ea,eb)=>{const pts=[a0,...brk[ax].filter(v=>v>a0+0.02&&v<b0-0.02).sort((u,w)=>u-w),b0];return pts.slice(1).map((v,i)=>({a:pts[i],b:v,ea:i===0&&ea,eb:i===pts.length-2&&eb}))};
  function seg(l,a0,b0,ea,eb,z0,z1){if(b0-a0<0.004||z1-z0<0.004)return;const t=l.t,A=a0-(ea?t/2:0),B=b0+(eb?t/2:0),m=(a0+b0)/2,end=l.ext?mExt:mIntDef;
    if(l.ax==='h'){const lo2=side(m,l.c-t/2-0.05),hi=side(m,l.c+t/2+0.05);add(hb(A,B,l.c-t/2,l.c+t/2,z0,z1),[end,end,mTop,mTop,lo2,hi])}
    else{const lo2=side(l.c-t/2-0.05,m),hi=side(l.c+t/2+0.05,m);add(hb(l.c-t/2,l.c+t/2,A,B,z0,z1),[hi,lo2,mTop,mTop,end,end])}}
  V.col=[];
  for(const l of G.lines){const t=l.t;
    for(const p of pieces(l.iv,l.ops.map(q=>[q.s,q.e])))for(const sp of split(l.ax,p.a,p.b,p.ea,p.eb))seg(l,sp.a,sp.b,sp.ea,sp.eb,0,H);
    for(const q of l.ops){seg(l,q.s,q.e,false,false,0,q.z0);seg(l,q.s,q.e,false,false,q.z1,H)}
    for(const p of pieces(l.iv,l.ops.filter(q=>q.walk).map(q=>[q.s,q.e]))){const a0=p.a-(p.ea?t/2:0),b0=p.b+(p.eb?t/2:0);V.col.push(l.ax==='h'?{x0:a0,x1:b0,y0:l.c-t/2,y1:l.c+t/2}:{x0:l.c-t/2,x1:l.c+t/2,y0:a0,y1:b0})}}

  /* zócalo de fachada */
  if(M.zocalo&&M.zocalo!=='ninguno'){const mZ=mCat('zocalo',M.zocalo),zh=0.6;
    for(const l of G.lines){if(!l.ext)continue;const t=l.t,out=near(l.c,0)?-1:1,f=l.c+out*t/2,p0=Math.min(f,f+out*0.025),p1=Math.max(f,f+out*0.025);
      for(const p of pieces(l.iv,l.ops.filter(q=>q.z0<zh+0.02).map(q=>[q.s,q.e]))){const a0=p.a-(p.ea?t/2+0.025:0),b0=p.b+(p.eb?t/2+0.025:0);add(l.ax==='h'?hb(a0,b0,p0,p1,-0.17,zh):hb(p0,p1,a0,b0,-0.17,zh),mZ)}}}
  /* ventanas con marco, palillos, vidrio y alféizar; puertas con marco y hoja entreabierta */
  const axB=(q,a0,a1,p0,p1,z0,z1)=>q.ax==='h'?hb(a0,a1,p0,p1,z0,z1):hb(p0,p1,a0,a1,z0,z1);
  for(const q of G.ops){const l=lineOf(G,q);const t=l?l.t:c.eInt;
    if(q.isWin||q.v.tipo==='puerta-ventana'){const fw=0.055,fdp=Math.min(0.08,t*0.7);const fr=(a0,a1,z0,z1)=>add(axB(q,a0,a1,q.c-fdp/2,q.c+fdp/2,z0,z1),mFrame);
      fr(q.s,q.s+fw,q.z0,q.z1);fr(q.e-fw,q.e,q.z0,q.z1);fr(q.s,q.e,q.z1-fw,q.z1);fr(q.s,q.e,q.z0,q.z0+fw);
      const w=q.e-q.s,nm=q.v.tipo==='puerta-ventana'?Math.max(2,Math.round(w/0.9)):(w>1.0?Math.max(2,Math.round(w/0.9)):1);for(let k=1;k<nm;k++){const m=q.s+w*k/nm;fr(m-fw/2,m+fw/2,q.z0,q.z1)}
      add(axB(q,q.s+fw,q.e-fw,q.c-0.006,q.c+0.006,q.z0+fw,q.z1-fw),mGlass,{cast:false,recv:false});
      if(q.isWin&&l&&l.ext){const out=near(q.c,0)?-1:1,face=q.c+out*t/2,p0=face-out*0.02,p1=face+out*0.06;add(axB(q,q.s-0.04,q.e+0.04,Math.min(p0,p1),Math.max(p0,p1),q.z0-0.05,q.z0),mSill)}}
    else if(q.v.tipo==='puerta'){const cs=0.05,cd=t+0.02;const fr=(a0,a1,z0,z1)=>add(axB(q,a0,a1,q.c-cd/2,q.c+cd/2,z0,z1),mCasing);
      fr(q.s-cs,q.s+0.006,0,q.z1+cs);fr(q.e-0.006,q.e+cs,0,q.z1+cs);fr(q.s-cs,q.e+cs,q.z1-0.006,q.z1+cs);
      const w=q.e-q.s-0.01,h=q.z1-0.012,th=0.04;const g=new THREE.BoxGeometry(w,h,th);g.translate(w/2,h/2,0);uvWorld(g);
      const hg=q.hinge==='e'?q.e:q.s,ot=q.hinge==='e'?q.s:q.e,sg=Math.sign(ot-hg)||1;let Hx,Hy,d0,d9;
      if(q.ax==='h'){Hx=hg;Hy=q.c+q.inward*(t/2);d0=[sg,0];d9=[0,q.inward]}else{Hx=q.c+q.inward*(t/2);Hy=hg;d0=[0,sg];d9=[q.inward,0]}
      const an=1.2,dx=d0[0]*Math.cos(an)+d9[0]*Math.sin(an),dy=d0[1]*Math.cos(an)+d9[1]*Math.sin(an);
      const leaf=add(g,mDoor);leaf.rotation.y=Math.atan2(dy,dx);leaf.position.copy(V.toW(Hx,Hy,0.006));
      const hgeo=new THREE.BoxGeometry(0.13,0.025,0.075);hgeo.translate(w-0.08,1.0,0);const hd=add(hgeo,mMetal,{cast:false});hd.rotation.copy(leaf.rotation);hd.position.copy(leaf.position)}}

  /* cielo */
  V.ceil=add(hb(0,W,0,L,H,H+0.012),mCat('cielo',M.cielo||'yeso'),{cast:false});

  /* frontones: extruidos con el espesor del muro */
  if(c.techo!=='plana')for(const [ax,cc,len] of [['h',0,W],['h',L,W],['v',0,L],['v',W,L]]){const bp=[0,len/2,len];const hz=bp.map(u=>ax==='h'?roofZ(u,cc):roofZ(cc,u));if(Math.max(...hz)-H<0.01)continue;
    const sh=new THREE.Shape();sh.moveTo(0,H);sh.lineTo(len,H);for(let i=2;i>=0;i--)sh.lineTo(bp[i],Math.max(H,hz[i]));sh.lineTo(0,H);
    const g=new THREE.ExtrudeGeometry(sh,{depth:e,bevelEnabled:false});
    if(ax==='h')g.translate(ox,0,-(oz+cc+e/2));else{g.rotateY(Math.PI/2);g.translate(ox+cc-e/2,0,-oz)}
    uvWorld(g);add(g,mExt)}

  /* techumbre con espesor, tapacán, cumbrera, aleros, canaletas y bajadas */
  const roofG=new THREE.Group();root.add(roofG);V.roofG=roofG;
  const mRoof=mCat('cubierta',kRoof,{side:1}),mSoffit=mStd('paint','#ECE8E0',{rough:.85,side:1}),mFascia=mCat('molduras',M.molduras||'pintada',{side:1}),mGut=mStd('flat','#C3C7C9',{rough:.35,metal:.5});
  if(c.techo==='plana'){add(hb(-a,W+a,-a,L+a,H,H+0.25),[mFascia,mFascia,mRoof,mSoffit,mFascia,mFascia],{to:roofG})}
  else{const rt=0.14,par=c.techo==='un-agua'||c.cumbrera==='paralela',ri=roofInfo(),f=Math.sqrt(1+ri.m*ri.m);const xs=roofBps('x'),ys=roofBps('y');
    const P3=(x,y,dz)=>V.toW(x,y,roofZ(x,y)+dz);
    const mk=(p,u)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));g.computeVertexNormals();return g};
    const pt=[],ut=[],pb=[],ub=[];
    const zq=p=>roofZ(p[0],p[1]);
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){const q=[[xs[i],ys[j]],[xs[i+1],ys[j]],[xs[i+1],ys[j+1]],[xs[i],ys[j+1]]];const zc=roofZ((q[0][0]+q[2][0])/2,(q[0][1]+q[2][1])/2),e02=Math.abs((zq(q[0])+zq(q[2]))/2-zc),e13=Math.abs((zq(q[1])+zq(q[3]))/2-zc);const tri=e13<e02-1e-6?[q[0],q[1],q[3],q[1],q[2],q[3]]:[q[0],q[1],q[2],q[0],q[2],q[3]];
      for(const [x,y] of tri){const v=P3(x,y,rt);pt.push(v.x,v.y,v.z);if(par)ut.push(x,y*f);else ut.push(y,x*f);const b=P3(x,y,0);pb.push(b.x,b.y,b.z);ub.push(x,y)}}
    add(mk(pt,ut),mRoof,{to:roofG});add(mk(pb,ub),mSoffit,{to:roofG,cast:false});
    const per=[[-a,-a],[W/2,-a],[W+a,-a],[W+a,L/2],[W+a,L+a],[W/2,L+a],[-a,L+a],[-a,L/2],[-a,-a]];const fp=[],fu=[];let acc=0;
    for(let i=0;i<per.length-1;i++){const [x1,y1]=per[i],[x2,y2]=per[i+1];const ln=Math.hypot(x2-x1,y2-y1);if(ln<1e-3)continue;const A=P3(x1,y1,-0.05),B=P3(x2,y2,-0.05),A2=P3(x1,y1,rt+0.01),B2=P3(x2,y2,rt+0.01);
      fp.push(A.x,A.y,A.z,B.x,B.y,B.z,B2.x,B2.y,B2.z,A.x,A.y,A.z,B2.x,B2.y,B2.z,A2.x,A2.y,A2.z);fu.push(acc,0,acc+ln,0,acc+ln,.2,acc,0,acc+ln,.2,acc,.2);acc+=ln}
    add(mk(fp,fu),mFascia,{to:roofG});
    if(c.techo==='cuatro-aguas'){const rc=mStd('flat',MatTex.shade(matColor('cubierta',kRoof,M),-.25),{rough:.7});const sp=Math.min(W,L)/2,z=roofZ(W/2,L/2)+rt;if(W>=L)add(hb(sp-0.05,W-sp+0.05,L/2-0.13,L/2+0.13,z-0.03,z+0.08),rc,{to:roofG});else add(hb(W/2-0.13,W/2+0.13,sp-0.05,L-sp+0.05,z-0.03,z+0.08),rc,{to:roofG})}
    if(c.techo==='dos-aguas'){const rc=mStd('flat',MatTex.shade(matColor('cubierta',kRoof,M),-.25),{rough:.7});
      if(par){const z=roofZ(0,L/2)+rt;add(hb(-a-0.02,W+a+0.02,L/2-0.13,L/2+0.13,z-0.03,z+0.08),rc,{to:roofG})}
      else{const z=roofZ(W/2,0)+rt;add(hb(W/2-0.13,W/2+0.13,-a-0.02,L+a+0.02,z-0.03,z+0.08),rc,{to:roofG})}}
    const eaves=c.techo==='un-agua'?[['h',L+a]]:c.techo==='cuatro-aguas'?[['h',-a],['h',L+a],['v',-a],['v',W+a]]:par?[['h',-a],['h',L+a]]:[['v',-a],['v',W+a]];
    for(const [ax,ev] of eaves){const o=(ev<0?-1:1)*0.07;
      if(ax==='h'){const z=roofZ(0,ev)-0.03;add(hb(-a,W+a,ev+o-0.06,ev+o+0.06,z-0.11,z+0.02),mGut,{to:roofG});for(const x of [-a+0.2,W+a-0.2])add(hb(x-0.04,x+0.04,ev+o-0.04,ev+o+0.04,-0.17,z-0.1),mGut,{to:roofG})}
      else{const z=roofZ(ev,0)-0.03;add(hb(ev+o-0.06,ev+o+0.06,-a,L+a,z-0.11,z+0.02),mGut,{to:roofG});for(const y of [-a+0.2,L+a-0.2])add(hb(ev+o-0.04,ev+o+0.04,y-0.04,y+0.04,-0.17,z-0.1),mGut,{to:roofG})}}}

  buildVols3D(add,hb,mExt,mRoof);buildElems3D(root,ox,oz);
  /* cierre perimetral, siguiendo cada lado del terreno, con acceso frente a la puerta */
  const ce=MATS.cierre.opts[M.cierre];
  if(ce&&M.cierre!=='ninguno'&&LP){const hg=ce.h||1.6,fe=frontEdge(LP);
    const mF=mCat('cierre',M.cierre,{side:1}),mPost=M.cierre==='madera'?mStd('woodV','#5F4430',{rough:.9}):mStd('flat',M.cierre==='albanileria'?'#B9B4AA':'#2F3337',{rough:.5,metal:M.cierre==='albanileria'?0:.4});
    for(let i=0;i<LP.length;i++){const a=LP[i],b=LP[(i+1)%LP.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l<0.2)continue;let segs=[[0,1]];
      if(fe&&((a===fe.a&&b===fe.b)||(a===fe.b&&b===fe.a))){const t=(px-a[0])/(b[0]-a[0]),dt=0.7/l;segs=[[0,Math.max(0,t-dt)],[Math.min(1,t+dt),1]]}
      for(const [t0,t1] of segs){if((t1-t0)*l<0.15)continue;const bx=(p0,p1,z0,z1)=>eb(a,b,t0,t1,p0,p1,z0,z1);
        const posts=(w,z1,step)=>{for(let u=t0*l;u<=t1*l+0.01;u+=step){const t=Math.min(u,t1*l)/l;add(eb(a,b,t-w/l,t+w/l,-w,w,-0.17,z1),mPost)}};
        if(M.cierre==='albanileria'){add(bx(-0.07,0.07,-0.17,hg),mF);add(bx(-0.09,0.09,hg,hg+0.06),mPost)}
        else if(M.cierre==='madera'){add(bx(-0.012,0.012,-0.1,hg),mF);posts(0.045,hg+0.05,2.4)}
        else{add(bx(-0.004,0.004,-0.12,hg),mF,{cast:false});add(bx(-0.02,0.02,hg-0.04,hg),mPost);add(bx(-0.02,0.02,-0.1,-0.06),mPost);posts(0.03,hg+0.05,2.5)}}}}

  /* árboles y arbustos */
  if(!MC.has('leaf'))MC.set('leaf',[0x4E6B32,0x5B7A38,0x46612D].map(hh=>new THREE.MeshStandardMaterial({color:lin(hh),roughness:.9,flatShading:true})));const leafM=MC.get('leaf'),mTrunk=mStd('woodV','#5E4632',{rough:.9});
  const tree=(x,y,s)=>{const tg=new THREE.CylinderGeometry(0.09*s,0.15*s,2.1*s,8);tg.translate(x,-0.17+1.05*s,-y);add(tg,mTrunk);
    for(let k=0;k<4;k++){const ang=k*1.9+x,r=(0.85+0.3*Math.sin(k*2.3+y))*s;const g=new THREE.IcosahedronGeometry(r,1);g.translate(x+Math.cos(ang)*0.5*s*(k?1:0),-0.17+2.3*s+(k?0.1:0.55)*s,-(y+Math.sin(ang)*0.5*s*(k?1:0)));add(g,leafM[k%3])}};
  const by=D-(oz+L),Fx=F;const okT=(x,y)=>(!LP||inPoly(x,y,LP))&&!(x>ox-1.5&&x<ox+W+1.5&&y>oz-1.5&&y<oz+L+1.5);const tr=(x,y,k)=>{if(okT(x,y))tree(x,y,k)};
  if(by>3.5){tr(Fx*0.22,oz+L+by*0.6,1.25);if(Fx>8)tr(Fx*0.8,D-Math.min(2,by*0.3),1.05)}
  if(oz>4.5){const tx=px<Fx/2?Math.min(Fx-1.5,Fx*0.82):Math.max(1.5,Fx*0.18);tr(tx,oz*0.45,1.1)}
  if(oz>1.6)for(let x=ox+0.6;x<ox+W-0.4;x+=1.15){if(Math.abs(x-px)<1.1)continue;const g=new THREE.IcosahedronGeometry(0.36+0.08*Math.sin(x*3),1);g.scale(1,0.8,1);g.translate(x,-0.17+0.26,-(oz-e/2-0.55));add(g,leafM[Math.floor(x*7)%3])}

  /* sol desde el norte, con sombras ajustadas al terreno */
  const ctr=new THREE.Vector3(F/2,0,-D/2),ext=Math.max(F,D)/2+8,sd=sunDir(),sl=V.sunL;
  sl.position.copy(ctr).addScaledVector(sd,90);sl.target.position.copy(ctr);Object.assign(sl.shadow.camera,{left:-ext,right:ext,top:ext,bottom:-ext,near:1,far:220});sl.shadow.camera.updateProjectionMatrix();
  const hc=V.toW(W/2,L/2,0);if(!V.keepCam||!V.orb)V.orb={tx:hc.x,ty:1.3,tz:hc.z,r:Math.max(W,L)*1.7+7,th:-0.62,ph:1.08};V.keepCam=false}
function applyVis(){if(!V.roofG)return;const m=UI.mode,inn=m!=='maqueta';V.roofG.visible=inn||UI.roof;V.ceil.visible=inn;V.amb.intensity=inn?.2:0;V.lamp.intensity=inn?.85:0}
const M3TABS=[['revExt','Fachada'],['zocalo','Zócalo'],['molduras','Molduras'],['cubierta','Cubierta'],['piso','Pisos'],['muroInt','Muros'],['ventanas','Ventanas'],['puertas','Puertas'],['terreno','Patio'],['cierre','Cierre']];
function drawM3(){const el=$('#m3');if(!el)return;el.hidden=!UI.m3;$('#viewer')?.classList.toggle('dim',!!UI.m3);if(!UI.m3)return;const cat=UI.m3tab||'revExt';
  el.innerHTML=`<div class="m3-top"><b>Materiales</b><button class="btn sm" data-act="m3">Cerrar</button></div><div class="tabs">${M3TABS.map(([k,n])=>`<button class="btn" data-m3tab="${k}" aria-pressed="${k===cat}">${n}</button>`).join('')}</div>${swatches(cat,true)}${colorDots(cat)}`}
function loop(t){if(!V.on)return;const dt=V.lt?Math.min(0.05,(t-V.lt)/1000):0.016;V.lt=t;upd(dt);V.r.render(V.scene,V.cam);V.raf=requestAnimationFrame(loop)}
function upd(dt){if(V.mode==='maqueta'){const o=V.orb;V.cam.position.set(o.tx+o.r*Math.sin(o.ph)*Math.sin(o.th),o.ty+o.r*Math.cos(o.ph),o.tz+o.r*Math.sin(o.ph)*Math.cos(o.th));V.cam.lookAt(o.tx,o.ty,o.tz);return}
  if(V.mode==='libre'){const k=V.keys;let f=-V.joy.y+((k.has('w')||k.has('arrowup'))?1:0)-((k.has('s')||k.has('arrowdown'))?1:0);let st=V.joy.x+(k.has('d')?1:0)-(k.has('a')?1:0);
    V.yaw+=((k.has('arrowright')?1:0)-(k.has('arrowleft')?1:0))*1.6*dt;const sp=1.5*dt;const dx=(Math.sin(V.yaw)*f+Math.cos(V.yaw)*st)*sp,dy=(Math.cos(V.yaw)*f-Math.sin(V.yaw)*st)*sp;
    if(!blocked(V.px+dx,V.py))V.px+=dx;if(!blocked(V.px,V.py+dy))V.py+=dy;V.px=clamp(V.px,(V.X0||0)-V.ox-2,V.F-V.ox+2);V.py=clamp(V.py,-V.oz-6,V.D-V.oz+2)}
  if(V.mode==='guiada')tourStep(dt);
  const p=V.toW(V.px,V.py,1.6);V.cam.position.copy(p);V.lamp.position.set(p.x,p.y+0.5,p.z);const cp=Math.cos(V.pitch);V.cam.lookAt(V.toW(V.px+Math.sin(V.yaw)*cp,V.py+Math.cos(V.yaw)*cp,1.6+Math.sin(V.pitch)))}
function blocked(x,y){const R=0.22;for(const b of V.col){const cx=clamp(x,b.x0,b.x1),cy=clamp(y,b.y0,b.y1);if((x-cx)**2+(y-cy)**2<R*R)return true}return false}
function frontDoor(){const G=V.G;const q=G.ops.find(q=>q.walk&&q.ax==='h'&&near(q.c,0))||G.ops.find(q=>q.walk&&lineOf(G,q)?.ext);return q}
function initWalk(){const q=frontDoor();const c=P.casa;if(q&&q.ax==='h'&&near(q.c,0)){V.px=(q.s+q.e)/2;V.py=-2.5;V.yaw=0}else{V.px=c.ancho/2;V.py=-3;V.yaw=0}V.pitch=-0.05}
function bindJoy(){const j=$('#joy'),k=$('#knob');if(!j)return;let pid=null;const set=e=>{const r=j.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}V.joy={x,y};k.style.transform=`translate(${x*34}px,${y*34}px)`};
  j.addEventListener('pointerdown',e=>{pid=e.pointerId;try{j.setPointerCapture(pid)}catch(err){}set(e);e.preventDefault()});j.addEventListener('pointermove',e=>{if(e.pointerId===pid)set(e)});
  const end=e=>{if(e.pointerId!==pid)return;pid=null;V.joy={x:0,y:0};k.style.transform=''};j.addEventListener('pointerup',end);j.addEventListener('pointercancel',end)}
function computeTour(){const G=V.G;const rooms=P.recintos.filter(valid);if(!rooms.length)return null;const ctr=id=>{const r=room(id);return{x:r.x+r.ancho/2,y:r.y+r.largo/2}};
  const adj=new Map();const addE=(a,b,q)=>{if(!adj.has(a))adj.set(a,[]);adj.get(a).push({to:b,q})};
  for(const q of G.ops){if(!q.walk)continue;const ns=rooms.filter(r=>edgeMatch(q,r)).map(r=>r.id);if(lineOf(G,q)?.ext)ns.push('EXT');for(const x of ns)for(const y of ns)if(x!==y)addE(x,y,q)}
  const start=adj.has('EXT')?'EXT':rooms[0].id;const order=[],seen=new Set();(function dfs(n){seen.add(n);if(n!=='EXT')order.push(n);for(const e of adj.get(n)||[])if(!seen.has(e.to))dfs(e.to)})(start);
  for(const r of rooms)if(!seen.has(r.id))order.push(r.id);
  const path=(a,b)=>{const prev=new Map([[a,null]]);const qu=[a];while(qu.length){const n=qu.shift();if(n===b)break;for(const e of adj.get(n)||[])if(!prev.has(e.to)){prev.set(e.to,{from:n,q:e.q});qu.push(e.to)}}if(!prev.has(b))return null;const out=[];let n=b;while(prev.get(n)){const p=prev.get(n);out.unshift({to:n,q:p.q});n=p.from}return out};
  const pts=[];let p;
  if(start==='EXT'){const q=frontDoor()||adj.get('EXT')[0].q;const mid=(q.s+q.e)/2;const out=q.ax==='h'?{x:mid,y:near(q.c,0)?-4:q.c+4}:{x:near(q.c,0)?-4:q.c+4,y:mid};p=out;pts.push({...out})}else{p=ctr(start);pts.push({...p,stop:start})}
  const cross=q=>{const mid=(q.s+q.e)/2;const side=Math.sign((q.ax==='h'?p.y:p.x)-q.c)||1;const mk=off=>q.ax==='h'?{x:mid,y:q.c+off}:{x:q.c+off,y:mid};pts.push(mk(side*0.6),mk(-side*0.6));p=mk(-side*0.6)};
  let cur=start;const visited=new Set([start]);
  for(const n of order){if(n===cur)continue;const pa=path(cur,n);
    if(pa){for(const st of pa){cross(st.q);if(st.to!=='EXT'){const cc=ctr(st.to);pts.push({...cc,stop:(st.to===n&&!visited.has(n))?n:null});p=cc}}}else{const cc=ctr(n);pts.push({...cc,stop:n});p=cc}
    visited.add(n);cur=n}
  return pts}
function startTour(){const pts=computeTour();V.tour={pts,i:0,pause:0,playing:!!pts};if(!pts){hud(null);return}V.px=pts[0].x;V.py=pts[0].y;const n=pts[1]||pts[0];V.yaw=Math.atan2(n.x-V.px,n.y-V.py);V.pitch=-0.05;
  if(pts[0].stop){V.tour.pause=3.2;hud(pts[0].stop)}else hud('start')}
const angd=(a,b)=>{let d=(a-b)%(2*Math.PI);if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;return d};
function tourStep(dt){const T=V.tour;if(!T||!T.pts||!T.playing)return;if(T.pause>0){T.pause-=dt;V.yaw+=0.28*dt;return}
  const nx=T.pts[T.i+1];if(!nx){T.playing=false;hud('end');return}const dx=nx.x-V.px,dy=nx.y-V.py,d=Math.hypot(dx,dy);const st=1.15*dt;
  if(d>0.05)V.yaw+=angd(Math.atan2(dx,dy),V.yaw)*Math.min(1,dt*3.2);if(d<=st){V.px=nx.x;V.py=nx.y;T.i++;if(nx.stop){T.pause=3.2;hud(nx.stop)}}else{V.px+=dx/d*st;V.py+=dy/d*st}}
function stopsIdx(){return V.tour?.pts?V.tour.pts.map((p,i)=>p.stop?i:-1).filter(i=>i>=0):[]}
function tourJump(dir){const T=V.tour;if(!T?.pts)return;const s=stopsIdx();let k=dir>0?s.find(i=>i>T.i):[...s].reverse().find(i=>i<T.i);if(k==null)return;T.i=k;const p=T.pts[k];V.px=p.x;V.py=p.y;T.pause=3.2;T.playing=true;hud(p.stop)}
function tourPlay(){const T=V.tour;if(!T?.pts)return;if(!T.playing&&T.i>=T.pts.length-1){startTour();return}T.playing=!T.playing;const b=$('#tplay');if(b)b.textContent=T.playing?'Pausa':'Seguir'}
function hud(id){const h=$('#hud');if(!h)return;const ctl=`<div class="hc"><button class="btn sm" data-act="tprev" aria-label="Recinto anterior">◀</button><button class="btn sm pri" data-act="tplay" id="tplay">${V.tour?.playing?'Pausa':'Seguir'}</button><button class="btn sm" data-act="tnext" aria-label="Recinto siguiente">▶</button></div>`;
  if(id===null){h.innerHTML='<div class="hi"><b>Sin recintos</b><small>Agrega recintos con medidas para la visita.</small></div>';return}
  if(id==='start'){h.innerHTML=`<div class="hi"><b>${esc(P.meta.nombre||'Visita guiada')}</b><small>Llegando por la puerta de acceso</small></div>${ctl}`;return}
  if(id==='end'){h.innerHTML=`<div class="hi"><b>Fin de la visita</b><small>${stopsIdx().length} recintos recorridos</small></div><div class="hc"><button class="btn sm pri" data-act="tplay">Repetir</button></div>`;return}
  const r=room(id);if(!r)return;const s=stopsIdx();const k=s.indexOf(V.tour.i)+1;
  h.innerHTML=`${r.fotos[0]?`<img src="${phSrc(r.fotos[0])}" alt="Foto de ${esc(r.nombre)}" data-ph="r:${r.id}|0">`:''}<div class="hi"><b>${esc(r.nombre)}</b><small>${fmt(r.ancho*r.largo)} m² · ${fmt(r.ancho)} × ${fmt(r.largo)}${k?` · ${k} de ${s.length}`:''}</small>${r.fotos[0]?'':'<small style="display:block">Sin foto de referencia</small>'}</div>${ctl}`}

/* ============ arranque ============ */
async function boot(){$('#main').innerHTML='<p class="note">Abriendo levantamientos…</p>';
  try{await Store.init()}catch(e){}
  let list=[];try{list=await Store.list()}catch(e){}
  if(!list.length){let legacy=null;try{legacy=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
    await createProject(legacy&&legacy.v===1?'import':'ejemplo',legacy&&legacy.v===1?legacy:null);list=await Store.list()}
  else{const cur=getCur();const id=list.find(x=>x.id===cur)?.id||list[0].id;try{await openProject(id)}catch(e){await createProject('ejemplo')}}
  UI.projects=list;UI.ready=true;render();
  try{if(typeof Upd!=='undefined')Upd.init()}catch(e){}
  if(Store.native){const App=window.Capacitor.Plugins?.App||window.Capacitor.registerPlugin?.('App');
    App?.addListener('backButton',()=>{if($('#vivo')){const x=document.querySelector('#vivo .vx');x?.click();return}if($('#mapov')){closeMap();return}if(!$('#lb').hidden){$('#lb').hidden=true;return}if(UI.frame){act('mkcancel');return}if(UI.step>0)goStep(UI.step-1);else App.minimizeApp?App.minimizeApp():App.exitApp()});
    App?.addListener('pause',()=>{flush()})}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flush()})}
boot();
