# App Stock de Materiales – decisiones (04/10/2026)

## Arquitectura
- Motor: Excel `APP_STOCK_MATERIALES.xlsx` con Power Query. Lee el .xlsx más reciente de cada carpeta de 01_SAP_EXPORTS (rutas en la tabla tblCarpetas). La ruta de MB52 (`…\STOCK`) es un supuesto que falta confirmar.
- Consultas: SAP (solo conexión) → SOLPED_SEGUIMIENTO, MOV_TEMPORADA, RESERVAS_OT, TABLERO. El código está en CONSULTAS_POWER_QUERY.txt.
- Web: artifact "App Stock de Materiales" (https://claude.ai/artifact/2WYVwo4Yn1Nhu6YuuX9RuX). Recibe el Excel ya actualizado y lo guarda para el equipo con el botón «Guardar para el equipo».

## Reglas
- Temporada: va de la semana ISO 27 a la semana 26. La temporada actual, 2026/2027, empezó el 29/06/2026.
- Consumo = 201 + 261 + 221 − (202 + 262 + 222). Entradas = 101 − 102. Se excluye el almacén 1030.
- BASE_HISTORICA es estática. Usa 3 temporadas completas (2023/24 a 2025/26, 36 meses) y se recalcula una vez por temporada.
- El promedio ajustado recorta los meses que superan 3 × la mediana de los meses con consumo.
- Tipo de demanda:
  - Regular: 18 meses o más con consumo.
  - Intermitente: de 6 a 17 meses.
  - Esporádico: menos de 6 meses.
  - Puntual: consumo en una sola temporada.
  - Inactivo: más de 12 meses sin consumo.
- Mínimo = MAX(prom. ajustado × MesesMin (2), mínimo manual de críticos). El cálculo automático solo aplica a Regular e Intermitente.
- Máximo = prom. ajustado × MesesMax (4). Hay sobrestock cuando el stock supera 1,5 × máximo.
- Estado de la SOLPED: se marca como recibida cuando hay un 101 en MB51 con el mismo pedido y material.

## Pendientes
- Lista de materiales críticos, que se carga en la hoja CRITICOS.
- Añadir la columna "Orden" al layout de MB51 para separar el consumo en OM01 y OM03.
- Confirmar la carpeta de MB52 y que el prefijo 620 corresponde a OM02.
- Exportar MB51 con los últimos 12 meses, para que se vean las recepciones de OC antiguas.

## Hallazgos en el maestro original
- Consumo_total no cuadra con la suma de las columnas por año. Ejemplo: ADDI-0033 tiene 20.200 frente a 44.710.
- El promedio se divide entre los años con consumo y no entre todo el periodo, lo que infla los materiales puntuales. Ejemplo: FERT-1521 da 990/mes, cuando solo tuvo consumo en 2024/25.
- Las hojas tienen filas duplicadas por cruzar con Dest.mercancía. BASE_ANALISIS_PLANNER tiene 66 mil filas para unos 16 mil materiales.

## v2 (04/10/2026): rediseño de la app
- Las tarjetas resumen siempre ocupan filas completas. Se agregaron gráficos:
  - Distribución por estado y por tipo de demanda.
  - Antigüedad de SOLPED y solicitantes más frecuentes.
  - Gasto semanal, top de materiales y de receptores por gasto.
- Colores por tipo de demanda: Regular azul, Intermitente aqua, Esporádico ámbar, Puntual violeta, Inactivo gris.
- En SOLPED, "Días abierta" son los días desde la SOLPED hasta hoy (solo lo pendiente) y "Días a recepción" lo que tardó en llegar lo recibido. Hay un filtro para ver solo materiales o solo servicios.
- Costo: Costo_consumo = −Impte.mon.local en los movimientos de consumo. Precio_unit = Valor libre / Stock, y si no hay stock, importe/cantidad de MB51.
- Nueva pestaña Equipos, con la nueva consulta OTS (IW39 + marca de equipo de riego según IH08). Muestra OTs por temporada, OM01/OM03, costo real y materiales reservados con costo estimado.
- Reservas OT: ahora hay una fila por orden y se puede desplegar para ver sus materiales.

## Opciones de actualización planteadas
- A) Actualizar en Excel de escritorio, guardar en SharePoint y subir el archivo a la web (lo que funciona hoy).
- B) Una tarea programada de Cowork con la PC encendida: lee los exports de las carpetas, recalcula y republica la web sola.
- C) Power BI con origen en la carpeta de SharePoint y actualización programada (100% en la nube, si la empresa tiene licencia).
