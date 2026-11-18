// Pruebas con payloads simulados. Uso: node test/rates.test.mjs
// Mockea fetch (Admin API de Shopify) y compara contra el handler original (commit 7471fcd, previo al pedido mínimo).
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.SHOPIFY_CLIENT_ID = "cid";
process.env.SHOPIFY_CLIENT_SECRET = "csecret";
process.env.MIN_ORDER_ENFORCE = "true";
let tokenCalls = 0, tokenExpiresIn = 86399;

// Etiquetas simuladas (IDs reales de la tienda, solo para los tests)
const TAGS = {
  "10262772908288": ["compra-minima-eps", "eps aislapol"], // plancha 2x1 30 kg
  "8867337044224":  ["compra-minima-eps"],                 // plancha 100x50 30 kg
  "8680166949120":  ["pedido-minimo-10", "plumavit"],      // perlas y granulado (etiqueta nueva)
  "2222":           ["pedido-minimo-6"],                  // etiqueta antigua: ya NO aplica la regla
  "8881357095168":  ["soporte para tina"],                 // soporte de tina (sin regla)
  "9544381432064":  ["agente-whatsapp"],                   // huincha juntas EPS (sin regla)
  "1111":           ["mortero"]                            // producto cualquiera
};
let fetchCalls = 0, fetchMode = "ok";
globalThis.fetch = async (url, opts) => {
  if (String(url).endsWith("/admin/oauth/access_token")) {
    tokenCalls++;
    const b = JSON.parse(opts.body);
    assert.equal(b.grant_type, "client_credentials"); assert.equal(b.client_id, "cid"); assert.equal(b.client_secret, "csecret");
    return { ok: true, json: async () => ({ access_token: "tok" + tokenCalls, expires_in: tokenExpiresIn }) };
  }
  fetchCalls++;
  assert.ok(/^tok\d+$/.test(opts.headers["X-Shopify-Access-Token"]));
  if (fetchMode === "fail") throw new Error("network down");
  const ids = JSON.parse(opts.body).variables.ids;
  return { ok: true, json: async () => ({ data: { nodes: ids.map(g => {
    const id = g.split("/").pop();
    return TAGS[id] ? { id: g, tags: TAGS[id] } : null;
  }) } }) };
};

// Handler nuevo y original (main)
const { default: nuevo } = await import("../api/rates.js");
const dir = mkdtempSync(join(tmpdir(), "rates-orig-"));
writeFileSync(join(dir, "rates.orig.mjs"), execSync("git show 7471fcd:api/rates.js", { cwd: new URL("..", import.meta.url).pathname }));
const { default: original } = await import(join(dir, "rates.orig.mjs"));

async function call(handler, items, city = "Maipu", province) {
  let out;
  const res = { setHeader() {}, status(c) { this.code = c; return this; }, json(b) { out = b; return this; }, end() {} };
  await handler({ method: "POST", body: { rate: { destination: { city, ...(province ? { province } : {}) }, items } } }, res);
  return out;
}
const it = (product_id, price_clp, quantity, extra = {}) =>
  ({ product_id, variant_id: 1, quantity, price: price_clp * 100, grams: 1000, vendor: "ETSA", product_type: "Aislación Térmica", ...extra });
const PLANCHA = "10262772908288", PERLAS = "8680166949120", TINA = "8881357095168", HUINCHA = "9544381432064", OTRO = "1111";
const otro = (price, q = 1) => it(OTRO, price, q, { vendor: "Mapei", product_type: "Mortero" });

const results = [];
async function t(name, fn) {
  try { await fn(); results.push(["PASS", name]); }
  catch (e) { results.push(["FAIL", name + " → " + e.message]); }
}
const vacio = r => assert.deepEqual(r, { rates: [] });
const conTarifas = r => assert.ok(r.rates.length === 1 && Number(r.rates[0].total_price) > 0, "se esperaban tarifas: " + JSON.stringify(r));
const igualAntes = async items => {
  const [a, b] = [await call(nuevo, items), await call(original, items)];
  const strip = r => JSON.parse(JSON.stringify(r, (k, v) => (k.endsWith("_date") ? undefined : v)));
  assert.deepEqual(strip(a), strip(b));
};

