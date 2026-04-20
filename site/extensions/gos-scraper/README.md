# GOS Scraper - Chrome Extension

Extrae datos de restaurantes y productos alimenticios desde Yelp y Google Maps directamente al PWA de GOS.

## Instalación

1. Abrir Chrome y navegar a `chrome://extensions/`
2. Activar "Modo desarrollador" (toggle en esquina superior derecha)
3. Click en "Cargar extensión sin empaquetar"
4. Seleccionar esta carpeta: `extensions/gos-scraper`

## Uso

1. Navegar a Yelp o Google Maps
2. Ir al lugar/restaurante que quieres agregar
3. Click en el ícono de GOS en la barra de extensiones
4. Click "Extraer Datos"
5. Los datos se guardan localmente

## Datos Extraídos

### Yelp
- Nombre del lugar
- Rating y número de reviews
- Categorías
- Dirección
- Coordenadas GPS
- Reviews detalladas

### Google Maps
- Nombre del lugar
- Rating y número de reviews
- Dirección
- Coordenadas GPS
- Reviews visibles

## Estructura

```
gos-scraper/
├── manifest.json      # Configuración de la extensión
├── popup.html         # UI del popup
├── popup.js          # Lógica del popup
├── content.js       # Script que scrapea las páginas
├── background.js     # Service worker en background
├── icons/            # Íconos de la extensión
└── README.md         # Este archivo
```

## Sincronización con PWA

Los datos se guardan en `chrome.storage.local`. Para sincronizar con el PWA:

1. Abrir el PWA de GOS
2. Ir a Settings > Import Data
3. Exportar datos desde la extensión (botón "Exportar JSON")
4. Importar en el PWA

## Privacidad

- Todos los datos se guardan **localmente** en tu navegador
- No se envía información a terceros
- No se viola términos de servicio de las plataformas (solo extrae datos ya visibles)

## Permisos

- `storage`: Para guardar los datos extraídos
- `activeTab`: Para acceder a la pestaña actual
- `scripting`: Para inyectar el script de extracción
- Host permissions para yelp.com y google.com

## Desarrollo

Para probar cambios:

1. Modificar los archivos de la extensión
2. En `chrome://extensions/`, click en el botón de recarga (♻️) en la extensión

## Límites

- La extensión solo extrae datos **visibles** en la página
- No puede ver reviews que requieren "Ver más"
- No绕过 CAPTCHA o bloqueos de las plataformas
- Los datos son los que el usuario puede ver manualmente