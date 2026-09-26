/* =========================================================
   KachePai — FINAL DATABASE FRONTEND
   Replace the ENTIRE script.js with this file.
========================================================= */

let categories = [];
let products = [];
let banners = [];
let homepageSections = [];
let backendOffers = [];

let cart = JSON.parse(localStorage.getItem("kp_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("kp_wishlist") || "[]");

const API_BASE = (
  window.KACHEPAI_API &&
  window.KACHEPAI_API.API_BASE ||
  ""
).replace(/\/$/, "");

let kpToken = localStorage.getItem("kp_token") || "";

/* =========================================================
   BASIC
========================================================= */

function money(value) {
  return "৳" + Number(value || 0).toLocaleString("en-BD");
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getProductImage(product) {
  if (!product) return "";

  if (product.img) return product.img;

  if (Array.isArray(product.images) && product.images.length) {
    const first = product.images[0];

    if (typeof first === "string") {
      return first;
    }

    return first.url || first.image || "";
  }

  return "";
}

function getCategoryName(product) {
  if (!product) return "";

  if (product.cat) return product.cat;

  if (product.category?.name) {
    return product.category.name;
  }

  return "";
}

function getCategoryIcon(category) {
  return category?.icon || "🛍️";
}

/* =========================================================
   LOCAL STORAGE
========================================================= */

function save() {
  localStorage.setItem(
    "kp_cart",
    JSON.stringify(cart)
  );

  localStorage.setItem(
    "kp_wishlist",
    JSON.stringify(wishlist)
  );

  counts();
}

function counts() {
  const cartCount =
    document.querySelector("#cartCount");

  const wishCount =
    document.querySelector("#wishCount");

  if (cartCount) {
    cartCount.textContent =
      cart.reduce(
        (sum, item) =>
          sum + Number(item.qty || 0),
        0
      );
  }

  if (wishCount) {
    wishCount.textContent =
      wishlist.length;
  }
}

/* =========================================================
   API
========================================================= */

async function apiRequest(path, options = {}) {
  if (!API_BASE) {
    throw new Error("Backend URL সেট করা হয়নি");
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (kpToken) {
    headers.Authorization = "Bearer " + kpToken;
  }

  const response = await fetch(
    API_BASE + path,
    {
      ...options,
      headers
    }
  );

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      "Server request failed"
    );
  }

  return data;
}

/* =========================================================
   AUTH
========================================================= */

async function apiLogin(identifier, password) {
  const data = await apiRequest(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        identifier,
        password
      })
    }
  );

  kpToken = data.token || "";

  if (kpToken) {
    localStorage.setItem(
      "kp_token",
      kpToken
    );
  }

  return data;
}

async function apiRegister(name, mobile, password) {
  const data = await apiRequest(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        mobile,
        password
      })
    }
  );

  kpToken = data.token || "";

  if (kpToken) {
    localStorage.setItem(
      "kp_token",
      kpToken
    );
  }

  return data;
}

