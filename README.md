# BPMAC EPS Shipping Rate API

Endpoint de tarifas de envío para productos EPS (Aislación Térmica / ETSA).

## Instalación

### 1. Subir a GitHub
- Crea un repositorio nuevo en github.com llamado `bpmac-shipping`
- Sube estos archivos

### 2. Desplegar en Vercel
- Ve a vercel.com → New Project
- Importa el repositorio `bpmac-shipping`
- Haz clic en Deploy
- Copia la URL que te da Vercel (ej: `https://bpmac-shipping.vercel.app`)

### 3. Registrar en Shopify
- Ve a Settings → Shipping and delivery → Create custom shipping rates
- O usa la API de Shopify Admin para registrar el carrier service:

```
POST /admin/api/2024-01/carrier_services.json
{
  "carrier_service": {
    "name": "Envío EPS BPMAC",
    "callback_url": "https://TU-URL.vercel.app/api/rates",
    "service_discovery": true
  }
}
```

## Despliegue

**Cada push a `main` despliega solo a producción.** El proyecto de Vercel (`bpmac-shipping`) está conectado por Git a `jibustamante-ctrl/bpmac-shipping`, con `main` como rama de producción: al subir un commit a `main`, Vercel construye y publica en `https://bpmac-shipping.vercel.app` (la URL que usa el carrier service de Shopify). Las demás ramas generan solo despliegues de vista previa.

- **No hace falta `vercel deploy --prod`**: hacerlo además del push crea un segundo despliegue de producción del mismo commit (un duplicado).
- **Antes de hacer push a `main`, corre las pruebas** (`node test/rates.test.mjs`): lo que llega a `main` queda en vivo en menos de un minuto.
- **Verificar en vivo**: `POST https://bpmac-shipping.vercel.app/api/rates` con un carrito de prueba (ver los casos de `test/rates.test.mjs`).
- **Volver atrás**: `vercel rollback <url-del-despliegue-anterior>` (se ven con `vercel ls`), o revertir el commit en `main`, que despliega de nuevo.

## Cómo funciona
- Shopify envía el carrito al endpoint cuando el cliente llega a shipping.
- **Planchas/perlas EPS** (`product_type = "Aislación Térmica"` o vendor `ETSA`): tarifa fija por comuna (`TARIFAS_EPS`).
- **Todo lo demás en la Región Metropolitana** (morteros, adhesivos, sacos, selladores…): despacho propio por zona y **peso total** (Σ `grams` × cantidad; `grams` es el peso de una unidad). Los tramos suben con el peso.
- **Fuera de cobertura** (regiones sin tarifa, comuna vacía, carrito sin pesos): «Despacho a regiones: a coordinar (se cobra aparte)» ($0), para que el cliente no se quede sin opción y el ejecutivo coordine el costo.
- La zona sale de la comuna (`destination.city`); el código postal no se usa.
- Antes de todo se valida el pedido mínimo por etiqueta (`compra-minima-eps`, `pedido-minimo-10`).

Pruebas: `node test/rates.test.mjs`.
