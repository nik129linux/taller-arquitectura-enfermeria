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

## El sistema de diseño: Stryds, con los roles declarados

`css/tokens.css` aplica el sistema `tareas/resources/` (Stryds): fondo casi
negro, Electric Lime como único acento, botones pill de 100px de radio,
tarjetas de 40px. El profesor dijo en clase que **"el blanco y el negro no
hacen parte de colores primarios, punto"**, así que el archivo declara el rol
de cada tono en vez de asumirlo:

```css
--color-primary:    #a6ff00;   /* PRIMARIO — la prueba del profesor corre acá */
--surface-obsidian:  #101010;   /* superficie, nunca primario */
--surface-carbon:    #171717;   /* superficie elevada */
```

La sección 4 tiene un selector de color en vivo sobre `--color-primary`: cambia
el valor y **todo** el sistema — nav activa, botones, foco, badges — se
repinta, porque ningún componente tiene un color propio fuera de ese token.

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

## Comportamiento

- Navegación **global**: barra inferior por rol (3 destinos para enfermero, 2
  para paciente y familia), destino activo pintado con `--color-primary` y
  `aria-pressed`.
- Navegación **contextual**: cada "ver más" declara qué información adicional
  entrega — nunca la misma frase repetida, que fue la queja del profesor sobre
  los portafolios de semestres anteriores.
- Árboles de jerarquía colapsables por `<details>`, uno por rol, con su
  criterio de orden declarado (urgencia / ansiedad / logística).
- Selector de color en la sección 4 persiste con `localStorage`, envuelto en
  `try/catch`.
- Generador de swatches de tokens: lee las custom properties reales de
  `:root` con `getComputedStyle`, no una lista hardcodeada.
- `prefers-reduced-motion`, `:focus-visible` sobre `--color-primary`,
  `aria-live` en el selector de color.

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
index.html            documento: contenido, jerarquía, navegación, sistema
css/tokens.css         ÚNICOS colores del proyecto. El archivo que se prueba.
css/styles.css         layout del documento, cero colores literales
css/atoms/             un átomo por archivo: button, input, badge, avatar, label
js/app.js              selector de rol del documento, demo de tokens, scrollspy
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
