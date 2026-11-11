/* Huincha — ayuda: glosario con dibujos para quien no maneja términos de arquitectura. */
"use strict";
const GLOSARIO=[
  {k:'deslindes',t:'Deslindes',g:'Terreno',d:'Los bordes del terreno: las líneas donde termina tu propiedad y empieza la del vecino o la calle. Normalmente coinciden con la reja, el cerco o el muro. Un terreno rectangular tiene cuatro deslindes: el frontal (hacia la calle), dos laterales y el de fondo.'},
  {k:'frente',t:'Frente o deslinde frontal',g:'Terreno',d:'El borde del terreno que da a la calle. Ahí suelen estar la reja y el portón de acceso.'},
  {k:'fondo',t:'Fondo o deslinde de fondo',g:'Terreno',d:'El borde del terreno opuesto a la calle, al final del patio.'},
  {k:'laterales',t:'Deslindes laterales',g:'Terreno',d:'Los bordes del terreno a la izquierda y a la derecha, mirando desde la calle hacia la casa. Separan tu terreno de los vecinos.'},
  {k:'antejardin',t:'Antejardín',g:'Terreno',d:'El espacio entre la reja de la calle y la fachada principal de la casa. Su profundidad es la distancia del portón a la casa (también se llama retiro frontal).'},
  {k:'retiro',t:'Retiro',g:'Terreno',d:'La distancia entre la casa y un deslinde. El retiro frontal es la distancia de la casa a la reja de la calle; los retiros laterales, la distancia a los vecinos.'},
  {k:'norte',t:'Norte',g:'Terreno',d:'Hacia dónde queda el norte geográfico. Sirve para saber por dónde entra el sol a cada recinto. La app lo toma del mapa o de la brújula del teléfono al fotografiar la fachada principal.'},
  {k:'fachada',t:'Fachada',g:'Casa',d:'Cada cara exterior de la casa vista desde afuera, con sus muros, puertas, ventanas y techo.'},
  {k:'fachadaPrincipal',t:'Fachada principal',g:'Casa',d:'La cara de la casa que mira hacia la calle, donde normalmente está la puerta de entrada. Se fotografía desde el portón o la reja.'},
  {k:'costados',t:'Costado izquierdo y derecho',g:'Casa',d:'Las caras laterales de la casa. Izquierdo y derecho se definen siempre mirando la casa desde la calle.'},
  {k:'posterior',t:'Fachada posterior',g:'Casa',d:'La cara de atrás de la casa, la que mira hacia el patio o el fondo del terreno.'},
  {k:'contorno',t:'Contorno',g:'Casa',d:'El borde exterior de la casa visto desde arriba: el recorrido por fuera, de esquina a esquina.'},
  {k:'vano',t:'Vano',g:'Casa',d:'Cualquier abertura en un muro: puertas, ventanas, ventanales o portón de garaje.'},
  {k:'antepecho',t:'Antepecho',g:'Casa',d:'La altura desde el piso hasta donde empieza una ventana (el borde inferior del marco).'},
  {k:'aguas',t:'Aguas del techo',g:'Techo',d:'Cada plano inclinado del techo por donde escurre la lluvia. Techo a dos aguas: dos planos que se juntan arriba. Un agua: un solo plano inclinado. Plano: casi horizontal, como una losa.'},
  {k:'cumbrera',t:'Cumbrera',g:'Techo',d:'La línea más alta del techo, donde se juntan las aguas. Si corre a lo ancho de la fachada, desde el frente se ve el techo inclinado; si va hacia el fondo, desde el frente se ve un triángulo (frontón).'},
  {k:'cercha',t:'Cercha',g:'Techo',d:'Armadura triangular de madera o acero que sostiene el techo, hecha de piezas unidas (cuerda superior, cuerda inferior y diagonales). Se ponen en fila, normalmente cada 60 cm a 1,20 m. Se ven desde la trampa del entretecho.'},
  {k:'costanera',t:'Costaneras',g:'Techo',d:'Listones que van sobre las cerchas, de lado a lado, y donde se fija la cubierta (planchas, tejas).'},
  {k:'bajocubierta',t:'Bajo cubierta',g:'Techo',d:'Lámina impermeable (fieltro o membrana) que va bajo la cubierta para que el agua que se filtre no llegue a la casa.'},
  {k:'aislacion',t:'Aislación térmica',g:'Techo',d:'Material (lana de vidrio, lana mineral, poliestireno…) sobre el cielo o entre las cerchas que mantiene la temperatura de la casa. Importa su espesor.'},
  {k:'hojalateria',t:'Hojalatería',g:'Techo',d:'Piezas metálicas que conducen el agua lluvia: canales en el borde del techo, bajadas hasta el suelo, caballetes en la cumbrera y forros.'},
  {k:'alero',t:'Alero',g:'Techo',d:'La parte del techo que sobresale de los muros y protege de la lluvia y el sol.'},
  {k:'alturaTecho',t:'Altura del techo',g:'Techo',d:'Cuánto sube el techo desde la parte alta del muro hasta la cumbrera.'},
  {k:'zocalo',t:'Zócalo',g:'Casa',d:'La franja baja de los muros exteriores, junto al suelo, a veces de otro material o color.'},
  {k:'radier',t:'Radier',g:'Elementos',d:'Losa de hormigón sobre el suelo: base de pisos, patios, terrazas o estacionamientos.'},
  {k:'terraza',t:'Terraza',g:'Elementos',d:'Superficie exterior pavimentada o de madera junto a la casa, normalmente un poco más alta que el suelo.'},
  {k:'cobertizo',t:'Cobertizo o corredor',g:'Elementos',d:'Techo liviano sobre pilares, abierto a los lados: para estacionar, guardar cosas o dar sombra.'},
  {k:'quincho',t:'Quincho',g:'Elementos',d:'Construcción liviana del patio con techo y parrilla, para reuniones.'},
  {k:'pilar',t:'Pilar',g:'Elementos',d:'Columna que sostiene un techo, un corredor o un segundo piso.'},
  {k:'cubicacion',t:'Cubicación',g:'Resultados',d:'El cálculo de cantidades de materiales (metros cuadrados de muro, piso y techo, metros cúbicos de hormigón…) para presupuestar una obra.'},
  {k:'emplazamiento',t:'Plano de emplazamiento',g:'Resultados',d:'El dibujo del terreno visto desde arriba, con la casa y todo lo que hay en él, a escala.'},
  {k:'elevacion',t:'Elevación',g:'Resultados',d:'El dibujo de una fachada vista de frente, a escala, con sus puertas, ventanas y techo.'}];

