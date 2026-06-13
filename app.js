// ==================== INITIAL DATA & SEEDING ====================
const DEFAULT_PRODUCTS = [
  // Category: Saree
  { id: "PROD-1001", name: "Kanchipuram Silk Saree - Premium", category: "Saree", price: 7500.00, cost: 4500.00, gst: 12, stock: 15 },
  { id: "PROD-1002", name: "Banarasi Georgette Saree", category: "Saree", price: 4200.00, cost: 2520.00, gst: 12, stock: 20 },
  { id: "PROD-1003", name: "Dailywear Cotton Saree - Printed", category: "Saree", price: 850.00, cost: 510.00, gst: 5, stock: 45 },
  { id: "PROD-1004", name: "Chiffon Partywear Saree", category: "Saree", price: 1800.00, cost: 1080.00, gst: 5, stock: 25 },

  // Category: Suits & Dress Materials
  { id: "PROD-2001", name: "Chanderi Cotton Suit Material Set", category: "Suits & Dress Materials", price: 1250.00, cost: 750.00, gst: 5, stock: 30 },
  { id: "PROD-2002", name: "Anarkali Designer Kurti - Silk", category: "Suits & Dress Materials", price: 2400.00, cost: 1440.00, gst: 12, stock: 12 },
  { id: "PROD-2003", name: "Bandhani Dress Material Combo", category: "Suits & Dress Materials", price: 950.00, cost: 570.00, gst: 5, stock: 40 },

  // Category: Mens Wear
  { id: "PROD-3001", name: "Pure Linen Slimfit Shirt", category: "Mens Wear", price: 1650.00, cost: 990.00, gst: 5, stock: 22 },
  { id: "PROD-3002", name: "Premium Cotton Dhoti - Gold Border", category: "Mens Wear", price: 750.00, cost: 450.00, gst: 5, stock: 50 },
  { id: "PROD-3003", name: "Silk Blend Partywear Kurta", category: "Mens Wear", price: 2100.00, cost: 1260.00, gst: 12, stock: 18 },

  // Category: Kids Wear
  { id: "PROD-4001", name: "Kids Pattu Langa Jacket Set", category: "Kids Wear", price: 1450.00, cost: 870.00, gst: 5, stock: 10 },
  { id: "PROD-4002", name: "Boys Cotton Kurta Pyjama Set", category: "Kids Wear", price: 890.00, cost: 534.00, gst: 5, stock: 25 },

  // Category: Fabrics
  { id: "PROD-5001", name: "Pure Raw Silk Fabric", category: "Fabrics (per meter)", price: 650.00, cost: 390.00, gst: 12, stock: 120 },
  { id: "PROD-5002", name: "Organic Block-Print Cotton Fabric", category: "Fabrics (per meter)", price: 180.00, cost: 108.00, gst: 5, stock: 200 },
  { id: "PROD-5003", name: "Premium Designer Velvet Fabric", category: "Fabrics (per meter)", price: 450.00, cost: 270.00, gst: 12, stock: 85 }
];

// ==================== FIREBASE SETUP ====================

 const firebaseConfig = {
  apiKey: "AIzaSyC5oxAA9fPYpAU3-Res4ktJxWZ6qkYkr-Q",
  authDomain: "billingsystemandinventorysyste.firebaseapp.com",
  projectId: "billingsystemandinventorysyste",
  storageBucket: "billingsystemandinventorysyste.firebasestorage.app",
  messagingSenderId: "865267100671",
  appId: "1:865267100671:web:a266c30e8e14683bcf55ca",
  measurementId: "G-LXPKNGK5FD"
};
 
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// ==================== APP STATE MANAGER ====================
let state = {
  currentUser: null,
  products: [],
  cart: [],
  invoices: [],
  editingProductId: null
};

// ==================== SECURITY / AUTH (REMOVED) ====================
// Authentication and password management removed per configuration.
// The app will run in a single-user "admin" mode by default.

// Minimal secureApiCall passthrough (no auth headers)
async function secureApiCall(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  return fetch(url, { ...options, headers });
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", async () => {
  await initStorage();
  checkSession();
  setupEventListeners();
  startClock();
});

async function initStorage() {
  const savedProducts = localStorage.getItem("skt_products");
  const savedInvoices = localStorage.getItem("skt_invoices");
  const sessionUser = sessionStorage.getItem("skt_session_user");
  if (sessionUser) {
    try {
      state.currentUser = JSON.parse(sessionUser);
    } catch (error) {
      state.currentUser = { displayName: sessionUser, role: "admin" };
    }
  }

  await loadFirestoreData(savedProducts, savedInvoices);
}

// ==================== FIREBASE DIAGNOSTICS ====================
// Attempt a lightweight write/read to Firestore to check connectivity and rules.
async function testFirebaseConnectivity() {
  const statusEl = document.getElementById('firebase-status');
  if (!db) {
    console.warn('Firestore not initialized');
    if (statusEl) statusEl.innerText = 'Firebase: unavailable';
    return;
  }

  try {
    const diagRef = db.collection('diagnostics').doc('last_ping');
    await diagRef.set({ ts: Date.now(), source: 'client' }, { merge: true });
    const snap = await diagRef.get();
    if (snap.exists) {
      console.log('Firebase ping success:', snap.data());
      if (statusEl) statusEl.innerText = 'Firebase: connected';
    } else {
      console.warn('Firebase ping wrote but read returned no doc');
      if (statusEl) statusEl.innerText = 'Firebase: partial';
    }
  } catch (err) {
    console.warn('Firebase connectivity test failed:', err);
    if (statusEl) statusEl.innerText = 'Firebase: error';
  }
}

