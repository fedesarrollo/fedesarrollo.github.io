// Filtros del listado de publicaciones (investigaciones.html).
// El listado completo ya viene en el HTML; aquí solo se ocultan los que no
// coinciden y se mantiene la dirección con ?tipo=&tema=&q= para poder compartirla.
(function () {
  var form = document.getElementById('filtros');
  if (!form) return;

  var items = Array.prototype.slice.call(document.querySelectorAll('[data-filtrable] .pub'));
  var cuenta = document.getElementById('filtros-cuenta');
  var vacio = document.getElementById('filtros-vacio');
  var limpiar = document.getElementById('filtros-limpiar');
  var campos = { q: form.elements.q, tipo: form.elements.tipo, tema: form.elements.tema };

  // Texto de búsqueda sin tildes ni mayúsculas
  function normal(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  items.forEach(function (el) { el._texto = normal(el.textContent); });

  function aplicar(actualizarUrl) {
    var q = normal(campos.q.value.trim());
    var tipo = campos.tipo.value;
    var tema = campos.tema.value;
    var n = 0;

    items.forEach(function (el) {
      var ok = (!tipo || el.dataset.tipo === tipo) &&
               (!tema || (' ' + el.dataset.temas + ' ').indexOf(' ' + tema + ' ') > -1) &&
               (!q || q.split(/\s+/).every(function (w) { return el._texto.indexOf(w) > -1; }));
      el.hidden = !ok;
      if (ok) n++;
    });

    cuenta.textContent = n === 1 ? '1 publicación' : n + ' publicaciones';
    vacio.hidden = n > 0;
    limpiar.hidden = !(q || tipo || tema);

    if (actualizarUrl) {
      var params = new URLSearchParams();
      if (campos.q.value.trim()) params.set('q', campos.q.value.trim());
      if (tipo) params.set('tipo', tipo);
      if (tema) params.set('tema', tema);
      var qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }
  }

  // Estado inicial desde la dirección
  var inicial = new URLSearchParams(location.search);
  Object.keys(campos).forEach(function (k) {
    var v = inicial.get(k);
    if (v) campos[k].value = v;
  });

  form.addEventListener('input', function () { aplicar(true); });
  form.addEventListener('submit', function (e) { e.preventDefault(); aplicar(true); });
  limpiar.addEventListener('click', function () { form.reset(); aplicar(true); campos.q.focus(); });

  aplicar(false);
})();