await t("planchas por $179.990 → []", async () => vacio(await call(nuevo, [it(PLANCHA, 179990, 1)])));
await t("planchas por $180.000 → tarifas", async () => conTarifas(await call(nuevo, [it(PLANCHA, 90000, 2)])));
await t("planchas $150.000 + otros $50.000 → []", async () => vacio(await call(nuevo, [it(PLANCHA, 150000, 1), otro(50000)])));
await t("9 bolsas (5 Perlita + 4 Granulado) → []", async () => vacio(await call(nuevo, [it(PERLAS, 18990, 5), it(PERLAS, 18990, 4)])));
await t("etiqueta antigua pedido-minimo-6 ya no aplica la regla (1 bolsa → tarifas)", async () => conTarifas(await call(nuevo, [it("2222", 18990, 1)])));
await t("10 bolsas (5+5) → tarifas", async () => conTarifas(await call(nuevo, [it(PERLAS, 18990, 5), it(PERLAS, 18990, 5)])));
await t("6 bolsas (antiguo mínimo) → [] con el mínimo de 10", async () => vacio(await call(nuevo, [it(PERLAS, 18990, 3), it(PERLAS, 18990, 3)])));
await t("carrito sin EPS → igual que antes", async () => igualAntes([otro(30000, 2)]));
await t("soporte de tina solo → igual que antes", async () => igualAntes([it(TINA, 17990, 1)]));
await t("huincha sola → igual que antes (EPS plana)", async () => igualAntes([it(HUINCHA, 59990, 1)]));
await t("soporte de tina + huincha → igual que antes", async () => igualAntes([it(TINA, 17990, 1), it(HUINCHA, 59990, 1)]));
await t("planchas ≥ mínimo + 2 perlas (< 6) → [] (cada regla se evalúa)", async () => vacio(await call(nuevo, [it(PLANCHA, 200000, 1), it(PERLAS, 18990, 2)])));
await t("planchas bajo mínimo + huincha (no suma) → []", async () => vacio(await call(nuevo, [it(PLANCHA, 130000, 1), it(HUINCHA, 59990, 1)])));
await t("planchas + otros pero planchas ≥ 180.000 → tarifas", async () => conTarifas(await call(nuevo, [it(PLANCHA, 180000, 1), otro(10000)])));
await t("comuna desconocida con planchas sobre mínimo → sin tarifa (EPS solo dentro de la RM; antes: «a coordinar»)", async () => {
  vacio(await call(nuevo, [it(PLANCHA, 200000, 1)], "Lugar Inexistente"));
});

// ── Tarifas por peso (fix-tarifas-peso) ──
const FIRE = "9514755817728", SOUDA = "8831055397120", SACO = "8511495799040", PLANCHA_REAL = "8867337044224";
const kg = (id, name, grams, q, price, vendor, type) => ({ product_id: id, variant_id: 1, name, quantity: q, price: price * 100, grams, vendor, product_type: type });
const fire = q => kg(FIRE, "Firecryl", 300, q, 6990, "Soudal", "Sellador Cortafuego");
const souda = q => kg(SOUDA, "Soudaflex 40FC 600 ml", 800, q, 9990, "Soudal", "Sellador de poliuretano");
const saco = q => kg(SACO, "Base Coat Natstone 25 kg", 25000, q, 14990, "Natstone", "Adhesivo EIFS");
const precio = r => { assert.equal(r.rates.length, 1, JSON.stringify(r)); return Number(r.rates[0].total_price) / 100; };
const codigo = r => r.rates[0].service_code;

