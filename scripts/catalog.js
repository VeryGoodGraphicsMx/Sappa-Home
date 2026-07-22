(function () {
  'use strict';

  const PLACEHOLDER_IMAGE = '/assets/product-placeholder.svg';
  const grid = document.getElementById('catalogGrid');
  const searchInput = document.getElementById('searchInput');
  const chipWrap = document.getElementById('chipWrap');
  const resultCount = document.getElementById('resultCount');
  const pillTotal = document.getElementById('pillTotal');
  const modal = document.getElementById('productModal');
  const modalContent = document.getElementById('productModalContent');
  const modalClose = document.getElementById('productModalClose');
  const originalPreview = window.SappaInventory.IS_ORIGINAL_PREVIEW;

  let inventory = [];
  let activeCategory = 'all';
  let openProduct = null;
  let openImageIndex = 0;
  let previousFocus = null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalize(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function productImages(product) {
    return product.images.length ? product.images : [PLACEHOLDER_IMAGE];
  }

  function imageAlt(product, index) {
    if (!product.images.length) return `Imagen pendiente para ${product.name}, SKU ${product.sku}`;
    return `${product.name}, SKU ${product.sku}, vista ${index + 1} de ${product.images.length}`;
  }

  function consultationLink(product) {
    const subject = encodeURIComponent(`Consulta SKU ${product.sku}`);
    const body = encodeURIComponent(`Hola, quiero consultar disponibilidad del modelo ${product.sku} (${product.name}).`);
    return `mailto:sappaheadwear@gmail.com?subject=${subject}&body=${body}`;
  }

  function filteredProducts() {
    const query = normalize(searchInput.value.trim());
    return inventory.filter(product => {
      const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
      const searchable = normalize(`${product.name} ${product.sku} ${product.category} ${product.material}`);
      return matchesCategory && (!query || searchable.includes(query));
    });
  }

  function buildChips() {
    chipWrap.replaceChildren();
    const categories = ['all', ...new Set(inventory.map(product => product.category))];

    categories.forEach(category => {
      const button = document.createElement('button');
      button.className = `chip${category === activeCategory ? ' active' : ''}`;
      button.type = 'button';
      button.textContent = category === 'all' ? 'Todos' : category;
      button.setAttribute('aria-pressed', String(category === activeCategory));
      button.addEventListener('click', () => {
        activeCategory = category;
        buildChips();
        renderCatalog();
      });
      chipWrap.appendChild(button);
    });
  }

  function galleryControls(product, images) {
    if (product.images.length < 2) return '';
    const key = encodeURIComponent(product.handle);
    return `
      <button class="gallery-control gallery-prev" type="button" data-gallery-key="${key}" data-direction="-1" aria-label="Imagen anterior de ${escapeHtml(product.name)}">‹</button>
      <button class="gallery-control gallery-next" type="button" data-gallery-key="${key}" data-direction="1" aria-label="Imagen siguiente de ${escapeHtml(product.name)}">›</button>
      <span class="gallery-count" aria-live="polite">1 / ${images.length}</span>`;
  }

  function productCard(product) {
    const images = productImages(product);
    const hasImage = product.images.length > 0;
    const safeHandle = escapeHtml(product.handle);
    const detailUrl = `/producto/${encodeURIComponent(product.handle)}`;

    return `
      <article class="product-card" data-product-handle="${safeHandle}" data-active="true">
        <div class="card-image${hasImage ? '' : ' is-placeholder'}">
          <img
            src="${escapeHtml(images[0])}"
            alt="${escapeHtml(imageAlt(product, 0))}"
            data-image-index="0"
            loading="lazy"
            decoding="async"
          >
          ${galleryControls(product, images)}
          <div class="card-action">
            <a href="${consultationLink(product)}">Consultar<span class="availability-label"> disponibilidad</span></a>
          </div>
        </div>
        <div class="card-body">
          <div class="card-category">${escapeHtml(product.category)}</div>
          <h2 class="card-name">${escapeHtml(product.name)}</h2>
          <div class="card-sku">${escapeHtml(product.sku)}</div>
          <p class="card-material">${escapeHtml(product.material)}</p>
          <a class="card-details" href="${detailUrl}" data-detail-handle="${safeHandle}">Ver detalle</a>
          <a class="mobile-contact" href="${consultationLink(product)}">Consultar</a>
        </div>
      </article>`;
  }

  function renderCatalog() {
    const products = filteredProducts();
    resultCount.textContent = `${products.length} producto${products.length === 1 ? '' : 's'}`;

    if (!products.length) {
      grid.innerHTML = `
        <div class="empty-state is-visible">
          <h3>Sin resultados</h3>
          <p>No encontramos productos con esos filtros. Prueba con otro nombre, SKU, material o categoría.</p>
        </div>`;
      return;
    }

    grid.innerHTML = products.map(productCard).join('');
  }

  function renderModal() {
    if (!openProduct) return;
    const images = productImages(openProduct);
    const image = images[openImageIndex];
    const hasGallery = openProduct.images.length > 1;

    modalContent.innerHTML = `
      <div class="modal-gallery${openProduct.images.length ? '' : ' is-placeholder'}">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(imageAlt(openProduct, openImageIndex))}" decoding="async">
        ${hasGallery ? `
          <button class="modal-gallery-control modal-gallery-prev" type="button" data-modal-direction="-1" aria-label="Imagen anterior">‹</button>
          <button class="modal-gallery-control modal-gallery-next" type="button" data-modal-direction="1" aria-label="Imagen siguiente">›</button>
          <span class="modal-gallery-count" aria-live="polite">${openImageIndex + 1} / ${images.length}</span>` : ''}
      </div>
      <div class="modal-details">
        <div class="card-category">${escapeHtml(openProduct.category)}</div>
        <h2 id="productModalTitle">${escapeHtml(openProduct.name)}</h2>
        <div class="modal-sku">SKU ${escapeHtml(openProduct.sku)}</div>
        <dl class="product-facts">
          <div><dt>Material</dt><dd>${escapeHtml(openProduct.material)}</dd></div>
          <div><dt>Estado</dt><dd>Modelo activo para consulta</dd></div>
        </dl>
        ${openProduct.images.length ? '' : '<p class="pending-image-note">Fotografía pendiente. El producto permanece registrado en el inventario.</p>'}
        <a class="modal-consult" href="${consultationLink(openProduct)}">Consultar disponibilidad</a>
      </div>`;
  }

  function openProductModal(product, options = {}) {
    if (!product) return;
    previousFocus = document.activeElement;
    openProduct = product;
    openImageIndex = 0;
    renderModal();
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modalClose.focus();

    if (options.updateHistory !== false) {
      if (originalPreview) {
        const previewUrl = new URL('/sappa-catalogo.html', window.location.origin);
        previewUrl.searchParams.set('preview', 'originals');
        previewUrl.searchParams.set('product', product.handle);
        window.history.pushState({ product: product.handle }, '', previewUrl);
      } else {
        window.history.pushState({ product: product.handle }, '', `/producto/${encodeURIComponent(product.handle)}`);
      }
    }
  }

  function closeProductModal(options = {}) {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    openProduct = null;
    openImageIndex = 0;

    if (options.updateHistory !== false) {
      window.history.pushState({}, '', originalPreview
        ? '/sappa-catalogo.html?preview=originals'
        : '/sappa-catalogo.html');
    }
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  }

  function resolveProductFromLocation() {
    const routeMatch = window.location.pathname.match(/^\/producto\/([^/]+)\/?$/i);
    const queryValue = new URLSearchParams(window.location.search).get('product');
    const value = routeMatch ? decodeURIComponent(routeMatch[1]) : queryValue;
    return value ? window.SappaInventory.getProductBySkuOrHandle(inventory, value) : null;
  }

  function showImageError(image) {
    if (image.dataset.fallbackApplied === 'true') return;
    image.dataset.fallbackApplied = 'true';
    image.src = PLACEHOLDER_IMAGE;
    image.alt = 'Imagen no disponible';
    image.closest('.card-image, .modal-gallery')?.classList.add('is-placeholder');
    image.closest('.card-image, .modal-gallery')?.querySelectorAll('.gallery-control, .gallery-count, .modal-gallery-control, .modal-gallery-count')
      .forEach(element => element.remove());
  }

  grid.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) showImageError(event.target);
  }, true);

  modalContent.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) showImageError(event.target);
  }, true);

  grid.addEventListener('click', event => {
    const control = event.target.closest('.gallery-control');
    if (control) {
      event.preventDefault();
      event.stopPropagation();
      const handle = decodeURIComponent(control.dataset.galleryKey);
      const product = window.SappaInventory.getProductBySkuOrHandle(inventory, handle);
      if (!product || product.images.length < 2) return;

      const card = control.closest('.product-card');
      const image = card.querySelector('.card-image img');
      const counter = card.querySelector('.gallery-count');
      const current = Number(image.dataset.imageIndex || 0);
      const next = (current + Number(control.dataset.direction) + product.images.length) % product.images.length;
      image.src = product.images[next];
      image.alt = imageAlt(product, next);
      image.dataset.imageIndex = String(next);
      counter.textContent = `${next + 1} / ${product.images.length}`;
      return;
    }

    const detailLink = event.target.closest('[data-detail-handle]');
    if (!detailLink) return;
    event.preventDefault();
    openProductModal(window.SappaInventory.getProductBySkuOrHandle(inventory, detailLink.dataset.detailHandle));
  });

  modalContent.addEventListener('click', event => {
    const control = event.target.closest('[data-modal-direction]');
    if (!control || !openProduct || openProduct.images.length < 2) return;
    openImageIndex = (openImageIndex + Number(control.dataset.modalDirection) + openProduct.images.length) % openProduct.images.length;
    renderModal();
  });

  modalClose.addEventListener('click', () => closeProductModal());
  modal.addEventListener('click', event => {
    if (event.target === modal) closeProductModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closeProductModal();
  });
  window.addEventListener('popstate', () => {
    const product = resolveProductFromLocation();
    if (product) openProductModal(product, { updateHistory: false });
    else closeProductModal({ updateHistory: false });
  });
  searchInput.addEventListener('input', renderCatalog);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));

  async function initialize() {
    try {
      const allProducts = await window.SappaInventory.loadInventory();
      inventory = window.SappaInventory.getActiveProducts(allProducts);
      pillTotal.textContent = `${inventory.length} modelos`;
      buildChips();
      renderCatalog();

      const product = resolveProductFromLocation();
      if (product) openProductModal(product, { updateHistory: false });
    } catch (error) {
      console.error(error);
      resultCount.textContent = 'Inventario no disponible';
      pillTotal.textContent = 'Catálogo temporalmente no disponible';
      grid.innerHTML = `
        <div class="empty-state is-visible">
          <h3>No pudimos cargar el catálogo</h3>
          <p>Intenta recargar la página. Si el problema continúa, contáctanos directamente.</p>
        </div>`;
    }
  }

  initialize();
}());