async function apiCreateOrder(payload) {
  return apiRequest(
    "/api/orders",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

/* =========================================================
   DATABASE LOADERS
========================================================= */

async function loadCategories() {
  const data =
    await apiRequest(
      "/api/categories"
    );

  categories =
    Array.isArray(data.categories)
      ? data.categories
      : [];

  return categories;
}

async function loadProducts() {
  const data =
    await apiRequest(
      "/api/products?limit=100"
    );

  const raw =
    Array.isArray(data.products)
      ? data.products
      : [];

  products =
    raw.map(normalizeProduct);

  return products;
}

async function loadBanners() {
  const data =
    await apiRequest(
      "/api/banners"
    );

  banners =
    Array.isArray(data.banners)
      ? data.banners
      : [];

  return banners;
}

async function loadHomepageSections() {
  const data =
    await apiRequest(
      "/api/homepage/sections"
    );

  homepageSections =
    Array.isArray(data.sections)
      ? data.sections
      : [];

  return homepageSections;
}

async function loadOffers() {
  const data =
    await apiRequest(
      "/api/offers"
    );

  backendOffers =
    Array.isArray(data.offers)
      ? data.offers
      : [];

  return backendOffers;
}

/* =========================================================
   PRODUCT NORMALIZER
========================================================= */

function normalizeProduct(product) {
  const categoryName =
    getCategoryName(product);

  return {
    ...product,

    id: Number(product.id),

    name:
      product.name ||
      "Unnamed Product",

    cat:
      categoryName ||
      "অন্যান্য",

    price:
      safeNumber(product.price),

    old:
      safeNumber(
        product.oldPrice ??
        product.old
      ),

    badge:
      product.badge ||
      "",

    rating:
      product.rating !== null &&
      product.rating !== undefined
        ? "★ " +
          safeNumber(
            product.rating
          ).toFixed(1)
        : "★ 0.0",

    img:
      getProductImage(product),

    stock:
      safeNumber(product.stock),

    categoryId:
      product.categoryId ??
      product.category?.id ??
      null
  };
}

/* =========================================================
   OFFER NORMALIZER
========================================================= */

function normalizeOffer(offer) {
  const productIds =
    Array.isArray(offer.products)
      ? offer.products
          .map(item =>
            Number(
              item.productId ??
              item.product?.id
            )
          )
          .filter(Boolean)
      : [];

  const categoryNames =
    Array.isArray(offer.categories)
      ? offer.categories
          .map(item =>
            item.category?.name ||
            item.name ||
            ""
          )
          .filter(Boolean)
      : [];

  return {
    ...offer,

    id:
      String(offer.id),

    title:
      offer.title ||
      "Special Offer",

    message:
      offer.message ||
      "",

    type:
      offer.type === "fixed"
        ? "amount"
        : (
            offer.type ||
            "percentage"
          ),

    discountPercent:
      offer.discountPercent == null
        ? 0
        : safeNumber(
            offer.discountPercent
          ),

    discountAmount:
      offer.discountAmount == null
        ? 0
        : safeNumber(
            offer.discountAmount
          ),

    recurringDays:
      Array.isArray(
        offer.recurringDays
      )
        ? offer.recurringDays
        : [],

    startTime:
      offer.startTime ||
      "00:00",

    endTime:
      offer.endTime ||
      "23:59",

    productIds,

    categories:
      categoryNames,

    priority:
      safeNumber(
        offer.priority
      ),

    active:
      offer.active !== false,

    homepage:
      offer.homepage !== false,

    stackable:
      offer.stackable === true
  };
}

/* =========================================================
   OFFER ENGINE
   Database offers are the main source.
========================================================= */

function nowInfo() {
  const d = new Date();

  return {
    day: d.getDay(),

    time:
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
  };
}

function timeToMinutes(time) {
  if (!time) return 0;

  const parts =
    String(time).split(":");

  return (
    Number(parts[0] || 0) * 60 +
    Number(parts[1] || 0)
  );
}

function offerIsActive(offer) {
  if (!offer || offer.active === false) {
    return false;
  }

  const now =
    nowInfo();

  const days =
    Array.isArray(
      offer.recurringDays
    )
      ? offer.recurringDays
      : [];

  if (days.length) {
    if (
      !days.includes(
        now.day
      )
    ) {
      return false;
    }

    const current =
      timeToMinutes(
        now.time
      );

    const start =
      timeToMinutes(
        offer.startTime ||
        "00:00"
      );

    const end =
      timeToMinutes(
        offer.endTime ||
        "23:59"
      );

    return (
      current >= start &&
      current <= end
    );
  }

  return true;
}

function activeOffers() {
  return backendOffers
    .map(normalizeOffer)
    .filter(offerIsActive)
    .sort(
      (a, b) =>
        safeNumber(b.priority) -
        safeNumber(a.priority)
    );
}

function offerMatchesProduct(
  offer,
  product
) {
  if (!offer || !product) {
    return false;
  }

  const productIds =
    offer.productIds || [];

  const categoryNames =
    offer.categories || [];

  if (
    productIds.length &&
    productIds.includes(
      Number(product.id)
    )
  ) {
    return true;
  }

  if (
    categoryNames.length &&
    categoryNames.includes(
      product.cat
    )
  ) {
    return true;
  }

  return false;
}

function productOffers(product) {
  return activeOffers().filter(
    offer =>
      offerMatchesProduct(
        offer,
        product
      )
  );
}

function offerPrice(
  product,
  quantity = 1
) {
  if (!product) {
    return 0;
  }

  let price =
    safeNumber(
      product.price
    );

  const offers =
    productOffers(
      product
    );

  for (const offer of offers) {
    let next =
      price;

    if (
      offer.type ===
        "percentage" ||
      offer.type ===
        "festival" ||
      offer.type ===
        "campaign" ||
      offer.type ===
        "flash_sale" ||
      offer.type ===
        "happy_hour"
    ) {
      next =
        price -
        (
          price *
          safeNumber(
            offer.discountPercent
          )
        ) /
          100;
    }

    else if (
      offer.type ===
      "amount"
    ) {
      next =
        price -
        safeNumber(
          offer.discountAmount
        );
    }

    else if (
      offer.type ===
      "quantity"
    ) {
      const tiers =
        Array.isArray(
          offer.tiers
        )
          ? offer.tiers
          : [];

      const tier =
        tiers
          .filter(
            t =>
              quantity >=
              safeNumber(t.qty)
          )
          .sort(
            (a, b) =>
              safeNumber(b.qty) -
              safeNumber(a.qty)
          )[0];

      if (tier) {
        if (tier.percent) {
          next =
            price -
            (
              price *
              safeNumber(
                tier.percent
              )
            ) /
              100;
        }

        if (tier.amount) {
          next =
            price -
            safeNumber(
              tier.amount
            );
        }
      }
    }

    if (
      next < price
    ) {
      price =
        next;

      if (
        offer.stackable !== true
      ) {
        break;
      }
    }
  }

  return Math.max(
    0,
    Math.round(
      price
    )
  );
}

function offerText(offer) {
  if (!offer) return "";

  if (
    safeNumber(
      offer.discountPercent
    ) > 0
  ) {
    return (
      safeNumber(
        offer.discountPercent
      ) +
      "% OFF"
    );
  }

  if (
    safeNumber(
      offer.discountAmount
    ) > 0
  ) {
    return (
      money(
        offer.discountAmount
      ) +
      " OFF"
    );
  }

  return (
    offer.title ||
    "Special Offer"
  );
}

/* =========================================================
   PRODUCT CARD
========================================================= */

function productCard(product) {
  const price =
    safeNumber(
      product.price
    );

  const oldPrice =
    safeNumber(
      product.old
    );

  const finalPrice =
    offerPrice(
      product
    );

  const discounted =
    finalPrice < price;

  const offers =
    productOffers(
      product
    );

  const mainOffer =
    offers[0];

  const badge =
    discounted
      ? offerText(
          mainOffer
        )
      : product.badge;

  const image =
    escapeHTML(
      product.img ||
      ""
    );

  const name =
    escapeHTML(
      product.name
    );

  const cat =
    escapeHTML(
      product.cat
    );

  const inWishlist =
    wishlist.includes(
      Number(product.id)
    );

  return `
    <article class="product">

      <div class="product-image">

        ${
          image
            ? `
              <img
                src="${image}"
                alt="${name}"
                loading="lazy"
              >
            `
            : `
              <div
                style="
                  height:220px;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  background:#f5f7f6;
                  font-size:42px;
                "
              >
                🛍️
              </div>
            `
        }

        ${
          badge
            ? `
              <span class="badge">
                ${escapeHTML(
                  badge
                )}
              </span>
            `
            : ""
        }

        <button
          class="heart"
          type="button"
          onclick="toggleWishlist(${Number(product.id)})"
        >
          ${
            inWishlist
              ? "♥"
              : "♡"
          }
        </button>

      </div>

      <div class="product-info">

        <small>
          ${cat}
        </small>

        <div class="product-name">
          ${name}
        </div>

        <div>
          <span class="rating">
            ${escapeHTML(
              product.rating
            )}
          </span>
        </div>

        <div>

          <span class="price">
            ${money(
              finalPrice
            )}
          </span>

          ${
            discounted
              ? `
                <span class="old">
                  ${money(price)}
                </span>
              `
              : oldPrice > price
                ? `
                  <span class="old">
                    ${money(oldPrice)}
                  </span>
                `
                : ""
          }

        </div>

        ${
          discounted
            ? `
              <small
                style="
                  display:block;
                  margin-top:4px;
                  color:#078b5b;
                  font-weight:700;
                "
              >
                ${escapeHTML(
                  offerText(
                    mainOffer
                  )
                )}
              </small>
            `
            : ""
        }

        ${
          product.stock <= 0
            ? `
              <button
                class="add"
                disabled
                style="opacity:.55"
              >
                Stock শেষ
              </button>
            `
            : `
              <button
                class="add"
                type="button"
                onclick="addCart(${Number(product.id)})"
              >
                কার্টে যোগ করুন
              </button>
            `
        }

      </div>

    </article>
  `;
}

/* =========================================================
   RENDER PRODUCT GRID
========================================================= */

function renderGrid(
  selector,
  list
) {
  const box =
    document.querySelector(
      selector
    );

  if (!box) return;

  const safeList =
    Array.isArray(list)
      ? list
      : [];

  box.innerHTML =
    safeList.length
      ? safeList
          .map(
            productCard
          )
          .join("")
      : `
        <div class="empty">
          এখনো কোনো পণ্য পাওয়া যায়নি।
        </div>
      `;
}

function renderProducts(list) {
  renderGrid(
    "#productsGrid",
    list
  );
}

window.renderProducts =
  renderProducts;

/* =========================================================
   ALL PRODUCTS
========================================================= */

function renderAllProducts() {
  renderGrid(
    "#allProductsGrid",
    products
  );
}

/* =========================================================
   POPULAR + NEW
========================================================= */

function renderExtraProducts() {
  const popular =
    products
      .filter(
        p =>
          p.featured === true ||
          String(
            p.badge || ""
          ).includes(
            "জনপ্রিয়"
          )
      )
      .slice(0, 8);

  const popularFinal =
    popular.length
      ? popular
      : products.slice(0, 8);

  renderGrid(
    "#popularGrid",
    popularFinal
  );

  const newest =
    products
      .filter(
        p =>
          String(
            p.badge || ""
          ).includes(
            "নতুন"
          )
      )
      .slice(0, 8);

  const newestFinal =
    newest.length
      ? newest
      : products
          .slice()
          .reverse()
          .slice(0, 8);

  renderGrid(
    "#newGrid",
    newestFinal
  );
}

/* =========================================================
   TODAY'S DEAL
========================================================= */

function renderDeals() {
  const deals =
    products.filter(
      product =>
        productOffers(
          product
        ).length ||
        safeNumber(
          product.old
        ) >
          safeNumber(
            product.price
          )
    );

  renderProducts(
    deals.length
      ? deals.slice(0, 8)
      : products.slice(0, 8)
  );
}

/* =========================================================
   CATEGORIES
========================================================= */

function renderCategories() {
  const box =
    document.querySelector(
      "#categoriesGrid"
    );

  if (!box) return;

  const parents =
    categories.filter(
      category =>
        !category.parentId
    );

  const list =
    parents.length
      ? parents
      : categories;

  box.innerHTML =
    list.length
      ? list
          .map(
            category => `
              <button
                type="button"
                class="category"
                onclick="filterCategory(${Number(
                  category.id
                )})"
              >

                <span class="cat-icon">
                  ${escapeHTML(
                    getCategoryIcon(
                      category
                    )
                  )}
                </span>

                <b>
                  ${escapeHTML(
                    category.name
                  )}
                </b>

              </button>
            `
          )
          .join("")
      : `
        <div class="empty">
          কোনো ক্যাটাগরি পাওয়া যায়নি।
        </div>
      `;
}

function filterCategory(
  categoryId
) {
  const id =
    Number(
      categoryId
    );

  const category =
    categories.find(
      c =>
        Number(c.id) ===
        id
    );

  let ids = [id];

  if (
    category &&
    Array.isArray(
      category.children
    )
  ) {
    ids = [
      id,
      ...category.children.map(
        child =>
          Number(child.id)
      )
    ];
  }

  const result =
    products.filter(
      product =>
        ids.includes(
          Number(
            product.categoryId
          )
        )
    );

  renderProducts(
    result
  );

  scrollToSection(
    "featured"
  );
}

window.filterCategory =
  filterCategory;

/* =========================================================
   SEARCH
========================================================= */

function search() {
  const input =
    document.querySelector(
      "#search"
    );

  const q =
    input
      ? input.value
          .trim()
          .toLowerCase()
      : "";

  if (!q) {
    renderProducts(
      products
    );

    scrollToSection(
      "featured"
    );

    return;
  }

  const result =
    products.filter(
      product => {
        const text =
          [
            product.name,
            product.cat,
            product.brand,
            product.description
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return text.includes(q);
      }
    );

  renderProducts(
    result
  );

  scrollToSection(
    "featured"
  );
}

window.search =
  search;

function scrollToSection(
  id
) {
  const element =
    document.getElementById(
      id
    );

  if (!element) return;

  element.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

window.scrollToSection =
  scrollToSection;

/* =========================================================
   OFFER FILTER
========================================================= */

function filterProducts(
  type
) {
  if (
    type === "offer"
  ) {
    const list =
      products.filter(
        product =>
          productOffers(
            product
          ).length ||
          safeNumber(
            product.old
          ) >
            safeNumber(
              product.price
            )
      );

    renderProducts(
      list
    );

  } else {
    renderProducts(
      products
    );
  }

  scrollToSection(
    "featured"
  );
}

window.filterProducts =
  filterProducts;

/* =========================================================
   CART
========================================================= */

function addCart(id) {
  const product =
    products.find(
      p =>
        Number(p.id) ===
        Number(id)
    );

  if (!product) {
    toast(
      "পণ্য পাওয়া যায়নি"
    );
    return;
  }

  if (
    safeNumber(
      product.stock
    ) <= 0
  ) {
    toast(
      "এই পণ্যটি এখন stock-এ নেই"
    );
    return;
  }

  const existing =
    cart.find(
      item =>
        Number(item.id) ===
        Number(id)
    );

  if (existing) {
    if (
      existing.qty >=
      product.stock
    ) {
      toast(
        "Stock-এর বেশি নেওয়া যাবে না"
      );
      return;
    }

    existing.qty++;
  } else {
    cart.push({
      id:
        Number(id),
      qty: 1
    });
  }

  save();

  toast(
    "পণ্যটি কার্টে যোগ হয়েছে"
  );

  openPanel(
    "cart"
  );
}

window.addCart =
  addCart;

function changeQty(
  id,
  delta
) {
  const item =
    cart.find(
      x =>
        Number(x.id) ===
        Number(id)
    );

  if (!item) return;

  const product =
    products.find(
      p =>
        Number(p.id) ===
        Number(id)
    );

  item.qty +=
    Number(delta);

  if (
    product &&
    item.qty >
      safeNumber(
        product.stock
      )
  ) {
    item.qty =
      safeNumber(
        product.stock
      );

    toast(
      "Stock-এর বেশি নেওয়া যাবে না"
    );
  }

  if (
    item.qty <= 0
  ) {
    cart =
      cart.filter(
        x =>
          Number(x.id) !==
          Number(id)
      );
  }

  save();

  openPanel(
    "cart"
  );
}

window.changeQty =
  changeQty;

function removeCart(id) {
  cart =
    cart.filter(
      item =>
        Number(item.id) !==
        Number(id)
    );

  save();

  openPanel(
    "cart"
  );
}

window.removeCart =
  removeCart;

/* =========================================================
   WISHLIST
========================================================= */

function toggleWishlist(id) {
  const numberId =
    Number(id);

  if (
    wishlist.includes(
      numberId
    )
  ) {
    wishlist =
      wishlist.filter(
        x =>
          Number(x) !==
          numberId
      );
  } else {
    wishlist.push(
      numberId
    );
  }

  save();

  renderProducts(
    products
  );

  renderExtraProducts();
  renderAllProducts();
}

window.toggleWishlist =
  toggleWishlist;

function wishlistHTML() {
  const list =
    products.filter(
      p =>
        wishlist.includes(
          Number(p.id)
        )
    );

  return `
    <h2>Wishlist</h2>

    ${
      list.length
        ? list
            .map(
              p => `
                <div class="wish-item">

                  ${
                    p.img
                      ? `
                        <img
                          src="${escapeHTML(
                            p.img
                          )}"
                          alt="${escapeHTML(
                            p.name
                          )}"
                        >
                      `
                      : ""
                  }

                  <div class="grow">

                    <b>
                      ${escapeHTML(
                        p.name
                      )}
                    </b>

                    <div>
                      ${money(
                        offerPrice(p)
                      )}
                    </div>

                    <button
                      class="add"
                      onclick="addCart(${Number(p.id)})"
                    >
                      কার্টে যোগ করুন
                    </button>

                  </div>

                </div>
              `
            )
            .join("")
        : `
          <div class="empty">
            আপনার Wishlist এখন খালি।
          </div>
        `
    }
  `;
}

/* =========================================================
   CART CALCULATION
========================================================= */

function calculateCart() {
  const lines = [];

  let originalSubtotal = 0;
  let subtotal = 0;

  for (
    const item of cart
  ) {
    const product =
      products.find(
        p =>
          Number(p.id) ===
          Number(item.id)
      );

    if (!product) continue;

    const qty =
      Math.max(
        1,
        Number(
          item.qty || 1
        )
      );

    const originalUnitPrice =
      safeNumber(
        product.price
      );

    const unitPrice =
      offerPrice(
        product,
        qty
      );

    const originalTotal =
      originalUnitPrice *
      qty;

    const finalTotal =
      unitPrice *
      qty;

    originalSubtotal +=
      originalTotal;

    subtotal +=
      finalTotal;

    lines.push({
      product,
      qty,
      originalUnitPrice,
      unitPrice,
      originalTotal,
      finalTotal,
      discount:
        Math.max(
          0,
          originalTotal -
            finalTotal
        )
    });
  }

  return {
    lines,
    originalSubtotal,
    subtotal,

    discount:
      Math.max(
        0,
        originalSubtotal -
          subtotal
      )
  };
}

/* =========================================================
   CART HTML
========================================================= */

function cartHTML() {
  if (!cart.length) {
    return `
      <h2>আপনার কার্ট</h2>

      <div class="empty">
        কার্ট এখন খালি।<br><br>
        পছন্দের পণ্য কার্টে যোগ করুন।
      </div>
    `;
  }

  const calc =
    calculateCart();

  const rows =
    calc.lines
      .map(
        line => {
          const p =
            line.product;

          const discounted =
            line.unitPrice <
            line.originalUnitPrice;

          const offer =
            productOffers(
              p
            )[0];

          return `
            <div class="cart-item">

              ${
                p.img
                  ? `
                    <img
                      src="${escapeHTML(
                        p.img
                      )}"
                      alt="${escapeHTML(
                        p.name
                      )}"
                    >
                  `
                  : ""
              }

              <div class="grow">

                <b>
                  ${escapeHTML(
                    p.name
                  )}
                </b>

                <div>
                  ${money(
                    line.unitPrice
                  )}

                  ${
                    discounted
                      ? `
                        <span
                          style="
                            text-decoration:line-through;
                            color:#999;
                            margin-left:6px;
                          "
                        >
                          ${money(
                            line.originalUnitPrice
                          )}
                        </span>
                      `
                      : ""
                  }
                </div>

                ${
                  discounted
                    ? `
                      <small
                        style="
                          color:#078b5b;
                          font-weight:700;
                        "
                      >
                        ${escapeHTML(
                          offerText(
                            offer
                          )
                        )}
                      </small>
                    `
                    : ""
                }

                <div class="qty">

                  <button
                    onclick="changeQty(${Number(p.id)},-1)"
                  >
                    −
                  </button>

                  ${line.qty}

                  <button
                    onclick="changeQty(${Number(p.id)},1)"
                  >
                    +
                  </button>

                </div>

              </div>

              <button
                onclick="removeCart(${Number(p.id)})"
              >
                ×
              </button>

            </div>
          `;
        }
      )
      .join("");

  return `
    <h2>আপনার কার্ট</h2>

    ${rows}

    ${
      calc.discount > 0
        ? `
          <div
            style="
              display:flex;
              justify-content:space-between;
              color:#078b5b;
              font-weight:700;
              margin-top:12px;
            "
          >
            <span>
              Offer Discount
            </span>

            <span>
              -${money(
                calc.discount
              )}
            </span>
          </div>
        `
        : ""
    }

    <div class="panel-total">

      <span>
        মোট
      </span>

      <span>
        ${money(
          calc.subtotal
        )}
      </span>

    </div>

    <button
      class="full"
      onclick="checkout()"
    >
      Checkout →
    </button>
  `;
}