/* dibujos explicativos */
function ayudaPlantaSVG(){return`<svg viewBox="0 0 320 300" class="aysvg" role="img" aria-label="Terreno visto desde arriba">
  <rect x="0" y="262" width="320" height="38" class="ay-calle"/><text x="160" y="294" class="ay-t c">CALLE</text>
  <rect x="40" y="20" width="240" height="240" class="ay-lote"/>
  <text x="160" y="14" class="ay-t c">Deslinde de fondo</text><text x="160" y="276" class="ay-t c b">Deslinde frontal (reja)</text>
  <text x="30" y="140" class="ay-t c" transform="rotate(-90 30 140)">Deslinde lateral izquierdo</text><text x="292" y="140" class="ay-t c" transform="rotate(90 292 140)">Deslinde lateral derecho</text>
  <rect x="140" y="250" width="40" height="8" class="ay-porton"/><text x="160" y="246" class="ay-t c s">portón</text>
  <rect x="90" y="110" width="140" height="90" class="ay-casa"/><text x="160" y="160" class="ay-t c b">CASA</text>
  <line x1="90" y1="200" x2="230" y2="200" class="ay-fp"/><text x="160" y="214" class="ay-t c s acc">fachada principal</text>
  <text x="160" y="106" class="ay-t c s">fachada posterior</text><text x="84" y="158" class="ay-t c s" transform="rotate(-90 84 158)">costado izq.</text><text x="238" y="158" class="ay-t c s" transform="rotate(90 238 158)">costado der.</text>
  <line x1="160" y1="202" x2="160" y2="248" class="ay-cota"/><text x="166" y="232" class="ay-t s">antejardín</text>
  <text x="160" y="60" class="ay-t c s">patio</text>
  <g transform="translate(282,46)"><circle r="13" class="ay-n"/><path d="M0,-10 L5,4 L0,1 L-5,4Z" class="ay-na"/><text y="26" class="ay-t c s">N</text></g></svg>`}
