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

async function call(handler, items, city = "Maipu") {
  let out;
  const res = { setHeader() {}, status(c) { this.code = c; return this; }, json(b) { out = b; return this; }, end() {} };
  await handler({ method: "POST", body: { rate: { destination: { city }, items } } }, res);
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
await t("comuna sin tarifa EPS con planchas sobre mínimo → [] (como antes)", async () => {
  const items = [it(PLANCHA, 200000, 1)];
  assert.deepEqual(await call(nuevo, items, "Lugar Inexistente"), await call(original, items, "Lugar Inexistente"));
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

for (const [s, n] of results) console.log(s, "-", n);
const fails = results.filter(r => r[0] === "FAIL").length;
console.log(`\n${results.length - fails}/${results.length} OK`);
process.exit(fails ? 1 : 0);
