/*
========================================================
KACHEPAI — CLEAN DYNAMIC OFFER ENGINE
========================================================
*/

const kpOffers = [

  /* ==============================
     WEEKEND OFFER
  ============================== */

  {
    id: "weekend-001",

    title: "🎉 সাপ্তাহিক Weekend Offer",

    message:
      "শুক্রবার ও শনিবার নির্বাচিত পণ্যে ১০% ছাড়",

    type: "percentage",

    recurringDays: [5, 6],

    startTime: "00:00",
    endTime: "23:59",

    discountPercent: 10,

    categories: [],

    productIds: [1, 2, 5],

    priority: 10,

    homepage: true,

    active: true,

    stackable: false
  }

];


/* ======================================================
   BASIC HELPERS
====================================================== */

function kpMoney(value) {

  if (typeof money === "function") {
    return money(value);
  }

  return "৳" +
    Number(value || 0).toLocaleString("en-BD");
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

  const parts =
    String(time).split(":").map(Number);

  return (parts[0] || 0) * 60 +
         (parts[1] || 0);
}


/* ======================================================
   DATE / TIME
====================================================== */

function kpDateTimeActive(offer) {

  const now = kpNow();

  const current =
    kpMinutes(now.time);

  if (Array.isArray(offer.recurringDays)) {

    if (
      !offer.recurringDays.includes(now.day)
    ) {
      return false;
    }

    const start =
      kpMinutes(offer.startTime || "00:00");

    const end =
      kpMinutes(offer.endTime || "23:59");

    return (
      current >= start &&
      current <= end
    );
  }


  if (
    offer.startDate &&
    now.date < offer.startDate
  ) {
    return false;
  }


  if (
    offer.endDate &&
    now.date > offer.endDate
  ) {
    return false;
  }


  if (
    offer.startDate === now.date &&
    current <
      kpMinutes(offer.startTime || "00:00")
  ) {
    return false;
  }


  if (
    offer.endDate === now.date &&
    current >
      kpMinutes(offer.endTime || "23:59")
  ) {
    return false;
  }


  return true;
}


/* ======================================================
   CUSTOMER ELIGIBILITY
====================================================== */

function kpCustomerAllowed(
  offer,
  customer = {}
) {

  if (
    !offer.customerType ||
    offer.customerType === "all"
  ) {
    return true;
  }


  if (
    offer.customerType === "new"
  ) {
    return !!customer.isNew;
  }


  if (
    offer.customerType === "returning"
  ) {
    return !!customer.isReturning;
  }


  if (
    offer.customerType === "loggedIn"
  ) {
    return !!customer.loggedIn;
  }


  if (
    Array.isArray(offer.customerIds) &&
    offer.customerIds.length
  ) {
    return offer.customerIds.includes(
      customer.id
    );
  }


  return true;
}


/* ======================================================
   ACTIVE OFFERS
====================================================== */

function kpOfferIsActive(
  offer,
  customer = {}
) {

  return !!(
    offer &&
    offer.active !== false &&
    kpDateTimeActive(offer) &&
    kpCustomerAllowed(
      offer,
      customer
    )
  );
}


function kpActiveOffers(
  customer = {}
) {

  return kpOffers
    .filter(
      offer =>
        kpOfferIsActive(
          offer,
          customer
        )
    )
    .sort(
      (a, b) =>
        Number(b.priority || 0) -
        Number(a.priority || 0)
    );
}


/* ======================================================
   PRODUCT MATCH
====================================================== */

function kpOfferMatchesProduct(
  offer,
  product
) {

  if (!offer || !product) {
    return false;
  }


  const productIds =
    Array.isArray(offer.productIds)
      ? offer.productIds
      : [];


  const categories =
    Array.isArray(offer.categories)
      ? offer.categories
      : [];


  const bundleIds =
    Array.isArray(offer.bundleProductIds)
      ? offer.bundleProductIds
      : [];


  if (
    productIds.length &&
    !productIds.includes(product.id)
  ) {
    return false;
  }


  if (
    categories.length &&
    !categories.includes(product.cat)
  ) {
    return false;
  }


  if (
    bundleIds.length &&
    !bundleIds.includes(product.id)
  ) {
    return false;
  }


  return (
    productIds.length > 0 ||
    categories.length > 0 ||
    bundleIds.length > 0 ||
    (
      !productIds.length &&
      !categories.length &&
      !bundleIds.length
    )
  );
}


