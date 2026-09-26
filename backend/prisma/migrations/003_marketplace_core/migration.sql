CREATE TABLE "Category" ("id" SERIAL NOT NULL,"name" TEXT NOT NULL,"slug" TEXT NOT NULL,"icon" TEXT,"image" TEXT,"description" TEXT,"active" BOOLEAN NOT NULL DEFAULT true,"sortOrder" INTEGER NOT NULL DEFAULT 0,"parentId" INTEGER,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Category_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX "Category_active_sortOrder_idx" ON "Category"("active","sortOrder");

CREATE TABLE "Product" ("id" SERIAL NOT NULL,"name" TEXT NOT NULL,"slug" TEXT NOT NULL,"sku" TEXT,"brand" TEXT,"description" TEXT,"price" DECIMAL(12,2) NOT NULL,"oldPrice" DECIMAL(12,2),"stock" INTEGER NOT NULL DEFAULT 0,"lowStockAt" INTEGER NOT NULL DEFAULT 5,"active" BOOLEAN NOT NULL DEFAULT true,"featured" BOOLEAN NOT NULL DEFAULT false,"badge" TEXT,"rating" DECIMAL(3,2),"categoryId" INTEGER,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Product_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_active_createdAt_idx" ON "Product"("active","createdAt");

CREATE TABLE "ProductImage" ("id" SERIAL NOT NULL,"productId" INTEGER NOT NULL,"url" TEXT NOT NULL,"alt" TEXT,"sortOrder" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId","sortOrder");

CREATE TABLE "Offer" ("id" SERIAL NOT NULL,"title" TEXT NOT NULL,"message" TEXT,"type" TEXT NOT NULL DEFAULT 'percentage',"discountPercent" DECIMAL(5,2),"discountAmount" DECIMAL(12,2),"recurringDays" JSONB,"startTime" TEXT,"endTime" TEXT,"startAt" TIMESTAMP(3),"endAt" TIMESTAMP(3),"priority" INTEGER NOT NULL DEFAULT 0,"active" BOOLEAN NOT NULL DEFAULT true,"homepage" BOOLEAN NOT NULL DEFAULT false,"stackable" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Offer_pkey" PRIMARY KEY ("id"));
CREATE INDEX "Offer_active_priority_idx" ON "Offer"("active","priority");

CREATE TABLE "OfferProduct" ("id" SERIAL NOT NULL,"offerId" INTEGER NOT NULL,"productId" INTEGER NOT NULL,CONSTRAINT "OfferProduct_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "OfferProduct_offerId_productId_key" ON "OfferProduct"("offerId","productId");

CREATE TABLE "OfferCategory" ("id" SERIAL NOT NULL,"offerId" INTEGER NOT NULL,"categoryId" INTEGER NOT NULL,CONSTRAINT "OfferCategory_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "OfferCategory_offerId_categoryId_key" ON "OfferCategory"("offerId","categoryId");

CREATE TABLE "Banner" ("id" SERIAL NOT NULL,"title" TEXT NOT NULL,"desktopImage" TEXT NOT NULL,"mobileImage" TEXT,"link" TEXT,"active" BOOLEAN NOT NULL DEFAULT true,"sortOrder" INTEGER NOT NULL DEFAULT 0,"startAt" TIMESTAMP(3),"endAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Banner_pkey" PRIMARY KEY ("id"));
CREATE INDEX "Banner_active_sortOrder_idx" ON "Banner"("active","sortOrder");

CREATE TABLE "HomepageSection" ("id" SERIAL NOT NULL,"key" TEXT NOT NULL,"title" TEXT,"visible" BOOLEAN NOT NULL DEFAULT true,"sortOrder" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "HomepageSection_key_key" ON "HomepageSection"("key");
CREATE INDEX "HomepageSection_visible_sortOrder_idx" ON "HomepageSection"("visible","sortOrder");

CREATE TABLE "Order" ("id" SERIAL NOT NULL,"orderId" TEXT NOT NULL,"customerId" INTEGER,"customerName" TEXT NOT NULL,"mobile" TEXT NOT NULL,"address" TEXT NOT NULL,"paymentMethod" TEXT NOT NULL DEFAULT 'COD',"paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',"status" TEXT NOT NULL DEFAULT 'PENDING',"subtotal" DECIMAL(12,2) NOT NULL,"discount" DECIMAL(12,2) NOT NULL DEFAULT 0,"deliveryCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,"total" DECIMAL(12,2) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Order_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Order_orderId_key" ON "Order"("order
