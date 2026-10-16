# fedesarrollo.github.io

Portal interno de Fedesarrollo: enlace a la serie de Documentos de Política, dashboards internos y
herramientas del equipo. Sitio estático, sin build.

- Paleta de `fedesarrollo.cls` (plantilla de documento de política). Tipografías: Inter para el texto
  y Libre Baskerville para los títulos, que es el sustituto libre de ES Face que usa la misma clase.
  ES Face y PP Neue Machina no se suben porque su licencia es de escritorio, no web.
- Contenido: las listas `DASHBOARDS` y `HERRAMIENTAS` al inicio de `app.js`. Para publicar un
  dashboard, pon su dirección en `url`; para agregar una herramienta, añade un objeto con `name`,
  `description` y `repo` (nombre del repositorio en la organización `fedesarrollo`; no se ponen
  repositorios de cuentas personales).
- Los repositorios de herramientas son privados: los enlaces solo abren con una cuenta de GitHub
  que pertenezca a la organización.
- La serie vive en `documentos-politica-2026-2030/` (ver su `COMO-AGREGAR-UN-DOCUMENTO.md`).

Ver en local: `python3 -m http.server` y abrir http://localhost:8000/
