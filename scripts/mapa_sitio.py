"""Genera mapa-del-sitio.drawio: cada página del sitio con sus secciones, en lenguaje sencillo.

Uso: python3 scripts/mapa_sitio.py . mapa-del-sitio.drawio
Toma los nombres reales (áreas, especiales, documentos, equipo, encuestas) de los datos del sitio.
"""
import glob, html, json, math, os, subprocess, sys

R, SALIDA = sys.argv[1], sys.argv[2]


def ruby_json(codigo, entrada=None, arg=None):
    cmd = ['ruby', '-ryaml', '-rjson', '-e', codigo] + ([arg] if arg else [])
    return json.loads(subprocess.run(cmd, input=entrada, capture_output=True, text=True, check=True).stdout)


def front(ruta):
    return ruby_json('puts JSON.generate(YAML.load(STDIN.read))', open(ruta).read().split('---')[1])


def datos(nombre):
    return ruby_json('puts JSON.generate(YAML.load_file(ARGV[0]))', arg=f'{R}/_data/{nombre}.yml')


areas = sorted((front(f) | {'slug': os.path.basename(f)[:-3]} for f in glob.glob(f'{R}/_areas/*.md')), key=lambda a: a['orden'])
especiales = sorted((front(f) | {'slug': os.path.basename(f)[:-3]} for f in glob.glob(f'{R}/_especiales/*.md')), key=lambda e: e['orden'])
equipo = [front(f) for f in glob.glob(f'{R}/_equipo/*.md')]
serie = sorted((front(f) for f in glob.glob(f'{R}/_documentos/serie-2026-2030/*.html')), key=lambda d: d['orden'])
oac = sorted((front(f) for f in glob.glob(f'{R}/_documentos/organizados-contra-el-crimen/*.html')), key=lambda d: d['orden'])
temas = {t['slug']: t['nombre'] for t in datos('temas')}
encuestas = datos('encuestas')
destacados = datos('destacados')
indicadores = datos('indicadores')

NAVY, AZUL, LUZ, GRIS, BLANCO, TEXTO2 = '#031C4A', '#081BFD', '#BBD4F3', '#F6F6F6', '#FFFFFF', '#444E6E'
FUENTE = 'fontFamily=Helvetica;'
EST = {
    'pagina': f'swimlane;html=1;startSize=34;rounded=0;fillColor={NAVY};strokeColor={NAVY};fontColor={BLANCO};fontSize=14;fontStyle=1;swimlaneFillColor={BLANCO};{FUENTE}',
    'especial': f'swimlane;html=1;startSize=34;rounded=0;fillColor={AZUL};strokeColor={AZUL};fontColor={BLANCO};fontSize=14;fontStyle=1;swimlaneFillColor={BLANCO};{FUENTE}',
    'comun': f'swimlane;html=1;startSize=34;rounded=0;fillColor={GRIS};strokeColor=#A1A7B7;fontColor={NAVY};fontSize=14;fontStyle=1;swimlaneFillColor={BLANCO};{FUENTE}',
    'seccion': f'rounded=0;whiteSpace=wrap;html=1;fillColor={GRIS};strokeColor=none;fontColor={NAVY};fontSize=11;align=left;verticalAlign=top;spacing=8;{FUENTE}',
    'clave': f'rounded=0;whiteSpace=wrap;html=1;fillColor={LUZ};strokeColor=none;fontColor={NAVY};fontSize=11;align=left;verticalAlign=top;spacing=8;{FUENTE}',
    'externo': f'rounded=0;whiteSpace=wrap;html=1;fillColor={BLANCO};strokeColor={AZUL};dashed=1;fontColor={AZUL};fontSize=11;align=left;verticalAlign=top;spacing=8;{FUENTE}',
    'titulo': f'text;html=1;align=left;fontColor={NAVY};fontSize=28;fontStyle=1;fontFamily=Georgia;',
    'texto': f'text;html=1;align=left;verticalAlign=top;whiteSpace=wrap;fontColor={TEXTO2};fontSize=13;{FUENTE}',
    'etiqueta': f'text;html=1;align=left;fontColor={TEXTO2};fontSize=13;fontStyle=3;{FUENTE}',
}
LINEA = f'edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;endFill=1;endSize=6;strokeColor={NAVY};'

celdas, aristas, n = [], [], [0]
W, PAD, GAP = 320, 10, 8   # ancho de página, margen interno, espacio entre secciones


def nuevo_id(p='c'):
    n[0] += 1
    return f'{p}{n[0]}'


