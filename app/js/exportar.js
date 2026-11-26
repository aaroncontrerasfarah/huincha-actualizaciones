/* Huincha — exportaciones Pro: PDF A3 a escala real (todas las láminas), DXF para AutoCAD y cubicación en Excel (.xlsx).
   Las tres piden licencia Pro (licencia.js). Las bibliotecas del PDF se cargan solo al exportar. */
"use strict";
const Exportar=(()=>{
  const cargar=src=>new Promise((ok,mal)=>{if(document.querySelector(`script[src="${src}"]`))return ok();const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>mal(new Error('No se pudo cargar '+src));document.head.appendChild(s)});

  /* ---------- PDF: cada lámina es un A3 apaisado de 420 × 297 mm, igual que el SVG, así la escala se conserva.
     Se imprime cada lámina a 200 ppp (como un plotter) para que achurados, textos y patrones salgan idénticos a la pantalla. ---------- */
  const PPMM=200/25.4;
  function rasterizar(svg){return new Promise((ok,mal)=>{const u=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),im=new Image();
    im.onload=()=>{try{const cv=document.createElement('canvas');cv.width=Math.round(420*PPMM);cv.height=Math.round(297*PPMM);const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(im,0,0,cv.width,cv.height);
        URL.revokeObjectURL(u);ok(cv.toDataURL('image/png'))}catch(e){mal(e)}};
    im.onerror=()=>{URL.revokeObjectURL(u);mal(new Error('No se pudo dibujar la lámina'))};im.src=u})}
  async function pdf(){if(!Lic.exigir('El PDF a escala'))return;toast('Armando el PDF de las láminas…');
    await cargar('vendor/pdf/jspdf.umd.min.js');
    const doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a3',compress:true});
    for(let i=0;i<SHEETS.length;i++){if(i)doc.addPage('a3','landscape');doc.addImage(await rasterizar(sheetSVG(i)),'PNG',0,0,420,297,undefined,'FAST')}
    doc.setProperties({title:(P.meta.nombre||'Planos')+' · Huincha',creator:'Huincha'});
    await saveFile(`${slug()}-planos-A3.pdf`,doc.output('blob'),'application/pdf')}

  /* ---------- DXF (R12, metros): deslindes, muros, vanos, recintos, construcciones y cubierta ---------- */
  function dxf(){if(!Lic.exigir('La exportación DXF'))return;const c=P.casa,G=geom(),ox=+c.retiroIzq||0,oy=+c.retiroFrontal||0,out=[];
    const n=v=>(Math.round(v*1000)/1000).toString();
    const L=(lay,x1,y1,x2,y2)=>out.push('0','LINE','8',lay,'10',n(x1),'20',n(y1),'30','0','11',n(x2),'21',n(y2),'31','0');
    const T=(lay,x,y,h,t)=>out.push('0','TEXT','8',lay,'10',n(x),'20',n(y),'30','0','40',n(h),'1',String(t).replace(/[\r\n]/g,' '),'72','1','11',n(x),'21',n(y),'31','0');
    const C=(lay,x,y,r)=>out.push('0','CIRCLE','8',lay,'10',n(x),'20',n(y),'30','0','40',n(r));
    const R=(lay,x0,y0,x1,y1)=>{L(lay,x0,y0,x1,y0);L(lay,x1,y0,x1,y1);L(lay,x1,y1,x0,y1);L(lay,x0,y1,x0,y0)};
    /* deslindes (sistema del terreno: x a lo largo del frente, y hacia el fondo) */
    const LP=lotPoly();if(LP)LP.forEach((p,i)=>{const q=LP[(i+1)%LP.length];L('DESLINDES',p[0],p[1],q[0],q[1])});
    if(P.lote.calle)T('TEXTOS',(LP?LP.reduce((t,p)=>t+p[0],0)/LP.length:c.ancho/2),-3,.6,P.lote.calle.toUpperCase());
    /* muros: dos caras por tramo, cortadas en los vanos */
    for(const l of G.lines){const h=l.t/2;for(const [p,q] of l.iv){const ops=l.ops.filter(o=>o.e>p&&o.s<q).sort((a,b)=>a.s-b.s);let a=p;const tramos=[];
        for(const o of ops){if(o.s>a)tramos.push([a,o.s]);a=Math.max(a,o.e);
          const [s1,e1]=[Math.max(p,o.s),Math.min(q,o.e)];
          if(l.ax==='h'){L(o.isWin?'VENTANAS':'PUERTAS',ox+s1,oy+l.c,ox+e1,oy+l.c);L('MUROS',ox+s1,oy+l.c-h,ox+s1,oy+l.c+h);L('MUROS',ox+e1,oy+l.c-h,ox+e1,oy+l.c+h)}
          else{L(o.isWin?'VENTANAS':'PUERTAS',ox+l.c,oy+s1,ox+l.c,oy+e1);L('MUROS',ox+l.c-h,oy+s1,ox+l.c+h,oy+s1);L('MUROS',ox+l.c-h,oy+e1,ox+l.c+h,oy+e1)}}
        if(a<q)tramos.push([a,q]);
        for(const [u,v] of tramos){if(l.ax==='h'){L('MUROS',ox+u,oy+l.c-h,ox+v,oy+l.c-h);L('MUROS',ox+u,oy+l.c+h,ox+v,oy+l.c+h)}else{L('MUROS',ox+l.c-h,oy+u,ox+l.c-h,oy+v);L('MUROS',ox+l.c+h,oy+u,ox+l.c+h,oy+v)}}}}
    /* recintos: nombre y superficie al centro */
    for(const r of P.recintos.filter(valid)){const cx=ox+r.x+r.ancho/2,cy=oy+r.y+r.largo/2;T('RECINTOS',cx,cy+.15,.25,r.nombre.toUpperCase());T('RECINTOS',cx,cy-.25,.18,fmt(r.ancho*r.largo)+' m2')}
    /* cubierta: alero y cumbrera */
    const a=+c.alero||0;R('CUBIERTA',ox-a,oy-a,ox+c.ancho+a,oy+c.largo+a);
    if(c.techo==='dos-aguas'){if(c.cumbrera==='paralela')L('CUBIERTA',ox-a,oy+c.largo/2,ox+c.ancho+a,oy+c.largo/2);else L('CUBIERTA',ox+c.ancho/2,oy-a,ox+c.ancho/2,oy+c.largo+a)}
    else if(c.techo==='cuatro-aguas'){const W=c.ancho,Lg=c.largo,sp=Math.min(W,Lg)/2,r1=W>=Lg?[sp,Lg/2]:[W/2,sp],r2v=W>=Lg?[W-sp,Lg/2]:[W/2,Lg-sp];L('CUBIERTA',ox+r1[0],oy+r1[1],ox+r2v[0],oy+r2v[1]);
      for(const [x,y,rp] of [[-a,-a,r1],[-a,Lg+a,r1],[W+a,-a,r2v],[W+a,Lg+a,r2v]])L('CUBIERTA',ox+x,oy+y,ox+rp[0],oy+rp[1])}
    /* volúmenes especiales y construcciones del terreno */
    if(typeof vols==='function')for(const g of vols()){if(g.circ)C('VOLUMENES',ox+g.cx,oy+g.cy,g.r);else R('VOLUMENES',ox+g.x0,oy+g.y0,ox+g.x1,oy+g.y1);T('VOLUMENES',ox+g.cx,oy+g.cy,.25,(g.v.nombre||'VOLUMEN').toUpperCase())}
    for(const e of P.elementos||[]){const T2=eltOf(e),lay=e.proy?'PROYECTADO':'ELEMENTOS';let pts;try{pts=elLote(e)}catch(x){continue}if(!pts||pts.length<2)continue;
      if(T2.k==='linea'){L(lay,pts[0][0],pts[0][1],pts[1][0],pts[1][1]);continue}
      if(T2.k==='punto'){R(lay,pts[0][0],pts[0][1],pts[1][0],pts[1][1])}else pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length];L(lay,p[0],p[1],q[0],q[1])});
      const cx=pts.reduce((t,p)=>t+p[0],0)/pts.length,cy=pts.reduce((t,p)=>t+p[1],0)/pts.length;T(lay,cx,cy,.2,(e.nombre||T2.n||e.t||'').toUpperCase())}
    const capas=['DESLINDES','MUROS','PUERTAS','VENTANAS','RECINTOS','CUBIERTA','VOLUMENES','ELEMENTOS','PROYECTADO','TEXTOS'],colores=[1,7,3,5,2,6,4,8,30,7];
    const head=['0','SECTION','2','HEADER','9','$ACADVER','1','AC1009','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','TABLES','0','TABLE','2','LAYER','70',String(capas.length),
      ...capas.flatMap((k,i)=>['0','LAYER','2',k,'70','0','62',String(colores[i]),'6','CONTINUOUS']),'0','ENDTAB','0','ENDSEC','0','SECTION','2','ENTITIES'];
    const txt=[...head,...out,'0','ENDSEC','0','EOF'].join('\r\n')+'\r\n';
    return saveFile(`${slug()}-planta.dxf`,txt,'application/dxf')}

  /* ---------- Excel (.xlsx) sin bibliotecas: zip «store» con el XML mínimo de una planilla ---------- */
  const crcT=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[i]=c>>>0}return t})();
  const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
  function zip(files){const enc=new TextEncoder(),parts=[],cen=[];let off=0;
    for(const [name,str] of files){const nb=enc.encode(name),db=enc.encode(str),crc=crc32(db),h=new DataView(new ArrayBuffer(30));
      h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint32(14,crc,true);h.setUint32(18,db.length,true);h.setUint32(22,db.length,true);h.setUint16(26,nb.length,true);
      parts.push(new Uint8Array(h.buffer),nb,db);
      const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint32(16,crc,true);c.setUint32(20,db.length,true);c.setUint32(24,db.length,true);c.setUint16(28,nb.length,true);c.setUint32(42,off,true);
      cen.push(new Uint8Array(c.buffer),nb);off+=30+nb.length+db.length}
    const cl=cen.reduce((t,b)=>t+b.length,0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cl,true);e.setUint32(16,off,true);
    return new Blob([...parts,...cen,new Uint8Array(e.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
  const xe=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
  const col=i=>{let s='';i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
  function hoja(rows){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="52" customWidth="1"/><col min="2" max="6" width="14" customWidth="1"/></cols><sheetData>${
    rows.map((r,i)=>`<row r="${i+1}">${r.map((v,j)=>{const ref=col(j)+(i+1),bold=i===0||r._t?' s="1"':'';
      if(typeof v==='number'&&isFinite(v))return`<c r="${ref}"${bold}><v>${Math.round(v*1000)/1000}</v></c>`;if(typeof v==='string'&&v.startsWith('='))return`<c r="${ref}"><f>${xe(v.slice(1))}</f></c>`;
      return`<c r="${ref}" t="inlineStr"${bold}><is><t>${xe(v)}</t></is></c>`}).join('')}</row>`).join('')}</sheetData></worksheet>`}
  function xlsxBlob(hojas){const n=hojas.length;return zip([
    ['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((h,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas.map((h,i)=>`<sheet name="${xe(h.nombre).slice(0,31)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((h,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${n+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>'],
    ...hojas.map((h,i)=>[`xl/worksheets/sheet${i+1}.xml`,hoja(h.filas)])])}
  function excel(){if(!Lic.exigir('La cubicación en Excel'))return;
    const cub=[['Partida','Unidad','Cantidad','Precio unitario (CLP)','Total (CLP)']];
    const add=rows=>{for(const r of rows||[]){if(!Array.isArray(r)||r.length<3)continue;const i=cub.length+1;cub.push([String(r[0]),String(r[1]||''),+r[2]||0,'',`=C${i}*D${i}`])}};
    add(cubica());const nCub=cub.length;cub.push(['TOTAL','','','',`=SUM(E2:E${nCub})`]);cub[cub.length-1]._t=1;
    const sup=[['Superficie','m²'],['Terreno',+lotArea()||0],['Construida (casa)',(+P.casa.ancho||0)*(+P.casa.largo||0)*nPisos()+(typeof areaAlas==='function'?areaAlas():0)],['Útil (recintos)',P.recintos.filter(valid).reduce((a,r)=>a+r.ancho*r.largo,0)],
      ...P.recintos.filter(valid).map(r=>['  '+r.nombre,r.ancho*r.largo])];
    const van=[['Código','Tipo','Ancho (m)','Alto (m)','Antepecho (m)','Cantidad'],...(typeof vanosLista==='function'?vanosLista():[]).map(v=>[v.cod,v.tipo,v.ancho,v.alto,v.tipo==='Ventana'?v.ant:'',v.n])];
    const blob=xlsxBlob([{nombre:'Cubicación',filas:cub},{nombre:'Superficies',filas:sup},{nombre:'Puertas y ventanas',filas:van}]);
    return saveFile(`${slug()}-cubicacion.xlsx`,blob,blob.type)}
  return{pdf,dxf,excel,xlsxBlob,zip,crc32}})();
document.addEventListener('click',e=>{const b=e.target.closest('[data-exp]');if(!b)return;const k=b.dataset.exp;
  const run=k==='pdf'?Exportar.pdf:k==='dxf'?Exportar.dxf:Exportar.excel;Promise.resolve(run()).catch(err=>{console.error(err);toast('No se pudo exportar: '+(err?.message||err))})});
