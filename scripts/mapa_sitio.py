"""Genera mapa-del-sitio.drawio: la jerarquía de páginas del sitio y de dónde sale su contenido.

Uso: python3 scripts/mapa_sitio.py . mapa-del-sitio.drawio
Lee _areas, _especiales, _equipo y _documentos para que el mapa coincida con el sitio.
"""
import glob, html, json, os, subprocess, sys

R, SALIDA = sys.argv[1], sys.argv[2]


def front(ruta):
    texto = open(ruta).read().split('---')[1]
    return json.loads(subprocess.run(['ruby', '-ryaml', '-rjson', '-e', 'puts JSON.generate(YAML.load(STDIN.read))'],
                                     input=texto, capture_output=True, text=True, check=True).stdout)


areas = sorted((front(f) | {'slug': os.path.basename(f)[:-3]} for f in glob.glob(f'{R}/_areas/*.md')), key=lambda a: a['orden'])
especiales = sorted((front(f) | {'slug': os.path.basename(f)[:-3]} for f in glob.glob(f'{R}/_especiales/*.md')), key=lambda e: e['orden'])
n_perfiles = len(glob.glob(f'{R}/_equipo/*.md'))
serie = [front(f) for f in glob.glob(f'{R}/_documentos/serie-2026-2030/*.html')]
oac = [front(f) for f in glob.glob(f'{R}/_documentos/organizados-contra-el-crimen/*.html')]

NAVY, AZUL, LUZ, GRIS, BLANCO, TEXTO2 = '#031C4A', '#081BFD', '#BBD4F3', '#F6F6F6', '#FFFFFF', '#444E6E'
F = 'fontFamily=Inter;whiteSpace=wrap;html=1;rounded=0;'
E = {
    'raiz': f'{F}fillColor={NAVY};strokeColor={NAVY};fontColor={BLANCO};fontSize=15;fontStyle=1;',
    'menu': f'{F}fillColor={AZUL};strokeColor={AZUL};fontColor={BLANCO};fontSize=13;fontStyle=1;',
    'pagina': f'{F}fillColor={BLANCO};strokeColor={NAVY};fontColor={NAVY};fontSize=11;align=left;spacingLeft=8;',
    'generada': f'{F}fillColor={LUZ};strokeColor={NAVY};fontColor={NAVY};fontSize=11;align=left;spacingLeft=8;',
    'seccion': f'{F}fillColor={GRIS};strokeColor={GRIS};fontColor={NAVY};fontSize=10;align=left;spacingLeft=8;',
    'externo': f'{F}fillColor={BLANCO};strokeColor={AZUL};dashed=1;fontColor={AZUL};fontSize=11;align=left;spacingLeft=8;',
    'oculta': f'{F}fillColor={GRIS};strokeColor=#A1A7B7;dashed=1;fontColor={TEXTO2};fontSize=11;align=left;spacingLeft=8;',
    'titulo': f'text;html=1;align=left;fontColor={NAVY};fontSize=26;fontStyle=1;fontFamily=Georgia;',
    'nota': f'text;html=1;align=left;verticalAlign=top;fontColor={TEXTO2};fontSize=11;whiteSpace=wrap;fontFamily=Inter;',
    'grupo': f'text;html=1;align=left;fontColor={TEXTO2};fontSize=11;fontStyle=3;fontFamily=Inter;',
}
LINEA = f'edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=none;strokeColor={NAVY};'
RELACION = f'edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=classic;endSize=6;dashed=1;strokeColor={AZUL};'

celdas, aristas, n = [], [], [0]


