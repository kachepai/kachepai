/* =========================================================
   KachePai Marketplace Core
   Migration 003
   ========================================================= */


/* =========================
   CATEGORY
========================= */
/* =========================================================
   KachePai Marketplace Core
   Migration 003
   Complete replacement
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
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

  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
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

  CONSTRAINT "OfferProduct_pkey" PRIMARY KEY ("id")
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

  CONSTRAINT "OfferCategory_pkey" PRIMARY KEY ("id")
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_orderId_key"
ON "Order"("orderId");

CREATE INDEX "Order_customerId_idx"
ON "Order"("customerId");

CREATE INDEX "Order_status_createdAt_idx"
ON "Order"("status", "createdAt");

CREATE INDEX "Order_mobile_idx"
ON "Order"("mobile");


/* =========================
   ORDER ITEM
========================= */

CREATE TABLE "OrderItem" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "productId" INTEGER,
  "productName" TEXT NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "lineTotal" DECIMAL(12,2) NOT NULL,

  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderItem_orderId_idx"
ON "OrderItem"("orderId");

CREATE INDEX "OrderItem_productId_idx"
ON "OrderItem"("productId");


/* =========================================================
   FOREIGN KEYS
========================================================= */

ALTER TABLE "Category"
ADD CONSTRAINT "Category_parentId_fkey"
FOREIGN KEY ("parentId")
REFERENCES "Category"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;


ALTER TABLE "Product"
ADD CONSTRAINT "Product_categoryId_fkey"
FOREIGN KEY ("categoryId")
REFERENCES "Category"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;


ALTER TABLE "ProductImage"
ADD CONSTRAINT "ProductImage_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


ALTER TABLE "OfferProduct"
ADD CONSTRAINT "OfferProduct_offerId_fkey"
FOREIGN KEY ("offerId")
REFERENCES "Offer"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


ALTER TABLE "OfferProduct"
ADD CONSTRAINT "OfferProduct_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


ALTER TABLE "OfferCategory"
ADD CONSTRAINT "OfferCategory_offerId_fkey"
FOREIGN KEY ("offerId")
REFERENCES "Offer"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


ALTER TABLE "OfferCategory"
ADD CONSTRAINT "OfferCategory_categoryId_fkey"
FOREIGN KEY ("categoryId")
REFERENCES "Category"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


ALTER TABLE "Order"
ADD CONSTRAINT "Order_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;


ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_orderId_fkey"
FOREIGN KEY ("orderId")
REFERENCES "Order"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE SET NULL
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
(8,'ফল & সবজি','fruits-vegetables','🥬','তাজা ফল ও সবজি',true,8,CURRENT_TIMESTAMP);


/* =========================================================
   INITIAL PRODUCTS
========================================================= */