/* ======================================================
   PRODUCT OFFERS
====================================================== */

function kpProductOffers(
  product,
  customer = {}
) {

  return kpActiveOffers(customer)
    .filter(
      offer =>
        kpOfferMatchesProduct(
          offer,
          product
        )
    );
}


/* ======================================================
   PRODUCT PRICE
====================================================== */

function kpApplyProductOffer(
  price,
  offer
) {

  let result =
    Number(price || 0);


  if (
    offer.type === "flash_sale" &&
    offer.salePrice != null
  ) {

    result =
      Number(offer.salePrice);

  } else {

    if (
      offer.discountPercent != null
    ) {

      result -=
        result *
        Number(
          offer.discountPercent
        ) /
        100;
    }


    if (
      offer.discountAmount != null
    ) {

      result -=
        Number(
          offer.discountAmount
        );
    }
  }


  return Math.max(
    0,
    Math.round(result)
  );
}


function kpOfferPrice(
  product,
  customer = {}
) {

  if (!product) {
    return 0;
  }


  const offers =
    kpProductOffers(
      product,
      customer
    );


  let price =
    Number(product.price || 0);


  for (
    const offer of offers
  ) {

    if (
      [
        "spend_save",
        "buy_x_get_y",
        "buy_more_save_more",
        "quantity",
        "combo",
        "mix_match",
        "free_gift",
        "coupon",
        "free_shipping",
        "cashback",
        "loyalty",
        "referral"
      ].includes(offer.type)
    ) {
      continue;
    }


    price =
      kpApplyProductOffer(
        price,
        offer
      );


    if (
      offer.stackable !== true
    ) {
      break;
    }
  }


  return Math.max(
    0,
    Math.round(price)
  );
}


/* ======================================================
   OFFER LABEL
====================================================== */

function kpOfferDiscountText(
  offer
) {

  if (!offer) {
    return "";
  }


  if (
    offer.discountPercent != null
  ) {
    return (
      Number(
        offer.discountPercent
      ) +
      "% OFF"
    );
  }


  if (
    offer.discountAmount != null
  ) {
    return (
      kpMoney(
        offer.discountAmount
      ) +
      " OFF"
    );
  }


  if (
    offer.salePrice != null
  ) {
    return (
      "মাত্র " +
      kpMoney(
        offer.salePrice
      )
    );
  }


  switch (offer.type) {

    case "spend_save":
      return "Spend & Save";

    case "buy_x_get_y":
      return (
        "Buy " +
        (offer.buyQty || 1) +
        " Get " +
        (offer.getQty || 1)
      );

    case "buy_more_save_more":
      return "Buy More Save More";

    case "quantity":
      return "Quantity Discount";

    case "combo":
      return "Combo Offer";

    case "mix_match":
      return "Mix & Match";

    case "free_gift":
      return "Free Gift";

    case "coupon":
      return "Coupon";

    case "free_shipping":
      return "Free Shipping";

    case "cashback":
      return "Cashback";

    case "loyalty":
      return "Loyalty Bonus";

    case "referral":
      return "Referral Bonus";

    default:
      return "SPECIAL OFFER";
  }
}


/* ======================================================
   CART PRODUCTS
====================================================== */

function kpCartProducts(
  cart = []
) {

  if (
    !Array.isArray(cart) ||
    typeof products === "undefined"
  ) {
    return [];
  }


  return cart
    .map(item => {

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(item.id)
        );


      if (!product) {
        return null;
      }


      const qty =
        Math.max(
          1,
          Number(
            item.qty ||
            item.quantity ||
            1
          )
        );


      const original =
        Number(
          product.price || 0
        );


      const unitPrice =
        kpOfferPrice(product);


      return {

        item,

        product,

        qty,

        originalUnitPrice:
          original,

        unitPrice,

        lineOriginal:
          original * qty,

        lineTotal:
          unitPrice * qty
      };

    })
    .filter(Boolean);
}


/* ======================================================
   BUY MORE / QUANTITY
====================================================== */

