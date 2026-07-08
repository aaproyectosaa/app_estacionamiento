/* =====================================================
   APLICACIÓN — MAPA
   ===================================================== */
const $sel = document.getElementById('municipio');
const $btnPark = document.getElementById('btnPark');
const $modal = document.getElementById('modal');
const $hoja = document.getElementById('hojaZona');
const $chipNum = document.getElementById('chipNum');

let mapa = null;
let capaZonas = null;
let capaLugares = null;
let lienzo = null;
let marcadorYo = null;
let marcadorAuto = null;
let municipioActual = null;
let timer = null;
let ubicacion = null;
let ubicacionEstado = 'pendiente';
let listaMunicipios = [];
let ultimosDatos = null;
let patenteGuardada = '';
let sesion = null;
let cronoTimer = null;
let zonaSeleccionada = null;
let fotoReporte = null;
let modoBusqueda = false;
let marcadorDestino = null;
let lineaRuta = null;
let zonaGanadora = null;

/* ---------- Mapa ---------- */
let capaCalles = null;
let capaSatelite = null;
let capaEtiquetas = null;
let vistaSatelite = false;

function iniciarMapa(){
  mapa = L.map('mapa', { zoomControl: true }).setView([-31.6333, -60.7000], 14);

  capaCalles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    subdomains: 'abcd',
    attribution: '© OpenStreetMap · © CARTO',
  }).addTo(mapa);

  let erroresCarto = 0;
  capaCalles.on('tileerror', () => {
    erroresCarto++;
    if (erroresCarto === 4){
      mapa.removeLayer(capaCalles);
      capaCalles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      });
      if (!vistaSatelite) capaCalles.addTo(mapa);
    }
  });

  capaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '© Esri · Maxar',
  });
  capaEtiquetas = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    subdomains: 'abcd',
    pane: 'shadowPane',
  });

  capaSatelite.on('tileerror', (() => {
    let errores = 0;
    return () => {
      errores++;
      if (errores === 4 && vistaSatelite) alternarVista();
    };
  })());
}

function alternarVista(){
  vistaSatelite = !vistaSatelite;
  const btn = document.getElementById('chipVista');
  if (vistaSatelite){
    mapa.removeLayer(capaCalles);
    capaSatelite.addTo(mapa);
    capaEtiquetas.addTo(mapa);
    btn.textContent = '🗺️ Calles';
  } else {
    mapa.removeLayer(capaSatelite);
    mapa.removeLayer(capaEtiquetas);
    capaCalles.addTo(mapa);
    btn.textContent = '🛰️ Satélite';
  }
}

function completarMapa(){
  capaZonas = L.layerGroup().addTo(mapa);
  lienzo = L.canvas({ padding: 0.4 });
  capaLugares = L.layerGroup().addTo(mapa);
  mapa.on('click', e => {
    if (modoBusqueda){
      destinoElegido(e.latlng.lat, e.latlng.lng);
    } else {
      cerrarHoja();
    }
  });
}

function pintarZonas(datos){
  capaZonas.clearLayers();
  capaLugares.clearLayers();

  datos.zonas.forEach(z => {
    const clase = claseSemaforo(z.libres, z.capacidad);
    const ganadora = zonaGanadora === z.nombre ? ' ganadora' : '';

    capaLugares.addLayer(
      L.circle([z.lat, z.lng], {
        radius: 350, color: '#0B4EA2', weight: 1.5, opacity: .35,
        fillColor: '#0B4EA2', fillOpacity: .06, interactive: false,
      })
    );

    const icono = L.divIcon({
      className: '',
      html: `<div class="marcador-zona ${clase}${ganadora}">
               <div class="globo"><span class="n">${z.libres}</span><span class="l">libres</span></div>
               <div class="pico"></div>
             </div>`,
      iconSize: [60, 66],
      iconAnchor: [30, 66],
    });
    const m = L.marker([z.lat, z.lng], { icon: icono, keyboard: true, title: z.nombre + ' — ' + z.libres + ' libres' });
    m.on('click', e => {
      L.DomEvent.stopPropagation(e);
      abrirHoja(z);
    });
    capaZonas.addLayer(m);
  });
}

function pintarAutoEstacionado(){
  if (marcadorAuto){ mapa.removeLayer(marcadorAuto); marcadorAuto = null; }
  if (!sesion || !sesion.lat) return;
  const icono = L.divIcon({
    className:'', html:'<div class="marcador-auto">🚗</div>',
    iconSize:[36,36], iconAnchor:[18,30],
  });
  marcadorAuto = L.marker([sesion.lat, sesion.lng], { icon: icono, title: 'Tu auto' }).addTo(mapa);
}

/* ---------- Hoja de zona ---------- */
function franjaCuadra(z){
  if (!z.plazas) return '';
  const muestra = z.plazas.slice(0, 80);
  return `
    <div class="cuadra-titulo">Así está la cuadra ahora</div>
    <div class="cuadra-vista">
      ${muestra.map(p => !p.ocupado
        ? '<div class="plaza libre"></div>'
        : '<div class="plaza ocupada">🚗</div>').join('')}
    </div>`;
}

function abrirHoja(z){
  zonaSeleccionada = z;
  const clase = claseSemaforo(z.libres, z.capacidad);
  const dist = ubicacion ? distanciaKm(ubicacion.lat, ubicacion.lng, z.lat, z.lng) : null;
  $hoja.style.display = 'flex';
  $hoja.innerHTML = `
    <div class="tarjeta ${clase}">
      <div class="fila-titulo">
        <div>
          <h3>${z.nombre}</h3>
          <div class="ref">${z.ref} · ${z.capacidad} lugares · <strong style="color:var(--azul)">${pesos(z.tarifa)}/h ahora</strong> <span style="font-size:11px">⚡ tarifa inteligente</span></div>
          ${dist !== null ? `<span class="dist">a ${textoDistancia(dist)} de vos</span>` : ''}
        </div>
        <div style="display:flex;align-items:flex-start">
          <div class="cifra">${z.libres}<small>libres</small></div>
          <button class="cerrar" onclick="cerrarHoja()" aria-label="Cerrar">×</button>
        </div>
      </div>
      ${franjaCuadra(z)}
      <div class="acciones">
        <button class="btn-estacionar" onclick="abrirPanel('${z.nombre.replace(/'/g,"\\'")}')">Estacionar acá</button>
        <button class="btn-reportar" onclick="abrirReporte('${z.nombre.replace(/'/g,"\\'")}')">⚠️</button>
      </div>
      <div class="acciones">
        <button class="btn-cuadras" onclick="abrirCuadras('${z.nombre.replace(/'/g,"\\'")}')">🅿️ Lugares</button>
        <button class="btn-conductor" onclick="abrirConductor('${z.nombre.replace(/'/g,"\\'")}')">🚘 Conductor</button>
      </div>
    </div>`;
}
function cerrarHoja(){
  $hoja.style.display = 'none';
  $hoja.innerHTML = '';
  zonaSeleccionada = null;
  limpiarBusqueda();
}

/* =====================================================
   VISTA DE CUADRAS (plano esquemático)
   ===================================================== */
let vistaCuadrasZona = null;

const CALLES_CIUDAD = {
  rosario: ['Córdoba','Santa Fe','San Luis','San Juan','Mendoza','Urquiza','Tucumán','Salta','Catamarca','Corrientes','Paraguay','España','Sarmiento','Mitre','San Martín','Maipú','Laprida','Entre Ríos','Balcarce','Bv. Oroño'],
  santafe: ['San Martín','Rivadavia','San Jerónimo','25 de Mayo','9 de Julio','San Luis','Mendoza','Tucumán','Salta','Corrientes','Juan de Garay','La Rioja','Urquiza','Suipacha','Hipólito Yrigoyen'],
  reconquista: ['Patricio Diez','Iriondo','Ludueña','Bolívar','Freyre','Olessio','Rivadavia','25 de Mayo','9 de Julio','San Martín','Mitre','Belgrano','Alvear','Gral. Obligado','Jorge Newbery'],
  rafaela: ['Bv. Santa Fe','Bv. Lehmann','Sarmiento','Belgrano','Mitre','San Martín','25 de Mayo','9 de Julio','Alvear','Tucumán','Constitución','Necochea','Brown','Saavedra'],
  venadotuerto: ['Belgrano','Mitre','San Martín','Casey','Alvear','Pellegrini','Saavedra','Moreno','España','Italia','Maipú','9 de Julio','Chacabuco'],
};
const CALLES_DEFECTO = ['San Martín','Belgrano','Mitre','Sarmiento','Rivadavia','25 de Mayo','9 de Julio','Moreno','Urquiza','Alvear','España','Italia','Independencia','Buenos Aires','Santa Fe','Córdoba','Entre Ríos'];

