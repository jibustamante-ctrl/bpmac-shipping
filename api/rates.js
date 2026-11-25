// BPMAC — Carrier Service Unificado
// 0. Antes de todo: validación de pedido mínimo por etiqueta (ver validarPedidoMinimo)
// 1. Si hay planchas/perlas EPS (tipo "Aislación Térmica" o vendor ETSA) → tarifa EPS por comuna,
//    SOLO dentro de la Región Metropolitana. Fuera de la RM no se devuelve tarifa EPS ({ rates: [] }):
//    en el perfil de envío «Transporte Carga» de la tienda este carrier es el único, así que el
//    checkout no ofrece despacho y no se puede comprar con despacho en la web.
// 2. Si NO hay EPS y la comuna es RM → despacho propio por zona y PESO TOTAL (Σ grams × cantidad)
// 3. Cualquier otro caso (comuna fuera de cobertura, sin comuna, peso desconocido) →
//    «Despacho a coordinar con tu ejecutivo» (RM) o «Despacho a regiones · por cotizar» (regiones), $0: lo cotiza el ejecutivo.
//    La comuna sale de destination.city o, si falta, del código postal (RM). Región RM sin comuna ni CP → { rates: [] }.
 
// ─── TARIFAS EPS (CLP con IVA incluido) ──────────────────────────────────────
const TARIFAS_EPS = {
  "ALGARROBO": 197000, "ALHUE": 166300, "BATUCO": 29990, "BUCALEMU": 270600,
  "BUIN": 19990, "CALERA DE TANGO": 19990, "CASABLANCA": 174500,
  "CERRILLOS": 14990, "CERRO NAVIA": 19990, "CHEPICA": 263500,
  "CHICUREO": 24990, "CHILLAN": 658200, "CHIMBARONGO": 232200,
  "COLINA": 24990, "COLTAUCO": 219600, "CONCHALI": 14990, "CONCON": 193700,
  "COQUIMBO": 658800, "CURACAVI": 39990, "CURICO": 272800,
  "DONIHUE": 197000, "EL BOSQUE": 14990, "EL MANZANO": 218500,
  "EL MONTE": 39990, "EL QUISCO": 197000, "EL TABO": 197000,
  "ESTACION CENTRAL": 14990, "GRANEROS": 174500, "HUALANE": 349700,
  "HUECHURABA": 14990, "ILLAPEL": 385900, "INDEPENDENCIA": 14990,
  "ISLA DE MAIPO": 39990, "LA CALERA": 203600, "LA CISTERNA": 14990,
  "LA CRUZ": 211900, "LA DEHESA": 29990, "LA ESTRELLA": 272800,
  "LA FLORIDA": 14990, "LA GRANJA": 14990, "LA LIGUA": 219600,
  "LA PINTANA": 14990, "LA REINA": 14990, "LA SERENA": 713700,
  "LAMPA": 21990, "LAS CABRAS": 251400, "LAS CONDES": 14990,
  "LAS CRUCES": 197000, "LAS PATAGUAS": 219600, "LAS VIZCACHAS": 14990,
  "LIMACHE": 187700, "LINARES": 432000, "LIRAY": 39990, "LITUECHE": 263500,
  "LLAYLLAY": 219600, "LO BARNECHEA": 29990, "LO ESPEJO": 14990,
  "LO PRADO": 14990, "LOLOL": 219600, "LOS ANDES": 186600,
  "LOS VILOS": 291700, "MACHALI": 193700, "MACUL": 14990, "MAIPU": 14990,
  "MAITENCILLO": 219600, "MARCHIGUE": 272800, "MARIA PINTO": 39990,
  "MELIPILLA": 39990, "MOLINA": 295300, "MOSTAZAL": 165200,
  "NANCAGUA": 256900, "NAVIDAD": 272800, "NOVICIADO": 21990, "NUNOA": 14990,
  "OLMUE": 193700, "PADRE HURTADO": 21990, "PAINE": 39990,
  "PALMILLA": 273900, "PAPUDO": 272800, "PEDRO AGUIRRE CERDA": 14990,
  "PENAFLOR": 21990, "PENALOLEN": 14990, "PERALILLO": 272800,
  "PEUMO": 256900, "PICHIDEGUA": 219600, "PICHILEMU": 272800,
  "PIRQUE": 29990, "PLACILLA": 242100, "PROVIDENCIA": 14990,
  "PUCHUNCAVI": 215200, "PUDAHUEL": 14990, "PUENTE ALTO": 14990,
  "QUILICURA": 14990, "QUILLOTA": 219600, "QUILPUE": 193200,
  "QUINTA DE TILCOCO": 191000, "QUINTA NORMAL": 14990, "QUINTEROS": 256900,
  "RANCAGUA": 184400, "RAPEL": 219600, "RECOLETA": 14990, "RENACA": 193700,
  "RENCA": 14990, "RENGO": 193700, "REQUINOA": 219600,
  "RINCONADA DE MAIPU": 19990, "SAGRADA FAMILIA": 327200,
  "SAN ANTONIO": 186600, "SAN BERNARDO": 19990,
  "SAN FCO DE MOSTAZAL": 174500, "SAN FELIPE": 196500,
  "SAN FERNANDO": 219600, "SAN JOAQUIN": 14990, "SAN JOSE DE MAIPO": 39990,
  "SAN MIGUEL": 14990, "SAN PEDRO": 202000, "SAN RAMON": 14990,
  "SAN VICENTE DE TT": 251400, "SANTA CRUZ": 272300, "SANTIAGO": 14990,
  "SANTO DOMINGO": 193200, "TALAGANTE": 29990, "TALCA": 327200,
  "TENO": 238800, "TIL TIL": 142700, "VALPARAISO": 193700,
  "VILLA ALEMANA": 193700, "VINA DEL MAR": 193700, "VITACURA": 14990,
  "ZAPALLAR": 228300
};
 