function ayudaFachadaSVG(){return`<svg viewBox="0 0 320 220" class="aysvg" role="img" aria-label="Fachada vista de frente">
  <polygon points="40,96 160,30 280,96" class="ay-techo"/><line x1="160" y1="30" x2="160" y2="96" class="ay-cota"/><text x="166" y="70" class="ay-t s">altura del techo</text>
  <text x="160" y="22" class="ay-t c s">cumbrera</text><text x="52" y="90" class="ay-t s">agua</text><text x="250" y="90" class="ay-t s">agua</text>
  <line x1="40" y1="96" x2="60" y2="96" class="ay-fp"/><text x="20" y="110" class="ay-t s">alero</text>
  <rect x="60" y="96" width="200" height="94" class="ay-casa"/><rect x="60" y="176" width="200" height="14" class="ay-zoc"/><text x="270" y="188" class="ay-t s">zócalo</text>
  <rect x="80" y="118" width="46" height="34" class="ay-vent"/><rect x="196" y="118" width="46" height="34" class="ay-vent"/><rect x="146" y="124" width="28" height="66" class="ay-puerta"/>
  <line x1="74" y1="152" x2="74" y2="190" class="ay-cota"/><text x="20" y="176" class="ay-t s">antepecho</text>
  <text x="103" y="114" class="ay-t c s">ventana</text><text x="160" y="120" class="ay-t c s">puerta</text>
  <rect x="40" y="190" width="240" height="12" class="ay-terr"/><text x="160" y="214" class="ay-t c s">terraza o radier</text></svg>`}

function ayudaAbrir(k){let ov=$('#ayuda');if(!ov){ov=document.createElement('div');ov.id='ayuda';ov.className='ayov';document.body.appendChild(ov)}
  const grupos=[...new Set(GLOSARIO.map(x=>x.g))];
  ov.innerHTML=`<div class="aypan" role="dialog" aria-label="Ayuda"><div class="row sb"><h3>¿Qué significa?</h3><button class="btn sm dark" data-ay="cerrar" aria-label="Cerrar ayuda">✕</button></div>
    <div class="inp"><input id="aybus" type="search" placeholder="Buscar: deslinde, cumbrera, antepecho…" autocomplete="off"></div>
    <div class="aydib"><figure>${ayudaPlantaSVG()}<figcaption>El terreno visto desde arriba</figcaption></figure><figure>${ayudaFachadaSVG()}<figcaption>Una fachada vista de frente</figcaption></figure></div>
    ${grupos.map(g=>`<h4 class="ayg">${g}</h4>${GLOSARIO.filter(x=>x.g===g).map(x=>`<div class="ayi" id="ay-${x.k}" data-txt="${esc((x.t+' '+x.d).toLowerCase())}"><b>${esc(x.t)}</b><p>${esc(x.d)}</p></div>`).join('')}`).join('')}</div>`;
  ov.hidden=false;if(k){const el=$('#ay-'+k);if(el){el.classList.add('on');setTimeout(()=>el.scrollIntoView({block:'center'}),60)}}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ayuda],[data-ay]');if(!b)return;
  if(b.dataset.ayuda!=null){e.preventDefault();ayudaAbrir(b.dataset.ayuda);return}
  if(b.dataset.ay==='cerrar'){$('#ayuda').hidden=true}});
document.addEventListener('input',e=>{if(e.target.id!=='aybus')return;const q=e.target.value.trim().toLowerCase();document.querySelectorAll('#ayuda .ayi').forEach(x=>{x.hidden=q&&!x.dataset.txt.includes(q)})});
/* enlace corto "¿Qué es?" para poner junto a un término */
const queEs=k=>`<button type="button" class="queEs" data-ayuda="${k}" aria-label="Qué significa">?</button>`;