window.cartHTML =
  cartHTML;

/* =========================================================
   ACCOUNT
========================================================= */

function accountHTML() {
  if (kpToken) {
    return `
      <h2>
        Customer Account
      </h2>

      <p>
        আপনি Login অবস্থায় আছেন।
      </p>

      <button
        class="full"
        onclick="logoutCustomer()"
      >
        Logout
      </button>
    `;
  }

  return `
    <h2>
      Customer Account
    </h2>

    <h3 style="margin-top:20px">
      নতুন Customer?
    </h3>

    <div class="field">
      <label>নাম</label>

      <input
        id="regName"
        placeholder="আপনার নাম"
      >
    </div>

    <div class="field">
      <label>মোবাইল নম্বর</label>

      <input
        id="regMobile"
        inputmode="numeric"
        placeholder="01XXXXXXXXX"
      >
    </div>

    <div class="field">
      <label>পাসওয়ার্ড</label>

      <input
        id="regPassword"
        type="password"
        placeholder="কমপক্ষে ৬ অক্ষর"
      >
    </div>

    <button
      class="full"
      onclick="registerCustomer()"
    >
      Create Account
    </button>

    <hr
      style="
        border:0;
        border-top:1px solid #e5e7eb;
        margin:25px 0;
      "
    >

    <h3>
      আগে থেকেই Account আছে?
    </h3>

    <div class="field">
      <label>
        মোবাইল / Email
      </label>

      <input
        id="loginIdentifier"
        placeholder="01XXXXXXXXX অথবা Email"
      >
    </div>

    <div class="field">
      <label>পাসওয়ার্ড</label>

      <input
        id="loginPassword"
        type="password"
        placeholder="পাসওয়ার্ড"
      >
    </div>

    <button
      class="full"
      onclick="loginCustomer()"
    >
      Login
    </button>
  `;
}