function kpQuantityDiscount(
  line,
  offer
) {

  if (
    ![
      "buy_more_save_more",
      "quantity"
    ].includes(offer.type)
  ) {
    return 0;
  }


  const tiers =
    Array.isArray(offer.tiers)
      ? offer.tiers
      : [];


  let best = 0;


  tiers.forEach(
    tier => {

      if (
        line.qty <
        Number(
          tier.minQty || 0
        )
      ) {
        return;
      }


      let d = 0;


      if (
        tier.discountPercent != null
      ) {

        d =
          line.lineOriginal *
          Number(
            tier.discountPercent
          ) /
          100;
      }


      if (
        tier.discountAmount != null
      ) {

        d =
          Number(
            tier.discountAmount
          ) *
          line.qty;
      }


      best =
        Math.max(
          best,
          d
        );
    }
  );


  return Math.min(
    line.lineTotal,
    Math.round(best)
  );
}


/* ======================================================
   BUY X GET Y
====================================================== */

function kpBuyXGetYDiscount(
  line,
  offer
) {

  if (
    offer.type !==
    "buy_x_get_y"
  ) {
    return 0;
  }


  const buy =
    Math.max(
      1,
      Number(
        offer.buyQty || 1
      )
    );


  const get =
    Math.max(
      1,
      Number(
        offer.getQty || 1
      )
    );


  const sets =
    Math.floor(
      line.qty /
      (buy + get)
    );


  const freeQty =
    sets * get;


  return Math.min(
    line.lineTotal,
    Math.round(
      freeQty *
      line.unitPrice
    )
  );
}


/* ======================================================
   SPEND & SAVE
====================================================== */

function kpSpendSaveDiscount(
  subtotal,
  offer
) {

  if (
    offer.type !==
    "spend_save"
  ) {
    return 0;
  }


  let best = 0;


  const tiers =
    Array.isArray(offer.tiers)
      ? offer.tiers
      : [];


  tiers.forEach(
    tier => {

      if (
        subtotal <
        Number(
          tier.minSpend || 0
        )
      ) {
        return;
      }


      let d = 0;


      if (
        tier.discountPercent != null
      ) {

        d =
          subtotal *
          Number(
            tier.discountPercent
          ) /
          100;
      }


      if (
        tier.discountAmount != null
      ) {

        d =
          Number(
            tier.discountAmount
          );
      }


      best =
        Math.max(
          best,
          d
        );
    }
  );


  if (
    !tiers.length &&
    offer.minSpend != null &&
    subtotal >=
      Number(offer.minSpend)
  ) {

    if (
      offer.discountPercent != null
    ) {

      best =
        subtotal *
        Number(
          offer.discountPercent
        ) /
        100;

    } else if (
      offer.discountAmount != null
    ) {

      best =
        Number(
          offer.discountAmount
        );
    }
  }


  return Math.min(
    subtotal,
    Math.round(best)
  );
}


/* ======================================================
   COMBO
====================================================== */

function kpComboDiscount(
  lines,
  offer
) {

  if (
    offer.type !== "combo"
  ) {
    return 0;
  }


  const ids =
    Array.isArray(offer.productIds)
      ? offer.productIds.map(String)
      : [];


  if (!ids.length) {
    return 0;
  }


  const valid =
    ids.every(
      id =>
        lines.some(
          line =>
            String(
              line.product.id
            ) === id
        )
    );


  if (!valid) {
    return 0;
  }


  const base =
    ids.reduce(
      (sum, id) => {

        const line =
          lines.find(
            x =>
              String(
                x.product.id
              ) === id
          );


        return (
          sum +
          (
            line
              ? line.unitPrice
              : 0
          )
        );

      },
      0
    );


  if (
    offer.comboPrice != null
  ) {

    return Math.max(
      0,
      Math.round(
        base -
        Number(
          offer.comboPrice
        )
      )
    );
  }


  if (
    offer.discountPercent != null
  ) {

    return Math.round(
      base *
      Number(
        offer.discountPercent
      ) /
      100
    );
  }


  if (
    offer.discountAmount != null
  ) {

    return Math.min(
      base,
      Number(
        offer.discountAmount
      )
    );
  }


  return 0;
}


/* ======================================================
   MIX & MATCH
====================================================== */