async function loadFirestoreData(savedProducts, savedInvoices) {
  try {
    const productsSnap = await db.collection("products").get();
    if (!productsSnap.empty) {
      state.products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else if (savedProducts) {
      state.products = JSON.parse(savedProducts);
      await saveProductsToFirebase();
    } else {
      state.products = [...DEFAULT_PRODUCTS];
      await saveProductsToFirebase();
    }

    const invoicesSnap = await db.collection("invoices").orderBy("date", "desc").get();
    if (!invoicesSnap.empty) {
      state.invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else if (savedInvoices) {
      state.invoices = JSON.parse(savedInvoices);
      await saveInvoicesToFirebase();
    } else {
      state.invoices = [];
      await saveInvoicesToFirebase();
    }

    await saveLocalState();
  } catch (error) {
    console.warn("Firestore load failed, using localStorage fallback:", error);

    state.products = savedProducts ? JSON.parse(savedProducts) : [...DEFAULT_PRODUCTS];
    state.invoices = savedInvoices ? JSON.parse(savedInvoices) : [];
    await saveLocalState();
  }

  // Ensure all products have `cost` field (migrate older data)
  ensureProductCosts();
}

function ensureProductCosts() {
  let changed = false;
  state.products.forEach(p => {
    if (p.cost === undefined || p.cost === null) {
      // default migration: assume cost ~= 60% of selling price
      p.cost = Math.round((parseFloat(p.price) * 0.6) * 100) / 100;
      changed = true;
    }
  });
  if (changed) {
    // persist migrated values
    saveLocalState();
  }
}

async function saveLocalState() {
  localStorage.setItem("skt_products", JSON.stringify(state.products));
  localStorage.setItem("skt_invoices", JSON.stringify(state.invoices));
  await syncFirestoreState();
}

async function syncFirestoreState() {
  try {
    await saveProductsToFirebase();
    await saveInvoicesToFirebase();
  } catch (error) {
    console.warn("Firestore sync failed:", error);
  }
}

async function saveProductsToFirebase() {
  const batch = db.batch();
  state.products.forEach(product => {
    const docRef = db.collection("products").doc(product.id);
    batch.set(docRef, product);
  });
  await batch.commit();
}

async function saveInvoicesToFirebase() {
  const batch = db.batch();
  state.invoices.forEach(invoice => {
    const docRef = db.collection("invoices").doc(invoice.id);
    batch.set(docRef, invoice);
  });
  await batch.commit();
}

// Session checking & login layout toggle
function checkSession() {
  const loginContainer = document.getElementById("login-container");
  const appContainer = document.getElementById("app-container");
  const financeBtn = document.getElementById("finance-menu-btn");

  // If no app container, nothing to do
  if (!appContainer) return;

  if (state.currentUser) {
    if (loginContainer) loginContainer.classList.add("hide");
    appContainer.classList.remove("hide");
    const loggedNameEl = document.getElementById("logged-user-name");
    if (loggedNameEl) loggedNameEl.innerText = state.currentUser.displayName || state.currentUser;
    if (financeBtn) {
      financeBtn.style.display = state.currentUser.role === "finance" ? "flex" : "none";
    }
    switchTab("dashboard");
    updateDashboardStats();
  } else {
    if (financeBtn) financeBtn.style.display = "none";
    if (loginContainer) {
      loginContainer.classList.remove("hide");
      appContainer.classList.add("hide");
    } else {
      // No login UI present: keep app visible but clear user display
      appContainer.classList.remove("hide");
      const loggedNameEl = document.getElementById("logged-user-name");
      if (loggedNameEl) loggedNameEl.innerText = "";
    }
  }
}

// ==================== CLOCK & HELPER UTILS ====================
function startClock() {
  const clockEl = document.getElementById("live-clock");
  if (!clockEl) return;
  const update = () => {
    const now = new Date();
    clockEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  update();
  setInterval(update, 1000);
}

// Format INR currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
}

// Format Date Time
function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) + ' ' + date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Generate unique invoice number
function generateInvoiceId() {
  const date = new Date();
  const year = date.getFullYear();
  const index = (state.invoices.length + 1).toString().padStart(4, '0');
  return `SKT-${year}-${index}`;
}

// ==================== EVENT LISTENERS SETUP ====================
function setupEventListeners() {
  // Theme Toggle
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const body = document.body;
    const isLight = body.classList.contains("light-mode");
    const icon = document.querySelector(".mode-icon");
    if (isLight) {
      body.classList.remove("light-mode");
      body.classList.add("dark-mode");
      icon.innerText = "☀️";
    } else {
      body.classList.remove("dark-mode");
      body.classList.add("light-mode");
      icon.innerText = "🌙";
    }
  });

  // Default single-user admin mode (authentication removed)
  state.currentUser = state.currentUser || { displayName: "Admin", role: "admin" };
  sessionStorage.setItem("skt_session_user", JSON.stringify(state.currentUser));
  checkSession();

  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Clear session but keep app usable in admin mode
      state.currentUser = null;
      sessionStorage.removeItem("skt_session_user");
      localStorage.removeItem("skt_auth_token");
      // Re-enable admin session immediately
      state.currentUser = { displayName: "Admin", role: "admin" };
      sessionStorage.setItem("skt_session_user", JSON.stringify(state.currentUser));
      checkSession();
    });
  }

  // Sidebar Tabs Navigation
  const menuButtons = document.querySelectorAll(".sidebar-menu .menu-item");
  menuButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      menuButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // --- Billing View Event Handlers ---
  document.getElementById("billing-search-product").addEventListener("input", renderBillingProducts);
  document.getElementById("billing-category-filter").addEventListener("change", renderBillingProducts);
  document.getElementById("discount-val").addEventListener("input", recalculateCart);
  document.getElementById("discount-type").addEventListener("change", recalculateCart);
  document.getElementById("btn-clear-cart").addEventListener("click", () => {
    state.cart = [];
    recalculateCart();
  });
  document.getElementById("btn-checkout").addEventListener("click", checkoutCart);

  // --- Invoice Modal Handlers ---
  document.getElementById("btn-close-invoice").addEventListener("click", () => {
    document.getElementById("invoice-modal-overlay").classList.add("hide");
  });
  document.getElementById("btn-print-invoice").addEventListener("click", () => {
    window.print();
  });
  const btnCancelInvoice = document.getElementById("btn-cancel-invoice");
  if (btnCancelInvoice) {
    btnCancelInvoice.addEventListener("click", () => {
      const overlay = document.getElementById("invoice-modal-overlay");
      const invoiceId = overlay.dataset.currentInvoiceId;
      if (invoiceId) cancelInvoice(invoiceId);
    });
  }

  // --- Sales History View Handlers ---
  document.getElementById("search-history").addEventListener("input", renderHistoryTable);
  document.getElementById("search-history-date").addEventListener("change", renderHistoryTable);
  document.getElementById("btn-reset-filters").addEventListener("click", () => {
    document.getElementById("search-history").value = "";
    document.getElementById("search-history-date").value = "";
    renderHistoryTable();
  });

  // --- Inventory View Handlers ---
  document.getElementById("inventory-search").addEventListener("input", renderInventoryTable);
  document.getElementById("product-form").addEventListener("submit", saveProduct);
  document.getElementById("btn-reset-prod-form").addEventListener("click", resetProductForm);
  // Auto-suggest cost based on price but allow user editing
  const prodPriceEl = document.getElementById('prod-price');
  const prodCostEl = document.getElementById('prod-cost');
  if (prodPriceEl && prodCostEl) {
    prodPriceEl.addEventListener('input', (e) => {
      const price = parseFloat(e.target.value);
      if (isNaN(price)) return;
      if (prodCostEl.dataset.userEdited !== 'true') {
        prodCostEl.value = Math.round(price * 0.6 * 100) / 100;
      }
    });
    prodCostEl.addEventListener('input', () => {
      prodCostEl.dataset.userEdited = 'true';
    });
  }
  // --- Reports View Handlers ---
  const btnGen = document.getElementById("btn-generate-report");
  if (btnGen) btnGen.addEventListener("click", () => renderCustomReport());
}

