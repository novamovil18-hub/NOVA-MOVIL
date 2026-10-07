/**
 * NOVAMÓVIL - Tienda Dinámica de Celulares
 * Interacciones, renderizado dinámico, modal de especificaciones y WhatsApp 77254863
 */

// Teléfono oficial de contacto
const STORE_PHONE = "77254863";
const WHATSAPP_COUNTRY_CODE = "591"; // Prefijo de Bolivia
const WHATSAPP_FULL = `${WHATSAPP_COUNTRY_CODE}${STORE_PHONE}`;

// Estado de la aplicación
const state = {
  phones: [],
  filteredPhones: [],
  selectedBrand: 'all',
  selectedFeature: 'all',
  searchQuery: '',
  sortOrder: 'featured',
  cart: [],
  currentModalPhone: null,
  comparePhone1Id: null,
  comparePhone2Id: null
};

// Cargar datos
async function initApp() {
  try {
    const response = await fetch('./data/phones.json');
    if (!response.ok) throw new Error('Network response error');
    state.phones = await response.json();
  } catch (err) {
    console.warn('Fallback a window.INITIAL_PHONES_DATA por entorno file:// o error:', err);
    if (window.INITIAL_PHONES_DATA && Array.isArray(window.INITIAL_PHONES_DATA)) {
      state.phones = window.INITIAL_PHONES_DATA;
    } else {
      console.error('No se pudieron cargar los datos de celulares');
    }
  }

  // Cargar carrito de localStorage si existe
  const savedCart = localStorage.getItem('novamovil_cart');
  if (savedCart) {
    try {
      state.cart = JSON.parse(savedCart);
      updateCartBadge();
    } catch (e) {
      console.error(e);
    }
  }

  setupEventListeners();
  renderCatalog();
  setupComparator();
}

// Configuración de escuchadores de eventos
function setupEventListeners() {
  // Búsqueda en vivo
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      applyFiltersAndRender();
    });
  }

  // Ordenamiento
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortOrder = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Filtros por Marca
  const brandPills = document.querySelectorAll('.filter-pill');
  brandPills.forEach(pill => {
    pill.addEventListener('click', () => {
      brandPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedBrand = pill.getAttribute('data-brand') || 'all';
      applyFiltersAndRender();
    });
  });

  // Filtros Rápidos por Características (Curvo, Guinness, IP68, etc.)
  const featureTags = document.querySelectorAll('.feature-tag-filter');
  featureTags.forEach(tag => {
    tag.addEventListener('click', () => {
      if (tag.classList.contains('active')) {
        tag.classList.remove('active');
        state.selectedFeature = 'all';
      } else {
        featureTags.forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        state.selectedFeature = tag.getAttribute('data-feature') || 'all';
      }
      applyFiltersAndRender();
    });
  });

  // Modal Cerrar
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalBackdrop = document.getElementById('specs-modal-backdrop');
  if (modalCloseBtn && modalBackdrop) {
    modalCloseBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  // Carrito Drawer Abrir/Cerrar
  const cartToggleBtn = document.getElementById('cart-toggle-btn');
  const cartDrawerBackdrop = document.getElementById('cart-drawer-backdrop');
  const closeCartBtn = document.getElementById('close-cart-btn');

  if (cartToggleBtn && cartDrawerBackdrop) {
    cartToggleBtn.addEventListener('click', openCart);
  }
  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', closeCart);
  }
  if (cartDrawerBackdrop) {
    cartDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === cartDrawerBackdrop) closeCart();
    });
  }

  // Comparador Modal Abrir/Cerrar
  const openCompareBtn = document.getElementById('open-compare-btn');
  const compareModal = document.getElementById('compare-modal');
  const closeCompareBtn = document.getElementById('close-compare-btn');

  if (openCompareBtn && compareModal) {
    openCompareBtn.addEventListener('click', openComparator);
  }
  if (closeCompareBtn) {
    closeCompareBtn.addEventListener('click', closeComparator);
  }
  if (compareModal) {
    compareModal.addEventListener('click', (e) => {
      if (e.target === compareModal) closeComparator();
    });
  }

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeCart();
      closeComparator();
    }
  });
}

