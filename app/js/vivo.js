/* Huincha — Levantamiento en vivo.
   La cámara muestra el lugar y, al lado, el croquis se arma en tiempo real mientras la app pregunta.
   Dos formas de medir:
   - "ar": realidad aumentada (ARCore, complemento nativo HuinchaAR). Se apunta la mira a cada esquina.
   - "pasos": cámara del navegador + podómetro (acelerómetro) + brújula. Medidas tentativas de ± 5–10 %. */
"use strict";
const VSIDE=[{k:'frontal',n:'Fachada principal',f:'frontal'},{k:'derecho',n:'Costado derecho',f:'derecha'},{k:'posterior',n:'Fachada posterior',f:'posterior'},{k:'izquierdo',n:'Costado izquierdo',f:'izquierda'}];
const sideName=i=>VSIDE[i]?.n||`Lado ${i+1}`;
let VV=null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rr2=v=>Math.round(v*100)/100;
const hdist=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const vdist=(a,b)=>Math.abs(a[1]-b[1]);
const meanAng=a=>{if(!a.length)return null;let s=0,c=0;for(const h of a){s+=Math.sin(h*Math.PI/180);c+=Math.cos(h*Math.PI/180)}return(Math.atan2(s,c)*180/Math.PI+360)%360};
function arPlugin(){const C=window.Capacitor;if(!(C&&C.isNativePlatform&&C.isNativePlatform()))return null;return C.Plugins?.HuinchaAR||C.registerPlugin?.('HuinchaAR')||null}
const pasoGuardado=()=>{try{return+localStorage.getItem('huincha.paso')||0.7}catch(e){return 0.7}};
const pasoGuardar=v=>{try{localStorage.setItem('huincha.paso',String(v))}catch(e){}};

/* ---------- abrir y cerrar ---------- */
async function vivoOpen(){if($('#vivo'))return;
  VV={eng:null,st:'guia',guia:{i:0},i:0,sides:[],corners:[],marks:[],vols:[],rooms:[],steps:0,counting:false,paso:pasoGuardado(),head:null,heads:[],ar:null,anchor:null,meas:null,vol:null,vq:0,room:null,edit:null,ia:null,iaBusy:false,
    rec:null,chunks:[],recT0:0,stream:null,lastMotion:0,closeErr:null,dims:null,msg:'',lost:0,listeners:[],
    elems:[],escena:null,estilo:'croquis',frames:{},hist:[],fut:[],view:'3d',sel:null,sub:null,place:null,auto:true,detBusy:false,h0:null,dr:null};
  const ov=document.createElement('div');ov.id='vivo';ov.className='vivo';
  ov.innerHTML=`<div class="vcam" id="vcam"><video id="vvid" autoplay playsinline muted></video><svg id="varo" class="varo"></svg><div class="vret" aria-hidden="true"></div><div class="viast" id="viast">La IA empieza a mirar cuando se abre la cámara…</div><div class="vguia" id="vguia" hidden></div><div class="vdet" id="vdet"></div>
    <div class="vhud"><div class="vlive" id="vlive">—</div><div class="vsub" id="vsub">Preparando la cámara…</div></div>
    <button class="vx" data-va="salir" aria-label="Salir del levantamiento en vivo">✕</button><button class="vay" data-ayuda="" aria-label="Ayuda">?</button><span class="vrec" id="vrec" hidden>● REC</span></div>
    <div class="vcro" id="vcro" data-view="3d"><svg id="vsvg" class="vsvg" viewBox="-2 -12 14 14"></svg><div class="v3d" id="v3d"></div>
      <div class="vctl"><button class="vcb" data-v3="undo" id="vundo" aria-label="Deshacer" disabled>↶</button><button class="vcb" data-v3="redo" id="vredo" aria-label="Rehacer" disabled>↷</button><button class="vcb" data-v3="estilo">Color</button><button class="vcb" data-v3="vista">Ver 2D</button><button class="vcb" data-v3="fit" aria-label="Encuadrar">◎</button><button class="vcb" data-v3="big" aria-label="Agrandar croquis">⤢</button></div>
      <span class="vcro-lbl">Croquis 3D · arrastra para girar · toca un elemento para editarlo</span></div>
    <div class="vpan" id="vpan"></div>`;
  document.body.appendChild(ov);document.body.classList.add('vivo-on');
  vPanel();try{v3dInit()}catch(e){console.error(e)}
  let useAR=false;const ar=arPlugin();
  if(ar){try{let r=await ar.check();for(let k=0;k<4&&r.transient;k++){await sleep(500);r=await ar.check()}useAR=!!r.supported}catch(e){useAR=false}}
  VV.eng=useAR?'ar':'pasos';await vStartEngine();try{vBrujulaOn()}catch(e){}vPanel();vCroquis();setTimeout(()=>{if(VV)vDetect(true)},1500)}
async function vStartEngine(){const ov=$('#vivo');if(!ov)return;
  if(VV.eng==='ar'){const ar=arPlugin();try{await ar.start();document.documentElement.classList.add('ar-on');document.body.classList.add('ar-on');ov.classList.add('ar');
      VV.listeners.push(await ar.addListener('arFrame',onArFrame));$('#vsub').textContent='Mueve el equipo lentamente para que reconozca el suelo y los muros.';return}
    catch(e){toast((e&&e.message)||'No se pudo iniciar la realidad aumentada. Se medirá con pasos.');VV.eng='pasos'}}
  ov.classList.remove('ar');document.documentElement.classList.remove('ar-on');document.body.classList.remove('ar-on');
  try{VV.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});$('#vvid').srcObject=VV.stream;$('#vsub').textContent='Cámara lista.'}
  catch(e){$('#vsub').textContent='No se pudo abrir la cámara aquí. Puedes seguir midiendo con pasos y escribiendo medidas.'}
  const om=e=>vMotion(e),oo=e=>vOrient(e,true),or=e=>{if(!VV.absOk)vOrient(e,false)};
  window.addEventListener('devicemotion',om);window.addEventListener('deviceorientationabsolute',oo);window.addEventListener('deviceorientation',or);
  VV.listeners.push({remove(){window.removeEventListener('devicemotion',om);window.removeEventListener('deviceorientationabsolute',oo);window.removeEventListener('deviceorientation',or)}});
  try{VV.wake=await navigator.wakeLock?.request('screen')}catch(e){}}
async function vivoClose(){if(!VV)return;try{v3dDispose()}catch(e){}for(const l of VV.listeners){try{await l.remove()}catch(e){}}
  if(VV.rec&&VV.rec.state!=='inactive')try{VV.rec.stop()}catch(e){}
  if(VV.stream)VV.stream.getTracks().forEach(t=>t.stop());try{VV.wake?.release()}catch(e){}
  if(VV.eng==='ar'){try{await arPlugin()?.stop()}catch(e){}}
  document.documentElement.classList.remove('ar-on');document.body.classList.remove('ar-on','vivo-on');$('#vivo')?.remove();VV=null}
