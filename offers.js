/*
========================================================
 KachePai — Clean Offer Engine
========================================================
*/

const kpOffers = [
  {
    id: "weekend-001",
    title: "🎉 সাপ্তাহিক Weekend Offer",
    message: "নির্বাচিত পণ্যে ১০% ছাড়",
    type: "percentage",
    discountPercent: 10,
    recurringDays: [5, 6],
    startTime: "00:00",
    endTime: "23:59",
    productIds: [1, 2, 5],
    categories: [],
    priority: 10,
    active: true,
    homepage: true,
    stackable: false
  }
];

/* ======================================================
   BASIC
====================================================== */

function kpMoney(value) {
  const n = Number(value || 0);

  if (typeof money === "function") {
    return money(n);
  }

  return "৳" + n.toLocaleString("en-BD");
}

function kpNow() {
  const d = new Date();

  return {
    date:
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0"),

    time:
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0"),

    day: d.getDay()
  };
}

function kpMinutes(time) {
  if (!time) return 0;

  const parts = String(time).split(":");
  return (
    Number(parts[0] || 0) * 60 +
    Number(parts[1] || 0)
  );
}

/* ======================================================
   OFFER ACTIVE CHECK
====================================================== */

function kpDateTimeActive(offer) {
  const now = kpNow();

  if (
    Array.isArray(offer.recurringDays) &&
    offer.recurringDays.length
  ) {
    if (!offer.recurringDays.includes(now.day)) {
      return false;
    }

    const current = kpMinutes(now.time);
    const start = kpMinutes(offer.startTime || "00:00");
    const end = kpMinutes(offer.endTime || "23:59");

    return current >= start && current <= end;
  }

  if (offer.startDate && now.date < offer.startDate) {
    return false;
  }

  if (offer.endDate && now.date > offer.endDate) {
    return false;
  }

  const current = kpMinutes(now.time);

  if (
    offer.startDate === now.date &&
    current < kpMinutes(offer.startTime || "00:00")
  ) {
    return false;
  }

  if (
    offer.endDate === now.date &&
    current > kpMinutes(offer.endTime || "23:59")
  ) {
    return false;
  }

  return true;
}

function kpCustomerAllowed(offer, customer = {}) {
  if (!offer.customerType || offer.customerType === "all") {
    return true;
  }

  if (offer.customerType === "loggedIn") {
    return !!customer.loggedIn;
  }

  if (offer.customerType === "new") {
    return !!customer.isNew;
  }

  if (offer.customerType === "returning") {
    return !!customer.isReturning;
  }

  if (
    Array.isArray(offer.customerIds) &&
    offer.customerIds.length
  ) {
    return offer.customerIds.includes(customer.id);
  }

  return true;
}

function kpOfferIsActive(offer, customer = {}) {
  return !!(
    offer &&
    offer.active !== false &&
    kpDateTimeActive(offer) &&
    kpCustomerAllowed(offer, customer)
  );
}

function kpActiveOffers(customer = {}) {
  return kpOffers
    .filter(o => kpOfferIsActive(o, customer))
    .sort(
      (a, b) =>
        Number(b.priority || 0) -
        Number(a.priority || 0)
    );
}

/* ======================================================
   PRODUCT MATCH
====================================================== */

function kpOfferMatchesProduct(offer, product) {
  if (!offer || !product) {
    return false;
  }

  const hasProducts =
    Array.isArray(offer.productIds) &&
    offer.productIds.length > 0;

  const hasCategories =
    Array.isArray(offer.categories) &&
    offer.categories.length > 0;

  if (
    hasProducts &&
    !offer.productIds.includes(product.id)
  ) {
    return false;
  }

  if (
    hasCategories &&
    !offer.categories.includes(product.cat)
  ) {
    return false;
  }

  return true;
}

/* ======================================================
   PRODUCT OFFERS
====================================================== */

function kpProductOffers(product) {
  if (!product) return [];

  return kpActiveOffers().filter(offer =>
    kpOfferMatchesProduct(offer, product)
  );
}

/* ======================================================
   PRICE CALCULATION
====================================================== */

