/* =========================================================
   KachePai Marketplace Core
   Migration 003
   ========================================================= */


/* =========================
   CATEGORY
========================= */

CREATE TABLE "Category" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "icon" TEXT,
  "image" TEXT,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "parentId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Category_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_slug_key"
  ON "Category"("slug");

CREATE INDEX "Category_parentId_idx"
  ON "Category"("parentId");

CREATE INDEX "Category_active_sortOrder_idx"
  ON "Category"("active", "sortOrder");


/* =========================
   PRODUCT
========================= */

CREATE TABLE "Product" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sku" TEXT,
  "brand" TEXT,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "oldPrice" DECIMAL(12,2),
  "stock" INTEGER NOT NULL DEFAULT 0,
  "lowStockAt" INTEGER NOT NULL DEFAULT 5,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "badge" TEXT,
  "rating" DECIMAL(3,2),
  "categoryId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Product_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_slug_key"
  ON "Product"("slug");

CREATE UNIQUE INDEX "Product_sku_key"
  ON "Product"("sku");

CREATE INDEX "Product_categoryId_idx"
  ON "Product"("categoryId");

CREATE INDEX "Product_active_createdAt_idx"
  ON "Product"("active", "createdAt");


/* =========================
   PRODUCT IMAGE
========================= */

CREATE TABLE "ProductImage" (
  "id" SERIAL NOT NULL,
  "productId" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "alt" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductImage_pkey"
    PRIMARY KEY ("id")
);

CREATE INDEX "ProductImage_productId_sortOrder_idx"
  ON "ProductImage"("productId", "sortOrder");


/* =========================
   OFFER
========================= */

CREATE TABLE "Offer" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "type" TEXT NOT NULL DEFAULT 'percentage',
  "discountPercent" DECIMAL(5,2),
  "discountAmount" DECIMAL(12,2),
  "recurringDays" JSONB,
  "startTime" TEXT,
  "endTime" TEXT,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "priority" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "homepage" BOOLEAN NOT NULL DEFAULT false,
  "stackable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Offer_pkey"
    PRIMARY KEY ("id")
);

CREATE INDEX "Offer_active_priority_idx"
  ON "Offer"("active", "priority");


/* =========================
   OFFER PRODUCT
========================= */

CREATE TABLE "OfferProduct" (
  "id" SERIAL NOT NULL,
  "offerId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,

  CONSTRAINT "OfferProduct_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferProduct_offerId_productId_key"
  ON "OfferProduct"("offerId", "productId");


/* =========================
   OFFER CATEGORY
========================= */

CREATE TABLE "OfferCategory" (
  "id" SERIAL NOT NULL,
  "offerId" INTEGER NOT NULL,
  "categoryId" INTEGER NOT NULL,

  CONSTRAINT "OfferCategory_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferCategory_offerId_categoryId_key"
  ON "OfferCategory"("offerId", "categoryId");


/* =========================
   BANNER
========================= */

CREATE TABLE "Banner" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "desktopImage" TEXT NOT NULL,
  "mobileImage" TEXT,
  "link" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Banner_pkey"
    PRIMARY KEY ("id")
);

CREATE INDEX "Banner_active_sortOrder_idx"
  ON "Banner"("active", "sortOrder");


/* =========================
   HOMEPAGE SECTION
========================= */

CREATE TABLE "HomepageSection" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HomepageSection_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomepageSection_key_key"
  ON "HomepageSection"("key");

CREATE INDEX "HomepageSection_visible_sortOrder_idx"
  ON "HomepageSection"("visible", "sortOrder");


/* =========================
   ORDER
========================= */

CREATE TABLE "Order" (
  "id" SERIAL NOT NULL,
  "orderId" TEXT NOT NULL,
  "customerId" INTEGER,
  "customerName" TEXT NOT NULL,
  "mobile" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "deliveryCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Order_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_orderId_key"
  ON "Order"("orderId");

CREATE INDEX "Order_customerId_idx"
  ON "Order"("customerId");

CREATE INDEX "Order_status_createdAt_idx"
  ON "Order"("status", "createdAt");


/* =========================
   ORDER ITEM
========================= */

CREATE TABLE "OrderItem" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "productName" TEXT NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "lineTotal" DECIMAL(12,2) NOT NULL,

  CONSTRAINT "OrderItem_pkey"
    PRIMARY KEY ("id")
);

CREATE INDEX "OrderItem_orderId_idx"
  ON "OrderItem"("orderId");

CREATE INDEX "OrderItem_productId_idx"
  ON "OrderItem"("productId");


/* =========================================================
   FOREIGN KEYS
========================================================= */


/* Category self relation */

ALTER TABLE "Category"
ADD CONSTRAINT "Category_parentId_fkey"
FOREIGN KEY ("parentId")
REFERENCES "Category"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;


/* Product -> Category */

ALTER TABLE "Product"
ADD CONSTRAINT "Product_categoryId_fkey"
FOREIGN KEY ("categoryId")
REFERENCES "Category"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;


/* ProductImage -> Product */

ALTER TABLE "ProductImage"
ADD CONSTRAINT "ProductImage_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


/* OfferProduct -> Offer */

ALTER TABLE "OfferProduct"
ADD CONSTRAINT "OfferProduct_offerId_fkey"
FOREIGN KEY ("offerId")
REFERENCES "Offer"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


/* OfferProduct -> Product */

ALTER TABLE "OfferProduct"
ADD CONSTRAINT "OfferProduct_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


/* OfferCategory -> Offer */

ALTER TABLE "OfferCategory"
ADD CONSTRAINT "OfferCategory_offerId_fkey"
FOREIGN KEY ("offerId")
REFERENCES "Offer"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


/* OfferCategory -> Category */

ALTER TABLE "OfferCategory"
ADD CONSTRAINT "OfferCategory_categoryId_fkey"
FOREIGN KEY ("categoryId")
REFERENCES "Category"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


/* Order -> User */

ALTER TABLE "Order"
ADD CONSTRAINT "Order_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;


/* OrderItem -> Order */

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_orderId_fkey"
FOREIGN KEY ("orderId")
REFERENCES "Order"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


/* OrderItem -> Product */

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;


/* =========================================================
   INITIAL CATEGORIES
========================================================= */

INSERT INTO "Category"
("id","name","slug","icon","description","active","sortOrder","updatedAt")
VALUES
(1,'গ্রোসারি','grocery','🛒','দৈনন্দিন প্রয়োজনীয় পণ্য',true,1,CURRENT_TIMESTAMP),
(2,'ইলেকট্রনিক্স','electronics','📱','ইলেকট্রনিক্স ও গ্যাজেট',true,2,CURRENT_TIMESTAMP),
(3,'ফ্যাশন','fashion','👕','পোশাক ও ফ্যাশন',true,3,CURRENT_TIMESTAMP),
(4,'বিউটি','beauty','💄','বিউটি ও পার্সোনাল কেয়ার',true,4,CURRENT_TIMESTAMP),
(5,'কিডস','kids','🧸','শিশুদের প্রয়োজনীয় পণ্য',true,5,CURRENT_TIMESTAMP),
(6,'হোম & লিভিং','home-living','🏠','ঘর ও জীবনযাপনের পণ্য',true,6,CURRENT_TIMESTAMP),
(7,'ফিশ & মিট','fish-meat','🐟','মাছ ও মাংস',true,7,CURRENT_TIMESTAMP),
(8,'ফল & সবজি','fruits-vegetables','🥬','তাজা ফল ও