async function vSwitchToPasos(){if(VV.eng!=='ar')return;for(const l of VV.listeners){try{await l.remove()}catch(e){}}VV.listeners=[];try{await arPlugin()?.stop()}catch(e){}
  VV.eng='pasos';VV.anchor=null;await vStartEngine();toast('Ahora se mide con pasos. Lo que ya marcaste se mantiene.');vPanel();vCroquis()}

/* ---------- sensores: pasos y brújula ---------- */
function vMotion(e){const a=e.accelerationIncludingGravity;if(!a||a.x==null)return;VV.lastMotion=performance.now();vStep(Math.hypot(a.x,a.y,a.z),performance.now())}
function vStep(m,t){const S=VV.sd||(VV.sd={f:m,base:m,up:false,last:0});S.f=S.f*.75+m*.25;S.base=S.base*.985+S.f*.015;const thr=1.15;
  if(!S.up&&S.f>S.base+thr)S.up=true;else if(S.up&&S.f<S.base+thr*.25){S.up=false;if(t-S.last>280){S.last=t;if(VV.counting){VV.steps++;vLive()}else vDR()}}}
function vOrient(e,abs){if(e.alpha==null)return;if(abs)VV.absOk=true;const d=Math.PI/180,cA=Math.cos(e.alpha*d),sA=Math.sin(e.alpha*d),cB=Math.cos((e.beta||0)*d),sB=Math.sin((e.beta||0)*d),cG=Math.cos((e.gamma||0)*d),sG=Math.sin((e.gamma||0)*d);
  const wx=-(cG*sA*sB+cA*sG),wy=-(sA*sG-cA*cG*sB);if(Math.hypot(wx,wy)<.25)return;VV.head=(Math.atan2(wx,wy)*180/Math.PI+360)%360;if(VV.counting)VV.heads.push(VV.head)}
/* Para probar sin equipo: simula un paso */
window.__vivoPaso=()=>{if(VV&&VV.counting){VV.steps++;vLive()}};

/* ---------- realidad aumentada ---------- */
function onArFrame(d){if(!VV)return;VV.ar=d;if(d.tracking!=='TRACKING')VV.lost++;else VV.lost=0;
  if(VV.lost===45){VV.msg='lost';vPanel()}if(VV.lost===0&&VV.msg==='lost'){VV.msg='';vPanel()}
  vLive();vArOverlay();if(VV.st==='walk'||VV.st==='meas')vCroquis();else v3dUpdate()}
const mul4=(m,x,y,z,w)=>[m[0]*x+m[4]*y+m[8]*z+m[12]*w,m[1]*x+m[5]*y+m[9]*z+m[13]*w,m[2]*x+m[6]*y+m[10]*z+m[14]*w,m[3]*x+m[7]*y+m[11]*z+m[15]*w];
function arProj(p){const d=VV.ar;if(!d||!d.view)return null;const e=mul4(d.view,p[0],p[1],p[2],1),c=mul4(d.proj,e[0],e[1],e[2],e[3]);if(c[3]<=.01)return null;return[(c[0]/c[3]+1)/2*innerWidth,(1-c[1]/c[3])/2*innerHeight]}
async function arFix(){try{const r=await arPlugin().hitTest({x:.5,y:.5});return r.p}catch(e){toast((e&&e.message)||'No se encontró una superficie en ese punto.');return null}}
function vArOverlay(){const svg=$('#varo');if(!svg||VV.eng!=='ar')return;let h='';const pts=VV.corners.map(arProj);
  for(let k=0;k<pts.length-1;k++)if(pts[k]&&pts[k+1])h+=`<line class="arl" x1="${pts[k][0]}" y1="${pts[k][1]}" x2="${pts[k+1][0]}" y2="${pts[k+1][1]}"/>`;
  const c=VV.ar?.centro?.p,a=VV.anchor;if(a&&c){const pa=arProj(a),pc=arProj(c);if(pa&&pc){const dd=VV.meas?.kind==='v'?vdist(a,c):hdist(a,c);h+=`<line class="arl live" x1="${pa[0]}" y1="${pa[1]}" x2="${pc[0]}" y2="${pc[1]}"/><text class="art" x="${(pa[0]+pc[0])/2}" y="${(pa[1]+pc[1])/2-10}">${fmt(dd,2)} m</text>`}}
  for(const p of pts)if(p)h+=`<circle class="arp" cx="${p[0]}" cy="${p[1]}" r="8"/>`;
  for(const m of VV.marks)if(m.p){const q=arProj(m.p);if(q)h+=`<text class="arm" x="${q[0]}" y="${q[1]}">${m.tipo==='puerta'?'🚪':m.tipo==='ventana'?'▭':'?'}</text>`}
  svg.innerHTML=h;const k=VV.ar?.centro?.kind;$('#vivo')?.style.setProperty('--ret',k==='suelo'||k==='muro'?'#3ddc84':k?'#f2b705':'#ff5a5a')}

/* ---------- lectura en vivo ---------- */
function vLiveDist(){if(VV.eng==='ar'){const a=VV.anchor,c=VV.ar?.centro?.p;if(!a||!c)return null;return VV.meas?.kind==='v'?vdist(a,c):hdist(a,c)}return VV.counting?VV.steps*VV.paso:null}
function vLive(){if(!VV)return;const el=$('#vlive'),sub=$('#vsub');if(!el)return;const d=vLiveDist();
  el.textContent=d==null?'—':(VV.eng==='ar'?fmt(d,2):'≈ '+fmt(d,1))+' m';
  if(VV.eng==='ar'){const a=VV.ar;sub.textContent=!a?'Iniciando…':a.tracking!=='TRACKING'?'Buscando referencias: mueve el equipo despacio':(a.centro?`Apuntando a ${a.centro.kind} · ${a.planos||0} superficies`:'Apunta a una superficie con textura')}
  else{const noSens=VV.counting&&performance.now()-VV.lastMotion>2500;sub.textContent=VV.counting?(noSens?'No llega señal del sensor de pasos: escribe la medida al terminar':`${VV.steps} pasos · paso de ${fmt(VV.paso,2)} m${VV.head!=null?' · rumbo '+Math.round(VV.head)+'°':''}`):(VV.head!=null?'Rumbo '+Math.round(VV.head)+'°':'Listo')}
  const pl=$('#vpl');if(pl)pl.textContent=el.textContent}

