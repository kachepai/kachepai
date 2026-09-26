/*
========================================================
 KachePai — Dynamic Offer Engine v2
========================================================
 Supports:
 - Individual / Product discount
 - Category discount
 - Festival / Campaign
 - Flash Sale / Happy Hour
 - Spend & Save
 - Buy X Get Y
 - Buy More Save More
 - Quantity discount
 - Combo / Bundle
 - Mix & Match
 - Free Gift
 - Coupon
 - Free Shipping
 - Cashback / Loyalty / Referral metadata
 - Customer eligibility
 - Date / time / recurring schedule
 - Priority + stacking
 - Active-offer product prioritisation
========================================================
*/

const kpOffers = [
  {
    id: "weekend-001",
    title: "🎉 সাপ্তাহিক Weekend Offer",
    message: "শুক্রবার ও শনিবার নির্বাচিত পণ্যে বিশেষ ছাড়",
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

function kpMoney(v) {
  if (typeof money === "function") {
    return money(v);
  }

  return "৳" + Number(v || 0).toLocaleString("en-BD");
}


function kpNow() {
  const n = new Date();

  return {
    date: [
      n.getFullYear(),
      String(n.getMonth() + 1).padStart(2, "0"),
      String(n.getDate()).padStart(2, "0")
    ].join("-"),

    time:
      String(n.getHours()).padStart(2, "0") +
      ":" +
      String(n.getMinutes()).padStart(2, "0"),

    day: n.getDay()
  };
}


function kpTimeToMinutes(t) {
  if (!t) return 0;

  const [h, m] = String(t).split(":").map(Number);

  return (h || 0) * 60 + (m || 0);
}


/* ======================================================
   DATE / TIME
====================================================== */

function kpDateTimeActive(offer) {

  const now = kpNow();
  const current = kpTimeToMinutes(now.time);


  /* Recurring offer */

  if (offer.recurringDays) {

    if (!offer.recurringDays.includes(now.day)) {
      return false;
    }

    const start =
      kpTimeToMinutes(offer.startTime || "00:00");

    const end =
      kpTimeToMinutes(offer.endTime || "23:59");

    return current >= start && current <= end;
  }


  /* Normal date based offer */

  if (offer.startDate && now.date < offer.startDate) {
    return false;
  }

  if (offer.endDate && now.date > offer.endDate) {
    return false;
  }


  const start =
    kpTimeToMinutes(offer.startTime || "00:00");

  const end =
    kpTimeToMinutes(offer.endTime || "23:59");


  if (
    offer.startDate === now.date &&
    current < start
  ) {
    return false;
  }


  if (
    offer.endDate === now.date &&
    current > end
  ) {
    return false;
  }


  return true;
}


/* ======================================================
   CUSTOMER ELIGIBILITY
====================================================== */

function kpCustomerAllowed(offer, customer = {}) {

  if (
    !offer.customerType ||
    offer.customerType === "all"
  ) {
    return true;
  }


  if (offer.customerType === "new") {
    return !!customer.isNew;
  }


  if (offer.customerType === "returning") {
    return !!customer.isReturning;
  }


  if (offer.customerType === "loggedIn") {
    return !!customer.loggedIn;
  }


  if (
    offer.customerIds &&
    offer.customerIds.length
  ) {
    return offer.customerIds.includes(customer.id);
  }


  return true;
}


/* ======================================================
   ACTIVE OFFER
====================================================== */

function kpOfferIsActive(
  offer,
  customer = {}
) {

  return !!(
    offer &&
    offer.active !== false &&
    kpDateTimeActive(offer) &&
    kpCustomerAllowed(offer, customer)
  );
}


/* ======================================================
   ACTIVE OFFERS
====================================================== */

function kpActiveOffers(customer = {}) {

  return kpOffers
    .filter(o =>
      kpOfferIsActive(o, customer)
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


  const hasProducts =
    Array.isArray(offer.productIds) &&
    offer.productIds.length;


  const hasCategories =
    Array.isArray(offer.categories) &&
    offer.categories.length;


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


  if (
    hasProducts ||
    hasCategories
  ) {
    return true;
  }


  if (
    Array.isArray(offer.bundleProductIds) &&
    offer.bundleProductIds.length
  ) {

    return offer.bundleProductIds.includes(
      product.id
    );
  }


  return true;
}


/* ======================================================
   PRODUCT OFFERS
====================================================== */

function kpProductOffers(
  product,
  customer = {}
) {

  return kpActiveOffers(customer)
    .filter(offer =>
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
    offer.discountPercent != null
  ) {

    result -=
      result *
      Number(offer.discountPercent) /
      100;
  }


  if (
    offer.discountAmount != null
  ) {

    result -=
      Number(offer.discountAmount);
  }


  if (
    offer.type === "flash_sale" &&
    offer.salePrice != null
  ) {

    result =
      Number(offer.salePrice);
  }


  return Math.max(
    0,
    Math.round(result)
  );
}


/* ======================================================
   FINAL PRODUCT PRICE
====================================================== */

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


  if (!offers.length) {
    return Number(product.price || 0);
  }


  let price =
    Number(product.price || 0);


  for (const offer of offers) {

    /*
      Cart-level offers are handled later.
    */

    if (
      offer.type === "coupon" ||
      offer.type === "spend_save" ||
      offer.type === "buy_x_get_y" ||
      offer.type === "combo" ||
      offer.type === "mix_match" ||
      offer.type === "free_gift" ||
      offer.type === "free_shipping" ||
      offer.type === "cashback" ||
      offer.type === "loyalty" ||
      offer.type === "referral"
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
    price
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
      Number(offer.discountPercent) +
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


  if (
    offer.type === "spend_save"
  ) {
    return "Spend & Save";
  }


  if (
    offer.type === "buy_x_get_y"
  ) {

    return (
      "Buy " +
      (offer.buyQty || 1) +
      " Get " +
      (offer.getQty || 1)
    );
  }


  if (
    offer.type === "combo"
  ) {
    return "Combo Offer";
  }


  if (
    offer.type === "mix_match"
  ) {
    return "Mix & Match";
  }


  if (
    offer.type === "free_gift"
  ) {
    return "Free Gift";
  }


  if (
    offer.type === "free_shipping"
  ) {
    return "Free Shipping";
  }


  if (
    offer.type === "cashback"
  ) {
    return "Cashback";
  }


  if (
    offer.type === "loyalty"
  ) {
    return "Loyalty Bonus";
  }


  if (
    offer.type === "referral"
  ) {
    return "Referral Bonus";
  }


  return "SPECIAL OFFER";
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


      const unitPrice =
        kpOfferPrice(product);


      return {

        item,

        product,

        qty,

        unitPrice,

        originalUnitPrice:
          Number(product.price || 0),

        lineOriginal:
          Number(product.price || 0) *
          qty,

        lineTotal:
          unitPrice *
          qty
      };

    })
    .filter(Boolean);
}


/* ======================================================
   SPEND & SAVE
====================================================== */

function kpSpendSaveDiscount(
  subtotal,
  offer
) {

  if (
    offer.type !== "spend_save"
  ) {
    return 0;
  }


  const tiers =
    Array.isArray(offer.tiers)
      ? offer.tiers
      : [];


  let best = 0;


  tiers.forEach(tier => {

    if (
      subtotal >=
      Number(
        tier.minSpend || 0
      )
    ) {

      if (
        tier.discountPercent != null
      ) {

        best =
          Math.max(
            best,
            subtotal *
            Number(
              tier.discountPercent
            ) /
            100
          );
      }


      if (
        tier.discountAmount != null
      ) {

        best =
          Math.max(
            best,
            Number(
              tier.discountAmount
            )
          );
      }
    }

  });


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
    Math.max(
      0,
      Math.round(best)
    )
  );
}


/* ======================================================
   BUY MORE / QUANTITY
====================================================== */

function kpBuyMoreSaveDiscount(
  line
) {

  const offers =
    kpProductOffers(
      line.product
    )
    .filter(
      o =>
        o.type ===
          "buy_more_save_more" ||
        o.type ===
          "quantity"
    );


  let best = 0;


  offers.forEach(offer => {

    const tiers =
      Array.isArray(offer.tiers)
        ? offer.tiers
        : [];


    tiers.forEach(tier => {

      if (
        line.qty >=
        Number(
          tier.minQty || 0
        )
      ) {

        const price =
          line.originalUnitPrice *
          line.qty;


        let discount = 0;


        if (
          tier.discountPercent != null
        ) {

          discount =
            price *
            Number(
              tier.discountPercent
            ) /
            100;
        }


        if (
          tier.discountAmount != null
        ) {

          discount =
            Number(
              tier.discountAmount
            ) *
            line.qty;
        }


        best =
          Math.max(
            best,
            discount
          );
      }

    });

  });


  return Math.min(
    line.lineTotal,
    Math.max(
      0,
      Math.round(best)
    )
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


  const buyQty =
    Math.max(
      1,
      Number(
        offer.buyQty || 1
      )
    );


  const getQty =
    Math.max(
      1,
      Number(
        offer.getQty || 1
      )
    );


  const sets =
    Math.floor(
      line.qty /
      (buyQty + getQty)
    );


  const freeQty =
    sets * getQty;


  return Math.min(
    line.lineTotal,
    Math.round(
      freeQty *
      line.unitPrice
    )
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
    Array.isArray(
      offer.productIds
    )
      ? offer.productIds.map(
          String
        )
      : [];


  if (!ids.length) {
    return 0;
  }


  const matched =
    ids.every(id =>
      lines.some(
        line =>
          String(
            line.product.id
          ) === id &&
          line.qty >=
            Number(
              offer.minQty || 1
            )
      )
    );


  if (!matched) {
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
          (line
            ? line.unitPrice
            : 0)
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
      (sum, item) =>
        sum + item.lineTotal,
      0
    );


  const originalSubtotal =
    lines.reduce(
      (sum, item) =>
        sum + item.lineOriginal,
      0
    );


  let discount =
    originalSubtotal -
    subtotal;


  const appliedOffers = [];


  let freeShipping =
    false;


  let cashback = 0;


  let freeGifts = [];


  /* Buy More Save More */

  lines.forEach(line => {

    const d =
      kpBuyMoreSaveDiscount(
        line
      );


    if (d > 0) {

      discount += d;

      subtotal =
        Math.max(
          0,
          subtotal - d
        );
    }

  });


  /* Buy X Get Y */

  kpActiveOffers()
    .forEach(offer => {

      if (
        offer.type !==
        "buy_x_get_y"
      ) {
        return;
      }


      lines.forEach(line => {

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

      });

    });


  /* Spend & Save */

  kpActiveOffers()
    .forEach(offer => {

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

    });


  /* Combo */

  kpActiveOffers()
    .forEach(offer => {

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

    });


  /* Coupon */

  if (
    options.couponCode
  ) {

    const coupon =
      kpActiveOffers()
        .find(
          o =>
            o.type ===
              "coupon" &&
            String(
              o.code || ""
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
          Math.max(
            0,
            Math.round(d)
          )
        );


      subtotal -= d;

      discount += d;

      appliedOffers.push(
        coupon
      );
    }
  }


  /* Free Shipping */

  kpActiveOffers()
    .forEach(offer => {

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

    });


  /* Cashback */

  kpActiveOffers()
    .forEach(offer => {

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

    });


  /* Free Gift */

  kpActiveOffers()
    .forEach(offer => {

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
          ...(offer.giftProductIds || [])
        );


        appliedOffers.push(
          offer
        );
      }

    });


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
      [...new Set(
        freeGifts
      )],

    appliedOffers:
      [
        ...new Map(
          appliedOffers.map(
            o => [o.id, o]
          )
        ).values()
      ]
  };
}


