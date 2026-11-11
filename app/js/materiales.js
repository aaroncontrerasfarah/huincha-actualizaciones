/* Huincha — catálogo de materiales y texturas procedurales.
   Todas las texturas se dibujan en el teléfono (canvas), sin imágenes externas: la app funciona sin señal.
   Cada textura declara su tamaño real en metros, así el 3D y las miniaturas mantienen la escala. */
"use strict";

const COL_EXT=[['Blanco invierno','#ECEAE3'],['Hueso','#E2D8C4'],['Marfil','#EFE6CF'],['Arena','#D2C09E'],['Greda','#C9A98A'],['Terracota','#B5694A'],['Ladrillo','#9C5640'],['Ocre','#C79E57'],['Amarillo colonial','#E3C46E'],['Verde salvia','#98A88E'],['Verde musgo','#6E7B5A'],['Azul piedra','#7E93A0'],['Azul colonial','#4F6F8F'],['Gris perla','#BEC2C0'],['Gris cemento','#9A9C98'],['Grafito','#4B5053'],['Negro','#2A2C2E']];
const COL_TECHO=[['Rojo teja','#9B4A33'],['Café','#6A4A37'],['Grafito','#3E4347'],['Negro','#26292B'],['Gris','#8B9195'],['Verde','#4E6A55'],['Azul','#3F566B']];
const COL_INT=[['Blanco','#F3F1EB'],['Blanco cálido','#F2ECDF'],['Hueso','#ECE4D4'],['Lino','#E6DCC8'],['Gris niebla','#D9DBD8'],['Gris piedra','#BFBDB5'],['Arena','#E2D3B8'],['Durazno','#EFD3BE'],['Rosa empolvado','#E5C9C2'],['Salvia','#C9D3C2'],['Verde menta','#CFE3D6'],['Celeste','#CFDCE2'],['Azul grisáceo','#9FB2BE'],['Terracota suave','#D3A28A'],['Grafito','#5A5F61']];
const COL_MOLD=[['Blanco','#F0EEE8'],['Hueso','#E2D8C4'],['Gris','#9A9C98'],['Grafito','#3C4144'],['Negro','#26292B'],['Café','#5E4632'],['Verde','#4E6A55'],['Azul','#3F566B']];

