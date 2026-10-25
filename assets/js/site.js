// Comportamiento del sitio. Todo el contenido ya viene en el HTML: estos
// scripts solo filtran, paginan, rotan la portada y ocultan fechas pasadas.

// Fecha de hoy en Bogotá como AAAA-MM-DD, para comparar con las fechas del sitio
function hoyBogota() {
  var d = new Date(Date.now() - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

// Filtros y paginación de listados (investigaciones.html y coyuntura.html).
// La dirección guarda el estado (?q=&tipo=&tema=&area=&serie=&pagina=) para compartirlo.
(function () {
  var form = document.getElementById('filtros');
  if (!form) return;

  var items = Array.prototype.slice.call(document.querySelectorAll('[data-filtrable] .pub'));
  var porPagina = parseInt(document.querySelector('[data-filtrable]').dataset.porPagina, 10) || 1e9;
  var cuenta = document.getElementById('filtros-cuenta');
  var vacio = document.getElementById('filtros-vacio');
  var limpiar = document.getElementById('filtros-limpiar');
  var paginas = document.getElementById('paginas');
  var nombres = ['q', 'tipo', 'tema', 'area', 'serie'];
  var campos = {};
  nombres.forEach(function (n) { if (form.elements[n]) campos[n] = form.elements[n]; });
  var pagina = 1;

  // Texto de búsqueda sin tildes ni mayúsculas
  function normal(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function tiene(lista, v) { return (' ' + (lista || '') + ' ').indexOf(' ' + v + ' ') > -1; }
  items.forEach(function (el) { el._texto = normal(el.textContent); });

  function valor(n) { return campos[n] ? campos[n].value.trim() : ''; }

  function aplicar(actualizarUrl) {
    var q = normal(valor('q')), tipo = valor('tipo'), tema = valor('tema'), area = valor('area'), serie = valor('serie');
    var visibles = items.filter(function (el) {
      return (!tipo || el.dataset.tipo === tipo) &&
             (!serie || el.dataset.serie === serie) &&
             (!tema || tiene(el.dataset.temas, tema)) &&
             (!area || tiene(el.dataset.areas, area)) &&
             (!q || q.split(/\s+/).every(function (w) { return el._texto.indexOf(w) > -1; }));
    });
    var total = Math.max(1, Math.ceil(visibles.length / porPagina));
    if (pagina > total) pagina = total;
    var desde = (pagina - 1) * porPagina, hasta = desde + porPagina;

    items.forEach(function (el) { el.hidden = true; });
    visibles.forEach(function (el, i) { el.hidden = i < desde || i >= hasta; });

    var n = visibles.length;
    cuenta.textContent = n === 1 ? '1 publicación' : n + ' publicaciones';
    vacio.hidden = n > 0;
    limpiar.hidden = !(q || tipo || tema || area || serie);
    dibujarPaginas(total);

    if (actualizarUrl) {
      var params = new URLSearchParams();
      nombres.forEach(function (k) { if (valor(k)) params.set(k, valor(k)); });
      if (pagina > 1) params.set('pagina', pagina);
      var qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }
  }

  function dibujarPaginas(total) {
    if (!paginas) return;
    paginas.innerHTML = '';
    paginas.hidden = total < 2;
    function boton(texto, p, etiqueta, actual) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = texto;
      if (etiqueta) b.setAttribute('aria-label', etiqueta);
      if (actual) b.setAttribute('aria-current', 'page');
      b.disabled = p < 1 || p > total;
      b.addEventListener('click', function () {
        pagina = p;
        aplicar(true);
        form.scrollIntoView({ block: 'start' });
      });
      paginas.appendChild(b);
    }
    boton('Anterior', pagina - 1, 'Página anterior');
    for (var p = 1; p <= total; p++) boton(String(p), p, 'Página ' + p, p === pagina);
    boton('Siguiente', pagina + 1, 'Página siguiente');
  }

  // Estado inicial desde la dirección
  var inicial = new URLSearchParams(location.search);
  Object.keys(campos).forEach(function (k) { var v = inicial.get(k); if (v) campos[k].value = v; });
  pagina = parseInt(inicial.get('pagina'), 10) || 1;

  form.addEventListener('input', function () { pagina = 1; aplicar(true); });
  form.addEventListener('submit', function (e) { e.preventDefault(); pagina = 1; aplicar(true); });
  limpiar.addEventListener('click', function () { form.reset(); pagina = 1; aplicar(true); campos.q && campos.q.focus(); });

  aplicar(false);
})();

// Portada del inicio: rota los destacados y deja pasarlos a mano
(function () {
  var portada = document.querySelector('[data-portada]');
  if (!portada) return;
  var slides = Array.prototype.slice.call(portada.querySelectorAll('.destacado'));
  var puntos = Array.prototype.slice.call(portada.querySelectorAll('.portada__punto'));
  if (slides.length < 2) return;
  var actual = 0, temporizador = null;
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mostrar(i) {
    actual = (i + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.hidden = k !== actual; });
    puntos.forEach(function (p, k) { p.setAttribute('aria-current', k === actual ? 'true' : 'false'); });
  }
  function seguir() {
    if (quieto) return;
    clearInterval(temporizador);
    temporizador = setInterval(function () { mostrar(actual + 1); }, 8000);
  }
  puntos.forEach(function (p, k) { p.addEventListener('click', function () { mostrar(k); seguir(); }); });
  portada.addEventListener('mouseenter', function () { clearInterval(temporizador); });
  portada.addEventListener('mouseleave', seguir);
  portada.addEventListener('focusin', function () { clearInterval(temporizador); });
  mostrar(0);
  seguir();
})();

// Calendario de encuestas: oculta las fechas que ya pasaron y muestra las próximas
(function () {
  var tabla = document.querySelector('[data-calendario]');
  if (!tabla) return;
  var hoy = hoyBogota(), max = parseInt(tabla.dataset.calendario, 10) || 8, n = 0;
  Array.prototype.forEach.call(tabla.querySelectorAll('tr[data-fecha]'), function (tr) {
    var ok = tr.dataset.fecha >= hoy && n < max;
    tr.hidden = !ok;
    if (ok) n++;
  });
  var vacio = document.getElementById('calendario-vacio');
  if (vacio) vacio.hidden = n > 0;
})();

// Eventos: separa próximos y pasados según la fecha de hoy
(function () {
  var proximos = document.getElementById('eventos-proximos');
  var pasados = document.getElementById('eventos-pasados');
  if (!proximos || !pasados) return;
  var hoy = hoyBogota();
  var todos = Array.prototype.slice.call(document.querySelectorAll('[data-evento]'));
  todos.forEach(function (li) {
    if (li.dataset.evento >= hoy) proximos.appendChild(li); else pasados.appendChild(li);
  });
  // Los próximos van del más cercano al más lejano
  Array.prototype.slice.call(proximos.children).sort(function (a, b) {
    return a.dataset.evento < b.dataset.evento ? -1 : 1;
  }).forEach(function (li) { proximos.appendChild(li); });
  var vacio = document.getElementById('eventos-vacio');
  if (vacio) vacio.hidden = proximos.children.length > 0;
})();
