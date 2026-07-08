/* =====================================================
   FUNCIONES UTILITARIAS
   ===================================================== */

const pesos = n => '$' + n.toLocaleString('es-AR', {maximumFractionDigits:0});

function claseSemaforo(libres, capacidad){
  const p = libres / capacidad;
  if (p > 0.35) return 'verde';
  if (p > 0.12) return 'ambar';
  return 'rojo';
}

function distanciaKm(lat1, lng1, lat2, lng2){
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function textoDistancia(km){
  return km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1).replace('.', ',') + ' km';
}

function normalizar(t){
  return t.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatoCrono(inicio){
  const seg = Math.floor((Date.now() - inicio) / 1000);
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
  const dd = n => String(n).padStart(2, '0');
  return (h ? dd(h) + ':' : '') + dd(m) + ':' + dd(s);
}

function hablar(texto){
  try {
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-AR';
    speechSynthesis.speak(u);
  } catch (e){}
}

function mostrarToast(texto){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = texto;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 6000);
}