const MATS={
  estructura:{lab:'Muros exteriores',show:1.6,opts:{
    albanileria:{n:'Albañilería de ladrillo',d:'Con pilares y cadenas',e:0.20,hatch:'diag',tex:'brickRaw',col:'#A3573B'},
    bloque:{n:'Bloque de hormigón',d:'Bloque estructural',e:0.15,hatch:'cross',tex:'block',col:'#A9A7A2'},
    hormigon:{n:'Hormigón armado',d:'Moldeado en obra',e:0.20,hatch:'solid',tex:'concrete',col:'#A9A7A1'},
    madera:{n:'Tabiquería de madera',d:'Pino con aislación',e:0.15,hatch:'wood',tex:'studs',col:'#C9A46A'},
    acero:{n:'Acero galvanizado liviano',d:'Perfiles con aislación',e:0.12,hatch:'steel',tex:'steelStuds',col:'#B9BEC2'},
    adobe:{n:'Adobe',d:'Bloques de barro',e:0.40,hatch:'dots',tex:'adobe',col:'#A88462'}}},
  tabiques:{lab:'Tabiques interiores',show:1.6,opts:{
    madera:{n:'Tabique de madera',d:'Pino y yeso-cartón',e:0.10,hatch:'wood',tex:'studs',col:'#C9A46A'},
    acero:{n:'Tabique de acero galvanizado',d:'Perfiles y yeso-cartón',e:0.10,hatch:'steel',tex:'steelStuds',col:'#B9BEC2'},
    albanileria:{n:'Albañilería',d:'Ladrillo estucado',e:0.15,hatch:'diag',tex:'brickRaw',col:'#A3573B'},
    hormigon:{n:'Hormigón',d:'Moldeado en obra',e:0.15,hatch:'solid',tex:'concrete',col:'#A9A7A1'}}},
  revExt:{lab:'Revestimiento de fachada',show:1.6,color:'colorExt',palette:COL_EXT,opts:{
    estuco:{n:'Estuco pintado',d:'Terminación lisa',tex:'stucco',useColor:1,rough:.92},
    fibrocemento:{n:'Siding de fibrocemento',d:'Tablas horizontales',tex:'siding',useColor:1,rough:.75},
    tinglado:{n:'Tinglado de madera',d:'Tablas traslapadas',tex:'tinglado',col:'#9A6A43',rough:.7},
    ladrillo:{n:'Ladrillo a la vista',d:'Sin estuco',tex:'brick',col:'#A65A3C',rough:.9},
    piedra:{n:'Enchape de piedra',d:'Piedra laja',tex:'stone',col:'#A59B8C',rough:.95},
    hormigon:{n:'Hormigón a la vista',d:'Con marcas de moldaje',tex:'concrete',col:'#A9A7A1',rough:.88},
    eifs:{n:'Sistema EIFS',d:'Aislación exterior con estuco',tex:'stucco',useColor:1,rough:.9},
    placa:{n:'Placa de madera',d:'Tableros con junta vertical',tex:'panelWood',col:'#A9794D',rough:.7}}},
  zocalo:{lab:'Zócalo de fachada',show:1.2,color:'colorZocalo',palette:COL_EXT,opts:{
    ninguno:{n:'Sin zócalo',tex:'none'},
    pintura:{n:'Franja pintada',d:'60 cm de alto',tex:'stucco',useColor:1,rough:.9},
    piedra:{n:'Piedra',d:'60 cm de alto',tex:'stone',col:'#8F877A',rough:.95},
    ladrillo:{n:'Ladrillo',d:'60 cm de alto',tex:'brick',col:'#A65A3C',rough:.9},
    ceramica:{n:'Cerámica',d:'60 cm de alto',tex:'ceramica',col:'#8D8A84',rough:.4}}},
  molduras:{lab:'Tapacán y molduras',show:.6,color:'colorMolduras',palette:COL_MOLD,opts:{
    pintada:{n:'Pintadas',d:'Del color elegido',tex:'paint',useColor:1,rough:.7},
    madera:{n:'Madera barnizada',tex:'woodGrain',col:'#8A5B37',rough:.6},
    fibrocemento:{n:'Fibrocemento',d:'Del color elegido',tex:'paint',useColor:1,rough:.85}}},
  cubierta:{lab:'Cubierta',show:1.6,color:'colorCubierta',palette:COL_TECHO,opts:{
    teja:{n:'Teja de arcilla',d:'Teja colonial',tex:'teja',useColor:1,rough:.8,techo:'inclinado'},
    asfaltica:{n:'Teja asfáltica',d:'Sobre OSB y fieltro',tex:'shingle',useColor:1,rough:.95,techo:'inclinado'},
    zinc:{n:'Zinc ondulado',d:'Plancha galvanizada',tex:'zinc',col:'#B8BDC0',rough:.42,metal:.55,techo:'inclinado'},
    acero:{n:'Acero prepintado',d:'Perfil trapezoidal',tex:'steelRoof',useColor:1,rough:.5,metal:.3,techo:'ambos'},
    losa:{n:'Losa impermeabilizada',d:'Membrana asfáltica',tex:'membrane',col:'#8C8F8E',rough:.95,techo:'plana'}}},
  ventanas:{lab:'Marcos de ventanas',show:0.6,opts:{
    alBlanco:{n:'Aluminio blanco',tex:'frame',col:'#F1F1EE',rough:.4,metal:.15},
    alNegro:{n:'Aluminio negro',tex:'frame',col:'#2B2E30',rough:.4,metal:.4},
    alMate:{n:'Aluminio mate',tex:'frame',col:'#A7ABAD',rough:.35,metal:.6},
    pvc:{n:'PVC blanco',d:'Mejor aislación',tex:'frame',col:'#F5F5F2',rough:.5},
    madera:{n:'Madera',tex:'woodGrain',col:'#8A5B37',rough:.6}}},
  vidrio:{lab:'Vidrio',opts:{simple:{n:'Vidrio simple'},termopanel:{n:'Termopanel (doble vidrio)'}}},
  puertas:{lab:'Puertas',show:1.2,color:'colorPuertas',palette:COL_MOLD,opts:{
    madera:{n:'Madera barnizada',tex:'woodV',col:'#7A4E2D',rough:.55},
    pintada:{n:'Pintada',d:'Del color elegido',tex:'paint',useColor:1,colorFrom:'colorPuertas',rough:.6},
    blanca:{n:'Lisa pintada blanca',tex:'paint',col:'#F2F1EC',rough:.6},
    grafito:{n:'Lisa pintada grafito',tex:'paint',col:'#3C4144',rough:.6}}},
  piso:{lab:'Piso general',show:1.4,opts:{
    porcelanato:{n:'Porcelanato',d:'60 × 60 cm',tex:'porcelanato',col:'#E2DED6',rough:.32},
    ceramica:{n:'Cerámica',d:'33 × 33 cm',tex:'ceramica',col:'#D6CCBC',rough:.4},
    flotante:{n:'Piso flotante',d:'Roble claro',tex:'flotante',col:'#B8916A',rough:.55},
    parquet:{n:'Parquet',d:'Madera nativa',tex:'parquet',col:'#8E5A38',rough:.45},
    vinilico:{n:'Piso vinílico',d:'Tablas SPC',tex:'vinilico',col:'#B7AA97',rough:.6},
    hormigon:{n:'Hormigón pulido',tex:'polished',col:'#A09E98',rough:.35},
    alfombra:{n:'Alfombra',tex:'carpet',col:'#8E877D',rough:1},
    pino:{n:'Piso de pino',d:'Machihembrado',tex:'flotante',col:'#C9A26E',rough:.6},
    baldosa:{n:'Baldosa',d:'40 × 40 cm',tex:'pavers',col:'#B9A894',rough:.55}}},
  muroInt:{lab:'Muros interiores',show:1.4,color:'colorInt',palette:COL_INT,opts:{
    pintura:{n:'Pintura látex',tex:'paint',useColor:1,rough:.9},
    ceramica:{n:'Cerámica de muro',d:'20 × 30 cm',tex:'wallTile',col:'#ECEAE4',rough:.25},
    papel:{n:'Papel mural',tex:'wallpaper',useColor:1,rough:.85},
    madera:{n:'Revestimiento de madera',tex:'woodV',col:'#B88A5E',rough:.6},
    ladrillo:{n:'Ladrillo a la vista',tex:'brick',col:'#A65A3C',rough:.9},
    piedra:{n:'Piedra',tex:'stone',col:'#A59B8C',rough:.95},
    estuco:{n:'Estuco texturado',tex:'stucco',useColor:1,rough:.95}}},
  cielo:{lab:'Cielo',show:1.4,color:'colorCielo',palette:COL_INT,opts:{
    yeso:{n:'Yeso-cartón pintado',tex:'paint',useColor:1,rough:.95},
    madera:{n:'Madera machihembrada',tex:'woodV',col:'#C49A6C',rough:.6}}},
  terreno:{lab:'Patio y jardín',show:2.5,opts:{
    pasto:{n:'Pasto',tex:'grass',col:'#5E7F3A',rough:1},
    gravilla:{n:'Gravilla',tex:'gravel',col:'#A39C8F',rough:1},
    tierra:{n:'Tierra',tex:'dirt',col:'#8A6B4D',rough:1},
    pavimento:{n:'Baldosas',tex:'pavers',col:'#B7B3AB',rough:.9}}},
  cierre:{lab:'Cierre perimetral',show:2,opts:{
    ninguno:{n:'Sin cierre',tex:'none'},
    madera:{n:'Madera',d:'1,80 m',tex:'fenceWood',col:'#8B6440',h:1.8,rough:.8},
    malla:{n:'Malla de acero',d:'1,50 m',tex:'mesh',col:'#55606A',h:1.5,rough:.5,metal:.4},
    reja:{n:'Reja metálica',d:'1,50 m',tex:'bars',col:'#2E3236',h:1.5,rough:.5,metal:.3},
    albanileria:{n:'Albañilería estucada',d:'1,80 m',tex:'stucco',useColor:1,colorFrom:'colorExt',h:1.8,rough:.92}}}
};
const MAT_DEF={estructura:'',tabiques:'madera',revExt:'',colorExt:'#E2D8C4',zocalo:'ninguno',colorZocalo:'#4B5053',molduras:'pintada',colorMolduras:'#F0EEE8',cubierta:'',colorCubierta:'#9B4A33',piso:'',muroInt:'pintura',colorInt:'#F3F1EB',cielo:'yeso',colorCielo:'#F3F1EB',ventanas:'',vidrio:'simple',puertas:'madera',colorPuertas:'#3C4144',terreno:'pasto',cierre:'ninguno'};

