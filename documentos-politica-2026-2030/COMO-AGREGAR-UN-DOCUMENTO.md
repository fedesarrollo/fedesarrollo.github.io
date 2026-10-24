# Cómo agregar un documento a la serie

Guía para publicar un nuevo documento en **Documentos de Política para el gobierno 2026-2030**.
El sitio se construye con Jekyll: los datos del documento van en `_data/serie.yml` (raíz del
repositorio) y el texto en `docs/<slug>.html`. Las grillas, la cabecera de cada ficha, el visor de
PDF y el pie se generan solos.

---

## Estructura de la carpeta

```
documentos-politica-2026-2030/
├── index.html                 # Portada de la serie (se genera desde _data/serie.yml)
├── documentos.html            # Grilla de documentos   (se genera)
├── notas-politica.html        # Grilla de notas        (se genera)
├── docs/
│   └── <slug>.html            # Texto de cada documento          ← se crea
├── pdfs/
│   ├── <slug>-documento-de-politica.pdf   ← se copia
│   └── <slug>-nota-de-politica.pdf        ← se copia
└── assets/
    ├── serie.js               # Visor de PDF y video (no hace falta tocar)
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

Copia el Documento de Política y su Resumen a `pdfs/`, renombrándolos con el slug (el Resumen
conserva el sufijo `-nota-de-politica.pdf` para no romper enlaces ya compartidos):

```bash
cp "ORIGEN/... Documento de Politica.pdf" pdfs/<slug>-documento-de-politica.pdf
cp "ORIGEN/... Resumen.pdf"               pdfs/<slug>-nota-de-politica.pdf
```

> Si un tema solo tiene Nota (sin Documento), es una **Nota de Política**: copia solo ese PDF
> y en el paso 3 usa `tipo: nota` con un solo archivo.

### 2. Generar las imágenes de preview (primera página de cada PDF)

En macOS se usa QuickLook (nativo, no requiere instalar nada):

```bash
qlmanage -t -s 800 -o assets/img/previews "pdfs/<slug>-documento-de-politica.pdf"
qlmanage -t -s 800 -o assets/img/previews "pdfs/<slug>-nota-de-politica.pdf"

# QuickLook agrega ".pdf.png"; renómbralas al nombre final:
mv "assets/img/previews/<slug>-documento-de-politica.pdf.png" assets/img/previews/<slug>-documento.png
mv "assets/img/previews/<slug>-nota-de-politica.pdf.png"      assets/img/previews/<slug>-nota.png
```

### 3. Agregar el documento a `_data/serie.yml`

Copia un bloque existente (por ejemplo, el de `salud`) y ajústalo. El orden de la lista es el
orden en que aparecen en el sitio.

```yaml
- slug: <slug>
  tipo: documento            # o «nota» para una Nota de Política
  titulo: "Título corto"
  subtitulo: "Subtítulo del documento"
  autores_corto: "Autor 1 y Autor 2"         # lo que se ve en las grillas
  resumen: "Una o dos líneas para la grilla."
  autores:
    - nombre: "Autor 1"
      cargo: "Cargo y afiliación"
  archivos:
    - etiqueta: "Documento de Política"
      pdf: <slug>-documento-de-politica.pdf
      portada: <slug>-documento.png
    - etiqueta: "Resumen"
      pdf: <slug>-nota-de-politica.pdf
      portada: <slug>-nota.png
  video: ID_DE_YOUTUBE       # opcional: botón y ventana la primera vez que alguien entra
```

### 4. Crear el texto en `docs/<slug>.html`

Copia `docs/salud.html` y cambia el encabezado y el cuerpo. El encabezado solo lleva tres datos:

```html
---
slug: <slug>
title: "Título para la pestaña y los buscadores"
description: "Una frase que resuma el documento."
---
<h2>La idea central</h2>
<p>…</p>

<h2>Tres mensajes para el nuevo gobierno</h2>
<ol>
  <li><strong>Mensaje:</strong> desarrollo.</li>
</ol>
```

El cuerpo solo lleva **La idea central** y **Tres mensajes**. El resto vive en los PDF.

### 5. Que aparezca en Investigaciones y Temas

En `_data/publicaciones.yml` agrega, en el lugar que le corresponda por fecha:

```yaml
- serie_slug: <slug>
  tipo: Documento de Política      # o Nota de Política
  fecha: "AAAA-MM"
  temas: [codigo-de-tema]
```

### 6. Verificar en local

Ver «Ver en local» en el `README.md` de la raíz y abrir
http://localhost:4000/documentos-politica-2026-2030/. Revisa que el documento aparezca en la
grilla, que su ficha muestre las portadas y que los enlaces descarguen los PDF correctos.

---

## Convenciones

- **Slugs** en minúsculas, sin tildes ni espacios, con guiones.
- Las previews se generan a partir de la **primera página** del PDF; en las grillas se usa la
  primera de la lista `archivos`.
- El Resumen conserva el sufijo `-nota-de-politica.pdf` para no romper enlaces ya compartidos.