// ─── ZONAS RM ─────────────────────────────────────────────────────────────────
const ZONA1 = [
  "SAN MIGUEL", "PEDRO AGUIRRE CERDA", "LO ESPEJO", "SAN JOAQUIN",
  "MACUL", "NUNOA", "PROVIDENCIA", "SANTIAGO", "ESTACION CENTRAL",
  "CERRILLOS", "LA CISTERNA", "SAN RAMON", "LA GRANJA"
];
const ZONA2 = [
  "LAS CONDES", "VITACURA", "LA REINA", "LA FLORIDA", "PUENTE ALTO",
  "MAIPU", "PUDAHUEL", "QUILICURA", "RECOLETA", "INDEPENDENCIA",
  "CONCHALI", "HUECHURABA", "EL BOSQUE", "LA PINTANA", "SAN BERNARDO",
  "CERRO NAVIA", "LO PRADO", "QUINTA NORMAL", "RENCA", "PENALOLEN",
  "LO BARNECHEA", "LA DEHESA"
];
const ZONA3 = [
  "COLINA", "CHICUREO", "LAMPA", "TIL TIL", "BUIN", "PAINE", "MELIPILLA",
  "TALAGANTE", "PENAFLOR", "ISLA DE MAIPO", "MARIA PINTO",
  "PADRE HURTADO", "EL MONTE", "CALERA DE TANGO", "SAN JOSE DE MAIPO",
  "PIRQUE"
];
 
// ─── TARIFAS RM (CLP neto, sin IVA) — actualizado 11-jul-2026 ────────────────
// "base" es la tarifa del tramo "1 pallet". "extraPorPallet" es el cargo
// POR CADA PALLET ADICIONAL sobre ese primer pallet (se suma, no multiplica).
const TARIFAS_RM = {
  ZONA1: [
    { hasta: 25000,    precio: 3490 },
    { hasta: 40000,    precio: 4490 },
    { hasta: 100000,   precio: 6490 },
    { hasta: 300000,   precio: 9490 },
    { hasta: 900000,   precio: 24990 },
    { hasta: 1800000,  precio: 74990 },
    { hasta: Infinity, base: 74990, extraPorPallet: 10000 }
  ],
  ZONA2: [
    { hasta: 25000,    precio: 3990 },
    { hasta: 40000,    precio: 4990 },
    { hasta: 100000,   precio: 6990 },
    { hasta: 300000,   precio: 9990 },
    { hasta: 900000,   precio: 24990 },
    { hasta: 1800000,  precio: 74990 },
    { hasta: Infinity, base: 74990, extraPorPallet: 10000 }
  ],
  ZONA3: [
    { hasta: 25000,    precio: 6990 },
    { hasta: 40000,    precio: 8990 },
    { hasta: 100000,   precio: 10990 },
    { hasta: 300000,   precio: 14990 },
    { hasta: 900000,   precio: 34990 },
    { hasta: 1800000,  precio: 74990 },
    { hasta: Infinity, base: 74990, extraPorPallet: 10000 }
  ]
};
 