await t("peso = Σ grams × cantidad: los tramos de La Florida (Zona 2) suben con las unidades de Firecryl (0,3 kg c/u)", async () => {
  const p = async q => precio(await call(nuevo, [fire(q)], "La Florida"));
  assert.equal(await p(1), 3990);    // 0,3 kg
  assert.equal(await p(83), 3990);   // 24,9 kg: último del primer tramo (≤ 25 kg)
  assert.equal(await p(84), 4990);   // 25,2 kg → ≤ 40 kg
  assert.equal(await p(134), 6990);  // 40,2 kg → ≤ 100 kg
  assert.equal(await p(200), 6990);  // 60 kg
  assert.equal(await p(500), 9990);  // 150 kg → ≤ 300 kg
});
await t("30 Soudaflex 40FC 600 ml (24 kg) a Pudahuel → tramo ≤ 25 kg; 40 (32 kg) → ≤ 40 kg; 200 (160 kg) → ≤ 300 kg", async () => {
  assert.equal(precio(await call(nuevo, [souda(30)], "Pudahuel")), 3990);
  assert.equal(precio(await call(nuevo, [souda(40)], "Pudahuel")), 4990);
  assert.equal(precio(await call(nuevo, [souda(200)], "Pudahuel")), 9990);
});
await t("sacos de 25 kg ya no son EPS: 1 → $3.990, 3 → $6.990, 20 → $24.990 (La Florida)", async () => {
  for (const [q, esperado] of [[1, 3990], [3, 6990], [20, 24990]]) {
    const r = await call(nuevo, [saco(q)], "La Florida");
    assert.equal(precio(r), esperado, `${q} sacos`); assert.notEqual(codigo(r), "EPS_FLETE");
  }
});
await t("sacos en Zona 1 y Zona 3 usan su propia tabla", async () => {
  assert.equal(precio(await call(nuevo, [saco(1)], "San Miguel")), 3490);
  assert.equal(precio(await call(nuevo, [saco(1)], "Colina")), 6990);
});
await t("planchas EPS a La Florida siguen con su tarifa EPS ($14.990) sobre el mínimo", async () => {
  const r = await call(nuevo, [kg(PLANCHA_REAL, "Plancha Aislapol", 3750, 30, 6990, "ETSA", "Aislación Térmica")], "La Florida");
  assert.equal(precio(r), 14990); assert.equal(codigo(r), "EPS_FLETE");
});
await t("planchas EPS bajo el pedido mínimo siguen bloqueadas (regla de negocio, no cambió)", async () => {
  vacio(await call(nuevo, [kg(PLANCHA_REAL, "Plancha Aislapol", 3750, 10, 6990, "ETSA", "Aislación Térmica")], "La Florida"));
});
await t("Concepción (fuera de cobertura) → «Despacho a regiones: a coordinar (se cobra aparte)» $0 en vez de []", async () => {
  const r = await call(nuevo, [fire(20)], "Concepción");
  assert.equal(codigo(r), "A_COORDINAR"); assert.equal(precio(r), 0);
  assert.equal(r.rates[0].service_name, "Despacho a regiones: a coordinar (se cobra aparte)");
});
await t("sin código postal la zona sale de la comuna (el CP nunca se usa)", async () => {
  assert.equal(precio(await call(nuevo, [fire(20)], "La Florida")), 3990);
});
await t("sin comuna (ni CP) → «a coordinar»", async () => {
  assert.equal(codigo(await call(nuevo, [fire(20)], "")), "A_COORDINAR");
});
await t("ningún artículo con peso → «a coordinar» (no regala el primer tramo)", async () => {
  const sinPeso = { ...fire(5), grams: 0 };
  const logs = [], ol = console.log; console.log = l => logs.push(l);
  let r; try { r = await call(nuevo, [sinPeso], "La Florida"); } finally { console.log = ol; }
  assert.equal(codigo(r), "A_COORDINAR"); assert.ok(logs.some(l => l.includes("SIN_PESO")));
});
await t("un artículo sin peso entre otros con peso: se cobra el peso conocido y se registra PESO_INCOMPLETO", async () => {
  const logs = [], ol = console.log; console.log = l => logs.push(l);
  let r; try { r = await call(nuevo, [saco(3), { ...fire(5), grams: 0 }], "La Florida"); } finally { console.log = ol; }
  assert.equal(precio(r), 6990); assert.ok(logs.some(l => l.includes("PESO_INCOMPLETO")));
});
await t("alias de comuna dentro de la RM: «Stgo» y «Santiago Centro» con EPS → tarifa de Santiago", async () => {
  for (const city of ["Stgo", "Santiago Centro"]) {
    const r = await call(nuevo, [kg(PLANCHA_REAL, "Plancha", 3750, 60, 6990, "ETSA", "Aislación Térmica")], city);
    assert.equal(precio(r), 14990, city);
  }
});
await t("caché: segunda llamada con mismos IDs no vuelve a consultar Shopify", async () => {
  const antes = fetchCalls;
  await call(nuevo, [it(PLANCHA, 200000, 1), it(PERLAS, 17990, 6)]);
  assert.equal(fetchCalls, antes);
});
await t("caché vence a los 10 min y se vuelve a consultar", async () => {
  const antes = fetchCalls, realNow = Date.now;
  Date.now = () => realNow() + 11 * 60 * 1000;
  try { await call(nuevo, [it(PLANCHA, 200000, 1)]); } finally { Date.now = realNow; }
  assert.equal(fetchCalls, antes + 1);
});
await t("Admin API caída + caché vencido → usa caché (sigue rechazando)", async () => {
  const realNow = Date.now; Date.now = () => realNow() + 60 * 60 * 1000; fetchMode = "fail";
  const origErr = console.error; console.error = () => {};
  try { vacio(await call(nuevo, [it(PLANCHA, 100000, 1)])); } finally { Date.now = realNow; fetchMode = "ok"; console.error = origErr; }
});
await t("PRICES_INCLUDE_TAX=false → umbral 180000/1.19 (151.261)", async () => {
  process.env.PRICES_INCLUDE_TAX = "false";
  try {
    conTarifas(await call(nuevo, [it(PLANCHA, 151261, 1)]));
    vacio(await call(nuevo, [it(PLANCHA, 151260, 1)]));
  } finally { delete process.env.PRICES_INCLUDE_TAX; }
});