INSERT INTO "Product"
("id","name","slug","sku","brand","description","price","oldPrice","stock","lowStockAt","active","featured","badge","rating","categoryId","updatedAt")
VALUES
(1,'চাল ৫ কেজি','rice-5kg','KP-RICE-001','KachePai','প্রিমিয়াম মানের চাল',420,450,50,5,true,true,'জনপ্রিয়',4.70,1,CURRENT_TIMESTAMP),
(2,'সয়াবিন তেল ২ লিটার','soybean-oil-2l','KP-OIL-002','KachePai','ভোজ্য সয়াবিন তেল',360,390,40,5,true,true,'অফার',4.60,1,CURRENT_TIMESTAMP),
(3,'স্মার্ট LED বাল্ব','smart-led-bulb','KP-LED-003','KachePai','বিদ্যুৎ সাশ্রয়ী LED বাল্ব',250,300,30,5,true,false,'নতুন',4.50,2,CURRENT_TIMESTAMP),
(4,'ব্লুটুথ ইয়ারফোন','bluetooth-earphone','KP-AUD-004','KachePai','ওয়্যারলেস ব্লুটুথ ইয়ারফোন',850,1000,25,5,true,true,'জনপ্রিয়',4.40,2,CURRENT_TIMESTAMP),
(5,'কটন টি-শার্ট','cotton-tshirt','KP-FAS-005','KachePai','আরামদায়ক কটন টি-শার্ট',550,650,35,5,true,true,'অফার',4.60,3,CURRENT_TIMESTAMP),
(6,'ফেস ওয়াশ','face-wash','KP-BEA-006','KachePai','দৈনন্দিন ব্যবহারের ফেস ওয়াশ',320,380,30,5,true,false,'নতুন',4.30,4,CURRENT_TIMESTAMP),
(7,'বেবি ড্রেস','baby-dress','KP-KID-007','KachePai','শিশুদের আরামদায়ক পোশাক',700,800,20,5,true,false,'নতুন',4.50,5,CURRENT_TIMESTAMP),
(8,'কুশন সেট','cushion-set','KP-HOM-008','KachePai','ঘরের জন্য সুন্দর কুশন সেট',900,1050,18,5,true,false,'জনপ্রিয়',4.40,6,CURRENT_TIMESTAMP),
(9,'ফ্রেশ রুই মাছ','fresh-rohu-fish','KP-FSH-009','KachePai','তাজা রুই মাছ',650,700,20,5,true,false,'ফ্রেশ',4.60,7,CURRENT_TIMESTAMP),
(10,'ফ্রেশ সবজি প্যাক','fresh-vegetable-pack','KP-FRT-010','KachePai','মিশ্র তাজা সবজি প্যাক',300,340,25,5,true,false,'ফ্রেশ',4.70,8,CURRENT_TIMESTAMP);


/* =========================================================
   INITIAL PRODUCT IMAGES
========================================================= */

INSERT INTO "ProductImage"
("productId","url","alt","sortOrder")
VALUES
(1,'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80','চাল',0),
(2,'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80','সয়াবিন তেল',0),
(3,'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80','LED বাল্ব',0),
(4,'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80','ইয়ারফোন',0),
(5,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80','টি-শার্ট',0),
(6,'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80','ফেস ওয়াশ',0),
(7,'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80','বেবি ড্রেস',0),
(8,'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80','কুশন',0),
(9,'https://images.unsplash.com/photo-1534766438357-2b270b33a0e8?auto=format&fit=crop&w=800&q=80','রুই মাছ',0),
(10,'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80','সবজি',0);


/* =========================================================
   WEEKEND OFFER
========================================================= */

INSERT INTO "Offer"
("id","title","message","type","discountPercent","recurringDays","startTime","endTime","priority","active","homepage","stackable","updatedAt")
VALUES
(
  1,
  '🎉 সাপ্তাহিক Weekend Offer',
  'নির্বাচিত পণ্যে ১০% ছাড়',
  'percentage',
  10,
  '[5,6]'::jsonb,
  '00:00',
  '23:59',
  10,
  true,
  true,
  false,
  CURRENT_TIMESTAMP
);


/* Weekend offer products */

INSERT INTO "OfferProduct"
("offerId","productId")
VALUES
(1,1),
(1,2),
(1,5);


/* =========================================================
   HOMEPAGE SECTIONS
========================================================= */

INSERT INTO "HomepageSection"
("id","key","title","visible","sortOrder","updatedAt")
VALUES
(1,'HEADER','Header',true,1,CURRENT_TIMESTAMP),
(2,'MAIN_CATEGORY_MENU','Main Category Menu',true,2,CURRENT_TIMESTAMP),
(3,'ADVERTISEMENT_BANNER','Big Advertisement / Campaign Banner',true,3,CURRENT_TIMESTAMP),
(4,'FLASH_SALE','Flash Sale / Today''s Deal',true,4,CURRENT_TIMESTAMP),
(5,'POPULAR_CATEGORIES','Popular Categories',true,5,CURRENT_TIMESTAMP),
(6,'BEST_SELLERS','Best Sellers',true,6,CURRENT_TIMESTAMP),
(7,'NEW_ARRIVALS','New Arrivals',true,7,CURRENT_TIMESTAMP),
(8,'RECOMMENDED','Recommended / Just For You',true,8,CURRENT_TIMESTAMP),
(9,'ALL_PRODUCTS','All Products',true,9,CURRENT_TIMESTAMP);
