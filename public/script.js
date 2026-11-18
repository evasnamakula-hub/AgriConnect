
/* ==========================================
   AGRICONNECT MARKETPLACE
   Frontend JavaScript
   MongoDB + Express + Chart.js
========================================== */

/* ==========================================
   1. GLOBAL VARIABLES
========================================== */

let allProduce = [];
let allFarmers = [];
let allBuyers = [];
let allOrders = [];
let allPrices = [];

let editingProduceId = null;
let editingFarmerId = null;
let editingBuyerId = null;
let editingOrderId = null;
let editingPriceId = null;

let monthlyOrdersChart = null;
let marketPricesChart = null;

const $ = id => document.getElementById(id);

const API = {
    farmers: "/api/farmers",
    buyers: "/api/buyers",
    produce: "/api/produce",
    orders: "/api/orders",
    prices: "/api/market-prices"
};


/* ==========================================
   2. HELPER FUNCTIONS
========================================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function money(value) {
    return "UGX " + Number(value || 0).toLocaleString("en-UG");
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-UG", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

async function apiRequest(url, method = "GET", data = null) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    let result = {};

    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        throw new Error(result.message || result.error || "Request failed.");
    }

    return result;
}

function getId(item) {
    return item._id || item.id;
}

function showMessage(message) {
    alert(message);
}

function getProduceName(item) {
    return item.name || item.produceName || item.crop || "Unnamed Produce";
}

function getProduceQuantity(item) {
    return item.quantity ?? item.availableQuantity ?? 0;
}

function getProducePrice(item) {
    return item.price ?? item.pricePerUnit ?? 0;
}

function getProduceImage(name) {
    const images = {
        tomatoes: "photo-1546094096-0df4bcaaa337",
        maize: "photo-1551754655-cd27e38d2076",
        corn: "photo-1551754655-cd27e38d2076",
        onions: "photo-1518977676601-b53f82aba655",
        potatoes: "photo-1518977676601-b53f82aba655",
        bananas: "photo-1571771894821-ce9b6c11b08e",
        cabbage: "photo-1594282486552-05b4d80fbb9f",
        carrots: "photo-1445282768818-728615cc910a",
        pineapples: "photo-1550258987-190a2d41a8ba",
        groundnuts: "photo-1567892737950-30c4db37cd89"
    };

    const key = String(name || "").toLowerCase();

    const imageId = Object.keys(images).find(item => key.includes(item));

    if (imageId) {
        return `https://images.unsplash.com/${images[imageId]}?auto=format&fit=crop&w=150&q=80`;
    }

    return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=150&q=80";
}

function getStatusClass(status) {
    const value = String(status || "").toLowerCase();

    if (value === "confirmed") return "confirmed";
    if (value === "delivered") return "delivered";
    if (value === "cancelled") return "cancelled";

    return "";
}

function setLoading(elementId, message) {
    const element = $(elementId);

    if (element) {
        element.innerHTML = `<tr><td colspan="10">${escapeHTML(message)}</td></tr>`;
    }
}


/* ==========================================
   3. NAVIGATION
========================================== */

function showPage(page) {
    document.querySelectorAll(".page-section").forEach(section => {
        section.hidden = section.id !== `${page}Page`;
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.page === page);
    });

    if (page === "dashboard") {
        initializeDashboard();
    }

    if (page === "farmers") loadFarmers();
    if (page === "buyers") loadBuyers();
    if (page === "produce") loadProduce();
    if (page === "orders") loadOrders();
    if (page === "prices") loadPrices();
}

document.querySelectorAll("[data-page]").forEach(element => {
    element.addEventListener("click", event => {
        event.preventDefault();
        showPage(element.dataset.page);
    });
});


/* ==========================================
   4. DASHBOARD STATISTICS
========================================== */

