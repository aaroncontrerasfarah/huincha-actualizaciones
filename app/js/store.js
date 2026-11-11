/* Huincha — almacenamiento de proyectos, fotos y videos.
   En el teléfono (app instalada) todo se guarda como archivos dentro de la carpeta privada de la app:
     files/huincha/proyectos/<id>/proyecto.json
     files/huincha/proyectos/<id>/media/<foto|video>
     files/huincha/proyectos/<id>/planos/<lámina exportada>
   En un navegador (para pruebas) se usa IndexedDB con la misma estructura. */
"use strict";
const Store = (() => {
  const C = window.Capacitor;
  const native = !!(C && C.isNativePlatform && C.isNativePlatform());
  const plug = n => native ? ((C.Plugins && C.Plugins[n]) || (C.registerPlugin && C.registerPlugin(n))) : null;
  const FS = plug('Filesystem'), SH = plug('Share');
  const DIR = 'DATA', ROOT = 'huincha/proyectos';
  let base = '', db = null;
  const mem = { proyectos: new Map(), blobs: new Map() };   // último recurso si no hay IndexedDB
  const urls = new Map();
  const pdir = id => `${ROOT}/${id}`;
  const key = (pid, name) => pid + '/' + name;

  function toB64(blob) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  }
  async function fromB64(b64, mime) { const r = await fetch('data:' + (mime || 'application/octet-stream') + ';base64,' + b64); return r.blob(); }

  /* ---------- IndexedDB ---------- */
  function openIDB() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('huincha', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('proyectos'); d.createObjectStore('blobs'); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  function idb(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode); const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req && 'result' in req ? req.result : undefined);
      t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  }

  async function init() {
    if (native) {
      const { uri } = await FS.getUri({ path: '', directory: DIR });
      base = uri.endsWith('/') ? uri : uri + '/';
      try { await FS.mkdir({ path: ROOT, directory: DIR, recursive: true }); } catch (e) { /* ya existe */ }
    } else {
      try { db = await openIDB(); } catch (e) { db = null; }
    }
  }

  async function list() {
    let arr = [];
    if (native) {
      let files = [];
      try { files = (await FS.readdir({ path: ROOT, directory: DIR })).files || []; } catch (e) { files = []; }
      for (const f of files) {
        const id = typeof f === 'string' ? f : f.name;
        try { const p = JSON.parse((await FS.readFile({ path: `${pdir(id)}/proyecto.json`, directory: DIR, encoding: 'utf8' })).data); arr.push(p); } catch (e) { /* carpeta sin proyecto */ }
      }
    } else if (db) {
      arr = await idb('proyectos', 'readonly', s => s.getAll());
    } else arr = [...mem.proyectos.values()];
    return arr.map(p => ({ id: p.id, nombre: p.meta?.nombre || '', direccion: p.meta?.direccion || '', actualizado: p.actualizado || 0, ejemplo: !!p.ejemplo }))
      .sort((a, b) => b.actualizado - a.actualizado);
  }

  async function load(id) {
    if (native) return JSON.parse((await FS.readFile({ path: `${pdir(id)}/proyecto.json`, directory: DIR, encoding: 'utf8' })).data);
    if (db) return idb('proyectos', 'readonly', s => s.get(id));
    return mem.proyectos.get(id);
  }

  async function save(p) {
    p.actualizado = Date.now();
    if (native) { await FS.writeFile({ path: `${pdir(p.id)}/proyecto.json`, directory: DIR, data: JSON.stringify(p), encoding: 'utf8', recursive: true }); return; }
    const copy = JSON.parse(JSON.stringify(p));
    if (db) await idb('proyectos', 'readwrite', s => s.put(copy, p.id)); else mem.proyectos.set(p.id, copy);
  }

  async function remove(id) {
    if (native) { try { await FS.rmdir({ path: pdir(id), directory: DIR, recursive: true }); } catch (e) { } }
    else if (db) {
      await idb('proyectos', 'readwrite', s => s.delete(id));
      const keys = await idb('blobs', 'readonly', s => s.getAllKeys());
      for (const k of keys.filter(k => String(k).startsWith(id + '/'))) await idb('blobs', 'readwrite', s => s.delete(k));
    } else { mem.proyectos.delete(id); for (const k of [...mem.blobs.keys()]) if (k.startsWith(id + '/')) mem.blobs.delete(k); }
    for (const [k, u] of [...urls]) if (k.startsWith(id + '/')) { if (u.startsWith('blob:')) URL.revokeObjectURL(u); urls.delete(k); }
  }

  /* Guarda un archivo (foto, video o lámina). Los archivos grandes se escriben por partes para no llenar la memoria. */
  async function putBlob(pid, name, blob, onp, sub = 'media') {
    const k = key(pid, sub === 'media' ? name : sub + '/' + name);
    if (native) {
      const path = `${pdir(pid)}/${sub}/${name}`;
      const CH = 3 * 1024 * 1024;               // múltiplo de 3 bytes
      if (!blob.size) await FS.writeFile({ path, directory: DIR, data: '', recursive: true });
      for (let off = 0; off < blob.size; off += CH) {
        const data = await toB64(blob.slice(off, off + CH));
        if (off === 0) await FS.writeFile({ path, directory: DIR, data, recursive: true });
        else await FS.appendFile({ path, directory: DIR, data });
        onp && onp(Math.min(1, (off + CH) / blob.size));
      }
      urls.set(k, C.convertFileSrc(base + path));
    } else {
      if (db) await idb('blobs', 'readwrite', s => s.put(blob, k)); else mem.blobs.set(k, blob);
      onp && onp(1);
      const old = urls.get(k); if (old && old.startsWith('blob:')) URL.revokeObjectURL(old);
      urls.set(k, URL.createObjectURL(blob));
    }
    return name;
  }

  async function delBlob(pid, name, sub = 'media') {
    const k = key(pid, sub === 'media' ? name : sub + '/' + name);
    if (native) { try { await FS.deleteFile({ path: `${pdir(pid)}/${sub}/${name}`, directory: DIR }); } catch (e) { } }
    else if (db) await idb('blobs', 'readwrite', s => s.delete(k)); else mem.blobs.delete(k);
    const u = urls.get(k); if (u && u.startsWith('blob:')) URL.revokeObjectURL(u); urls.delete(k);
  }

  /* Dirección para mostrar una foto o video guardado. */
  function urlSync(pid, name) {
    if (!name) return '';
    if (name.startsWith('data:')) return name;
    const k = key(pid, name);
    if (urls.has(k)) return urls.get(k);
    if (native) { const u = C.convertFileSrc(base + `${pdir(pid)}/media/${name}`); urls.set(k, u); return u; }
    return '';
  }
  async function preload(pid, names) {
    if (native) return;
    for (const n of names) {
      if (!n || n.startsWith('data:') || urls.has(key(pid, n))) continue;
      const b = db ? await idb('blobs', 'readonly', s => s.get(key(pid, n))) : mem.blobs.get(key(pid, n));
      if (b) urls.set(key(pid, n), URL.createObjectURL(b));
    }
  }
  async function readBase64(pid, name) {
    if (native) return (await FS.readFile({ path: `${pdir(pid)}/media/${name}`, directory: DIR })).data;
    const b = db ? await idb('blobs', 'readonly', s => s.get(key(pid, name))) : mem.blobs.get(key(pid, name));
    return b ? toB64(b) : null;
  }
  async function size(pid, name) {
    try {
      if (native) return (await FS.stat({ path: `${pdir(pid)}/media/${name}`, directory: DIR })).size || 0;
      const b = db ? await idb('blobs', 'readonly', s => s.get(key(pid, name))) : mem.blobs.get(key(pid, name));
      return b ? b.size : 0;
    } catch (e) { return 0; }
  }

  /* Guarda una lámina o respaldo en la carpeta del proyecto y abre el menú Compartir del teléfono. */
  async function exportFile(pid, name, data, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    if (native) {
      await putBlob(pid, name, blob, null, 'planos');
      const { uri } = await FS.getUri({ path: `${pdir(pid)}/planos/${name}`, directory: DIR });
      try { await SH.share({ title: name, files: [uri], dialogTitle: 'Compartir ' + name }); return 'shared'; }
      catch (e) { if (/cancel/i.test(String(e && (e.message || e)))) return 'saved'; throw e; }
    }
    return 'browser';
  }

  return { native, init, list, load, save, remove, putBlob, delBlob, urlSync, preload, readBase64, size, exportFile, toB64, fromB64 };
})();
