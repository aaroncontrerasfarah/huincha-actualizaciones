/* Huincha — licencia Pro (mismo modelo que Cuida2 y Terapia2).
   Gratis: levantar, croquis, planos en pantalla y 3D. Pro: análisis con IA, exportaciones (PDF, DXF, Excel)
   y láminas sin la marca «borrador». El servidor (carpeta servidor-huincha) valida las claves H3-XXXX-XXXX-XXXX-XXXX
   y hace el análisis con IA. Sin internet, una licencia ya verificada sigue activa hasta 30 días. */
"use strict";
window.HUINCHA_SERVIDOR=window.HUINCHA_SERVIDOR||'https://huincha.gestionclinicaspc.cl';
/* Código al azar de este teléfono: identifica la activación de la licencia y el límite diario de IA. */
function dispositivoId(){try{let d=localStorage.getItem('huincha.disp');if(!d){const a=new Uint8Array(12);crypto.getRandomValues(a);d=Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem('huincha.disp',d)}return d}catch(e){return'sinalmacen0000'}}
const Lic=(()=>{const K='huincha.licencia',GRACIA=30*864e5,REVISA=12*36e5;
  const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let L=null;try{L=JSON.parse(localStorage.getItem(K)||'null')}catch(x){L=null}
  let busy=false,msg='';
  const guarda=()=>{try{L?localStorage.setItem(K,JSON.stringify(L)):localStorage.removeItem(K)}catch(x){}};
  const modelo=()=>{const m=navigator.userAgent.match(/Android [\d.]+; ([^;)]+)/);return m?m[1].trim():'Navegador'};
  /* Acepta la clave sola o el mensaje de bienvenida completo pegado. */
  const extraer=t=>{const m=String(t||'').toUpperCase().match(/H3-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);return m?m[0]:''};
  const corta=c=>String(c||'').replace(/^(H3-)(\w{4})-.*-(\w{4})$/,'$1$2-····-····-$3');
  function estado(){if(!L||!L.clave)return'gratis';if(L.bloqueo)return L.bloqueo;if(L.vence&&L.vence<Date.now())return'vencida';if(Date.now()-(L.verificado||0)>GRACIA)return'sinconexion';return'activa'}
  const activa=()=>estado()==='activa';
  async function llamar(accion,clave){const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),15000);
    try{const r=await fetch(HUINCHA_SERVIDOR+'/api/licencia',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify({accion,clave,dispositivo:dispositivoId(),modelo:modelo()})});return await r.json()}
    finally{clearTimeout(t)}}
  async function activar(texto){const c=extraer(texto);if(!c){msg='Escribe la clave tal como la recibiste (H3-XXXX-XXXX-XXXX-XXXX).';pinta();return false}
    busy=true;msg='';pinta();
    try{const r=await llamar('activar',c);if(r.ok){L={clave:c,nombre:r.nombre||'',vence:r.vence||0,verificado:Date.now(),bloqueo:null};guarda();window.toast?.('Huincha Pro activada. ¡Gracias!');cambio();return true}
      msg=r.error||'No se pudo activar.';return false}
    catch(x){msg='Sin conexión. Activar necesita internet una vez.';return false}
    finally{busy=false;pinta()}}
  async function verificar(avisar){if(!L||!L.clave)return;const antes=estado();
    try{const r=await llamar('verificar',L.clave);
      if(r.ok)Object.assign(L,{nombre:r.nombre||L.nombre,vence:r.vence||0,verificado:Date.now(),bloqueo:null});
      else if(['clave','suspendida','vencida','dispositivo'].includes(r.codigo))Object.assign(L,{bloqueo:r.codigo,vence:r.vence??L.vence});
      guarda();if(avisar)window.toast?.(r.ok?'Licencia al día.':(r.error||'No se pudo verificar.'))}
    catch(x){if(avisar)window.toast?.('Sin conexión. Inténtalo cuando tengas internet.')}
    if(estado()!==antes)cambio();pinta()}
  async function liberar(){if(!L)return;busy=true;pinta();
    try{await llamar('liberar',L.clave)}catch(x){busy=false;pinta();window.toast?.('Necesitas internet para desactivar la licencia en este teléfono.');return}
    L=null;guarda();busy=false;window.toast?.('Licencia desactivada en este teléfono. Puedes activarla en otro.');cambio();pinta()}
  /* El servidor avisó (por ejemplo al usar la IA) que la licencia ya no vale en este teléfono. */
  function rechazo(codigo){if(L&&['clave','suspendida','vencida','dispositivo'].includes(codigo)){L.bloqueo=codigo;guarda();cambio();pinta()}}
  function cambio(){try{document.dispatchEvent(new CustomEvent('huincha-licencia',{detail:estado()}))}catch(x){}}
  const TXT={vencida:'Tu licencia Pro venció. Renuévala con quien te la vendió y toca «Verificar».',suspendida:'Tu licencia Pro está suspendida. Escribe a quien te la vendió y luego toca «Verificar».',
    clave:'Tu clave ya no es válida. Escribe la clave nueva que te enviaron.',dispositivo:'La licencia se desactivó en este teléfono. Vuelve a escribir tu clave.',
    sinconexion:'Conéctate a internet y toca «Verificar»: la licencia se revisa al menos una vez al mes.'};
  function cuerpo(){const st=estado();
    let h=`<div class="row sb"><h3>Huincha Pro</h3><span class="badge${st==='activa'?' ok':''}">${st==='activa'?'Activa':'Gratis'}</span></div>`;
    if(st==='activa'){const v=L.vence?new Date(L.vence).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'}):'sin vencimiento';
      return h+`<p class="note">${L.nombre?e(L.nombre)+' · ':''}Clave ${e(corta(L.clave))} · Vence: ${e(v)}</p><p class="note">Incluye análisis de fotos con IA, PDF a escala, DXF, cubicación en Excel y láminas sin marca de borrador.</p>
        <div class="row"><button class="btn sm" data-lic="verificar"${busy?' disabled':''}>Verificar</button><button class="btn sm ghost" data-lic="liberar"${busy?' disabled':''}>Desactivar en este teléfono</button></div>`}
    const pedir=st==='gratis'||st==='clave'||st==='dispositivo';
    h+=st==='gratis'?`<p class="note">Levantar, ver los planos y el 3D es gratis. Con <b>Pro</b> la IA reconoce lo que fotografías, exportas PDF a escala, DXF para AutoCAD y la cubicación en Excel, y las láminas salen sin la marca «borrador».</p>`:`<p class="note warn">${e(TXT[st]||'')}</p>`;
    if(pedir)h+=`<div class="row"><div class="inp" style="flex:1;min-width:200px"><input id="lic-clave" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="H3-XXXX-XXXX-XXXX-XXXX" aria-label="Clave de licencia"></div><button class="btn pri" data-lic="activar"${busy?' disabled':''}>${busy?'Activando…':'Activar'}</button></div>`;
    else h+=`<div class="row"><button class="btn pri" data-lic="verificar"${busy?' disabled':''}>Verificar</button></div>`;
    if(msg)h+=`<p class="note warn" role="alert">${e(msg)}</p>`;
    return h}
  const cardHTML=()=>`<div class="card" id="liccard">${cuerpo()}</div>`;
  function pinta(){const c=document.getElementById('liccard');if(c)c.innerHTML=cuerpo()}
  /* Para funciones Pro: devuelve true si se puede; si no, avisa y lleva a la tarjeta de la licencia. */
  function exigir(que){if(activa())return true;window.toast?.(`${que||'Esta función'} es parte de Huincha Pro. Actívala en el paso Proyecto.`);return false}
  document.addEventListener('click',ev=>{const b=ev.target.closest('[data-lic]');if(!b)return;const a=b.dataset.lic;
    if(a==='activar')activar(document.getElementById('lic-clave')?.value);else if(a==='verificar')verificar(true);else if(a==='liberar')liberar()});
  document.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.id==='lic-clave')activar(ev.target.value)});
  /* revisión en segundo plano cada 12 horas */
  setTimeout(()=>{if(L&&L.clave&&Date.now()-(L.verificado||0)>REVISA)verificar(false)},4000);
  return{estado,activa,clave:()=>L?.clave||'',activar,verificar,liberar,rechazo,cardHTML,pinta,exigir,extraer}})();