await t("token: se pidió una sola vez y se reutiliza (caché)", async () => assert.equal(tokenCalls, 1));
await t("token: se renueva antes de expirar (a las ~24 h)", async () => {
  const realNow = Date.now, antes = tokenCalls;
  Date.now = () => realNow() + 24 * 3600 * 1000; // caché de tags y de token vencidos
  try { await call(nuevo, [it(PLANCHA, 200000, 1)]); } finally { Date.now = realNow; }
  assert.equal(tokenCalls, antes + 1);
});
await t("MIN_ORDER_ENFORCE=false: no bloquea y loguea WOULD_REJECT con raw_items", async () => {
  process.env.MIN_ORDER_ENFORCE = "false";
  const logs = [], ol = console.log; console.log = l => logs.push(l);
  let r;
  try { r = await call(nuevo, [it(PLANCHA, 100000, 1)]); } finally { console.log = ol; process.env.MIN_ORDER_ENFORCE = "true"; }
  conTarifas(r);
  const ev = JSON.parse(logs[0]);
  assert.equal(ev.event, "MIN_ORDER_WOULD_REJECT"); assert.equal(ev.enforce, false); assert.equal(ev.raw_items.length, 1);
});
await t("sin credenciales: fail-open + TAGS_LOOKUP_FAILED, no bloquea", async () => {
  const id = process.env.SHOPIFY_CLIENT_ID; delete process.env.SHOPIFY_CLIENT_ID;
  const realNow = Date.now; Date.now = () => realNow() + 48 * 3600 * 1000;
  const errs = [], oe = console.error; console.error = l => errs.push(l);
  let r; try { r = await call(nuevo, [it(PLANCHA, 100000, 1), it("999999", 1000, 1)]); } finally { Date.now = realNow; console.error = oe; process.env.SHOPIFY_CLIENT_ID = id; }
  assert.ok(errs.some(e => e.includes("TAGS_LOOKUP_FAILED")));
  conTarifas(r);
});


