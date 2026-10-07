# Guía de estilo visual · Plan anual de mantenimiento de riego

Sirve para **pedir el mismo aspecto en otro chat, proyecto o herramienta**. Contiene qué es el estilo, sus valores exactos, los componentes disponibles y textos listos para pegar.

## Qué contiene este paquete

| Archivo | Para qué |
|---|---|
| `GUIA_DE_ESTILO.md` | Este documento |
| `estilo-base.css` | **El estilo en código**, extraído de la aplicación real. Se usa tal cual, sin reescribirlo |
| `ejemplo-estilo.html` | Página de ejemplo con todos los componentes (tablero, tarjetas, fichas, símbolos, tabla) |
| `ejemplo-portada.html` | Ejemplo de la pantalla de carga con zona de arrastre |
| `capturas/` | 5 pantallas reales de la aplicación (portada, plan, programa, Gantt, recetas) |
| `logo/hortifrut-logo.png` | Logo de la marca (fondo transparente) |

La referencia completa es `index.html` de la aplicación: ahí está el CSS completo y el comportamiento.

## 1. Carácter del diseño

Herramienta de trabajo para planificar: **densa pero ordenada**, de tonos sobrios (verde azulado sobre fondo grafito o gris claro), con color reservado para **significar estados**, no para decorar. Tema **oscuro y claro automáticos** según el equipo (o forzado con `<html data-theme="dark|light">`).

## 2. Valores exactos

**Colores** (variables CSS; nunca escribir colores sueltos en los componentes)

| Variable | Claro | Oscuro | Significado |
|---|---|---|---|
| `--bg` | `#eef2f2` | `#0f1719` | Fondo de la página |
| `--card` | `#ffffff` | `#172124` | Tarjetas y tablas |
| `--fg` | `#17242b` | `#e4eceb` | Texto principal |
| `--mut` | `#5f7078` | `#93a6a9` | Texto secundario |
| `--bd` | `#d3dede` | `#2c3d41` | Bordes y líneas |
| `--ac` | `#0e7c86` | `#3cb6c1` | **Acento**: acción principal, selección, semana de corte |
| `--ok` | `#2f9e5b` | `#43b873` | Bien / ejecutado / alcanza / cumplimiento ≥ 80 % |
| `--pen` | `#f0b429` | `#e0a526` | Programado por hacer / en camino |
| `--bad` | `#dc4c4c` | `#e8625f` | Pendiente vencido / falta / sin precio |
| `--fp` | `#3b82d6` | `#5b9be6` | Fuera de programa / adelantado / informativo |
| `--ad` | `#8a5cc2` | `#a982e0` | Adicional / manual |

Casilla "adicional": fondo turquesa `#27d3b5` con cruz roja `#b3141a`.

**Tipografía**: texto en **IBM Plex Sans** 13 px (interlineado 1,4); títulos grandes en **Manrope** 700–800 con espaciado negativo (`-.025em`). Números destacados de tarjeta: 22 px, peso 600; número de semana: 46 px. Etiquetas pequeñas: 11–11,5 px, mayúsculas con espaciado (`.08em`–`.16em`) cuando son de encabezado de bloque.

**Forma y espacio**: tarjetas 8 px de radio con borde de 1 px (sin sombra); controles 6 px; fichas 999 px; zona de arrastre 18 px; separación habitual 10–12 px; ancho máximo 1500 px. Un bloque importante lleva **3 px de borde superior** en color de acento.

## 3. Componentes (clases de `estilo-base.css`)

- **Tarjeta** `.card` · **barra de controles** `.bar` · **cuadrícula de filtros** `.fl` / `.pc` (columnas iguales, el último elemento ocupa lo que sobra).
- **Pestañas** `.tabs` · **control segmentado** `.seg` (botones unidos; el activo en color de acento).
- **Selector de semana** `.wk` + `.big` (flechas redondas y número grande) + `.fechas`, `.dr`, `.rl`, `.cm` (fechas en negrita, etiqueta redonda y campaña, centrados y apilados).
- **Tarjeta de indicador** `.k` = título pequeño, valor grande y descripción, **cada uno en una sola línea** (se recorta con "…" y el texto completo va en el `title`). Franja izquierda de 4 px del color del estado (`style="border-left-color:var(--ok)"`).
- **Bloque de indicadores** `.ksec` + cabecera `.kh`: variante **destacada** `.ksec.wkk` (fondo con tinte del acento y borde superior) para lo que es de *esta semana*, y **neutra** `.ksec` para totales. Cuadrícula `.kp` (4 columnas) o `.kp.k6` (6 columnas).
- **Fichas de estado** `.og` (`.ok .cam .fal .nod .prog .pend .adel .man`) y **cifras en cuadrito** `.ch` (`.a` ámbar, `.g` verde, `.r` rojo).
- **Símbolos de casilla** `.sw` (`.y1` contorno naranja, `.y1p` contorno rojo, `.y2` contorno + check azul, `.y3` check azul, `.y4` cruz roja sobre turquesa) y su uso dentro de las celdas `td.c.v1 … v4`.
- **Leyenda** `.lg` / `.lg2`: reparte sus elementos a todo el ancho (`justify-content:space-between`).
- **Tabla de trabajo** `.gw` (contenedor con scroll) con encabezado fijo y **columnas fijas con fondo opaco** (`.sl`).
- **Portada**: `.portada` > `.lcard` con `.logo-tarjeta`, `.eyebrow`, `.lh`, `.lp`, `.dz` (zona de arrastre), `.note`, `.steps`.