function kpMixMatchDiscount(
  lines,
  offer
) {

  if (
    offer.type !==
    "mix_match"
  ) {
    return 0;
  }


  const ids =
    Array.isArray(offer.productIds)
      ? offer.productIds.map(String)
      : [];


  const required =
    Math.max(
      1,
      Number(
        offer.requiredQty ||
        offer.minQty ||
        2
      )
    );


  const matched =
    lines.filter(
      line =>
        ids.includes(
          String(
            line.product.id
          )
        )
    );


  const totalQty =
    matched.reduce(
      (s, x) =>
        s + x.qty,
      0
    );


  if (
    totalQty <
    required
  ) {
    return 0;
  }


  const base =
    matched.reduce(
      (s, x) =>
        s + x.lineTotal,
      0
    );


  if (
    offer.discountPercent != null
  ) {

    return Math.round(
      base *
      Number(
        offer.discountPercent
      ) /
      100
    );
  }


  if (
    offer.discountAmount != null
  ) {

    return Math.min(
      base,
      Number(
        offer.discountAmount
      )
    );
  }


  return 0;
}


/* ======================================================
   COMPLETE CART CALCULATION
====================================================== */

function kpCalculateCart(
  cart = [],
  options = {}
) {

  const lines =
    kpCartProducts(cart);


  let subtotal =
    lines.reduce(
      (sum, line) =>
        sum + line.lineTotal,
      0
    );


  const originalSubtotal =
    lines.reduce(
      (sum, line) =>
        sum + line.lineOriginal,
      0
    );


  let discount =
    originalSubtotal -
    subtotal;


  const appliedOffers = [];

  let cashback = 0;

  let freeShipping = false;

  let freeGifts = [];


  /* =========================
     QUANTITY OFFERS
  ========================= */

  lines.forEach(
    line => {

      kpProductOffers(
        line.product
      ).forEach(
        offer => {

          const d =
            kpQuantityDiscount(
              line,
              offer
            );


          if (d > 0) {

            discount += d;

            subtotal =
              Math.max(
                0,
                subtotal - d
              );

            appliedOffers.push(
              offer
            );
          }
        }
      );
    }
  );


  /* =========================
     BUY X GET Y
  ========================= */

  kpActiveOffers()
    .forEach(
      offer => {

        if (
          offer.type !==
          "buy_x_get_y"
        ) {
          return;
        }


        lines.forEach(
          line => {

            if (
              !kpOfferMatchesProduct(
                offer,
                line.product
              )
            ) {
              return;
            }


            const d =
              kpBuyXGetYDiscount(
                line,
                offer
              );


            if (d > 0) {

              discount += d;

              subtotal =
                Math.max(
                  0,
                  subtotal - d
                );

              appliedOffers.push(
                offer
              );
            }
          }
        );
      }
    );


  /* =========================
     SPEND & SAVE
  ========================= */

  kpActiveOffers()
    .forEach(
      offer => {

        const d =
          kpSpendSaveDiscount(
            subtotal,
            offer
          );


        if (d > 0) {

          discount += d;

          subtotal =
            Math.max(
              0,
              subtotal - d
            );

          appliedOffers.push(
            offer
          );
        }
      }
    );


  /* =========================
     COMBO
  ========================= */

  kpActiveOffers()
    .forEach(
      offer => {

        const d =
          kpComboDiscount(
            lines,
            offer
          );


        if (d > 0) {

          discount += d;

          subtotal =
            Math.max(
              0,
              subtotal - d
            );

          appliedOffers.push(
            offer
          );
        }
      }
    );


  /* =========================
     MIX & MATCH
  ========================= */

  kpActiveOffers()
    .forEach(
      offer => {

        const d =
          kpMixMatchDiscount(
            lines,
            offer
          );


        if (d > 0) {

          discount += d;

          subtotal =
            Math.max(
              0,
              subtotal - d
            );

          appliedOffers.push(
            offer
          );
        }
      }
    );


  /* =========================
     COUPON
  ========================= */

  if (
    options.couponCode
  ) {

    const coupon =
      kpActiveOffers()
        .find(
          offer =>
            offer.type ===
            "coupon" &&
            String(
              offer.code || ""
            ).toUpperCase() ===
            String(
              options.couponCode
            ).toUpperCase()
        );


    if (coupon) {

      let d = 0;


      if (
        coupon.discountPercent != null
      ) {

        d =
          subtotal *
          Number(
            coupon.discountPercent
          ) /
          100;
      }


      if (
        coupon.discountAmount != null
      ) {

        d =
          Number(
            coupon.discountAmount
          );
      }


      d =
        Math.min(
          subtotal,
          Math.round(d)
        );


      subtotal -= d;

      discount += d;

      appliedOffers.push(
        coupon
      );
    }
  }


  /* =========================
     FREE SHIPPING
  ========================= */

  kpActiveOffers()
    .forEach(
      offer => {

        if (
          offer.type !==
          "free_shipping"
        ) {
          return;
        }


        if (
          offer.minSpend == null ||
          subtotal >=
            Number(
              offer.minSpend
            )
        ) {

          freeShipping = true;

          appliedOffers.push(
            offer
          );
        }
      }
    );


  /* =========================
     FREE GIFT
  ========================= */

  kpActiveOffers()
    .forEach(
      offer => {

        if (
          offer.type !==
          "free_gift"
        ) {
          return;
        }


        if (
          offer.minSpend == null ||
          subtotal >=
            Number(
              offer.minSpend
            )
        ) {

          freeGifts.push(
            ...(
              offer.giftProductIds ||
              []
            )
          );

          appliedOffers.push(
            offer
          );
        }
      }
    );


  /* =========================
     CASHBACK
  ========================= */

  kpActiveOffers()
    .forEach(
      offer => {

        if (
          offer.type !==
          "cashback"
        ) {
          return;
        }


        if (
          offer.cashbackPercent != null
        ) {

          cashback +=
            subtotal *
            Number(
              offer.cashbackPercent
            ) /
            100;
        }


        if (
          offer.cashbackAmount != null
        ) {

          cashback +=
            Number(
              offer.cashbackAmount
            );
        }


        appliedOffers.push(
          offer
        );
      }
    );


  return {

    lines,

    originalSubtotal:
      Math.round(
        originalSubtotal
      ),

    subtotal:
      Math.max(
        0,
        Math.round(
          subtotal
        )
      ),

    discount:
      Math.max(
        0,
        Math.round(
          discount
        )
      ),

    cashback:
      Math.max(
        0,
        Math.round(
          cashback
        )
      ),

    freeShipping,

    freeGifts:
      [
        ...new Set(
          freeGifts
        )
      ],

    appliedOffers:
      [
        ...new Map(
          appliedOffers.map(
            offer =>
              [
                offer.id,
                offer
              ]
          )
        ).values()
      ]
  };
}