async function loadDashboardStats() {
    try {
        const stats = await apiRequest("/api/dashboard/stats");

        $("farmersCount").textContent =
            stats.totalFarmers ?? stats.farmers ?? stats.farmerCount ?? allFarmers.length;

        $("buyersCount").textContent =
            stats.totalBuyers ?? stats.buyers ?? stats.buyerCount ?? allBuyers.length;

        $("produceCount").textContent =
            stats.totalProduce ?? stats.produce ?? stats.produceCount ?? allProduce.length;

        $("ordersCount").textContent =
            stats.totalOrders ?? stats.orders ?? stats.orderCount ?? allOrders.length;

    } catch (error) {
        console.error("Dashboard statistics error:", error);

        $("farmersCount").textContent = allFarmers.length;
        $("buyersCount").textContent = allBuyers.length;
        $("produceCount").textContent = allProduce.length;
        $("ordersCount").textContent = allOrders.length;
    }
}


/* ==========================================
   5. DASHBOARD PRODUCE
========================================== */

async function loadDashboardProduce() {
    try {
        allProduce = await apiRequest(API.produce);

        const container = $("produceList");

        if (!allProduce.length) {
            container.innerHTML = '<p class="empty-message">No produce records available yet.</p>';
            return;
        }

        container.innerHTML = allProduce.slice(0, 4).map(item => {
            const name = getProduceName(item);

            return `
                <div class="produce-item">
                    <img src="${getProduceImage(name)}" alt="${escapeHTML(name)}">
                    <div class="produce-info">
                        <strong>${escapeHTML(name)}</strong>
                        <small>${escapeHTML(item.location || "Location not specified")}</small>
                    </div>
                    <span class="produce-price">${money(getProducePrice(item))}</span>
                </div>
            `;
        }).join("");

    } catch (error) {
        console.error(error);
        $("produceList").innerHTML =
            '<p class="empty-message">Unable to load produce records.</p>';
    }
}


/* ==========================================
   6. DASHBOARD MARKET PRICES
========================================== */

async function loadDashboardPrices() {
    try {
        allPrices = await apiRequest(API.prices);

        const container = $("marketPrices");

        if (!allPrices.length) {
            container.innerHTML = '<p class="empty-message">No market prices recorded yet.</p>';
            return;
        }

        container.innerHTML = allPrices.slice(0, 5).map(item => `
            <div class="price-item">
                <div class="price-info">
                    <strong>${escapeHTML(item.productName || "Unknown product")}</strong>
                    <small>${escapeHTML(item.market || "")} · ${escapeHTML(item.location || "")}</small>
                </div>
                <span class="price-value">${money(item.pricePerUnit)}</span>
            </div>
        `).join("");

    } catch (error) {
        console.error(error);
        $("marketPrices").innerHTML =
            '<p class="empty-message">Unable to load market prices.</p>';
    }
}


/* ==========================================
   7. DASHBOARD RECENT ORDERS
========================================== */