/* ---------- croquis ---------- */
function vSideLen(j){const s=VV.sides[j];return s?(s.len??s.est):null}
function vPoly(){const pts=[[0,0]];let ang=0;for(let j=0;j<VV.sides.length;j++){const L=vSideLen(j)||0,p=pts[pts.length-1];pts.push([p[0]+L*Math.cos(ang),p[1]+L*Math.sin(ang)]);ang+=((VV.sides[j+1]?.turn??90)*Math.PI/180)}return{pts,ang}}
function vDims(){const s=VV.sides;if(VV.dims)return VV.dims;const a=vSideLen(0),b=vSideLen(1);return{W:a||0,L:b||0}}
function vArPlan(p){const c=VV.corners;if(c.length<2)return null;const ex=c[1][0]-c[0][0],ez=c[1][2]-c[0][2],n=Math.hypot(ex,ez)||1,e1=[ex/n,ez/n],e2=[ez/n,-ex/n];const q=[p[0]-c[0][0],p[2]-c[0][2]];return[q[0]*e1[0]+q[1]*e1[1],q[0]*e2[0]+q[1]*e2[1]]}
function vCroquis(){const svg=$('#vsvg');if(!svg||!VV)return;const {pts,ang}=vPoly();let h='';const cur=pts[pts.length-1];const D=vDims();
  /* contorno previsto (rectángulo) en gris */
  if(VV.sides.length<4&&(VV.st==='walk'||VV.st==='confirm'||VV.st==='intro')){const W=vSideLen(0)||vSideLen(2)||8,L=vSideLen(1)||vSideLen(3)||6;h+=`<polygon class="vpred" points="0,0 ${W},0 ${W},${-L} 0,${-L}"/>`}
  /* volúmenes */
  for(const v of [...VV.vols,VV.vol].filter(Boolean)){const g=vLiveVol(v,D.W,D.L);if(!g)continue;h+=g.circ?`<circle class="vvol" cx="${g.cx}" cy="${-g.cy}" r="${g.r}"/>`:`<rect class="vvol" x="${g.x0}" y="${-g.y1}" width="${g.w}" height="${g.h}"/>`;h+=`<text class="vtx" x="${g.cx}" y="${-g.cy}" text-anchor="middle">${esc(v.nombre)}</text>`}
  /* lados medidos */
  for(let j=0;j<VV.sides.length;j++){const a=pts[j],b=pts[j+1],s=VV.sides[j];h+=`<line class="vside${s.len!=null?' ok':''}" x1="${a[0]}" y1="${-a[1]}" x2="${b[0]}" y2="${-b[1]}"/>`;
    const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=dy/l,ny=-dx/l;
    h+=`<g class="vlab" data-vside="${j}"><rect x="${mx+nx*.9-1.5}" y="${-(my+ny*.9)-.55}" width="3" height="1.1" rx=".3"/><text x="${mx+nx*.9}" y="${-(my+ny*.9)+.32}" text-anchor="middle">${s.len!=null?fmt(s.len,2):'≈'+fmt(s.est,1)}</text></g>`}
  /* lado en curso */
  if(VV.st==='walk'){let e=null;if(VV.eng==='ar'){const c=VV.ar?.centro?.p;if(c){e=VV.corners.length>=2?vArPlan(c):null;if(!e&&VV.corners.length===1){const d=hdist(VV.corners[0],c);e=[cur[0]+d*Math.cos(ang),cur[1]+d*Math.sin(ang)]}}}
    else if(VV.counting){const d=VV.steps*VV.paso;e=[cur[0]+d*Math.cos(ang),cur[1]+d*Math.sin(ang)]}
    if(e)h+=`<line class="vside live" x1="${cur[0]}" y1="${-cur[1]}" x2="${e[0]}" y2="${-e[1]}"/><circle class="vme" cx="${e[0]}" cy="${-e[1]}" r=".35"/>`;else h+=`<circle class="vme" cx="${cur[0]}" cy="${-cur[1]}" r=".35"/>`}
  /* marcas de puertas, ventanas y "algo distinto" */
  for(const m of VV.marks){const j=m.side;if(j>=VV.sides.length&&!(VV.st==='walk'&&j===VV.i))continue;const a=pts[j],b=pts[j+1]||[cur[0]+Math.cos(ang),cur[1]+Math.sin(ang)];const L=vSideLen(j)||Math.hypot(b[0]-a[0],b[1]-a[1])||1;
    const t=Math.min(1,(m.pos||0)/L),x=a[0]+(b[0]-a[0])*(VV.sides[j]?t:(m.pos||0)/Math.max(L,1)),y=a[1]+(b[1]-a[1])*(VV.sides[j]?t:(m.pos||0)/Math.max(L,1));
    h+=`<circle class="vmk ${m.tipo}${m.sug?' sug':''}" cx="${x}" cy="${-y}" r=".42"/><text class="vmt" x="${x}" y="${-y+.22}" text-anchor="middle">${m.tipo==='puerta'?'P':m.tipo==='ventana'?'V':'?'}</text>`}
  if(VV.sides.length>2&&VV.sides[VV.sides.length-1]?.closing){const q=pts[pts.length-1];h+=`<line class="vpred" x1="${q[0]}" y1="${-q[1]}" x2="0" y2="0"/>`}
  for(const [k,p] of pts.entries())h+=`<circle class="vcn" cx="${p[0]}" cy="${-p[1]}" r=".22"/>`;
  vFixAR();h=vElemSVG()+h;
  svg.innerHTML=h;v3dUpdate();
  /* encuadre */
  if(!VV.drag)try{const bb=svg.getBBox();const pad=1.6;svg.setAttribute('viewBox',`${bb.x-pad} ${bb.y-pad} ${Math.max(6,bb.width+2*pad)} ${Math.max(5,bb.height+2*pad)}`)}catch(e){}}
function vLiveVol(v,W,L){if(!(W>0&&L>0))return null;const circ=v.forma==='circulo',along=circ?+v.diam||3:+v.ancho||3,out=circ?+v.diam||3:+v.largo||3;const sep=+v.sep||0,side=v.lado;
  const off=v._mark?vMarkCoord(v._mark,W,L):(side==='posterior'||side==='frontal'?W/2:L/2);let cx,cy,w,h;
  if(side==='posterior'){cx=off;cy=L+sep+out/2;w=along;h=out}else if(side==='frontal'){cx=off;cy=-sep-out/2;w=along;h=out}else if(side==='izquierdo'){cx=-sep-out/2;cy=off;w=out;h=along}else{cx=W+sep+out/2;cy=off;w=out;h=along}
  return{cx,cy,w,h,x0:cx-w/2,x1:cx+w/2,y0:cy-h/2,y1:cy+h/2,circ,r:along/2}}
/* Coordenada a lo largo del muro (x en frente y fondo, y en costados) de una marca hecha caminando */
function vMarkCoord(m,W,L){const k=VSIDE[m.side]?.k;const p=m.pos||0;const v=k==='frontal'?p:k==='derecho'?p:k==='posterior'?W-p:L-p;return Math.max(0,Math.min(k==='frontal'||k==='posterior'?W:L,v))}