/* ======================================================
   SORT OFFER PRODUCTS FIRST
====================================================== */

function kpSortProductsWithOffers(
  list = []
) {

  return [...list].sort(
    (a, b) => {

      const ao =
        kpProductOffers(a);

      const bo =
        kpProductOffers(b);


      if (
        ao.length !==
        bo.length
      ) {

        return (
          bo.length -
          ao.length
        );
      }


      const ap =
        ao.length
          ? Math.max(
              ...ao.map(
                o =>
                  Number(
                    o.priority || 0
                  )
              )
            )
          : -1;


      const bp =
        bo.length
          ? Math.max(
              ...bo.map(
                o =>
                  Number(
                    o.priority || 0
                  )
              )
            )
          : -1;


      return bp - ap;
    }
  );
}


/* ======================================================
   OFFER CARD
====================================================== */

function kpOfferCard(
  offer
) {

  return `
    <article
      class="kp-offer-card"
      data-offer-id="${offer.id}"
    >

      <div class="kp-offer-icon">
        🔥
      </div>

      <div class="kp-offer-copy">

        <span class="kp-offer-tag">
          SPECIAL OFFER
        </span>

        <h3>
          ${offer.title || "Special Offer"}
        </h3>

        <p>
          ${offer.message || ""}
        </p>

        <strong>
          ${kpOfferDiscountText(offer)}
        </strong>

      </div>

      <button
        onclick="kpShowOfferProducts('${offer.id}')"
      >
        অফারের পণ্য দেখুন →
      </button>

    </article>
  `;
}


/* ======================================================
   RENDER OFFERS
====================================================== */

function kpRenderOffers() {

  const active =
    kpActiveOffers();


  const box =
    document.querySelector(
      "#dynamicOffers"
    );


  if (box) {

    box.innerHTML =
      active.length
        ? active
            .map(
              kpOfferCard
            )
            .join("")
        : `
          <div class="kp-no-offer">
            এই মুহূর্তে কোনো সক্রিয় অফার নেই।
          </div>
        `;
  }


  const home =
    document.querySelector(
      "#homeOfferBanner"
    );


  if (home) {

    home.innerHTML =
      active.length
        ? `
          <div class="kp-home-offer">

            <div>

              <span>
                🔥 এখন চলছে
              </span>

              <h2>
                ${active[0].title}
              </h2>

              <p>
                ${active[0].message || ""}
              </p>

            </div>

            <button
              onclick="kpShowOfferProducts('${active[0].id}')"
            >
              অফার দেখুন →
            </button>

          </div>
        `
        : "";
  }
}


