/* Visor de PDF en ventana emergente para las páginas de detalle.
   Cada miniatura con [data-pdf] abre el documento en un modal con <iframe>.
   El enlace "Descargar…" (fuera del modal) descarga con el atributo download. */
(function () {
  var triggers = document.querySelectorAll('[data-pdf]');
  if (!triggers.length) return;

  // Construir el modal una sola vez e inyectarlo al final del body.
  var modal = document.createElement('div');
  modal.className = 'pdf-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Visor de documento');
  modal.innerHTML =
    '<div class="pdf-modal-box">' +
      '<div class="pdf-modal-bar">' +
        '<span class="pdf-modal-title"></span>' +
        '<span class="pdf-modal-actions">' +
          '<a class="pdf-modal-download" href="#" download>' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
            'Descargar' +
          '</a>' +
          '<button type="button" class="pdf-modal-close" aria-label="Cerrar">&times;</button>' +
        '</span>' +
      '</div>' +
      '<iframe class="pdf-modal-frame" title="Documento (PDF)" src=""></iframe>' +
    '</div>';
  document.body.appendChild(modal);

  var frame    = modal.querySelector('.pdf-modal-frame');
  var titleEl  = modal.querySelector('.pdf-modal-title');
  var download = modal.querySelector('.pdf-modal-download');
  var closeEl  = modal.querySelector('.pdf-modal-close');

  function open(pdf, title) {
    frame.src = pdf;
    download.href = pdf;
    titleEl.textContent = title || 'Documento';
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    modal.classList.remove('is-open');
    frame.src = '';                 // detiene la carga y libera memoria
    document.body.style.overflow = '';
  }

  triggers.forEach(function (el) {
    el.addEventListener('click', function () {
      open(el.getAttribute('data-pdf'), el.getAttribute('data-title'));
    });
  });
  closeEl.addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
})();
