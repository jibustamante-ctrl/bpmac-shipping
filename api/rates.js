// BPMAC — Carrier Service Unificado
// 1. Si hay EPS → tarifas EPS por comuna (todo Chile)
// 2. Si NO hay EPS y comuna es RM → tarifas despacho propio por zona + peso
// 3. Cualquier otro caso → sin tarifa (FedEx/BlueExpress)

// ─── TARIFAS EPS (CLP con IVA incluido) ──────────────────────────────────────
const TARIFAS_EPS = {
  "ALGARROBO": 197000, "ALHUE": 166300, "BATUCO": 36533, "BUCALEMU": 270600,
  "BUIN": 19990, "CALERA DE TANGO": 19990, "CASABLANCA": 174500,
  "CERRILLOS": 19990, "CERRO NAVIA": 19990, "CHEPICA": 263500,
  "CHICUREO": 24990, "CHILLAN": 658200, "CHIMBARONGO": 232200,
  "COLINA": 24990, "COLTAUCO": 219600, "CONCHALI": 14990, "CONCON": 193700,
  "COQUIMBO": 658800, "CURACAVI": 39990, "CURICO": 272800,
  "DONIHUE": 197000, "EL BOSQUE": 14990, "EL MANZANO": 218500,
  "EL MONTE": 39990, "EL QUISCO": 197000, "EL TABO": 197000,
  "ESTACION CENTRAL": 14990, "GRANEROS": 174500, "HUALANE": 349700,
  "HUECHURABA": 14990, "ILLAPEL": 385900, "INDEPENDENCIA": 14990,
  "ISLA DE MAIPO": 109004, "LA CALERA": 203600, "LA CISTERNA": 14990,
  "LA CRUZ": 211900, "LA DEHESA": 29990, "LA ESTRELLA": 272800,
  "LA FLORIDA": 14990, "LA GRANJA": 14972, "LA LIGUA": 219600,
  "LA PINTANA": 67235, "LA REINA": 14990, "LA SERENA": 713700,
  "LAMPA": 55454, "LAS CABRAS": 251400, "LAS CONDES": 14990,
  "LAS CRUCES": 197000, "LAS PATAGUAS": 219600, "LAS VIZCACHAS": 14990,
  "LIMACHE": 187700, "LINARES": 432000, "LIRAY": 79600, "LITUECHE": 263500,
  "LLAYLLAY": 219600, "LO BARNECHEA": 29990, "LO ESPEJO": 14990,
  "LO PRADO": 14990, "LOLOL": 219600, "LOS ANDES": 186600,
  "LOS VILOS": 291700, "MACHALI": 193700, "MACUL": 14990, "MAIPU": 14990,
  "MAITENCILLO": 219600, "MARCHIGUE": 272800, "MARIA PINTO": 142700,
  "MELIPILLA": 196588, "MOLINA": 295300, "MOSTAZAL": 165200,
  "NANCAGUA": 256900, "NAVIDAD": 272800, "NOVICIADO": 82229, "NUNOA": 14990,
  "OLMUE": 193700, "PADRE HURTADO": 82229, "PAINE": 130662,
  "PALMILLA": 273900, "PAPUDO": 272800, "PEDRO AGUIRRE CERDA": 14990,
  "PENAFLOR": 29990, "PENALOLEN": 14990, "PERALILLO": 272800,
  "PEUMO": 256900, "PICHIDEGUA": 219600, "PICHILEMU": 272800,
  "PIRQUE": 29990, "PLACILLA": 242100, "PROVIDENCIA": 14990,
  "PUCHUNCAVI": 215200, "PUDAHUEL": 14990, "PUENTE ALTO": 14990,
  "QUILICURA": 14990, "QUILLOTA": 219600, "QUILPUE": 193200,
  "QUINTA DE TILCOCO": 191000, "QUINTA NORMAL": 14990, "QUINTEROS": 256900,
  "RANCAGUA": 184400, "RAPEL": 219600, "RECOLETA": 14990, "RENACA": 193700,
  "RENCA": 14990, "RENGO": 193700, "REQUINOA": 219600,
  "RINCONADA DE MAIPU": 94724, "SAGRADA FAMILIA": 327200,
  "SAN ANTONIO": 186600, "SAN BERNARDO": 67235,
  "SAN FCO DE MOSTAZAL": 174500, "SAN FELIPE": 196500,
  "SAN FERNANDO": 219600, "SAN JOAQUIN": 14990, "SAN JOSE DE MAIPO": 82229,
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

function hasEPS(items) {
  return items.some(i => i.product_type === "Aislación Térmica" || i.vendor === "ETSA");
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