const MatTex=(()=>{
  const cache=new Map(),thumbs=new Map();
  const rng=seed=>{let s=seed|0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
  const hx=c=>{c=String(c||'#888').replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');const n=parseInt(c,16);return[n>>16&255,n>>8&255,n&255]};
  const sh=(c,f)=>{const [r,g,b]=hx(c);const k=f<0?0:255,a=Math.min(1,Math.abs(f));return`rgb(${Math.round(r+(k-r)*a)},${Math.round(g+(k-g)*a)},${Math.round(b+(k-b)*a)})`};
  const toHex=s=>{const m=s.match(/\d+/g).map(Number);return'#'+m.slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('')};
  const jit=(c,R,a)=>toHex(sh(c,(R()-.5)*2*a));
  function speck(g,W,H,R,n,a,s0,s1){for(let i=0;i<n;i++){const s=s0+R()*(s1-s0);g.fillStyle=R()<.5?`rgba(255,255,255,${a*R()})`:`rgba(0,0,0,${a*R()})`;g.fillRect(R()*W,R()*H,s,s)}}
  function blot(g,W,H,R,n,a,r0,r1){for(let i=0;i<n;i++){const x=R()*W,y=R()*H,r=r0+R()*(r1-r0),lt=R()<.5;
    for(const dx of [0,-W,W])for(const dy of [0,-H,H]){const cx=x+dx,cy=y+dy;if(cx+r<0||cx-r>W||cy+r<0||cy-r>H)continue;
      const gr=g.createRadialGradient(cx,cy,0,cx,cy,r);gr.addColorStop(0,lt?`rgba(255,255,255,${a})`:`rgba(0,0,0,${a})`);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(cx-r,cy-r,2*r,2*r)}}}
  /* Dibuja un rectángulo repitiéndolo en los bordes para que la textura no muestre costuras */
  function wrapRect(W,H,x,y,w,h,fn){for(const dx of [0,-W,W])for(const dy of [0,-H,H]){const X=x+dx,Y=y+dy;if(X>=W||X+w<=0||Y>=H||Y+h<=0)continue;fn(X,Y)}}
  function grain(g,x,y,w,h,R,col,n,vert,a=.1){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.strokeStyle=col;g.lineWidth=Math.max(.6,w/260);
    for(let i=0;i<n;i++){g.globalAlpha=a*(.4+R());g.beginPath();const o=R(),amp=(vert?w:h)*(.01+R()*.03),fr=1+R()*3,ph=R()*6;
      if(vert){const x0=x+o*w;for(let k=0;k<=24;k++){const yy=y+h*k/24,xx=x0+Math.sin(ph+k/24*fr*6.28)*amp;k?g.lineTo(xx,yy):g.moveTo(xx,yy)}}
      else{const y0=y+o*h;for(let k=0;k<=24;k++){const xx=x+w*k/24,yy=y0+Math.sin(ph+k/24*fr*6.28)*amp;k?g.lineTo(xx,yy):g.moveTo(xx,yy)}}g.stroke()}g.restore()}
  function tiles(g,W,H,R,col,nx,ny,grout,jt,gw,offRow){g.fillStyle=grout;g.fillRect(0,0,W,H);const tw=W/nx,th=H/ny;
    for(let j=0;j<ny;j++){const off=offRow&&(j%2)?tw/2:0;for(let i=0;i<nx;i++){const c=jit(col,R,jt);wrapRect(W,H,i*tw+off,j*th,tw,th,(X,Y)=>{g.fillStyle=c;g.fillRect(X+gw/2,Y+gw/2,tw-gw,th-gw)})}}return{tw,th}}
  function planks(g,W,H,R,col,rows,perRow,jt,gap,vert){const n=rows;const bw=(vert?W:H)/n;g.fillStyle=sh(col,-.45);g.fillRect(0,0,W,H);
    for(let r=0;r<n;r++){const off=R();for(let k=0;k<perRow;k++){const c=jit(col,R,jt);const L=(vert?H:W)/perRow;const p0=((off+k/perRow)%1)*(vert?H:W);
      const draw=(X,Y,w,h)=>{g.fillStyle=c;g.fillRect(X,Y,w,h);grain(g,X,Y,w,h,R,sh(c,-.35),Math.ceil((vert?w:h)/6)+4,vert,.18)};
      if(vert)wrapRect(W,H,r*bw,p0,bw-gap,L-gap,(X,Y)=>draw(X,Y,bw-gap,L-gap));else wrapRect(W,H,p0,r*bw,L-gap,bw-gap,(X,Y)=>draw(X,Y,L-gap,bw-gap))}}}
  const T={
    flat:{size:[1,1],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H)}},
    frame:{size:[.6,.6],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);const gr=g.createLinearGradient(0,0,W,0);gr.addColorStop(0,'rgba(255,255,255,.12)');gr.addColorStop(.5,'rgba(0,0,0,.05)');gr.addColorStop(1,'rgba(255,255,255,.1)');g.fillStyle=gr;g.fillRect(0,0,W,H)}},
    stucco:{size:[1.5,1.5],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);blot(g,W,H,R,16,.022,W*.1,W*.3);speck(g,W,H,R,W*H/14,.07,1,W/400+1);speck(g,W,H,R,W*H/60,.12,1,W/250+1)}},
    paint:{size:[1,1],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);blot(g,W,H,R,10,.02,W*.1,W*.3);speck(g,W,H,R,W*H/160,.05,1,1)}},
    wallpaper:{size:[.53,.53],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);for(let i=0;i<8;i+=2){g.fillStyle=sh(c,-.035);g.fillRect(i*W/8,0,W/8,H)}
      g.fillStyle=sh(c,-.12);for(let i=0;i<4;i++)for(let j=0;j<4;j++){const x=(i+.5)*W/4,y=(j+.5)*H/4,s=W/40;g.beginPath();g.moveTo(x,y-s);g.lineTo(x+s,y);g.lineTo(x,y+s);g.lineTo(x-s,y);g.fill()}speck(g,W,H,R,W*H/200,.04,1,1)}},
    brick:{size:[1.2,.648],draw(g,W,H,R,c,mortar='#C4BDB1'){g.fillStyle=mortar;g.fillRect(0,0,W,H);speck(g,W,H,R,W*H/30,.12,1,2);const bw=W/4,bh=H/8,jx=Math.max(2,W*.009),jy=Math.max(2,H*.018);
      for(let r=0;r<8;r++){const off=(r%2)*bw/2;for(let k=0;k<4;k++){const cc=jit(c,R,.13);wrapRect(W,H,k*bw+off,r*bh,bw,bh,(X,Y)=>{g.fillStyle=cc;g.fillRect(X+jx/2,Y+jy/2,bw-jx,bh-jy);g.fillStyle='rgba(255,255,255,.12)';g.fillRect(X+jx/2,Y+jy/2,bw-jx,Math.max(1,bh*.08));g.fillStyle='rgba(0,0,0,.18)';g.fillRect(X+jx/2,Y+bh-jy/2-Math.max(1,bh*.1),bw-jx,Math.max(1,bh*.1))})}}
      speck(g,W,H,R,W*H/18,.1,1,2)}},
    brickRaw:{size:[1.2,.648],draw(g,W,H,R,c){T.brick.draw(g,W,H,R,c,'#9D978E')}},
    block:{size:[1.2,.6],draw(g,W,H,R,c){g.fillStyle=sh(c,-.22);g.fillRect(0,0,W,H);const bw=W/3,bh=H/3,j=Math.max(2,W*.008);
      for(let r=0;r<3;r++){const off=(r%2)*bw/2;for(let k=0;k<3;k++){const cc=jit(c,R,.05);wrapRect(W,H,k*bw+off,r*bh,bw,bh,(X,Y)=>{g.fillStyle=cc;g.fillRect(X+j/2,Y+j/2,bw-j,bh-j)})}}speck(g,W,H,R,W*H/8,.18,1,2)}},
    concrete:{size:[2.4,1.2],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);blot(g,W,H,R,46,.06,W*.03,W*.14);speck(g,W,H,R,W*H/20,.1,1,2);
      g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=Math.max(1,W/400);g.beginPath();for(const x of [0,W/2]){g.moveTo(x+.5,0);g.lineTo(x+.5,H)}for(const y of [0,H/2]){g.moveTo(0,y+.5);g.lineTo(W,y+.5)}g.stroke();
      g.fillStyle='rgba(0,0,0,.35)';for(const px of [.125,.375,.625,.875])for(const py of [.25,.75]){g.beginPath();g.arc(px*W,py*H,W*.006,0,7);g.fill()}}},
    siding:{size:[1,1],draw(g,W,H,R,c){const n=5,bh=H/n;for(let i=0;i<n;i++){const y=i*bh;g.fillStyle=jit(c,R,.02);g.fillRect(0,y,W,bh);grain(g,0,y,W,bh,R,sh(c,-.2),14,false,.12);
      const gr=g.createLinearGradient(0,y+bh*.78,0,y+bh);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.28)');g.fillStyle=gr;g.fillRect(0,y+bh*.78,W,bh*.22);g.fillStyle='rgba(255,255,255,.2)';g.fillRect(0,y,W,Math.max(1,bh*.03))}}},
    tinglado:{size:[1,1.05],draw(g,W,H,R,c){const n=7,bh=H/n;for(let i=0;i<n;i++){const y=i*bh,cc=jit(c,R,.12);g.fillStyle=cc;g.fillRect(0,y,W,bh);grain(g,0,y,W,bh,R,sh(cc,-.4),22,false,.22);
      const gr=g.createLinearGradient(0,y+bh*.72,0,y+bh);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.4)');g.fillStyle=gr;g.fillRect(0,y+bh*.72,W,bh*.28)}}},
    stone:{size:[1.2,1.2],draw(g,W,H,R,c){g.fillStyle='#7E776C';g.fillRect(0,0,W,H);speck(g,W,H,R,W*H/20,.15,1,2);const pal=['#A59B8C','#8F877A','#B7AD9C','#9B8F7B','#7F786E','#AFA392'];
      let hs=[],sum=0;while(sum<1){const v=.12+R()*.1;hs.push(v);sum+=v}hs=hs.map(v=>v/sum*H);let y=0;const j=Math.max(2,W*.008);
      for(const rh of hs){let ws=[],s2=0;while(s2<1){const v=.16+R()*.22;ws.push(v);s2+=v}ws=ws.map(v=>v/s2*W);let x=R()*W;
        for(const sw of ws){const cc=jit(pal[Math.floor(R()*pal.length)],R,.05);wrapRect(W,H,x,y,sw,rh,(X,Y)=>{g.fillStyle=cc;const r=Math.min(sw,rh)*.18;g.beginPath();g.roundRect?g.roundRect(X+j/2,Y+j/2,sw-j,rh-j,r):g.rect(X+j/2,Y+j/2,sw-j,rh-j);g.fill();
          g.fillStyle='rgba(255,255,255,.08)';g.fillRect(X+j,Y+j,sw-2*j,Math.max(1,rh*.1))});x+=sw}y+=rh}speck(g,W,H,R,W*H/14,.14,1,2)}},
    studs:{size:[1.2,1.2],draw(g,W,H,R,c){g.fillStyle='#E7CB6B';g.fillRect(0,0,W,H);for(let i=0;i<W*H/40;i++){g.fillStyle=`rgba(${R()<.5?'255,240,180':'170,130,40'},${.25*R()})`;g.beginPath();g.arc(R()*W,R()*H,1+R()*W/120,0,7);g.fill()}
      const sw=W*.045/1.2;for(let k=0;k<3;k++){const x=k*W/3;g.fillStyle=jit(c,R,.06);g.fillRect(x,0,sw,H);grain(g,x,0,sw,H,R,sh(c,-.3),5,true,.3)}}},
    steelStuds:{size:[1.2,1.2],draw(g,W,H,R,c){g.fillStyle='#E6D88E';g.fillRect(0,0,W,H);for(let i=0;i<W*H/40;i++){g.fillStyle=`rgba(${R()<.5?'255,250,200':'160,140,60'},${.25*R()})`;g.beginPath();g.arc(R()*W,R()*H,1+R()*W/120,0,7);g.fill()}
      const sw=W*.04/1.2;for(let k=0;k<3;k++){const x=k*W/3;const gr=g.createLinearGradient(x,0,x+sw,0);gr.addColorStop(0,sh(c,.3));gr.addColorStop(.5,c);gr.addColorStop(1,sh(c,-.3));g.fillStyle=gr;g.fillRect(x,0,sw,H)}}},
    adobe:{size:[1.2,.9],draw(g,W,H,R,c){tiles(g,W,H,R,c,2,6,sh(c,-.2),.08,Math.max(3,W*.014),true);blot(g,W,H,R,30,.08,W*.03,W*.1);speck(g,W,H,R,W*H/10,.2,1,2)}},
    porcelanato:{size:[1.2,1.2],draw(g,W,H,R,c){const {tw,th}=tiles(g,W,H,R,c,2,2,sh(c,-.22),.025,Math.max(1.5,W*.003));
      for(let i=0;i<2;i++)for(let j=0;j<2;j++){g.save();g.beginPath();g.rect(i*tw+1,j*th+1,tw-2,th-2);g.clip();g.strokeStyle='rgba(120,115,105,.09)';g.lineWidth=Math.max(1,W/400);
        for(let k=0;k<3;k++){g.beginPath();g.moveTo(i*tw+R()*tw,j*th);g.bezierCurveTo(i*tw+R()*tw,j*th+th*.3,i*tw+R()*tw,j*th+th*.7,i*tw+R()*tw,j*th+th);g.stroke()}
        const gr=g.createLinearGradient(i*tw,j*th,i*tw+tw,j*th+th);gr.addColorStop(0,'rgba(255,255,255,.1)');gr.addColorStop(.5,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(0,0,0,.03)');g.fillStyle=gr;g.fillRect(i*tw,j*th,tw,th);g.restore()}}},
    ceramica:{size:[1.32,1.32],draw(g,W,H,R,c){tiles(g,W,H,R,c,4,4,sh(c,-.28),.05,Math.max(2,W*.005));speck(g,W,H,R,W*H/40,.08,1,2)}},
    wallTile:{size:[.6,.6],draw(g,W,H,R,c){const {tw,th}=tiles(g,W,H,R,c,3,2,'#C9C5BC',.02,Math.max(1.5,W*.006));for(let i=0;i<3;i++)for(let j=0;j<2;j++){const gr=g.createLinearGradient(i*tw,j*th,i*tw+tw,j*th+th);gr.addColorStop(0,'rgba(255,255,255,.22)');gr.addColorStop(.6,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(i*tw+2,j*th+2,tw-4,th-4)}}},
    flotante:{size:[1.2,1.14],draw(g,W,H,R,c){planks(g,W,H,R,c,6,2,.1,Math.max(1,W*.002),false)}},
    parquet:{size:[.84,.84],draw(g,W,H,R,c){planks(g,W,H,R,c,12,2,.16,Math.max(1,W*.002),false)}},
    vinilico:{size:[.9,1.08],draw(g,W,H,R,c){planks(g,W,H,R,c,6,1,.06,Math.max(1,W*.002),false)}},
    woodV:{size:[.96,1],draw(g,W,H,R,c){planks(g,W,H,R,c,8,1,.08,Math.max(1,W*.003),true)}},
    panelWood:{size:[1.22,2.44],draw(g,W,H,R,c){const cc=jit(c,R,.06);g.fillStyle=cc;g.fillRect(0,0,W,H);grain(g,0,0,W,H,R,sh(cc,-.35),60,true,.14);g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,0,Math.max(2,W*.008),H);g.fillRect(0,0,W,Math.max(2,H*.004))}},
    woodGrain:{size:[.5,.5],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);grain(g,0,0,W,H,R,sh(c,-.4),40,true,.2)}},
    fenceWood:{size:[1,1],draw(g,W,H,R,c){g.fillStyle='rgba(0,0,0,0)';g.clearRect(0,0,W,H);const n=10,bw=W/n,gp=bw*.12;for(let i=0;i<n;i++){const cc=jit(c,R,.1);g.fillStyle=cc;g.fillRect(i*bw,0,bw-gp,H);grain(g,i*bw,0,bw-gp,H,R,sh(cc,-.4),6,true,.25)}},alpha:1},
    polished:{size:[2,2],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);blot(g,W,H,R,60,.07,W*.04,W*.18);speck(g,W,H,R,W*H/50,.12,1,2);for(let i=0;i<W*H/600;i++){g.fillStyle=`rgba(${R()<.5?'60,58,54':'230,228,220'},.35)`;g.beginPath();g.arc(R()*W,R()*H,1+R()*W/300,0,7);g.fill()}}},
    carpet:{size:[.5,.5],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);speck(g,W,H,R,W*H/2,.14,1,1)}},
    teja:{size:[.84,1.05],draw(g,W,H,R,c){const cw=W/4,rh=H/3;for(let r=0;r<3;r++)for(let k=0;k<4;k++){const x=k*cw,y=r*rh,cc=jit(c,R,.1);const gr=g.createLinearGradient(x,0,x+cw,0);
      gr.addColorStop(0,sh(cc,-.42));gr.addColorStop(.25,sh(cc,-.05));gr.addColorStop(.5,sh(cc,.14));gr.addColorStop(.75,sh(cc,-.05));gr.addColorStop(1,sh(cc,-.42));g.fillStyle=gr;g.fillRect(x,y,cw,rh);
      const g2=g.createLinearGradient(0,y+rh*.8,0,y+rh);g2.addColorStop(0,'rgba(0,0,0,0)');g2.addColorStop(1,'rgba(0,0,0,.42)');g.fillStyle=g2;g.fillRect(x,y+rh*.8,cw,rh*.2);g.fillStyle='rgba(255,255,255,.1)';g.fillRect(x,y,cw,Math.max(1,rh*.03))}
      speck(g,W,H,R,W*H/22,.1,1,2)}},
    shingle:{size:[1,.84],draw(g,W,H,R,c){const rows=6,rh=H/rows,tw=W/3;g.fillStyle=sh(c,-.5);g.fillRect(0,0,W,H);for(let r=0;r<rows;r++){const off=(r%2)*tw/2;for(let k=0;k<3;k++){const cc=jit(c,R,.1);wrapRect(W,H,k*tw+off,r*rh,tw,rh,(X,Y)=>{g.fillStyle=cc;g.fillRect(X+Math.max(1.5,W*.004),Y,tw-Math.max(3,W*.008),rh-Math.max(2,H*.006));
      const gr=g.createLinearGradient(0,Y+rh*.7,0,Y+rh);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.3)');g.fillStyle=gr;g.fillRect(X,Y+rh*.7,tw,rh*.3)})}}speck(g,W,H,R,W*H/4,.2,1,2)}},
    zinc:{size:[.76,1],draw(g,W,H,R,c){const n=10;for(let x=0;x<W;x++){const s=Math.sin(x/W*n*Math.PI*2);g.fillStyle=sh(c,s>0?s*.28:s*.3);g.fillRect(x,0,1,H)}
      for(let i=0;i<24;i++){g.fillStyle=`rgba(${R()<.6?'90,80,60':'255,255,255'},${.05*R()})`;g.fillRect(R()*W,0,1+R()*W/80,H)}speck(g,W,H,R,W*H/80,.06,1,1)}},
    steelRoof:{size:[1,1],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);const p=W/4,rw=p*.24;for(let i=0;i<4;i++){const xc=(i+.5)*p;g.fillStyle=sh(c,.2);g.fillRect(xc-rw/2,0,rw/2,H);g.fillStyle=sh(c,-.28);g.fillRect(xc,0,rw/2,H);
      g.fillStyle=sh(c,-.08);g.fillRect(xc-p/3,0,Math.max(1,W/300),H);g.fillRect(xc+p/3,0,Math.max(1,W/300),H)}speck(g,W,H,R,W*H/120,.05,1,1)}},
    membrane:{size:[1.5,1.5],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);speck(g,W,H,R,W*H/4,.25,1,2);g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=Math.max(1,W/300);g.beginPath();g.moveTo(0,.5);g.lineTo(W,.5);g.stroke()}},
    grass:{size:[2,2],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);blot(g,W,H,R,40,.1,W*.05,W*.2);const pal=['#4F7030','#678A3C','#7D9B4A','#3F5F27','#8AA357','#5B7B33'];const k=W/512;
      for(let i=0;i<W*H/5;i++){const x=R()*W,y=R()*H,l=(3+R()*7)*k,a=-Math.PI/2+(R()-.5)*1.1;g.strokeStyle=pal[Math.floor(R()*pal.length)];g.globalAlpha=.5+R()*.4;g.lineWidth=Math.max(.7,k*(.8+R()*.8));g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}g.globalAlpha=1}},
    gravel:{size:[1,1],draw(g,W,H,R,c){g.fillStyle=sh(c,-.25);g.fillRect(0,0,W,H);const pal=['#B5ADA0','#8F887D','#A69C8C','#CFC7B8','#7D766C','#BDB2A0'];const k=W/512;
      for(let i=0;i<W*H/14;i++){const x=R()*W,y=R()*H,rx=(1.5+R()*3)*k,ry=rx*(.6+R()*.4);g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x+k,y+k,rx,ry,R()*3,0,7);g.fill();g.fillStyle=pal[Math.floor(R()*pal.length)];g.beginPath();g.ellipse(x,y,rx,ry,R()*3,0,7);g.fill()}}},
    dirt:{size:[2,2],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);blot(g,W,H,R,70,.1,W*.03,W*.15);speck(g,W,H,R,W*H/6,.2,1,2)}},
    pavers:{size:[2,2],draw(g,W,H,R,c){tiles(g,W,H,R,c,5,5,sh(c,-.3),.06,Math.max(2,W*.006),false);speck(g,W,H,R,W*H/10,.12,1,2)}},
    sidewalk:{size:[2,2],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);blot(g,W,H,R,40,.06,W*.04,W*.15);speck(g,W,H,R,W*H/12,.12,1,2);g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=Math.max(1.5,W/250);g.beginPath();for(const v of [0,W/2]){g.moveTo(v+.5,0);g.lineTo(v+.5,H);g.moveTo(0,v+.5);g.lineTo(W,v+.5)}g.stroke()}},
    asphalt:{size:[3,3],draw(g,W,H,R,c){g.fillStyle=c;g.fillRect(0,0,W,H);blot(g,W,H,R,40,.06,W*.03,W*.12);speck(g,W,H,R,W*H/5,.22,1,2)}},
    mesh:{size:[.1,.1],alpha:1,draw(g,W,H,R,c){g.clearRect(0,0,W,H);g.strokeStyle=c;g.lineWidth=W*.07;g.beginPath();g.moveTo(-W*.1,-H*.1);g.lineTo(W*1.1,H*1.1);g.moveTo(-W*.1,H*1.1);g.lineTo(W*1.1,-H*.1);g.stroke()}},
    bars:{size:[.12,1],alpha:1,draw(g,W,H,R,c){g.clearRect(0,0,W,H);g.fillStyle=c;g.fillRect(W*.41,0,W*.18,H)}},
    none:{size:[1,1],draw(g,W,H){g.fillStyle='#d9dedb';g.fillRect(0,0,W,H)}}
  };
  function get(tex,col,R=512){const t=T[tex]||T.flat;const key=tex+'|'+col+'|'+R;if(cache.has(key))return cache.get(key);
    const cv=document.createElement('canvas');cv.width=cv.height=R;const g=cv.getContext('2d');let seed=0;for(const ch of key)seed=(seed*31+ch.charCodeAt(0))|0;
    t.draw(g,R,R,rng(seed),col||'#999999');const o={canvas:cv,size:t.size,alpha:!!t.alpha};cache.set(key,o);return o}
  /* Miniatura 4:3 mostrando unos "show" metros de material */
  function thumb(tex,col,show=1.4,px=168){const key=tex+'|'+col+'|'+show;if(thumbs.has(key))return thumbs.get(key);let url='';
    try{const t=get(tex,col,256);const cv=document.createElement('canvas');cv.width=px;cv.height=Math.round(px*.75);const g=cv.getContext('2d');
      g.fillStyle=t.alpha?'#DCE6EA':'#ffffff';g.fillRect(0,0,cv.width,cv.height);
      if(tex==='none'){g.strokeStyle='#9aa3a0';g.lineWidth=2;g.setLineDash([6,5]);g.strokeRect(14,14,cv.width-28,cv.height-28)}
      else{const ppm=px/show,tw=t.size[0]*ppm,th=t.size[1]*ppm;for(let x=0;x<cv.width;x+=tw)for(let y=0;y<cv.height;y+=th)g.drawImage(t.canvas,x,y,tw+.5,th+.5);
        const gr=g.createLinearGradient(0,0,cv.width,cv.height);gr.addColorStop(0,'rgba(255,255,255,.10)');gr.addColorStop(1,'rgba(0,0,0,.10)');g.fillStyle=gr;g.fillRect(0,0,cv.width,cv.height)}
      url=cv.toDataURL('image/jpeg',.86)}catch(e){url=''}
    thumbs.set(key,url);return url}
  return{get,thumb,shade:sh}
})();

/* Color con que se dibuja una opción (fijo o tomado de la paleta elegida) */
function matColor(cat,k,M){const C=MATS[cat],o=C?.opts[k];if(!o)return'#999999';return o.useColor?(M[o.colorFrom||C.color]||'#cccccc'):(o.col||'#cccccc')}
function colorName(list,h){const f=list.find(x=>x[1].toLowerCase()===String(h||'').toLowerCase());return f?f[0]:String(h||'')}
