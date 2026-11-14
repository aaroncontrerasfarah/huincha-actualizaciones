/* Huincha — lo marcado en la foto de una estación pasa al proyecto: aberturas de cada fachada, altura y revestimiento de
   muros, tipo y altura del techo, y elementos del terreno. Idempotente: lo creado lleva src 'est:<idFoto>' y se reemplaza
   al volver a guardar. Medidas: las escritas por la persona; si faltan, las calculadas con la escala (marcadas estimadas). */
"use strict";
const VOL_LADOS=['frontal','derecho','posterior','izquierdo'];
/* rango horizontal de referencia en la foto (para ubicar cada forma a lo largo del lado) */
function volRango(foto){const R=foto.ref?.pts;if(R?.length===2){const a=Math.min(R[0][0],R[1][0]),b=Math.max(R[0][0],R[1][0]);if(b-a>.02)return[a,b]}
  const m=foto.formas.find(f=>f.tipo==='muro'&&f.geo==='caja');if(m){const us=m.pts.map(p=>p[0]);return[Math.min(...us),Math.max(...us)]}return[0,1]}
function volFoto(est,foto){const c=P.casa,W=+c.ancho||0,L=+c.largo||0,rr=v=>Math.round(v*100)/100;const src='est:'+foto.id;let nuevos=0,act=0;
  const prev=[...(P.marcas||[]),...(P.vanos||[]),...(P.elementos||[])].filter(x=>x.src===src).length;
  P.marcas=(P.marcas||[]).filter(m=>m.src!==src);P.vanos=(P.vanos||[]).filter(v=>v.src!==src);P.elementos=(P.elementos||[]).filter(e=>e.src!==src);
  const [u0,u1]=volRango(foto),ref=+foto.ref?.largo||0;const rel=u=>Math.max(0,Math.min(1,(u-u0)/((u1-u0)||1)));
  const med=(f,k)=>{const v=efMed(foto,f,k);return v>0||(k==='sobre'&&v===0)?rr(v):null};const escrito=(f,k)=>f.med?.[k]>0||(k==='sobre'&&f.med?.[k]===0);
  const lado=est.tipo==='fachada'?est.ref:null,i=VOL_LADOS.indexOf(lado),largoLado=lado?(casaLados().find(l=>l.k===lado)?.largo||ref):ref;
  const aguas=foto.formas.filter(f=>f.tipo==='agua');
  for(const f of foto.formas){const us=f.pts.map(p=>p[0]),uc=(Math.min(...us)+Math.max(...us))/2;
    /* aberturas de la fachada */
    if(lado&&['puerta','ventana','ventanal','porton_garage'].includes(f.tipo)){const win=f.tipo==='ventana'||f.tipo==='ventanal';
      P.marcas.push({id:uid(),lado,coord:rr(vMarkCoord({side:i,pos:rel(uc)*largoLado},W,L)),tipo:win?'ventana':'puerta',ancho:med(f,'ancho')||(win?1.2:.9),alto:med(f,'alto')||(win?1.1:2),antepecho:win?(med(f,'sobre')??1):0,src,est:!escrito(f,'alto')});nuevos++;continue}
    /* muro: altura (fachada principal) y revestimiento */
    if(lado&&f.tipo==='muro'){const h=med(f,'alto');if(h&&(lado==='frontal'||!(c.altura>0))&&(escrito(f,'alto')||!(c.altura>0)))c.altura=h;if(f.mat&&MATS.revExt?.opts[f.mat]){(P.mat.revFach=P.mat.revFach||{})[lado]=f.mat;if(!P.mat.revExt||lado==='frontal')P.mat.revExt=f.mat}act++;continue}
    /* aguas del techo */
    if(f.tipo==='agua'){if(lado){const tri=f.geo==='poli'&&f.pts.length===3;if(tri||aguas.length>=2){c.techo='dos-aguas';c.cumbrera=(lado==='frontal'||lado==='posterior')===tri?'perpendicular':'paralela'}else if(aguas.length===1&&!c.techo)c.techo='un-agua'}
      const h=med(f,'alto');if(h&&(escrito(f,'alto')||!(c.hTecho>0)))c.hTecho=h;if(f.mat&&MATS.cubierta?.opts[f.mat])P.mat.cubierta=f.mat;act++;continue}
    /* elementos del terreno */
    const tipo=f.tipo==='piso'?'radier':f.tipo;const T=ELT[tipo];if(!T)continue;
    if(f.vinculo){const e=P.elementos.find(x=>x.id===f.vinculo);if(e){const h=med(f,'alto');if(h&&T.k!=='area')e.h=h;if(f.mat)e.mat=f.mat;e.est=false;act++;continue}}
    let o,u,n;if(lado){const M=fMarco(i,W,L);o=M.o;u=M.u;n=M.n}
    else if(est.tipo==='frente'||est.tipo==='fondo'){const oy=est.tipo==='frente'?-(+c.retiroFrontal||0):(+P.lote.fondo||L+10)-(+c.retiroFrontal||0);o=[-(+c.retiroIzq||0),oy];u=[1,0];n=[0,est.tipo==='frente'?1:-1]}
    else{const e0=(P.elementos||[]).find(x=>x.id===est.ref);const cc=e0?elCenter(e0):[W/2,-2];const ww=e0?Math.max(+e0.w||2,2):ref||4;o=[cc[0]-ww/2,cc[1]];u=[1,0];n=[0,-1]}
    const sMin=rel(Math.min(...us))*largoLado,sMax=rel(Math.max(...us))*largoLado,sC=(sMin+sMax)/2;
    const fondo=med(f,'fondo')||T.l||1,off=T.k==='linea'||T.k==='punto'?(lado?.3:0):(lado?fondo/2:0);
    const p=[o[0]+u[0]*sC+n[0]*off,o[1]+u[1]*sC+n[1]*off];const e=elemNew(tipo,p,u);
    if(T.k==='linea'){const lg=med(f,'largo')||(sMax-sMin);e.a=[rr(o[0]+u[0]*sMin+n[0]*off),rr(o[1]+u[1]*sMin+n[1]*off)];e.b=[rr(e.a[0]+u[0]*lg),rr(e.a[1]+u[1]*lg)];const h=med(f,'alto');if(h)e.h=h}
    else if(T.k==='punto'){const a=med(f,'ancho');if(a)e.w=e.l=Math.min(a,4);const h=med(f,'alto');if(h)e.h=h}
    else{e.w=med(f,'ancho')||rr(sMax-sMin)||T.w;e.l=fondo;const h=med(f,'alto');if(h&&(T.k==='vol'||['escalera','terraza','balcon'].includes(tipo)))e.h=h;const s=med(f,'sobre');if(s&&['balcon','altillo'].includes(tipo))e.nivel=s}
    if(f.mat)e.mat=f.mat;e.src=src;e.est=!escrito(f,'ancho')&&!escrito(f,'largo');P.elementos.push(e);f.vinculo=null;nuevos++}
  est.estado='marcada';persist();
  if(P.marcas.some(m=>m.src===src)&&P.recintos.some(valid))placeMarks();
  if(typeof VV!=='undefined'&&VV&&typeof vCroquis==='function')vCroquis();
  return{nuevos:Math.max(0,nuevos-prev),actualizados:act+Math.min(prev,nuevos)}}