// ==================== TAB SWITCHER ====================
function switchTab(tabId) {
  // Hide all tab panes
  const panes = document.querySelectorAll(".tab-pane");
  panes.forEach(pane => pane.classList.remove("active"));

  // Show selected pane
  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) activePane.classList.add("active");

  // Sync menu sidebar button active state
  const menuButtons = document.querySelectorAll(".sidebar-menu .menu-item");
  menuButtons.forEach(btn => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update Page Title
  const titleMap = {
    dashboard: { title: "Dashboard", subtitle: "Overview of today's retail performance." },
    billing: { title: "Billing Desk", subtitle: "Create customer transactions and print invoices." },
    history: { title: "Sales History", subtitle: "Search and review generated invoices." },
    inventory: { title: "Inventory Manager", subtitle: "Maintain store products, price lists, and stock levels." },
    reports: { title: "Report Management", subtitle: "View income, profit and loss for selected periods." },
    finance: { title: "Finance Admin", subtitle: "Deep income, profit and loss analytics." }
  };

  const header = titleMap[tabId];
  if (header) {
    document.getElementById("page-title").innerText = header.title;
    document.getElementById("page-subtitle").innerText = header.subtitle;
  }

  // Reload tab specific components
  if (tabId === "dashboard") {
    updateDashboardStats();
  } else if (tabId === "billing") {
    renderBillingProducts();
    recalculateCart();
  } else if (tabId === "history") {
    renderHistoryTable();
  } else if (tabId === "inventory") {
    renderInventoryTable();
    resetProductForm();
  } else if (tabId === "reports") {
    // render reports when opening the tab
    renderAllReports();
  } else if (tabId === "finance") {
    if (state.currentUser && state.currentUser.role === "finance") {
      renderFinanceReport();
    } else {
      switchTab("dashboard");
    }
  }
}