// Filtrado y Ordenamiento
function applyFiltersAndRender() {
  let list = [...state.phones];

  // Filtro por marca
  if (state.selectedBrand !== 'all') {
    list = list.filter(p => p.brand.toLowerCase() === state.selectedBrand.toLowerCase());
  }

  // Filtro por característica especial
  if (state.selectedFeature !== 'all') {
    if (state.selectedFeature === 'curvo') {
      list = list.filter(p => p.specs.pantalla.toLowerCase().includes('curv') || p.badge.toLowerCase().includes('curv') || p.specs.caracteristicaUnica.toLowerCase().includes('curv'));
    } else if (state.selectedFeature === 'bateria-6000') {
      list = list.filter(p => p.specs.bateria.includes('6000'));
    } else if (state.selectedFeature === 'camara-108') {
      list = list.filter(p => p.specs.camara.includes('108'));
    } else if (state.selectedFeature === 'memoria-256') {
      list = list.filter(p => p.specs.memoria.includes('256'));
    }
  }

  // Filtro por búsqueda
  if (state.searchQuery) {
    const q = state.searchQuery;
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.specs.procesador.toLowerCase().includes(q) ||
      p.specs.camara.toLowerCase().includes(q) ||
      p.specs.caracteristicaUnica.toLowerCase().includes(q)
    );
  }

  // Ordenamiento
  if (state.sortOrder === 'price-asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (state.sortOrder === 'price-desc') {
    list.sort((a, b) => b.price - a.price);
  } else if (state.sortOrder === 'discount') {
    list.sort((a, b) => (b.originalPrice - b.price) - (a.originalPrice - a.price));
  } else {
    // Featured first
    list.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  }

  state.filteredPhones = list;
  renderCatalog();
}

