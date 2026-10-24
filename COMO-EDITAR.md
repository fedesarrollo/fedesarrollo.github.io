# Cómo actualizar el sitio

Esta guía es para el equipo de Comunicaciones. No hace falta instalar nada: todo se hace desde el navegador, en github.com.

El contenido del sitio vive en la carpeta **`_data`**, en archivos de texto con extensión `.yml`. Cada archivo es una lista: cada elemento empieza con un guion (`-`) y sus datos van debajo, con dos espacios de sangría.

| Archivo | Qué contiene | Dónde se ve |
|---|---|---|
| `_data/publicaciones.yml` | Investigaciones, encuestas, libros, comisiones, periódicas | Inicio, Investigaciones, Encuestas, Temas |
| `_data/indicadores.yml` | Las cuatro cifras de la banda azul (ICC, ICCO, IPEC, EOF) | Inicio y Encuestas |
| `_data/noticias.yml` | Fedesarrollo en los medios | Inicio y Noticias y eventos |
| `_data/eventos.yml` | Eventos | Inicio y Noticias y eventos |
| `_data/equipo.yml` | Dirección, investigadores y equipo | Inicio y Equipo |
| `_data/temas.yml` | Las 14 áreas de investigación | Temas y filtros |
| `_data/encuestas.yml` | Descripción de cada encuesta | Encuestas |
| `_data/serie.yml` | Documentos y Notas de Política 2026-2030 | Serie 2026-2030 |

## Pasos generales

1. Entre a **github.com/fedesarrollo/fedesarrollo.github.io** con su cuenta de Fedesarrollo.
2. Abra la carpeta `_data` y luego el archivo que va a cambiar.
3. Haga clic en el ícono del lápiz (**Edit this file**).
4. Haga el cambio. Respete los espacios del principio de cada línea: son parte del formato.
5. Haga clic en **Commit changes…**, escriba en una línea qué cambió (por ejemplo, «Agregar EOC de octubre de 2026») y confirme.
6. En uno o dos minutos el cambio aparece en https://fedesarrollo.github.io. Si no aparece, revise la pestaña **Actions** del repositorio: si la última tarea está en rojo, hay un error de formato en el archivo (casi siempre, una sangría o unas comillas que faltan).

## Agregar una publicación

Abra `_data/publicaciones.yml`, copie un bloque parecido y péguelo **arriba de la lista**, justo debajo de los comentarios del principio. La lista va de la más reciente a la más antigua.

```yaml
- titulo: "Encuesta de Opinión del Consumidor. Resultados octubre de 2026"
  tipo: Encuesta
  serie: EOC
  fecha: "2026-10"
  temas: [macroeconomia]
  handle: 5001
  portada: /assets/img/portadas/5001.jpg
  resumen: "En octubre de 2026, el Índice de Confianza del Consumidor (ICC) ..."
```

- **titulo**: entre comillas.
- **tipo**: uno de estos: `Investigación`, `Libro`, `Comisión`, `Encuesta`, `Publicación periódica`, `Comunicado`.
- **serie**: solo para encuestas y periódicas. Use el mismo nombre de las demás ediciones: `EOC`, `EOE`, `EOF`, `IPEC`, `Renta variable`, `Bitácora Semanal`, `Tendencia Económica` o `Prospectiva Económica`.
- **fecha**: `"AAAA-MM"` o `"AAAA-MM-DD"`, entre comillas.
- **autores** (opcional): como deben aparecer, entre comillas. Por ejemplo: `"Ximena Cadena y Sandra Zuluaga"`.
- **temas**: uno o varios códigos de `_data/temas.yml`, separados por coma y entre corchetes.
- **handle**: el número final del enlace del repositorio. Si el enlace es `http://hdl.handle.net/11445/5001`, el handle es `5001`.
- **portada** (opcional): la imagen pequeña de la primera página (ver abajo). Si no la pone, la publicación se muestra sin imagen.
- **resumen**: el primer párrafo del resumen del repositorio, entre comillas.

### Portada de la publicación

1. En la ficha del repositorio, haga clic derecho sobre la miniatura del PDF y elija **Guardar imagen como…**.
2. Renómbrela con el handle, por ejemplo `5001.jpg`.
3. En GitHub, abra la carpeta `assets/img/portadas`, use **Add file → Upload files**, suba la imagen y confirme.

## Actualizar las cifras de la banda azul

Abra `_data/indicadores.yml` y cambie `valor`, `periodo`, `nota` y `handle` del indicador. Escriba los números como en español: coma decimal y el signo de porcentaje pegado (`15,7%`).

## Agregar una noticia o un evento

Copie un bloque arriba de la lista en `_data/noticias.yml` o en `_data/eventos.yml`:

```yaml
- titulo: "Título de la nota"
  fecha: "2026-10-28"
  medio: El Tiempo
  enlace: https://www.eltiempo.com/...
```

En los eventos, `medio` se cambia por `lugar` (por ejemplo, `"JW Marriott, Bogotá"`). Ambos son opcionales.

## Cambiar el equipo

En `_data/equipo.yml`, cada persona tiene `nombre`, `cargo` y, si la hay, `foto` (la dirección completa de la imagen). Para retirar a alguien, borre sus líneas completas. Si una persona no tiene foto, el sitio muestra sus iniciales.

## Reglas de estilo

- Frases cortas y afirmativas. Sin signos de exclamación.
- Números en formato colombiano: `1.234,5` y `6,4%`.
- Fechas en el formato de la guía. El sitio las escribe en español solo («21 de octubre de 2026»).
- No cambie colores ni tipografías: el diseño sigue el manual de marca de Fedesarrollo.

¿Dudas o algo se rompió? Escriba al equipo técnico con el enlace del cambio.