function kpOfferPrice(product, qty = 1) {
  if (!product) return 0;

  let price = Number(product.price || 0);

  const offers = kpProductOffers(product);

  if (!offers.length) {
    return price;
  }

  let applied = false;

  for (const offer of offers) {
    let next = price;

    if (
      offer.type === "percentage" ||
      offer.type === "festival" ||
      offer.type === "campaign" ||
      offer.type === "flash_sale" ||
      offer.type === "happy_hour"
    ) {
      const percent =
        Number(offer.discountPercent || 0);

      next =
        price -
        price * percent / 100;
    }

    else if (offer.type === "amount") {
      next =
        price -
        Number(offer.discountAmount || 0);
    }

    else if (offer.type === "quantity") {
      const tiers =
        Array.isArray(offer.tiers)
          ? offer.tiers
          : [];

      const tier =
        tiers
          .filter(t => qty >= Number(t.qty || 0))
          .sort(
            (a, b) =>
              Number(b.qty || 0) -
              Number(a.qty || 0)
          )[0];

      if (tier) {
        if (tier.percent) {
          next =
            price -
            price *
              Number(tier.percent) /
              100;
        }

        if (tier.amount) {
          next =
            price -
            Number(tier.amount);
        }
      }
    }

    else if (offer.type === "buy_more_save_more") {
      const tiers =
        Array.isArray(offer.tiers)
          ? offer.tiers
          : [];

      const tier =
        tiers
          .filter(t => qty >= Number(t.qty || 0))
          .sort(
            (a, b) =>
              Number(b.qty || 0) -
              Number(a.qty || 0)
          )[0];

      if (tier) {
        next =
          price -
          price *
            Number(tier.discountPercent || 0) /
            100;
      }
    }

    if (next < price) {
      price = next;
      applied = true;

      if (offer.stackable !== true) {
        break;
      }
    }
  }

  return Math.max(0, Math.round(price));
}

/* ======================================================
   DISCOUNT TEXT
====================================================== */

function kpOfferDiscountText(offer) {
  if (!offer) return "";

  if (
    offer.discountPercent !== undefined
  ) {
    return (
      Number(offer.discountPercent) +
      "% OFF"
    );
  }

  if (
    offer.discountAmount !== undefined
  ) {
    return (
      kpMoney(offer.discountAmount) +
      " OFF"
    );
  }

  return offer.title || "Special Offer";
}

/* ======================================================
   CART CALCULATION
====================================================== */

function kpCalculateCart(cartItems = []) {
  const lines = [];

  let originalSubtotal = 0;
  let subtotal = 0;

  for (const item of cartItems) {
    const product =
      products.find(
        p => p.id === item.id
      );

    if (!product) continue;

    const qty =
      Math.max(
        1,
        Number(item.qty || 1)
      );

    const originalUnitPrice =
      Number(product.price || 0);

    const unitPrice =
      kpOfferPrice(product, qty);

    const originalTotal =
      originalUnitPrice * qty;

    const finalTotal =
      unitPrice * qty;

    originalSubtotal += originalTotal;
    subtotal += finalTotal;

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
          originalTotal - finalTotal
        )
    });
  }

  const discount =
    Math.max(
      0,
      originalSubtotal - subtotal
    );

  return {
    lines,
    originalSubtotal,
    subtotal,
    discount,
    cashback: 0,
    freeShipping: false,
    freeGifts: [],
    appliedOffers: []
  };
}

/* ======================================================
   OFFER-AWARE PRODUCT CARD
====================================================== */