def caja(texto, x, y, w, h, estilo):
    n[0] += 1
    i = f'n{n[0]}'
    celdas.append(f'<mxCell id="{i}" value="{html.escape(texto)}" style="{E[estilo]}" vertex="1" parent="1">'
                  f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
    return i


def une(a, b, estilo=LINEA, salida='exitX=0.5;exitY=1;', entrada='entryX=0.5;entryY=0;'):
    n[0] += 1
    aristas.append(f'<mxCell id="e{n[0]}" style="{estilo}{salida}{entrada}" edge="1" parent="1" source="{a}" target="{b}">'
                   f'<mxGeometry relative="1" as="geometry"/></mxCell>')


def t(titulo, ruta=None, datos=None):
    s = f'<b>{titulo}</b>'
    if ruta:
        s += f'<br><font color="{TEXTO2}">{ruta}</font>'
    if datos:
        s += f'<br><i><font color="{TEXTO2}">Datos: {datos}</font></i>'
    return s


W, G = 250, 30
COLS = 6
caja('Mapa del sitio fedesarrollo.github.io', 40, 20, 900, 40, 'titulo')
celdas.append(f'<mxCell id="sub" value="{html.escape("Jerarquía de páginas según el menú principal. Cada caja indica la dirección de la página y de qué archivo sale su contenido.")}" style="{E["nota"]}" vertex="1" parent="1"><mxGeometry x="40" y="62" width="1100" height="22" as="geometry"/></mxCell>')

ancho = COLS * W + (COLS - 1) * G
cx = 40 + ancho / 2
raiz = caja(t('Inicio', '/', 'destacados, publicaciones, indicadores, noticias, eventos, _areas, _equipo, serie'), cx - 190, 110, 380, 66, 'raiz')

# Columnas del menú principal
y_menu = 240
menus = ['Investigaciones', 'Coyuntura', 'Áreas', 'Equipo', 'Noticias y eventos', 'Nosotros']
ids_menu = {}
for k, m in enumerate(menus):
    x = 40 + k * (W + G)
    ids_menu[m] = caja(m, x, y_menu, W, 44, 'menu')
    une(raiz, ids_menu[m])


def columna(menu, nodos, y0=y_menu + 64):
    """nodos: lista de (texto, estilo, alto). Devuelve ids."""
    x = 40 + menus.index(menu) * (W + G)
    y, ids, previo = y0, [], ids_menu[menu]
    for texto, estilo, alto in nodos:
        if estilo == 'grupo':
            caja(texto, x, y, W, 20, 'grupo')
            y += 24
            continue
        i = caja(texto, x, y, W, alto, estilo)
        ids.append(i)
        y += alto + 10
    return ids, y


# Investigaciones
inv_nodos = [
    (t('Investigaciones', '/investigaciones.html', 'publicaciones.yml + documentos de la serie'), 'pagina', 64),
    ('Filtros por tipo, área y tema · 15 por página', 'seccion', 26),
    ('Ficha de cada publicación en el repositorio (hdl.handle.net) ↗', 'externo', 40),
    ('Especiales', 'grupo', 0),
]
for e in especiales:
    donde = ', '.join(a['nombre'] for a in areas if a['slug'] in (e.get('areas') or [])) or 'las áreas de los temas de sus documentos'
    texto = t(e['nombre'], e['enlace'], f'_especiales/{e["slug"]}.md') + f'<br><font color="{AZUL}">Aparece en: {donde}</font>'
    inv_nodos.append((texto, 'generada' if e['slug'] != 'explorador-marcos-regulatorios' else 'externo', 80))
    if e['slug'] == 'serie-2026-2030':
        nd = sum(1 for d in serie if d.get('clase') == 'documento')
        nn = sum(1 for d in serie if d.get('clase') == 'nota')
        inv_nodos += [(t('Documentos de Política', 'documentos.html'), 'pagina', 40), (t('Notas de Política', 'notas-politica.html'), 'pagina', 40),
                      (t(f'{nd + nn} fichas (Documento o Nota)', 'docs/&lt;slug&gt;.html', '_documentos/serie-2026-2030'), 'generada', 64)]
    if e['slug'] == 'organizados-contra-el-crimen':
        inv_nodos += [(t(f'{len(oac)} fichas de documentos y notas', '/organizados-contra-el-crimen/&lt;n&gt;.html', '_documentos/organizados-contra-el-crimen'), 'generada', 64),
                      ('La red: 15 instituciones (oac_red.yml)', 'seccion', 26)]
inv_ids, fondo1 = columna('Investigaciones', inv_nodos)
esp_ids = {}
k = 0
for (texto, estilo, alto), i in zip([x for x in inv_nodos if x[1] != 'grupo'], inv_ids):
    for e in especiales:
        if f'<b>{e["nombre"]}</b>' in texto:
            esp_ids[e['slug']] = i

# Coyuntura
columna('Coyuntura', [
    (t('Coyuntura', '/coyuntura.html', 'indicadores, calendario, encuestas, publicaciones'), 'pagina', 64),
    ('Indicadores (ICC, ICCO, IPEC, EOF)', 'seccion', 26),
    ('Calendario: próximas 8 fechas', 'seccion', 26),
    ('Encuestas: EOC, EOE, EOF, IPEC, Renta variable', 'seccion', 40),
    ('Periódicas y comunicados, filtro por serie', 'seccion', 40),
    ('Boletines en el repositorio ↗', 'externo', 28),
])

# Áreas
area_nodos = [(t('Áreas de investigación', '/areas.html', '_areas, _especiales'), 'pagina', 64), ('Una página por área', 'grupo', 0)]
for a in areas:
    rel = [e['nombre'] for e in especiales if a['slug'] in (e.get('areas') or [])]
    texto = t(a['nombre'], f'/areas/{a["slug"]}.html') + (f'<br><font color="{AZUL}">Especial: {", ".join(rel)}</font>' if rel else '')
    area_nodos.append((texto, 'generada', 60 if rel else 46))
area_nodos += [('En cada área: lo más reciente, especiales relacionados y equipo', 'seccion', 40)]
area_ids, fondo2 = columna('Áreas', area_nodos)
ids_area = {a['slug']: i for a, i in zip(areas, area_ids[1:1 + len(areas)])}

# Equipo
columna('Equipo', [
    (t('Equipo', '/equipo.html', '_equipo, administracion.yml'), 'pagina', 64),
    ('Dirección', 'seccion', 26),
    ('Un bloque por área (jerarquía)', 'seccion', 26),
    ('Investigadores asociados', 'seccion', 26),
    ('Administración', 'seccion', 26),
    (t(f'{n_perfiles} perfiles', '/equipo/&lt;slug&gt;.html', '_equipo/&lt;slug&gt;.md'), 'generada', 64),
    ('Biografía, área, correo, hoja de vida y publicaciones', 'seccion', 40),
])

# Noticias y eventos
columna('Noticias y eventos', [
    (t('Noticias y eventos', '/noticias-eventos.html', 'noticias.yml, eventos.yml'), 'pagina', 64),
    ('En los medios (enlace a la investigación citada)', 'seccion', 40),
    ('Próximos eventos', 'seccion', 26),
    ('Eventos anteriores', 'seccion', 26),
    ('Notas originales en los medios ↗', 'externo', 28),
])

# Nosotros
columna('Nosotros', [
    (t('Nosotros', '/nosotros.html', 'texto en la página, _config.yml'), 'pagina', 64),
    ('Quiénes somos, misión e historia', 'seccion', 26),
    ('Reconocimientos', 'seccion', 26),
    ('Directores desde 1970', 'seccion', 26),
    ('Gobierno corporativo (enlaces al sitio anterior ↗)', 'seccion', 40),
    ('Contacto (#contacto)', 'seccion', 26),
])

# Páginas fuera del menú
y_ocultas = max(fondo1, fondo2) + 40
caja('Fuera del menú', 40, y_ocultas, 400, 22, 'grupo')
for k, (txt, est) in enumerate([
    (t('Portal interno', '/interno/', 'sin enlace, noindex, fuera del sitemap'), 'oculta'),
    (t('Redirecciones', 'temas.html, encuestas.html, seguridad-justicia.html, notas-politica-aplicada.html'), 'oculta'),
    (t('Página no encontrada', '/404.html'), 'oculta'),
]):
    caja(txt, 40 + k * (W + G), y_ocultas + 26, W, 64, est)

# En todas las páginas y secciones del inicio
yg = y_ocultas + 120
caja('En todas las páginas', 40, yg, 400, 22, 'grupo')
for k, (txt, est) in enumerate([('Barra superior: promesa, Repositorio ↗, Contacto, Boletín ↗ y Buscar', 'seccion'),
                                ('Menú principal con paneles: Investigaciones, Coyuntura y Áreas', 'seccion'),
                                ('Pie: boletín, enlaces, contacto y redes', 'seccion')]):
    caja(txt, 40 + k * (W + G), yg + 26, W, 40, est)
caja('Secciones del inicio, en orden', 40, yg + 90, 400, 22, 'grupo')
sec_inicio = ['Portada rotativa (destacados.yml)', 'Lo más reciente y Coyuntura', 'Indicadores de coyuntura',
              'Documentos de Política 2026-2030', 'Áreas de investigación', 'Dirección', 'En los medios y Eventos']
for k, s in enumerate(sec_inicio):
    col, fila = k % COLS, k // COLS
    caja(f'{k + 1}. {s}', 40 + col * (W + G), yg + 116 + fila * 46, W, 40, 'seccion')

# Leyenda
yl = yg + 116 + 2 * 46 + 30
caja('Leyenda', 40, yl, 200, 22, 'grupo')
for k, (txt, est) in enumerate([('Página', 'pagina'), ('Página generada desde una colección', 'generada'),
                                ('Sección dentro de una página', 'seccion'), ('Enlace a otro sitio', 'externo'),
                                ('Fuera del menú', 'oculta')]):
    caja(txt, 40 + k * 210, yl + 26, 200, 30, est)

xml = ('<mxfile host="app.diagrams.net"><diagram id="mapa" name="Mapa del sitio">'
       '<mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" '
       'page="1" pageScale="1" pageWidth="1900" pageHeight="1800" math="0" shadow="0"><root>'
       '<mxCell id="0"/><mxCell id="1" parent="0"/>' + ''.join(celdas) + ''.join(aristas) + '</root></mxGraphModel></diagram></mxfile>')
open(SALIDA, 'w').write(xml)
print(len(areas), 'áreas,', len(especiales), 'especiales,', n_perfiles, 'perfiles,', len(serie), 'docs serie,', len(oac), 'docs OAC')