/* =========================================================
   REGISTER
========================================================= */

async function registerCustomer() {
  const name =
    document.querySelector(
      "#regName"
    )?.value.trim();

  const mobile =
    document.querySelector(
      "#regMobile"
    )?.value.trim();

  const password =
    document.querySelector(
      "#regPassword"
    )?.value;

  if (
    !name ||
    !mobile ||
    !password
  ) {
    toast(
      "নাম, মোবাইল ও পাসওয়ার্ড দিন"
    );
    return;
  }

  if (
    !/^01\d{9}$/.test(
      mobile
    )
  ) {
    toast(
      "সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।"
    );
    return;
  }

  if (
    password.length < 6
  ) {
    toast(
      "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"
    );
    return;
  }

  try {
    const result =
      await apiRegister(
        name,
        mobile,
        password
      );

    document.querySelector(
      "#panel"
    ).innerHTML = `
      <button
        class="panel-close"
        onclick="closePanel()"
      >
        ×
      </button>

      <h2>
        Account তৈরি হয়েছে ✓
      </h2>

      <p>
        স্বাগতম,
        ${escapeHTML(
          result.user?.name ||
          name
        )}!
      </p>

      <p>
        আপনার Customer Account
        সফলভাবে তৈরি হয়েছে।
      </p>

      <button
        class="full"
        onclick="closePanel()"
      >
        ঠিক আছে
      </button>
    `;

  } catch (error) {
    toast(
      error.message ||
      "Account তৈরি করা যায়নি"
    );
  }
}