## 4. Reglas que salieron de las revisiones (importan tanto como los colores)

1. **Sin huecos**: cada fila de controles o indicadores es una cuadrícula de columnas iguales que se estira a todo el ancho; nada queda "pegado a un lado". Las leyendas ocupan el mismo ancho del elemento al que acompañan.
2. **Centrar y apilar** los bloques cortos de texto (número, fechas, etiqueta) en lugar de ponerlos en una línea larga.
3. **Una línea por dato** en las tarjetas; nunca dejar que el texto salte de línea. Lo que no cabe se recorta y se explica al pasar el cursor.
4. **Fondos opacos** en columnas y encabezados fijos de tablas (la transparencia deja ver lo que se desplaza debajo).
5. **Distinguir lo semanal de lo acumulado** con bloques de aspecto distinto, no solo con el título.
6. **Color con significado fijo** (tabla de arriba). Los mismos colores y símbolos en leyenda, botones y celdas.
7. **Símbolos como los del Excel** para estados en celdas (contorno, check, cruz), en vez de rellenos y números.
8. **Sin barras de progreso dentro de celdas**; las cifras de resumen van en cuadritos de color sólido, sin degradados ni transparencias.
9. **Avisar lo incompleto** (por ejemplo "sin precio") con una ficha roja visible, no con un cero silencioso.

## 5. Cómo pedirlo en otro lado

**Qué adjuntar**: `estilo-base.css`, `ejemplo-estilo.html`, `ejemplo-portada.html`, `GUIA_DE_ESTILO.md` y 2 o 3 capturas. Si el trabajo es sobre la aplicación misma, adjunta además `index.html`.

**Texto para una pantalla o aplicación nueva** (reemplaza lo que está entre corchetes):

> Quiero construir **[qué: tablero / formulario / aplicación de …]** con **el mismo estilo visual** de mi aplicación de plan de mantenimiento. Te adjunto `estilo-base.css`, la guía de estilo, dos páginas de ejemplo y capturas.
> - Usa `estilo-base.css` **sin reescribirlo**: enlázalo o pégalo íntegro y construye con sus clases (`.card`, `.ksec`, `.k`, `.og`, `.seg`, `.fl`, `.gw`…). No inventes colores: usa solo las variables `--ac`, `--ok`, `--pen`, `--bad`, `--fp`, `--ad`.
> - Tipografías IBM Plex Sans (texto) y Manrope (títulos grandes). Tema claro y oscuro automáticos.
> - Respeta las 9 reglas de la sección 4 de la guía, en especial: sin huecos, tarjetas de una sola línea, fondos opacos en columnas fijas y colores con significado fijo.
> - Contenido: **[describir pantallas, datos y acciones]**.
> - Entrega: **[un solo archivo index.html / componentes React / …]**, en español.

**Texto para ajustar algo que ya existe**:

> Adjunto mi archivo y la guía de estilo. Quiero que **[cambio]** siguiendo el mismo estilo: reutiliza las clases y variables de `estilo-base.css` y no cambies nada que no te pida.

**Si quieres un tema o marca distinta** (otra empresa, otro color): pide que se cambien **solo las variables de la sección 2** (sobre todo `--ac`) y que se conserven la estructura, las proporciones y las reglas.

## 6. Dónde guardarlo

- En el repositorio de GitHub, dentro de `docs/estilo/`, para que quede versionado junto a la aplicación.
- En el chat o proyecto nuevo, como archivos adjuntos (o como archivos de referencia del proyecto, si tu plan lo permite).
- Fuera de Claude: basta con copiar `estilo-base.css` a cualquier proyecto web y cargar las dos fuentes de Google Fonts.