/* ---------- panel de preguntas ---------- */
const vBtn=(act,lab,cl='btn')=>`<button class="${cl}" type="button" data-va="${act}">${lab}</button>`;
function vMeasureHTML(){const M=VV.meas;const ar=VV.eng==='ar';
  let body=`<p class="vq">${esc(M.label)}</p>${M.help?`<p class="vh">${esc(M.help)}</p>`:''}`;
  if(ar)body+=`<div class="vbig" id="vpl">${VV.anchor?'—':''}</div><div class="vacts">${VV.anchor?vBtn('m-fin','Marcar el otro extremo','btn pri'):vBtn('m-ini','Marcar el primer extremo','btn pri')}</div>`;
  else if(M.kind!=='v')body+=`<div class="vbig" id="vpl">${VV.counting?'≈ '+fmt(VV.steps*VV.paso,1)+' m':''}</div><div class="vacts">${VV.counting?vBtn('m-stop','Terminé de caminar','btn pri'):vBtn('m-walk','Empezar a caminar','btn pri')}</div>`;
  body+=`<div class="vin"><label class="fld"><span>O escribe la medida</span><div class="inp"><input id="vm-val" inputmode="decimal" placeholder="${M.sug!=null?String(rr2(M.sug)).replace('.',','):'0,00'}"><em>m</em></div></label>${vBtn('m-ok','Usar','btn')}${M.quick?M.quick.map(([v,l])=>`<button class="btn sm" type="button" data-va="m-q:${v}">${l}</button>`).join(''):''}</div>`;
  return body}
function vPanel(){const p=$('#vpan');if(!p||!VV)return;let h='';const st=VV.st,i=VV.i,ar=VV.eng==='ar';
  const top=`<div class="vtop"><span class="tag">${ar?'Realidad aumentada':'Pasos y brújula'}</span><span class="lbl">${st==='walk'||st==='confirm'?`Contorno · ${sideName(i)}`:st==='rooms'||st==='room'?'Recintos':st==='extras'||st==='vol'?'Fuera del contorno':st==='guia'?'Recorrido guiado':''}</span>${ar?vBtn('a-pasos','Medir con pasos','btn sm ghost'):''}</div>`;
  if(VV.msg==='lost')h+=`<div class="vwarn"><b>La realidad aumentada perdió el seguimiento.</b> Mueve el equipo despacio, apuntando a muros o suelo con textura. Si sigue fallando, pasa a medir con pasos.<div class="vacts">${vBtn('a-pasos','Medir con pasos','btn sm')}</div></div>`;
  if(VV.edit!=null){const j=VV.edit;h+=`<p class="vq">Corregir: ${esc(sideName(j))}</p><div class="vin"><label class="fld"><span>Medida con huincha</span><div class="inp"><input id="ve-val" inputmode="decimal" value="${String(rr2(vSideLen(j)||0)).replace('.',',')}"><em>m</em></div></label>${vBtn('e-ok','Guardar','btn pri')}${vBtn('e-x','Cancelar','btn ghost')}</div>`;p.innerHTML=top+h;return}
  if(VV.sub){const sh=vSubHTML();if(sh){p.innerHTML=top+h+sh;vLive();return}}
  if(VV.ia||VV.iaBusy){h+=VV.iaBusy?'<p class="vq">Analizando la imagen…</p>':iaResultHTML(VV.ia)+`<div class="vacts">${vBtn('ia-x','Seguir','btn pri')}</div>`;p.innerHTML=top+h;return}
  const tools=`<div class="vtools">${vToolsHTML()}${vBtn('foto','Tomar foto','btn sm')}${vBtn('ia','Preguntar a la IA','btn sm ghost')}</div>`;
  switch(st){
    case 'guia':h+=vGuiaHTML()+tools;break;
    case 'intro':h+=`<p class="vq">Vamos a recorrer la casa por fuera.</p><p class="vh">${ar?'Párate frente a la fachada principal, cerca de la esquina izquierda (mirando desde la calle). Apunta la mira al pie de esa esquina, donde el muro toca el suelo, y toca «Marcar esquina».':'Párate en la esquina izquierda de la fachada principal (mirando desde la calle). Sostén el equipo con la cámara hacia adelante y toca «Estoy en la esquina». Luego camina pegado a la fachada.'}</p>
      ${ar?'':`<div class="vin"><label class="fld"><span>Largo de tu paso</span><div class="inp"><input id="v-paso" inputmode="decimal" value="${String(rr2(VV.paso)).replace('.',',')}"><em>m</em></div></label><label class="fld"><span>o tu estatura</span><div class="inp"><input id="v-est" inputmode="decimal" placeholder="1,70"><em>m</em></div></label></div><p class="vh">El paso promedio es 0,41 × la estatura. Para más precisión, camina 5 m medidos y ajusta.</p>`}
      <div class="vacts">${vBtn('ini',ar?'Marcar esquina':'Estoy en la esquina','btn pri')}</div>`;break;
    case 'walk':{const last=i>=3,canClose=i>=2;
      h+=`<p class="vq">${i===0?'Camina junto a la fachada principal hacia la esquina derecha.':`Gira a la izquierda y sigue por: ${esc(sideName(i))}.`}</p><p class="vh">${ar?'Apunta la mira a la siguiente esquina, al pie del muro. La medida se actualiza mientras apuntas.':'Camina a ritmo normal, pegado al muro. Si ves una puerta, ventana o algo distinto, márcalo al pasar.'}</p>
        <div class="vbig" id="vpl"></div>
        <div class="vacts">${!ar&&!VV.counting?vBtn('w-go','Empezar a caminar','btn pri'):''}${vBtn(last?'cerrar':'esq',last?'Llegué a la esquina inicial':'Llegué a la esquina','btn pri')}${canClose&&!last?vBtn('cerrar','Llegué a la esquina inicial','btn'):''}${last?vBtn('esq','Hay otra esquina antes','btn'):''}</div>
        <div class="vmarks">${vBtn('mk:puerta','Puerta aquí','btn sm')}${vBtn('mk:ventana','Ventana aquí','btn sm')}${vBtn('mk:otro','Algo distinto aquí','btn sm')}</div>${tools}`;break}
    case 'confirm':{const s=VV.sides[i];const ms=VV.marks.filter(m=>m.side===i);
      h+=`<p class="vq">${esc(sideName(i))}: ${ar?fmt(s.est,2):'≈ '+fmt(s.est,1)} m${ar?'':` (${s.n} pasos)`}.</p><p class="vh">${ar?'Medida tomada entre las dos esquinas marcadas.':'Si tienes huincha, mide este lado y escribe el valor; si no, usa la medida estimada.'}</p>
        <div class="vin"><label class="fld"><span>Medida con huincha (opcional)</span><div class="inp"><input id="vc-val" inputmode="decimal" placeholder="${String(rr2(s.est)).replace('.',',')}"><em>m</em></div></label></div>
        ${ms.length?`<div class="chips">${ms.map(m=>`<span class="chip">${m.tipo==='puerta'?'Puerta':m.tipo==='ventana'?'Ventana':'Algo distinto'} a ${fmt(m.pos,1)} m<button class="xbtn" data-va="mkdel:${m.id}" aria-label="Quitar marca">✕</button></span>`).join('')}</div>`:''}
        <div class="vacts">${vBtn('c-ok',s.closing?'Guardar y cerrar el contorno':'Guardar y seguir','btn pri')}${vBtn('c-redo','Medir de nuevo este lado','btn')}</div>`;break}
    case 'angle':{const s=VV.sides[i];h+=`<p class="vq">La esquina entre ${esc(sideName(i-1))} y ${esc(sideName(i)).toLowerCase()} parece de ${Math.round(180-s.turnRaw)}°, no de 90°.</p><p class="vh">¿Es una esquina en ángulo, o fue un error de medición?</p>
      <div class="vacts">${vBtn('ang-si','Sí, no es recta','btn')}${vBtn('ang-no','No, es recta (90°)','btn pri')}</div>`;break}
    case 'close':{const s=VV.sides.map((x,j)=>vSideLen(j));const n=s.length;let body='';
      if(n===4){const pair=(a,b,na,nb,key)=>Math.abs(s[a]-s[b])>0.15?`<div class="fld"><span>${na} ${fmt(s[a],2)} m y ${nb.toLowerCase()} ${fmt(s[b],2)} m no coinciden. ¿Qué medida uso?</span><div class="seg">${[[s[a],na],[s[b],nb],[(s[a]+s[b])/2,'Promedio']].map(([v,l])=>`<button class="btn sm" data-va="dim:${key}:${rr2(v)}" aria-pressed="${VV.dims&&Math.abs(VV.dims[key]-rr2(v))<.005}">${l}: ${fmt(v,2)}</button>`).join('')}</div></div>`:'';
        VV.dims=VV.dims||{W:rr2(Math.abs(s[0]-s[2])>0.15?(s[0]+s[2])/2:s[0]),L:rr2(Math.abs(s[1]-s[3])>0.15?(s[1]+s[3])/2:s[1])};
        body=pair(0,2,'Fachada principal','Fachada posterior','W')+pair(1,3,'Costado derecho','Costado izquierdo','L')}
      else{const {pts}=vPoly();const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]);VV.dims={W:rr2(Math.max(...xs)-Math.min(...xs)),L:rr2(Math.max(...ys)-Math.min(...ys))};
        body=`<p class="vh">El contorno tiene ${n} lados. Los planos usarán el rectángulo que lo contiene (${fmt(VV.dims.W,2)} × ${fmt(VV.dims.L,2)} m). Lo que sobresalga, agrégalo como ampliación en el paso siguiente.</p>`}
      h+=`<p class="vq">Contorno cerrado: ${fmt(VV.dims.W,2)} × ${fmt(VV.dims.L,2)} m.</p>${VV.closeErr!=null?`<p class="vh">Diferencia al volver a la esquina inicial: ${fmt(VV.closeErr,2)} m (${VV.closeErr<.25?'buena':VV.closeErr<.6?'aceptable':'conviene revisar con huincha'}).</p>`:''}${body}
        <div class="vacts">${vBtn('seguir-ext','Seguir','btn pri')}</div>${tools}`;break}
    case 'extras':{const otros=VV.marks.filter(m=>m.tipo==='otro'&&!m.done);
      if(otros.length){const m=otros[0];h+=`<p class="vq">Marcaste algo distinto en ${esc(sideName(m.side)).toLowerCase()} a ${fmt(m.pos,1)} m. ¿Qué es?</p><div class="chips">${Object.entries(VOLT).map(([k,t])=>`<button class="chip" data-va="volmk:${m.id}:${k}">${t.n}</button>`).join('')}<button class="chip" data-va="ignmk:${m.id}">No es un volumen</button></div>`}
      else h+=`<p class="vq">¿Hay algo fuera de este contorno?</p><p class="vh">Por ejemplo un domo, un segundo piso o altillo sobre pilotes, una terraza, una ampliación o un quincho.</p><div class="chips">${Object.entries(VOLT).map(([k,t])=>`<button class="chip" data-va="vol:${k}">+ ${t.n}</button>`).join('')}</div>
        ${VV.vols.length?`<p class="vh">Registrados: ${VV.vols.map(v=>esc(v.nombre)).join(', ')}.</p>`:''}<div class="vacts">${vBtn('seguir-rec',VV.vols.length?'Listo, seguir':'No hay nada más','btn pri')}</div>`;
      h+=tools;break}
    case 'vol':h+=vVolHTML();break;
    case 'meas':h+=vMeasureHTML()+tools;break;
    case 'rooms':h+=vRoomsHTML(tools);break;
    case 'done':h+=`<p class="vq">Listo. Esto se pasará al proyecto:</p><ul class="vsum"><li>Casa de ${fmt(VV.dims?.W||0,2)} × ${fmt(VV.dims?.L||0,2)} m (${VV.sides.length} lados)</li>
      <li>${VV.marks.filter(m=>m.tipo!=='otro').length} puertas o ventanas marcadas</li><li>${VV.vols.length} volúmenes fuera del contorno</li><li>${VV.elems.filter(e=>!e.sug).length} elementos del terreno (rejas, pisos, árboles…)${VV.elems.some(e=>e.sug)?' · los sugeridos sin aceptar no se pasan':''}</li><li>${VV.rooms.length} recintos</li></ul>
      <p class="vh">Después el asistente te pedirá lo que falte.</p><div class="vacts">${vBtn('aplicar','Pasar al proyecto','btn pri')}${vBtn('volver-rec','Volver','btn')}</div>`;break}
  p.innerHTML=top+h;vLive()}