async function loadDashboardOrders() {
    try {
        allOrders = await apiRequest(API.orders);

        const container = $("ordersList");

        if (!allOrders.length) {
            container.innerHTML = '<p class="empty-message">No orders recorded yet.</p>';
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Buyer</th>
                            <th>Product</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allOrders.slice(0, 5).map(order => `
                            <tr>
                                <td>${escapeHTML(order.orderId || "—")}</td>
                                <td>${escapeHTML(order.buyerName || "—")}</td>
                                <td>${escapeHTML(order.productName || "—")}</td>
                                <td>${money(order.totalAmount)}</td>
                                <td>
                                    <span class="status ${getStatusClass(order.orderStatus)}">
                                        ${escapeHTML(order.orderStatus || "Pending")}
                                    </span>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {
        console.error(error);
        $("ordersList").innerHTML =
            '<p class="empty-message">Unable to load orders.</p>';
    }
}


/* ==========================================
   8. MONTHLY ORDERS CHART
========================================== */

function renderMonthlyOrdersChart() {
    const canvas = $("monthlyOrdersChart");

    if (!canvas || typeof Chart === "undefined") return;

    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

        months.push({
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
            label: date.toLocaleString("en", { month: "short" }),
            count: 0
        });
    }

    allOrders.forEach(order => {
        const date = new Date(order.orderDate || order.createdAt);

        if (Number.isNaN(date.getTime())) return;

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        const month = months.find(item => item.key === key);

        if (month) month.count++;
    });

    if (monthlyOrdersChart) {
        monthlyOrdersChart.destroy();
    }

    monthlyOrdersChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: months.map(item => item.label),
            datasets: [{
                label: "Orders",
                data: months.map(item => item.count),
                borderColor: "#39865e",
                backgroundColor: "rgba(57, 134, 94, 0.12)",
                fill: true,
                tension: 0.35,
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: "#39865e"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: "#194632",
                    padding: 10
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    grid: {
                        color: "#edf1ed"
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}


/* ==========================================
   9. MARKET PRICES CHART
========================================== */

function renderMarketPricesChart() {
    const canvas = $("marketPricesChart");

    if (!canvas || typeof Chart === "undefined") return;

    // Calculate average price for each product.
    const productPrices = {};

    allPrices.forEach(item => {
        const name = item.productName || "Unknown";

        const price = Number(item.pricePerUnit);

        if (!Number.isFinite(price)) return;

        if (!productPrices[name]) {
            productPrices[name] = {
                total: 0,
                count: 0
            };
        }

        productPrices[name].total += price;
        productPrices[name].count++;
    });

    const products = Object.entries(productPrices)
        .map(([name, values]) => ({
            name,
            average: Math.round(values.total / values.count)
        }))
        .slice(0, 6);

    if (marketPricesChart) {
        marketPricesChart.destroy();
    }

    marketPricesChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: products.map(item => item.name),
            datasets: [{
                label: "Average Price (UGX)",
                data: products.map(item => item.average),
                backgroundColor: [
                    "#39865e",
                    "#78a98a",
                    "#a5c9ae",
                    "#4d91c9",
                    "#e9b66b",
                    "#8d72c6"
                ],
                borderRadius: 7,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: context => money(context.raw)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: "#edf1ed"
                    },
                    ticks: {
                        callback: value => Number(value).toLocaleString("en-UG")
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}


/* ==========================================
   10. INITIALIZE DASHBOARD
========================================== */

async function initializeDashboard() {
    await Promise.all([
        loadDashboardProduce(),
        loadDashboardPrices(),
        loadDashboardOrders()
    ]);

    await loadDashboardStats();

    renderMonthlyOrdersChart();
    renderMarketPricesChart();
}


/* ==========================================
   11. FARMERS CRUD
========================================== */

async function loadFarmers() {
    try {
        allFarmers = await apiRequest(API.farmers);
        renderFarmers(allFarmers);
    } catch (error) {
        console.error(error);
        setLoading("farmersTableBody", "Unable to load farmers.");
    }
}

function renderFarmers(farmers) {
    const body = $("farmersTableBody");

    if (!farmers.length) {
        body.innerHTML = '<tr><td colspan="7">No farmers found.</td></tr>';
        return;
    }

    body.innerHTML = farmers.map(farmer => `
        <tr>
            <td>${escapeHTML(farmer.farmerId || "—")}</td>
            <td>${escapeHTML(farmer.fullName || "—")}</td>
            <td>${escapeHTML(farmer.phone || "—")}</td>
            <td>${escapeHTML(farmer.location || "—")}</td>
            <td>${escapeHTML(farmer.district || "—")}</td>
            <td>${escapeHTML(farmer.farmName || "—")}</td>
            <td>
                <button class="action-button edit-button" data-action="edit-farmer" data-id="${escapeHTML(getId(farmer))}">Edit</button>
                <button class="action-button delete-button" data-action="delete-farmer" data-id="${escapeHTML(getId(farmer))}">Delete</button>
            </td>
        </tr>
    `).join("");
}

$("showFarmerForm").addEventListener("click", () => {
    editingFarmerId = null;
    $("farmerForm").reset();
    $("farmerFormTitle").textContent = "Add Farmer";
    $("saveFarmerButton").textContent = "Save Farmer";
    $("farmerFormPanel").hidden = false;
});

$("cancelFarmerForm").addEventListener("click", () => {
    $("farmerFormPanel").hidden = true;
    $("farmerForm").reset();
    editingFarmerId = null;
});

$("farmerForm").addEventListener("submit", async event => {
    event.preventDefault();

    const data = {
        fullName: $("farmerName").value.trim(),
        phone: $("farmerPhone").value.trim(),
        location: $("farmerLocation").value.trim(),
        district: $("farmerDistrict").value.trim(),
        farmName: $("farmerFarmName").value.trim()
    };

    try {
        if (editingFarmerId) {
            await apiRequest(`${API.farmers}/${editingFarmerId}`, "PUT", data);
            showMessage("Farmer updated successfully.");
        } else {
            await apiRequest(API.farmers, "POST", data);
            showMessage("Farmer added successfully.");
        }

        $("farmerForm").reset();
        $("farmerFormPanel").hidden = true;
        editingFarmerId = null;

        await loadFarmers();
        await loadDashboardStats();

    } catch (error) {
        showMessage(error.message);
    }
});


/* ==========================================
   12. BUYERS CRUD
========================================== */

async function loadBuyers() {
    try {
        allBuyers = await apiRequest(API.buyers);
        renderBuyers(allBuyers);
    } catch (error) {
        console.error(error);
        setLoading("buyersTableBody", "Unable to load buyers.");
    }
}

function renderBuyers(buyers) {
    const body = $("buyersTableBody");

    if (!buyers.length) {
        body.innerHTML = '<tr><td colspan="6">No buyers found.</td></tr>';
        return;
    }

    body.innerHTML = buyers.map(buyer => `
        <tr>
            <td>${escapeHTML(buyer.buyerId || "—")}</td>
            <td>${escapeHTML(buyer.fullName || "—")}</td>
            <td>${escapeHTML(buyer.phone || "—")}</td>
            <td>${escapeHTML(buyer.location || "—")}</td>
            <td>${escapeHTML(buyer.buyerType || "—")}</td>
            <td>
                <button class="action-button edit-button" data-action="edit-buyer" data-id="${escapeHTML(getId(buyer))}">Edit</button>
                <button class="action-button delete-button" data-action="delete-buyer" data-id="${escapeHTML(getId(buyer))}">Delete</button>
            </td>
        </tr>
    `).join("");
}

$("showBuyerForm").addEventListener("click", () => {
    editingBuyerId = null;
    $("buyerForm").reset();
    $("buyerFormTitle").textContent = "Add Buyer";
    $("saveBuyerButton").textContent = "Save Buyer";
    $("buyerFormPanel").hidden = false;
});

$("cancelBuyerForm").addEventListener("click", () => {
    $("buyerFormPanel").hidden = true;
    $("buyerForm").reset();
    editingBuyerId = null;
});

$("buyerForm").addEventListener("submit", async event => {
    event.preventDefault();

    const data = {
        fullName: $("buyerName").value.trim(),
        phone: $("buyerPhone").value.trim(),
        location: $("buyerLocation").value.trim(),
        buyerType: $("buyerType").value
    };

    try {
        if (editingBuyerId) {
            await apiRequest(`${API.buyers}/${editingBuyerId}`, "PUT", data);
            showMessage("Buyer updated successfully.");
        } else {
            await apiRequest(API.buyers, "POST", data);
            showMessage("Buyer added successfully.");
        }

        $("buyerForm").reset();
        $("buyerFormPanel").hidden = true;
        editingBuyerId = null;

        await loadBuyers();
        await loadDashboardStats();

    } catch (error) {
        showMessage(error.message);
    }
});


/* ==========================================
   13. PRODUCE CRUD
========================================== */

async function loadProduce() {
    try {
        allProduce = await apiRequest(API.produce);
        renderProduce(allProduce);
    } catch (error) {
        console.error(error);
        setLoading("produceTableBody", "Unable to load produce.");
    }
}

function renderProduce(produce) {
    const body = $("produceTableBody");

    if (!produce.length) {
        body.innerHTML = '<tr><td colspan="5">No produce records found.</td></tr>';
        return;
    }

    body.innerHTML = produce.map(item => `
        <tr>
            <td>${escapeHTML(getProduceName(item))}</td>
            <td>${escapeHTML(item.location || "—")}</td>
            <td>${money(getProducePrice(item))}</td>
            <td>${Number(getProduceQuantity(item)).toLocaleString("en-UG")}</td>
            <td>
                <button class="action-button edit-button" data-action="edit-produce" data-id="${escapeHTML(getId(item))}">Edit</button>
                <button class="action-button delete-button" data-action="delete-produce" data-id="${escapeHTML(getId(item))}">Delete</button>
            </td>
        </tr>
    `).join("");
}

$("showProduceForm").addEventListener("click", () => {
    editingProduceId = null;
    $("produceForm").reset();
    $("formTitle").textContent = "Add New Produce";
    $("saveProduceButton").textContent = "Save Produce";
    $("produceFormPanel").hidden = false;
});

$("cancelProduceForm").addEventListener("click", () => {
    $("produceFormPanel").hidden = true;
    $("produceForm").reset();
    editingProduceId = null;
});

$("produceForm").addEventListener("submit", async event => {
    event.preventDefault();

    const data = {
        name: $("produceName").value.trim(),
        location: $("produceLocation").value.trim(),
        price: Number($("producePrice").value),
        quantity: Number($("produceQuantity").value)
    };

    try {
        if (editingProduceId) {
            await apiRequest(`${API.produce}/${editingProduceId}`, "PUT", data);
            showMessage("Produce updated successfully.");
        } else {
            await apiRequest(API.produce, "POST", data);
            showMessage("Produce added successfully.");
        }

        $("produceForm").reset();
        $("produceFormPanel").hidden = true;
        editingProduceId = null;

        await loadProduce();
        await loadDashboardProduce();
        await loadDashboardStats();

    } catch (error) {
        showMessage(error.message);
    }
});


/* ==========================================
   14. ORDERS CRUD
========================================== */

async function loadOrders() {
    try {
        allOrders = await apiRequest(API.orders);
        renderOrders(allOrders);
    } catch (error) {
        console.error(error);
        setLoading("ordersTableBody", "Unable to load orders.");
    }
}

function renderOrders(orders) {
    const body = $("ordersTableBody");

    if (!orders.length) {
        body.innerHTML = '<tr><td colspan="8">No orders found.</td></tr>';
        return;
    }

    body.innerHTML = orders.map(order => `
        <tr>
            <td>${escapeHTML(order.orderId || "—")}</td>
            <td>${escapeHTML(order.buyerName || "—")}</td>
            <td>${escapeHTML(order.productName || "—")}</td>
            <td>${escapeHTML(order.farmerId || "—")}</td>
            <td>${escapeHTML(order.quantity ?? 0)}</td>
            <td>${money(order.totalAmount)}</td>
            <td>
                <span class="status ${getStatusClass(order.orderStatus)}">
                    ${escapeHTML(order.orderStatus || "Pending")}
                </span>
            </td>
            <td>
                <button class="action-button edit-button" data-action="edit-order" data-id="${escapeHTML(getId(order))}">Edit</button>
                <button class="action-button delete-button" data-action="delete-order" data-id="${escapeHTML(getId(order))}">Delete</button>
            </td>
        </tr>
    `).join("");
}

$("showOrderForm").addEventListener("click", () => {
    editingOrderId = null;
    $("orderForm").reset();
    $("orderFormTitle").textContent = "Add Order";
    $("saveOrderButton").textContent = "Save Order";
    $("orderFormPanel").hidden = false;
});

$("cancelOrderForm").addEventListener("click", () => {
    $("orderFormPanel").hidden = true;
    $("orderForm").reset();
    editingOrderId = null;
});

$("orderForm").addEventListener("submit", async event => {
    event.preventDefault();

    const quantity = Number($("orderQuantity").value);
    const unitPrice = Number($("orderUnitPrice").value);

    const data = {
        buyerId: $("orderBuyerId").value.trim(),
        buyerName: $("orderBuyerName").value.trim(),
        productId: $("orderProductId").value.trim(),
        productName: $("orderProductName").value.trim(),
        farmerId: $("orderFarmerId").value.trim(),
        quantity,
        unitPrice,
        totalAmount: quantity * unitPrice,
        currency: "UGX",
        orderStatus: $("orderStatus").value,
        orderDate: new Date().toISOString()
    };

    try {
        if (editingOrderId) {
            await apiRequest(`${API.orders}/${editingOrderId}`, "PUT", data);
            showMessage("Order updated successfully.");
        } else {
            await apiRequest(API.orders, "POST", data);
            showMessage("Order added successfully.");
        }

        $("orderForm").reset();
        $("orderFormPanel").hidden = true;
        editingOrderId = null;

        await loadOrders();
        await loadDashboardOrders();
        await loadDashboardStats();
        renderMonthlyOrdersChart();

    } catch (error) {
        showMessage(error.message);
    }
});


/* ==========================================
   15. MARKET PRICES CRUD
========================================== */

async function loadPrices() {
    try {
        allPrices = await apiRequest(API.prices);
        renderPrices(allPrices);
    } catch (error) {
        console.error(error);
        setLoading("pricesTableBody", "Unable to load market prices.");
    }
}

function renderPrices(prices) {
    const body = $("pricesTableBody");

    if (!prices.length) {
        body.innerHTML = '<tr><td colspan="7">No market prices found.</td></tr>';
        return;
    }

    body.innerHTML = prices.map(item => `
        <tr>
            <td>${escapeHTML(item.productName || "—")}</td>
            <td>${escapeHTML(item.market || "—")}</td>
            <td>${escapeHTML(item.location || "—")}</td>
            <td>${money(item.pricePerUnit)}</td>
            <td>${escapeHTML(item.unit || "kg")}</td>
            <td>${formatDate(item.recordedAt || item.createdAt)}</td>
            <td>
                <button class="action-button edit-button" data-action="edit-price" data-id="${escapeHTML(getId(item))}">Edit</button>
                <button class="action-button delete-button" data-action="delete-price" data-id="${escapeHTML(getId(item))}">Delete</button>
            </td>
        </tr>
    `).join("");
}

$("showPriceForm").addEventListener("click", () => {
    editingPriceId = null;
    $("priceForm").reset();
    $("priceFormTitle").textContent = "Add Market Price";
    $("savePriceButton").textContent = "Save Market Price";
    $("priceFormPanel").hidden = false;
});

$("cancelPriceForm").addEventListener("click", () => {
    $("priceFormPanel").hidden = true;
    $("priceForm").reset();
    editingPriceId = null;
});

$("priceForm").addEventListener("submit", async event => {
    event.preventDefault();

    const data = {
        productName: $("priceProductName").value.trim(),
        market: $("priceMarket").value.trim(),
        location: $("priceLocation").value.trim(),
        pricePerUnit: Number($("pricePerUnit").value),
        unit: $("priceUnit").value,
        currency: "UGX",
        recordedAt: new Date().toISOString()
    };

    try {
        if (editingPriceId) {
            await apiRequest(`${API.prices}/${editingPriceId}`, "PUT", data);
            showMessage("Market price updated successfully.");
        } else {
            await apiRequest(API.prices, "POST", data);
            showMessage("Market price added successfully.");
        }

        $("priceForm").reset();
        $("priceFormPanel").hidden = true;
        editingPriceId = null;

        await loadPrices();
        await loadDashboardPrices();
        renderMarketPricesChart();

    } catch (error) {
        showMessage(error.message);
    }
});


/* ==========================================
   16. EDIT AND DELETE ACTIONS
========================================== */

document.addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    try {
        if (action === "edit-farmer") {
            const item = allFarmers.find(record => String(getId(record)) === id);
            if (!item) return;

            editingFarmerId = id;
            $("farmerName").value = item.fullName || "";
            $("farmerPhone").value = item.phone || "";
            $("farmerLocation").value = item.location || "";
            $("farmerDistrict").value = item.district || "";
            $("farmerFarmName").value = item.farmName || "";
            $("farmerFormTitle").textContent = "Edit Farmer";
            $("saveFarmerButton").textContent = "Update Farmer";
            $("farmerFormPanel").hidden = false;
        }

        else if (action === "edit-buyer") {
            const item = allBuyers.find(record => String(getId(record)) === id);
            if (!item) return;

            editingBuyerId = id;
            $("buyerName").value = item.fullName || "";
            $("buyerPhone").value = item.phone || "";
            $("buyerLocation").value = item.location || "";
            $("buyerType").value = item.buyerType || "";
            $("buyerFormTitle").textContent = "Edit Buyer";
            $("saveBuyerButton").textContent = "Update Buyer";
            $("buyerFormPanel").hidden = false;
        }

        else if (action === "edit-produce") {
            const item = allProduce.find(record => String(getId(record)) === id);
            if (!item) return;

            editingProduceId = id;
            $("produceName").value = getProduceName(item);
            $("produceLocation").value = item.location || "";
            $("producePrice").value = getProducePrice(item);
            $("produceQuantity").value = getProduceQuantity(item);
            $("formTitle").textContent = "Edit Produce";
            $("saveProduceButton").textContent = "Update Produce";
            $("produceFormPanel").hidden = false;
        }

        else if (action === "edit-order") {
            const item = allOrders.find(record => String(getId(record)) === id);
            if (!item) return;

            editingOrderId = id;
            $("orderBuyerId").value = item.buyerId || "";
            $("orderBuyerName").value = item.buyerName || "";
            $("orderProductId").value = item.productId || "";
            $("orderProductName").value = item.productName || "";
            $("orderFarmerId").value = item.farmerId || "";
            $("orderQuantity").value = item.quantity || "";
            $("orderUnitPrice").value = item.unitPrice || "";
            $("orderStatus").value = item.orderStatus || "Pending";
            $("orderFormTitle").textContent = "Edit Order";
            $("saveOrderButton").textContent = "Update Order";
            $("orderFormPanel").hidden = false;
        }

        else if (action === "edit-price") {
            const item = allPrices.find(record => String(getId(record)) === id);
            if (!item) return;

            editingPriceId = id;
            $("priceProductName").value = item.productName || "";
            $("priceMarket").value = item.market || "";
            $("priceLocation").value = item.location || "";
            $("pricePerUnit").value = item.pricePerUnit || "";
            $("priceUnit").value = item.unit || "kg";
            $("priceFormTitle").textContent = "Edit Market Price";
            $("savePriceButton").textContent = "Update Market Price";
            $("priceFormPanel").hidden = false;
        }

        else if (action.startsWith("delete-")) {
            const confirmed = confirm("Are you sure you want to delete this record?");

            if (!confirmed) return;

            if (action === "delete-farmer") {
                await apiRequest(`${API.farmers}/${id}`, "DELETE");
                await loadFarmers();
                await loadDashboardStats();
            }

            if (action === "delete-buyer") {
                await apiRequest(`${API.buyers}/${id}`, "DELETE");
                await loadBuyers();
                await loadDashboardStats();
            }

            if (action === "delete-produce") {
                await apiRequest(`${API.produce}/${id}`, "DELETE");
                await loadProduce();
                await loadDashboardProduce();
                await loadDashboardStats();
            }

            if (action === "delete-order") {
                await apiRequest(`${API.orders}/${id}`, "DELETE");
                await loadOrders();
                await loadDashboardOrders();
                await loadDashboardStats();
                renderMonthlyOrdersChart();
            }

            if (action === "delete-price") {
                await apiRequest(`${API.prices}/${id}`, "DELETE");
                await loadPrices();
                await loadDashboardPrices();
                renderMarketPricesChart();
            }

            showMessage("Record deleted successfully.");
        }

    } catch (error) {
        showMessage(error.message);
    }
});


/* ==========================================
   17. SEARCH FUNCTIONALITY
========================================== */

function addSearch(inputId, renderFunction, dataFunction) {
    const input = $(inputId);

    if (!input) return;

    input.addEventListener("input", () => {
        const search = input.value.toLowerCase().trim();

        const filtered = dataFunction().filter(item => {
            return Object.values(item).some(value =>
                String(value ?? "").toLowerCase().includes(search)
            );
        });

        renderFunction(filtered);
    });
}

addSearch("farmersSearch", renderFarmers, () => allFarmers);
addSearch("buyersSearch", renderBuyers, () => allBuyers);
addSearch("produceSearch", renderProduce, () => allProduce);
addSearch("ordersSearch", renderOrders, () => allOrders);
addSearch("pricesSearch", renderPrices, () => allPrices);


/* ==========================================
   18. START APPLICATION
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    initializeDashboard();
});
