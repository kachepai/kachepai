/* =========================================
   KachePai Offer & Promotion System
   ========================================= */

const kpOffers = [
  {
    id: "weekend-001",
    title: "শুক্রবার-শনিবার Weekend Offer",
    message: "প্রতি শুক্রবার ও শনিবার নির্বাচিত পণ্যে বিশেষ অফার",
    type: "recurring",
    recurringDays: [5, 6],
    startTime: "00:00",
    endTime: "23:59",
    discountPercent: 10,
    categories: ["গ্রোসারি"],
    priority: 1,
    homepage: true,
    active: true
  }
];


/* বর্তমান Date / Time বের করা */
function kpNowParts(){

  const now = new Date();

  const pad = n => String(n).padStart(2,"0");

  return {
    date:
      now.getFullYear() +
      "-" +
      pad(now.getMonth()+1) +
      "-" +
      pad(now.getDate()),

    time:
      pad(now.getHours()) +
      ":" +
      pad(now.getMinutes()),

    day: now.getDay()
  };
}


/* Offer এখন Active কিনা */
function kpOfferIsActive(offer){

  if(!offer.active){
    return false;
  }

  const now = kpNowParts();


  /* Recurring Offer */

  if(offer.type === "recurring"){

    return (
      (offer.recurringDays || []).includes(now.day) &&
      now.time >= offer.startTime &&
      now.time <= offer.endTime
    );
  }


  /* Date-based Offer */

  if(!offer.startDate || !offer.endDate){
    return false;
  }

  return (
    now.date >= offer.startDate &&
    now.date <= offer.endDate &&
    now.time >= offer.startTime &&
    now.time <= offer.endTime
  );
}


/* বর্তমানে Active Offer */
function kpActiveOffers(){

  return kpOffers
    .filter(kpOfferIsActive)
    .sort(
      (a,b)=>
        (a.priority || 99) -
        (b.priority || 99)
    );
}


/* Offer কোন Product-এর জন্য */
function kpOfferMatchesProduct(offer,product){

  if(
    !offer.categories ||
    !offer.categories.length
  ){
    return true;
  }

  return offer.categories.includes(product.cat);
}


/* Offer অনুযায়ী Product Price */
function kpOfferPrice(product){

  const offers =
    kpActiveOffers()
      .filter(
        offer =>
          kpOfferMatchesProduct(
            offer,
            product
          )
      );

  if(!offers.length){
    return product.price;
  }

  const offer = offers[0];


  /* Percentage Discount */

  if(offer.discountPercent){

    return Math.max(
      0,
      Math.round(
        product.price *
        (1 - offer.discountPercent / 100)
      )
    );
  }


  /* Fixed Discount */

  if(offer.discountAmount){

    return Math.max(
      0,
      product.price -
      offer.discountAmount
    );
  }


  return product.price;
}


/* Offer Card */
function kpOfferCard(offer){

  const detail =
    offer.discountPercent
      ? offer.discountPercent + "% OFF"
      : offer.discountAmount
        ? money(offer.discountAmount) + " OFF"
        : "বিশেষ অফার";


  return `
    <article class="kp-offer-card">

      <div class="kp-offer-icon">
        🔥
      </div>

      <div class="kp-offer-copy">

        <span class="kp-offer-tag">
          SPECIAL OFFER
        </span>

        <h3>
          ${offer.title}
        </h3>

        <p>
          ${offer.message}
        </p>

        <strong>
          ${detail}
        </strong>

      </div>

      <button
        onclick="kpShowOfferProducts('${offer.id}')"
      >
        অফার দেখুন →
      </button>

    </article>
  `;
}


/* Homepage Offer */
function kpRenderOffers(){

  const active =
    kpActiveOffers();


  const box =
    document.querySelector(
      "#dynamicOffers"
    );


  const home =
    document.querySelector(
      "#homeOfferBanner"
    );


  if(box){

    box.innerHTML =
      active.length

        ? active
            .map(kpOfferCard)
            .join("")

        : `
          <div class="kp-no-offer">
            এই মুহূর্তে কোনো বিশেষ অফার চলছে না।
          </div>
        `;
  }


  if(home){

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
                ${active[0].message}
              </p>

            </div>

            <button
              onclick="kpShowOfferProducts('${active[0].id}')"
            >
              এখনই দেখুন →
            </button>

          </div>
        `

        : "";
  }
}


/* Offer-এর Product দেখানো */
function kpShowOfferProducts(offerId){

  const offer =
    kpOffers.find(
      offer =>
        offer.id === offerId
    );


  if(!offer){
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


  renderProducts(
    list.length
      ? list
      : products.filter(
          product =>
            product.old > product.price
        )
  );


  scrollToSection(
    "featured"
  );


  toast(
    offer.title
  );
}


/* Upcoming Offers */
function kpUpcomingOffers(){

  return kpOffers.filter(
    offer =>
      offer.active &&
      !kpOfferIsActive(offer)
  );
}


/* Upcoming Offer দেখানো */
function kpRenderUpcomingOffers(){

  const box =
    document.querySelector(
      "#upcomingOffers"
    );


  if(!box){
    return;
  }


  const recurring =
    kpUpcomingOffers()
      .filter(
        offer =>
          offer.type === "recurring"
      );


  box.innerHTML =
    recurring.length

      ? recurring
          .map(
            offer =>
              `
              <div class="kp-upcoming">

                <span>📅</span>

                <div>

                  <b>
                    ${offer.title}
                  </b>

                  <small>
                    প্রতি শুক্রবার ও শনিবার
                  </small>

                </div>

              </div>
              `
          )
          .join("")

      : "";
}


/* Offer System চালু */
kpRenderOffers();
kpRenderUpcomingOffers();
