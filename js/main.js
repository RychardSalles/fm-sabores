document.getElementById("year").textContent = new Date().getFullYear();

const STORE_NAME = STORE_CONFIG.storeName;
const whatsBase = `https://wa.me/${STORE_CONFIG.whatsappNumber}`;
const whatsHello = `${whatsBase}?text=${encodeURIComponent(`Olá! Vim pelo site da ${STORE_NAME} e quero fazer um pedido.`)}`;

["whatsLink", "whatsCta", "floatWhats"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.href = whatsHello;
});

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
    return `<img src="${product.image}" alt="${product.name}" loading="lazy" />`;
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
        <button type="button" class="product-buy ${!product.available ? "is-disabled" : ""}" ${product.available ? `data-add-to-cart="${product.id}"` : `disabled tabindex="-1"`}>
          ${product.available ? "Adicionar ao pedido" : "Indisponível"}
        </button>
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
  bindAddToCartButtons(gridEl);
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
          <button type="button" class="product-buy" data-add-to-cart="${product.id}">Adicionar ao pedido</button>
        </div>
      </div>`
    )
    .join("");
  bindAddToCartButtons(track);

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

/* ---------------- carrinho ---------------- */

const CART_STORAGE_KEY = "fmSaboresCart";

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

let cart = loadCart();

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    console.warn("Não foi possível salvar o pedido:", e);
  }
}

function cartCount() {
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  renderCart();
}

function setCartQty(id, qty) {
  if (qty <= 0) {
    delete cart[id];
  } else {
    cart[id] = qty;
  }
  saveCart();
  renderCart();
}

function clearCart() {
  cart = {};
  saveCart();
  renderCart();
}

function bindAddToCartButtons(scope) {
  scope.querySelectorAll("[data-add-to-cart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      addToCart(btn.dataset.addToCart);
      pulseCartIcon();
    });
  });
}

function pulseCartIcon() {
  const btn = document.getElementById("cartToggle");
  btn.classList.remove("bump");
  void btn.offsetWidth;
  btn.classList.add("bump");
}

function openCart() {
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
}

function closeCart() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
}

function renderCart() {
  const badge = document.getElementById("cartBadge");
  const count = cartCount();
  badge.textContent = count;
  badge.hidden = count === 0;

  const itemsEl = document.getElementById("cartItems");
  const footerEl = document.getElementById("cartFooter");
  const entries = Object.entries(cart)
    .map(([id, qty]) => ({ product: currentProducts.find((p) => p.id === id), qty }))
    .filter((entry) => entry.product);

  if (entries.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty">Seu pedido está vazio.<br />Adicione itens do cardápio.</div>`;
    footerEl.style.display = "none";
    return;
  }

  footerEl.style.display = "";
  itemsEl.innerHTML = entries
    .map(({ product, qty }) => `
      <div class="cart-item">
        <div class="cart-item-thumb">${productMedia(product)}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-price">${formatPrice(product.price)}</div>
          <div class="cart-qty">
            <button type="button" data-qty-down="${product.id}">&minus;</button>
            <span>${qty}</span>
            <button type="button" data-qty-up="${product.id}">+</button>
          </div>
        </div>
        <button type="button" class="cart-item-remove" data-remove="${product.id}" aria-label="Remover">&times;</button>
      </div>`)
    .join("");

  itemsEl.querySelectorAll("[data-qty-up]").forEach((btn) => {
    btn.addEventListener("click", () => setCartQty(btn.dataset.qtyUp, (cart[btn.dataset.qtyUp] || 0) + 1));
  });
  itemsEl.querySelectorAll("[data-qty-down]").forEach((btn) => {
    btn.addEventListener("click", () => setCartQty(btn.dataset.qtyDown, (cart[btn.dataset.qtyDown] || 0) - 1));
  });
  itemsEl.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => setCartQty(btn.dataset.remove, 0));
  });

  const total = entries.reduce((sum, { product, qty }) => sum + product.price * qty, 0);
  document.getElementById("cartTotal").textContent = formatPrice(total);

  const lines = entries.map(({ product, qty }) => `• ${qty}x ${product.name} (${formatPrice(product.price)} cada)`);
  const message = `Olá! Quero fazer este pedido na ${STORE_NAME}:\n\n${lines.join("\n")}\n\nTotal: ${formatPrice(total)}\n\nMeu endereço para entrega: `;
  document.getElementById("cartCheckout").href = `${whatsBase}?text=${encodeURIComponent(message)}`;
}

document.getElementById("cartToggle").addEventListener("click", openCart);
document.getElementById("cartClose").addEventListener("click", closeCart);
document.getElementById("cartOverlay").addEventListener("click", closeCart);
document.getElementById("cartClear").addEventListener("click", () => {
  if (confirm("Esvaziar seu pedido?")) clearCart();
});

/* ---------------- init ---------------- */

function renderAll(products) {
  currentProducts = products;
  renderCategories(products);
  renderFilters(products, activeCategory);
  renderGrid(products, activeCategory);
  renderCarousel(products);
  renderCart();
}

subscribeProducts((products) => renderAll(products));