// ==================== DASHBOARD PANEL ====================
function updateDashboardStats() {
  const today = new Date().toDateString();

  // Calculate stats for today
  const todayInvoices = state.invoices.filter(inv => new Date(inv.date).toDateString() === today);

  const revenue = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const billsCount = todayInvoices.length;

  let itemsSold = 0;
  todayInvoices.forEach(inv => {
    inv.items.forEach(item => {
      itemsSold += item.qty;
    });
  });

  const lowStockCount = state.products.filter(p => p.stock < 10).length;

  // Render Stats
  document.getElementById("stat-revenue").innerText = formatCurrency(revenue);
  document.getElementById("stat-bills-count").innerText = billsCount;
  document.getElementById("stat-items-sold").innerText = itemsSold;

  const lowStockEl = document.getElementById("stat-low-stock");
  lowStockEl.innerText = lowStockCount;
  if (lowStockCount > 0) {
    lowStockEl.parentElement.parentElement.classList.add("card-danger");
    lowStockEl.parentElement.parentElement.classList.remove("card-info");
  } else {
    lowStockEl.parentElement.parentElement.classList.remove("card-danger");
    lowStockEl.parentElement.parentElement.classList.add("card-info");
  }

  // Render Recent Sales Table
  const recentTable = document.getElementById("dashboard-recent-sales");
  recentTable.innerHTML = "";

  if (todayInvoices.length === 0) {
    recentTable.innerHTML = `<tr><td colspan="6" class="text-center">No sales registered today.</td></tr>`;
  } else {
    // Show top 5 recent sales
    const sortedToday = [...todayInvoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    sortedToday.forEach(inv => {
      const timeStr = new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${inv.id}</strong></td>
        <td>${inv.customer.name}</td>
        <td>${timeStr}</td>
        <td>${inv.items.length} items</td>
        <td><strong>${formatCurrency(inv.grandTotal)}</strong></td>
        <td><span class="badge badge-success">Completed</span></td>
      `;
      recentTable.appendChild(row);
    });
  }

  // Render Category Sales Breakdown
  renderCategorySummary();
}

function renderCategorySummary() {
  const categorySummaryList = document.getElementById("category-summary-list");
  categorySummaryList.innerHTML = "";

  // Get total units sold per category
  const categorySales = {};
  state.products.forEach(p => {
    categorySales[p.category] = 0;
  });

  state.invoices.forEach(inv => {
    inv.items.forEach(item => {
      const prod = state.products.find(p => p.id === item.id);
      const catName = prod ? prod.category : "Others";
      if (!categorySales[catName]) categorySales[catName] = 0;
      categorySales[catName] += item.qty;
    });
  });

  // Find max sales for percentage styling
  const values = Object.values(categorySales);
  const maxSales = Math.max(...values, 1);

  Object.keys(categorySales).sort((a, b) => categorySales[b] - categorySales[a]).forEach(cat => {
    const qty = categorySales[cat];
    const percentage = Math.round((qty / maxSales) * 100);

    const catDiv = document.createElement("div");
    catDiv.className = "category-item";
    catDiv.innerHTML = `
      <div class="category-info">
        <span>${cat}</span>
        <strong>${qty} pcs sold</strong>
      </div>
      <div class="category-bar-bg">
        <div class="category-bar-fill" style="width: ${percentage}%"></div>
      </div>
    `;
    categorySummaryList.appendChild(catDiv);
  });
}

// ==================== BILLING SYSTEM ====================
function renderBillingProducts() {
  const grid = document.getElementById("billing-products-grid");
  const searchQuery = document.getElementById("billing-search-product").value.toLowerCase();
  const selectedCategory = document.getElementById("billing-category-filter").value;

  grid.innerHTML = "";

  const filtered = state.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.id.toLowerCase().includes(searchQuery);
    const matchesCategory = selectedCategory === "" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="text-center text-muted" style="grid-column: 1/-1; padding: 2rem;">No items match your filters.</p>`;
    return;
  }

  filtered.forEach(p => {
    const isLowStock = p.stock < 10;
    const card = document.createElement("div");
    card.className = `product-item-card ${isLowStock ? 'low-stock' : ''}`;
    card.innerHTML = `
      <div>
        <span class="prod-card-category">${p.category}</span>
        <h4 class="prod-card-name" title="${p.name}">${p.name}</h4>
      </div>
      <div class="prod-card-details">
        <span class="prod-card-price">${formatCurrency(p.price)}</span>
        <span class="prod-card-stock ${isLowStock ? 'stock-badge-low' : 'stock-badge-ok'}">
          Stock: ${p.stock}
        </span>
      </div>
    `;

    // Add Click listener to add product to Cart
    card.addEventListener("click", () => {
      addToCart(p);
    });
    grid.appendChild(card);
  });
}

function addToCart(product) {
  // Check if stock is 0
  if (product.stock <= 0) {
    alert(`Error: '${product.name}' is currently out of stock!`);
    return;
  }

  const existingItem = state.cart.find(item => item.id === product.id);
  if (existingItem) {
    if (existingItem.qty >= product.stock) {
      alert(`Error: Cannot add more. Only ${product.stock} units are in stock!`);
      return;
    }
    existingItem.qty++;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      gst: product.gst,
      qty: 1
    });
  }

  recalculateCart();
}

function updateCartQty(prodId, newQty) {
  const product = state.products.find(p => p.id === prodId);
  const cartItem = state.cart.find(item => item.id === prodId);

  if (!cartItem || !product) return;

  if (newQty > product.stock) {
    alert(`Error: Only ${product.stock} units are available in inventory.`);
    newQty = product.stock;
  }

  if (newQty <= 0) {
    state.cart = state.cart.filter(item => item.id !== prodId);
  } else {
    cartItem.qty = newQty;
  }

  recalculateCart();
}

function removeFromCart(prodId) {
  state.cart = state.cart.filter(item => item.id !== prodId);
  recalculateCart();
}

function recalculateCart() {
  const cartBody = document.getElementById("cart-items-body");
  cartBody.innerHTML = "";

  if (state.cart.length === 0) {
    cartBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">Cart is empty. Select products on the left.</td>
      </tr>
    `;
    document.getElementById("calc-subtotal").innerText = "₹0.00";
    document.getElementById("calc-gst").innerText = "₹0.00";
    document.getElementById("calc-grand-total").innerText = "₹0.00";
    document.getElementById("btn-checkout").disabled = true;
    return;
  }

  document.getElementById("btn-checkout").disabled = false;

  // 1. Calculate Gross Subtotal
  let subtotal = 0;
  state.cart.forEach(item => {
    subtotal += item.price * item.qty;
  });

  // 2. Read and Calculate Discount
  const discType = document.getElementById("discount-type").value;
  let discValInput = parseFloat(document.getElementById("discount-val").value) || 0;
  if (discValInput < 0) {
    discValInput = 0;
    document.getElementById("discount-val").value = 0;
  }

  let totalDiscount = 0;
  if (discType === "percent") {
    if (discValInput > 100) {
      discValInput = 100;
      document.getElementById("discount-val").value = 100;
    }
    totalDiscount = subtotal * (discValInput / 100);
  } else {
    if (discValInput > subtotal) {
      discValInput = subtotal;
      document.getElementById("discount-val").value = subtotal;
    }
    totalDiscount = discValInput;
  }

  // 3. Proportional Discount Ratio
  const discountRatio = subtotal > 0 ? (totalDiscount / subtotal) : 0;

  // 4. Calculate Taxable values and GST per line item
  let totalGstAmount = 0;

  state.cart.forEach(item => {
    const itemGross = item.price * item.qty;
    const itemDiscountShare = itemGross * discountRatio;
    const itemTaxableValue = itemGross - itemDiscountShare;
    const itemGstAmt = itemTaxableValue * (item.gst / 100);
    const itemTotal = itemTaxableValue + itemGstAmt;

    totalGstAmount += itemGstAmt;

    // Render cart row
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-cat">${item.id}</div>
      </td>
      <td>${formatCurrency(item.price)}</td>
      <td>
        <div class="qty-controls">
          <button class="qty-btn" onclick="updateCartQty('${item.id}', ${item.qty - 1})">-</button>
          <input type="text" class="qty-val" readonly value="${item.qty}">
          <button class="qty-btn" onclick="updateCartQty('${item.id}', ${item.qty + 1})">+</button>
        </div>
      </td>
      <td class="text-center">${item.gst}%</td>
      <td><strong>${formatCurrency(itemTotal)}</strong></td>
      <td>
        <button class="btn-delete-cart" onclick="removeFromCart('${item.id}')" title="Remove">🗑️</button>
      </td>
    `;
    cartBody.appendChild(row);
  });

  const grandTotal = (subtotal - totalDiscount) + totalGstAmount;

  // Render totals panel
  document.getElementById("calc-subtotal").innerText = formatCurrency(subtotal);
  document.getElementById("calc-gst").innerText = formatCurrency(totalGstAmount);
  document.getElementById("calc-grand-total").innerText = formatCurrency(grandTotal);
}