function kpOfferProductCard(product) {
  const original =
    Number(product.price || 0);

  const finalPrice =
    kpOfferPrice(product);

  const discounted =
    finalPrice < original;

  const offer =
    kpProductOffers(product)[0];

  const badge =
    discounted
      ? kpOfferDiscountText(offer)
      : (product.badge || "");

  return `
    <article class="product">

      <div class="product-image">

        <img
          src="${product.img}"
          alt="${product.name}"
          loading="lazy"
        >

        <span class="badge">
          ${badge}
        </span>

        <button
          class="heart"
          onclick="toggleWishlist(${product.id})"
        >
          ${
            wishlist.includes(product.id)
              ? "♥"
              : "♡"
          }
        </button>

      </div>

      <div class="product-info">

        <small>
          ${product.cat}
        </small>

        <div class="product-name">
          ${product.name}
        </div>

        <div>
          <span class="rating">
            ${product.rating}
          </span>
        </div>

        <div>

          <span class="price">
            ${kpMoney(finalPrice)}
          </span>

          ${
            discounted
              ? `
                <span class="old">
                  ${kpMoney(original)}
                </span>
              `
              : `
                ${
                  product.old
                    ? `
                      <span class="old">
                        ${kpMoney(product.old)}
                      </span>
                    `
                    : ""
                }
              `
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
                ${kpOfferDiscountText(offer)}
              </small>
            `
            : ""
        }

        <button
          class="add"
          onclick="addCart(${product.id})"
        >
          কার্টে যোগ করুন
        </button>

      </div>

    </article>
  `;
}

/* ======================================================
   RENDER PRODUCTS
====================================================== */

window.renderProducts = function(list) {
  const box =
    document.querySelector("#productsGrid");

  if (!box) return;

  const safeList =
    Array.isArray(list)
      ? list
      : [];

  const sorted =
    [...safeList].sort(
      (a, b) =>
        kpProductOffers(b).length -
        kpProductOffers(a).length
    );

  box.innerHTML =
    sorted.length
      ? sorted
          .map(kpOfferProductCard)
          .join("")
      : `
        <div class="empty">
          কোনো পণ্য পাওয়া যায়নি।
        </div>
      `;
};

/* ======================================================
   SHOW OFFER PRODUCTS
====================================================== */

window.kpShowOfferProducts =
function(offerId) {

  const offer =
    kpOffers.find(
      o =>
        String(o.id) ===
        String(offerId)
    );

  if (!offer) {
    if (typeof toast === "function") {
      toast("এই অফার পাওয়া যায়নি");
    }
    return;
  }

  const list =
    products.filter(
      p =>
        kpOfferMatchesProduct(
          offer,
          p
        )
    );

  window.renderProducts(list);

  const featured =
    document.querySelector("#featured");

  if (featured) {
    featured.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
};

/* ======================================================
   CART
====================================================== */

window.cartHTML = function() {

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
    kpCalculateCart(cart);

  const rows =
    calc.lines.map(line => {

      const p =
        line.product;

      const original =
        line.originalUnitPrice;

      const finalPrice =
        line.unitPrice;

      const discounted =
        finalPrice < original;

      const offer =
        kpProductOffers(p)[0];

      return `
        <div class="cart-item">

          <img src="${p.img}">

          <div class="grow">

            <b>${p.name}</b>

            <div>
              ${kpMoney(finalPrice)}

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
                      ${kpMoney(original)}
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
                    ${kpOfferDiscountText(offer)}
                  </small>
                `
                : ""
            }

            <div class="qty">

              <button
                onclick="changeQty(${p.id},-1)"
              >
                −
              </button>

              ${line.qty}

              <button
                onclick="changeQty(${p.id},1)"
              >
                +
              </button>

            </div>

          </div>

          <button
            onclick="removeCart(${p.id})"
          >
            ×
          </button>

        </div>
      `;
    }).join("");

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
              -${kpMoney(calc.discount)}
            </span>
          </div>
        `
        : ""
    }

    <div class="panel-total">

      <span>মোট</span>

      <span>
        ${kpMoney(calc.subtotal)}
      </span>

    </div>

    <button
      class="full"
      onclick="checkout()"
    >
      Checkout →
    </button>
  `;
};

/* ======================================================
   CHECKOUT
====================================================== */

window.checkout = function() {

  if (!cart.length) {
    if (typeof toast === "function") {
      toast("কার্ট খালি");
    }
    return;
  }

  const calc =
    kpCalculateCart(cart);

  document.querySelector("#panel").innerHTML = `

    <button
      class="panel-close"
      onclick="openPanel('cart')"
    >
      ←
    </button>

    <h2>Checkout</h2>

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
        placeholder="01XXXXXXXXX"
      >
    </div>

    <div class="field">
      <label>ডেলিভারি ঠিকানা</label>

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
        ${kpMoney(calc.originalSubtotal)}
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
              -${kpMoney(calc.discount)}
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
        ${kpMoney(calc.subtotal)}
      </span>

    </div>

    <button
      class="full"
      onclick="placeDemoOrder()"
    >
      Order Confirm
    </button>
  `;
};

/* ======================================================
   PLACE ORDER
====================================================== */