function nombreCuadra(z, idx){
  const calles = CALLES_CIUDAD[municipioActual] || CALLES_DEFECTO;
  let hash = 0;
  for (const ch of z.nombre) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  const calle = calles[(hash + idx) % calles.length];
  const altura = (((hash >> 3) + idx * 2) % 14 + 1) * 100;
  return `${calle} al ${altura}`;
}

let cuadraElegida = null;

function gruposCuadras(z){
  let grupos;
  if (z.cuadras && z.cuadras.length){
    grupos = z.cuadras.map((c, i) => ({
      nombre: c.nombre || nombreCuadra(z, i),
      desde: c.desde,
      plazas: z.plazas.slice(c.desde, c.hasta),
      lat: c.a ? c.a[0] : z.lat,
      lng: c.a ? c.a[1] : z.lng,
    }));
  } else {
    const porCuadra = {};
    z.plazas.forEach((p, i) => {
      const c = p.cuadra || 0;
      if (!porCuadra[c]) porCuadra[c] = { desde: i, plazas: [] };
      porCuadra[c].plazas.push(p);
    });
    const escLng = 1 / Math.cos(z.lat * Math.PI / 180);
    grupos = Object.keys(porCuadra).map((c, idx) => {
      const ang = idx * 1.9;
      const r = 0.0009 + (idx % 4) * 0.0006;
      return {
        nombre: nombreCuadra(z, idx),
        desde: porCuadra[c].desde,
        plazas: porCuadra[c].plazas,
        lat: z.lat + Math.sin(ang) * r,
        lng: z.lng + Math.cos(ang) * r * escLng,
      };
    });
  }
  if (ubicacion){
    grupos.forEach(g => g.dist = distanciaKm(ubicacion.lat, ubicacion.lng, g.lat, g.lng));
    grupos.sort((a, b) => a.dist - b.dist);
  }
  return grupos;
}

function contenidoCuadras(z){
  const grupos = gruposCuadras(z);
  return grupos.map(g => {
    const libres = g.plazas.reduce((s, p) => s + (p.ocupado ? 0 : 1), 0);
    const cl = claseSemaforo(libres, g.plazas.length);
    const sel = cuadraElegida && cuadraElegida.desde === g.desde ? ' elegida' : '';
    const distTxt = g.dist !== undefined ? ` · a ${textoDistancia(g.dist)}` : '';
    return `
      <div class="cuadra-bloque${sel}" onclick="elegirCuadra(${g.desde}, '${g.nombre.replace(/'/g,"\\'")}')">
        <div class="cuadra-cab">
          <span class="nom">${g.nombre}${distTxt}</span>
          <span class="cant ${cl}">${libres} libres de ${g.plazas.length}</span>
        </div>
        <div class="calle-esquema">
          ${g.plazas.map(p => !p.ocupado
            ? '<div class="plaza libre"></div>'
            : '<div class="plaza ocupada">🚗</div>').join('')}
        </div>
      </div>`;
  }).join('');
}

function elegirCuadra(desde, nombre){
  cuadraElegida = (cuadraElegida && cuadraElegida.desde === desde) ? null : { desde, nombre };
  const z = ultimosDatos && ultimosDatos.zonas.find(x => x.nombre === vistaCuadrasZona);
  if (z){
    document.getElementById('planoCuadras').innerHTML = contenidoCuadras(z);
    actualizarBotonEstacionar();
  }
}

function actualizarBotonEstacionar(){
  const btn = document.getElementById('btnEstacionarCuadra');
  if (!btn) return;
  if (cuadraElegida){
    btn.textContent = `Estacionar en ${cuadraElegida.nombre}`;
    btn.disabled = false;
    btn.classList.remove('desactivado');
  } else {
    btn.textContent = 'Elegí la calle donde vas a estacionar';
    btn.disabled = true;
    btn.classList.add('desactivado');
  }
}

function abrirCuadras(zonaNombre){
  if (!ultimosDatos) return;
  const z = ultimosDatos.zonas.find(x => x.nombre === zonaNombre);
  if (!z) return;
  vistaCuadrasZona = zonaNombre;
  cuadraElegida = null;
  const ordenTxt = ubicacion ? '🟢 ordenadas por cercanía · se actualizan a medida que avanzás' : 'activá tu ubicación para ordenarlas por cercanía';
  $modal.innerHTML = `
    <div class="velo" onclick="if(event.target===this)cerrarPanel()">
      <div class="panel" role="dialog" aria-label="Cuadras de la zona">
        <h2>${z.nombre}</h2>
        <p class="sub">${z.ref} · <span id="cuadrasTotal">${z.libres}</span> lugares medidos libres · ${ordenTxt}</p>
        <div class="plano" id="planoCuadras">${contenidoCuadras(z)}</div>
        <p class="nota-medido">Tocá la calle donde querés estacionar. Cada cuadra ya descuenta garages, esquinas y rampas: por eso el total no es redondo.</p>
        <button class="btn-primario desactivado" id="btnEstacionarCuadra" disabled onclick="estacionarEnCuadra()">Elegí la calle donde vas a estacionar</button>
        <button class="btn-sec" onclick="cerrarPanel()">Cerrar</button>
      </div>
    </div>`;
}

function estacionarEnCuadra(){
  if (!cuadraElegida) return;
  const zona = vistaCuadrasZona;
  const calle = cuadraElegida.nombre;
  cerrarPanel();
  abrirPanel(zona, calle);
}

let marcadorLugar = null;
let areaLugar = null;
let rutaLugar = null;

function limpiarRuta(){
  if (marcadorLugar){ mapa.removeLayer(marcadorLugar); marcadorLugar = null; }
  if (areaLugar){ mapa.removeLayer(areaLugar); areaLugar = null; }
  if (rutaLugar){ mapa.removeLayer(rutaLugar); rutaLugar = null; }
}

async function trazarRuta(desde, hasta){
  try {
    const control = new AbortController();
    const tope = setTimeout(() => control.abort(), 5000);
    const url = `https://router.project-osrm.org/route/v1/driving/${desde.lng},${desde.lat};${hasta.lng},${hasta.lat}?overview=full&geometries=geojson`;
    const resp = await fetch(url, { signal: control.signal });
    clearTimeout(tope);
    if (!resp.ok) return null;
    const json = await resp.json();
    const ruta = json.routes && json.routes[0];
    if (!ruta) return null;
    return {
      linea: ruta.geometry.coordinates.map(c => [c[1], c[0]]),
      km: ruta.distance / 1000,
      min: Math.max(1, Math.round(ruta.duration / 60)),
    };
  } catch (e){ return null; }
}

