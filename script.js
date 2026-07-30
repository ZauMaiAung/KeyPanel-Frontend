const API_URL = "https://keypanel-backend-8y1x.onrender.com";
const API_BASE = `${API_URL}/api/v1`;

let isRegisterMode = false;
let currentUser = "";
let currentUserRole = "reseller";
let productsData = [];

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
        document.getElementById("auth-title").innerText = "Create Account";
        document.getElementById("auth-subtitle").innerText = "Register as a new reseller";
        document.getElementById("auth-btn").innerText = "Sign Up";
        document.getElementById("toggle-text").innerText = "Already have an account?";
        document.getElementById("toggle-link").innerText = "Sign In";
    } else {
        document.getElementById("auth-title").innerText = "Welcome Back";
        document.getElementById("auth-subtitle").innerText = "Please sign in to access your dashboard.";
        document.getElementById("auth-btn").innerText = "Sign In";
        document.getElementById("toggle-text").innerText = "Don't have an account?";
        document.getElementById("toggle-link").innerText = "Sign Up";
    }
}

async function handleAuth() {
    const user = document.getElementById("login-username").value.trim();
    const pass = document.getElementById("login-password").value.trim();

    if (!user || !pass) return alert("Please fill in username and password");

    const endpoint = isRegisterMode ? "/register" : "/login";

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, password: pass })
        });

        const data = await res.json();

        if (!res.ok) {
            return alert(data.detail || "Authentication failed");
        }

        if (isRegisterMode) {
            alert("Account created successfully! Please Sign In.");
            toggleAuthMode();
        } else {
            currentUser = data.username;
            currentUserRole = data.role;

            document.getElementById("login-screen").classList.add("hidden");
            document.getElementById("dashboard-screen").classList.remove("hidden");
            document.getElementById("user-display").innerText = `${currentUser} Dashboard`;

            if (currentUserRole === "admin") {
                document.getElementById("admin-tab-btn").style.display = "inline-block";
            } else {
                document.getElementById("admin-tab-btn").style.display = "none";
            }

            await fetchUserData();
            await loadProducts();
        }
    } catch (err) {
        alert("Server error. Make sure Backend API is running.");
    }
}

function logout() {
    location.reload();
}

async function fetchUserData() {
    try {
        const res = await fetch(`${API_BASE}/user/${currentUser}`);
        const data = await res.json();
        if (data.balance === "Unlimited" || currentUserRole === "admin") {
            document.getElementById("user-balance").innerText = "Unlimited";
        } else {
            document.getElementById("user-balance").innerText = `$${parseFloat(data.balance).toFixed(2)}`;
        }
    } catch (err) {
        console.error("Error fetching user data:", err);
    }
}

async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        productsData = await res.json();
        
        const prodSelect = document.getElementById("product-select");
        if (productsData.length > 0) {
            prodSelect.innerHTML = productsData.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
            updatePlans();
        } else {
            prodSelect.innerHTML = `<option value="">No products available</option>`;
        }
    } catch (err) {
        console.error("Error loading products:", err);
    }
}

function updatePlans() {
    const prodId = parseInt(document.getElementById("product-select").value);
    const prod = productsData.find(p => p.id === prodId);
    const planSelect = document.getElementById("plan-select");
    if (prod && prod.plans && prod.plans.length > 0) {
        planSelect.innerHTML = prod.plans.map(pl => `<option value="${pl.id}">${pl.name} - $${pl.price.toFixed(2)}</option>`).join("");
    } else {
        planSelect.innerHTML = `<option value="">No plans available</option>`;
    }
}

async function generateKeys() {
    const productId = parseInt(document.getElementById("product-select").value);
    const planId = parseInt(document.getElementById("plan-select").value);
    const quantity = parseInt(document.getElementById("key-quantity").value) || 1;

    if (!productId || !planId) return alert("Please select a product and plan");

    try {
        const res = await fetch(`${API_BASE}/keys/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: currentUser, product_id: productId, plan_id: planId, quantity: quantity })
        });

        const data = await res.json();
        if (res.ok) {
            if (data.new_balance === "Unlimited" || currentUserRole === "admin") {
                document.getElementById("user-balance").innerText = "Unlimited";
            } else {
                document.getElementById("user-balance").innerText = `$${parseFloat(data.new_balance).toFixed(2)}`;
            }

            document.getElementById("result-box").classList.remove("hidden");
            document.getElementById("key-output").value = data.keys.join("\n");
            loadHistory();
        } else {
            alert(data.detail || "Error generating keys");
        }
    } catch (err) {
        alert("Failed to generate keys. Check server connection.");
    }
}

function switchTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    
    document.getElementById(`tab-${tabName}`).classList.remove("hidden");
    if (event && event.target) {
        event.target.classList.add("active");
    }

    if (tabName === "keys") loadHistory();
    if (tabName === "admin") loadAdminUsers();
}

async function loadHistory() {
    try {
        const endpoint = (currentUserRole === "admin") 
            ? `${API_BASE}/admin/keys` 
            : `${API_BASE}/keys/history/${currentUser}`;

        const res = await fetch(endpoint);
        const data = await res.json();
        const tbody = document.getElementById("history-table-body");
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">No license keys generated yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.product}</td>
                <td>${item.plan}</td>
                <td style="color:#00f5d4">${item.key}</td>
                <td>${item.date}</td>
            </tr>
        `).join("");
    } catch (err) {
        console.error("Error loading history:", err);
    }
}

async function loadAdminUsers() {
    try {
        const res = await fetch(`${API_BASE}/admin/users`);
        const users = await res.json();
        const tbody = document.getElementById("admin-users-table");
        
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td style="color:#00f5d4">${u.username}</td>
                <td>$${parseFloat(u.balance).toFixed(2)}</td>
            </tr>
        `).join("");
    } catch (err) {
        console.error("Error loading admin users:", err);
    }
}

async function adminAddBalance() {
    const username = document.getElementById("admin-topup-user").value.trim();
    const amount = parseFloat(document.getElementById("admin-topup-amount").value);

    if (!username || isNaN(amount)) return alert("Please fill all fields with valid data");

    try {
        const res = await fetch(`${API_BASE}/admin/topup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username, amount: amount })
        });

        if (res.ok) {
            alert(`Added $${amount} to ${username}`);
            loadAdminUsers();
            fetchUserData();
        } else {
            const errData = await res.json();
            alert(errData.detail || "User not found!");
        }
    } catch (err) {
        alert("Failed to connect to backend server");
    }
}

async function verifyBinancePayment() {
    const txnId = document.getElementById("binance-txn-id").value.trim();

    if (!txnId) {
        return alert("Please enter Binance Transaction ID");
    }

    try {
        const res = await fetch(`${API_BASE}/payment/binance/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: currentUser, txn_id: txnId })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.message || "Topup successful!");
            document.getElementById("binance-txn-id").value = "";
            fetchUserData();
        } else {
            alert(data.detail || "Payment verification failed!");
        }
    } catch (err) {
        alert("Failed to connect to backend server");
    }
}

