# Cómo agregar un documento a la serie

Guía para publicar un nuevo documento en **Documentos de política para el gobierno 2026-2030**.
Todo el sitio es HTML estático (sin build ni dependencias): basta copiar archivos y editar HTML.

---

## Estructura de la carpeta

```
documentos-politica-2026-2030/
├── index.html                 # Landing
├── documentos.html            # Grilla con todos los documentos  ← se edita
├── docs/
│   └── <slug>.html            # Una página por documento         ← se crea
├── pdfs/
│   ├── <slug>-documento-de-politica.pdf   ← se copia
│   └── <slug>-nota-de-politica.pdf        ← se copia
└── assets/
    ├── styles.css             # Estilos compartidos (no hace falta tocar)
    └── img/previews/
        ├── <slug>-documento.png           ← se genera
        └── <slug>-nota.png                ← se genera
```

`<slug>` = nombre corto del tema en minúsculas, **sin tildes ni espacios**, separado por
guiones. Ejemplos: `crimen-organizado`, `electricidad-y-gas`, `justicia`,
`lucha-contra-la-corrupcion`, `paz-total`.

---

## Pasos

### 1. Copiar los PDF

Copia el Documento de Política y la Nota de Política a `pdfs/`, renombrándolos con el slug:

```bash
cp "ORIGEN/... Documento de Politica.pdf" pdfs/<slug>-documento-de-politica.pdf
cp "ORIGEN/... Nota de Politica.pdf"       pdfs/<slug>-nota-de-politica.pdf
```

> Si un tema solo tiene Nota (sin Documento), es una **Nota de política aplicada**: copia solo
> ese PDF, omite las referencias al Documento en los pasos siguientes y agrega su tarjeta en
> `notas-politica-aplicada.html` en vez de `documentos.html` (ver el paso 4).

### 2. Generar las imágenes de preview (primera página de cada PDF)

En macOS se usa QuickLook (nativo, no requiere instalar nada):

```bash
qlmanage -t -s 800 -o assets/img/previews "pdfs/<slug>-documento-de-politica.pdf"
qlmanage -t -s 800 -o assets/img/previews "pdfs/<slug>-nota-de-politica.pdf"

# QuickLook agrega ".pdf.png"; renómbralas al nombre final:
mv "assets/img/previews/<slug>-documento-de-politica.pdf.png" assets/img/previews/<slug>-documento.png
mv "assets/img/previews/<slug>-nota-de-politica.pdf.png"      assets/img/previews/<slug>-nota.png
```

### 3. Crear la página del documento

Duplica una página existente como plantilla y edítala:

```bash
cp docs/crimen-organizado.html docs/<slug>.html
```

Dentro de `docs/<slug>.html` reemplaza:

- **`<title>` y `<meta name="description">`** — con el tema del documento.
- **`<h1>`** — el nombre del documento.
- **`.subtitle`** — el subtítulo (ej. "Diagnóstico, prioridades y hoja de ruta…").
- **`.authors-block`** — los autores y su afiliación (bloques `.author`).
- **`.doc-previews`** — las dos `<img src>` apuntan a
  `../assets/img/previews/<slug>-documento.png` y `../assets/img/previews/<slug>-nota.png`;
  los dos `<a href>` apuntan a `../pdfs/<slug>-documento-de-politica.pdf` y
  `../pdfs/<slug>-nota-de-politica.pdf`. Los `<a class="doc-preview">` van **sin** el atributo
  `download`, para que al hacer clic el PDF se abra a página completa en el visor del navegador.
- **"La idea central"** — el párrafo con la idea central de la Nota.
- **"Tres mensajes para el próximo gobierno"** — los `<li>` de la lista numerada.

> El cuerpo de la página solo lleva **La idea central** y **Tres mensajes**. El resto del
> contenido vive en los PDF, accesibles desde las previews.

### 4. Agregar la tarjeta en la grilla

Elige el archivo según el tipo de tema:

- **Tema con Documento + Nota** → `documentos.html` (puedes copiar la tarjeta de Crimen organizado).
- **Nota de política aplicada (solo Nota)** → `notas-politica-aplicada.html` (copia la tarjeta de
  Paz total; la preview usa `<slug>-nota.png`).

Dentro del `<div class="docs-grid"> … </div>` del archivo elegido, añade un bloque y ajusta el
slug, el título, los autores y la descripción:

```html
<article class="docs-grid-item">
  <a class="docs-grid-preview" href="docs/<slug>.html" aria-label="Ver <Título>">
    <img src="assets/img/previews/<slug>-documento.png" alt="Vista previa de <Título>">
  </a>
  <h2><a href="docs/<slug>.html"><Título></a></h2>
  <p class="doc-authors"><Autor 1> · <Autor 2></p>
  <p class="doc-desc"><Descripción breve (1-2 líneas)></p>
</article>
```

### 5. Verificar en local

Desde la **raíz del repositorio**:

```bash
python3 -m http.server
# Abrir: http://localhost:8000/documentos-politica-2026-2030/
```

Revisa: que la nueva tarjeta aparezca en la grilla, que el enlace abra la página del
documento, que las dos previews se vean y que sus enlaces descarguen los PDF correctos.

---

## Convenciones

- **Dónde va cada uno:** los temas con Documento + Nota van en `documentos.html`; las notas
  independientes (solo Nota) van en `notas-politica-aplicada.html` ("Notas de política aplicada").
- **Menú:** el header y el footer llevan cuatro entradas —Inicio · Documentos de política ·
  Notas de política aplicada · Fedesarrollo ↗—; marca como `is-active` la de la página actual.
- **Slugs** en minúsculas, sin tildes ni espacios, con guiones.
- Las previews se generan a partir de la **primera página** del PDF; en la grilla se usa la
  del **Documento de Política**.
- No es necesario tocar `assets/styles.css`: todas las páginas comparten esos estilos.
- Mantén el mismo `<header>` y `<footer>` que las páginas existentes para conservar la
  navegación y la identidad visual.

---

## Opcional: video emergente (pop-up) en una página

Los estilos del modal (`.video-modal`) ya están en `assets/styles.css`. Para mostrar un
video de YouTube **la primera vez** que un visitante abre una página, copia el bloque del
modal + el `<script>` que están al final de `docs/electricidad-y-gas.html` y cambia dos
valores:

- `VIDEO_ID` → el id del video (de `https://youtu.be/EL_ID` o `watch?v=EL_ID`).
- `STORAGE_KEY` → una marca única por página (ej. `fede-video-<slug>`).

El video arranca **silenciado** (los navegadores no permiten autoplay con sonido); el
usuario puede activar el sonido o abrirlo en YouTube. Para que se muestre **siempre** (no
solo la primera vez), elimina la parte que usa `localStorage`.

Si además quieres un botón fijo hacia el video en la página (no en el pop-up), copia el
bloque `<p class="doc-watch">…</p>` que está dentro de `.doc-detail-main` y cambia el
`href`.