async function irALugar(zonaNombre, idxPlaza, nombreCalle){
  const z = ultimosDatos && ultimosDatos.zonas.find(x => x.nombre === zonaNombre);
  if (!z) return;
  cerrarPanel();
  cerrarHoja();
  limpiarRuta();

  let lat = z.lat, lng = z.lng, exacto = false;
  if (z.spots){
    const s = z.spots.find(x => x.i === idxPlaza);
    if (s){ lat = s.lat; lng = s.lng; exacto = true; }
  }

  const icono = L.divIcon({
    className: '',
    html: `<div class="pin-lugar"><div class="pin-p">P</div><div class="pin-onda"></div></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 40],
  });
  marcadorLugar = L.marker([lat, lng], { icon: icono, title: 'Lugar libre' }).addTo(mapa);

  if (!exacto){
    areaLugar = L.circle([lat, lng], {
      radius: 150, color: '#0E9F4D', weight: 2, dashArray: '6 8',
      fillColor: '#0E9F4D', fillOpacity: .12,
    }).addTo(mapa);
  }

  if (ubicacion){
    const ruta = await trazarRuta(ubicacion, { lat, lng });
    const distDirecta = distanciaKm(ubicacion.lat, ubicacion.lng, lat, lng);

    if (ruta){
      rutaLugar = L.polyline(ruta.linea, {
        color: '#0B4EA2', weight: 6, opacity: .85, lineCap: 'round',
      }).addTo(mapa);
    } else {
      rutaLugar = L.polyline([[ubicacion.lat, ubicacion.lng], [lat, lng]], {
        color: '#0B4EA2', weight: 4, opacity: .7, dashArray: '10 10', lineCap: 'round',
      }).addTo(mapa);
    }
    mapa.flyToBounds(L.latLngBounds([[ubicacion.lat, ubicacion.lng], [lat, lng]]).pad(0.3), { duration: 1 });

    const urlNav = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    $hoja.style.display = 'flex';
    $hoja.innerHTML = `
      <div class="tarjeta verde">
        <div class="fila-titulo">
          <div>
            <span class="eti-mejor">📍 Tu lugar</span>
            <h3>${exacto ? nombreCalle : 'Zona ' + z.nombre}</h3>
            <div class="ref">${ruta
              ? `a ${textoDistancia(ruta.km)} · ~${ruta.min} min en auto`
              : `a ${textoDistancia(distDirecta)} en línea recta`}${exacto ? '' : ' · buscá dentro del círculo verde'}</div>
          </div>
          <button class="cerrar" onclick="cerrarHoja();limpiarRuta()" aria-label="Cerrar">×</button>
        </div>
        <div class="acciones">
          <button class="btn-navegar" onclick="window.open('${urlNav}', '_blank')">🧭 Navegar</button>
          <button class="btn-estacionar" onclick="limpiarRuta();abrirPanel('${z.nombre.replace(/'/g,"\\'")}')">Ya llegué</button>
        </div>
      </div>`;
  } else {
    mapa.flyTo([lat, lng], exacto ? 18 : 16, { duration: 1 });
    mostrarToast(exacto
      ? `📍 Tu lugar libre: ${nombreCalle}. Activá tu ubicación para ver el trayecto.`
      : `📍 Hay ${z.libres} lugares en ${z.nombre} — buscá dentro del círculo. Activá tu ubicación para ver el trayecto.`);
  }
}

function refrescarCuadras(){
  if (!vistaCuadrasZona || !ultimosDatos) return;
  const z = ultimosDatos.zonas.find(x => x.nombre === vistaCuadrasZona);
  const plano = document.getElementById('planoCuadras');
  const total = document.getElementById('cuadrasTotal');
  if (z && plano){
    plano.innerHTML = contenidoCuadras(z);
    if (total) total.textContent = z.libres;
  }
}

/* =====================================================
   MODO DEMO — Barrio dibujado por la app
   ===================================================== */
let demoActivo = false;
let demoSegs = null;
let demoCiudad = null;
let demoRAF = null;
const demoCanvas = document.getElementById('demoCanvas');
const demoCtx = demoCanvas.getContext('2d');

const D = {
  nx: 4, ny: 5,
  manzana: 150,
  calle: 34,
  margen: 24,
  pasoBahia: 20,
};
D.mundoW = D.margen * 2 + D.nx * D.manzana + (D.nx + 1) * D.calle;
D.mundoH = D.margen * 2 + D.ny * D.manzana + (D.ny + 1) * D.calle;

const COLORES_AUTO = ['#D6402B','#0B4EA2','#4A5160','#E8A200','#7C4DB8','#2C8C8C','#8B5A2B','#C2185B'];

function construirDemo(){
  if (!ultimosDatos) return;
  demoCiudad = ultimosDatos.municipio;
  demoSegs = [];

  const plazasCiudad = [];
  ultimosDatos.zonas.forEach(z => {
    z.plazas.forEach((p, i) => plazasCiudad.push({ zona: z, idx: i }));
  });

  const posCalleH = i => D.margen + i * (D.manzana + D.calle) + D.calle / 2;
  let cursor = 0;

  for (let f = 0; f <= D.ny; f++){
    const y = posCalleH(f);
    for (let c = 0; c < D.nx; c++){
      const x0 = D.margen + D.calle + c * (D.manzana + D.calle);
      const seg = { h: true, x: x0, y, largo: D.manzana, lado: f % 2 ? -1 : 1, plazas: [] };
      const cupo = Math.floor(D.manzana / D.pasoBahia);
      for (let k = 0; k < cupo && cursor < plazasCiudad.length; k++) seg.plazas.push(plazasCiudad[cursor++]);
      if (seg.plazas.length) demoSegs.push(seg);
    }
  }
  for (let cV = 0; cV <= D.nx; cV++){
    const x = posCalleH(cV);
    for (let f = 0; f < D.ny; f++){
      const y0 = D.margen + D.calle + f * (D.manzana + D.calle);
      const seg = { h: false, x, y: y0, largo: D.manzana, lado: cV % 2 ? -1 : 1, plazas: [] };
      const cupo = Math.floor(D.manzana / D.pasoBahia);
      for (let k = 0; k < cupo && cursor < plazasCiudad.length; k++) seg.plazas.push(plazasCiudad[cursor++]);
      if (seg.plazas.length) demoSegs.push(seg);
    }
  }
}

function demoEscala(){
  const w = demoCanvas.clientWidth, h = demoCanvas.clientHeight;
  const esc = Math.min(w / D.mundoW, h / D.mundoH);
  return { esc, dx: (w - D.mundoW * esc) / 2, dy: (h - D.mundoH * esc) / 2 };
}

function dibujarAuto(ctx, cx, cy, ang, color){
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-8.5, -4.5, 17, 9, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.roundRect(-3.5, -3.2, 6.5, 6.4, 2);
  ctx.fill();
  ctx.fillStyle = '#FFE28A';
  ctx.fillRect(7, -3.5, 1.6, 2.2);
  ctx.fillRect(7, 1.3, 1.6, 2.2);
  ctx.restore();
}

function dibujarDemo(ts){
  if (!demoActivo) return;
  if (!demoSegs || (ultimosDatos && ultimosDatos.municipio !== demoCiudad)) construirDemo();

  const dpr = window.devicePixelRatio || 1;
  const w = demoCanvas.clientWidth, h = demoCanvas.clientHeight;
  if (demoCanvas.width !== w * dpr){ demoCanvas.width = w * dpr; demoCanvas.height = h * dpr; }
  const ctx = demoCtx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const { esc, dx, dy } = demoEscala();
  ctx.save();
  ctx.translate(dx, dy);
  ctx.scale(esc, esc);

  ctx.fillStyle = '#8F98A5';
  ctx.fillRect(0, 0, D.mundoW, D.mundoH);

  for (let f = 0; f < D.ny; f++){
    for (let c = 0; c < D.nx; c++){
      const x = D.margen + D.calle + c * (D.manzana + D.calle);
      const y = D.margen + D.calle + f * (D.manzana + D.calle);
      ctx.fillStyle = '#C7CDD6';
      ctx.beginPath(); ctx.roundRect(x - 6, y - 6, D.manzana + 12, D.manzana + 12, 10); ctx.fill();
      ctx.fillStyle = '#DCCFBB';
      ctx.beginPath(); ctx.roundRect(x, y, D.manzana, D.manzana, 8); ctx.fill();
      ctx.fillStyle = 'rgba(120,100,75,.25)';
      for (let e = 0; e < 4; e++){
        ctx.fillRect(x + 12 + (e % 2) * 70, y + 12 + Math.floor(e / 2) * 70, 56, 56);
      }
      if (f === 2 && c === 1){
        ctx.fillStyle = '#9CC79A';
        ctx.beginPath(); ctx.roundRect(x, y, D.manzana, D.manzana, 8); ctx.fill();
        ctx.fillStyle = '#7FB07C';
        ctx.beginPath(); ctx.arc(x + D.manzana/2, y + D.manzana/2, 26, 0, 7); ctx.fill();
      }
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([9, 9]);
  for (let f = 0; f <= D.ny; f++){
    const y = D.margen + f * (D.manzana + D.calle) + D.calle / 2;
    ctx.beginPath(); ctx.moveTo(D.margen, y); ctx.lineTo(D.mundoW - D.margen, y); ctx.stroke();
  }
  for (let c = 0; c <= D.nx; c++){
    const x = D.margen + c * (D.manzana + D.calle) + D.calle / 2;
    ctx.beginPath(); ctx.moveTo(x, D.margen); ctx.lineTo(x, D.mundoH - D.margen); ctx.stroke();
  }
  ctx.setLineDash([]);

  const COL = { verde:'#0E9F4D', ambar:'#E8A200', rojo:'#D6402B' };
  const pulso = 0.55 + 0.45 * Math.sin((ts || 0) / 400);

  (demoSegs || []).forEach(seg => {
    let libres = 0;
    seg.plazas.forEach(pl => { if (!pl.zona.plazas[pl.idx].ocupado) libres++; });
    const cl = claseSemaforo(libres, seg.plazas.length);
    const offLado = seg.lado * (D.calle / 2 - 6);

    ctx.strokeStyle = COL[cl];
    ctx.globalAlpha = .9;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (seg.h){
      ctx.moveTo(seg.x + 4, seg.y + offLado);
      ctx.lineTo(seg.x + seg.largo - 4, seg.y + offLado);
    } else {
      ctx.moveTo(seg.x + offLado, seg.y + 4);
      ctx.lineTo(seg.x + offLado, seg.y + seg.largo - 4);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    const offBahia = seg.lado * (D.calle / 2 - 13);
    seg.plazas.forEach((pl, k) => {
      const t = (k + 0.5) * D.pasoBahia;
      const cx = seg.h ? seg.x + t : seg.x + offBahia;
      const cy = seg.h ? seg.y + offBahia : seg.y + t;
      const libre = !pl.zona.plazas[pl.idx].ocupado;
      if (libre){
        ctx.strokeStyle = COL.verde;
        ctx.globalAlpha = pulso;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(cx - 8.5, cy - 4.5, 17, 9);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      } else {
        dibujarAuto(ctx, cx, cy, seg.h ? 0 : Math.PI / 2, COLORES_AUTO[(pl.idx * 7 + 3) % COLORES_AUTO.length]);
      }
    });

    const mx = seg.h ? seg.x + seg.largo / 2 : seg.x - seg.lado * 1;
    const my = seg.h ? seg.y - seg.lado * 1 : seg.y + seg.largo / 2;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.beginPath(); ctx.roundRect(mx - 11, my - 8, 22, 16, 8); ctx.fill();
    ctx.fillStyle = COL[cl];
    ctx.font = '700 11px Barlow Condensed, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(libres, mx, my + 0.5);
  });

  ctx.restore();
  demoRAF = requestAnimationFrame(dibujarDemo);
}

function alternarDemo(){
  demoActivo = !demoActivo;
  document.getElementById('demo').style.display = demoActivo ? 'block' : 'none';
  const chip = document.getElementById('chipDemo');
  if (chip) chip.textContent = demoActivo ? '🗺️ Mapa' : '🎮 Demo';
  cerrarHoja();
  if (demoActivo){
    construirDemo();
    demoRAF = requestAnimationFrame(dibujarDemo);
  } else {
    cancelAnimationFrame(demoRAF);
  }
}

demoCanvas.addEventListener('click', e => {
  if (!demoSegs || !ultimosDatos) return;
  const rect = demoCanvas.getBoundingClientRect();
  const { esc, dx, dy } = demoEscala();
  const mx = (e.clientX - rect.left - dx) / esc;
  const my = (e.clientY - rect.top - dy) / esc;
  let mejor = null, mejorD = 26;
  demoSegs.forEach(seg => {
    const cx = seg.h ? Math.max(seg.x, Math.min(seg.x + seg.largo, mx)) : seg.x;
    const cy = seg.h ? seg.y : Math.max(seg.y, Math.min(seg.y + seg.largo, my));
    const d = Math.hypot(mx - cx, my - cy);
    if (d < mejorD){ mejorD = d; mejor = seg; }
  });
  if (mejor && mejor.plazas.length){
    const z = ultimosDatos.zonas.find(x => x.nombre === mejor.plazas[0].zona.nombre);
    if (z) abrirHoja(z);
  }
});

/* =====================================================
   MODO CONDUCTOR
   ===================================================== */
let conductorZona = null;

function abrirConductor(zonaNombre){
  const z = ultimosDatos && ultimosDatos.zonas.find(x => x.nombre === zonaNombre);
  if (!z) return;
  conductorZona = zonaNombre;
  cerrarHoja();
  pintarConductor(z);
  const dist = ubicacion ? ' a ' + textoDistancia(distanciaKm(ubicacion.lat, ubicacion.lng, z.lat, z.lng)) : '';
  hablar(`${z.nombre}: ${z.libres} lugares libres${dist}.`);
}

function pintarConductor(z){
  const dist = ubicacion ? distanciaKm(ubicacion.lat, ubicacion.lng, z.lat, z.lng) : null;
  const clase = claseSemaforo(z.libres, z.capacidad);
  const colores = {verde:'#3DDC84', ambar:'#FFC53D', rojo:'#FF6B54'};
  document.getElementById('conductor').style.display = 'flex';
  document.getElementById('conductor').innerHTML = `
    <div class="cond-zona">${z.nombre}</div>
    <div class="cond-numero" style="color:${colores[clase]}">${z.libres}</div>
    <div class="cond-sub">lugares libres</div>
    ${dist !== null ? `<div class="cond-dist">📍 a ${textoDistancia(dist)}</div>` : ''}
    <div class="cond-tarifa">⚡ ${pesos(z.tarifa)}/h ahora · 15 min gratis</div>
    <button class="cond-llegue" onclick="cerrarConductor();abrirPanel('${z.nombre.replace(/'/g,"\\'")}')">YA LLEGUÉ</button>
    <button class="cond-salir" onclick="cerrarConductor()">Salir del modo conductor</button>
  `;
}

function cerrarConductor(){
  conductorZona = null;
  document.getElementById('conductor').style.display = 'none';
}

/* =====================================================
   HISTORIAL Y ZONAS FRECUENTES
   ===================================================== */
const historial = [];

function abrirHistorial(){
  const total = historial.reduce((s, h) => s + h.monto, 0);
  const porZona = {};
  historial.forEach(h => { porZona[h.zona] = (porZona[h.zona] || 0) + 1; });
  const frecuentes = Object.entries(porZona).sort((a, b) => b[1] - a[1]).slice(0, 3);

  $modal.innerHTML = `
    <div class="velo" onclick="if(event.target===this)cerrarPanel()">
      <div class="panel" role="dialog" aria-label="Tu historial">
        <h2>Tus estacionamientos</h2>
        <p class="sub">De esta sesión de uso</p>
        <div class="sesion-datos">
          <div>Total gastado<strong>${pesos(total)}</strong></div>
          <div>Veces estacionado<strong>${historial.length}</strong></div>
        </div>
        ${frecuentes.length ? `
          <div class="cuadra-titulo" style="margin-bottom:8px">Tus zonas frecuentes</div>
          ${frecuentes.map(([nom, veces]) => `
            <div class="hist-item">
              <div><strong>⭐ ${nom}</strong><br><span>${veces} ${veces === 1 ? 'vez' : 'veces'}</span></div>
              <button onclick="cerrarPanel();abrirPanel('${nom.replace(/'/g,"\\'")}')">Estacionar</button>
            </div>`).join('')}` : ''}
        ${historial.length ? `
          <div class="cuadra-titulo" style="margin:14px 0 8px">Últimos movimientos</div>
          ${historial.slice(0, 8).map(h => `
            <div class="hist-item">
              <div><strong>${h.zona}</strong> · ${h.ciudad.split(',')[0]}<br>
              <span>${h.fecha.toLocaleTimeString('es-AR', {hour:'2-digit',minute:'2-digit'})} · ${h.minutos} min · ${h.medio}</span></div>
              <div class="hist-monto">${h.monto === 0 ? 'Gratis' : pesos(h.monto)}</div>
            </div>`).join('')}`
          : '<p class="sub" style="margin-top:14px">Todavía no estacionaste. Cuando pagues tu primer estacionamiento, va a aparecer acá.</p>'}
        <button class="btn-sec" onclick="cerrarPanel()">Cerrar</button>
      </div>
    </div>`;
}

/* =====================================================
   MODO OSCURO
   ===================================================== */
let modoOscuro = false;
let capaOscura = null;

function alternarOscuro(){
  modoOscuro = !modoOscuro;
  document.body.classList.toggle('oscuro', modoOscuro);
  document.getElementById('chipOscuro').textContent = modoOscuro ? '☀️' : '🌙';
  if (!capaOscura){
    capaOscura = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20, subdomains: 'abcd', attribution: '© OpenStreetMap · © CARTO',
    });
  }
  if (!vistaSatelite){
    if (modoOscuro){
      mapa.removeLayer(capaCalles);
      capaOscura.addTo(mapa);
    } else {
      mapa.removeLayer(capaOscura);
      capaCalles.addTo(mapa);
    }
  }
}

/* =====================================================
   ASISTENTE DE VOZ
   ===================================================== */
function responderConsultaVoz(texto){
  const t = normalizar(texto);
  if (!ultimosDatos) return;

  let zona = ultimosDatos.zonas.find(z => t.includes(normalizar(z.nombre)));

  if (!zona){
    if (/\bcentro\b/.test(t)) zona = ultimosDatos.zonas.find(z => /centro/.test(normalizar(z.nombre)));
    else if (/comercial|avenida|shopping/.test(t)) zona = ultimosDatos.zonas.find(z => /comercial|avenida/.test(normalizar(z.nombre)));
    else if (/terminal|omnibus|colectivo/.test(t)) zona = ultimosDatos.zonas.find(z => /terminal/.test(normalizar(z.nombre)));
  }

  const pideCercana = /cerca|proxim|donde hay|mejor lugar|mas cerca/.test(t);

  if (!zona && pideCercana){
    let cand = ultimosDatos.zonas.map(z => ({...z}));
    if (ubicacion) cand.forEach(z => z.d = distanciaKm(ubicacion.lat, ubicacion.lng, z.lat, z.lng));
    cand = cand.filter(z => z.libres > 0).sort((a, b) => (a.d ?? 0) - (b.d ?? 0) || b.libres - a.libres);
    zona = cand[0];
  }

  if (!zona){
    const total = ultimosDatos.zonas.reduce((s, z) => s + z.libres, 0);
    const frase = `En ${$sel.options[$sel.selectedIndex].text.split(',')[0]} hay ${total} lugares libres en total. Preguntame por una zona, por ejemplo: ¿hay lugar en el centro?`;
    hablar(frase); mostrarToast('🎙️ ' + frase);
    return;
  }

  const dist = ubicacion ? distanciaKm(ubicacion.lat, ubicacion.lng, zona.lat, zona.lng) : null;
  let frase;
  if (zona.libres === 0){
    frase = `En ${zona.nombre} no hay lugares libres en este momento. Probá otra zona.`;
  } else {
    const estado = zona.libres > zona.capacidad * 0.35 ? 'Hay bastante lugar' :
                   zona.libres > zona.capacidad * 0.12 ? 'Queda poco lugar' : 'Está casi lleno';
    frase = `${estado} en ${zona.nombre}: ${zona.libres} lugares libres` +
            (dist !== null ? `, a ${textoDistancia(dist)} tuyo` : '') +
            `. La tarifa es ${pesos(zona.tarifa)} por hora.`;
  }
  hablar(frase);
  mostrarToast('🎙️ ' + frase);
  const zReal = ultimosDatos.zonas.find(x => x.nombre === zona.nombre);
  if (zReal) abrirHoja(zReal);
}

function consultaEscrita(){
  const texto = prompt('¿Sobre qué zona querés saber? (ej: "¿hay lugar en el centro?")');
  if (texto) responderConsultaVoz(texto);
}

function escucharVoz(){
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('btnVoz');
  if (!Rec){
    consultaEscrita();
    return;
  }
  const rec = new Rec();
  rec.lang = 'es-AR';
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  btn.classList.add('escuchando');
  mostrarToast('🎙️ Escuchando… preguntá "¿hay lugar en el centro?"');
  try { speechSynthesis.cancel(); } catch(e){}

  rec.onresult = e => {
    const texto = e.results[0][0].transcript;
    responderConsultaVoz(texto);
  };
  rec.onerror = ev => {
    btn.classList.remove('escuchando');
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed'){
      mostrarToast('🎙️ El micrófono está bloqueado acá. Abrí la app en Chrome o Safari y dale permiso de micrófono.');
    } else if (ev.error === 'no-speech'){
      mostrarToast('No te escuché. Tocá el micrófono y hablá cerca del teléfono.');
    } else {
      mostrarToast('No pude usar el micrófono en este visor. Probá en el navegador.');
    }
  };
  rec.onend = () => { btn.classList.remove('escuchando'); };
  try {
    rec.start();
  } catch (e){
    btn.classList.remove('escuchando');
    mostrarToast('🎙️ El micrófono no está disponible en este visor. Abrila en Chrome o Safari.');
  }
}

/* ---------- Ubicación ---------- */
let watchId = null;

function pedirUbicacion(){
  const btn = document.getElementById('chipUbi');
  if (!navigator.geolocation){
    ubicacionEstado = 'denegada';
    mostrarToast('Tu dispositivo no permite acceder a la ubicación');
    return;
  }
  btn.classList.add('buscando');
  navigator.geolocation.getCurrentPosition(
    pos => {
      aplicarUbicacion(pos, true);
      btn.classList.remove('buscando');
      btn.classList.add('activa');
      iniciarSeguimiento();
    },
    () => {
      ubicacionEstado = 'denegada';
      btn.classList.remove('buscando');
      mostrarToast('No pude acceder a tu ubicación — revisá los permisos');
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

function aplicarUbicacion(pos, centrar){
  const antes = ubicacion;
  ubicacion = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  ubicacionEstado = 'ok';

  if (marcadorYo) mapa.removeLayer(marcadorYo);
  const icono = L.divIcon({ className:'', html:'<div class="marcador-yo"></div>', iconSize:[20,20], iconAnchor:[10,10] });
  marcadorYo = L.marker([ubicacion.lat, ubicacion.lng], { icon: icono, title:'Estás acá' }).addTo(mapa);

  if (centrar){
    let mejor = null, mejorDist = Infinity;
    listaMunicipios.forEach(m => {
      const d = distanciaKm(ubicacion.lat, ubicacion.lng, m.centro[0], m.centro[1]);
      if (d < mejorDist){ mejorDist = d; mejor = m; }
    });
    if (mejor && mejorDist < 60){
      if (mejor.id !== municipioActual){
        $sel.value = mejor.id;
        cambiarMunicipio(false);
      }
      mapa.flyTo([ubicacion.lat, ubicacion.lng], 15, { duration: 1.2 });
    } else {
      mapa.flyTo([ubicacion.lat, ubicacion.lng], 13, { duration: 1.2 });
    }
  }

  if (antes && vistaCuadrasZona){
    const movido = distanciaKm(antes.lat, antes.lng, ubicacion.lat, ubicacion.lng);
    if (movido > 0.04) refrescarCuadras();
  }
}

function iniciarSeguimiento(){
  if (watchId !== null || !navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(
    pos => aplicarUbicacion(pos, false),
    () => {},
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

/* ---------- Datos ---------- */
async function cargar(id){
  municipioActual = id;
  const datos = await ServidorMunicipal.consultarDisponibilidad(id);
  if (municipioActual !== id) return;
  ultimosDatos = datos;
  pintarZonas(datos);

  const total = datos.zonas.reduce((s, z) => s + z.libres, 0);
  const capTotal = datos.zonas.reduce((s, z) => s + z.capacidad, 0);
  const clase = claseSemaforo(total, capTotal);
  const colores = {verde:'var(--verde)', ambar:'var(--ambar)', rojo:'var(--rojo)'};
  $chipNum.textContent = total;
  $chipNum.style.color = colores[clase];

  if (zonaSeleccionada){
    const z = datos.zonas.find(x => x.nombre === zonaSeleccionada.nombre);
    if (z) abrirHoja(z);
  }
  refrescarCuadras();
  if (conductorZona){
    const zc = datos.zonas.find(x => x.nombre === conductorZona);
    if (zc) pintarConductor(zc);
  }
}

function cambiarMunicipio(volar = true){
  cerrarHoja();
  const m = listaMunicipios.find(x => x.id === $sel.value);
  if (volar && m) mapa.flyTo(m.centro, 14, { duration: 1.2 });
  cargar($sel.value);
  programarRefresco();
}

function programarRefresco(){
  clearInterval(timer);
  timer = setInterval(() => {
    if (municipioActual) cargar(municipioActual);
  }, 6000);
}

/* =====================================================
   BUSCAME UN LUGAR
   ===================================================== */
function abrirZonaPrincipal(){
  if (!ultimosDatos || !ultimosDatos.zonas.length) return;
  let z = ultimosDatos.zonas.find(x => /centro/i.test(x.nombre));
  if (!z) z = ultimosDatos.zonas.slice().sort((a, b) => b.libres - a.libres)[0];
  if (z){
    mapa.flyTo([z.lat, z.lng], 15, { duration: .8 });
    abrirHoja(z);
  }
}

function modoBuscarLugar(){
  if (!ultimosDatos) return;
  cerrarHoja();
  limpiarBusqueda();
  modoBusqueda = true;
  const banner = document.getElementById('bannerBuscar');
  banner.style.display = 'flex';
  banner.innerHTML = `
    <div class="caja">
      <span>🎯 Tocá en el mapa a dónde vas</span>
      ${ubicacion ? '<button onclick="destinoElegido(ubicacion.lat, ubicacion.lng)">Cerca de mí</button>' : ''}
      <button onclick="cancelarBusqueda()">Cancelar</button>
    </div>`;
}

function cancelarBusqueda(){
  modoBusqueda = false;
  document.getElementById('bannerBuscar').style.display = 'none';
  limpiarBusqueda();
}

function limpiarBusqueda(){
  if (marcadorDestino){ mapa.removeLayer(marcadorDestino); marcadorDestino = null; }
  if (lineaRuta){ mapa.removeLayer(lineaRuta); lineaRuta = null; }
  if (zonaGanadora){
    zonaGanadora = null;
    if (ultimosDatos) pintarZonas(ultimosDatos);
  }
}

function destinoElegido(lat, lng){
  modoBusqueda = false;
  document.getElementById('bannerBuscar').style.display = 'none';

  const iconoDestino = L.divIcon({
    className:'', html:'<div class="marcador-destino">🎯</div>',
    iconSize:[36,36], iconAnchor:[18,32],
  });
  marcadorDestino = L.marker([lat, lng], { icon: iconoDestino, title:'Tu destino' }).addTo(mapa);

  let mejor = null, mejorPuntaje = -Infinity;
  ultimosDatos.zonas.forEach(z => {
    if (z.libres === 0) return;
    const dist = distanciaKm(lat, lng, z.lat, z.lng);
    const disponibilidad = z.libres / z.capacidad;
    const puntaje = -dist * 10 + disponibilidad * 2 + Math.min(z.libres, 30) * 0.03;
    if (puntaje > mejorPuntaje){ mejorPuntaje = puntaje; mejor = {...z, dist}; }
  });

  if (!mejor){
    document.getElementById('bannerBuscar').style.display = 'flex';
    document.getElementById('bannerBuscar').innerHTML = `
      <div class="caja"><span>😕 No hay lugares libres cerca de ahí ahora</span>
      <button onclick="cancelarBusqueda()">Cerrar</button></div>`;
    return;
  }

  zonaGanadora = mejor.nombre;
  pintarZonas(ultimosDatos);

  lineaRuta = L.polyline([[lat, lng], [mejor.lat, mejor.lng]], {
    color:'#0B4EA2', weight:4, opacity:.75, dashArray:'8 10',
  }).addTo(mapa);

  mapa.flyToBounds(L.latLngBounds([[lat, lng], [mejor.lat, mejor.lng]]).pad(0.35), { duration: 1 });

  const clase = claseSemaforo(mejor.libres, mejor.capacidad);
  const urlNav = `https://www.google.com/maps/dir/?api=1&destination=${mejor.lat},${mejor.lng}&travelmode=driving`;
  $hoja.style.display = 'flex';
  $hoja.innerHTML = `
    <div class="tarjeta ${clase}">
      <div class="fila-titulo">
        <div>
          <span class="eti-mejor">✓ Mejor lugar para vos</span>
          <h3>${mejor.nombre}</h3>
          <div class="ref">${mejor.ref} · a ${textoDistancia(mejor.dist)} caminando de tu destino</div>
        </div>
        <div style="display:flex;align-items:flex-start">
          <div class="cifra">${mejor.libres}<small>libres</small></div>
          <button class="cerrar" onclick="cerrarHoja()" aria-label="Cerrar">×</button>
        </div>
      </div>
      <div class="acciones">
        <button class="btn-navegar" onclick="window.open('${urlNav}', '_blank')">🧭 Navegar</button>
        <button class="btn-estacionar" onclick="abrirPanel('${mejor.nombre.replace(/'/g,"\\'")}')">Ya llegué</button>
      </div>
    </div>`;
}

