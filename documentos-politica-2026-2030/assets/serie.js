/* Fichas de la serie 2026-2030.
   - Cada miniatura con [data-pdf] abre el documento en un visor con <iframe>.
   - Las fichas con video lo muestran en una ventana la primera vez que alguien
     entra, y después con el botón [data-video]. */
(function () {
  function modal(clase, html) {
    var el = document.createElement('div');
    el.className = clase;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  }
  function abrir(el) { el.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
  function cerrar(el) { el.classList.remove('is-open'); document.body.style.overflow = ''; }

  // Visor de PDF
  var pdfs = document.querySelectorAll('[data-pdf]');
  if (pdfs.length) {
    var visor = modal('pdf-modal',
      '<div class="pdf-modal-box">' +
        '<div class="pdf-modal-bar">' +
          '<span class="pdf-modal-title"></span>' +
          '<span class="pdf-modal-actions">' +
            '<a class="pdf-modal-download" href="#" download>Descargar</a>' +
            '<button type="button" class="pdf-modal-close" aria-label="Cerrar">&times;</button>' +
          '</span>' +
        '</div>' +
        '<iframe class="pdf-modal-frame" title="Documento (PDF)" src=""></iframe>' +
      '</div>');
    visor.setAttribute('aria-label', 'Visor de documento');
    var frame = visor.querySelector('iframe');
    var cerrarVisor = function () { cerrar(visor); frame.src = ''; };

    pdfs.forEach(function (el) {
      el.addEventListener('click', function () {
        frame.src = el.dataset.pdf;
        visor.querySelector('.pdf-modal-download').href = el.dataset.pdf;
        visor.querySelector('.pdf-modal-title').textContent = el.dataset.title || 'Documento';
        abrir(visor);
      });
    });
    visor.querySelector('.pdf-modal-close').addEventListener('click', cerrarVisor);
    visor.addEventListener('click', function (e) { if (e.target === visor) cerrarVisor(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && visor.classList.contains('is-open')) cerrarVisor();
    });
  }

  // Video
  var boton = document.querySelector('[data-video]');
  if (boton) {
    var id = boton.dataset.video;
    var video = modal('video-modal',
      '<div class="video-modal-box">' +
        '<button type="button" class="video-modal-close" aria-label="Cerrar">&times;</button>' +
        '<div class="video-modal-video"><iframe title="Video" src="" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>' +
      '</div>');
    video.setAttribute('aria-label', 'Video del documento');
    var iframe = video.querySelector('iframe');
    var verVideo = function () {
      iframe.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&mute=1&rel=0';
      abrir(video);
    };
    var cerrarVideo = function () { cerrar(video); iframe.src = ''; };

    boton.addEventListener('click', function (e) { e.preventDefault(); verVideo(); });
    video.querySelector('.video-modal-close').addEventListener('click', cerrarVideo);
    video.addEventListener('click', function (e) { if (e.target === video) cerrarVideo(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && video.classList.contains('is-open')) cerrarVideo();
    });

    // Solo la primera visita de cada navegador (misma marca que usaba el sitio anterior)
    var clave = 'fede-video-' + location.pathname.split('/').pop().replace('.html', '');
    var visto = null;
    try { visto = localStorage.getItem(clave); } catch (e) {}
    if (!visto) {
      verVideo();
      try { localStorage.setItem(clave, '1'); } catch (e) {}
    }
  }
})();