// ─── HELPERS ──────────────────────────────────────────────────────────────────
function normalize(str) {
  return (str || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
 
// Morteros + EIFS + Natstone: HASTA nov-2026 usaban la tarifa plana EPS por comuna
// (agregado ago-2026, sucursal "Materiales de Construccion" ex-EPS). Eso cobraba lo
// mismo por 1 saco de 25 kg que por 20, así que dejaron de ser EPS: ahora van por
// peso (zona RM) o «a coordinar». La lista se conserva solo como referencia y NO se usa.
//
// (Antes, además, se EXCLUÍAN de ese modelo los accesorios EIFS livianos, la membrana
// geotextil y los impermeabilizantes/promotores/accesorios de acabado.)
//   - 8679131382016 Esquinero Malla Fibra de Vidrio PVC para EIFS 2,5 mts
//   - 8679133643008 Perfil Cortagotas con malla para EIFS Natstone 2 mts
//   - 9398209544448 Arandela EIFS para Fijación 5 cm gris 100 un DVP
//   - 9398213116160 Espiga Sujeción Para EIFS Base / Perno Negro 50 UN DVP
//   - 8679137837312 Malla Fibra de Vidrio FLEX 100 grs/m2
//   - 8679164969216 Malla Fibra de Vidrio EXTRA 135 grs/m2
//   - 8679192363264 Malla Fibra de Vidrio SUPER 160 grs/m2
//   - 9438222156032 Membrana Geotextil 40 gr/m2
//   - 9464786845952 Impermeabilizante Bicomponente Natstone TOP-700 Juego 30 KG
//   - 8771457155328 Resina Acuosa de Reparación de Grietas SOS Natstone
//   - 9319432290560 Imprimante NatStone StopFlow 18 Lt
//   - 9028622811392 Cinta para juntas tabiquería 5 cm x 45 mt Natstone
//   - 9441584808192 Promotor de Adherencia Estucos M Juego 30 kg Natstone
//   - 9470937071872 Promotor de Adherencia Bicomponente para Piedras NatStone Juego 30 KG
// eslint-disable-next-line no-unused-vars
const IDS_MORTERO_EIFS_NATSTONE_REFERENCIA = new Set([
  "8679367377152", "8679449821440", "8832759529728", "9167909585152",
  "9385245278464", "9388001001728", "9388002443520", "9429018444032",
  "9167902474496", "9319431831808", "9459425476864",
  "8511495799040", "8900013949184", "8900029219072", "9314060468480",
  "9398234611968", "9404289155328", "8507499053312", "8507527364864",
  "8660564902144", "8660566081792", "8660571259136", "8679118209280",
  "8849842667776",
  "9336608522496", "9358574944512",
  "9489842602240"
]);
 
// EXCLUIDOS explícitamente del modelo EPS aunque matcheen por vendor/tipo
// (ej: vendor "ETSA" que no son planchas/perlas de poliestireno reales).
// Quedan con despacho general (FedEx/BlueExpress fuera de RM, tarifa por
// peso dentro de RM).
//   - 8881357095168 Soporte Base para Tina de Poliestireno (set-2026)
const IDS_EXCLUIDOS_EPS = new Set([
  "8881357095168"
]);
 
// EPS = planchas/perlas de poliestireno: tipo "Aislación Térmica" o vendor ETSA.
// Morteros, adhesivos y sacos NO son EPS: se despachan por peso.
function esEPS(i) {
  if (IDS_EXCLUIDOS_EPS.has(String(i.product_id))) return false;
  return i.product_type === "Aislación Térmica" || i.vendor === "ETSA";
}
function hasEPS(items) {
  return items.some(esEPS);
}

// Peso por defecto de UNA unidad cuando el producto no tiene peso en Shopify (grams = 0). Así un producto sin peso cargado no manda el
// despacho de la RM a «a coordinar»: se calcula la tarifa normal de la zona con este peso mínimo. Se ajusta con DEFAULT_UNIT_GRAMS.
const PESO_MINIMO_UNIDAD = (() => { const n = Number(process.env.DEFAULT_UNIT_GRAMS); return n > 0 ? Math.round(n) : 500; })();

// Peso total del carrito en gramos: Σ grams × cantidad. `grams` es el peso de UNA unidad; una unidad sin peso (grams = 0) pesa el mínimo
// por defecto y se devuelve en `sinPeso` (para registrar su SKU y que alguien le cargue el peso en Shopify).
function pesoTotal(items) {
  let gramos = 0;
  const sinPeso = [];
  for (const i of items) {
    const g = Number(i.grams), q = Number(i.quantity);
    if (!(q > 0)) continue;
    if (!(g > 0)) { sinPeso.push({ sku: i.sku || null, name: i.name || null, variant_id: i.variant_id || null, product_id: i.product_id || null, quantity: q }); gramos += PESO_MINIMO_UNIDAD * q; continue; }
    gramos += g * q;
  }
  return { gramos, sinPeso };
}

// Nombres de comuna que Shopify o el cliente escriben distinto a como están en las tablas.
const ALIAS_COMUNA = {
  "TILTIL": "TIL TIL",
  "SAN FRANCISCO DE MOSTAZAL": "SAN FCO DE MOSTAZAL",
  "SAN VICENTE DE TAGUA TAGUA": "SAN VICENTE DE TT",
  "SAN VICENTE": "SAN VICENTE DE TT",
  "VINA": "VINA DEL MAR",
  "STGO": "SANTIAGO",
  "SANTIAGO CENTRO": "SANTIAGO",
  "COMUNA DE SANTIAGO": "SANTIAGO"
};
// Comunas de la Región Metropolitana (52) y localidades que los clientes escriben como comuna.
// Es la misma lista que usa el agente (eps-tarifas.ts, RM_COMUNAS): si una cambia, cambia la otra.
const RM_COMUNAS = new Set([
  "ALHUE", "BUIN", "CALERA DE TANGO", "CERRILLOS", "CERRO NAVIA", "COLINA", "CONCHALI", "CURACAVI",
  "EL BOSQUE", "EL MONTE", "ESTACION CENTRAL", "HUECHURABA", "INDEPENDENCIA", "ISLA DE MAIPO",
  "LA CISTERNA", "LA FLORIDA", "LA GRANJA", "LA PINTANA", "LA REINA", "LAMPA", "LAS CONDES",
  "LO BARNECHEA", "LO ESPEJO", "LO PRADO", "MACUL", "MAIPU", "MARIA PINTO", "MELIPILLA", "NUNOA",
  "PADRE HURTADO", "PAINE", "PEDRO AGUIRRE CERDA", "PENAFLOR", "PENALOLEN", "PIRQUE", "PROVIDENCIA",
  "PUDAHUEL", "PUENTE ALTO", "QUILICURA", "QUINTA NORMAL", "RECOLETA", "RENCA", "SAN BERNARDO",
  "SAN JOAQUIN", "SAN JOSE DE MAIPO", "SAN MIGUEL", "SAN RAMON", "SANTIAGO", "TALAGANTE", "TILTIL",
  "TIL TIL", "VITACURA",
  "BATUCO", "CHICUREO", "LA DEHESA", "LAS VIZCACHAS", "LIRAY", "NOVICIADO", "RINCONADA DE MAIPU", "EL MANZANO"
]);
// Nombres que son una comuna de la RM y también un lugar de otra región: decide la región.
const NOMBRE_COMPARTIDO = new Set(["SAN PEDRO"]);

// Código postal (7 dígitos) → comuna, solo Región Metropolitana. Misma tabla que el selector de comuna
// del tema (snippet bpmac-location-picker): si una cambia, cambia la otra.
const ZIP_RM = {
  "8900000": "San Miguel",
  "8940000": "San Joaquín",
  "8460000": "Pedro Aguirre Cerda",
  "8780000": "La Granja",
  "8860000": "San Ramón",
  "7970000": "La Cisterna",
  "9120000": "Lo Espejo",
  "8320000": "Santiago",
  "9200000": "Cerrillos",
  "9160000": "Estación Central",
  "8240000": "La Florida",
  "7810000": "Macul",
  "8010000": "El Bosque",
  "7500000": "Providencia",
  "7750000": "Ñuñoa",
  "8980000": "Lo Prado",
  "9080000": "Cerro Navia",
  "8380000": "Independencia",
  "8500000": "Quinta Normal",
  "8820000": "La Pintana",
  "9250000": "Maipú",
  "8050000": "San Bernardo",
  "8420000": "Recoleta",
  "7850000": "La Reina",
  "8540000": "Conchalí",
  "7910000": "Peñalolén",
  "8150000": "Puente Alto",
  "9020000": "Pudahuel",
  "8640000": "Renca",
  "7630000": "Vitacura",
  "7550000": "Las Condes",
  "8580000": "Huechuraba",
  "9710000": "Padre Hurtado",
  "9560000": "Calera de Tango",
  "8700000": "Quilicura",
  "9480000": "Pirque",
  "7690000": "Lo Barnechea",
  "9750000": "Peñaflor",
  "9500000": "Buin",
  "9460000": "San José de Maipo",
  "9670000": "Talagante",
  "9380000": "Lampa",
  "9340000": "Colina",
  "9790000": "Isla de Maipo",
  "9540000": "Paine",
  "9810000": "El Monte",
  "9630000": "Curacaví",
  "9620000": "María Pinto",
  "9420000": "Tiltil",
  "9580000": "Melipilla",
  "9650000": "Alhué",
  "9660000": "San Pedro"
};

// Código postal de la dirección en 7 dígitos (Shopify puede traerlo con espacios o guion); null si no sirve.
function zipDe(destination) {
  const z = String((destination && destination.zip) || (destination && destination.postal_code) || "").replace(/\D/g, "");
  return z.length === 7 ? z : null;
}

// La región que trae la dirección: «RM» (código de Shopify) o «Región Metropolitana de Santiago»;
// null si no dice; otro nombre («Valparaíso», «VS»…) tal cual, normalizado.
function regionDe(destination) {
  const r = normalize(destination && destination.province);
  if (!r) return null;
  return r === "RM" || r.includes("METROPOLITANA") ? "RM" : r;
}

function comunaDe(destination) {
  const c = normalize(destination && destination.city);
  return ALIAS_COMUNA[c] || c;
}

// Resuelve el destino: comuna (la escrita, o la deducida del código postal si falta o no se reconoce),
// si está en la RM y, si es RM sin comuna conocida, `rmSinComuna` (no se puede calcular tarifa).
function resolverDestino(destination) {
  const region = regionDe(destination);
  const zip = zipDe(destination);
  const comunaZip = zip && ZIP_RM[zip] ? normalize(ZIP_RM[zip]) : null;
  let comuna = comunaDe(destination);
  const reconocida = RM_COMUNAS.has(comuna) || ALIAS_COMUNA[comuna] !== undefined || TARIFAS_EPS[comuna] !== undefined;
  if (comunaZip && (!comuna || !reconocida)) comuna = ALIAS_COMUNA[comunaZip] || comunaZip;
  // RM: la comuna es de la RM y la región, si la trae, también. «San Pedro» existe en otra región: la decide
  // la región, o el CP si no hay región.
  const comunaEsRM = NOMBRE_COMPARTIDO.has(comuna) ? (region === "RM" || (region === null && comunaZip === comuna)) : RM_COMUNAS.has(comuna);
  const rm = comunaEsRM && (region === null || region === "RM");
  // Región RM pero sin comuna utilizable (vacía o no reconocida): no se sabe qué tarifa corresponde.
  const rmSinComuna = region === "RM" && !rm && (!comuna || !reconocida);
  return { comuna, rm, rmSinComuna, region };
}

// Sin tarifa que se pueda calcular de verdad: el despacho lo cotiza el ejecutivo (no se deja al cliente sin opción). El nombre depende
// del destino: dentro de la RM «a coordinar con tu ejecutivo»; en regiones «por cotizar». Nunca «se cobra aparte».
const DESCRIPCION_A_COORDINAR = "Tu ejecutivo te envía el valor del flete por WhatsApp antes de despachar.";
function tarifaACoordinar(enRM) {
  return {
    service_name: enRM ? "Despacho a coordinar con tu ejecutivo" : "Despacho a regiones · por cotizar",
    service_code: "A_COORDINAR",
    total_price: "0",
    currency: "CLP",
    min_delivery_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    max_delivery_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    description: DESCRIPCION_A_COORDINAR
  };
}
 
function getZona(comuna) {
  const c = ALIAS_COMUNA[normalize(comuna)] || normalize(comuna);
  if (ZONA1.includes(c)) return "ZONA1";
  if (ZONA2.includes(c)) return "ZONA2";
  if (ZONA3.includes(c)) return "ZONA3";
  return null;
}
 
function calcularTarifaRM(zona, pesoGramos) {
  for (const tramo of TARIFAS_RM[zona]) {
    if (pesoGramos <= tramo.hasta) {
      if (tramo.precio !== undefined) return tramo.precio;
      if (tramo.base !== undefined) {
        // 1 pallet = 1.800.000 g. El primer pallet ya está cubierto por "base".
        // Cada pallet ADICIONAL sobre el primero suma extraPorPallet (no multiplica el total).
        const pallets = Math.ceil(pesoGramos / 1800000);
        const palletsExtra = Math.max(0, pallets - 1);
        return tramo.base + (palletsExtra * tramo.extraPorPallet);
      }
    }
  }
  return null;
}
 
function descripcionRM(pesoGramos) {
  if (pesoGramos <= 25000)   return "Tiempo de envío aproximado | Coordina con tu ejecutivo";
  if (pesoGramos <= 40000)   return "Tiempo de envío aproximado | Coordina con tu ejecutivo";
  if (pesoGramos <= 300000)  return "Tiempo de envío aproximado | Coordina con tu ejecutivo";
  if (pesoGramos <= 900000)  return `½ pallet (${(pesoGramos/1000).toFixed(0)} kg) · Entrega coordinada`;
  if (pesoGramos <= 1800000) return "1 pallet completo · Entrega coordinada";
  return `${Math.ceil(pesoGramos/1800000)} pallets · Camión externo · Entrega coordinada`;
}
 
// ─── PEDIDO MÍNIMO (validación real en el checkout) ───────────────────────────
// Los productos se identifican SOLO por etiqueta (nunca por ID), para sumar
// productos nuevos basta con etiquetarlos en Shopify.
//   compra-minima-eps : suma(precio × cantidad) de esas líneas >= $180.000 con IVA
//   pedido-minimo-10  : suma de unidades de esas líneas >= MIN_BOLSAS (10)
// Si no se cumple, se responde { rates: [] } → no hay despacho → no se puede pagar.
const TAG_MIN_EPS = "compra-minima-eps";
const TAG_MIN_BOLSAS = "pedido-minimo-10";
const MIN_EPS_CLP_CON_IVA = 180000;
const MIN_BOLSAS = 10;
const IVA = 1.19;

// item.price de Shopify llega en "centavos" (CLP × 100). Por defecto se asume que
// incluye IVA (la tienda tiene taxesIncluded = true). Si un callback real demostrara
// que llega neto, definir PRICES_INCLUDE_TAX=false en Vercel y se compara contra 180000/1.19.
function minEpsEnCentavos() {
  const conIva = process.env.PRICES_INCLUDE_TAX !== "false";
  const clp = conIva ? MIN_EPS_CLP_CON_IVA : MIN_EPS_CLP_CON_IVA / IVA;
  return Math.round(clp * 100);
}

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || "87bd18-3.myshopify.com";
const ADMIN_API_VERSION = "2025-10";
const TAGS_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;
const TOKEN_RENEW_MARGIN_MS = 5 * 60 * 1000; // se renueva 5 min antes de que expire
const tagsCache = new Map(); // product_id (string) -> { tags: string[], ts: number }
let tokenCache = null;       // { token, expiresAt }

async function fetchJson(url, init) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status} en ${new URL(url).pathname}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

// Token de la app "BPMAC EPS Shipping" (Dev Dashboard) con client credentials grant.
// Requiere SHOPIFY_CLIENT_ID y SHOPIFY_CLIENT_SECRET en Vercel. Dura ~24 h; se cachea y renueva.
async function getAdminToken() {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt - TOKEN_RENEW_MARGIN_MS) return tokenCache.token;
  const { SHOPIFY_CLIENT_ID: id, SHOPIFY_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) throw new Error("Faltan SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET");
  const body = await fetchJson(`https://${SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: "client_credentials" })
  });
  if (!body.access_token) throw new Error("La respuesta de token no trae access_token");
  tokenCache = { token: body.access_token, expiresAt: now + (Number(body.expires_in) || 86399) * 1000 };
  return tokenCache.token;
}

// Devuelve Map<product_id, Set<tag en minúsculas>>. Usa caché de ~10 min y solo
// consulta a Shopify los IDs que faltan. Si la consulta falla, usa el caché vencido
// si existe; si no, devuelve null (fail-open: el llamador no bloquea).
async function getTagsByProduct(productIds) {
  const now = Date.now();
  const missing = productIds.filter(id => {
    const c = tagsCache.get(id);
    return !c || now - c.ts > TAGS_TTL_MS;
  });

  if (missing.length) {
    try {
      const token = await getAdminToken();
      const body = await fetchJson(`https://${SHOP_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({
          query: "query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id tags } } }",
          variables: { ids: missing.map(id => `gid://shopify/Product/${id}`) }
        })
      });
      if (body.errors) {
        // Token rechazado: se descarta para pedir uno nuevo en la próxima llamada
        tokenCache = null;
        throw new Error(`Admin API errors: ${JSON.stringify(body.errors)}`);
      }
      const seen = new Set();
      for (const n of body.data.nodes) {
        if (!n || !n.id) continue;
        const id = n.id.split("/").pop();
        tagsCache.set(id, { tags: (n.tags || []).map(t => t.toLowerCase()), ts: now });
        seen.add(id);
      }
      // IDs que Shopify no devolvió (producto borrado): se cachean sin etiquetas
      for (const id of missing) if (!seen.has(id)) tagsCache.set(id, { tags: [], ts: now });
    } catch (err) {
      if (/HTTP 401/.test(String(err.message))) tokenCache = null;
      const sinCache = missing.filter(id => !tagsCache.has(id));
      console.error(JSON.stringify({
        event: "TAGS_LOOKUP_FAILED", error: String(err.message || err),
        product_ids: missing, sin_cache: sinCache
      }));
      if (sinCache.length) return null;
    }
  }

  const out = new Map();
  for (const id of productIds) out.set(id, new Set((tagsCache.get(id) || { tags: [] }).tags));
  return out;
}