window.registerCustomer =
  registerCustomer;

/* =========================================================
   LOGIN
========================================================= */

async function loginCustomer() {
  const identifier =
    document.querySelector(
      "#loginIdentifier"
    )?.value.trim();

  const password =
    document.querySelector(
      "#loginPassword"
    )?.value;

  if (
    !identifier ||
    !password
  ) {
    toast(
      "মোবাইল/Email ও পাসওয়ার্ড দিন"
    );
    return;
  }

  try {
    const result =
      await apiLogin(
        identifier,
        password
      );

    document.querySelector(
      "#panel"
    ).innerHTML = `
      <button
        class="panel-close"
        onclick="closePanel()"
      >
        ×
      </button>

      <h2>
        স্বাগতম,
        ${escapeHTML(
          result.user?.name ||
          "Customer"
        )}
      </h2>

      <p>
        আপনার account সফলভাবে
        login হয়েছে।
      </p>

      <button
        class="full"
        onclick="closePanel()"
      >
        ঠিক আছে
      </button>
    `;

  } catch (error) {
    toast(
      error.message ||
      "Login failed"
    );
  }
}

window.loginCustomer =
  loginCustomer;

/* =========================================================
   CHECKOUT
========================================================= */

function checkout() {
  if (!cart.length) {
    toast("কার্ট খালি");
    return;
  }

  if (!kpToken) {
    document.querySelector(
      "#panel"
    ).innerHTML = `
      <button
        class="panel-close"
        onclick="closePanel()"
      >
        ×
      </button>

      <h2>
        Login প্রয়োজন
      </h2>

      <p>
        অর্ডার করার আগে Customer
        Account-এ Login করুন।
      </p>

      <button
        class="full"
        onclick="openPanel('account')"
      >
        Login / Create Account
      </button>
    `;

    return;
  }

  const calc =
    calculateCart();

  document.querySelector(
    "#panel"
  ).innerHTML = `
    <button
      class="panel-close"
      onclick="openPanel('cart')"
    >
      ←
    </button>

    <h2>
      Checkout
    </h2>

    <div class="field">
      <label>নাম</label>

      <input
        id="coName"
        placeholder="আপনার নাম"
      >
    </div>

    <div class="field">
      <label>মোবাইল</label>

      <input
        id="coMobile"
        inputmode="numeric"
        placeholder="01XXXXXXXXX"
      >
    </div>

    <div class="field">
      <label>
        ডেলিভারি ঠিকানা
      </label>

      <textarea
        id="coAddress"
        rows="3"
        placeholder="বাসা/রোড/এলাকা"
      ></textarea>
    </div>

    <div class="field">
      <label>
        Payment Method
      </label>

      <select id="coPayment">
        <option value="COD">
          Cash on Delivery
        </option>

        <option value="ONLINE">
          Online Payment (পরে যুক্ত হবে)
        </option>
      </select>
    </div>

    <div class="panel-total">
      <span>
        মূল দাম
      </span>

      <span>
        ${money(
          calc.originalSubtotal
        )}
      </span>
    </div>

    ${
      calc.discount > 0
        ? `
          <div
            style="
              display:flex;
              justify-content:space-between;
              color:#078b5b;
              font-weight:700;
            "
          >
            <span>
              Offer Discount
            </span>

            <span>
              -${money(
                calc.discount
              )}
            </span>
          </div>
        `
        : ""
    }

    <div class="panel-total">
      <span>
        Product Total
      </span>

      <span>
        ${money(
          calc.subtotal
        )}
      </span>
    </div>

    <button
      class="full"
      onclick="placeOrder()"
    >
      Order Confirm
    </button>
  `;
}