/* =====================================================
   ESTACIONAMIENTO MEDIDO
   ===================================================== */
function minutosSesion(){
  return Math.max(1, Math.ceil((Date.now() - sesion.inicio) / 60000));
}
const MIN_GRATIS = 15;
function costoSesion(){
  const cobrables = Math.max(0, minutosSesion() - MIN_GRATIS);
  return Math.round(cobrables * sesion.tarifaHora / 60);
}

function chequearAvisosTiempo(){
  if (!sesion) return;
  const min = minutosSesion();
  [[60, 'Llevás 1 hora estacionado. Ya gastaste '],
   [120, 'Llevás 2 horas estacionado. Ya gastaste ']].forEach(([tope, msj]) => {
    if (min >= tope && !sesion.avisos[tope]){
      sesion.avisos[tope] = true;
      const texto = msj + pesos(costoSesion()) + '. ¿Seguís ahí?';
      mostrarToast('⏰ ' + texto);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      hablar(texto);
    }
  });
}

async function calleActual(lat, lng){
  try {
    const control = new AbortController();
    const tope = setTimeout(() => control.abort(), 6000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const resp = await fetch(url, { signal: control.signal, headers: { 'Accept-Language': 'es' } });
    clearTimeout(tope);
    if (!resp.ok) return null;
    const j = await resp.json();
    const a = j.address || {};
    const calle = a.road || a.pedestrian || a.residential || null;
    const altura = a.house_number || null;
    return { calle, altura, barrio: a.suburb || a.neighbourhood || a.city_district || null };
  } catch (e){ return null; }
}

async function abrirPanel(zonaPreferida, calleElegida){
  if (sesion){ mostrarSesionActiva(); return; }
  if (!ultimosDatos){ return; }
  cerrarHoja();

  if (!ubicacion){
    $modal.innerHTML = `
      <div class="velo" onclick="if(event.target===this)cerrarPanel()">
        <div class="panel centrado" role="dialog" aria-label="Ubicación requerida">
          <div class="tilde alerta">📍</div>
          <h2>Activá tu ubicación</h2>
          <p class="sub">Para estacionar necesitamos saber en qué calle estás. Así evitás pagar por una cuadra equivocada y que te multen por estar en otra.</p>
          <button class="btn-primario" onclick="cerrarPanel();pedirUbicacion()">Activar mi ubicación</button>
          <button class="btn-sec" onclick="cerrarPanel()">Ahora no</button>
        </div>
      </div>`;
    return;
  }

  $modal.innerHTML = `
    <div class="velo">
      <div class="panel">
        <div class="procesando">
          <div class="rueda"></div>
          Detectando en qué calle estás…
        </div>
      </div>
    </div>`;

  const ubic = await calleActual(ubicacion.lat, ubicacion.lng);

  let zonaMedida = null, distZona = Infinity;
  ultimosDatos.zonas.forEach(z => {
    const d = distanciaKm(ubicacion.lat, ubicacion.lng, z.lat, z.lng);
    if (d < distZona){ distZona = d; zonaMedida = z; }
  });
  const enZonaMedida = distZona <= 0.7;

  const calleTxt = ubic && ubic.calle
    ? `${ubic.calle}${ubic.altura ? ' al ' + ubic.altura : ''}`
    : 'tu ubicación actual';

  if (!enZonaMedida){
    $modal.innerHTML = `
      <div class="velo" onclick="if(event.target===this)cerrarPanel()">
        <div class="panel centrado" role="dialog" aria-label="Sin estacionamiento medido">
          <div class="tilde" style="background:var(--verde)">✓</div>
          <h2>Acá no se paga</h2>
          <p class="sub">Estás en <strong>${calleTxt}</strong>. Esta cuadra no tiene estacionamiento medido, así que podés estacionar gratis. 🎉</p>
          <p class="sub">El estacionamiento medido rige solo en el centro (${ultimosDatos.zonas.map(z=>z.nombre).join(', ')}). Estás a ${textoDistancia(distZona)} de la zona medida más cercana.</p>
          <button class="btn-primario" onclick="cerrarPanel()">Entendido</button>
        </div>
      </div>`;
    return;
  }

  const z = zonaMedida;
  $modal.innerHTML = `
    <div class="velo" onclick="if(event.target===this)cerrarPanel()">
      <div class="panel" role="dialog" aria-label="Iniciar estacionamiento">
        <h2>Estacioné acá</h2>
        <div class="calle-elegida">📍 Estás en <strong>${calleTxt}</strong>${ubic && ubic.barrio ? ' · ' + ubic.barrio : ''}</div>
        <p class="sub">Zona ${z.nombre} · ${$sel.options[$sel.selectedIndex].text} · ⚡ ${pesos(z.tarifa)}/h · 15 min gratis · por minuto exacto</p>
        <div class="campo">
          <label for="inPatente">Patente</label>
          <input type="text" id="inPatente" maxlength="8" placeholder="AB 123 CD" value="${patenteGuardada}"
                 oninput="this.value=this.value.toUpperCase();document.getElementById('btnIniciar').disabled=this.value.trim().length<6">
        </div>
        <p class="nota-medido">La calle se detectó según tu ubicación GPS. Si no coincide con dónde dejaste el auto, movete al lugar y volvé a tocar Estacionar.</p>
        <button class="btn-primario" id="btnIniciar" onclick="iniciarEstacionamiento('${z.nombre.replace(/'/g,"\\'")}', '${calleTxt.replace(/'/g,"\\'")}')" ${patenteGuardada.length>=6?'':'disabled'}>Empezar a medir</button>
        <button class="btn-sec" onclick="cerrarPanel()">Cancelar</button>
      </div>
    </div>`;
  setTimeout(() => { const p = document.getElementById('inPatente'); if (p) p.focus(); }, 100);
}

async function iniciarEstacionamiento(zonaNombre, calleDetectada){
  const patente = document.getElementById('inPatente').value.trim().toUpperCase();
  const calle = calleDetectada || zonaNombre;
  patenteGuardada = patente;

  document.getElementById('btnIniciar').disabled = true;
  document.getElementById('btnIniciar').textContent = 'Registrando…';

  const r = await ServidorMunicipal.iniciarSesion(municipioActual, zonaNombre, patente);
  const z = ultimosDatos.zonas.find(x => x.nombre === zonaNombre);

  sesion = {
    municipioId: municipioActual,
    municipioNombre: $sel.options[$sel.selectedIndex].text,
    zona: zonaNombre, calle, patente,
    inicio: r.inicio,
    lugarIdx: r.lugarIdx,
    tarifaHora: (z && z.tarifa) || ultimosDatos.tarifaHora,
    avisos: {},
    lat: ubicacion ? ubicacion.lat : (z && z.lat),
    lng: ubicacion ? ubicacion.lng : (z && z.lng),
  };
  cerrarPanel();
  actualizarBarra();
  pintarAutoEstacionado();
  cargar(municipioActual);
  mostrarToast(`✅ Estacionado en ${calle}. Se está midiendo tu tiempo.`);
}

function actualizarBarra(){
  clearInterval(cronoTimer);
  if (sesion){
    $btnPark.classList.add('activo');
    const pinta = () => {
      const c = costoSesion();
      $btnPark.innerHTML = `<span>Estacionado · ${sesion.calle || sesion.zona}</span><span class="crono">${formatoCrono(sesion.inicio)} · ${c === 0 ? 'GRATIS' : pesos(c)}</span>`;
      chequearAvisosTiempo();
    };
    pinta();
    cronoTimer = setInterval(pinta, 1000);
  } else {
    $btnPark.classList.remove('activo');
    $btnPark.textContent = 'Estacioné acá';
  }
}

function mostrarSesionActiva(){
  const pinta = () => {
    const t = document.getElementById('sesTiempo');
    const c = document.getElementById('sesCosto');
    if (t){ t.textContent = formatoCrono(sesion.inicio); c.textContent = pesos(costoSesion()) + ' hasta ahora'; }
  };
  $modal.innerHTML = `
    <div class="velo" onclick="if(event.target===this)cerrarPanel()">
      <div class="panel" role="dialog" aria-label="Estacionamiento en curso">
        <h2>Estás estacionado</h2>
        <p class="sub">📍 ${sesion.calle || sesion.zona} · ${sesion.municipioNombre}</p>
        <div class="sesion-reloj">
          <div class="tiempo" id="sesTiempo">${formatoCrono(sesion.inicio)}</div>
          <div class="costo" id="sesCosto">${pesos(costoSesion())} hasta ahora</div>
        </div>
        <div class="sesion-datos">
          <div>Patente<strong>${sesion.patente}</strong></div>
          <div>Tarifa<strong>${pesos(sesion.tarifaHora)}/h</strong></div>
        </div>
        <button class="btn-primario" style="background:var(--rojo)" onclick="terminarEstacionamiento()">Me fui — pagar ahora</button>
        <button class="btn-sec" onclick="cerrarPanel()">Seguir estacionado</button>
      </div>
    </div>`;
  clearInterval(cronoTimer);
  cronoTimer = setInterval(pinta, 1000);
}

function terminarEstacionamiento(){
  const minutos = minutosSesion();
  const monto = costoSesion();
  const cobrados = Math.max(0, minutos - MIN_GRATIS);
  $modal.innerHTML = `
    <div class="velo">
      <div class="panel" role="dialog" aria-label="Pagar estacionamiento">
        <h2>Resumen</h2>
        <p class="sub">📍 ${sesion.calle || sesion.zona} · ${sesion.municipioNombre}</p>
        <div class="recibo">
          <div class="fila"><span>Calle</span><span>${sesion.calle || sesion.zona}</span></div>
          <div class="fila"><span>Patente</span><span>${sesion.patente}</span></div>
          <div class="fila"><span>Tiempo estacionado</span><span>${minutos} min</span></div>
          <div class="fila"><span>Primeros ${MIN_GRATIS} min</span><span style="color:var(--verde);font-weight:600">Gratis 🎁</span></div>
          <div class="fila"><span>Minutos cobrados</span><span>${cobrados} min</span></div>
          <div class="fila"><span>Tarifa de la zona</span><span>${pesos(sesion.tarifaHora)}/hora ⚡</span></div>
          <div class="fila total"><span>Total</span><span>${pesos(monto)}</span></div>
        </div>
        ${monto === 0
          ? `<button class="btn-primario" onclick="pagar('Sin cargo', ${minutos}, 0)">Terminar — no pagás nada 🎉</button>`
          : `<button class="btn-primario btn-mp" onclick="pagar('Mercado Pago', ${minutos}, ${monto})">Pagar con Mercado Pago</button>
             <button class="btn-primario" style="background:var(--azul);margin-top:10px" onclick="pagar('Tarjeta', ${minutos}, ${monto})">Pagar con tarjeta</button>`}
        <button class="btn-sec" onclick="mostrarSesionActiva()">Volver</button>
      </div>
    </div>`;
}

async function pagar(medio, minutos, monto){
  $modal.innerHTML = `
    <div class="velo">
      <div class="panel">
        <div class="procesando">
          <div class="rueda"></div>
          Procesando pago con ${medio}…
        </div>
      </div>
    </div>`;

  const r = await ServidorMunicipal.cobrar(sesion.municipioId, sesion.zona, minutos, monto, medio, sesion.lugarIdx);

  historial.unshift({
    zona: sesion.zona,
    ciudad: sesion.municipioNombre,
    minutos, monto, medio,
    fecha: new Date(),
  });

  const s = sesion;
  sesion = null;
  actualizarBarra();
  pintarAutoEstacionado();
  cargar(municipioActual);

  $modal.innerHTML = `
    <div class="velo" onclick="if(event.target===this)cerrarPanel()">
      <div class="panel centrado" role="dialog" aria-label="Pago confirmado">
        <div class="tilde">✓</div>
        <h2>¡Pago realizado!</h2>
        <p class="sub">${medio} · Comprobante ${r.comprobante}</p>
        <div class="recibo" style="text-align:left">
          <div class="fila"><span>Zona</span><span>${s.zona}</span></div>
          <div class="fila"><span>Patente</span><span>${s.patente}</span></div>
          <div class="fila"><span>Tiempo</span><span>${minutos} min</span></div>
          <div class="fila total"><span>Pagaste</span><span>${pesos(monto)}</span></div>
        </div>
        <p class="sub">Pagaste solo el tiempo que usaste. ¡Buen viaje!</p>
        <button class="btn-primario" onclick="cerrarPanel()">Listo</button>
      </div>
    </div>`;
}

/* =====================================================
   REPORTE CIUDADANO CON FOTO
   ===================================================== */
function fotoSeleccionada(input){
  const archivo = input.files && input.files[0];
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = e => {
    fotoReporte = e.target.result;
    document.getElementById('repFotoContenedor').innerHTML = `
      <div class="foto-preview">
        <img src="${fotoReporte}" alt="Foto del vehículo reportado">
        <button onclick="quitarFoto()">Cambiar</button>
      </div>`;
  };
  lector.readAsDataURL(archivo);
}

function quitarFoto(){
  fotoReporte = null;
  const inp = document.getElementById('repFotoInput');
  if (inp) inp.value = '';
  document.getElementById('repFotoContenedor').innerHTML = `
    <div class="foto-zona" onclick="document.getElementById('repFotoInput').click()">
      <span class="icono">📷</span>
      Sacar foto del auto
    </div>`;
}

function abrirReporte(zonaPreferida){
  if (!ultimosDatos) return;
  cerrarHoja();
  fotoReporte = null;
  let zonas = ultimosDatos.zonas.map(z => ({...z}));
  if (ubicacion){
    zonas.forEach(z => z.dist = distanciaKm(ubicacion.lat, ubicacion.lng, z.lat, z.lng));
    zonas.sort((a, b) => a.dist - b.dist);
  }
  const preSel = typeof zonaPreferida === 'string' ? zonaPreferida : (zonas[0] && zonas[0].nombre);

  $modal.innerHTML = `
    <div class="velo" onclick="if(event.target===this)cerrarPanel()">
      <div class="panel" role="dialog" aria-label="Reportar vehículo">
        <h2>Reportar vehículo</h2>
        <p class="sub">La app verifica al instante si ese auto está pagando el estacionamiento. Si no registra pago, se genera un acta y se avisa a un inspector para que lo constate en el lugar.</p>
        <div class="campo">
          <label for="repPatente">Patente del vehículo</label>
          <input type="text" id="repPatente" maxlength="8" placeholder="AB 123 CD"
                 oninput="this.value=this.value.toUpperCase();document.getElementById('btnReportar').disabled=this.value.trim().length<6">
        </div>
        <div class="campo">
          <label for="repZona">Zona donde está</label>
          <select id="repZona">
            ${zonas.map(z => `<option value="${z.nombre}" ${z.nombre===preSel?'selected':''}>${z.nombre}${z.dist !== undefined ? ' · a ' + textoDistancia(z.dist) : ''}</option>`).join('')}
          </select>
        </div>
        <div class="campo">
          <label>Foto del vehículo</label>
          <input type="file" id="repFotoInput" accept="image/*" capture="environment" style="display:none" onchange="fotoSeleccionada(this)">
          <div id="repFotoContenedor">
            <div class="foto-zona" onclick="document.getElementById('repFotoInput').click()">
              <span class="icono">📷</span>
              Sacar foto del auto
            </div>
          </div>
        </div>
        <div class="campo">
          <label for="repComentario">Comentario (opcional)</label>
          <textarea id="repComentario" placeholder="Ej: ocupa el lugar hace más de una hora, está sobre la senda peatonal…"></textarea>
        </div>
        <button class="btn-primario" style="background:var(--ambar);color:#3D2F00" id="btnReportar" disabled onclick="enviarReporte()">Verificar patente</button>
        <button class="btn-sec" onclick="cerrarPanel()">Cancelar</button>
      </div>
    </div>`;
  setTimeout(() => document.getElementById('repPatente').focus(), 100);
}

async function enviarReporte(){
  const patente = document.getElementById('repPatente').value.trim().toUpperCase();
  const zona = document.getElementById('repZona').value;
  const comentario = document.getElementById('repComentario').value.trim();

  $modal.innerHTML = `
    <div class="velo">
      <div class="panel">
        <div class="procesando">
          <div class="rueda"></div>
          Verificando la patente ${patente} en el sistema…
        </div>
      </div>
    </div>`;

  const r = await ServidorMunicipal.verificarReporte(municipioActual, zona, patente, comentario, !!fotoReporte);

  if (r.estado === 'pagando'){
    $modal.innerHTML = `
      <div class="velo" onclick="if(event.target===this)cerrarPanel()">
        <div class="panel centrado" role="dialog" aria-label="Resultado de la verificación">
          <div class="tilde alerta">✓</div>
          <h2>Está pagando</h2>
          <div class="resultado-verif ok">${r.mensaje}</div>
          <p class="sub">Gracias igual por avisar: los reportes ayudan a que el sistema funcione para todos.</p>
          <button class="btn-primario" onclick="cerrarPanel()">Entendido</button>
        </div>
      </div>`;
  } else {
    $modal.innerHTML = `
      <div class="velo" onclick="if(event.target===this)cerrarPanel()">
        <div class="panel centrado" role="dialog" aria-label="Acta generada">
          <div class="tilde acta">!</div>
          <h2>Reporte registrado</h2>
          <p class="sub">${r.acta}</p>
          <div class="resultado-verif infraccion">${r.mensaje}</div>
          ${fotoReporte ? `<img class="foto-mini" src="${fotoReporte}" alt="Foto adjunta al acta">` : ''}
          <div class="recibo" style="text-align:left">
            <div class="fila"><span>Patente reportada</span><span>${patente}</span></div>
            <div class="fila"><span>Zona</span><span>${zona}</span></div>
            <div class="fila"><span>Foto</span><span>${fotoReporte ? 'Adjunta al acta ✓' : 'Sin foto'}</span></div>
            <div class="fila"><span>Estado</span><span>Enviado a inspección</span></div>
          </div>
          <p class="sub">Tu reporte es anónimo. La multa solo se aplica si un inspector municipal constata la infracción.</p>
          <button class="btn-primario" onclick="cerrarPanel()">Listo</button>
        </div>
      </div>`;
  }
}

function cerrarPanel(){
  $modal.innerHTML = '';
  fotoReporte = null;
  vistaCuadrasZona = null;
  cuadraElegida = null;
  clearInterval(cronoTimer);
  actualizarBarra();
}

/* =====================================================
   ARRANQUE
   ===================================================== */
$sel.addEventListener('change', () => cambiarMunicipio(true));

(async function iniciar(){
  iniciarMapa();
  completarMapa();
  listaMunicipios = await ServidorMunicipal.listarMunicipios();
  $sel.innerHTML = listaMunicipios.map(m =>
    `<option value="${m.id}">${m.nombre}</option>`).join('');
  const primero = listaMunicipios.find(m => m.id === 'reconquista') || listaMunicipios[0];
  $sel.value = primero.id;
  mapa.setView(primero.centro, 14);
  cargar(primero.id);
  programarRefresco();
})();