// Devuelve null si se cumplen las reglas, o un objeto { rule, ... } con el rechazo.
async function validarPedidoMinimo(items) {
  // Precio SIN descuento (el payload de tarifas no trae descuentos); el tema calcula igual.
  const ids = [...new Set(items.map(i => String(i.product_id)))];
  const tags = await getTagsByProduct(ids);
  if (!tags) return { rechazo: null, conEtiquetas: false }; // fail-open

  const lineasEps = items.filter(i => tags.get(String(i.product_id)).has(TAG_MIN_EPS));
  const lineas6 = items.filter(i => tags.get(String(i.product_id)).has(TAG_MIN_BOLSAS));
  const conEtiquetas = lineasEps.length > 0 || lineas6.length > 0;
  if (lineasEps.length) {
    const totalCent = lineasEps.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
    const minCent = minEpsEnCentavos();
    if (totalCent < minCent) {
      return { conEtiquetas, rechazo: {
        rule: TAG_MIN_EPS,
        monto_clp: Math.round(totalCent / 100),
        minimo_clp: Math.round(minCent / 100),
        faltante_clp: Math.round((minCent - totalCent) / 100),
        product_ids: [...new Set(lineasEps.map(i => String(i.product_id)))]
      } };
    }
  }

  if (lineas6.length) {
    const bolsas = lineas6.reduce((s, i) => s + Number(i.quantity), 0);
    if (bolsas < MIN_BOLSAS) {
      return { conEtiquetas, rechazo: {
        rule: TAG_MIN_BOLSAS,
        cantidad: bolsas,
        minimo: MIN_BOLSAS,
        faltante: MIN_BOLSAS - bolsas,
        product_ids: [...new Set(lineas6.map(i => String(i.product_id)))]
      } };
    }
  }
  return { rechazo: null, conEtiquetas };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Shopify-Shop-Domain");
 
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });
 
  try {
    const { rate } = req.body;
    const { destination, items } = rate;
    const dest = resolverDestino(destination);
    const comunaNorm = dest.comuna;
    // Nombre para mostrar: lo que escribió el cliente o, si faltaba, la comuna deducida del código postal.
    const ciudad = (destination && destination.city) || (dest.rm ? (ZIP_RM[zipDe(destination)] || comunaNorm) : "");
 
    // ── PEDIDO MÍNIMO: si no se cumple, sin tarifas → no se puede pagar ──
    // MIN_ORDER_ENFORCE=true bloquea; cualquier otro valor = modo observación (solo log).
    const enforce = process.env.MIN_ORDER_ENFORCE === "true";
    const { rechazo, conEtiquetas: carritoConEtiquetas } = await validarPedidoMinimo(items);
    if (rechazo || carritoConEtiquetas) {
      // Se registran los ítems crudos y el destino sin datos personales (nombre, dirección, teléfono).
      console.log(JSON.stringify({
        event: rechazo ? (enforce ? "MIN_ORDER_REJECT" : "MIN_ORDER_WOULD_REJECT") : "MIN_ORDER_OBSERVE_OK",
        enforce, comuna: ciudad, region: destination.province, currency: rate.currency,
        raw_items: items, ...(rechazo || {})
      }));
    }
    if (rechazo && enforce) return res.status(200).json({ rates: [] });
 
    const log = (event, extra) => console.log(JSON.stringify({ event, comuna: ciudad, region: destination && destination.province, ...extra }));

    // ── CASO 1: Carrito con planchas/perlas EPS → tarifa EPS por comuna ──
    if (hasEPS(items)) {
      // EPS solo se despacha dentro de la RM: fuera de ella, sin tarifa (y sin «a coordinar»): no se compra con despacho.
      const tarifa = dest.rm ? TARIFAS_EPS[comunaNorm] : undefined;
      if (!tarifa) {
        log("EPS_FUERA_DE_LA_RM", { rm: dest.rm });
        return res.status(200).json({ rates: [] });
      }
      return res.status(200).json({
        rates: [{
          service_name: `Envío EPS a ${ciudad}`,
          service_code: "EPS_FLETE",
          total_price: String(tarifa * 100),
          currency: "CLP",
          min_delivery_date: new Date(Date.now() + 4 * 86400000).toISOString(),
          max_delivery_date: new Date(Date.now() + 7 * 86400000).toISOString(),
          description: "Precio fijo por comuna | Despacho por Transporte de Carga | IVA incluido."
        }]
      });
    }

    // ── RM sin comuna (ni deducible del CP): no se devuelve la tarifa de regiones ni $0 → sin tarifas
    //    hasta que el cliente indique comuna o código postal. ──
    if (dest.rmSinComuna) {
      log("RM_SIN_COMUNA", { zip: zipDe(destination) });
      return res.status(200).json({ rates: [] });
    }

    // ── CASO 2: Sin EPS, comuna RM → despacho propio por zona y peso total ──
    const zona = getZona(comunaNorm);
    if (zona) {
      const { gramos, sinPeso } = pesoTotal(items);
      // Producto sin peso en Shopify: se calcula con el peso mínimo por unidad y se registra el SKU para cargarle el peso.
      if (sinPeso.length > 0) log("SIN_PESO", { peso_minimo_unidad: PESO_MINIMO_UNIDAD, gramos, items: sinPeso });
      const tarifa = calcularTarifaRM(zona, gramos);
      if (!tarifa) return res.status(200).json({ rates: [tarifaACoordinar(true)] });
      const zonaLabel = zona === "ZONA1" ? "Zona 1" : zona === "ZONA2" ? "Zona 2" : "Zona 3";
      return res.status(200).json({
        rates: [{
          service_name: `Despacho BPMAC · ${ciudad} (${zonaLabel})`,
          service_code: `BPMAC_RM_${zona}`,
          total_price: String(tarifa * 100),
          currency: "CLP",
          min_delivery_date: new Date(Date.now() + 1 * 86400000).toISOString(),
          max_delivery_date: new Date(Date.now() + 4 * 86400000).toISOString(),
          description: descripcionRM(gramos)
        }]
      });
    }

    // ── CASO 3: Sin EPS y comuna sin zona (regiones, comuna vacía o desconocida) → a coordinar ──
    log("FUERA_DE_COBERTURA");
    return res.status(200).json({ rates: [tarifaACoordinar(Boolean(dest.rm))] });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno" });
  }
}