/* ---------- volúmenes: preguntas una a una ---------- */
const VQ=['medida','medida2','nivel','apoyo','pilotes','sep','acceso'];
function vVolHTML(){const v=VV.vol,q=VQ[VV.vq];const n=v.nombre.toLowerCase();
  const chips=(f,o)=>`<div class="chips">${Object.entries(o).map(([k,t])=>`<button class="chip" data-va="vf:${f}:${k}">${t.n||t}</button>`).join('')}</div>`;
  if(q==='apoyo')return`<p class="vq">¿Cómo se sostiene el ${esc(n)}?</p>${chips('apoyo',VAPOYO)}`;
  if(q==='pilotes')return`<p class="vq">¿Cuántos pilotes tiene?</p><div class="vin"><label class="fld"><span>Pilotes</span><div class="inp"><input id="vp-n" inputmode="numeric" value="${v.nPil||''}"><em>un</em></div></label>${vBtn('vp-ok','Guardar','btn pri')}</div>`;
  if(q==='acceso')return`<p class="vq">¿Cómo se llega al ${esc(n)} desde la casa?</p>${chips('acceso',VACCESO)}`;
  return''}
function vVolNext(){const v=VV.vol;for(;;){VV.vq++;const q=VQ[VV.vq];if(!q){VV.vols.push(v);VV.vol=null;VV.st='extras';toast(`${v.nombre} registrado.`);break}
    if(q==='medida2'&&v.forma==='circulo')continue;if(q==='pilotes'&&v.apoyo!=='pilotes')continue;if(vVolAsk(q))return}
  vPanel();vCroquis()}
