/* Huincha — ficha del recinto: la app guía, recinto por recinto, todo lo necesario para los planos y el 3D
   (medidas, altura, piso, muros, cielo, puertas y ventanas, artefactos, escalera y foto), con el estado de cada punto.
   Sigue la skill levantamiento-vivienda (sección E). */
"use strict";
TIPOS.escalera=TIPOS.escalera||{n:'Escalera',hab:0,c:0xb5a48a};
const ESC_FORMA={recta:'Recta',L:'En L (con descanso)',U:'En U (ida y vuelta)',caracol:'Caracol'};
const optsDe=(k,v,def)=>Object.entries(MATS[k]?.opts||{}).map(([kk,o])=>`<option value="${kk}"${(v||def)===kk?' selected':''}>${o.n||o}</option>`).join('');
/* puntos de la ficha: [clave, etiqueta, estado 'ok'|'tip'|'falta', id del campo] */
function fichaPuntos(r){const vs=(P.vanos||[]).filter(v=>v.recinto===r.id),necesitaArt=['bano','cocina','logia'].includes(r.tipo),esc=r.tipo==='escalera';
  return[['medidas','Medidas',valid(r)?'ok':'falta','r-ancho'],['alto','Altura',r.alto>0?'ok':'tip','r-alto'],['piso','Piso',r.piso?'ok':'tip','r-piso'],
    ['muros','Muros',r.muroInt?'ok':'tip','r-muroInt'],['cielo','Cielo',r.cielo?'ok':'tip','r-cielo'],
    ['vanos',`Puertas y ventanas${vs.length?' ('+vs.length+')':''}`,vs.length?'ok':'falta','r-addv'],
    ...(necesitaArt||Object.keys(r.art||{}).length?[['art','Artefactos',Object.keys(r.art||{}).length?'ok':'falta','r-art']]:[]),
    ...(esc?[['esc','Escalera',r.esc&&r.esc.peldanos>0?'ok':'falta','r-escForma']]:[]),
    ['foto','Foto',r.fotos&&r.fotos.length?'ok':'tip','r-foto']]}
function fichaProgreso(r){const p=fichaPuntos(r);return{hechos:p.filter(x=>x[2]==='ok').length,total:p.length,faltan:p.filter(x=>x[2]==='falta').length}}
function fichaHTML(r){const c=P.casa,pts=fichaPuntos(r),pr=fichaProgreso(r),e=s=>String(s??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const est={ok:'✓',tip:'≈',falta:'!'};
  return`<div class="ficha" aria-label="Ficha del recinto"><div class="row sb"><b>Ficha del recinto</b><span class="mono">${pr.hechos}/${pr.total}</span></div>
    <div class="fichapts">${pts.map(([k,lab,st,fid])=>`<button class="fpt ${st}" data-fichair="${fid}" title="${st==='tip'?'Valor típico, confírmalo':st==='falta'?'Falta':'Listo'}"><i aria-hidden="true">${est[st]}</i>${e(lab)}</button>`).join('')}</div>
    <p class="note">≈ = se usa un valor típico; confírmalo mirando el recinto. ! = falta para los planos.</p></div>
   <div class="g2"><label class="fld"><span>Altura piso a cielo</span><div class="inp"><input id="r-alto" data-rb="alto" data-num inputmode="decimal" value="${r.alto>0?String(r.alto).replace('.',','):''}" placeholder="${String(c.altura||2.4).replace('.',',')}"><em>m</em></div><small>Con la huincha, del piso al cielo, en una esquina.</small></label>
     <label class="fld"><span>Piso</span><div class="inp sel"><select id="r-piso" data-rs="piso">${optsDe('piso',r.piso,floorOf(r))}</select></div><small>${r.piso?'Confirmado':'Sugerido según el tipo de recinto'}</small></label></div>
   <div class="g2"><label class="fld"><span>Muros</span><div class="inp sel"><select id="r-muroInt" data-rs="muroInt">${optsDe('muroInt',r.muroInt,wallOf(r))}</select></div></label>
     <label class="fld"><span>Cielo</span><div class="inp sel"><select id="r-cielo" data-rs="cielo">${optsDe('cielo',r.cielo,P.mat.cielo||'yeso')}</select></div><label class="chk"><input type="checkbox" data-rck="cieloInc"${r.cieloInc?' checked':''}> Cielo inclinado (sigue el techo)</label></label></div>
   ${r.tipo==='escalera'?`<div class="g2"><label class="fld"><span>Forma de la escalera</span><div class="inp sel"><select id="r-escForma" data-resc="forma">${Object.entries(ESC_FORMA).map(([k,n])=>`<option value="${k}"${(r.esc?.forma||'recta')===k?' selected':''}>${n}</option>`).join('')}</select></div></label>
     <label class="fld"><span>Número de peldaños</span><div class="inp"><input data-resc="peldanos" inputmode="numeric" value="${r.esc?.peldanos||''}" placeholder="${Math.ceil(((+c.altura||2.4)+(+c.entrepiso||.3))/.18)}"></div><small>Cuéntalos. Cada uno sube unos 17 a 18 cm.</small></label></div>
     <div class="g2"><label class="fld"><span>Sube hacia</span><div class="inp sel"><select data-resc="sube">${[['fondo','El fondo'],['frente','La fachada'],['derecha','La derecha'],['izquierda','La izquierda']].map(([k,n])=>`<option value="${k}"${(r.esc?.sube||'fondo')===k?' selected':''}>${n}</option>`).join('')}</select></div></label>
     <label class="fld"><span>Llega a</span><div class="inp sel"><select data-resc="llega">${Array.from({length:Math.max(2,nPisos())},(_,k)=>k).filter(k=>k>nivelDe(r)).map(k=>`<option value="${k}"${(+r.esc?.llega||nivelDe(r)+1)===k?' selected':''}>${k+1}º piso${k>=nPisos()?' (altillo)':''}</option>`).join('')}</select></div></label></div>`:''}`}
document.addEventListener('change',ev=>{const t=ev.target,r=typeof room==='function'?room(UI.room):null;if(!r)return;
  if(t.dataset.rs){r[t.dataset.rs]=t.value;persist();refreshLive();repintaFicha(r)}
  else if(t.dataset.rck){r[t.dataset.rck]=t.checked;persist();refreshLive()}
  else if(t.dataset.resc){r.esc=r.esc||{};const k=t.dataset.resc;r.esc[k]=k==='peldanos'||k==='llega'?(parseInt(t.value)||0):t.value;persist();refreshLive();repintaFicha(r)}});
document.addEventListener('input',ev=>{if(ev.target.dataset?.rb==='alto'){const r=room(UI.room);if(r)setTimeout(()=>repintaFicha(r),0)}});
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-fichair]');if(!b)return;const el=document.getElementById(b.dataset.fichair)||document.querySelector(`[data-addv][data-room]`);
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});if(el.focus)setTimeout(()=>el.focus(),250)}});
function repintaFicha(r){const f=document.querySelector('.ficha');if(!f)return;const pts=fichaPuntos(r),pr=fichaProgreso(r),est={ok:'✓',tip:'≈',falta:'!'};
  f.querySelector('.mono').textContent=pr.hechos+'/'+pr.total;f.querySelector('.fichapts').innerHTML=pts.map(([k,lab,st,fid])=>`<button class="fpt ${st}" data-fichair="${fid}"><i aria-hidden="true">${est[st]}</i>${lab}</button>`).join('')}

