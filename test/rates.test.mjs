// Pruebas con payloads simulados. Uso: node test/rates.test.mjs
// Mockea fetch (Admin API de Shopify) y compara contra el handler original (rates.orig.mjs).
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.SHOPIFY_ADMIN_TOKEN = "test-token";

// Etiquetas simuladas (IDs reales de la tienda, solo para los tests)
const TAGS = {
  "10262772908288": ["compra-minima-eps", "eps aislapol"], // plancha 2x1 30 kg
  "8867337044224":  ["compra-minima-eps"],                 // plancha 100x50 30 kg
  "8680166949120":  ["pedido-minimo-6", "plumavit"],       // perlas y granulado
  "8881357095168":  ["soporte para tina"],                 // soporte de tina (sin regla)
  "9544381432064":  ["agente-whatsapp"],                   // huincha juntas EPS (sin regla)
  "1111":           ["mortero"]                            // producto cualquiera
};
let fetchCalls = 0, fetchMode = "ok";
globalThis.fetch = async (url, opts) => {
  fetchCalls++;
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
writeFileSync(join(dir, "rates.orig.mjs"), execSync("git show main:api/rates.js", { cwd: new URL("..", import.meta.url).pathname }));
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
await t("5 bolsas (3 Perlita + 2 Granulado) → []", async () => vacio(await call(nuevo, [it(PERLAS, 17990, 3), it(PERLAS, 15990, 2)])));
await t("6 bolsas → tarifas", async () => conTarifas(await call(nuevo, [it(PERLAS, 17990, 3), it(PERLAS, 15990, 3)])));
await t("carrito sin EPS → igual que antes", async () => igualAntes([otro(30000, 2)]));
await t("soporte de tina solo → igual que antes", async () => igualAntes([it(TINA, 17990, 1)]));
await t("huincha sola → igual que antes (EPS plana)", async () => igualAntes([it(HUINCHA, 59990, 1)]));
await t("soporte de tina + huincha → igual que antes", async () => igualAntes([it(TINA, 17990, 1), it(HUINCHA, 59990, 1)]));
await t("planchas ≥ mínimo + 2 perlas (< 6) → [] (cada regla se evalúa)", async () => vacio(await call(nuevo, [it(PLANCHA, 200000, 1), it(PERLAS, 17990, 2)])));
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

for (const [s, n] of results) console.log(s, "-", n);
const fails = results.filter(r => r[0] === "FAIL").length;
console.log(`\n${results.length - fails}/${results.length} OK`);
process.exit(fails ? 1 : 0);
