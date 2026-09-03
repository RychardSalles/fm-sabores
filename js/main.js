document.getElementById("year").textContent = new Date().getFullYear();

const STORE_NAME = STORE_CONFIG.storeName;
const whatsBase = `https://wa.me/${STORE_CONFIG.whatsappNumber}`;
const whatsHello = `${whatsBase}?text=${encodeURIComponent(`Olá! Vim pelo site da ${STORE_NAME} e quero fazer um pedido.`)}`;

["whatsLink", "whatsCta", "floatWhats"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.href = whatsHello;
});

// Link de WhatsApp com mensagem personalizada por item
function buildItemWhatsAppLink(product) {
  const preco = product.price ? ` (${formatPrice(product.price)})` : "";
  const msg = `Olá, ${STORE_NAME}! Tenho interesse em: *${product.name}*${preco}.\nAinda tem disponível hoje?`;
  return `${whatsBase}?text=${encodeURIComponent(msg)}`;
}

// Aplicativos de entrega — mostra só os que têm link cadastrado no config.js
const deliveryApps = [
  { key: "ifoodUrl", label: "iFood" },
  { key: "food99Url", label: "99Food" },
  { key: "keetaUrl", label: "Keeta" },
];
function renderDeliveryApps() {
  const wraps = document.querySelectorAll("[data-delivery-apps]");
  const active = deliveryApps.filter((a) => STORE_CONFIG[a.key]);
  wraps.forEach((wrap) => {
    if (active.length === 0) {
      wrap.innerHTML = `<span class="delivery-note">Também estamos no iFood, 99Food e Keeta</span>`;
      return;
    }
    wrap.innerHTML = active
      .map((a) => `<a href="${STORE_CONFIG[a.key]}" target="_blank" rel="noopener" class="delivery-chip">${a.label}</a>`)
      .join("");
  });
}
renderDeliveryApps();

document.getElementById("navToggle").addEventListener("click", () => {
  document.getElementById("siteHeader").classList.toggle("open");
});

document.querySelectorAll(".nav-links > li > a").forEach((link) => {
  link.addEventListener("click", () => document.getElementById("siteHeader").classList.remove("open"));
});

function productMedia(product) {
  if (product.image) {
    return `<img src="${product.image}" alt="${product.name}" loading="lazy" data-zoom="${product.image}" data-zoom-caption="${product.name}" />`;
  }
  return `<div class="product-placeholder">${categoryIllustration()}</div>`;
}

function priceRowHtml(product) {
  const hasDiscount = product.originalPrice > product.price;
  if (!hasDiscount) {
    return `<div class="price-row"><span class="price-current">${formatPrice(product.price)}</span></div>`;
  }
  const percent = Math.round((1 - product.price / product.originalPrice) * 100);
  return `
    <div class="price-row">
      <span class="price-original">${formatPrice(product.originalPrice)}</span>
      <span class="price-current">${formatPrice(product.price)}</span>
      <span class="discount-badge">-${percent}%</span>
    </div>`;
}

function buyButtonHtml(product) {
  if (!product.available) {
    return `<span class="product-buy is-disabled">Indisponível hoje</span>`;
  }
  return `<a class="product-buy" href="${buildItemWhatsAppLink(product)}" target="_blank" rel="noopener">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.35a9.9 9.9 0 0 0 4.62 1.14h.01c5.46 0 9.91-4.45 9.91-9.9C21.96 6.45 17.5 2 12.04 2Z"/></svg>
    Chamar no WhatsApp
  </a>`;
}

function productCardHtml(product) {
  return `
    <div class="product-card">
      <div class="product-media">
        ${productMedia(product)}
        ${!product.available ? `<span class="badge-sold">Esgotado</span>` : ""}
      </div>
      <div class="product-info">
        <span class="product-category">${product.category}</span>
        <h3 class="product-name">${product.name}</h3>
        ${product.description ? `<p class="product-desc">${product.description}</p>` : ""}
        ${priceRowHtml(product)}
        ${buyButtonHtml(product)}
      </div>
    </div>`;
}

let activeCategory = "Todos";
let currentProducts = [];

/* ---------------- categorias / dropdown ---------------- */

function renderCategories(products) {
  const categories = [...new Set(products.map((p) => p.category))];
  const gridEl = document.getElementById("categoriesGrid");

  gridEl.innerHTML = categories
    .map((cat) => {
      const count = products.filter((p) => p.category === cat).length;
      const sample = products.find((p) => p.category === cat && p.image);
      const media = sample ? `<img src="${sample.image}" alt="${cat}" loading="lazy" />` : categoryIllustration();
      return `
        <button class="category-card" data-category="${cat}">
          <div class="category-media">${media}</div>
          <div class="category-name">${cat}</div>
          <div class="category-count">${count} ite${count === 1 ? "m" : "ns"}</div>
        </button>`;
    })
    .join("");

  gridEl.querySelectorAll(".category-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      renderFilters(products, activeCategory);
      renderGrid(products, activeCategory);
      document.getElementById("cardapio").scrollIntoView({ behavior: "smooth" });
    });
  });

  renderCollectionDropdown(products, categories);
}

