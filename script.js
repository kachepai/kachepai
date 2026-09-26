const categories=[
["🛒","গ্রোসারি"],["📱","ইলেকট্রনিক্স"],["👕","ফ্যাশন"],["💄","বিউটি"],["🧸","কিডস"],["🏠","হোম & লিভিং"],["🐟","ফিশ & মিট"],["🥬","ফল & সবজি"]];

const products=[
{id:1,name:"Premium Basmati Rice 5kg",cat:"গ্রোসারি",price:680,old:760,badge:"জনপ্রিয়",rating:"★ 4.8",img:"https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=700&q=80"},
{id:2,name:"Wireless Bluetooth Earbuds",cat:"ইলেকট্রনিক্স",price:1290,old:1590,badge:"হট ডিল",rating:"★ 4.7",img:"https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=700&q=80"},
{id:3,name:"Premium Cotton Panjabi",cat:"ফ্যাশন",price:1450,old:1800,badge:"নতুন",rating:"★ 4.9",img:"https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=700&q=80"},
{id:4,name:"Daily Face Wash 100ml",cat:"বিউটি",price:390,old:450,badge:"অফার",rating:"★ 4.6",img:"https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80"},
{id:5,name:"Modern Ceramic Mug Set",cat:"হোম & লিভিং",price:750,old:900,badge:"জনপ্রিয়",rating:"★ 4.8",img:"https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=700&q=80"},
{id:6,name:"Fresh Seasonal Vegetables",cat:"ফল & সবজি",price:220,old:260,badge:"ফ্রেশ",rating:"★ 4.7",img:"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=700&q=80"},
{id:7,name:"Kids Educational Building Set",cat:"কিডস",price:890,old:1100,badge:"জনপ্রিয়",rating:"★ 4.8",img:"https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=700&q=80"},
{id:8,name:"Fresh Fish Selection 1kg",cat:"ফিশ & মিট",price:620,old:700,badge:"ফ্রেশ",rating:"★ 4.6",img:"https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=700&q=80"},
{id:9,name:"Smart LED Table Lamp",cat:"হোম & লিভিং",price:980,old:1250,badge:"নতুন",rating:"★ 4.7",img:"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=80"},
{id:10,name:"Everyday Casual Shirt",cat:"ফ্যাশন",price:990,old:1250,badge:"অফার",rating:"★ 4.5",img:"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=700&q=80"}];

let cart=JSON.parse(localStorage.getItem("kp_cart")||"[]");
let wishlist=JSON.parse(localStorage.getItem("kp_wishlist")||"[]");

const API_BASE=(window.KACHEPAI_API&&window.KACHEPAI_API.API_BASE||"").replace(/\/$/,"");
let kpToken=localStorage.getItem("kp_token")||"";

async function apiRequest(path,options={}){
  if(!API_BASE)throw new Error("API_NOT_CONFIGURED");
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(kpToken)headers.Authorization="Bearer "+kpToken;
  const res=await fetch(API_BASE+path,{...options,headers});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||"API request failed");
  return data;
}

async function apiLogin(mobile,password){
  const data=await apiRequest("/api/auth/login",{
    method:"POST",
    body:JSON.stringify({mobile,password})
  });
  kpToken=data.token;
  localStorage.setItem("kp_token",kpToken);
  return data;
}

async function apiRegister(name,mobile,password){
  const data=await apiRequest("/api/auth/register",{
    method:"POST",
    body:JSON.stringify({name,mobile,password})
  });
  kpToken=data.token;
  localStorage.setItem("kp_token",kpToken);
  return data;
}

async function apiCreateOrder(payload){
  return apiRequest("/api/orders",{
    method:"POST",
    body:JSON.stringify(payload)
  });
}

async function apiMe(){
  return apiRequest("/api/me");
}

const money=n=>"৳"+n.toLocaleString("en-BD");

function save(){
  localStorage.setItem("kp_cart",JSON.stringify(cart));
  localStorage.setItem("kp_wishlist",JSON.stringify(wishlist));
  counts();
}