// ── EPS solo en la Región Metropolitana ──
const planchasEPS = () => [kg(PLANCHA_REAL, "Plancha Aislapol", 3750, 60, 6990, "ETSA", "Aislación Térmica")]; // $419.400: sobre el mínimo
await t("EPS en la RM: La Florida, Puente Alto y Chicureo reciben su tarifa EPS", async () => {
  assert.equal(precio(await call(nuevo, planchasEPS(), "La Florida")), 14990);
  assert.equal(precio(await call(nuevo, planchasEPS(), "Puente Alto")), 14990);
  const chicureo = await call(nuevo, planchasEPS(), "Chicureo");
  assert.equal(precio(chicureo), 24990);
  assert.equal(codigo(chicureo), "EPS_FLETE");
});
await t("EPS fuera de la RM: Chillán, Valparaíso y Antofagasta no reciben tarifa (ni «a coordinar»): no se compra con despacho", async () => {
  for (const city of ["Chillán", "Valparaíso", "Antofagasta", "Viña del Mar", "Rancagua", "San Antonio"]) vacio(await call(nuevo, planchasEPS(), city));
});
await t("las comunas con tarifa EPS en la tabla pero de otra región ya no se despachan: Chillán $658.200 y Valparaíso $193.700 → []", async () => {
  vacio(await call(nuevo, planchasEPS(), "Chillan", "NB"));
  vacio(await call(nuevo, planchasEPS(), "Valparaiso", "VS"));
});
await t("la región de la dirección manda: una comuna de la RM con otra región, o una comuna desconocida con región RM, no recibe EPS", async () => {
  vacio(await call(nuevo, planchasEPS(), "Maipu", "VS"));
  vacio(await call(nuevo, planchasEPS(), "Lugar Inexistente", "RM"));
  assert.equal(precio(await call(nuevo, planchasEPS(), "Maipu", "RM")), 14990);
  assert.equal(precio(await call(nuevo, planchasEPS(), "Maipu", "Región Metropolitana de Santiago")), 14990);
});
await t("«San Pedro» existe en la RM y fuera de ella: solo recibe EPS si la dirección dice RM", async () => {
  assert.equal(precio(await call(nuevo, planchasEPS(), "San Pedro", "RM")), 202000);
  vacio(await call(nuevo, planchasEPS(), "San Pedro", "VS"));
  vacio(await call(nuevo, planchasEPS(), "San Pedro"));
});
await t("un carrito sin EPS no cambia: fuera de la RM sigue «a coordinar», dentro sigue por peso", async () => {
  assert.equal(codigo(await call(nuevo, [fire(20)], "Antofagasta")), "A_COORDINAR");
  assert.equal(precio(await call(nuevo, [fire(20)], "La Florida")), 3990);
  assert.equal(codigo(await call(nuevo, [saco(3)], "Valparaíso")), "A_COORDINAR");
});
await t("las comunas de la RM y sus localidades tienen tarifa EPS en la tabla (nada de la RM queda sin tarifa)", async () => {
  const comunas = ["Alhué", "Buin", "Calera de Tango", "Cerrillos", "Cerro Navia", "Colina", "Conchalí", "Curacaví", "El Bosque", "El Monte", "Estación Central", "Huechuraba", "Independencia", "Isla de Maipo", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Lampa", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "María Pinto", "Melipilla", "Ñuñoa", "Padre Hurtado", "Paine", "Pedro Aguirre Cerda", "Peñaflor", "Peñalolén", "Pirque", "Providencia", "Pudahuel", "Puente Alto", "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Bernardo", "San Joaquín", "San José de Maipo", "San Miguel", "San Ramón", "Santiago", "Talagante", "Til Til", "Vitacura", "Batuco", "Chicureo", "La Dehesa", "Las Vizcachas", "Liray", "Noviciado", "Rinconada de Maipú", "El Manzano"];
  const sinTarifa = [];
  for (const city of comunas) {
    const r = await call(nuevo, planchasEPS(), city, "RM");
    if (!r.rates.length || r.rates[0].service_code !== "EPS_FLETE") sinTarifa.push(city);
  }
  assert.deepEqual(sinTarifa, []);
});
const ZIPS = ["8900000", "8940000", "8460000", "8780000", "8860000", "7970000", "9120000", "8320000", "9200000", "9160000", "8240000", "7810000", "8010000", "7500000", "7750000", "8980000", "9080000", "8380000", "8500000", "8820000", "9250000", "8050000", "8420000", "7850000", "8540000", "7910000", "8150000", "9020000", "8640000", "7630000", "7550000", "8580000", "9710000", "9560000", "8700000", "9480000", "7690000", "9750000", "9500000", "9460000", "9670000", "9380000", "9340000", "9790000", "9540000", "9810000", "9630000", "9620000", "9420000", "9580000", "9650000", "9660000"];

// ── Comuna deducida del código postal / región como código o nombre ──
async function llamarDest(destination, items) {
  let out;
  const res = { setHeader() {}, status(c) { this.code = c; return this; }, json(b) { out = b; return this; }, end() {} };
  await handlerDest(nuevo, destination, items, res, v => (out = v));
  return out;
}
async function handlerDest(h, destination, items, res, set) {
  const r = { setHeader() {}, status() { return this; }, json: set, end() {} };
  await h({ method: "POST", body: { rate: { destination, items } } }, r);
}
const SACO1 = [otro(30000, 1)]; // mortero 1 kg → Zona 1/2/3 por tramo de peso (1000 g)
const codigoDe = r => r.rates.length ? r.rates[0].service_code : "(vacío)";
await t("RM con comuna → tarifa por zona", async () => assert.equal(codigoDe(await llamarDest({ city: "Maipú", province: "RM" }, SACO1)), "BPMAC_RM_ZONA2"));
await t("RM con comuna y región como nombre de Shopify → tarifa por zona", async () => assert.equal(codigoDe(await llamarDest({ city: "Maipú", province: "Región Metropolitana de Santiago" }, SACO1)), "BPMAC_RM_ZONA2"));
await t("RM solo con CP (8900000 San Miguel) y región código → Zona 1", async () => assert.equal(codigoDe(await llamarDest({ zip: "8900000", province: "RM" }, SACO1)), "BPMAC_RM_ZONA1"));
await t("RM solo con CP y región «Región Metropolitana de Santiago» → Zona 1", async () => assert.equal(codigoDe(await llamarDest({ postal_code: "8900000", province: "Región Metropolitana de Santiago" }, SACO1)), "BPMAC_RM_ZONA1"));
await t("CP de la RM sin región → tarifa por zona (Colina → Zona 3)", async () => assert.equal(codigoDe(await llamarDest({ zip: "9340000" }, SACO1)), "BPMAC_RM_ZONA3"));
await t("CP con espacio/guion y sin comuna (Las Condes 755 0000)", async () => assert.equal(codigoDe(await llamarDest({ zip: "755-0000", province: "RM" }, SACO1)), "BPMAC_RM_ZONA2"));
await t("RM con CP y comuna sin reconocer → usa el CP", async () => assert.equal(codigoDe(await llamarDest({ city: "Sector X", zip: "8900000", province: "RM" }, SACO1)), "BPMAC_RM_ZONA1"));
await t("la comuna escrita manda sobre el CP si es conocida", async () => assert.equal(codigoDe(await llamarDest({ city: "Colina", zip: "8900000", province: "RM" }, SACO1)), "BPMAC_RM_ZONA3"));
await t("RM sin comuna ni CP → [] (sin $0 de regiones)", async () => vacio(await llamarDest({ province: "RM" }, SACO1)));
await t("«Región Metropolitana de Santiago» sin comuna ni CP → []", async () => vacio(await llamarDest({ province: "Región Metropolitana de Santiago", city: "" }, SACO1)));
await t("RM con CP inválido y sin comuna → []", async () => vacio(await llamarDest({ province: "RM", zip: "123" }, SACO1)));
await t("RM con CP desconocido y sin comuna → []", async () => vacio(await llamarDest({ province: "RM", zip: "5990000" }, SACO1)));
await t("regiones (Valparaíso, nombre) con comuna → a coordinar", async () => assert.equal(codigoDe(await llamarDest({ city: "Viña del Mar", province: "Valparaíso" }, SACO1)), "A_COORDINAR"));
await t("regiones (VS, código) solo con CP → a coordinar", async () => assert.equal(codigoDe(await llamarDest({ zip: "2520000", province: "VS" }, SACO1)), "A_COORDINAR"));
await t("sin región ni comuna ni CP → a coordinar (como antes)", async () => assert.equal(codigoDe(await llamarDest({}, SACO1)), "A_COORDINAR"));
await t("EPS: RM solo con CP → tarifa EPS de la comuna ($14.990 San Miguel)", async () => {
  const r = await llamarDest({ zip: "8900000", province: "RM" }, planchasEPS());
  assert.equal(r.rates[0].service_code, "EPS_FLETE"); assert.equal(r.rates[0].total_price, "1499000");
});
await t("EPS: RM sin comuna ni CP → []", async () => vacio(await llamarDest({ province: "RM" }, planchasEPS())));
await t("EPS: regiones solo con CP → [] (como antes)", async () => vacio(await llamarDest({ zip: "2520000", province: "Valparaíso" }, planchasEPS())));
await t("San Pedro: CP RM (9660000) con región RM → tarifa EPS RM; con región Valparaíso → []", async () => {
  assert.equal((await llamarDest({ zip: "9660000", province: "RM" }, planchasEPS())).rates[0].service_code, "EPS_FLETE");
  vacio(await llamarDest({ city: "San Pedro", province: "Valparaíso" }, planchasEPS()));
});
await t("las 52 comunas del CP de la tabla resuelven y no devuelven vacío en RM", async () => {
  const malas = [];
  for (const zip of ZIPS) { const r = await llamarDest({ zip, province: "RM" }, SACO1); if (!r.rates.length) malas.push(zip); }
  assert.deepEqual(malas, []);
});

for (const [s, n] of results) console.log(s, "-", n);
const fails = results.filter(r => r[0] === "FAIL").length;
console.log(`\n${results.length - fails}/${results.length} OK`);
process.exit(fails ? 1 : 0);