function renderCollectionDropdown(products, categories) {
  const dropdown = document.getElementById("collectionDropdown");
  const items = ["Todos", ...categories]
    .map((cat) => {
      const count = cat === "Todos" ? products.length : products.filter((p) => p.category === cat).length;
      return `<a href="#cardapio" data-category="${cat}">${cat} <span>${count}</span></a>`;
    })
    .join("");
  dropdown.innerHTML = items;

  dropdown.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      activeCategory = link.dataset.category;
      renderFilters(products, activeCategory);
      renderGrid(products, activeCategory);
      document.getElementById("siteHeader").classList.remove("open");
    });
  });
}

function renderFilters(products, active) {
  const categories = ["Todos", ...new Set(products.map((p) => p.category))];
  const filtersEl = document.getElementById("filters");
  filtersEl.innerHTML = categories
    .map(
      (cat) =>
        `<button class="filter-btn ${cat === active ? "active" : ""}" data-category="${cat}">${cat}</button>`
    )
    .join("");

  filtersEl.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      renderFilters(products, activeCategory);
      renderGrid(products, activeCategory);
    });
  });
}

function renderGrid(products, active) {
  const visible = active === "Todos" ? products : products.filter((p) => p.category === active);
  const gridEl = document.getElementById("productGrid");

  if (visible.length === 0) {
    gridEl.innerHTML = `<div class="empty-state">Nenhum item encontrado nessa categoria.</div>`;
    return;
  }

  gridEl.innerHTML = visible.map((product) => productCardHtml(product)).join("");
  bindZoom(gridEl);
}

/* ---------------- carrossel de destaques ---------------- */

function renderCarousel(products) {
  const onSale = products.filter((p) => p.available && p.originalPrice > p.price);
  const withPhoto = products.filter((p) => p.available && p.image && !onSale.includes(p));
  const featured = [...onSale, ...withPhoto].slice(0, 8);

  const section = document.getElementById("destaques");
  const track = document.getElementById("carouselTrack");
  const dotsEl = document.getElementById("carouselDots");

  if (featured.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "";

  track.innerHTML = featured
    .map(
      (product) => `
      <div class="carousel-slide">
        <div class="product-media">
          ${productMedia(product)}
        </div>
        <div class="product-info">
          <span class="product-category">${product.category}</span>
          <h3 class="product-name">${product.name}</h3>
          ${priceRowHtml(product)}
          ${buyButtonHtml(product)}
        </div>
      </div>`
    )
    .join("");
  bindZoom(track);

  dotsEl.innerHTML = featured.map((_, i) => `<button type="button" class="carousel-dot ${i === 0 ? "active" : ""}" data-index="${i}"></button>`).join("");

  let carouselIndex = 0;

  function goTo(index) {
    carouselIndex = Math.max(0, Math.min(index, featured.length - 1));
    const targetSlide = track.children[carouselIndex];
    track.scrollTo({ left: targetSlide ? targetSlide.offsetLeft : 0, behavior: "smooth" });
    dotsEl.querySelectorAll(".carousel-dot").forEach((dot, i) => dot.classList.toggle("active", i === carouselIndex));
  }

  dotsEl.querySelectorAll(".carousel-dot").forEach((dot) => {
    dot.addEventListener("click", () => goTo(Number(dot.dataset.index)));
  });

  document.getElementById("carouselPrev").onclick = () => goTo(carouselIndex - 1);
  document.getElementById("carouselNext").onclick = () => goTo(carouselIndex + 1);

  track.onscroll = () => {
    let nearest = 0;
    let nearestDist = Infinity;
    Array.from(track.children).forEach((el, i) => {
      const dist = Math.abs(el.offsetLeft - track.scrollLeft);
      if (dist < nearestDist) { nearestDist = dist; nearest = i; }
    });
    carouselIndex = nearest;
    dotsEl.querySelectorAll(".carousel-dot").forEach((dot, i) => dot.classList.toggle("active", i === nearest));
  };

  clearInterval(window._carouselAuto);
  if (featured.length > 1) {
    window._carouselAuto = setInterval(() => {
      goTo(carouselIndex >= featured.length - 1 ? 0 : carouselIndex + 1);
    }, 5000);
  }
}

/* ---------------- lightbox (ampliar foto do prato) ---------------- */

function bindLightboxShell() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  const close = () => lb.classList.remove("open");
  lb.querySelector(".lightbox-close").addEventListener("click", close);
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

function bindZoom(scope) {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  const img = lb.querySelector("img");
  const cap = lb.querySelector(".lightbox-caption");
  scope.querySelectorAll("[data-zoom]").forEach((el) => {
    el.addEventListener("click", () => {
      img.src = el.dataset.zoom;
      cap.textContent = el.dataset.zoomCaption || "";
      lb.classList.add("open");
    });
  });
}

/* ---------------- gallery: flyers ---------------- */

function bindGalleryZoom() {
  const wrap = document.getElementById("galeria");
  if (wrap) bindZoom(wrap);
}

/* ---------------- init ---------------- */

function renderAll(products) {
  currentProducts = products;
  renderCategories(products);
  renderFilters(products, activeCategory);
  renderGrid(products, activeCategory);
  renderCarousel(products);
}

bindLightboxShell();
bindGalleryZoom();
subscribeProducts((products) => renderAll(products));
