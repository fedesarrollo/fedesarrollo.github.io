# Cómo agregar un documento a la serie

Guía para publicar un nuevo documento en **Documentos de Política para el gobierno 2026-2030**.
El sitio se construye con Jekyll. Cada documento es un archivo en `_documentos/serie-2026-2030/`
(raíz del repositorio), con sus datos arriba y su texto debajo. Las grillas, la cabecera de cada ficha, el visor de
PDF y el pie se generan solos.

---

## Estructura de la carpeta

```
documentos-politica-2026-2030/
├── index.html                 # Portada de la serie (se genera desde _documentos/serie-2026-2030/)
├── documentos.html            # Grilla de documentos   (se genera)
├── notas-politica.html        # Grilla de notas        (se genera)
├── docs/
│   └── <slug>.html            # Se genera desde _documentos/serie-2026-2030/
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

### 3. Crear el documento

Cree `_documentos/serie-2026-2030/<slug>.html` copiando `_documentos/serie-2026-2030/salud.html` y cambie:

- los datos de arriba: `title`, `description`, `titulo`, `clase` (`documento` o `nota`), `tipo` («Documento de Política» o «Nota de Política»), `fecha`, `temas`, `portada`, `orden`, `subtitulo`, `autores_corto`, `resumen`, `autores`, `archivos` y, si tiene, `video`;
- el texto de abajo: La idea central y los tres mensajes.

La página queda en `docs/<slug>.html`, aparece en las grillas de la serie, en Investigaciones y en las áreas que corresponden a sus temas. No hace falta tocar otros archivos.

### 4. Verificar en local

Ver «Ver en local» en el `README.md` de la raíz y abrir
http://localhost:4000/documentos-politica-2026-2030/. Revisa que el documento aparezca en la
grilla, que su ficha muestre las portadas y que los enlaces descarguen los PDF correctos.

---

## Convenciones

- **Slugs** en minúsculas, sin tildes ni espacios, con guiones.
- Las previews se generan a partir de la **primera página** del PDF; en las grillas se usa la
  primera de la lista `archivos`.
- El Resumen conserva el sufijo `-nota-de-politica.pdf` para no romper enlaces ya compartidos.
