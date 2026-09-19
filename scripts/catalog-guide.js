(function () {
  'use strict';
  const en = window.SappaInventory.IS_ENGLISH;
  document.querySelector('.footer-copy').textContent = en ? '© 2026 Sappa Headwear. All rights reserved.' : '© 2026 Sappa Headwear. Todos los derechos reservados.';
  const marquee = en ? ['Panama Style','Linen','Linen Indiana','Hybrid','Linen Classic','Vented Cotton','Mixed Cotton','Sappa Headwear'] : ['Tipo Panamá','Lino','Lino Indiana','Híbridos','Lino Clásico','Tela Calada','Manta Mixto','Sappa Headwear'];
  document.querySelectorAll('.marquee-item').forEach((item,i) => { item.textContent = marquee[i % marquee.length] + ' ✦'; });
  document.querySelectorAll('.hero-pills .pill')[2].textContent = en ? 'Panama · Linen · Cowboy · Pork Pie' : 'Panamá · Lino · Vaquero · Cazuelita';
  const text = en ? {
    label: 'THE DETAILS THAT DEFINE YOUR HAT', title: 'Know your SAPPA.',
    intro: 'Explore its construction, find your size and compare each collection at a glance.',
    alt: 'SAPPA hat anatomy: crown, brim, hatband and inner lining; arrows show crown height and brim width.',
    expand: 'View illustration at full size', note: 'Illustration for reference. Construction and lining vary by model.',
    parts: [['Crown', 'The upper part of the hat.'], ['Brim', 'The edge around the crown.'], ['Hatband', 'The ribbon around the outside.'], ['Inner lining', 'The fabric inside, when present.']],
    sizes: 'Find your size', sizeText: 'Measure your head circumference with a flexible tape, just above the eyebrows and ears. Keep the tape level and comfortably snug.',
    sizeNote: 'Approximate inch conversions. Confirm the available size for your chosen model.',
    measurements: 'Brim width and crown height describe the shape of the hat; head circumference determines your size.',
    skip: 'Explore the catalog'
  } : {
    label: 'LOS DETALLES QUE DEFINEN TU SOMBRERO', title: 'Conoce tu SAPPA.',
    intro: 'Descubre su construcción, encuentra tu talla y compara cada colección de un vistazo.',
    alt: 'Anatomía del sombrero SAPPA: copa, ala, banda y forro interior; las flechas indican altura de copa y ancho de ala.',
    expand: 'Ver ilustración en tamaño completo', note: 'Ilustración de referencia. La construcción y el forro varían según el modelo.',
    parts: [['Copa', 'La parte superior del sombrero.'], ['Ala', 'El borde que rodea la copa.'], ['Banda', 'La cinta que rodea el exterior.'], ['Forro interior', 'La tela del interior, cuando aplica.']],
    sizes: 'Encuentra tu talla', sizeText: 'Mide el contorno de tu cabeza con una cinta flexible, justo encima de las cejas y las orejas. Mantén la cinta horizontal y ajustada sin apretar.',
    sizeNote: 'Conversión aproximada a pulgadas. Confirma la talla disponible para el modelo que elijas.',
    measurements: 'El ancho del ala y la altura de copa describen la forma del sombrero; el contorno de cabeza determina tu talla.',
    skip: 'Explorar el catálogo'
  };
  const guide = document.createElement('section');
  guide.className = 'catalog-guide';
  guide.id = 'guia-sappa';
  guide.setAttribute('aria-labelledby', 'guide-title');
  const src = `/assets/catalog-guide/hat-anatomy-${en ? 'en' : 'es'}.png`;
  guide.innerHTML = `
    <header class="guide-heading"><div class="guide-label">${text.label}</div><h2 id="guide-title">${text.title}</h2><p>${text.intro}</p><a class="guide-skip" href="#filterBar">${text.skip} ↓</a></header>
    <div class="guide-layout">
      <div class="anatomy-panel"><a href="${src}" target="_blank" rel="noopener" class="anatomy-link" aria-label="${text.expand}"><img src="${src}" alt="${text.alt}" width="1536" height="1024" decoding="async"><span>${text.expand} ↗</span></a>
        <dl class="anatomy-legend">${text.parts.map(([name, description]) => `<div><dt>${name}</dt><dd>${description}</dd></div>`).join('')}</dl><p class="guide-note">${text.note}</p>
      </div>
      <div class="guide-sizing" id="tallas"><h3>${text.sizes}</h3><p>${text.sizeText}</p><div id="guide-size-table"></div><p class="guide-note">${text.sizeNote}</p><p class="guide-measurement-note">${text.measurements}</p></div>
    </div>`;
  const oldSizes = document.querySelector('.size-section');
  const table = document.querySelector('.size-table-wrap');
  if (table) guide.querySelector('#guide-size-table').appendChild(table);
  if (oldSizes) oldSizes.remove();
  document.getElementById('filterBar').before(guide);
  const navHome = document.querySelector('.nav-links a');
  if (navHome) navHome.href = en ? '/en/' : '/es/';
  document.querySelector('.nav-logo').href = en ? '/en/' : '/es/';
  const languageLink = document.createElement('a');
  const other = new URL(window.location.href);
  en ? other.searchParams.delete('lang') : other.searchParams.set('lang', 'en');
  languageLink.href = other.pathname + other.search + other.hash;
  languageLink.className = 'catalog-language';
  languageLink.hreflang = en ? 'es' : 'en';
  languageLink.textContent = en ? 'Español' : 'English';
  languageLink.setAttribute('aria-label', en ? 'View catalog in Spanish' : 'Ver catálogo en inglés');
  document.querySelector('nav').appendChild(languageLink);
}());
