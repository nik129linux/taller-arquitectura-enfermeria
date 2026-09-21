# Arquitectura de Información — App de Enfermería

Diseño de Interfaces Software · UCC · 21 de septiembre de 2026

Contenido, jerarquía, navegación y sistema de diseño, en ese orden, aplicados al
caso mobile del proyecto final: una app de hospital con tres lectores del mismo
turno — enfermero, paciente y familia.

**Demo:** por publicar
**Repositorio:** por publicar

También abre local: `index.html` directo, no hay build ni instalación.

---

## El caso, en una frase

> "Son dos personas sufriendo el mismo vacío de información, cada una desde su
> lado." — `tareas/proyecto final/ideas.md:21`

El enfermero registra de memoria porque el computador está en otro lado. El
paciente y la familia no saben qué sigue. La app es una sola con **tres caras**
que leen el mismo dato de tres maneras distintas.

## Por qué tres lectores, no dos

El texto original habla de "el paciente y la familia" (`ideas.md:19`). Tratarlos
como un solo lector borra una asimetría real: la familia necesita **menos**
detalle clínico que el paciente, pero **más** detalle logístico (cuándo puede
entrar, a quién preguntar) que nadie más pide. La sección 1 documenta esa
asimetría con una columna de "traducción" por evento, no solo un permiso de
lectura sí/no.

## La restricción que manda: pantalla semi-pública

`ideas.md:31` — "la pantalla del enfermero la ve también el paciente desde la
cama... no lo resuelve ningún tamaño de letra". No es un detalle de
accesibilidad, es una regla de jerarquía: todo lo clínico crudo va detrás de un
toque deliberado, nunca en la lista que queda a la vista.

Eso choca con la otra restricción del caso (`ideas.md:25`): registrar tiene que
tomar segundos, porque el enfermero está de pie, con guantes, con una mano
ocupada. La sección 3 declara esa tensión en vez de esconderla: los eventos
**previstos** del plan de cuidado se confirman en un toque sin mostrar dato
crudo; los eventos **fuera de lo esperado** exigen abrir el detalle. Es una
hipótesis, marcada `POR CONFIRMAR EN CAMPO` porque las entrevistas todavía no
se hicieron.

## El sistema de diseño: Stryds, con los roles declarados y en OKLCH

`css/tokens.css` parte del sistema `tareas/resources/` (Stryds) pero con dos
cambios deliberados: el primario es **`#90b8f0`** en vez del lima original, y
todo el archivo está en **OKLCH** en vez de hex — permite bajar el chroma cerca
de los extremos de luminosidad sin que los grises tiendan a verse sucios ni
saturados de más, y hace que los neutros se sientan tintados hacia el mismo
hue del primario en vez de negro plano. El profesor dijo en clase que
**"el blanco y el negro no hacen parte de colores primarios, punto"**, así que
el archivo declara el rol de cada tono en vez de asumirlo:

```css
--color-primary: oklch(78.6% 0.075 246.8);  /* #90b8f0 — PRIMARIO, la prueba del profesor corre acá */
--surface-canvas: oklch(15% 0.012 250);      /* superficie, nunca primario */
--surface-card: oklch(19.5% 0.014 250);      /* superficie elevada */
```

La sección 4 tiene un selector de color en vivo sobre `--color-primary`: cambia
el valor y **todo** el sistema — nav activa, botones, foco, badges — se
repinta, porque ningún componente tiene un color propio fuera de ese token.

### Modo claro, con toggle explícito

El botón de la barra superior alterna `data-theme="light"` en `<html>` y
persiste en `localStorage` bajo la misma clave en el documento y en el
prototipo, así el tema cruza entre las dos páginas. El tema se aplica **antes
del primer paint** con un script inline en el `<head>` (no con `app.js`
diferido), para no mostrar un parpadeo oscuro→claro en cada carga. El interior
del prototipo móvil se queda oscuro siempre — Stryds es un sistema clínico
nocturno por diseño — y el toggle ahí solo afecta el fondo detrás del teléfono.

### Motion: ease-out exponencial, un solo overshoot documentado