window.checkout =
  checkout;

/* =========================================================
   REAL ORDER
========================================================= */

async function placeOrder() {
  const name =
    document.querySelector(
      "#coName"
    )?.value.trim();

  const mobile =
    document.querySelector(
      "#coMobile"
    )?.value.trim();

  const address =
    document.querySelector(
      "#coAddress"
    )?.value.trim();

  const paymentMethod =
    document.querySelector(
      "#coPayment"
    )?.value ||
    "COD";

  if (
    !name ||
    !mobile ||
    !address
  ) {
    toast(
      "নাম, মোবাইল ও ঠিকানা দিন"
    );
    return;
  }

  if (
    !/^01\d{9}$/.test(
      mobile
    )
  ) {
    toast(
      "সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।"
    );
    return;
  }

  if (!cart.length) {
    toast(
      "কার্ট খালি"
    );
    return;
  }

  if (!kpToken) {
    toast(
      "প্রথমে Login করুন"
    );
    return;
  }

  const items =
    cart.map(
      item => ({
        productId:
          Number(
            item.id
          ),

        quantity:
          Number(
            item.qty
          )
      })
    );

  try {
    const result =
      await apiCreateOrder({
        customerName:
          name,

        mobile:
          mobile,

        address:
          address,

        paymentMethod:
          paymentMethod,

        items
      });

    cart = [];

    save();

    const orderId =
      result.orderId ||
      result.order?.orderId ||
      result.id ||
      "KCP-ORDER";

    const total =
      result.order?.total != null
        ? safeNumber(
            result.order.total
          )
        : null;

    document.querySelector(
      "#panel"
    ).innerHTML = `
      <button
        class="panel-close"
        onclick="closePanel()"
      >
        ×
      </button>

      <h2>
        অর্ডার গ্রহণ করা হয়েছে ✓
      </h2>

      <p>
        Order ID:
      </p>

      <h2>
        ${escapeHTML(
          orderId
        )}
      </h2>

      ${
        total !== null
          ? `
            <p
              style="
                color:#078b5b;
                font-weight:700;
              "
            >
              মোট:
              ${money(total)}
            </p>
          `
          : ""
      }

      <p>
        আপনার অর্ডার backend-এ
        সফলভাবে সংরক্ষিত হয়েছে।
      </p>

      <button
        class="full"
        onclick="closePanel()"
      >
        ঠিক আছে
      </button>
    `;

  } catch (error) {
    console.error(
      "KachePai order error:",
      error
    );

    toast(
      error.message ||
      "Server order তৈরি হয়নি"
    );
  }
}

window.placeOrder =
  placeOrder;

/* Compatibility */
window.placeDemoOrder =
  placeOrder;

/* =========================================================
   PANELS
========================================================= */

function openPanel(type) {
  const panel =
    document.querySelector(
      "#panel"
    );

  const overlay =
    document.querySelector(
      "#overlay"
    );

  if (!panel || !overlay) {
    return;
  }

  let html = `
    <button
      class="panel-close"
      onclick="closePanel()"
    >
      ×
    </button>
  `;

  if (
    type ===
    "cart"
  ) {
    html +=
      cartHTML();
  }

  if (
    type ===
    "wishlist"
  ) {
    html +=
      wishlistHTML();
  }

  if (
    type ===
    "account"
  ) {
    html +=
      accountHTML();
  }

  panel.innerHTML =
    html;

  overlay.style.display =
    "block";
}

window.openPanel =
  openPanel;

function closePanel() {
  const overlay =
    document.querySelector(
      "#overlay"
    );

  if (overlay) {
    overlay.style.display =
      "none";
  }
}

window.closePanel =
  closePanel;

function overlayClose(
  event
) {
  if (
    event.target &&
    event.target.id ===
      "overlay"
  ) {
    closePanel();
  }
}

window.overlayClose =
  overlayClose;

/* =========================================================
   LOGOUT
========================================================= */

function logoutCustomer() {
  kpToken = "";

  localStorage.removeItem(
    "kp_token"
  );

  closePanel();

  toast(
    "Logout হয়েছে"
  );
}

window.logoutCustomer =
  logoutCustomer;

/* =========================================================
   TOAST
========================================================= */

function toast(message) {
  const el =
    document.querySelector(
      "#toast"
    );

  if (!el) return;

  el.textContent =
    message;

  el.classList.add(
    "show"
  );

  setTimeout(
    () => {
      el.classList.remove(
        "show"
      );
    },
    1800
  );
}

window.toast =
  toast;

/* =========================================================
   BANNERS
========================================================= */

let kpBannerIndex = 0;

