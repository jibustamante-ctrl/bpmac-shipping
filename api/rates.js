// BPMAC — Carrier Service Unificado
// 1. Si hay EPS → tarifas EPS por comuna (todo Chile)
// 2. Si NO hay EPS y comuna es RM → tarifas despacho propio por zona + peso
// 3. Cualquier otro caso → sin tarifa (FedEx/BlueExpress)
// 0. Antes de todo: validación de pedido mínimo por etiqueta (ver validarPedidoMinimo)
 
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
 
// Morteros + EIFS + Natstone: usan la misma tarifa plana por comuna que EPS
// (agregado ago-2026, sucursal "Materiales de Construccion" ex-EPS)
//
// EXCLUIDOS a propósito (set-2026): accesorios EIFS livianos, la membrana
// geotextil, y los impermeabilizantes/promotores/accesorios de acabado.
// Son artículos de bajo peso que no requieren camión de carga; forzarlos
// a la tarifa plana EPS daba fletes irracionales (ej: geotextil de 2 kg
// pagando la misma tarifa que un despacho de sacos de mortero). Quedan
// fuera del modelo EPS: usan despacho normal (FedEx/BlueExpress fuera de
// RM, tarifa por peso dentro de RM).
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
const IDS_MORTERO_EIFS_NATSTONE = new Set([
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
 
function hasEPS(items) {
  return items.some(i => {
    if (IDS_EXCLUIDOS_EPS.has(String(i.product_id))) return false;
    return (
      i.product_type === "Aislación Térmica" ||
      i.vendor === "ETSA" ||
      IDS_MORTERO_EIFS_NATSTONE.has(String(i.product_id))
    );
  });
}
 
function getZona(comuna) {
  const c = normalize(comuna);
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
//   pedido-minimo-6   : suma de unidades de esas líneas >= 6
// Si no se cumple, se responde { rates: [] } → no hay despacho → no se puede pagar.
const TAG_MIN_EPS = "compra-minima-eps";
const TAG_MIN_6   = "pedido-minimo-6";
const MIN_EPS_CLP_CON_IVA = 180000;
const MIN_BOLSAS = 6;
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
  const lineas6 = items.filter(i => tags.get(String(i.product_id)).has(TAG_MIN_6));
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
        rule: TAG_MIN_6,
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
    const ciudad = destination.city || "";
    const comunaNorm = normalize(ciudad);
 
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
 
    // ── CASO 1: Carrito con EPS → tarifas EPS ────────────────────────────
    if (hasEPS(items)) {
      const tarifa = TARIFAS_EPS[comunaNorm];
      if (!tarifa) return res.status(200).json({ rates: [] });
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
 
    // ── CASO 2: Sin EPS, comuna RM → tarifas despacho propio ─────────────
    const zona = getZona(ciudad);
    if (zona) {
      const pesoTotal = items.reduce((sum, i) => sum + ((i.grams || 0) * i.quantity), 0);
      const tarifa = calcularTarifaRM(zona, pesoTotal);
      if (!tarifa) return res.status(200).json({ rates: [] });
      const zonaLabel = zona === "ZONA1" ? "Zona 1" : zona === "ZONA2" ? "Zona 2" : "Zona 3";
      return res.status(200).json({
        rates: [{
          service_name: `Despacho BPMAC · ${ciudad} (${zonaLabel})`,
          service_code: `BPMAC_RM_${zona}`,
          total_price: String(tarifa * 100),
          currency: "CLP",
          min_delivery_date: new Date(Date.now() + 1 * 86400000).toISOString(),
          max_delivery_date: new Date(Date.now() + 4 * 86400000).toISOString(),
          description: descripcionRM(pesoTotal)
        }]
      });
    }
 
    // ── CASO 3: Fuera de RM sin EPS → FedEx/BlueExpress ──────────────────
    return res.status(200).json({ rates: [] });
 
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno" });
  }
}
 
 
 