/* ======================================================
   SHOW ONLY THAT OFFER'S PRODUCTS
====================================================== */

function kpShowOfferProducts(
  offerId
) {

  const offer =
    kpOffers.find(
      o =>
        String(o.id) ===
        String(offerId)
    );


  if (
    !offer ||
    typeof products === "undefined"
  ) {
    return;
  }


  const list =
    kpSortProductsWithOffers(
      products.filter(
        product =>
          kpOfferMatchesProduct(
            offer,
            product
          )
      )
    );


  if (
    typeof window.renderProducts ===
    "function"
  ) {

    window.renderProducts(
      list
    );
  }


  if (
    typeof window.scrollToSection ===
    "function"
  ) {

    window.scrollToSection(
      "featured"
    );
  }


  if (
    typeof window.toast ===
    "function"
  ) {

    window.toast(
      offer.title ||
      "Offer"
    );
  }
}


/* ======================================================
   OFFER PRODUCT CARD
====================================================== */

function kpOfferProductCard(
  product
) {

  const original =
    Number(
      product.price || 0
    );


  const finalPrice =
    kpOfferPrice(
      product
    );


  const discounted =
    finalPrice <
    original;


  const offer =
    kpProductOffers(
      product
    )[0];


  const label =
    discounted
      ? kpOfferDiscountText(
          offer
        )
      : (
          product.badge ||
          ""
        );


  return `
    <article class="product">

      <div class="product-image">

        <img
          src="${product.img}"
          alt="${product.name}"
          loading="lazy"
        >

        <span class="badge">
          ${label}
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
            ${product.rating || ""}
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
              : (
                  product.old
                    ? `
                      <span class="old">
                        ${kpMoney(product.old)}
                      </span>
                    `
                    : ""
                )
          }


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
                  ${label}
                </small>
              `
              : ""
          }

        </div>


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
   OFFER-AWARE PRODUCT RENDER
====================================================== */

window.renderProducts =
  function(list) {

    const box =
      document.querySelector(
        "#productsGrid"
      );


    if (!box) {
      return;
    }


    const safeList =
      Array.isArray(list)
        ? list
        : [];


    const sorted =
      kpSortProductsWithOffers(
        safeList
      );


    box.innerHTML =
      sorted.length
        ? sorted
            .map(
              kpOfferProductCard
            )
            .join("")
        : `
          <div class="empty">
            কোনো পণ্য পাওয়া যায়নি।
          </div>
        `;
  };


/* ======================================================
   CART
====================================================== */