Las transiciones usan `--ease-out-expo`/`--ease-out-quart` (sin rebote) para
todo lo estructural: revelado de secciones al hacer scroll (`IntersectionObserver`),
apertura de los `<details>` de jerarquía, hover de tarjetas y swatches, el
thumb del toggle de tema. La única excepción con overshoot es el check de
`tap-confirm` en el prototipo — está comentado en el CSS como la respuesta
táctil a un toque real del enfermero, no decoración.

### Dos escalas, un mismo set de tokens

Stryds es escala póster (display hasta 148px, padding de 80px). El caso es una
app a 390px. En vez de bajar todo el documento a escala móvil y perder el
impacto del material de clase, `tokens.css` trae **las dos escalas** derivadas
de la misma fuente:

| | documento del taller | pantallas de la app (sección "Templates") |
|---|---|---|
| título | `--text-doc-display` | `--text-app-heading` |
| padding | `--space-doc-32` | `--space-app-16` |
| radio de tarjeta | `--radius-card-doc` (40px) | `--radius-card-app` (16px) |

### Tres badges, tres significados

`agy` (el generador del maquetado) reusó por default el mismo badge ámbar para
"dato sin confirmar en campo" y para "alerta clínica urgente" — dos cosas
distintas que no deberían compartir componente. Se separó en tres tokens de
estado (`--state-honesty-*`, `--state-critical-*`, `--state-pending-*`) y tres
clases (`.badge-honesty`, `.badge-critical`, `.badge-pending`).

## El documento es un dashboard, no una página con scroll

La primera vista es un **dashboard de 4 tiles**, una por sección (Contenido,
Jerarquía, Navegación, Sistema de diseño), siguiendo la forma en que un
Software Design Document se organiza por partes navegables. Sigue siendo
**un solo `index.html`** (restricción de `tarea.txt`): no hay páginas
separadas, hay un router en `js/app.js` que muestra/oculta secciones con la
clase `.view.is-active`, el mismo mecanismo que ya usaba `mockup/`.

Cada tile **no es un ícono ni un resumen inventado**: `renderDashboardTiles()`
clona el `innerHTML` real de la sección y lo escala con `transform: scale()`
para que quepa en la tile — mismo patrón que la vista de grilla de
`courses/proyectos/entregas/presentacion/index.html` (`#grid`/`.mini`). Click
en una tile navega a la sección completa; un botón "← Dashboard" vuelve. La
URL lleva el hash de la sección activa (`#section-design-system`), así que
cada vista es enlazable directamente y sobrevive a un refresh.

## Comportamiento

- **Router de vistas**: dashboard ↔ 4 secciones, con transición de entrada
  (doble `requestAnimationFrame` para que la clase `.is-visible` no colapse
  contra el estado inicial) y sincronización de hash vía `history.replaceState`.
- Navegación **global**: barra inferior por rol (3 destinos para enfermero, 2
  para paciente y familia), destino activo pintado con `--color-primary` y
  `aria-pressed`.
- Navegación **contextual**: cada "ver más" declara qué información adicional
  entrega — nunca la misma frase repetida, que fue la queja del profesor sobre
  los portafolios de semestres anteriores.
- Árboles de jerarquía colapsables por `<details>`, uno por rol, con su
  criterio de orden declarado (urgencia / ansiedad / logística).
- Selector de color y **toggle de tema claro/oscuro** en la sección 4,
  ambos persisten con `localStorage`, envueltos en `try/catch`.
- Generador de swatches de tokens: lee las custom properties reales de
  `:root` con `getComputedStyle`, no una lista hardcodeada. Se regenera al
  cambiar de tema, porque los valores hex resueltos cambian.
- Las tiles se reescalan en `resize` (`scaleTiles()`), y se recalculan recién
  **después** de que el dashboard sea visible — mientras `.view` tiene
  `display:none`, `clientWidth` da 0 y la escala sale mal.
- `prefers-reduced-motion` desactiva la transición de vistas, hover-lift y
  badge-pulse; `:focus-visible` sobre `--color-primary` en todos los
  interactivos.

## Las 8 pantallas mobile, dentro de "Sistema de diseño"

