/* =====================================================
   SERVIDOR FICTICIO PROVINCIAL
   ===================================================== */
const ServidorMunicipal = (() => {

  const CIUDADES = [
    ['rosario','Rosario',-32.9468,-60.6393,800,3.0],
    ['santafe','Santa Fe Capital',-31.6333,-60.7000,750,2.4],
    ['rafaela','Rafaela',-31.2503,-61.4867,650,1.4],
    ['venadotuerto','Venado Tuerto',-33.7458,-61.9689,600,1.2],
    ['reconquista','Reconquista',-29.1500,-59.6500,550,1.0],
    ['santotome','Santo Tomé',-31.6630,-60.7650,550,1.0],
    ['vggalvez','Villa Gobernador Gálvez',-33.0300,-60.6300,550,1.0],
    ['sanlorenzo','San Lorenzo',-32.7500,-60.7300,600,1.0],
    ['esperanza','Esperanza',-31.4500,-60.9300,500,0.9],
    ['casilda','Casilda',-33.0500,-61.1700,500,0.8],
    ['canadadegomez','Cañada de Gómez',-32.8200,-61.4000,500,0.8],
    ['firmat','Firmat',-33.4600,-61.4800,450,0.7],
    ['sunchales','Sunchales',-30.9400,-61.5600,500,0.7],
    ['villaconstitucion','Villa Constitución',-33.2300,-60.3300,500,0.8],
    ['avellaneda','Avellaneda',-29.1200,-59.6600,450,0.7],
    ['funes','Funes',-32.9200,-60.8100,550,0.8],
    ['perez','Pérez',-32.9980,-60.7700,450,0.6],
    ['capitanbermudez','Capitán Bermúdez',-32.8200,-60.7200,500,0.7],
    ['baigorria','Granadero Baigorria',-32.8500,-60.7100,500,0.7],
    ['sanjusto','San Justo',-30.7900,-60.5900,450,0.6],
    ['galvez','Gálvez',-32.0300,-61.2200,450,0.6],
    ['rufino','Rufino',-34.2700,-62.7100,450,0.6],
    ['arroyoseco','Arroyo Seco',-33.1500,-60.5100,450,0.6],
  ];

  const PLANTILLA_GRANDE = [
    ['Centro','Zona bancaria y comercial',160,0,0],
    ['Microcentro Norte','Peatonal y galerías',110,0.008,0.004],
    ['Zona Tribunales','Juzgados y oficinas públicas',90,-0.006,0.007],
    ['Costanera / Parque','Paseo y gastronomía',70,0.012,-0.010],
  ];
  const PLANTILLA_MEDIA = [
    ['Centro','Plaza principal y comercios',120,0,0],
    ['Zona comercial','Avenida principal',80,0.007,0.005],
    ['Terminal','Estación de ómnibus',60,-0.008,0.006],
  ];
  const PLANTILLA_CHICA = [
    ['Centro','Plaza principal',90,0,0],
    ['Zona comercial','Calle principal',60,0.006,0.005],
  ];

  const MUNICIPIOS = CIUDADES.map(([id, nombre, lat, lng, tarifaHora, escala]) => {
    const plantilla = escala >= 2 ? PLANTILLA_GRANDE : escala >= 0.9 ? PLANTILLA_MEDIA : PLANTILLA_CHICA;
    return {
      id, nombre: nombre + ', Santa Fe', centro:[lat, lng], tarifaHora,
      zonas: plantilla.map(([zn, ref, cap, dlat, dlng]) =>
        [zn, ref, Math.round(cap * escala), lat + dlat, lng + dlng]),
    };
  });

  const estado = {};
  MUNICIPIOS.forEach(m => {
    estado[m.id] = m.zonas.map(([nombre, ref, capacidad, lat, lng]) => {
      const plazas = [];
      const POR_CUADRA_BRUTO = 20;
      const nCuadras = Math.ceil(capacidad / 15);
      for (let c = 0; c < nCuadras; c++){
        const accesos = 2 + Math.floor(Math.random() * 4);
        const medidosCuadra = POR_CUADRA_BRUTO - accesos;
        const ocupacionInicial = 0.35 + Math.random() * 0.4;
        for (let k = 0; k < medidosCuadra; k++){
          plazas.push({
            cuadra: c,
            ocupado: Math.random() < ocupacionInicial,
            pago: false,
          });
        }
      }
      return {
        nombre, ref, lat, lng,
        plazas,
        get capacidad(){ return this.plazas.length; },
        get libres(){ return this.plazas.reduce((s, p) => s + (p.ocupado ? 0 : 1), 0); },
        spots: null,
      };
    });
  });

  function construirSpotsSobreCalles(z, ways){
    const spots = [];
    const cuadras = [];
    const escLng = Math.cos(z.lat * Math.PI / 180);
    const SEP = 0.000082;
    const OFF = 0.000042;
    const d2 = p => (p.lat - z.lat) ** 2 + ((p.lon - z.lng) * escLng) ** 2;

    const segs = [];
    ways.forEach(w => {
      const g = w.geometry || [];
      const nom = (w.tags && w.tags.name) || null;
      for (let i = 0; i < g.length - 1; i++) segs.push([g[i], g[i + 1], nom]);
    });
    segs.sort((a, b) => d2(a[0]) - d2(b[0]));

    for (const [p1, p2, nomCalle] of segs){
      if (spots.length >= z.capacidad) break;
      const dLat = p2.lat - p1.lat;
      const dLng = p2.lon - p1.lon;
      const largo = Math.sqrt(dLat * dLat + (dLng * escLng) ** 2);
      const n = Math.floor(largo / SEP);
      if (n < 2) continue;
      const angRad = Math.atan2(-dLat, dLng * escLng);
      const angDeg = angRad * 180 / Math.PI;
      const pLat = Math.cos(angRad) * OFF;
      const pLng = Math.sin(angRad) * OFF / escLng;
      const desde = spots.length;
      for (let j = 1; j < n && spots.length < z.capacidad; j++){
        const t = j / n;
        spots.push({
          lat: p1.lat + dLat * t + pLat,
          lng: p1.lon + dLng * t + pLng,
          ang: angDeg,
          i: spots.length,
        });
      }
      if (spots.length > desde){
        cuadras.push({
          a: [p1.lat, p1.lon],
          b: [p2.lat, p2.lon],
          nombre: nomCalle,
          desde, hasta: spots.length,
        });
      }
    }
    z.cuadras = cuadras;
    return spots.length ? spots : null;
  }

  const ESPEJOS_OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];

  async function traerCalles(lat, lng){
    const consulta = `[out:json][timeout:12];way(around:280,${lat},${lng})["highway"~"^(residential|tertiary|secondary|primary|unclassified|living_street)$"];out geom;`;
    for (const base of ESPEJOS_OVERPASS){
      try {
        const control = new AbortController();
        const tope = setTimeout(() => control.abort(), 7000);
        const resp = await fetch(base + '?data=' + encodeURIComponent(consulta), { signal: control.signal });
        clearTimeout(tope);
        if (!resp.ok) continue;
        const json = await resp.json();
        if (json.elements && json.elements.length) return json.elements;
      } catch (e){ }
    }
    return null;
  }

  let modoAproximado = false;
  const preparando = {};
  async function prepararCiudad(id){
    return Promise.resolve();
  }

  function reintentarCalles(id){}

  setInterval(() => {
    Object.values(estado).forEach(zonas => {
      zonas.forEach(z => {
        const mov = Math.max(1, Math.round(z.plazas.length * 0.025));
        for (let i = 0; i < mov; i++){
          const p = z.plazas[Math.floor(Math.random() * z.plazas.length)];
          if (p.ocupado){
            p.ocupado = false; p.pago = false;
          } else {
            p.ocupado = true; p.pago = true;
          }
        }
      });
    });
  }, 4000);

  const latencia = () => 400 + Math.random() * 900;
  let contadorOperacion = 4720;
  let contadorActa = 1180;

  return {
    reintentarCalles,
    listarMunicipios(){
      return new Promise(res => setTimeout(() =>
        res(MUNICIPIOS.map(({id, nombre, centro, tarifaHora}) => ({id, nombre, centro, tarifaHora}))), latencia()));
    },
    consultarDisponibilidad(id){
      const m = MUNICIPIOS.find(x => x.id === id);
      return new Promise(async res => {
        await prepararCiudad(id);
        setTimeout(() =>
          res({
            municipio: id,
            tarifaHora: m.tarifaHora,
            hora: new Date().toISOString(),
            aproximado: modoAproximado,
            zonas: estado[id].map(z => {
              const ocupacion = 1 - z.libres / z.capacidad;
              const factor = 0.8 + ocupacion * 0.5;
              const tarifa = Math.round(m.tarifaHora * factor / 50) * 50;
              return {...z, tarifa};
            }),
          }), latencia());
      });
    },
    iniciarSesion(municipioId, zonaNombre, patente){
      return new Promise(res => setTimeout(() => {
        const z = estado[municipioId].find(x => x.nombre === zonaNombre);
        let lugarIdx = -1;
        if (z){
          lugarIdx = z.plazas.findIndex(x => !x.ocupado);
          if (lugarIdx >= 0){ z.plazas[lugarIdx].ocupado = true; z.plazas[lugarIdx].pago = true; }
        }
        res({ ok:true, inicio: Date.now(), lugarIdx });
      }, latencia()));
    },
    cobrar(municipioId, zonaNombre, minutos, monto, medio, lugarIdx){
      return new Promise(res => setTimeout(() => {
        const z = estado[municipioId].find(x => x.nombre === zonaNombre);
        if (z){
          const p = (lugarIdx >= 0 && z.plazas[lugarIdx]) ? z.plazas[lugarIdx] : z.plazas.find(x => x.ocupado);
          if (p){ p.ocupado = false; p.pago = false; }
        }
        res({
          ok:true,
          comprobante:'HL-' + (contadorOperacion++),
          hora:new Date().toISOString(),
        });
      }, 1400 + Math.random() * 1200));
    },
    verificarReporte(municipioId, zonaNombre, patente, comentario, tieneFoto){
      return new Promise(res => setTimeout(() => {
        const estaPagando = Math.random() < 0.35;
        if (estaPagando){
          const min = 5 + Math.floor(Math.random() * 80);
          res({
            estado:'pagando',
            mensaje:`La patente ${patente} tiene una sesión activa en ${zonaNombre} desde hace ${min} minutos. Está todo en orden.`,
          });
        } else {
          res({
            estado:'infraccion',
            acta:'ACTA-SF-' + (contadorActa++),
            mensaje:`La patente ${patente} no registra pago activo en ${zonaNombre}. Se generó el acta y se notificó al cuerpo de inspectores del municipio para verificar en el lugar.`,
          });
        }
      }, 1600 + Math.random() * 1400));
    },
  };
})();
