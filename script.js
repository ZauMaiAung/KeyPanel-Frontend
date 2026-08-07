const API_URL = "https://keypanel-backend-8y1x.onrender.com"; 
const API_BASE = `${API_URL}/api/v1`;

let isRegisterMode = false;
let currentUser = "";
let currentUserRole = "reseller";
let productsData = [];

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    document.getElementById("auth-title").innerText = isRegisterMode ? "Create Account" : "Welcome Back";
    document.getElementById("auth-btn").innerText = isRegisterMode ? "Sign Up" : "Sign In";
    document.getElementById("toggle-link").innerText = isRegisterMode ? "Sign In" : "Sign Up";
    document.getElementById("referral-group").classList.toggle("hidden", !isRegisterMode);
}

async function handleAuth() {
    const user = document.getElementById("login-username").value.trim();
    const pass = document.getElementById("login-password").value.trim();
    const ref = document.getElementById("login-referral").value.trim();

    if (!user || !pass) return alert("Fill in username and password");

    const endpoint = isRegisterMode ? "/register" : "/login";
    const bodyData = isRegisterMode ? { username: user, password: pass, referral_code: ref } : { username: user, password: pass };

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData)
        });

        const data = await res.json();
        if (!res.ok) return alert(data.detail || "Auth Failed");

        if (isRegisterMode) {
            alert("Account created! Please Sign In.");
            toggleAuthMode();
        } else {
            currentUser = data.username;
            currentUserRole = data.role;

            document.getElementById("login-screen").classList.add("hidden");
            document.getElementById("dashboard-screen").classList.remove("hidden");
            document.getElementById("user-display").innerText = `${currentUser}`;
            document.getElementById("role-badge").innerText = `${currentUserRole.toUpperCase()} DASHBOARD`;

            if (["admin", "owner"].includes(currentUserRole)) {
                document.getElementById("admin-tab-btn").style.display = "inline-block";
                loadModConfig();
            } else {
                document.getElementById("admin-tab-btn").style.display = "none";
            }

            await fetchUserData();
            await loadProducts();
        }
    } catch (err) {
        alert("Backend API connection failed.");
    }
}

function logout() { location.reload(); }

async function fetchUserData() {
    try {
        const res = await fetch(`${API_BASE}/user/${currentUser}`);
        const data = await res.json();
        document.getElementById("user-balance").innerText = (data.balance === "Unlimited") ? "Unlimited" : `$${parseFloat(data.balance).toFixed(2)}`;
    } catch (err) { console.error(err); }
}

async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        productsData = await res.json();
        const prodSelect = document.getElementById("product-select");
        if (productsData.length > 0) {
            prodSelect.innerHTML = productsData.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
            updatePlans();
        }
    } catch (err) { console.error(err); }
}

function updatePlans() {
    const prodId = parseInt(document.getElementById("product-select").value);
    const prod = productsData.find(p => p.id === prodId);
    document.getElementById("plan-select").innerHTML = prod?.plans.map(pl => `<option value="${pl.id}">${pl.name} - $${pl.price.toFixed(2)}</option>`).join("") || "";
}

async function generateKeys() {
    const productId = parseInt(document.getElementById("product-select").value);
    const planId = parseInt(document.getElementById("plan-select").value);
    const quantity = parseInt(document.getElementById("key-quantity").value) || 1;

    try {
        const res = await fetch(`${API_BASE}/keys/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: currentUser, product_id: productId, plan_id: planId, quantity })
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById("result-box").classList.remove("hidden");
            document.getElementById("key-output").value = data.keys.join("\n");
            fetchUserData();
        } else { alert(data.detail); }
    } catch (err) { alert("Failed to generate keys."); }
}

function switchTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    document.getElementById(`tab-${tabName}`).classList.remove("hidden");
    if (event?.target) event.target.classList.add("active");

    if (tabName === "keys") loadHistory();
    if (tabName === "admin") loadAdminUsers();
}

async function loadHistory() {
    const endpoint = ["admin", "owner"].includes(currentUserRole) ? `${API_BASE}/admin/keys` : `${API_BASE}/keys/history/${currentUser}`;
    const res = await fetch(endpoint);
    const data = await res.json();
    document.getElementById("history-table-body").innerHTML = data.map(i => `
        <tr>
            <td>${i.product}</td>
            <td>${i.plan}</td>
            <td style="color:#00f5d4">${i.key}</td>
            <td>${i.date}</td>
        </tr>
    `).join("") || "<tr><td colspan='4'>No Keys Found</td></tr>";
}

async function updatePassword() {
    const old_password = document.getElementById("old-pass").value;
    const new_password = document.getElementById("new-pass").value;

    const res = await fetch(`${API_BASE}/user/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, old_password, new_password })
    });
    const data = await res.json();
    alert(data.message || data.detail);
}

/* Owner & Admin Features */
async function loadModConfig() {
    const res = await fetch(`${API_BASE}/mod/config`);
    const data = await res.json();
    if (data.mod_name) {
        document.getElementById("mod-name-input").value = data.mod_name;
        document.getElementById("mod-status-select").value = data.mod_status;
        document.getElementById("check-maintenance").checked = data.is_maintenance;
        document.getElementById("check-esp").checked = data.features.esp;
        document.getElementById("check-aimbot").checked = data.features.aimbot;
        document.getElementById("check-bullet").checked = data.features.bullet_track;
        document.getElementById("check-memory").checked = data.features.memory;
    }
}

async function saveModConfig() {
    const payload = {
        username: currentUser,
        mod_name: document.getElementById("mod-name-input").value,
        mod_status: document.getElementById("mod-status-select").value,
        is_maintenance: document.getElementById("check-maintenance").checked,
        esp_enabled: document.getElementById("check-esp").checked,
        aimbot_enabled: document.getElementById("check-aimbot").checked,
        bullet_track_enabled: document.getElementById("check-bullet").checked,
        memory_enabled: document.getElementById("check-memory").checked
    };

    const res = await fetch(`${API_BASE}/mod/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.message || "Updated!");
}

async function cleanKeys(clean_type) {
    const res = await fetch(`${API_BASE}/admin/keys/clean`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, clean_type })
    });
    const data = await res.json();
    alert(data.message);
}

async function loadAdminUsers() {
    const res = await fetch(`${API_BASE}/admin/users`);
    const users = await res.json();
    document.getElementById("admin-users-table").innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td style="color:#00f5d4">${u.username}</td>
            <td>${u.role}</td>
            <td>$${parseFloat(u.balance).toFixed(2)}</td>
        </tr>
    `).join("");
}

async function adminAddBalance() {
    const username = document.getElementById("admin-topup-user").value.trim();
    const amount = parseFloat(document.getElementById("admin-topup-amount").value);
    const res = await fetch(`${API_BASE}/admin/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, amount })
    });
    if (res.ok) { alert("Added!"); loadAdminUsers(); }
}
