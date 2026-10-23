# Productividad y Mercado Laboral — dashboard

Marcos regulatorios en América Latina: costos laborales no salariales, salarios
mínimos, costos de despido e impuestos a las empresas, para los 11 países del informe
más España y Estados Unidos como comparadores.

Se abre desde la tarjeta del portal (`app.js`, lista `DASHBOARDS`) y vive en
<https://fedesarrollo.github.io/productividad-mercado-laboral/>.

## Esta carpeta es una COPIA. No la edites aquí.

El dashboard se construye en su propio repositorio, `regulatory-frameworks`, donde
están los workbooks de origen, los scripts que arman los datos y las verificaciones
que prueban que cada gráfico dice lo que debe. Lo que hay aquí es el resultado: HTML,
CSS, módulos ES y JSON, sin nada que ejecutar en el servidor.

Un arreglo hecho aquí se pierde en la siguiente actualización y, peor, deja los dos
árboles distintos sin que nada lo avise. Para actualizar el dashboard:

```sh
# desde regulatory-frameworks, con los cambios ya verificados y commiteados
rsync -a --delete --exclude tests/ site/ \
  ../fedesarrollo.github.io/productividad-mercado-laboral/
# y volver a poner este README, que no viaja desde allá
```

`tests/` se excluye a propósito: es el arnés de comparación de figuras, herramienta de
desarrollo y no parte de lo publicado.

## Por qué funciona sin configurar nada

Todas sus rutas son relativas y la navegación es por *hash* (`#/minwage`), así que la
carpeta funciona en cualquier ruta base y **el servidor nunca ve una URL que no sea
`index.html`** — no hace falta ninguna regla de reescritura ni un `404.html`, que es lo
que suele romper a una aplicación de una sola página en hosting estático.

No hay archivos que empiecen por `_`, de modo que Jekyll no se come ninguno.