function vVolAsk(q){const v=VV.vol,n=v.nombre.toLowerCase(),ar=VV.eng==='ar';
  if(q==='medida'){vMeas({label:v.forma==='circulo'?`¿Cuánto mide el ${n} de diámetro?`:`¿Cuánto mide el ${n} a lo ancho, paralelo a la casa?`,help:ar?'Apunta a un borde, marca, y luego al borde opuesto.':'Camina de un borde al opuesto o escribe la medida.',kind:'h',then:val=>{if(v.forma==='circulo')v.diam=val;else v.ancho=val;vVolNext()}});return true}
  if(q==='medida2'){vMeas({label:`¿Cuánto sobresale el ${n} hacia afuera?`,help:'Desde el muro de la casa o su borde más cercano hasta el más lejano.',kind:'h',then:val=>{v.largo=val;vVolNext()}});return true}
  if(q==='nivel'){vMeas({label:`¿A qué altura está el piso del ${n} respecto del piso de la casa?`,help:ar?'Apunta al umbral de la puerta de la casa, marca, y luego al piso del volumen.':'Escríbela, o elige «Mismo nivel».',kind:'v',quick:[[0,'Mismo nivel']],then:val=>{v.nivel=val;vVolNext()}});return true}
  if(q==='sep'){vMeas({label:`¿Está pegado a la casa o separado?`,help:'Si está separado, mide la distancia entre el muro y su borde más cercano.',kind:'h',quick:[[0,'Pegado a la casa']],then:val=>{v.sep=val;vVolNext()}});return true}
  VV.st='vol';vPanel();return true}
function vivoStartVol(tipo,forma,mark){const v=volBlank(tipo);if(forma)v.forma=forma;v.origen=VV.eng;if(mark){v._mark=mark;v.lado=VSIDE[mark.side]?.k||'posterior';mark.done=true}else v.lado='posterior';
  VV.vol=v;VV.vq=-1;VV.ia=null;VV.st='vol';
  if(!mark){$('#vpan').innerHTML=`<div class="vtop"><span class="tag">Fuera del contorno</span></div><p class="vq">¿Hacia qué lado de la casa está el ${esc(v.nombre.toLowerCase())}?</p><div class="chips">${Object.entries(VLADO).map(([k,n])=>`<button class="chip" data-va="vl:${k}">${n}</button>`).join('')}</div>`;return}
  vVolNext()}

/* ---------- herramienta de medición ---------- */
function vMeas(m){VV.meas=m;VV.st='meas';VV.anchor=null;VV.counting=false;VV.steps=0;vPanel()}
function vMeasDone(val){const m=VV.meas;VV.meas=null;VV.anchor=null;VV.counting=false;if(!(val>=0)){toast('Escribe una medida válida.');VV.meas=m;return}m.then(rr2(val));if(VV&&VV.st==='meas'&&VV.meas)vPanel()}

/* ---------- fotos ---------- */
async function vGrab(){if(VV.eng==='ar'){try{const r=await arPlugin().capture();const b=await (await fetch('data:image/jpeg;base64,'+r.jpeg)).blob();return b}catch(e){toast('No se pudo sacar la foto.');return null}}
  const v=$('#vvid');if(!v||!v.videoWidth){toast('La cámara no está disponible.');return null}const k=Math.min(1,1600/v.videoWidth);const cv=document.createElement('canvas');cv.width=Math.round(v.videoWidth*k);cv.height=Math.round(v.videoHeight*k);cv.getContext('2d').drawImage(v,0,0,cv.width,cv.height);return new Promise(r=>cv.toBlob(b=>r(b),'image/jpeg',.85))}
async function vFoto(){const b=await vGrab();if(!b)return;const ref=await storePhoto(b);
  if(VV.room){VV.room.fotos.push(ref);toast('Foto guardada para el recinto.')}
  else if((VV.st==='walk'||VV.st==='confirm')&&VSIDE[VV.i]){P.fotos[VSIDE[VV.i].f].push(ref);persist();toast(`Foto de ${sideName(VV.i).toLowerCase()} guardada.`)}
  else{P.fotos.terreno.push(ref);persist();toast('Foto guardada.')}}

/* ---------- grabación del recorrido (solo con la cámara del navegador) ---------- */
function vRecStart(){return;/* sin grabación de video: se usan fotos */if(VV.rec||!VV.stream||!window.MediaRecorder)return;const types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'];const t=types.find(x=>MediaRecorder.isTypeSupported?.(x));
  try{VV.rec=new MediaRecorder(VV.stream,t?{mimeType:t,videoBitsPerSecond:2_000_000}:{videoBitsPerSecond:2_000_000});VV.rec.ondataavailable=e=>{if(e.data&&e.data.size)VV.chunks.push(e.data)};VV.rec.start(2000);VV.recT0=performance.now();$('#vrec').hidden=false}catch(e){VV.rec=null}}
const vRecT=()=>VV.rec?(performance.now()-VV.recT0)/1000:null;

