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

## Cómo funciona
- Shopify envía el carrito al endpoint cuando el cliente llega a shipping.
- **Planchas/perlas EPS** (`product_type = "Aislación Térmica"` o vendor `ETSA`): tarifa fija por comuna (`TARIFAS_EPS`).
- **Todo lo demás en la Región Metropolitana** (morteros, adhesivos, sacos, selladores…): despacho propio por zona y **peso total** (Σ `grams` × cantidad; `grams` es el peso de una unidad). Los tramos suben con el peso.
- **Fuera de cobertura** (regiones sin tarifa, comuna vacía, carrito sin pesos): «Despacho a coordinar» ($0), para que el cliente no se quede sin opción y el ejecutivo coordine el costo.
- La zona sale de la comuna (`destination.city`); el código postal no se usa.
- Antes de todo se valida el pedido mínimo por etiqueta (`compra-minima-eps`, `pedido-minimo-10`).

Pruebas: `node test/rates.test.mjs`.