// ==================== CHECKOUT & INVOICE GENERATION ====================
async function checkoutCart() {
  if (state.cart.length === 0) return;

  // Verify stock limit one final time
  for (let item of state.cart) {
    const prod = state.products.find(p => p.id === item.id);
    if (!prod || prod.stock < item.qty) {
      alert(`Critical Error: '${item.name}' does not have enough stock! Current stock: ${prod ? prod.stock : 0}`);
      return;
    }
  }

  // Gather customer details
  let custName = document.getElementById("cust-name").value.trim();
  if (!custName) custName = "Walk-in Customer";

  let custPhone = document.getElementById("cust-phone").value.trim();
  if (!custPhone) custPhone = "N/A";

  // Quick validation for phone
  if (custPhone !== "N/A" && !/^\d{10}$/.test(custPhone)) {
    alert("Please enter a valid 10-digit mobile number, or leave it blank.");
    return;
  }

  const payMode = document.getElementById("payment-mode").value;

  // Perform calculations again to construct invoice
  let subtotal = 0;
  state.cart.forEach(item => {
    subtotal += item.price * item.qty;
  });

  const discType = document.getElementById("discount-type").value;
  const discValInput = parseFloat(document.getElementById("discount-val").value) || 0;
  let totalDiscount = (discType === "percent") ? subtotal * (discValInput / 100) : Math.min(discValInput, subtotal);

  const discountRatio = subtotal > 0 ? (totalDiscount / subtotal) : 0;

  // Tax distribution and line details
  const invoiceItems = [];
  let totalGst = 0;
  const taxBreakdown = {}; // grouped by GST%

  state.cart.forEach(item => {
    const itemGross = item.price * item.qty;
    const itemDisc = itemGross * discountRatio;
    const itemTaxable = itemGross - itemDisc;
    const itemGstAmt = itemTaxable * (item.gst / 100);
    const itemTotal = itemTaxable + itemGstAmt;

    totalGst += itemGstAmt;

    invoiceItems.push({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      gstRate: item.gst,
      gstAmount: itemGstAmt,
      taxableValue: itemTaxable,
      totalAmount: itemTotal
    });

    // Group for breakdown
    if (!taxBreakdown[item.gst]) {
      taxBreakdown[item.gst] = { taxable: 0, tax: 0 };
    }
    taxBreakdown[item.gst].taxable += itemTaxable;
    taxBreakdown[item.gst].tax += itemGstAmt;

    // Deduct quantity from state products
    const prod = state.products.find(p => p.id === item.id);
    prod.stock -= item.qty;
  });

  const grandTotal = (subtotal - totalDiscount) + totalGst;
  const invoiceId = generateInvoiceId();
  const invoiceDate = new Date().toISOString();

  const invoiceObj = {
    id: invoiceId,
    date: invoiceDate,
    cashier: state.currentUser || "Admin",
    customer: {
      name: custName,
      phone: custPhone
    },
    paymentMode: payMode,
    subtotal: subtotal,
    discount: totalDiscount,
    gstAmount: totalGst,
    grandTotal: grandTotal,
    items: invoiceItems,
    taxBreakdown: taxBreakdown
  };

  // Save changes
  state.invoices.push(invoiceObj);
  await saveLocalState();

  // Reset inputs
  state.cart = [];
  document.getElementById("cust-name").value = "Walk-in Customer";
  document.getElementById("cust-phone").value = "";
  document.getElementById("discount-val").value = 0;
  document.getElementById("payment-mode").value = "Cash";

  invoiceObj.status = 'active';

  // Reload views
  recalculateCart();
  renderBillingProducts();
  renderInventoryTable();
  renderHistoryTable();
  updateDashboardStats();

  // Show Invoice preview
  showInvoicePreview(invoiceObj);
}

// Render invoice onto invoice popup modal
function showInvoicePreview(invoice) {
  document.getElementById("inv-id").innerText = invoice.id;
  document.getElementById("inv-date").innerText = formatDateTime(invoice.date);
  document.getElementById("inv-cashier").innerText = invoice.cashier;
  document.getElementById("inv-cust-name").innerText = invoice.customer.name;
  document.getElementById("inv-cust-phone").innerText = invoice.customer.phone;
  document.getElementById("inv-pay-mode").innerText = invoice.paymentMode;
  updateInvoiceModalStatus(invoice);

  // Items body
  const body = document.getElementById("inv-items-body");
  body.innerHTML = "";

  invoice.items.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td class="text-right">${formatCurrency(item.price)}</td>
      <td class="text-center">${item.qty}</td>
      <td class="text-center">${item.gstRate}%</td>
      <td class="text-right">${formatCurrency(item.totalAmount)}</td>
      <td class="text-right no-print">
        ${invoice.status !== 'cancelled' ? `<button class="btn btn-outline btn-sm" onclick="removeInvoiceItem('${invoice.id}','${item.id}')" title="Remove Item">🗑️ Remove</button>` : ''}
      </td>
    `;
    body.appendChild(row);
  });

  // Totals
  document.getElementById("inv-subtotal").innerText = formatCurrency(invoice.subtotal);
  document.getElementById("inv-discount").innerText = formatCurrency(invoice.discount);
  document.getElementById("inv-gst").innerText = formatCurrency(invoice.gstAmount);
  document.getElementById("inv-grand-total").innerText = formatCurrency(invoice.grandTotal);

  // GST Breakdown table body
  const gstBody = document.getElementById("inv-gst-breakdown-body");
  gstBody.innerHTML = "";

  Object.keys(invoice.taxBreakdown).sort((a, b) => a - b).forEach(rate => {
    const data = invoice.taxBreakdown[rate];
    const cgst = data.tax / 2;
    const sgst = data.tax / 2;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>GST ${rate}%</td>
      <td class="text-right">${formatCurrency(data.taxable)}</td>
      <td class="text-right">${formatCurrency(cgst)}</td>
      <td class="text-right">${formatCurrency(sgst)}</td>
      <td class="text-right">${formatCurrency(data.tax)}</td>
    `;
    gstBody.appendChild(row);
  });

  // Open modal
  document.getElementById("invoice-modal-overlay").dataset.currentInvoiceId = invoice.id;
  document.getElementById("invoice-modal-overlay").classList.remove("hide");
}