// Renderizar el catálogo en el DOM
function renderCatalog() {
  const container = document.getElementById('phones-grid');
  const countEl = document.getElementById('catalog-count');

  if (!container) return;

  const phonesToDisplay = state.filteredPhones.length > 0 || state.searchQuery || state.selectedBrand !== 'all' || state.selectedFeature !== 'all'
    ? state.filteredPhones 
    : state.phones;

  if (countEl) {
    countEl.textContent = `${phonesToDisplay.length} celulares disponibles`;
  }

  if (phonesToDisplay.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
        <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🔍📱</span>
        <h3 style="font-size: 1.4rem; color: #fff; margin-bottom: 0.5rem;">No encontramos celulares con esos criterios</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Prueba limpiando los filtros o consultándonos directamente al 77254863</p>
        <button onclick="resetFilters()" style="background: var(--accent-cyan); color: #000; border: none; padding: 0.6rem 1.4rem; border-radius: 999px; font-weight: 700; cursor: pointer;">
          Ver todos los modelos
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = phonesToDisplay.map(phone => {
    const isGuinness = phone.badge.toLowerCase().includes('guinness');
    const badgeClass = isGuinness ? 'phone-card-badge guinness' : 'phone-card-badge';
    
    // Generar link directo de WhatsApp para este modelo
    const whatsappMsg = encodeURIComponent(`Hola NOVAMÓVIL! 👋 Estoy interesado en comprar el celular *${phone.name}* (Precio: Bs. ${phone.price.toLocaleString()}). ¿Tienen disponibilidad y entrega inmediata?`);
    const whatsappLink = `https://wa.me/${WHATSAPP_FULL}?text=${whatsappMsg}`;

    return `
      <article class="phone-card" data-id="${phone.id}">
        ${phone.badge ? `<div class="${badgeClass}">${phone.badge}</div>` : ''}
        
        <div class="phone-image-container" onclick="openSpecsModal('${phone.id}')" title="Haz clic para ver las características completas">
          <img src="${phone.image}" alt="${phone.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80'">
          <div class="overlay-click-hint">
            <span>🔍 Ver Especificaciones</span>
          </div>
        </div>

        <div class="phone-content">
          <div class="brand-row">
            <span class="phone-brand-tag">${phone.brand}</span>
            <div class="phone-colors-dots" title="Colores: ${phone.colors.join(', ')}">
              ${phone.colors.slice(0, 3).map(() => `<span class="color-dot-mini" style="background: var(--accent-cyan);"></span>`).join('')}
            </div>
          </div>

          <h3 class="phone-title" onclick="openSpecsModal('${phone.id}')" style="cursor: pointer;">${phone.name}</h3>

          <!-- Característica Única Destacada -->
          <div class="unique-feature-snippet" title="${phone.specs.caracteristicaUnica}">
            <strong>✨ Exclusivo:</strong> ${phone.specs.caracteristicaUnica}
          </div>

          <!-- Mini Especificaciones Clave -->
          <div class="specs-quick-grid">
            <div class="spec-quick-item" title="Cámara">
              <span class="icon">📸</span>
              <span>${phone.specs.camara.split('+')[0]}</span>
            </div>
            <div class="spec-quick-item" title="RAM y Almacenamiento">
              <span class="icon">🧠</span>
              <span>${phone.specs.ram.split(' ')[0]} RAM / ${phone.specs.memoria.split(' ')[0]}</span>
            </div>
            <div class="spec-quick-item" title="Batería">
              <span class="icon">🔋</span>
              <span>${phone.specs.bateria.split('con')[0]}</span>
            </div>
            <div class="spec-quick-item" title="Resistencia IP">
              <span class="icon">🛡️</span>
              <span>${phone.specs.ip.split('(')[0]}</span>
            </div>
          </div>

          <!-- Precio -->
          <div class="card-price-row">
            <div>
              <span class="current-price">Bs. ${phone.price.toLocaleString()}</span>
              ${phone.usdPrice ? `<span style="font-size: 0.8rem; color: #94a3b8; margin-left: 0.35rem;">(US$ ${phone.usdPrice})</span>` : ''}
              ${phone.originalPrice ? `<div class="original-price" style="margin-left: 0; font-size: 0.78rem;">Regular: Bs. ${phone.originalPrice.toLocaleString()}</div>` : ''}
            </div>
            ${phone.discount ? `<span class="discount-tag">${phone.discount}</span>` : ''}
          </div>

          <!-- Botones de Acción -->
          <div class="card-actions-row">
            <button class="btn-view-specs" onclick="openSpecsModal('${phone.id}')">
              <span>📋 Ver Ficha Técnica</span>
            </button>
            <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" class="btn-card-whatsapp" title="Pedir directo al 77254863 vía WhatsApp">
              💬
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Resetear filtros
window.resetFilters = function() {
  state.selectedBrand = 'all';
  state.selectedFeature = 'all';
  state.searchQuery = '';
  state.sortOrder = 'featured';

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'featured';

  document.querySelectorAll('.filter-pill').forEach((p, idx) => {
    p.classList.toggle('active', idx === 0);
  });
  document.querySelectorAll('.feature-tag-filter').forEach(t => t.classList.remove('active'));

  applyFiltersAndRender();
};

/**
 * ==============================================================
 * MODAL DE CARACTERÍSTICAS TÉCNICAS (Core Requirement)
 * Muestra Cámara, Procesador, RAM, Memoria, Batería, IP y
 * Característica Única (Récord Guinness, Pantalla Curva, etc.)
 * ==============================================================
 */
window.openSpecsModal = function(phoneId) {
  const phone = state.phones.find(p => p.id === phoneId);
  if (!phone) return;

  state.currentModalPhone = phone;

  // Actualizar contenido del modal
  document.getElementById('modal-phone-img').src = phone.image;
  document.getElementById('modal-phone-img').alt = phone.name;
  document.getElementById('modal-brand-name').textContent = phone.brand;
  document.getElementById('modal-phone-title').textContent = phone.name;
  document.getElementById('modal-phone-tagline').textContent = phone.tagline;

  // Característica Única Glowing Banner
  const uniqueFeatureEl = document.getElementById('modal-unique-feature');
  if (uniqueFeatureEl) {
    uniqueFeatureEl.textContent = phone.specs.caracteristicaUnica;
  }

  // Ficha Técnica Detallada
  document.getElementById('spec-pantalla').textContent = phone.specs.pantalla;
  document.getElementById('spec-camara').textContent = phone.specs.camara;
  document.getElementById('spec-procesador').textContent = phone.specs.procesador;
  document.getElementById('spec-ram').textContent = phone.specs.ram;
  document.getElementById('spec-memoria').textContent = phone.specs.memoria;
  document.getElementById('spec-bateria').textContent = phone.specs.bateria;
  document.getElementById('spec-ip').textContent = phone.specs.ip;

  // Descripción general
  const descEl = document.getElementById('modal-phone-desc');
  if (descEl) descEl.textContent = phone.description;

  // Precio
  document.getElementById('modal-price-val').innerHTML = `Bs. ${phone.price.toLocaleString()} <span style="font-size: 1.1rem; color: #94a3b8; font-weight: 600;">(US$ ${phone.usdPrice})</span>`;
  const origPriceEl = document.getElementById('modal-original-price');
  if (origPriceEl) {
    origPriceEl.textContent = phone.originalPrice ? `Precio regular: Bs. ${phone.originalPrice.toLocaleString()}` : '';
  }

  // Colores Disponibles
  const colorsContainer = document.getElementById('modal-colors-list');
  if (colorsContainer) {
    colorsContainer.innerHTML = phone.colors.map((color, index) => `
      <button class="color-chip-btn ${index === 0 ? 'selected' : ''}" onclick="selectModalColor(this, '${color}')">
        ${color}
      </button>
    `).join('');
  }

  // Enlace directo de WhatsApp con el número 77254863
  const whatsappMsg = encodeURIComponent(`Hola NOVAMÓVIL! 👋 Deseo comprar el celular *${phone.name}* (Precio: Bs. ${phone.price.toLocaleString()}). Vi sus características completas en la página web. ¿Tienen en stock y cómo puedo coordinar la entrega con ustedes al 77254863?`);
  const whatsappModalBtn = document.getElementById('modal-btn-whatsapp');
  if (whatsappModalBtn) {
    whatsappModalBtn.href = `https://wa.me/${WHATSAPP_FULL}?text=${whatsappMsg}`;
  }

  // Mostrar modal con clase activa
  const modalBackdrop = document.getElementById('specs-modal-backdrop');
  if (modalBackdrop) {
    modalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden'; // Evitar scroll del fondo
  }
};

window.closeModal = function() {
  const modalBackdrop = document.getElementById('specs-modal-backdrop');
  if (modalBackdrop) {
    modalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
};

window.selectModalColor = function(btn, colorName) {
  document.querySelectorAll('.color-chip-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  showToast(`Color seleccionado: ${colorName}`);
};

/**
 * ==============================================================
 * CARRITO DE COMPRAS & CHECKOUT WHATSAPP AL 77254863
 * ==============================================================
 */
window.addCurrentModalToCart = function() {
  if (!state.currentModalPhone) return;
  addToCart(state.currentModalPhone);
};

window.addToCart = function(phone) {
  const existing = state.cart.find(item => item.id === phone.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: phone.id,
      name: phone.name,
      price: phone.price,
      image: phone.image,
      quantity: 1
    });
  }

  saveCart();
  updateCartBadge();
  renderCartDrawer();
  showToast(`✅ "${phone.name}" añadido al carrito`);
};

function saveCart() {
  localStorage.setItem('novamovil_cart', JSON.stringify(state.cart));
}

function updateCartBadge() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-badge-counter');
  if (badge) {
    badge.textContent = count;
  }
}

window.openCart = function() {
  renderCartDrawer();
  const drawer = document.getElementById('cart-drawer-backdrop');
  if (drawer) {
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.closeCart = function() {
  const drawer = document.getElementById('cart-drawer-backdrop');
  if (drawer) {
    drawer.classList.remove('active');
    document.body.style.overflow = '';
  }
};

window.changeCartQuantity = function(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.id !== id);
  }
  saveCart();
  updateCartBadge();
  renderCartDrawer();
};

function renderCartDrawer() {
  const itemsContainer = document.getElementById('cart-items-container');
  const totalEl = document.getElementById('cart-total-val');
  const checkoutBtn = document.getElementById('btn-cart-checkout-whatsapp');

  if (!itemsContainer || !totalEl) return;

  if (state.cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-message">
        <div class="empty-icon">🛒</div>
        <h4>Tu carrito está vacío</h4>
        <p>Explora nuestro catálogo y agrega los celulares que más te gusten.</p>
      </div>
    `;
    totalEl.textContent = 'Bs. 0';
    if (checkoutBtn) {
      checkoutBtn.style.pointerEvents = 'none';
      checkoutBtn.style.opacity = '0.5';
    }
    return;
  }

  const total = state.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  totalEl.textContent = `Bs. ${total.toLocaleString()}`;

  itemsContainer.innerHTML = state.cart.map(item => `
    <div class="cart-item-card">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.name}</div>
        <div class="cart-item-price">Bs. ${(item.price * item.quantity).toLocaleString()}</div>
        <div class="cart-item-qty-controls">
          <button class="qty-btn" onclick="changeCartQuantity('${item.id}', -1)">-</button>
          <span style="font-weight: 700; font-size: 0.9rem;">${item.quantity}</span>
          <button class="qty-btn" onclick="changeCartQuantity('${item.id}', 1)">+</button>
        </div>
      </div>
    </div>
  `).join('');

  if (checkoutBtn) {
    checkoutBtn.style.pointerEvents = 'auto';
    checkoutBtn.style.opacity = '1';

    // Generar mensaje consolidado de WhatsApp al número 77254863
    let message = `*¡Hola NOVAMÓVIL! Quisiera realizar el siguiente pedido:*%0A%0A`;
    state.cart.forEach((it, idx) => {
      message += `${idx + 1}. *${it.name}* x${it.quantity} = Bs. ${(it.price * it.quantity).toLocaleString()}%0A`;
    });
    message += `%0A💰 *Total a pagar: Bs. ${total.toLocaleString()}*%0A%0A¿Tienen disponibilidad para envío inmediato al número 77254863?`;

    checkoutBtn.href = `https://wa.me/${WHATSAPP_FULL}?text=${message}`;
  }
}