Al final de la sección 4, después de "Templates / views", hay una grilla de
**8 pantallas** (Splash, Image Based, Dashboard, Analytics, List, Card Grid,
Product Page, Minimal) — el catálogo de tipos de pantalla más común en un
kit de mobile, aplicado con **datos reales** del caso en vez de bloques
genéricos:

| Pantalla | Contenido |
|---|---|
| Splash | Login de turno: logo + "Cargando tu turno…" |
| Image Based | Hero de bienvenida + accesos rápidos (Turno/Registrar/Pendientes/Mensajes) |
| Dashboard | Lista de pacientes del turno — recrea `renderHomeEnfermero()` de `mockup/js/mockup.js` |
| Analytics | Signos vitales de Carlos Rodríguez (PA 90/55), con el dato oculto tras blur |
| List | Checklist de pendientes del turno, con estado por ítem |
| Card Grid | Accesos a las tres caras (enfermero/paciente/familia) + ajustes |
| Product Page | Detalle de un paciente — recrea `renderDetailEnfermero()` de `mockup/js/mockup.js` |
| Minimal | Confirmación de evento en 1 toque, el patrón `tap-confirm` del prototipo |

Son vista previa **estática**: la interacción real (tocar, navegar, revelar el
dato oculto) vive en `mockup/`, al que esta grilla sigue linkeando.

## Dos documentos, un solo sistema de tokens

El documento (`index.html`) es el trabajo escrito: contenido, jerarquía,
navegación, sistema de diseño. La sección 4 termina en un botón —
**"Abrir prototipo móvil"** — que lleva a `mockup/index.html`: las tres
pantallas (enfermero, paciente, familia) como prototipo navegable, con
transiciones reales entre vistas, no una captura fija incrustada en el
documento. Los dos leen del mismo `css/tokens.css`, así que el cambio de
`--color-primary` en la sección 4 del documento no se ve reflejado ahí (son
procesos de página separados), pero el prototipo nace con el mismo primario.

### Qué anima el prototipo, y por qué

- **Selector de rol** con un indicador que se desliza (no que parpadea) entre
  Enfermero / Paciente / Familia — el cambio de cara es un cambio de modelo
  mental, se ve como tal.
- **Navegación de detalle** que empuja desde la derecha al abrir un paciente,
  como una navegación real, y vuelve con el botón atrás.
- **Dato clínico oculto tras blur**, no tras texto chico: el prototipo aplica
  literalmente `ideas.md:31` ("no lo resuelve ningún tamaño de letra"). Se
  revela con un toque deliberado sobre el valor.
- **Confirmación en 1 toque** para eventos previstos del plan de cuidado, con
  feedback inmediato (un check que aparece), sin abrir ningún formulario —
  la respuesta al límite de tiempo de `ideas.md:25`.
- **Entrada escalonada de tarjetas** al cambiar de vista, para que el cambio
  de rol se sienta como una pantalla nueva y no como un refresh.
- `prefers-reduced-motion` apaga todo lo anterior.

## Archivos

```
index.html            dashboard + 4 secciones (contenido, jerarquía, navegación, sistema)
css/tokens.css         ÚNICOS colores del proyecto. El archivo que se prueba.
css/styles.css         router de vistas, tiles del dashboard, layout, cero colores literales
css/atoms/             un átomo por archivo: button, input, badge, avatar, label
js/app.js              router (show/renderDashboardTiles), selector de rol, demo de tokens
mockup/index.html       prototipo navegable de las 3 pantallas
mockup/css/mockup.css   estilos y animaciones del prototipo, mismos tokens
mockup/js/mockup.js     router de vistas, selector de rol, interacciones
content-spec.md        el contenido/jerarquía/navegación en markdown, insumo de trabajo
tarea.txt              el encargo dictado en clase
entrega.txt            repositorio + demo
```

Vanilla HTML/CSS/JS, sin build tools, sin frameworks — el mismo criterio que
`3tarea`. El documento se generó con `agy` (Antigravity CLI, modelo
`gemini-3.7-flash-low`) a partir de `content-spec.md` y `css/tokens.css`, con
revisión manual sobre archivos de colores y semántica de componentes. El
prototipo móvil (`mockup/`) se escribió a mano.