function removeInvoiceItem(invoiceId, itemId) {
  const invoice = state.invoices.find(inv => inv.id === invoiceId);
  if (!invoice || invoice.status === 'cancelled') return;

  const itemIndex = invoice.items.findIndex(item => item.id === itemId);
  if (itemIndex === -1) return;

  const removedItem = invoice.items[itemIndex];
  invoice.items.splice(itemIndex, 1);

  // restore stock for the removed item
  const product = state.products.find(p => p.id === removedItem.id);
  if (product) {
    product.stock += removedItem.qty;
  }

  // recalculate invoice totals
  invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  invoice.discount = invoice.discount || 0;
  const discountRatio = invoice.subtotal > 0 ? invoice.discount / (invoice.subtotal + removedItem.price * removedItem.qty) : 0;
  let totalGst = 0;
  const taxBreakdown = {};

  invoice.items.forEach(item => {
    const itemGross = item.price * item.qty;
    const itemDiscountShare = itemGross * discountRatio;
    const itemTaxable = itemGross - itemDiscountShare;
    const itemGstAmt = itemTaxable * (item.gstRate / 100);
    totalGst += itemGstAmt;

    if (!taxBreakdown[item.gstRate]) {
      taxBreakdown[item.gstRate] = { taxable: 0, tax: 0 };
    }
    taxBreakdown[item.gstRate].taxable += itemTaxable;
    taxBreakdown[item.gstRate].tax += itemGstAmt;
  });

  invoice.gstAmount = totalGst;
  invoice.grandTotal = invoice.subtotal - invoice.discount + totalGst;
  invoice.taxBreakdown = taxBreakdown;

  saveLocalState();
  showInvoicePreview(invoice);
  renderHistoryTable();
}

function updateInvoiceModalStatus(invoice) {
  const statusEl = document.getElementById('inv-status');
  if (!statusEl) return;
  statusEl.innerText = invoice.status === 'cancelled' ? 'Cancelled' : 'Active';
  statusEl.className = invoice.status === 'cancelled' ? 'text-danger' : 'text-success';
}

async function cancelInvoice(invoiceId) {
  const invoice = state.invoices.find(inv => inv.id === invoiceId);
  if (!invoice) return;
  if (invoice.status === 'cancelled') {
    alert('This invoice is already cancelled.');
    return;
  }

  if (!confirm(`Are you sure you want to cancel invoice ${invoiceId}? This will restore stock quantities.`)) {
    return;
  }

  // restore inventory quantities
  invoice.items.forEach(item => {
    const product = state.products.find(p => p.id === item.id);
    if (product) {
      product.stock += item.qty;
    }
  });

  invoice.status = 'cancelled';
  invoice.cancelledAt = new Date().toISOString();
  invoice.cancelledBy = state.currentUser ? state.currentUser.displayName || state.currentUser : 'Admin';

  await saveLocalState();
  renderHistoryTable();

  if (document.getElementById('invoice-modal-overlay').classList.contains('hide') === false) {
    showInvoicePreview(invoice);
    updateInvoiceModalStatus(invoice);
  }
}

// ==================== SALES HISTORY ====================
function renderHistoryTable() {
  const search = document.getElementById("search-history").value.toLowerCase();
  const dateVal = document.getElementById("search-history-date").value;
  const tbody = document.getElementById("history-table-body");

  tbody.innerHTML = "";

  const filtered = state.invoices.filter(inv => {
    if (!inv.status) inv.status = 'active';
    const matchText = inv.id.toLowerCase().includes(search) ||
      inv.customer.name.toLowerCase().includes(search) ||
      inv.customer.phone.includes(search);

    let matchDate = true;
    if (dateVal) {
      matchDate = new Date(inv.date).toDateString() === new Date(dateVal).toDateString();
    }

    return matchText && matchDate;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">No invoices found matching current filters.</td></tr>`;
    return;
  }

  // Sort descending (latest invoice first)
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(inv => {
    const statusLabel = inv.status === 'cancelled' ? 'Cancelled' : 'Active';
    const statusClass = inv.status === 'cancelled' ? 'badge badge-danger' : 'badge badge-success';

    // Main invoice row
    const row = document.createElement("tr");
    row.className = "invoice-row-clickable";
    row.dataset.invoiceId = inv.id;
    row.innerHTML = `
      <td><span class="invoice-expand-toggle">▶</span><strong>${inv.id}</strong></td>
      <td>${formatDateTime(inv.date)}</td>
      <td>${inv.customer.name}</td>
      <td>${inv.customer.phone}</td>
      <td>${inv.paymentMode}</td>
      <td>${formatCurrency(inv.subtotal)}</td>
      <td>${formatCurrency(inv.discount)}</td>
      <td>${formatCurrency(inv.gstAmount)}</td>
      <td><strong>${formatCurrency(inv.grandTotal)}</strong></td>
      <td><span class="${statusClass}">${statusLabel}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="reprintInvoice('${inv.id}')" title="View/Print Invoice">🖨️ Print</button>
        <button class="btn btn-secondary btn-sm" onclick="modifyInvoice('${inv.id}')" title="Modify Invoice" ${inv.status === 'cancelled' ? 'disabled' : ''}>✏️ Modify</button>
        <button class="btn btn-outline-danger btn-sm" onclick="cancelInvoice('${inv.id}')" title="Cancel Invoice" ${inv.status === 'cancelled' ? 'disabled' : ''}>🚫 Cancel</button>
      </td>
    `;
    tbody.appendChild(row);

    // Detail row (expandable)
    const detailRow = document.createElement("tr");
    detailRow.className = "invoice-detail-row";
    detailRow.dataset.invoiceDetailId = inv.id;
    
    // Build items table HTML
    let itemsHtml = `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            <th>Rate (₹)</th>
            <th>Qty</th>
            <th>GST %</th>
            <th>Taxable (₹)</th>
            <th>GST Amt (₹)</th>
            <th>Total (₹)</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    inv.items.forEach((item, idx) => {
      itemsHtml += `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.name}</td>
          <td>${formatCurrency(item.price)}</td>
          <td>${item.qty}</td>
          <td>${item.gstRate}%</td>
          <td>${formatCurrency(item.taxableValue)}</td>
          <td>${formatCurrency(item.gstAmount)}</td>
          <td>${formatCurrency(item.totalAmount)}</td>
        </tr>
      `;
    });
    
    itemsHtml += `
        </tbody>
      </table>
    `;
    
    detailRow.innerHTML = `
      <td colspan="10">
        <div class="invoice-detail-cell">
          <h5 style="margin-top:0">Line Items</h5>
          <div class="invoice-items-scroll">
            ${itemsHtml}
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(detailRow);

    // Wire click to expand/collapse
    row.addEventListener("click", (e) => {
      if (e.target.closest("button")) return; // Don't expand if clicking button
      toggleInvoiceDetail(inv.id);
    });
  });
}

