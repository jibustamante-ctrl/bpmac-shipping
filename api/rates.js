const TARIFAS = {
  "BATUCO": 30700, "BUIN": 121300, "CERRILLOS": 70200, "CERRO NAVIA": 65800,
  "CHICUREO": 46600, "COLINA": 30700, "CONCHALI": 40000, "EL BOSQUE": 78500,
  "EL MONTE": 133400, "ESTACION CENTRAL": 56500, "HUECHURABA": 46600,
  "INDEPENDENCIA": 51000, "ISLA DE MAIPO": 133400, "LA CISTERNA": 70200,
  "LA DEHESA": 70200, "LA FLORIDA": 85000, "LA GRANJA": 81800,
  "LA PINTANA": 91600, "LA REINA": 66900, "LAMPA": 46600, "LAS CONDES": 62500,
  "LAS VIZCACHAS": 121300, "LO BARNECHEA": 69100, "LO ESPEJO": 66900,
  "LO PRADO": 56500, "MACUL": 65800, "MAIPU": 75700, "MELIPILLA": 165200,
  "NOVICIADO": 85000, "NUNOA": 62500, "PADRE HURTADO": 93800, "PAINE": 121300,
  "PEDRO AGUIRRE CERDA": 62500, "PENAFLOR": 105400, "PENALOLEN": 69100,
  "PIRQUE": 110800, "PROVIDENCIA": 56500, "PUDAHUEL": 62500,
  "PUENTE ALTO": 97700, "QUILICURA": 40000, "QUINTA NORMAL": 51000,
  "RECOLETA": 46600, "RENCA": 51000, "RINCONADA DE MAIPU": 79600,
  "SAN BERNARDO": 81800, "SAN JOAQUIN": 66900, "SAN JOSE DE MAIPO": 146000,
  "SAN MIGUEL": 65800, "SAN RAMON": 77900, "SANTIAGO": 56500,
  "TALAGANTE": 123500, "VITACURA": 62000, "ALGARROBO": 197000,
  "ALHUE": 166300, "BUCALEMU": 270600, "CALERA DE TANGO": 164100,
  "CASABLANCA": 174500, "CHEPICA": 263500, "CHILLAN": 658200,
  "CHIMBARONGO": 232200, "COLTAUCO": 219600, "CONCON": 193700,
  "COQUIMBO": 658800, "CURACAVI": 107600, "CURICO": 272800,
  "DONIHUE": 197000, "EL MANZANO": 218500, "EL QUISCO": 197000,
  "EL TABO": 197000, "GRANEROS": 174500, "HUALANE": 349700,
  "ILLAPEL": 385900, "LA CALERA": 203600, "LA CRUZ": 211900,
  "LA ESTRELLA": 272800, "LA LIGUA": 219600, "LA SERENA": 713700,
  "LAS CABRAS": 251400, "LAS CRUCES": 197000, "LAS PATAGUAS": 219600,
  "LIMACHE": 187700, "LINARES": 432000, "LIRAY": 79600, "LITUECHE": 263500,
  "LLAYLLAY": 219600, "LOLOL": 219600, "LOS ANDES": 186600,
  "LOS VILOS": 291700, "MACHALI": 193700, "MAITENCILLO": 219600,
  "MARCHIGUE": 272800, "MARIA PINTO": 142700, "MOLINA": 295300,
  "MOSTAZAL": 165200, "NANCAGUA": 256900, "NAVIDAD": 272800,
  "OLMUE": 193700, "PALMILLA": 273900, "PAPUDO": 272800,
  "PERALILLO": 272800, "PEUMO": 256900, "PICHIDEGUA": 219600,
  "PICHILEMU": 272800, "PLACILLA": 242100, "PUCHUNCAVI": 215200,
  "QUILLOTA": 219600, "QUILPUE": 193200, "QUINTA DE TILCOCO": 191000,
  "QUINTEROS": 256900, "RANCAGUA": 184400, "RAPEL": 219600,
  "RENGO": 193700, "RENACA": 193700, "REQUINOA": 219600,
  "SAGRADA FAMILIA": 327200, "SAN ANTONIO": 186600,
  "SAN FCO DE MOSTAZAL": 174500, "SAN FELIPE": 196500,
  "SAN FERNANDO": 219600, "SAN PEDRO": 202000, "SAN VICENTE DE TT": 251400,
  "SANTA CRUZ": 272300, "SANTO DOMINGO": 193200, "TALCA": 327200,
  "TENO": 238800, "TIL TIL": 142700, "VALPARAISO": 193700,
  "VILLA ALEMANA": 193700, "VINA DEL MAR": 193700, "ZAPALLAR": 228300
};

function normalizeComuna(str) {
  return str
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasEPSProduct(items) {
  return items.some(item =>
    item.product_type === "Aislación Térmica" ||
    item.vendor === "ETSA"
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Shopify-Shop-Domain");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { rate } = req.body;
    const { destination, items } = rate;

    if (!hasEPSProduct(items)) {
      return res.status(200).json({ rates: [] });
    }

    const ciudad = destination.city || "";
    const comunaNorm = normalizeComuna(ciudad);
    const tarifa = TARIFAS[comunaNorm];

    if (!tarifa) {
      return res.status(200).json({
        rates: [{
          service_name: "Envío EPS — Consultar disponibilidad",
          service_code: "EPS_CONSULTAR",
          total_price: "0",
          currency: "CLP",
          description: "Tu comuna no está en nuestra tabla de fletes EPS. Contáctanos por WhatsApp para coordinar el envío."
        }]
      });
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

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno" });
  }
}