def alto(texto, ancho):
    limpio = texto.replace('<b>', '').replace('</b>', '')
    lineas = sum(max(1, math.ceil(len(p) / (ancho / 6.6))) for p in limpio.split('<br>'))
    return 16 * lineas + 18


def libre(texto, x, y, w, h, estilo):
    i = nuevo_id()
    celdas.append(f'<mxCell id="{i}" value="{html.escape(texto)}" style="{EST[estilo]}" vertex="1" parent="1">'
                  f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
    return i


def pagina(nombre, secciones, x, y, estilo='pagina', w=W):
    """Recuadro de una página con sus secciones (lista de (texto, estilo)). Devuelve (id, alto)."""
    pid = nuevo_id('p')
    hijos, cy = [], 34 + PAD
    for texto, est in secciones:
        h = alto(texto, w - 2 * PAD)
        i = nuevo_id()
        hijos.append(f'<mxCell id="{i}" value="{html.escape(texto)}" style="{EST[est]}" vertex="1" parent="{pid}">'
                     f'<mxGeometry x="{PAD}" y="{cy}" width="{w - 2 * PAD}" height="{h}" as="geometry"/></mxCell>')
        cy += h + GAP
    total = cy + PAD - GAP
    celdas.append(f'<mxCell id="{pid}" value="{html.escape(nombre)}" style="{EST[estilo]}" vertex="1" parent="1">'
                  f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{total}" as="geometry"/></mxCell>')
    celdas.extend(hijos)
    return pid, total


def flecha(a, b):
    aristas.append(f'<mxCell id="{nuevo_id("e")}" style="{LINEA}" edge="1" parent="1" source="{a}" target="{b}">'
                   f'<mxGeometry relative="1" as="geometry"/></mxCell>')


def s(titulo, detalle=''):
    return f'<b>{titulo}</b>' + (f'<br>{detalle}' if detalle else '')


def lista(nombres):
    nombres = list(nombres)
    if len(nombres) < 2:
        return ''.join(nombres)
    return ', '.join(nombres[:-1]) + ' y ' + nombres[-1]


# ---------- Encabezado ----------
libre('Mapa del sitio de Fedesarrollo', 40, 20, 900, 44, 'titulo')
libre('Cada recuadro es una página. Las cajas de adentro son sus secciones, de arriba hacia abajo. Las flechas indican a qué página se llega desde otra. Para proponer un cambio, mueva, borre o agregue cajas.', 40, 66, 1300, 40, 'texto')

COL = [40 + k * (W + 40) for k in range(6)]

# ---------- Fila 1: lo que se ve en todas las páginas + inicio ----------
menu_inv = f'Por tipo (investigaciones, libros, comisiones, Documentos y Notas de Política), por tema ({len(temas)} temas) y Especiales ({lista(e["nombre"] for e in especiales)})'
comun, h_comun = pagina('En todas las páginas', [
    (s('Barra superior', 'Frase «Contribuimos al desarrollo del país.», enlaces a Repositorio, Contacto y Boletín, y buscador de publicaciones'), 'seccion'),
    (s('Menú principal', 'Investigaciones, Coyuntura, Áreas, Equipo, Noticias y eventos, Nosotros'), 'seccion'),
    (s('Menú desplegable de Investigaciones', menu_inv), 'seccion'),
    (s('Menú desplegable de Coyuntura', f'Encuestas ({lista(e["serie"] for e in encuestas)}), publicaciones periódicas y calendario'), 'seccion'),
    (s('Menú desplegable de Áreas', lista(a['nombre'] for a in areas)), 'seccion'),
    (s('Pie de página', 'Suscripción al boletín, enlaces del sitio, dirección, teléfono, correo y redes sociales'), 'seccion'),
], COL[0], 130, 'comun')

inicio, h_ini = pagina('Inicio', [
    (s('1. Portada que rota', 'Destacados actuales: ' + lista(d['etiqueta'] for d in destacados)), 'clave'),
    (s('2. Lo más reciente', 'La investigación más reciente en grande, dos más debajo y, al lado, la última edición de cada encuesta o informe de coyuntura'), 'seccion'),
    (s('3. Indicadores de coyuntura', lista(f'{i["sigla"]} {i["valor"]}' for i in indicadores)), 'seccion'),
    (s('4. Documentos de Política 2026-2030', 'Portadas de los primeros cuatro documentos de la serie'), 'seccion'),
    (s('5. Áreas de investigación', lista(a['nombre'] for a in areas)), 'seccion'),
    (s('6. Dirección', 'Foto de la directora ejecutiva y de los directores de área'), 'seccion'),
    (s('7. En los medios y Eventos', 'Cinco notas de prensa y cuatro eventos'), 'seccion'),
], COL[2], 130, 'pagina', W * 2 + 40)

fila2 = 130 + max(h_comun, h_ini) + 80

# ---------- Fila 2: páginas del menú ----------
inv, h_inv = pagina('Investigaciones', [
    (s('Introducción', 'Qué se encuentra en la página y enlace a Coyuntura'), 'seccion'),
    (s('Especiales', lista(e['nombre'] for e in especiales)), 'clave'),
    (s('Buscador y filtros', 'Buscar por título, autor o palabra y filtrar por tipo, área y tema'), 'seccion'),
    (s('Lista de publicaciones', 'Portada, tipo, título, autores, resumen corto y fecha. 15 por página'), 'seccion'),
    (s('Cada publicación abre su ficha en el repositorio institucional'), 'externo'),
], COL[0], fila2)

coy, h_coy = pagina('Coyuntura', [
    (s('Introducción', 'Encuestas e indicadores que Fedesarrollo publica cada mes'), 'seccion'),
    (s('Indicadores', lista(f'{i["sigla"]} {i["valor"]}' for i in indicadores)), 'clave'),
    (s('Próximas publicaciones', 'Las siguientes ocho fechas del calendario de encuestas'), 'seccion'),
] + [(s(e['nombre'], 'Descripción y los dos últimos resultados'), 'seccion') for e in encuestas] + [
    (s('Todas las publicaciones de coyuntura', 'Encuestas, Prospectiva Económica, Tendencia Económica, Bitácora Semanal y comunicados, con filtro por serie'), 'seccion'),
], COL[1], fila2)

ar, h_ar = pagina('Áreas', [
    (s('Introducción', 'Fedesarrollo organiza su trabajo en cinco áreas'), 'seccion'),
] + [(s(a['nombre'], a['descripcion']), 'clave') for a in areas] + [
    (s('Especiales', lista(e['nombre'] for e in especiales)), 'seccion'),
], COL[2], fila2)

grupos_equipo = ['Dirección'] + [a['nombre'] for a in areas] + ['Investigadores asociados', 'Administración']
eq, h_eq = pagina('Equipo', [
    (s('Introducción y accesos', 'Accesos directos a cada grupo'), 'seccion'),
] + [(s(g), 'seccion') for g in grupos_equipo] + [
    (s('Prensa', 'Contacto de Comunicaciones y prensa'), 'seccion'),
], COL[3], fila2)

no, h_no = pagina('Noticias y eventos', [
    (s('En los medios', 'Notas de prensa con su medio y, cuando aplica, enlace a la investigación que citan'), 'seccion'),
    (s('Próximos eventos', 'Se llenan solos con las fechas que aún no han pasado'), 'seccion'),
    (s('Eventos anteriores'), 'seccion'),
], COL[4], fila2)

ns, h_ns = pagina('Nosotros', [
    (s('Quiénes somos, misión e historia'), 'seccion'),
    (s('Reconocimientos', 'Primer lugar en Centro y Suramérica (2019 y 2020) y top 3 de ONG más admiradas (2022)'), 'seccion'),
    (s('Directores de Fedesarrollo', 'Los 15 directores desde 1970'), 'seccion'),
    (s('Gobierno corporativo', 'Informes de gestión, políticas, ODS, régimen tributario y datos personales'), 'seccion'),
    (s('Contacto', 'Dirección, teléfono, correo, boletín y redes'), 'seccion'),
], COL[5], fila2)

for pid in (inv, coy, ar, eq, no, ns):
    flecha(inicio, pid)

# ---------- Fila 3: páginas que cuelgan de las anteriores ----------
fila3 = fila2 + max(h_inv, h_coy, h_ar, h_eq, h_no, h_ns) + 80

y = fila3
docs_serie = [d for d in serie if d.get('clase') == 'documento']
notas_serie = [d for d in serie if d.get('clase') == 'nota']
se, h = pagina('Serie Documentos de Política 2026-2030', [
    (s('Portada de la serie', 'Título, texto de presentación y tres portadas'), 'seccion'),
] + [(s(f'Documento de Política: {d["titulo"]}', d['autores_corto']), 'clave') for d in docs_serie] + [
    (s(f'Nota de Política: {d["titulo"]}', d['autores_corto']), 'clave') for d in notas_serie] + [
    (s('Página de cada documento', 'Título, autores, video si lo tiene, portadas para ver o descargar el PDF, la idea central y tres mensajes'), 'seccion'),
], COL[0], y, 'especial')
flecha(inv, se)
y += h + 40
docs_oac = [d for d in oac if d.get('clase') == 'documento']
notas_oac = [d for d in oac if d.get('clase') == 'nota']
oc, h = pagina('Organizados contra el crimen', [
    (s('Portada', 'Qué es la iniciativa y enlace a su sitio'), 'seccion'),
] + [(s(f'Documento {d["numero"]}: {d["titulo"]}', d['autores_corto']), 'clave') for d in docs_oac] + [
    (s(f'Nota {d["numero"]}: {d["titulo"]}', d['autores_corto']), 'clave') for d in notas_oac] + [
    (s('Página de cada documento', 'Autores, fecha, resumen y descarga en español, inglés y portugués'), 'seccion'),
    (s('La red', '15 instituciones'), 'seccion'),
], COL[0], y, 'especial')
flecha(inv, oc)
y += h + 40
ex, h = pagina('Explorador de marcos regulatorios', [
    (s('Herramienta del Banco Mundial con Fedesarrollo y la Universidad de los Andes, en inglés'), 'externo'),
], COL[0], y, 'especial')
flecha(inv, ex)

y = fila3
for a in areas:
    gente = [p for p in equipo if p.get('area') == a['slug']]
    director = next((p['nombre'] for p in gente if p.get('director')), None)
    rel = [e['nombre'] for e in especiales if a['slug'] in (e.get('areas') or [])]
    secciones = [
        (s('Encabezado', f'Descripción, temas ({lista(temas[t] for t in a["temas"])}) y portadas recientes del área'), 'seccion'),
        (s('Lo más reciente', 'Publicaciones del área, la más reciente en grande'), 'seccion'),
    ]
    if rel:
        secciones.append((s('Especiales', lista(rel)), 'clave'))
    secciones.append((s('Equipo del área', (f'Dirige {director}. ' if director else 'Sin director asignado. ') + (f'{len(gente)} personas en total' if len(gente) != 1 else '1 persona en total')), 'seccion'))
    pid, h = pagina(f'Área: {a["nombre"]}', secciones, COL[2], y)
    flecha(ar, pid)
    y += h + 40

pf, h = pagina('Perfil de cada persona', [
    (s('Foto, nombre y cargo'), 'seccion'),
    (s('Biografía'), 'seccion'),
    (s('Área, correo y hoja de vida'), 'seccion'),
    (s('Publicaciones en las que aparece'), 'seccion'),
    (s(f'{len(equipo)} perfiles', 'Dirección e investigadores. El personal administrativo no tiene perfil'), 'clave'),
], COL[3], fila3)
flecha(eq, pf)

fu, h_fu = pagina('Páginas que no están en el menú', [
    (s('Portal interno', 'Herramientas y tableros del equipo. No está enlazado desde el sitio público'), 'seccion'),
    (s('Página de error', 'Aparece cuando una dirección no existe y ofrece buscar o volver al inicio'), 'seccion'),
    (s('Direcciones antiguas', 'Temas, Encuestas y Seguridad y justicia llevan a sus páginas nuevas'), 'seccion'),
], COL[4], fila3, 'comun')

yl = fila3 + h_fu + 40
libre('Leyenda', COL[4], yl, 300, 24, 'etiqueta')
for k, (txt, est) in enumerate([('Sección de una página', 'seccion'), ('Sección con contenido destacado o nombres', 'clave'),
                                ('Lleva a otro sitio', 'externo')]):
    libre(txt, COL[4], yl + 30 + k * 44, W, 36, est)
for k, (txt, est) in enumerate([('Página', 'pagina'), ('Especial (serie, iniciativa o herramienta)', 'especial')]):
    i = nuevo_id()
    celdas.append(f'<mxCell id="{i}" value="{html.escape(txt)}" style="{EST[est]}" vertex="1" parent="1"><mxGeometry x="{COL[5]}" y="{yl + 30 + k * 60}" width="{W}" height="44" as="geometry"/></mxCell>')

xml = ('<mxfile host="app.diagrams.net"><diagram id="mapa" name="Mapa del sitio">'
       '<mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" '
       'page="0" pageScale="1" math="0" shadow="0"><root>'
       '<mxCell id="0"/><mxCell id="1" parent="0"/>' + ''.join(celdas) + ''.join(aristas) + '</root></mxGraphModel></diagram></mxfile>')
open(SALIDA, 'w').write(xml)
print('listo:', len(areas), 'áreas,', len(especiales), 'especiales,', len(equipo), 'perfiles')
