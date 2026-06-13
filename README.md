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
- Shopify envía el carrito al endpoint cuando el cliente llega a shipping
- El endpoint detecta si hay productos con `product_type = "Aislación Térmica"` o `vendor = "ETSA"`
- Si hay EPS, busca la tarifa por comuna y la devuelve
- Si no hay EPS, no devuelve tarifas (otros carriers siguen funcionando normal)
