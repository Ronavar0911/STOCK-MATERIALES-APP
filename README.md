# App Stock de Materiales: PB03 Mantenimiento Riego (versión 0)

Herramienta para dar seguimiento al stock de almacén, al consumo de materiales y al estado de los requerimientos (SOLPED → OC → recepción). La información sale de los exports de SAP del centro PB03 (Hortifrut, área de Mantenimiento Riego).

> **Versión 0, prototipo funcional.** Este repositorio incluye datos reales exportados de SAP. TI revisará la migración, la seguridad y el tratamiento de los datos antes de pasar a producción.

## Qué hace

| Pestaña | Contenido |
|---|---|
| Stock vs mínimo | Stock actual frente al mínimo y máximo sugeridos, con un estado por material: Quiebre, Pedir, En camino, OK o Sobrestock. Muestra la cantidad y el costo estimado a pedir, y el tipo de demanda. |
| Seguimiento SOLPED | Avance de cada posición: sin OC → OC en tránsito → recibido parcial → recibido. Incluye la antigüedad de lo abierto, los días hasta la recepción y los solicitantes más frecuentes. |
| Consumo y gasto | Movimientos MB51 de la temporada con su costo. Incluye el gasto semanal y el top de materiales y receptores. |
| Equipos | OTs por equipo (OM01/OM03), su costo real (IW39) y los materiales reservados (IW13). |
| Reservas OT | Una fila por orden con sus materiales reservados y pendientes de retirar. |

## Flujo de datos

```
SAP (MB51, MB52, ME5A, IW13, IW39, IH08)
   └─► 01_SAP_EXPORTS/<carpeta>/            (se toma el .xlsx más reciente de cada carpeta)
          └─► 02_MAESTRO/APP_STOCK_MATERIALES.xlsx   (Power Query; el equipo también lo ve en Excel web)
                 └─► scripts/ACTUALIZAR_APP.bat      (Actualizar todo → copia a data/ → git push)
                        └─► GitHub Pages: la app lee data/APP_STOCK_MATERIALES.xlsx al abrirse
```

Carpetas de exports que lee el Excel (se configuran en la hoja PARAMETROS, tabla `tblCarpetas`):

| Fuente | Carpeta |
|---|---|
| MB51 movimientos (últimos 12 meses) | `01_SAP_EXPORTS/CONSUMOS` |
| MB52 stock | `01_SAP_EXPORTS/MATERIALES_STOCK` |
| ME5A SOLPED | `01_SAP_EXPORTS/SOLPED` |
| IW13 utilización de material | `01_SAP_EXPORTS/UTILIZACION_MATERIAL` |
| IW39 órdenes | `01_SAP_EXPORTS/OT` |
| IH08 equipos de riego | `01_SAP_EXPORTS/EQUIPOS` |

## Reglas de cálculo

- **Temporada:** va del lunes de la semana ISO 27 a la semana 26 del año siguiente. La temporada actual se calcula sola.
- **Consumo:** mov. 201 + 261 + 221 menos sus anulaciones 202 + 262 + 222. **Entradas:** 101 − 102. Se excluye el almacén 1030.
- **Base histórica** (hoja `BASE_HISTORICA`, estática): toma 3 temporadas completas (2023/24 a 2025/26, 36 meses).
  - El *promedio mensual ajustado* recorta los meses que superan 3 × la mediana de los meses con consumo, para que un proyecto puntual no infle el promedio.
- **Tipo de demanda:**
  - Regular: 18 meses o más con consumo.
  - Intermitente: de 6 a 17.
  - Esporádico: menos de 6.
  - Puntual: consumo en una sola temporada.
  - Inactivo: más de 12 meses sin consumo.
- **Mínimo** = MAX(prom. ajustado × `MesesMin`, solo para Regular e Intermitente ; mínimo manual de la hoja `CRITICOS`). **Máximo** = prom. ajustado × `MesesMax`.
- **SOLPED recibida:** cuando existe una entrada 101 en MB51 con el mismo pedido y material.

## Estructura

```
index.html   redirige a app/
app/         index.html (lee data/APP_STOCK_MATERIALES.xlsx al abrirse), app.js, app_head.html
data/        APP_STOCK_MATERIALES.xlsx publicado (lo reemplaza ACTUALIZAR_APP)
scripts/     ACTUALIZAR_APP.bat / .ps1: actualizar maestro + publicar en GitHub
google/      Codigo.gs: Apps Script que sirve el maestro desde Google Drive (alternativa)
powerquery/  Código M de las 6 consultas (SAP, SOLPED_SEGUIMIENTO, MOV_TEMPORADA, RESERVAS_OT, TABLERO, OTS)
python/      Motor de referencia (engine.py) y scripts que generan la base histórica, el Excel y la app (las rutas de entrada son locales; hay que ajustarlas)
docs/        Decisiones de diseño y reglas de negocio
```

## Uso (versión en SharePoint, recomendada)

La app y sus datos viven en la carpeta de SharePoint del área:

```
MAESTRO_MANTENIMIENTO_RIEGO/
  02_MAESTRO/APP_STOCK_MATERIALES.xlsx      maestro (Power Query)
  02_MAESTRO/ACTUALIZAR_APP.bat / .ps1      actualiza el maestro y genera datos.js
  03_REPORTES/APP_STOCK/index.html          la app
  03_REPORTES/APP_STOCK/datos.js            datos (el maestro en base64, lo genera el script)
```

1. Exportar de SAP a las carpetas de `01_SAP_EXPORTS`.
2. Cerrar el maestro → doble clic en `02_MAESTRO/ACTUALIZAR_APP.bat` (Actualizar todo + genera `datos.js`).
3. OneDrive sincroniza. Cada persona abre `03_REPORTES/APP_STOCK/index.html` desde su carpeta sincronizada (o un acceso directo en el escritorio) y ve los datos nuevos.

Prioridad de fuentes de datos en la app: `datos.js` → `app/fuente.js` (Apps Script) → `data/APP_STOCK_MATERIALES.xlsx` (GitHub Pages) → botón «Cargar Excel actualizado».

## Alternativa: datos desde Google Drive (sin GitHub Desktop)

1. Instalar **Google Drive para escritorio** y guardar (o sincronizar) `APP_STOCK_MATERIALES.xlsx` en una carpeta de Drive.
2. En https://script.google.com crear un proyecto, pegar `google/Codigo.gs` → **Implementar → Aplicación web** (Ejecutar como: Yo · Acceso: Cualquier usuario) → copiar la URL `/exec`.
3. Pegar esa URL en `app/fuente.js` → `window.FUENTE_DATOS = "https://script.google.com/macros/s/.../exec";`.
4. Desde entonces: actualizar el maestro en el escritorio → Drive lo sincroniza → la app lo lee al abrirse.

## Pendientes conocidos

- **Corrección pendiente en el Excel:** las celdas vacías de los exports SAP llegan como texto vacío (""). `powerquery/1_SAP.pq` ya trae el arreglo (paso `SinVac`), pero falta pegarlo en la consulta SAP del Excel. Hasta entonces, las SOLPED sin OC aparecen como «OC en tránsito».

- Agregar la columna **Orden** al layout de MB51, para clasificar el consumo en OM01/OM03.
- Cargar la lista de materiales críticos en la hoja `CRITICOS`.
- Rendimiento: cada consulta vuelve a leer MB51. Conviene exportar solo los últimos 12 meses.
- Recalcular `BASE_HISTORICA` al cierre de cada temporada.