/* ======================================================
   OFFER PRODUCTS FIRST
====================================================== */

function kpSortProductsWithOffers(
  list = [],
  customer = {}
) {

  return [...list].sort(
    (a, b) => {

      const ao =
        kpProductOffers(
          a,
          customer
        );


      const bo =
        kpProductOffers(
          b,
          customer
        );


      const ah =
        ao.length ? 1 : 0;


      const bh =
        bo.length ? 1 : 0;


      if (ah !== bh) {
        return bh - ah;
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


      if (ap !== bp) {
        return bp - ap;
      }


      return 0;
    }
  );
}


/* ======================================================
   OFFER CARD
====================================================== */

function kpOfferCard(
  offer
) {

  const detail =
    kpOfferDiscountText(
      offer
    );


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
          ${detail}
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
   SHOW OFFER PRODUCTS
====================================================== */

function kpShowOfferProducts(
  offerId
) {

  const offer =
    kpOffers.find(
      o =>
        o.id === offerId
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
        p =>
          kpOfferMatchesProduct(
            offer,
            p
          )
      )

    );


  if (
    typeof renderProducts ===
    "function"
  ) {

    renderProducts(
      list
    );
  }


  if (
    typeof scrollToSection ===
    "function"
  ) {

    scrollToSection(
      "featured"
    );
  }


  if (
    typeof toast ===
    "function"
  ) {

    toast(
      offer.title ||
      "Offer"
    );
  }
}


/* ======================================================
   UPCOMING OFFERS
====================================================== */

function kpUpcomingOffers() {

  return kpOffers.filter(
    offer =>
      offer.active !== false &&
      !kpOfferIsActive(
        offer
      )
  );
}


function kpRenderUpcomingOffers() {

  const box =
    document.querySelector(
      "#upcomingOffers"
    );


  if (!box) {
    return;
  }


  const upcoming =
    kpUpcomingOffers();


  box.innerHTML =
    upcoming.length

      ? upcoming
          .map(
            offer => `

              <div class="kp-upcoming">

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


/* ======================================================
   ADMIN-READY API
====================================================== */

window.KP_OFFER_ENGINE = {

  offers:
    kpOffers,

  active:
    kpActiveOffers,

  isActive:
    kpOfferIsActive,

  productOffers:
    kpProductOffers,

  price:
    kpOfferPrice,

  calculateCart:
    kpCalculateCart,

  sortProducts:
    kpSortProductsWithOffers,

  render:
    kpRenderOffers,

  upcoming:
    kpUpcomingOffers

};


/* ======================================================
   START
====================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    kpRenderOffers();

    kpRenderUpcomingOffers();

  }
);
/* ======================================================
   OFFER PRODUCT VIEW FIX
====================================================== */

function kpOfferProductCard(p) {

  const original = Number(p.price || 0);
  const finalPrice = kpOfferPrice(p);

  const discounted =
    finalPrice < original;

  const offer =
    kpProductOffers(p)[0];

  const badge =
    discounted
      ? kpOfferDiscountText(offer)
      : (p.badge || "");

  return `
    <article class="product">

      <div class="product-image">

        <img
          src="${p.img}"
          alt="${p.name}"
          loading="lazy"
        >

        <span class="badge">
          ${badge}
        </span>

        <button
          class="heart"
          onclick="toggleWishlist(${p.id})"
        >
          ${
            wishlist.includes(p.id)
              ? "♥"
              : "♡"
          }
        </button>

      </div>


      <div class="product-info">

        <small>
          ${p.cat}
        </small>


        <div class="product-name">
          ${p.name}
        </div>


        <div>
          <span class="rating">
            ${p.rating}
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
                  p.old
                    ? `
                      <span class="old">
                        ${kpMoney(p.old)}
                      </span>
                    `
                    : ""
                )
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
          onclick="addCart(${p.id})"
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

window.renderProducts = function(list) {

  const box =
    document.querySelector(
      "#productsGrid"
    );

  if (!box) return;


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
   OFFER BUTTON → ONLY THAT OFFER'S PRODUCTS
====================================================== */

window.kpShowOfferProducts =
function(offerId) {

  const offer =
    kpOffers.find(
      o =>
        String(o.id) ===
        String(offerId)
    );


  if (
    !offer ||
    typeof products ===
      "undefined"
  ) {

    if (
      typeof toast ===
      "function"
    ) {
      toast(
        "এই অফারের পণ্য পাওয়া যায়নি"
      );
    }

    return;
  }


  const list =
    products.filter(
      product =>
        kpOfferMatchesProduct(
          offer,
          product
        )
    );


  /* শুধুমাত্র এই offer-এর product */
  window.renderProducts(
    list
  );


  const featured =
    document.querySelector(
      "#featured"
    );


  if (featured) {

    featured.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }


  if (
    typeof toast ===
    "function"
  ) {

    toast(
      list.length
        ? `${offer.title} — ${list.length}টি পণ্য`
        : "এই অফারে কোনো পণ্য নেই"
    );

  }
};


/* Engine reference update */
window.KP_OFFER_ENGINE.renderProducts =
  window.renderProducts;