function reprintInvoice(invoiceId) {
  const inv = state.invoices.find(i => i.id === invoiceId);
  if (inv) {
    showInvoicePreview(inv);
  }
}

function modifyInvoice(invoiceId) {
  const inv = state.invoices.find(i => i.id === invoiceId);
  if (!inv) return;
  if (inv.status === 'cancelled') {
    alert('Cancelled invoices cannot be modified.');
    return;
  }
  showInvoicePreview(inv);
}

// ==================== REPORTS: Calculation & Rendering ====================
function parseDateInput(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  // normalize to start of day
  d.setHours(0,0,0,0);
  return d;
}

function getInvoicesInRange(startDate, endDate) {
  // inclusive range: invoices with date between start and end
  return state.invoices.filter(inv => {
    const d = new Date(inv.date);
    // normalize
    d.setHours(0,0,0,0);
    return d >= startDate && d <= endDate;
  });
}

function calculateInvoiceProfit(inv) {
  // profit = sum(item.taxableValue - cost*qty)
  let profit = 0;
  inv.items.forEach(item => {
    const prod = state.products.find(p => p.id === item.id);
    const costPerUnit = prod && prod.cost ? parseFloat(prod.cost) : (item.price * 0.6);
    profit += (item.taxableValue - (costPerUnit * item.qty));
  });
  return profit;
}

function formatCurrencySafe(v) {
  return formatCurrency(isNaN(v) ? 0 : v);
}

function calculateReportTotals(invoices) {
  let income = 0;
  let profit = 0;
  let loss = 0;
  invoices.forEach(inv => {
    income += (inv.grandTotal || 0);
    const p = calculateInvoiceProfit(inv);
    if (p >= 0) profit += p; else loss += Math.abs(p);
  });
  return { income, profit, loss };
}

function renderReportCards(prefix, totals) {
  document.getElementById(`${prefix}-income`).innerText = formatCurrencySafe(totals.income);
  document.getElementById(`${prefix}-profit`).innerText = formatCurrencySafe(totals.profit);
  document.getElementById(`${prefix}-loss`).innerText = formatCurrencySafe(totals.loss);
}