function renderBanners() {
  let section =
    document.querySelector(
      "#advertisementBanner"
    );

  if (!banners.length) {
    if (section) {
      section.remove();
    }

    return;
  }

  if (!section) {
    section =
      document.createElement(
        "section"
      );

    section.id =
      "advertisementBanner";

    section.className =
      "section";

    const categoriesSection =
      document.querySelector(
        "#categories"
      );

    if (
      categoriesSection &&
      categoriesSection.parentNode
    ) {
      categoriesSection.parentNode.insertBefore(
        section,
        categoriesSection.nextSibling
      );
    }
  }

  section.innerHTML = `
    <div class="section-title">
      <div>
        <h2>
          বিশেষ প্রচারণা
        </h2>

        <p>
          KachePai Campaign
        </p>
      </div>
    </div>

    <div
      id="kpBannerSlider"
      style="
        position:relative;
        overflow:hidden;
        border-radius:18px;
      "
    >

      ${banners
        .map(
          (banner, index) => {
            const desktop =
              banner.desktopImage ||
              banner.image ||
              "";

            const mobile =
              banner.mobileImage ||
              desktop;

            const link =
              banner.link ||
              "";

            return `
              <div
                class="kp-banner-slide"
                style="
                  display:${
                    index === 0
                      ? "block"
                      : "none"
                  };
                "
              >

                ${
                  link
                    ? `
                      <a
                        href="${escapeHTML(
                          link
                        )}"
                      >
                    `
                    : ""
                }

                <picture>

                  ${
                    mobile
                      ? `
                        <source
                          media="(max-width:700px)"
                          srcset="${escapeHTML(
                            mobile
                          )}"
                        >
                      `
                      : ""
                  }

                  <img
                    src="${escapeHTML(
                      desktop
                    )}"
                    alt="${escapeHTML(
                      banner.title ||
                      "KachePai Banner"
                    )}"
                    style="
                      width:100%;
                      display:block;
                      object-fit:cover;
                    "
                  >

                </picture>

                ${
                  link
                    ? `
                      </a>
                    `
                    : ""
                }

              </div>
            `;
          }
        )
        .join("")}

      ${
        banners.length > 1
          ? `
            <button
              type="button"
              onclick="kpBannerPrev()"
              style="
                position:absolute;
                left:10px;
                top:50%;
                transform:translateY(-50%);
                border:0;
                border-radius:50%;
                width:40px;
                height:40px;
                background:rgba(0,0,0,.45);
                color:white;
                font-size:22px;
              "
            >
              ‹
            </button>

            <button
              type="button"
              onclick="kpBannerNext()"
              style="
                position:absolute;
                right:10px;
                top:50%;
                transform:translateY(-50%);
                border:0;
                border-radius:50%;
                width:40px;
                height:40px;
                background:rgba(0,0,0,.45);
                color:white;
                font-size:22px;
              "
            >
              ›
            </button>
          `
          : ""
      }

    </div>
  `;

  kpBannerIndex = 0;
}

function showBanner(index) {
  const slides =
    document.querySelectorAll(
      ".kp-banner-slide"
    );

  if (!slides.length) {
    return;
  }

  if (
    index < 0
  ) {
    index =
      slides.length - 1;
  }

  if (
    index >=
    slides.length
  ) {
    index = 0;
  }

  slides.forEach(
    (slide, i) => {
      slide.style.display =
        i === index
          ? "block"
          : "none";
    }
  );

  kpBannerIndex =
    index;
}

function kpBannerPrev() {
  showBanner(
    kpBannerIndex - 1
  );
}

function kpBannerNext() {
  showBanner(
    kpBannerIndex + 1
  );
}

window.kpBannerPrev =
  kpBannerPrev;

window.kpBannerNext =
  kpBannerNext;

/* =========================================================
   DATABASE OFFERS
   IMPORTANT:
   Render only ONE offer container.
   This removes the duplicate Weekend Offer.
========================================================= */

function renderDatabaseOffers() {
  const dynamic =
    document.querySelector(
      "#dynamicOffers"
    );

  const home =
    document.querySelector(
      "#homeOfferBanner"
    );

  const upcoming =
    document.querySelector(
      "#upcomingOffers"
    );

  /*
    Do not show the same offer twice.
  */
  if (home) {
    home.innerHTML = "";
  }

  const active =
    activeOffers();

  if (dynamic) {
    dynamic.innerHTML =
      active.length
        ? active
            .map(
              offer => `
                <div
                  class="offer-card"
                  style="
                    padding:16px;
                    margin-bottom:12px;
                    border-radius:14px;
                  "
                >

                  <h3>
                    ${escapeHTML(
                      offer.title
                    )}
                  </h3>

                  <p>
                    ${escapeHTML(
                      offer.message
                    )}
                  </p>

                  <button
                    class="add"
                    type="button"
                    onclick="showDatabaseOfferProducts('${escapeHTML(
                      offer.id
                    )}')"
                  >
                    অফারের পণ্য দেখুন
                  </button>

                </div>
              `
            )
            .join("")
        : `
            <div class="empty">
              এই মুহূর্তে কোনো চলমান অফার নেই।
            </div>
          `;
  }

  if (upcoming) {
    upcoming.innerHTML = "";
  }
}

function showDatabaseOfferProducts(
  offerId
) {
  const offer =
    backendOffers
      .map(normalizeOffer)
      .find(
        offer =>
          String(
            offer.id
          ) ===
          String(
            offerId
          )
      );

  if (!offer) {
    toast(
      "এই অফার পাওয়া যায়নি"
    );
    return;
  }

  const result =
    products.filter(
      product =>
        offerMatchesProduct(
          offer,
          product
        )
    );

  renderProducts(
    result
  );

  scrollToSection(
    "featured"
  );
}

window.showDatabaseOfferProducts =
  showDatabaseOfferProducts;

/* Compatibility */
window.kpShowDatabaseOfferProducts =
  showDatabaseOfferProducts;

/* =========================================================
   HOMEPAGE SECTIONS
========================================================= */