/* ---------- acciones ---------- */
const VSNAPA=new Set(['ini','esq','cerrar','c-ok','ang-si','ang-no','c-redo','mk','mkdel','dim','volmk','ignmk','vol','room','e-ok','fin']);
document.addEventListener('click',async e=>{const b=e.target.closest('[data-va],[data-vside]');if(!b||!VV)return;
  if(b.dataset.vside!=null){VV.edit=+b.dataset.vside;vPanel();$('#ve-val')?.focus();return}
  const [a,x,y]=b.dataset.va.split(':');const ar=VV.eng==='ar';
  if(VSNAPA.has(a))vSnap();const val=id=>{const el=$(id);return el&&el.value.trim()!==''?num(el.value):null};
  switch(a){
    case 'salir':if(b.dataset.armed){vivoClose();break}b.dataset.armed=1;b.textContent='¿Salir?';b.classList.add('armed');setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent='✕';b.classList.remove('armed')}},3500);break;
    case 'a-pasos':await vSwitchToPasos();break;
    case 'ini':{if(!ar){const pv=val('#v-paso'),est=val('#v-est');VV.paso=est>1?rr2(est*.415):pv>0.3?pv:VV.paso;pasoGuardar(VV.paso);VV.i=0;VV.st='walk';VV.steps=0;VV.heads=[];VV.counting=true;VV.lastMotion=performance.now();VV.h0=VV.head;VV.dr=[0,0];vRecStart()}
      else{const p=await arFix();if(!p)break;VV.corners=[p];VV.anchor=p;VV.i=0;VV.st='walk'}vPanel();vCroquis();break}
    case 'w-go':VV.counting=true;VV.steps=0;VV.heads=[];VV.lastMotion=performance.now();vRecStart();vPanel();break;
    case 'esq':case 'cerrar':{const closing=a==='cerrar';let est,n=0,head=null;
      if(ar){const p=closing?(await arFix()):await arFix();if(!p)break;const prev=VV.corners[VV.corners.length-1];
        if(closing){VV.closeErr=hdist(p,VV.corners[0]);est=hdist(prev,VV.corners[0])}else{est=hdist(prev,p);VV.corners.push(p)}VV.anchor=closing?null:p}
      else{est=VV.steps*VV.paso;n=VV.steps;head=meanAng(VV.heads);VV.counting=false}
      const s={est:est,len:null,n,head,closing,turn:90};VV.sides[VV.i]=s;
      /* ángulo con el lado anterior */
      if(VV.i>0){let turn=null;const prev=VV.sides[VV.i-1];
        if(ar){const c=VV.corners;const k=VV.i;const A=c[k-1],B=c[k],C=closing?c[0]:c[k+1];if(A&&B&&C){const d1=[B[0]-A[0],B[2]-A[2]],d2=[C[0]-B[0],C[2]-B[2]];const cr=d1[0]*d2[1]-d1[1]*d2[0],dt=d1[0]*d2[0]+d1[1]*d2[1];turn=-Math.atan2(cr,dt)*180/Math.PI}}
        else if(prev.head!=null&&head!=null)turn=((prev.head-head+540)%360)-180;
        if(turn!=null){s.turnRaw=turn;if(Math.abs(turn-90)>(ar?15:25))s.askAngle=true}}
      VV.st='confirm';vPanel();vCroquis();break}
    case 'c-ok':{const s=VV.sides[VV.i];const v=val('#vc-val');s.len=v>0?v:rr2(s.est);if(VV.i===0&&s.head!=null)VV.h0=s.head;
      for(const m of VV.marks)if(m.side===VV.i&&s.est>0)m.pos=m.pos*s.len/s.est;
      if(s.askAngle){VV.st='angle';vPanel();break}
      vAfterSide();break}
    case 'ang-si':VV.sides[VV.i].turn=VV.sides[VV.i].turnRaw;VV.sides[VV.i].askAngle=false;vAfterSide();break;
    case 'ang-no':VV.sides[VV.i].turn=90;VV.sides[VV.i].askAngle=false;vAfterSide();break;
    case 'c-redo':{if(ar){if(!VV.sides[VV.i].closing)VV.corners.pop();VV.anchor=VV.corners[VV.corners.length-1]}VV.sides.length=VV.i;VV.marks=VV.marks.filter(m=>m.side!==VV.i);VV.st='walk';if(!ar){VV.steps=0;VV.heads=[];VV.counting=true;VV.lastMotion=performance.now()}vPanel();vCroquis();break}
    case 'mk':{let pos=vLiveDist()||0,p=null;if(ar){p=await arFix();if(p&&VV.anchor)pos=hdist(VV.anchor,p)}
      VV.marks.push({id:uid(),side:VV.i,pos,tipo:x,p,t:vRecT()});toast(x==='puerta'?'Puerta marcada.':x==='ventana'?'Ventana marcada.':'Marcado. Al cerrar el contorno te preguntaré qué es.');vCroquis();vArOverlay();break}
    case 'mkdel':VV.marks=VV.marks.filter(m=>m.id!==x);vPanel();vCroquis();break;
    case 'dim':VV.dims[x]=+y;vPanel();break;
    case 'seguir-ext':VV.st='extras';vPanel();break;
    case 'volmk':{const m=VV.marks.find(q=>q.id===x);vivoStartVol(y,VOLT[y]?.forma,m);break}
    case 'ignmk':{const m=VV.marks.find(q=>q.id===x);if(m)m.done=true;vPanel();break}
    case 'vol':vivoStartVol(x,VOLT[x]?.forma);break;
    case 'vl':VV.vol.lado=x;VV.vq=-1;vVolNext();break;
    case 'vf':VV.vol[x]=y;vVolNext();break;
    case 'vp-ok':{const n=val('#vp-n');if(!(n>0)){toast('Escribe cuántos pilotes tiene.');break}VV.vol.nPil=Math.round(n);vVolNext();break}
    case 'seguir-rec':if(VV.guia){vGuiaIr(GUIA.findIndex(g=>g.k==='patio1'));break}VV.st='rooms';VV.rauto=true;vPanel();setTimeout(()=>vRecDetect(false),800);break;
    case 'room':{const t=TIPOS[x];const cnt=VV.rooms.filter(r=>r.tipo===x).length+P.recintos.filter(r=>r.tipo===x).length;VV.room={tipo:x,nombre:(x==='dormitorio'||x==='bano')&&cnt?`${t.n} ${cnt+1}`:t.n,fotos:[],t:vRecT(),pos:vRecPos()};
      vMeas({label:`${VV.room.nombre}: mide de izquierda a derecha, de muro a muro.`,help:'En la misma dirección que la fachada principal.',kind:'h',then:v1=>{VV.room.ancho=v1;
        vMeas({label:`${VV.room.nombre}: ahora de adelante hacia atrás.`,help:'Desde el muro más cercano a la calle hasta el del fondo.',kind:'h',then:async v2=>{VV.room.largo=v2;const b2=await vGrab();if(b2)VV.room.fotos.push(await storePhoto(b2));VV.rooms.push(VV.room);toast(`${VV.room.nombre} registrado.`);VV.room=null;VV.st='rooms';vPanel()}})}});break}
    case 'fin':if(VV.guia){vGuiaIr(GUIA.findIndex(g=>g.k==='detalles'));break}VV.st='done';vPanel();break;
    case 'volver-rec':VV.st='rooms';vPanel();break;
    case 'aplicar':await vivoApply();break;
    case 'm-ini':{const p=await arFix();if(!p)break;VV.anchor=p;vPanel();break}
    case 'm-fin':{const p=await arFix();if(!p||!VV.anchor)break;vMeasDone(VV.meas.kind==='v'?vdist(VV.anchor,p):hdist(VV.anchor,p));break}
    case 'm-walk':VV.counting=true;VV.steps=0;VV.lastMotion=performance.now();vPanel();break;
    case 'm-stop':VV.counting=false;vMeasDone(VV.steps*VV.paso);break;
    case 'm-ok':{const v=val('#vm-val');if(v==null){toast('Escribe la medida o usa el botón para medir.');break}vMeasDone(v);break}
    case 'm-q':vMeasDone(+x);break;
    case 'e-ok':{const v=val('#ve-val');if(v>0){VV.sides[VV.edit].len=v;if(VV.dims&&VV.sides.length===4){VV.dims=null}}VV.edit=null;vPanel();vCroquis();break}
    case 'e-x':VV.edit=null;vPanel();break;
    case 'foto':await vFoto();break;
    case 'ia':{const bl=await vGrab();if(!bl)break;VV.iaBusy=true;vPanel();try{const r=await IA.analyze(bl,iaContexto(`recorrido en vivo, ${sideName(VV.i).toLowerCase()}`));VV.ia=r;iaGuardarPreguntas(r,1)}catch(err){toast(iaErrorMsg(err))}VV.iaBusy=false;vPanel();break}
    case 'ia-x':VV.ia=null;vPanel();break}});
function vAfterSide(){const s=VV.sides[VV.i];if(s.closing){VV.st='close';VV.anchor=null;vPanel();vCroquis();return}
  VV.i++;VV.st='walk';if(VV.eng!=='ar'){VV.steps=0;VV.heads=[];VV.counting=false}vPanel();vCroquis()}