window.placeDemoOrder =
async function() {

  const nameEl =
    document.querySelector("#coName");

  const mobileEl =
    document.querySelector("#coMobile");

  const addressEl =
    document.querySelector("#coAddress");

  if (!nameEl || !mobileEl || !addressEl) {
    return;
  }

  const name =
    nameEl.value.trim();

  const mobile =
    mobileEl.value.trim();

  const address =
    addressEl.value.trim();

  if (!name || !mobile || !address) {
    toast(
      "নাম, মোবাইল ও ঠিকানা দিন"
    );
    return;
  }
if (!/^01\d{9}$/.test(mobile)) {
  toast(
    "সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন। নম্বরটি 01 দিয়ে শুরু হতে হবে।"
  );
  return;
}
  if (!cart.length) {
    toast("কার্ট খালি");
    return;
  }

  const calc =
    kpCalculateCart(cart);

  const items =
    cart.map(item => {

      const product =
        products.find(
          p => p.id === item.id
        );

      return {
        productId: item.id,
        quantity: item.qty,

        unitPrice:
          kpOfferPrice(
            product,
            item.qty
          )
      };
    });

  /* --------------------------------------------------
     LOGGED-IN CUSTOMER
  -------------------------------------------------- */

  if (
    typeof API_BASE !== "undefined" &&
    API_BASE &&
    typeof kpToken !== "undefined" &&
    kpToken
  ) {

    try {

      const result =
        await apiCreateOrder({
          customerName: name,
          mobile: mobile,
          address: address,
          paymentMethod: "COD",
          items: items
        });

      cart = [];

      save();

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
          ${
            result.orderId ||
            result.id ||
            "KP-ORDER"
          }
        </h2>

        <p
          style="
            color:#078b5b;
            font-weight:700;
          "
        >
          মোট:
          ${kpMoney(calc.subtotal)}
        </p>

        <button
          class="full"
          onclick="closePanel()"
        >
          ঠিক আছে
        </button>
      `;

      return;

    } catch (error) {

      console.error(
        "KachePai order error:",
        error
      );

      /*
       * Server order failed.
       * Do NOT silently pretend that a real
       * backend order was created.
       */

      toast(
        error.message ||
        "Server order তৈরি হয়নি"
      );

      return;
    }
  }

  /* --------------------------------------------------
     DEMO ORDER
     -------------------------------------------------- */

  const orderId =
    "KP-" +
    Math.floor(
      10000 +
      Math.random() * 89999
    );

  localStorage.setItem(
    "kp_last_order",
    JSON.stringify({
      order: orderId,
      name: name,
      mobile: mobile,
      address: address,
      items: cart,
      total: calc.subtotal,
      date:
        new Date().toISOString()
    })
  );

  cart = [];

  save();

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
      ${orderId}
    </h2>

    <p
      style="
        color:#078b5b;
        font-weight:700;
      "
    >
      মোট:
      ${kpMoney(calc.subtotal)}
    </p>

    <p
      style="
        color:#718078;
      "
    >
      আপনার অর্ডারটি সংরক্ষণ করা হয়েছে।
    </p>

    <button
      class="full"
      onclick="closePanel()"
    >
      ঠিক আছে
    </button>
  `;
};

/* ======================================================
   OFFER ENGINE API
====================================================== */

window.KP_OFFER_ENGINE = {

  offers: kpOffers,

  active: kpActiveOffers,

  isActive: kpOfferIsActive,

  productOffers: kpProductOffers,

  price: kpOfferPrice,

  calculateCart: kpCalculateCart,

  sortProducts: function(list) {
    return [...list].sort(
      (a, b) =>
        kpProductOffers(b).length -
        kpProductOffers(a).length
    );
  },

  renderProducts:
    window.renderProducts
};

/* ======================================================
   OFFER BANNERS
====================================================== */

function kpRenderOffers() {

  const containers = [
    "#dynamicOffers",
    "#homeOfferBanner"
  ];

  const active =
    kpActiveOffers();

  for (const selector of containers) {

    const box =
      document.querySelector(selector);

    if (!box) continue;

    if (!active.length) {
      box.innerHTML = "";
      continue;
    }

    box.innerHTML =
      active
        .filter(o => o.homepage !== false)
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
                ${offer.title}
              </h3>

              <p>
                ${offer.message || ""}
              </p>

              <button
                class="add"
                onclick="
                  kpShowOfferProducts('${offer.id}')
                "
              >
                অফারের পণ্য দেখুন
              </button>

            </div>
          `
        )
        .join("");
  }
}

function kpRenderUpcomingOffers() {

  const box =
    document.querySelector(
      "#upcomingOffers"
    );

  if (!box) return;

  const upcoming =
    kpOffers.filter(
      o =>
        o.active !== false &&
        !kpOfferIsActive(o)
    );

  box.innerHTML =
    upcoming.length
      ? upcoming
          .map(
            o => `
              <div class="offer-card">
                <h3>${o.title}</h3>
                <p>${o.message || ""}</p>
              </div>
            `
          )
          .join("")
      : "";
}

/* ======================================================
   START
====================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    kpRenderOffers();

    kpRenderUpcomingOffers();

    /*
     * script.js already calls renderProducts()
     * but this keeps offer rendering active.
     */

    if (
      typeof products !== "undefined" &&
      typeof window.renderProducts ===
        "function"
    ) {
      window.renderProducts(products);
    }
  }
);