window.cartHTML =
  function() {

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
      kpCalculateCart(
        cart
      );


    const rows =
      calc.lines
        .map(
          line => {

            const p =
              line.product;

            const original =
              line.originalUnitPrice;

            const price =
              line.unitPrice;


            const discounted =
              price < original;


            return `
              <div class="cart-item">

                <img
                  src="${p.img}"
                >

                <div class="grow">

                  <b>
                    ${p.name}
                  </b>

                  <div>

                    <span>
                      ${kpMoney(price)}
                    </span>


                    ${
                      discounted
                        ? `
                          <span
                            style="
                              text-decoration:
                                line-through;
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
                          ${
                            kpOfferDiscountText(
                              kpProductOffers(p)[0]
                            )
                          }
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
          }
        )
        .join("");


    return `
      <h2>
        আপনার কার্ট
      </h2>

      ${rows}


      ${
        calc.discount > 0
          ? `
            <div
              style="
                display:flex;
                justify-content:
                  space-between;
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

        <span>
          মোট
        </span>

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

window.checkout =
  function() {

    if (!cart.length) {

      if (
        typeof toast ===
        "function"
      ) {
        toast(
          "কার্ট খালি"
        );
      }

      return;
    }


    const calc =
      kpCalculateCart(
        cart
      );


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

        <label>
          নাম
        </label>

        <input
          id="coName"
          placeholder="আপনার নাম"
        >

      </div>


      <div class="field">

        <label>
          মোবাইল
        </label>

        <input
          id="coMobile"
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

          <option>
            Cash on Delivery
          </option>

          <option>
            Online Payment (পরে যুক্ত হবে)
          </option>

        </select>

      </div>


      <div class="panel-total">

        <span>
          মূল দাম
        </span>

        <span>
          ${kpMoney(
            calc.originalSubtotal
          )}
        </span>

      </div>


      ${
        calc.discount > 0
          ? `
            <div
              class="panel-total"
              style="
                color:#078b5b;
                font-weight:700;
              "
            >

              <span>
                Offer Discount
              </span>

              <span>
                -${kpMoney(
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
          ${kpMoney(
            calc.subtotal
          )}
        </span>

      </div>


      ${
        calc.freeShipping
          ? `
            <div
              style="
                color:#078b5b;
                font-weight:700;
                margin:10px 0;
              "
            >
              🎁 Free Shipping
            </div>
          `
          : ""
      }


      ${
        calc.cashback > 0
          ? `
            <div
              style="
                color:#078b5b;
                font-weight:700;
                margin:10px 0;
              "
            >
              Cashback:
              ${kpMoney(
                calc.cashback
              )}
            </div>
          `
          : ""
      }


      <button
        class="full"
        onclick="placeDemoOrder()"
      >
        Order Confirm
      </button>
    `;
  };


/* ======================================================
   ORDER
====================================================== */

window.placeDemoOrder =
  async function() {

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


    const calc =
      kpCalculateCart(
        cart
      );


    const items =
      calc.lines.map(
        line => ({

          productId:
            line.product.id,

          quantity:
            line.qty,

          unitPrice:
            line.unitPrice

        })
      );


    if (
      typeof API_BASE !==
        "undefined" &&
      API_BASE &&
      typeof kpToken !==
        "undefined" &&
      kpToken
    ) {

      try {

        const result =
          await apiCreateOrder({

            customerName:
              name,

            mobile,

            address,

            paymentMethod:
              "COD",

            items
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
              result.id
            }
          </h2>

          <p
            style="color:#718078"
          >
            আপনার অর্ডার backend-এ
            সংরক্ষিত হয়েছে।
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

        toast(
          "Server order তৈরি হয়নি"
        );

        return;
      }
    }


    const order =
      "KP-" +
      Math.floor(
        10000 +
        Math.random() *
        89999
      );


    localStorage.setItem(
      "kp_last_order",
      JSON.stringify({

        order,

        name,

        mobile,

        address,

        items: cart,

        total:
          calc.subtotal,

        originalTotal:
          calc.originalSubtotal,

        discount:
          calc.discount,

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
        Demo Order ✓
      </h2>

      <p>
        Order ID:
      </p>

      <h2>
        ${order}
      </h2>

      <p
        style="color:#718078"
      >
        অর্ডারটি সফলভাবে তৈরি হয়েছে।
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
   ENGINE API
====================================================== */

window.KP_OFFER_ENGINE = {

  offers:
    kpOffers,

  active:
    kpActiveOffers,

  price:
    kpOfferPrice,

  productOffers:
    kpProductOffers,

  calculateCart:
    kpCalculateCart,

  cartProducts:
    kpCartProducts,

  sortProducts:
    kpSortProductsWithOffers,

  renderProducts:
    window.renderProducts

};


/* ======================================================
   INITIALIZE
====================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    kpRenderOffers();

    if (
      typeof kpRenderUpcomingOffers ===
      "function"
    ) {
      kpRenderUpcomingOffers();
    }

  }
);


/* ======================================================
   UPCOMING OFFERS
====================================================== */

function kpRenderUpcomingOffers() {

  const box =
    document.querySelector(
      "#upcomingOffers"
    );


  if (!box) {
    return;
  }


  const upcoming =
    kpOffers.filter(
      offer =>
        offer.active !== false &&
        !kpOfferIsActive(offer)
    );


  box.innerHTML =
    upcoming.length
      ? upcoming
          .map(
            offer => `

              <div
                class="kp-upcoming"
              >

                <span>
                  ⏳
                </span>

                <div>

                  <b>
                    ${
                      offer.title ||
                      "Upcoming Offer"
                    }
                  </b>

                  <small>
                    ${
                      offer.message ||
                      "শীঘ্রই অফার শুরু হবে"
                    }
                  </small>

                </div>

              </div>

            `
          )
          .join("")
      : "";
}