/* ---------- pasar al proyecto ---------- */
async function vivoApply(){const D=VV.dims||vDims();const c=P.casa;const W=D.W,L=D.L;
  if(W>0&&L>0){c.ancho=rr2(W);c.largo=rr2(L);c.fuente='vivo';c.fuenteDet=VV.eng;delete P.ok['casa-vivo']}
  if(VV.sides.length&&VV.sides.length!==4){const {pts}=vPoly();c.contorno=pts.map(p=>[rr2(p[0]),rr2(p[1])])}
  if(VV.escena)P.lote.descripcionIA=VV.escena;
  {const pr=VV.elems.find(e=>e.principal&&!e.sug);if(pr&&!(W>0&&L>0)&&!(c.ancho>0)){c.ancho=rr2(pr.w);c.largo=rr2(pr.l);c.fuente='ia';c.techo=pr.techo==='plano'?'plana':pr.techo==='dos_aguas'?'dos-aguas':c.techo}}
  for(const e of VV.elems){if(e.sug||(e.principal&&+c.ancho>0))continue;const q=JSON.parse(JSON.stringify(e));delete q._ar;delete q.conf;(P.elementos=P.elementos||[]).push(q)}
  /* fachadas analizadas: dimensiones, techo, materiales y norte */
  {const F=VV.fachW||{};if(!(+c.ancho>0)&&(F[0]||F[2])){c.ancho=rr2(F[0]||F[2]);c.largo=rr2(F[1]||F[3]||c.ancho*.8);c.fuente='fachadas'}
    if(VV.altoMuro)c.altura=rr2(VV.altoMuro);if(VV.techo?.tipo){c.techo=VV.techo.tipo;if(VV.techo.cumbrera)c.cumbrera=VV.techo.cumbrera;if(VV.techo.alto)c.hTecho=rr2(VV.techo.alto)}
    for(const [k,v] of Object.entries(VV.matIA||{}))if(v&&MATS[k]?.opts[v]&&!P.mat[k])P.mat[k]=v;
    for(const [j,v] of Object.entries(VV.revFach||{}))(P.mat.revFach=P.mat.revFach||{})[VSIDE[j].k]=v;
    if(VV.norte!=null){P.lote.norteBru=VV.norte;P.lote.norteElegido=null;if(!(P.lote.fuente==='mapa'&&P.lote.norteOk)){P.lote.norte=VV.norte;P.lote.norteOk=true}else if(norteConflicto())toast(`El norte de la brújula (${VV.norte}°) no coincide con el del mapa: elige cuál usar en el paso Terreno.`)}}
  const Wm=W>0?W:+c.ancho||0,Lm=L>0?L:+c.largo||0;
  for(const m of VV.marks)if(m.tipo!=='otro'&&!m.sug&&VSIDE[m.side])(P.marcas=P.marcas||[]).push({id:m.id,lado:VSIDE[m.side].k,coord:rr2(vMarkCoord(m,Wm,Lm)),tipo:m.tipo,ancho:m.ancho||null,alto:m.alto||null,antepecho:m.antepecho??null});
  for(const v of VV.vols){if(v._mark){v.off=rr2(vMarkCoord(v._mark,W,L));delete v._mark}(P.volumenes=P.volumenes||[]).push(v)}
  const t0=VV.chunks.length?VV.recT0:null;
  for(const r of VV.rooms){const nr={id:uid(),nombre:r.nombre,tipo:r.tipo,x:0,y:0,ancho:rr2(r.ancho),largo:rr2(r.largo),fotos:r.fotos,t:r.t,piso:r.piso||null,muroInt:r.muros||null,color:null,est:!!r.est,art:r.art||null};const R=r.pos?vRecRect(r):null;if(R&&c.ancho>0){nr.x=rr2(R.x);nr.y=rr2(R.y);if(P.recintos.some(o=>valid(o)&&nr.x<o.x+o.ancho-.2&&o.x<nr.x+nr.ancho-.2&&nr.y<o.y+o.largo-.2&&o.y<nr.y+nr.largo-.2)){const sp=freeSpot(nr);nr.x=sp.x;nr.y=sp.y}}else if(valid(nr)&&c.ancho>0){const sp=freeSpot(nr);nr.x=sp.x;nr.y=sp.y}P.recintos.push(nr);if(r.t!=null)P.video.marcas.push({t:r.t,room:nr.id})}
  let blob=null;if(VV.rec){await new Promise(res=>{VV.rec.onstop=res;try{VV.rec.stop()}catch(e){res()}});if(VV.chunks.length)blob=new Blob(VV.chunks,{type:VV.chunks[0].type||'video/webm'})}
  const nR=VV.rooms.length,nV=VV.vols.length,nE=VV.elems.filter(e=>!e.sug).length;persist();await vivoClose();
  if(blob){const f=new File([blob],'recorrido-en-vivo.'+(blob.type.includes('mp4')?'mp4':'webm'),{type:blob.type});await saveVideo(f)}
  goStep(nR?4:3);toast(`Recorrido aplicado${W>0&&L>0?`: casa ${fmt(W,2)} × ${fmt(L,2)} m`:''}${nV?`, ${nV} volumen${nV>1?'es':''}`:''}${nR?`, ${nR} recinto${nR>1?'s':''}`:''}${nE?`, ${nE} elemento${nE>1?'s':''} del terreno`:''}.`)}

/* ---------- ubicar marcas del recorrido en sus recintos ---------- */
function placeMarks(){const c=P.casa,W=c.ancho,L=c.largo;let ok=0;const rest=[];
  for(const m of P.marcas||[]){const a=+m.ancho||(m.tipo==='puerta'?0.9:1.2);let r=null,muro=m.lado,d=0;const X=m.coord;
    if(m.lado==='frontal'){r=P.recintos.find(q=>valid(q)&&near(q.y,0)&&X>q.x&&X<q.x+q.ancho);if(r)d=r.x+r.ancho-X-a/2}
    else if(m.lado==='posterior'){r=P.recintos.find(q=>valid(q)&&near(q.y+q.largo,L)&&X>q.x&&X<q.x+q.ancho);if(r)d=X-a/2-r.x}
    else if(m.lado==='izquierdo'){r=P.recintos.find(q=>valid(q)&&near(q.x,0)&&X>q.y&&X<q.y+q.largo);if(r)d=r.y+r.largo-X-a/2}
    else{r=P.recintos.find(q=>valid(q)&&near(q.x+q.ancho,W)&&X>q.y&&X<q.y+q.largo);if(r)d=X-a/2-r.y}
    if(!r){rest.push(m);continue}const len=muro==='frontal'||muro==='posterior'?r.ancho:r.largo;d=Math.max(0,Math.min(len-a,d));
    P.vanos.push({id:uid(),recinto:r.id,muro,tipo:m.tipo,dist:rr2(d),ancho:a,alto:+m.alto||(m.tipo==='puerta'?2.0:1.1),antepecho:m.tipo==='ventana'?(m.antepecho!=null?+m.antepecho:1.0):0});ok++}
  P.marcas=rest;persist();render();toast(ok?`${ok} ubicada${ok>1?'s':''} en sus recintos.${rest.length?` ${rest.length} sin recinto en ese muro.`:''} Revisa sus medidas.`:'Ninguna marca coincide con un recinto en ese muro. Revisa la posición de los recintos.')}