/* símbolo de escalera en planta: peldaños y flecha «SUBE» */
function escaleraPlantaSVG(r,X,Y,s,fs){const esc=r.esc||{},n=Math.max(3,+esc.peldanos||Math.ceil(((+P.casa.altura||2.4)+(+P.casa.entrepiso||.3))/.18)),sube=esc.sube||'fondo',lng=sube==='fondo'||sube==='frente';
  let h='';const L=lng?r.largo:r.ancho,paso=Math.min(.3,L/n);
  for(let i=1;i<n&&i*paso<L-.01;i++){const d=i*paso;if(lng){const y=sube==='fondo'?r.y+d:r.y+r.largo-d;h+=`<line x1="${r2(X(r.x))}" y1="${r2(Y(y))}" x2="${r2(X(r.x+r.ancho))}" y2="${r2(Y(y))}" class="th"/>`}
    else{const x=sube==='derecha'?r.x+d:r.x+r.ancho-d;h+=`<line x1="${r2(X(x))}" y1="${r2(Y(r.y))}" x2="${r2(X(x))}" y2="${r2(Y(r.y+r.largo))}" class="th"/>`}}
  const cx=r.x+r.ancho/2,cy=r.y+r.largo/2,[ax,ay,bx,by]=lng?[cx,sube==='fondo'?r.y+.2:r.y+r.largo-.2,cx,sube==='fondo'?r.y+Math.min(L,n*paso)-.2:r.y+r.largo-Math.min(L,n*paso)+.2]:[sube==='derecha'?r.x+.2:r.x+r.ancho-.2,cy,sube==='derecha'?r.x+Math.min(L,n*paso)-.2:r.x+r.ancho-Math.min(L,n*paso)+.2,cy];
  const [x1,y1,x2,y2]=[X(ax),Y(ay),X(bx),Y(by)],an=Math.atan2(y2-y1,x2-x1),k=fs*.6;
  h+=`<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" class="ln"/><polygon class="na" points="${ptsS([[x2,y2],[x2-k*Math.cos(an-.4),y2-k*Math.sin(an-.4)],[x2-k*Math.cos(an+.4),y2-k*Math.sin(an+.4)]])}"/>`+text(x1+fs*.4,y1+(lng?fs*1.1:-fs*.4),'SUBE',fs*.65,'','tx');
  return h}
