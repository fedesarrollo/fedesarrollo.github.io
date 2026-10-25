# Cómo actualizar el sitio

Esta guía es para el equipo de Comunicaciones. Todo se hace desde el navegador, en github.com, sin instalar nada.

## Dónde está cada cosa

El sitio tiene dos clases de contenido.

**Listas**, en la carpeta `_data`. Cada archivo `.yml` es una lista y cada elemento empieza con un guion (`-`).

| Archivo | Qué contiene |
|---|---|
| `_data/publicaciones.yml` | Investigaciones, libros, comisiones, encuestas y periódicas. Enlazan al repositorio |
| `_data/destacados.yml` | Los destacados que rotan en la portada del inicio |
| `_data/indicadores.yml` | Las cuatro cifras de la banda azul (ICC, ICCO, IPEC, EOF) |
| `_data/calendario.yml` | Fechas de publicación de las encuestas |
| `_data/encuestas.yml` | Descripción de cada encuesta |
| `_data/noticias.yml` y `_data/eventos.yml` | Fedesarrollo en los medios y eventos |
| `_data/temas.yml` | Los 14 temas |
| `_data/administracion.yml` | Personal administrativo y de servicios generales |
| `_data/oac_red.yml` | Instituciones de la red Organizados contra el crimen |

**Fichas**, una por archivo, en carpetas que empiezan con guion bajo. Cada archivo crea su propia página.

| Carpeta | Qué contiene | Página que se crea |
|---|---|---|
| `_areas` | Las áreas de investigación | `/areas/<archivo>.html` |
| `_equipo` | Dirección e investigadores, uno por persona | `/equipo/<archivo>.html` |
| `_especiales` | Series, iniciativas y herramientas (serie 2026-2030, Organizados contra el crimen, Explorador) | No crean página: enlazan a la suya |
| `_documentos/<especial>` | Los documentos de cada especial, uno por archivo | La ficha del documento |

Al principio de cada ficha, entre dos líneas `---`, están sus datos. Debajo va el texto (la biografía de una persona o el cuerpo de un documento).

## Pasos generales

1. Entre a **github.com/fedesarrollo/fedesarrollo.github.io** con su cuenta de Fedesarrollo.
2. Abra el archivo que va a cambiar y haga clic en el lápiz (**Edit this file**). Para crear una ficha nueva, abra la carpeta y use **Add file → Create new file**.
3. Haga el cambio. Respete los espacios al principio de cada línea porque son parte del formato.
4. Haga clic en **Commit changes…**, escriba en una línea qué cambió y confirme.
5. En uno o dos minutos el cambio aparece en https://fedesarrollo.github.io. Si no aparece, revise la pestaña **Actions**. Una tarea en rojo indica un error de formato, casi siempre una sangría o unas comillas que faltan.

## Agregar una publicación

Copie un bloque parecido de `_data/publicaciones.yml` y péguelo arriba de la lista, debajo de los comentarios del principio.

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

- **tipo** es uno de estos: `Investigación`, `Libro`, `Comisión`, `Encuesta`, `Publicación periódica` o `Comunicado`. Los tres últimos van a Coyuntura y los demás a Investigaciones.
- **serie** solo aplica a encuestas y periódicas: `EOC`, `EOE`, `EOF`, `IPEC`, `Renta variable`, `Bitácora Semanal`, `Tendencia Económica` o `Prospectiva Económica`.
- **fecha** va entre comillas, como `"AAAA-MM"` o `"AAAA-MM-DD"`.
- **temas** son códigos de `_data/temas.yml`. Con ellos la publicación aparece sola en el área que corresponde.
- **handle** es el número final del enlace del repositorio (`http://hdl.handle.net/11445/5001` → `5001`).
- **portada** es la miniatura de la primera página. Guárdela desde la ficha del repositorio con el nombre del handle (`5001.jpg`) y súbala a `assets/img/portadas` con **Add file → Upload files**.

## Agregar una persona al equipo

Cree un archivo en `_equipo` con el nombre de la persona en minúsculas, sin tildes y con guiones (`nombre-apellido.md`). Copie otro perfil como modelo:

```yaml
---
nombre: "Nombre Apellido"
cargo: "Investigador asistente"
grupo: "investigacion"
area: "macrofiscal"
rango: 5
firmas: ["Nombre Apellido"]
foto: "https://…"
correo: "nombre@fedesarrollo.org.co"
---

Biografía en uno o varios párrafos.
```

- **area** es el nombre de archivo del área en `_areas`. Sin área, la persona aparece como investigador asociado.
- **rango** fija el orden dentro del área: 1 dirección, 2 director de área, 3 investigador, 4 investigador asociado, 5 investigador asistente, 6 asistente de investigación, 7 practicante.
- **director: true** marca al director del área. **cargo_area** es el cargo que se muestra dentro del área si es distinto del general.
- **firmas** es cómo aparece el nombre en las publicaciones. Con eso el perfil las lista solo.

Para retirar a alguien, borre su archivo. El personal administrativo está en `_data/administracion.yml`.

## Agregar un área

Cree un archivo en `_areas` con `nombre`, `orden`, `descripcion` y `temas`. El área aparece en el menú, en la página de áreas, en los filtros y en el equipo.

## Agregar un especial o un documento de un especial

Un especial es una serie, una iniciativa o una herramienta que no es un área. Para crear uno, agregue un archivo en `_especiales` con `nombre`, `tipo`, `orden`, `descripcion`, `enlace` y `vigente: true`. Con `areas: [codigo-del-area]` aparece en esas áreas.

Los documentos de un especial van en `_documentos/<especial>`, un archivo por documento. Copie uno existente de la misma carpeta y cambie sus datos. Los documentos de la serie 2026-2030 entran solos a Investigaciones y a las áreas según sus temas. Para un especial nuevo con documentos propios, pida al equipo técnico que configure su carpeta.

## Cambiar lo que rota en la portada

En `_data/destacados.yml`, el primer bloque es el que se ve al entrar y los demás rotan. Para destacar algo nuevo, copie un bloque arriba y cambie `etiqueta`, `titulo`, `texto`, `enlace` y `boton`.

## Cifras, calendario, noticias y eventos

- **Indicadores** (`_data/indicadores.yml`). Cambie `valor`, `periodo`, `nota` y `handle`. Los números van con coma decimal y el signo de porcentaje pegado (`15,7%`).
- **Calendario** (`_data/calendario.yml`). Cada fecha lleva `fecha` («AAAA-MM-DD») y `publicacion`. La página muestra sola las próximas ocho.
- **Noticias** (`_data/noticias.yml`). Lleva `titulo`, `fecha`, `medio` y `enlace`. Si la nota cita una investigación, agregue `investigacion` con su `titulo` y `enlace`.
- **Eventos** (`_data/eventos.yml`). Lleva `titulo`, `fecha`, `lugar` y `enlace`. La página separa sola los próximos de los pasados.

## Reglas de redacción

- Frases cortas y afirmativas, sin signos de exclamación.
- Sin dos puntos, punto y coma ni rayas como conectores, y sin adjetivos valorativos («innovador», «crucial»).
- Números en formato colombiano: `1.234,5` y `6,4%`.
- No cambie colores ni tipografías, porque el diseño sigue el manual de marca de Fedesarrollo.