/**
 * ==============================================================
 * COMPARADOR INTERACTIVO DE MODELOS
 * ==============================================================
 */
function setupComparator() {
  const select1 = document.getElementById('compare-select-1');
  const select2 = document.getElementById('compare-select-2');
  if (!select1 || !select2) return;

  const populateSelect = (select, selectedId) => {
    select.innerHTML = state.phones.map(p => `
      <option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${p.name} - Bs. ${p.price.toLocaleString()}</option>
    `).join('');
  };

  state.comparePhone1Id = state.phones[0]?.id;
  state.comparePhone2Id = state.phones[1]?.id;

  populateSelect(select1, state.comparePhone1Id);
  populateSelect(select2, state.comparePhone2Id);

  select1.addEventListener('change', (e) => {
    state.comparePhone1Id = e.target.value;
    renderComparisonTable();
  });

  select2.addEventListener('change', (e) => {
    state.comparePhone2Id = e.target.value;
    renderComparisonTable();
  });
}

window.openComparator = function() {
  const modal = document.getElementById('compare-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderComparisonTable();
  }
};

window.closeComparator = function() {
  const modal = document.getElementById('compare-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

function renderComparisonTable() {
  const p1 = state.phones.find(p => p.id === state.comparePhone1Id) || state.phones[0];
  const p2 = state.phones.find(p => p.id === state.comparePhone2Id) || state.phones[1];
  const tableBody = document.getElementById('compare-table-body');

  if (!tableBody || !p1 || !p2) return;

  tableBody.innerHTML = `
    <tr>
      <th>Dispositivo</th>
      <td><strong>${p1.name}</strong><br><span style="color: var(--accent-green); font-weight: 800;">Bs. ${p1.price.toLocaleString()}</span></td>
      <td><strong>${p2.name}</strong><br><span style="color: var(--accent-green); font-weight: 800;">Bs. ${p2.price.toLocaleString()}</span></td>
    </tr>
    <tr style="background: rgba(255, 183, 3, 0.1);">
      <th style="color: #ffb703;">🏆 Característica Única</th>
      <td style="color: #ffe082;"><strong>${p1.specs.caracteristicaUnica}</strong></td>
      <td style="color: #ffe082;"><strong>${p2.specs.caracteristicaUnica}</strong></td>
    </tr>
    <tr>
      <th>📸 Cámara</th>
      <td>${p1.specs.camara}</td>
      <td>${p2.specs.camara}</td>
    </tr>
    <tr>
      <th>⚡ Procesador</th>
      <td>${p1.specs.procesador}</td>
      <td>${p2.specs.procesador}</td>
    </tr>
    <tr>
      <th>🧠 Memoria RAM</th>
      <td>${p1.specs.ram}</td>
      <td>${p2.specs.ram}</td>
    </tr>
    <tr>
      <th>💾 Almacenamiento</th>
      <td>${p1.specs.memoria}</td>
      <td>${p2.specs.memoria}</td>
    </tr>
    <tr>
      <th>🔋 Batería y Carga</th>
      <td>${p1.specs.bateria}</td>
      <td>${p2.specs.bateria}</td>
    </tr>
    <tr>
      <th>🛡️ Certificación IP</th>
      <td><span style="color: var(--accent-green); font-weight: 700;">${p1.specs.ip}</span></td>
      <td><span style="color: var(--accent-green); font-weight: 700;">${p2.specs.ip}</span></td>
    </tr>
    <tr>
      <th>📱 Pantalla</th>
      <td>${p1.specs.pantalla}</td>
      <td>${p2.specs.pantalla}</td>
    </tr>
  `;
}

// Toast notification helper
function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>💬</span> <div>${message}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initApp);
