/* Huincha — actualizaciones dentro de la app, sin descargar el APK de nuevo.
   GitHub compila cada cambio; la app armada (web.zip, APK y version.json) se copia al repositorio público
   huincha-actualizaciones con tools/publicar_actualizacion.sh. El código fuente sigue privado. */
"use strict";
const Upd=(()=>{
  /* Las versiones listas se publican en un repositorio público aparte que solo contiene la app armada
     (el código fuente sigue privado). No se necesita ninguna clave. */
  const BASE='https://raw.githubusercontent.com/aaroncontrerasfarah/huincha-actualizaciones/main/huincha3/';
  const S={estado:'',msg:'',remota:null,info:null,busy:false};
  const C=window.Capacitor,native=!!(C&&C.isNativePlatform&&C.isNativePlatform());
  const plug=()=>native?(C.Plugins?.HuinchaUpdate||C.registerPlugin?.('HuinchaUpdate')):null;
  const web=()=>+(window.HUINCHA_WEB||0);
  const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  async function init(){
    const p=plug();
    if(p){try{await p.listo()}catch(e){}try{S.info=await p.info()}catch(e){}}
    if(S.info?.revertida)setTimeout(()=>window.toast?.('La última actualización no arrancó bien. Volví a la versión anterior.'),800);
    if(native)buscar(true)}

  async function buscar(silencio){
    if(S.busy)return;S.busy=true;S.estado='buscando';pinta();
    try{const r=await fetch(BASE+'version.json?t='+Date.now(),{cache:'no-store'});
      if(!r.ok){S.estado='error';S.msg='Todavía no hay actualizaciones publicadas.';return}
      const j=await r.json();
      S.remota={web:+j.web||0,nativo:j.nativo||'',fecha:j.fecha||'',notas:j.notas||'',zip:BASE+(j.zip||'web.zip'),apk:BASE+(j.apk||'huincha3.apk')};
      if(S.remota.web<=web()){S.estado='aldia';return}
      const nat=S.info?.nativo;
      S.estado=(nat&&nat!=='local'&&S.remota.nativo&&S.remota.nativo!==nat)?'apk':'disponible'}
    catch(x){S.estado='error';S.msg='No se pudo revisar. Revisa la conexión a internet.'}
    finally{S.busy=false;pinta();if(!silencio&&S.estado==='aldia')window.toast?.('Ya tienes la última versión.')}}

  async function instalar(){
    const p=plug();if(!p||!S.remota?.zip)return;
    S.busy=true;S.estado='instalando';pinta();
    try{if(typeof flush==='function')await flush()}catch(x){}
    try{await p.instalar({url:S.remota.zip,token:'',version:S.remota.web})/* la app se recarga sola con la versión nueva */}
    catch(x){S.busy=false;S.estado='error';S.msg=(x&&x.message)||'No se pudo instalar la actualización.';pinta()}}

  function cardHTML(){return`<div class="card" id="updcard">${cuerpo()}</div>`}
  function cuerpo(){
    const ver=web()?`Versión ${web()}`:'Versión instalada con el APK';
    let h=`<div class="row sb"><h3>Actualizaciones</h3><span class="badge">${e(ver)}</span></div>`;
    if(!native)return h+'<p class="note">Estás usando la versión web: siempre es la más reciente. Para ver una mejora nueva, recarga la página.</p>';
    const st={
      buscando:'<p class="note">Revisando si hay una versión nueva…</p>',
      instalando:'<p class="note"><b>Descargando e instalando…</b> La app se reiniciará sola en unos segundos.</p>',
      aldia:`<p class="note">Tienes la última versión.</p>`,
      disponible:`<p><b>Hay una versión nueva (${S.remota?.web}).</b> Se instala en segundos y conserva tus levantamientos, fotos y videos.</p>${S.remota?.notas?`<p class="note">${e(S.remota.notas)}</p>`:''}`,
      apk:`<p><b>Hay una versión nueva (${S.remota?.web}) que cambia partes internas de la app</b> (cámara, realidad aumentada). Esta vez hay que descargar el APK e instalarlo encima; tus datos se conservan.</p>`,
      error:`<p class="note warn">${e(S.msg)}</p>`}[S.estado]||'<p class="note">Busca si hay mejoras nuevas para instalar.</p>';
    const b=[];
    if(S.estado==='disponible')b.push('<button class="btn pri" data-upd="instalar">Actualizar ahora</button>');
    else if(S.estado==='apk')b.push(`<button class="btn pri" data-upd="apk">Descargar APK</button>`);
    else if(!S.busy)b.push('<button class="btn pri" data-upd="buscar">Buscar actualización</button>');
    if(!S.busy&&S.info?.version>0)b.push('<button class="btn sm ghost" data-upd="revertir">Volver a la versión del APK</button>');
    return h+st+`<div class="row">${b.join('')}</div>`}
  function pinta(){const c=document.getElementById('updcard');if(c)c.innerHTML=cuerpo();
    const bar=document.getElementById('updbar');if(bar){const show=S.estado==='disponible'||S.estado==='apk';bar.hidden=!show;
      if(show)bar.innerHTML=`<div class="wrap updbar-in"><span><b>Versión nueva disponible.</b> ${S.estado==='apk'?'Requiere descargar el APK.':'Se instala en segundos.'}</span><button class="btn sm pri" data-upd="${S.estado==='apk'?'apk':'instalar'}">${S.estado==='apk'?'Descargar':'Actualizar'}</button></div>`}}

  document.addEventListener('click',ev=>{const b=ev.target.closest('[data-upd]');if(!b)return;
    switch(b.dataset.upd){
      case 'buscar':buscar(false);break;
      case 'instalar':instalar();break;
      case 'apk':if(S.remota?.apk)window.open(S.remota.apk,'_blank');break;
      case 'revertir':plug()?.revertir();break}});

  return{init,cardHTML,buscar,native}})();
