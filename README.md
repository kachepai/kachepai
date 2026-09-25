# KachePai Website Complete

এই version-এ customer-facing website আরও সম্পূর্ণ করা হয়েছে।

## Included
- Responsive homepage
- Search
- 8 main categories
- Offers
- Featured / Popular / New products
- Product cards with real product photography URLs
- Wishlist
- Cart quantity control
- Checkout form
- Demo order confirmation
- Customer account UI
- LocalStorage cart/wishlist/demo order
- Mobile-first responsive layout

## গুরুত্বপূর্ণ
এটি এখনো frontend-only build। Checkout-এর order এখন browser LocalStorage-এ demo হিসেবে থাকে। বাস্তব customer/order/payment/stock/admin নিরাপত্তার জন্য backend + database প্রয়োজন।

পরবর্তী ধাপে:
1. Backend connect
2. Real customer authentication
3. Product/category database
4. Real orders
5. Delivery charge
6. Coupon/offer engine
7. Payment gateway
8. Owner/Admin panel
9. Audit & financial controls


# Full-stack connection
এই package-এ `backend/` যোগ করা হয়েছে। Website-এর `api-config.js`-এ backend-এর public URL বসালে frontend API ব্যবহার করতে পারবে।

## Mobile workflow
Android ফোন থেকে GitHub/Cloud editor-এ project upload করা যাবে। Backend-এর জন্য PostgreSQL এবং একটি Node.js hosting প্রয়োজন।

## Security
Production-এর আগে demo seed credentials বদলাতে হবে এবং HTTPS, rate limiting, 2FA, secure secrets, backup, payment verification ও stronger audit storage যোগ করতে হবে।
