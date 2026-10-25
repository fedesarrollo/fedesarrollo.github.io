# fedesarrollo.github.io

Sitio de Fedesarrollo. Lo construye Jekyll en GitHub Pages en cada cambio a `main`; no hay que configurar nada más.

## Estructura

- `index.html`, `investigaciones.html`, `coyuntura.html`, `areas.html`, `equipo.html`, `nosotros.html`, `noticias-eventos.html` y `404.html`: páginas del sitio.
- `areas/<slug>.html`, `equipo/<slug>.html` y `organizados-contra-el-crimen/<n>.html`: páginas generadas con los layouts `area`, `perfil` y `oac-doc` a partir de `_data`.
- `encuestas.html`, `temas.html` y `seguridad-justicia.html`: redirecciones a las direcciones nuevas.
- `_data/*.yml`: todo el contenido (publicaciones, indicadores, equipo, noticias, eventos, temas y la serie 2026-2030). Comunicaciones lo actualiza siguiendo [COMO-EDITAR.md](COMO-EDITAR.md).
- `_layouts/` y `_includes/`: encabezado, pie y piezas que se repiten.
- `assets/fede/`: copia del kit de marca (`fede-style`): tokens, `web/fedesarrollo.css`, logos y fotos en semitono. Hay dos cambios frente al kit:
  - las fuentes comerciales están en `web/fuentes-marca.css`;
  - las fotos están reducidas para la web.
- `assets/css/site.css` y `assets/js/site.js`: capa propia del sitio sobre el kit, y filtros del listado de publicaciones.
- `assets/img/portadas/`: miniaturas de las publicaciones, descargadas del repositorio institucional.
- `assets/img/oac/`: primera página de los documentos de Organizados contra el crimen (versión en español).
- `documentos-politica-2026-2030/`: serie de Documentos y Notas de Política. Los datos de cada documento están en `_data/serie.yml`, y el texto en `docs/<slug>.html`. Para agregar uno, ver su `COMO-AGREGAR-UN-DOCUMENTO.md`.
- `productividad-mercado-laboral/`: explorador de marcos regulatorios. Es una copia generada en el repositorio `regulatory-frameworks`: no se edita aquí.
- `interno/`: portal interno del equipo (herramientas y dashboards). No está enlazado desde el sitio, tiene `noindex` y está fuera del sitemap.

## Diseño

El diseño sigue el manual de marca 2026 a través del kit `fede-style`:
- esquinas rectas, sin sombras;
- texto en Azul Profundo `#031C4A`;
- solo pares de color permitidos.

Para revisarlo se usa el auditor del kit:

```bash
python3 ../fede-style/audit/fede_audit.py assets/css/site.css _includes _layouts *.html
```

ES Face y PP Neue Machina son comerciales. Mientras no se confirme que la licencia permite publicarlas en la web, `_config.yml` tiene `fuentes_marca: false` y el sitio usa Newsreader y Space Grotesk, los sustitutos que declara el kit. Para activarlas hay dos pasos:
1. Copiar los `.woff2` de `fede-style/assets/fonts/web/` a `assets/fede/assets/fonts/web/`.
2. Cambiar la opción a `true`.

## Ver en local

Con Docker Desktop abierto:

```bash
docker run --rm -p 4000:4000 -v "$PWD":/srv/site -w /srv/site ruby:3.3 \
  bash -lc 'bundle install && bundle exec jekyll serve --host 0.0.0.0 --force_polling'
```

y abrir http://localhost:4000.