function getSectionType(section) {
  const key =
    String(
      section.key ||
      ""
    ).toLowerCase();

  const title =
    String(
      section.title ||
      ""
    ).toLowerCase();

  const text =
    key + " " + title;

  if (
    text.includes("categor") ||
    text.includes("ক্যাটাগ")
  ) {
    return "categories";
  }

  if (
    text.includes("banner") ||
    text.includes("advert") ||
    text.includes("campaign") ||
    text.includes("ব্যানার")
  ) {
    return "advertisementBanner";
  }

  if (
    text.includes("offer") ||
    text.includes("flash") ||
    text.includes("sale") ||
    text.includes("অফার")
  ) {
    return "offers";
  }

  if (
    text.includes("popular") ||
    text.includes("জনপ্রিয়")
  ) {
    return "popular";
  }

  if (
    text.includes("best")
  ) {
    return "popular";
  }

  if (
    text.includes("new") ||
    text.includes("arrival") ||
    text.includes("নতুন")
  ) {
    return "new";
  }

  if (
    text.includes("recommend") ||
    text.includes("just")
  ) {
    return "featured";
  }

  if (
    text.includes("all") ||
    text.includes("সব")
  ) {
    return "all-products";
  }

  if (
    text.includes("featured") ||
    text.includes("ফিচার")
  ) {
    return "featured";
  }

  return null;
}

function applyHomepageSections() {
  const main =
    document.querySelector(
      "main"
    );

  if (!main) return;

  if (
    !homepageSections.length
  ) {
    return;
  }

  const map = {
    categories:
      document.querySelector(
        "#categories"
      ),

    advertisementBanner:
      document.querySelector(
        "#advertisementBanner"
      ),

    offers:
      document.querySelector(
        "#offers"
      ),

    featured:
      document.querySelector(
        "#featured"
      ),

    popular:
      document.querySelector(
        "#popular"
      ),

    new:
      document.querySelector(
        "#new"
      ),

    "all-products":
      document.querySelector(
        "#all-products"
      )
  };

  const ordered =
    homepageSections
      .filter(
        section =>
          section.visible !== false
      )
      .slice()
      .sort(
        (a, b) =>
          safeNumber(
            a.sortOrder
          ) -
          safeNumber(
            b.sortOrder
          )
      );

  ordered.forEach(
    section => {
      const type =
        getSectionType(
          section
        );

      const element =
        map[type];

      if (!element) {
        return;
      }

      main.appendChild(
        element
      );
    }
  );
}

/* =========================================================
   CLEAN CART
========================================================= */

function cleanInvalidCartItems() {
  if (!products.length) {
    return;
  }

  const validIds =
    new Set(
      products.map(
        p =>
          Number(p.id)
      )
    );

  cart =
    cart.filter(
      item =>
        validIds.has(
          Number(item.id)
        )
    );

  wishlist =
    wishlist.filter(
      id =>
        validIds.has(
          Number(id)
        )
    );

  save();
}

/* =========================================================
   SEARCH EVENTS
========================================================= */

function setupSearch() {
  const button =
    document.querySelector(
      "#searchBtn"
    );

  const input =
    document.querySelector(
      "#search"
    );

  if (button) {
    button.onclick =
      search;
  }

  if (input) {
    input.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
          "Enter"
        ) {
          search();
        }
      }
    );
  }
}

/* =========================================================
   STOP OLD OFFERS.JS FROM OVERRIDING OUR UI
========================================================= */

function rebindKachePaiFunctions() {
  window.renderProducts =
    renderProducts;

  window.cartHTML =
    cartHTML;

  window.checkout =
    checkout;

  window.placeOrder =
    placeOrder;

  window.placeDemoOrder =
    placeOrder;

  window.openPanel =
    openPanel;

  window.closePanel =
    closePanel;

  window.overlayClose =
    overlayClose;

  window.addCart =
    addCart;

  window.changeQty =
    changeQty;

  window.removeCart =
    removeCart;

  window.toggleWishlist =
    toggleWishlist;

  window.filterCategory =
    filterCategory;

  window.filterProducts =
    filterProducts;

  window.search =
    search;
}

/* =========================================================
   INITIALIZE
========================================================= */

async function initializeKachePai() {
  /*
    IMPORTANT:
    Promise.all() was causing one failed endpoint
    to break the whole website.

    Now every API is loaded independently.
  */

  const results =
    await Promise.allSettled([
      loadCategories(),
      loadProducts(),
      loadBanners(),
      loadHomepageSections(),
      loadOffers()
    ]);

  const errors =
    results.filter(
      result =>
        result.status ===
        "rejected"
    );

  if (errors.length) {
    console.warn(
      "Some KachePai API sections failed:",
      errors
    );
  }

  cleanInvalidCartItems();

  /*
    Render everything independently.
  */
  renderCategories();

  renderDeals();

  renderExtraProducts();

  renderAllProducts();

  renderBanners();

  renderDatabaseOffers();

  /*
    Apply database homepage order.
  */
  applyHomepageSections();

  counts();

  rebindKachePaiFunctions();

  console.log(
    "KachePai loaded:",
    {
      categories:
        categories.length,

      products:
        products.length,

      banners:
        banners.length,

      offers:
        backendOffers.length,

      homepageSections:
        homepageSections.length
    }
  );

  /*
    If products failed, show a useful message
    only inside product areas.
  */
  if (!products.length) {
    const grids = [
      "#productsGrid",
      "#popularGrid",
      "#newGrid",
      "#allProductsGrid"
    ];

    grids.forEach(
      selector => {
        const box =
          document.querySelector(
            selector
          );

        if (box) {
          box.innerHTML = `
            <div class="empty">

              <h3>
                পণ্য লোড করা যাচ্ছে না
              </h3>

              <p>
                Backend-এর সাথে
                সংযোগে সমস্যা হয়েছে।
              </p>

              <button
                class="add"
                onclick="location.reload()"
              >
                আবার চেষ্টা করুন
              </button>

            </div>
          `;
        }
      }
    );
  }
}

/* =========================================================
   START
========================================================= */

counts();

setupSearch();

initializeKachePai();

/*
  offers.js is loaded after this file.
  It may register its own DOMContentLoaded handler
  and temporarily replace some functions.

  This runs AFTER those handlers and restores
  the final KachePai database frontend.
*/
document.addEventListener(
  "DOMContentLoaded",
  () => {
    setTimeout(
      () => {
        rebindKachePaiFunctions();

        renderDatabaseOffers();

        renderExtraProducts();

        renderAllProducts();

        counts();
      },
      0
    );
  }
);