function counts(){
  document.querySelector("#cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);
  document.querySelector("#wishCount").textContent=wishlist.length;
}

function productCard(p){
  return `<article class="product">
    <div class="product-image">
      <img src="${p.img}" alt="${p.name}" loading="lazy">
      <span class="badge">${p.badge}</span>
      <button class="heart" onclick="toggleWishlist(${p.id})">${wishlist.includes(p.id)?"♥":"♡"}</button>
    </div>
    <div class="product-info">
      <small>${p.cat}</small>
      <div class="product-name">${p.name}</div>
      <div><span class="rating">${p.rating}</span></div>
      <div>
        <span class="price">${money(p.price)}</span>
        <span class="old">${money(p.old)}</span>
      </div>
      <button class="add" onclick="addCart(${p.id})">কার্টে যোগ করুন</button>
    </div>
  </article>`;
}

function renderProducts(list){
  document.querySelector("#productsGrid").innerHTML=list.length
    ?list.map(productCard).join("")
    :`<div class="empty">কোনো পণ্য পাওয়া যায়নি।</div>`;
}

function renderExtra(){
  document.querySelector("#popularGrid").innerHTML=products.slice(0,5).map(productCard).join("");
  document.querySelector("#newGrid").innerHTML=products.filter(p=>p.badge==="নতুন").map(productCard).join("");
}

function renderCategories(){
  document.querySelector("#categoriesGrid").innerHTML=categories.map(c=>
    `<button class="category" onclick="filterCategory('${c[1]}')">
      <span class="cat-icon">${c[0]}</span><b>${c[1]}</b>
    </button>`
  ).join("");
}

function addCart(id){
  const x=cart.find(x=>x.id===id);
  x?x.qty++:cart.push({id,qty:1});
  save();
  toast("পণ্যটি কার্টে যোগ হয়েছে");
  openPanel("cart");
}

function toggleWishlist(id){
  wishlist.includes(id)
    ?wishlist=wishlist.filter(x=>x!==id)
    :wishlist.push(id);
  save();
  renderProducts(products);
}

function filterCategory(cat){
  renderProducts(products.filter(p=>p.cat===cat));
  scrollToSection("featured");
}

function filterProducts(type){
  renderProducts(
    type==="offer"
      ?products.filter(p=>p.badge==="অফার"||p.old>p.price*1.15)
      :products
  );
  scrollToSection("featured");
}

function search(){
  const q=document.querySelector("#search").value.trim().toLowerCase();
  renderProducts(products.filter(p=>
    (p.name+" "+p.cat).toLowerCase().includes(q)
  ));
  scrollToSection("featured");
}

function scrollToSection(id){
  document.getElementById(id).scrollIntoView({behavior:"smooth"});
}

document.querySelector("#searchBtn").onclick=search;
document.querySelector("#search").onkeydown=e=>{
  if(e.key==="Enter")search();
};

function openPanel(type){
  let html=`<button class="panel-close" onclick="closePanel()">×</button>`;

  if(type==="cart")html+=cartHTML();
  if(type==="wishlist")html+=wishlistHTML();
  if(type==="account")html+=accountHTML();

  document.querySelector("#panel").innerHTML=html;
  document.querySelector("#overlay").style.display="block";
}

function cartHTML(){
  if(!cart.length)
    return `<h2>আপনার কার্ট</h2>
    <div class="empty">কার্ট এখন খালি।<br><br>পছন্দের পণ্য কার্টে যোগ করুন।</div>`;

  const calc=kpCalculateCart(cart);

  const rows=calc.lines.map(line=>{
    const p=line.product;
    const original=line.originalUnitPrice;
    const finalPrice=line.unitPrice;

    return `<div class="cart-item">
      <img src="${p.img}">
      <div class="grow">
        <b>${p.name}</b>

        <div>
          ${kpMoney(finalPrice)}

          ${
            finalPrice<original
              ? `<span style="text-decoration:line-through;color:#999;margin-left:6px">
                  ${kpMoney(original)}
                </span>`
              : ""
          }
        </div>

        ${
          finalPrice<original
            ? `<small style="color:#078b5b;font-weight:700">
                ${kpOfferDiscountText(kpProductOffers(p)[0])}
              </small>`
            : ""
        }

        <div class="qty">
          <button onclick="changeQty(${p.id},-1)">−</button>
          ${line.qty}
          <button onclick="changeQty(${p.id},1)">+</button>
        </div>
      </div>

      <button onclick="removeCart(${p.id})">×</button>
    </div>`;
  }).join("");

  return `<h2>আপনার কার্ট</h2>
    ${rows}

    ${
      calc.discount>0
        ? `<div style="display:flex;justify-content:space-between;color:#078b5b;font-weight:700">
            <span>Offer Discount</span>
            <span>-${kpMoney(calc.discount)}</span>
          </div>`
        : ""
    }

    <div class="panel-total">
      <span>মোট</span>
      <span>${kpMoney(calc.subtotal)}</span>
    </div>

    <button class="full" onclick="checkout()">Checkout →</button>`;
}

function wishlistHTML(){
  const list=products.filter(p=>wishlist.includes(p.id));

  return `<h2>Wishlist</h2>
    ${list.length
      ?list.map(p=>`<div class="wish-item">
        <img src="${p.img}">
        <div class="grow">
          <b>${p.name}</b>
          <div>${money(p.price)}</div>
          <button class="add" onclick="addCart(${p.id})">কার্টে যোগ করুন</button>
        </div>
      </div>`).join("")
      :"<div class='empty'>আপনার Wishlist এখন খালি।</div>"}`;
}

function accountHTML(){
  if(kpToken){
    return `<h2>Customer Account</h2>
      <p>আপনি সফলভাবে Login অবস্থায় আছেন।</p>
      <button class="full" onclick="logoutCustomer()">Logout</button>`;
  }

  return `<h2>Customer Account</h2>

  <h3 style="margin-top:20px">নতুন Customer?</h3>

  <div class="field">
    <label>নাম</label>
    <input id="regName" placeholder="আপনার নাম">
  </div>

  <div class="field">
    <label>মোবাইল নম্বর</label>
    <input id="regMobile" placeholder="01XXXXXXXXX">
  </div>

  <div class="field">
    <label>পাসওয়ার্ড</label>
    <input id="regPassword" type="password" placeholder="কমপক্ষে ৬ অক্ষর">
  </div>

  <button class="full" onclick="registerCustomer()">Create Account</button>

  <hr style="border:0;border-top:1px solid #e5e7eb;margin:25px 0">

  <h3>আগে থেকেই Account আছে?</h3>

  <div class="field">
    <label>মোবাইল নম্বর</label>
    <input id="loginMobile" placeholder="01XXXXXXXXX">
  </div>

  <div class="field">
    <label>পাসওয়ার্ড</label>
    <input id="loginPassword" type="password" placeholder="পাসওয়ার্ড">
  </div>

  <button class="full" onclick="loginCustomer()">Login</button>`;
}

async function registerCustomer(){
  const name=document.querySelector("#regName").value.trim();
  const mobile=document.querySelector("#regMobile").value.trim();
  const password=document.querySelector("#regPassword").value;

  if(!name||!mobile||!password){
    toast("নাম, মোবাইল ও পাসওয়ার্ড দিন");
    return;
  }

  if(password.length<6){
    toast("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
    return;
  }

  try{
    if(!API_BASE){
      toast("Backend URL এখনো সেট করা হয়নি");
      return;
    }

    const result=await apiRegister(name,mobile,password);

    document.querySelector("#panel").innerHTML=
      `<button class="panel-close" onclick="closePanel()">×</button>
      <h2>Account তৈরি হয়েছে ✓</h2>
      <p>স্বাগতম, ${result.user.name}!</p>
      <p>আপনার Customer Account সফলভাবে তৈরি হয়েছে এবং আপনি Login অবস্থায় আছেন।</p>
      <button class="full" onclick="closePanel()">ঠিক আছে</button>`;

  }catch(e){
    toast(e.message||"Account তৈরি করা যায়নি");
  }
}

async function loginCustomer(){
  const mobile=document.querySelector("#loginMobile").value.trim();
  const password=document.querySelector("#loginPassword").value;

  if(!mobile||!password){
    toast("মোবাইল ও পাসওয়ার্ড দিন");
    return;
  }

  try{
    if(!API_BASE){
      toast("Backend URL এখনো সেট করা হয়নি");
      return;
    }

    const result=await apiLogin(mobile,password);

    document.querySelector("#panel").innerHTML=
      `<button class="panel-close" onclick="closePanel()">×</button>
      <h2>স্বাগতম, ${result.user.name}</h2>
      <p>আপনার account সফলভাবে login হয়েছে।</p>
      <button class="full" onclick="closePanel()">ঠিক আছে</button>`;

  }catch(e){
    toast(e.message==="API_NOT_CONFIGURED"
      ?"Backend URL সেট করুন"
      :(e.message||"Login failed"));
  }
}

function checkout(){
  const total=cart.reduce(
    (s,x)=>s+products.find(p=>p.id===x.id).price*x.qty,0
  );

  document.querySelector("#panel").innerHTML=
    `<button class="panel-close" onclick="openPanel('cart')">←</button>
    <h2>Checkout</h2>

    <div class="field">
      <label>নাম</label>
      <input id="coName" placeholder="আপনার নাম">
    </div>

    <div class="field">
      <label>মোবাইল</label>
      <input id="coMobile" placeholder="01XXXXXXXXX">
    </div>

    <div class="field">
      <label>ডেলিভারি ঠিকানা</label>
      <textarea id="coAddress" rows="3" placeholder="বাসা/রোড/এলাকা"></textarea>
    </div>

    <div class="field">
      <label>Payment Method</label>
      <select>
        <option>Cash on Delivery</option>
        <option>Online Payment (পরে যুক্ত হবে)</option>
      </select>
    </div>

    <div class="panel-total">
      <span>Product Total</span>
      <span>${money(total)}</span>
    </div>

    <button class="full" onclick="placeDemoOrder()">Order Confirm</button>`;
}

async function placeDemoOrder(){
  const name=document.querySelector("#coName").value.trim();
  const mobile=document.querySelector("#coMobile").value.trim();
  const address=document.querySelector("#coAddress").value.trim();

  if(!name||!mobile||!address){
    toast("নাম, মোবাইল ও ঠিকানা দিন");
    return;
  }

  const items=cart.map(x=>({
    productId:x.id,
    quantity:x.qty
  }));

  const total=cart.reduce(
    (s,x)=>s+products.find(p=>p.id===x.id).price*x.qty,0
  );

  if(API_BASE&&kpToken){
    try{
      const result=await apiCreateOrder({
        customerName:name,
        mobile,
        address,
        paymentMethod:"COD",
        items
      });

      cart=[];
      save();

      document.querySelector("#panel").innerHTML=
        `<button class="panel-close" onclick="closePanel()">×</button>
        <h2>অর্ডার গ্রহণ করা হয়েছে ✓</h2>
        <p>Order ID:</p>
        <h2>${result.orderId||result.id}</h2>
        <p style="color:#718078">আপনার অর্ডার backend-এ সংরক্ষিত হয়েছে।</p>
        <button class="full" onclick="closePanel()">ঠিক আছে</button>`;

      return;

    }catch(e){
      toast("Server order তৈরি হয়নি");
      return;
    }
  }

  const order="KP-"+Math.floor(10000+Math.random()*89999);

  localStorage.setItem(
    "kp_last_order",
    JSON.stringify({
      order,
      name,
      mobile,
      address,
      items:cart,
      date:new Date().toISOString()
    })
  );

  cart=[];
  save();

  document.querySelector("#panel").innerHTML=
    `<button class="panel-close" onclick="closePanel()">×</button>
    <h2>Demo Order ✓</h2>
    <p>Order ID:</p>
    <h2>${order}</h2>
    <p style="color:#718078">Backend connect করলে এটি বাস্তব order হবে।</p>
    <button class="full" onclick="closePanel()">ঠিক আছে</button>`;
}

function changeQty(id,d){
  const x=cart.find(x=>x.id===id);
  x.qty+=d;

  if(x.qty<=0)
    cart=cart.filter(x=>x.id!==id);

  save();
  openPanel("cart");
}

function removeCart(id){
  cart=cart.filter(x=>x.id!==id);
  save();
  openPanel("cart");
}

function closePanel(){
  document.querySelector("#overlay").style.display="none";
}

function overlayClose(e){
  if(e.target.id==="overlay")closePanel();
}

function toast(t){
  const el=document.querySelector("#toast");
  el.textContent=t;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),1800);
}

renderCategories();
renderProducts(products);
renderExtra();
counts();
function logoutCustomer(){
  kpToken = "";
  localStorage.removeItem("kp_token");
  location.reload();
}