function renderReportTable(invoices) {
  const tbody = document.getElementById('report-table-body');
  tbody.innerHTML = '';

  if (invoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No invoices found for selected range.</td></tr>`;
    return;
  }

  invoices.sort((a,b)=> new Date(b.date) - new Date(a.date)).forEach(inv => {
    const p = calculateInvoiceProfit(inv);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${inv.id}</strong></td>
      <td>${formatDateTime(inv.date)}</td>
      <td>${inv.customer.name}</td>
      <td>${formatCurrencySafe(inv.grandTotal)}</td>
      <td style="color:${p>=0?'var(--success)':'var(--danger)'}">${formatCurrencySafe(p)}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderWeeklyReport() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 6);
  const invoices = getInvoicesInRange(startDate, today);
  const totals = calculateReportTotals(invoices);
  renderReportCards('weekly', totals);
}

function renderMonthlyReport() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const invoices = getInvoicesInRange(startDate, endDate);
  const totals = calculateReportTotals(invoices);
  renderReportCards('monthly', totals);
}

function renderCustomReport() {
  const startEl = document.getElementById('report-start');
  const endEl = document.getElementById('report-end');
  const startDate = parseDateInput(startEl.value);
  const endDate = parseDateInput(endEl.value);
  if (!startDate || !endDate) {
    alert('Please select valid start and end dates for Custom Range.');
    return;
  }
  if (endDate < startDate) {
    alert('End date must be the same or after the start date.');
    return;
  }
  const invoices = getInvoicesInRange(startDate, endDate);
  const totals = calculateReportTotals(invoices);
  renderReportCards('custom', totals);
  renderReportTable(invoices);
}

function renderAllReports() {
  renderWeeklyReport();
  renderMonthlyReport();
  const startEl = document.getElementById('report-start');
  const endEl = document.getElementById('report-end');
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startEl.value = defaultStart.toISOString().split('T')[0];
  endEl.value = defaultEnd.toISOString().split('T')[0];
  renderCustomReport();
}

function renderFinanceReport() {
  const invoices = state.invoices;
  const totals = calculateReportTotals(invoices);
  document.getElementById('finance-income').innerText = formatCurrencySafe(totals.income);
  document.getElementById('finance-profit').innerText = formatCurrencySafe(totals.profit);
  document.getElementById('finance-loss').innerText = formatCurrencySafe(totals.loss);
  const margin = totals.income > 0 ? (totals.profit / totals.income) * 100 : 0;
  document.getElementById('finance-margin').innerText = `${margin.toFixed(2)}%`;
  renderFinanceProductTable();
  renderFinanceCategoryTable();
}

function renderFinanceProductTable() {
  const tbody = document.getElementById('finance-product-table-body');
  const summary = {};

  state.invoices.forEach(inv => {
    inv.items.forEach(item => {
      const prod = state.products.find(p => p.id === item.id);
      const costPerUnit = prod && prod.cost ? parseFloat(prod.cost) : (item.price * 0.6);
      const revenue = item.price * item.qty;
      const cost = costPerUnit * item.qty;
      const profit = item.taxableValue - cost;

      if (!summary[item.id]) {
        summary[item.id] = {
          name: item.name,
          qty: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        };
      }

      summary[item.id].qty += item.qty;
      summary[item.id].revenue += revenue;
      summary[item.id].cost += cost;
      summary[item.id].profit += profit;
    });
  });

  const rows = Object.values(summary).sort((a, b) => b.profit - a.profit);
  tbody.innerHTML = '';

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No sales data available.</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.name}</td>
      <td>${row.qty}</td>
      <td>${formatCurrency(row.revenue)}</td>
      <td>${formatCurrency(row.cost)}</td>
      <td>${formatCurrency(row.profit)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderFinanceCategoryTable() {
  const tbody = document.getElementById('finance-category-table-body');
  const summary = {};

  state.invoices.forEach(inv => {
    inv.items.forEach(item => {
      const prod = state.products.find(p => p.id === item.id);
      const category = prod ? prod.category : 'Unknown';
      const costPerUnit = prod && prod.cost ? parseFloat(prod.cost) : (item.price * 0.6);
      const revenue = item.price * item.qty;
      const cost = costPerUnit * item.qty;
      const profit = item.taxableValue - cost;

      if (!summary[category]) {
        summary[category] = { revenue: 0, cost: 0, profit: 0 };
      }
      summary[category].revenue += revenue;
      summary[category].cost += cost;
      summary[category].profit += profit;
    });
  });

  const rows = Object.entries(summary).sort((a, b) => b[1].profit - a[1].profit);
  tbody.innerHTML = '';

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No category data available.</td></tr>`;
    return;
  }

  rows.forEach(([category, data]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${category}</td>
      <td>${formatCurrency(data.revenue)}</td>
      <td>${formatCurrency(data.cost)}</td>
      <td>${formatCurrency(data.profit)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ==================== INVENTORY STOCK MANAGEMENT ====================
function renderInventoryTable() {
  const query = document.getElementById("inventory-search").value.toLowerCase();
  const tbody = document.getElementById("inventory-table-body");

  tbody.innerHTML = "";

  const filtered = state.products.filter(p => {
    return p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No products found in inventory.</td></tr>`;
    return;
  }

  filtered.forEach(p => {
    const row = document.createElement("tr");
    const isLow = p.stock < 10;
    const statusBadge = isLow
      ? `<span class="badge badge-danger">Low Stock</span>`
      : `<span class="badge badge-success">In Stock</span>`;

    row.innerHTML = `
      <td><code>${p.id}</code></td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td>${formatCurrency(p.cost || 0)}</td>
      <td>${formatCurrency(p.price)}</td>
      <td>${p.gst}%</td>
      <td><strong>${p.stock}</strong></td>
      <td>${statusBadge}</td>
      <td>
        <div class="flex-gap">
          <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')">✏️ Edit</button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteProduct('${p.id}')">🗑️ Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function saveProduct(e) {
  e.preventDefault();

  const idInput = document.getElementById("prod-id").value;
  const name = document.getElementById("prod-name").value.trim();
  const category = document.getElementById("prod-category").value;
  const price = parseFloat(document.getElementById("prod-price").value);
  const gst = parseInt(document.getElementById("prod-gst").value);
  const stock = parseInt(document.getElementById("prod-stock").value);
  const costInput = document.getElementById("prod-cost").value;
  const cost = costInput ? parseFloat(costInput) : null;

  let savedProduct;
  if (state.editingProductId) {
    // Edit existing product
    const prod = state.products.find(p => p.id === state.editingProductId);
    if (prod) {
      prod.name = name;
      prod.category = category;
      prod.price = price;
      prod.cost = cost !== null ? cost : prod.cost;
      prod.gst = gst;
      prod.stock = stock;
      savedProduct = prod;
    }
    state.editingProductId = null;
  } else {
    // Generate new unique ID
    const nextNum = state.products.length > 0
      ? Math.max(...state.products.map(p => parseInt(p.id.split('-')[1]))) + 1
      : 1001;
    const newId = `PROD-${nextNum}`;

    savedProduct = {
      id: newId,
      name: name,
      category: category,
      price: price,
      cost: cost,
      gst: gst,
      stock: stock
    };
    state.products.push(savedProduct);
  }

  await saveLocalState();

  // Reset UI components
  resetProductForm();
  renderInventoryTable();
}

function editProduct(prodId) {
  const prod = state.products.find(p => p.id === prodId);
  if (!prod) return;

  state.editingProductId = prodId;
  document.getElementById("inventory-form-title").innerText = "Modify Product";
  document.getElementById("prod-id").value = prod.id;
  document.getElementById("prod-name").value = prod.name;
  document.getElementById("prod-category").value = prod.category;
  document.getElementById("prod-price").value = prod.price;
  document.getElementById("prod-gst").value = prod.gst;
  document.getElementById("prod-stock").value = prod.stock;
  const costEl = document.getElementById("prod-cost");
  if (costEl) {
    costEl.value = prod.cost !== undefined ? prod.cost : '';
    costEl.dataset.userEdited = prod.cost !== undefined ? 'true' : '';
  }

  document.getElementById("btn-save-product").innerText = "Update Product";
}

async function deleteProduct(prodId) {
  const prod = state.products.find(p => p.id === prodId);
  if (!prod) return;

  if (confirm(`Are you sure you want to delete '${prod.name}' from inventory?`)) {
    state.products = state.products.filter(p => p.id !== prodId);
    await saveLocalState();
    renderInventoryTable();
  }
}

function resetProductForm() {
  state.editingProductId = null;
  document.getElementById("inventory-form-title").innerText = "Add New Product";
  document.getElementById("product-form").reset();
  document.getElementById("prod-id").value = "";
  document.getElementById("btn-save-product").innerText = "Save Product";
  const costEl = document.getElementById("prod-cost");
  if (costEl) {
    costEl.value = '';
    costEl.dataset.userEdited = '';
  }
}

// Global scope bindings for inline HTML action references
window.switchTab = switchTab;
window.updateCartQty = updateCartQty;
window.removeFromCart = removeFromCart;
window.reprintInvoice = reprintInvoice;
window.modifyInvoice = modifyInvoice;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.cancelInvoice = cancelInvoice;
window.removeInvoiceItem = removeInvoiceItem;

// Toggle invoice detail row expand/collapse
function toggleInvoiceDetail(invoiceId) {
  const detailRow = document.querySelector(`tr[data-invoice-detail-id="${invoiceId}"]`);
  const mainRow = document.querySelector(`tr[data-invoice-id="${invoiceId}"]`);
  if (!detailRow || !mainRow) return;

  detailRow.classList.toggle("expanded");
  const toggle = mainRow.querySelector(".invoice-expand-toggle");
  if (toggle) toggle.classList.toggle("rotated");
}
window.toggleInvoiceDetail = toggleInvoiceDetail;
