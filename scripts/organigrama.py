"""Genera organigrama.drawio a partir de _equipo, _areas y _data/administracion.yml."""
import glob, json, os, subprocess, sys, html

R = sys.argv[1]
SALIDA = sys.argv[2]


def yaml(ruta):
    return json.loads(subprocess.run(['ruby', '-ryaml', '-rjson', '-e', 'puts JSON.generate(YAML.load_file(ARGV[0]))', ruta],
                                     capture_output=True, text=True, check=True).stdout)


def front(ruta):
    texto = open(ruta).read().split('---')[1]
    return json.loads(subprocess.run(['ruby', '-ryaml', '-rjson', '-e', 'puts JSON.generate(YAML.load(STDIN.read))'],
                                     input=texto, capture_output=True, text=True, check=True).stdout)


areas = sorted((front(f) | {'slug': os.path.basename(f)[:-3]} for f in glob.glob(f'{R}/_areas/*.md')), key=lambda a: a['orden'])
gente = [front(f) for f in glob.glob(f'{R}/_equipo/*.md')]
admin = yaml(f'{R}/_data/administracion.yml')

# Estilos con la paleta de marca
NAVY, AZUL, LUZ, GRIS, BLANCO = '#031C4A', '#081BFD', '#BBD4F3', '#F6F6F6', '#FFFFFF'
FUENTE = 'fontFamily=Inter;'
E = {
    'direccion': f'rounded=0;whiteSpace=wrap;html=1;fillColor={NAVY};strokeColor={NAVY};fontColor={BLANCO};fontSize=13;{FUENTE}',
    'area': f'rounded=0;whiteSpace=wrap;html=1;fillColor={AZUL};strokeColor={AZUL};fontColor={BLANCO};fontSize=13;fontStyle=1;{FUENTE}',
    'director': f'rounded=0;whiteSpace=wrap;html=1;fillColor={LUZ};strokeColor={NAVY};fontColor={NAVY};fontSize=11;strokeWidth=2;{FUENTE}',
    'persona': f'rounded=0;whiteSpace=wrap;html=1;fillColor={BLANCO};strokeColor={LUZ};fontColor={NAVY};fontSize=11;{FUENTE}',
    'grupo': f'rounded=0;whiteSpace=wrap;html=1;fillColor={GRIS};strokeColor={GRIS};fontColor={NAVY};fontSize=13;fontStyle=1;{FUENTE}',
    'nivel': f'text;html=1;align=left;verticalAlign=middle;fontColor=#444E6E;fontSize=10;fontStyle=2;{FUENTE}',
    'titulo': f'text;html=1;align=left;verticalAlign=middle;fontColor={NAVY};fontSize=24;fontStyle=1;fontFamily=Georgia;',
    'nota': f'text;html=1;align=left;verticalAlign=top;fontColor=#444E6E;fontSize=11;whiteSpace=wrap;{FUENTE}',
}
LINEA = f'edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=none;strokeColor={NAVY};'
LINEA_PUNTOS = f'edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=none;dashed=1;strokeColor={AZUL};'

celdas, aristas = [], []
n = [1]


def caja(texto, x, y, w, h, estilo):
    n[0] += 1
    i = f'c{n[0]}'
    celdas.append(f'<mxCell id="{i}" value="{html.escape(texto)}" style="{E[estilo]}" vertex="1" parent="1">'
                  f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
    return i


def une(a, b, estilo=LINEA):
    n[0] += 1
    aristas.append(f'<mxCell id="e{n[0]}" style="{estilo}" edge="1" parent="1" source="{a}" target="{b}"><mxGeometry relative="1" as="geometry"/></mxCell>')


NIVELES = {2: 'Dirección del área', 3: 'Investigadores', 4: 'Investigadores asociados', 5: 'Investigadores asistentes',
           6: 'Asistentes de investigación', 7: 'Practicantes'}
W, G, H, GAP = 230, 40, 46, 8   # ancho de columna, separación, alto de caja, espacio vertical

caja('Equipo de Fedesarrollo', 40, 20, 600, 40, 'titulo')
celdas.append(f'<mxCell id="sub" value="{html.escape("Jerarquía: dirección, director de área, investigador, asistente de investigación y practicante.")}" style="{E["nota"]}" vertex="1" parent="1"><mxGeometry x="40" y="58" width="700" height="24" as="geometry"/></mxCell>')

columnas = len(areas) + 2   # áreas + asociados + administración
ancho_total = columnas * W + (columnas - 1) * G
centro = 40 + ancho_total / 2

directora = next(p for p in gente if p.get('cargo') == 'Directora Ejecutiva')
secretaria = next(p for p in gente if p['grupo'] == 'direccion' and p is not directora)
d_id = caja(f'<b>{directora["nombre"]}</b><br>{directora["cargo"]}', centro - 140, 110, 280, 60, 'direccion')

y_areas = 230
for k, a in enumerate(areas + [{'nombre': 'Investigadores asociados', 'slug': None}]):
    x = 40 + k * (W + G)
    a_id = caja(a['nombre'], x, y_areas, W, 50, 'area' if a['slug'] else 'grupo')
    une(d_id, a_id)
    if a['slug']:
        miembros = [p for p in gente if p.get('area') == a['slug']]
    else:
        miembros = [p for p in gente if p['grupo'] == 'investigacion' and not p.get('area')]
    y = y_areas + 50 + 16
    previo = a_id
    for r in range(1, 8):
        del_nivel = sorted((p for p in miembros if p.get('rango') == r), key=lambda p: p['nombre'])
        if not del_nivel:
            continue
        etiqueta = 'Dirección del área' if r == 1 else NIVELES.get(r, '')
        if a['slug'] is None:
            etiqueta = ''
        if etiqueta:
            caja(etiqueta, x, y, W, 18, 'nivel')
            y += 20
        for p in del_nivel:
            cargo = p.get('cargo_area') or p['cargo']
            estilo = 'director' if p.get('director') else 'persona'
            pid = caja(f'<b>{p["nombre"]}</b><br>{cargo}', x, y, W, H, estilo)
            if p is directora:
                une(d_id, pid, LINEA_PUNTOS)   # también dirige un área
            y += H + GAP
        y += 8

# Secretaría General con Administración y Servicios generales
x = 40 + (columnas - 1) * (W + G)
s_id = caja(f'<b>{secretaria["nombre"]}</b><br>{secretaria["cargo"]}', x, y_areas, W, 60, 'direccion')
une(d_id, s_id)
y = y_areas + 60 + 16
for grupo, nombre in (('administracion', 'Administración'), ('servicios', 'Servicios generales')):
    g_id = caja(nombre, x, y, W, 36, 'grupo')
    une(s_id, g_id)
    y += 36 + 10
    for p in sorted((p for p in admin if p['grupo'] == grupo), key=lambda p: p['nombre']):
        caja(f'<b>{p["nombre"]}</b><br>{p["cargo"]}', x, y, W, H, 'persona')
        y += H + GAP
    y += 16

xml = ('<mxfile host="app.diagrams.net"><diagram id="organigrama" name="Equipo">'
       '<mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" '
       'page="1" pageScale="1" pageWidth="2000" pageHeight="1400" math="0" shadow="0"><root>'
       '<mxCell id="0"/><mxCell id="1" parent="0"/>' + ''.join(celdas) + ''.join(aristas) + '</root></mxGraphModel></diagram></mxfile>')
open(SALIDA, 'w').write(xml)
print(len(gente), 'personas en _equipo,', len(admin), 'en administración')
