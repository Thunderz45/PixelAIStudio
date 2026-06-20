import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    collection, 
    getDocs, 
    runTransaction 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGOyW48JLICSL_H2X1Lrp3UKsDbcHWprw",
  authDomain: "pixelaistudio.firebaseapp.com",
  projectId: "pixelaistudio",
  storageBucket: "pixelaistudio.firebasestorage.app",
  messagingSenderId: "469623232368",
  appId: "1:469623232368:web:d590d81d9fa647568721b5",
  measurementId: "G-88FLK4HCSK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// State
const state = {
    credits: 0,
    subscriptionStatus: "free",
    isAdmin: false,
    currentUser: null
};

// DOM selectors
const el = {
    get loadingGuard() { return document.getElementById("admin-guard-loading"); },
    get dashboardContent() { return document.getElementById("admin-dashboard-content"); },
    get adminRemainingCredits() { return document.getElementById("admin-remaining-credits"); },
    get usersTableBody() { return document.getElementById("admin-users-table-body"); },
    get signoutBtn() { return document.getElementById("btn-admin-signout"); },
    get toastContainer() { return document.getElementById("toast-container"); },
    get navBrand() { return document.getElementById("nav-brand"); }
};

// Notification helper
function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type === "success" ? "toast-success" : ""}`;
    
    const icon = document.createElement("i");
    icon.className = type === "success" ? "ri-checkbox-circle-line" : "ri-info-card-line";
    
    const text = document.createElement("span");
    text.textContent = message;
    
    toast.appendChild(icon);
    toast.appendChild(text);
    el.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Redirect helpers
function redirectToClient(message = "") {
    if (message) {
        alert(message);
    }
    window.location.href = "index.html";
}

// Render User Table Row
function createUserRow(uid, userData) {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><strong>${userData.displayName || 'No Name'}</strong></td>
        <td>${userData.email || 'No Email'}</td>
        <td><strong>${userData.credits !== undefined ? userData.credits : 5}</strong></td>
        <td>
            <span class="badge-${userData.subscriptionStatus === 'pro' ? 'pro' : 'free'}">
                ${userData.subscriptionStatus === 'pro' ? 'PRO' : 'FREE'}
            </span>
        </td>
        <td>
            <button class="btn-admin-action btn-admin-add" data-uid="${uid}">
                <i class="ri-add-line"></i> Add
            </button>
            <button class="btn-admin-action btn-admin-remove" data-uid="${uid}">
                <i class="ri-subtract-line"></i> Remove
            </button>
            <button class="btn-admin-action btn-admin-toggle" data-uid="${uid}">
                <i class="ri-refresh-line"></i> Toggle Plan
            </button>
        </td>
    `;
    
    // Bind click events
    row.querySelector(".btn-admin-add").addEventListener("click", () => handleAddCredits(uid, userData.email || 'user'));
    row.querySelector(".btn-admin-remove").addEventListener("click", () => handleRemoveCredits(uid, userData.email || 'user'));
    row.querySelector(".btn-admin-toggle").addEventListener("click", () => handleToggleSubscription(uid, userData.subscriptionStatus || 'free'));
    
    return row;
}

// Fetch all users and render the admin view
async function renderAdminPage() {
    try {
        el.usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px;"><i class="ri-loader-4-line spin"></i> Querying user records...</td></tr>`;
        
        const usersColl = collection(db, "users");
        const snapshot = await getDocs(usersColl);
        
        el.usersTableBody.innerHTML = "";
        
        if (snapshot.empty) {
            el.usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">No user profiles located in the database.</td></tr>`;
            return;
        }
        
        snapshot.forEach(docSnap => {
            const userData = docSnap.data();
            const uid = docSnap.id;
            const row = createUserRow(uid, userData);
            el.usersTableBody.appendChild(row);
        });
    } catch (err) {
        console.error("Failed to query users:", err);
        el.usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #db4437;"><i class="ri-error-warning-line"></i> Database query failed: ${err.message}</td></tr>`;
        showToast("Error retrieving directory: permission denied.", "info");
    }
}

// Actions Handlers
async function handleAddCredits(uid, email) {
    const amountStr = prompt(`Enter number of credits to ADD for ${email}:`, "10");
    if (amountStr === null) return;
    
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid positive number of credits.", "info");
        return;
    }
    
    showToast("Processing transaction...", "info");
    try {
        const userRef = doc(db, "users", uid);
        const transactionCollRef = collection(db, "credit_transactions");
        const newTxDocRef = doc(transactionCollRef);
        
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User document does not exist.");
            
            const currentCredits = userDoc.data().credits !== undefined ? userDoc.data().credits : 5;
            transaction.update(userRef, {
                credits: currentCredits + amount,
                updatedAt: Date.now()
            });
            transaction.set(newTxDocRef, {
                userId: uid,
                action: "admin_add_credits",
                creditsUsed: -amount,
                timestamp: Date.now()
            });
        });
        showToast(`Successfully added ${amount} credits to ${email}`, "success");
        
        // If the admin adjusted their own credits, update their header view
        if (uid === auth.currentUser.uid) {
            state.credits += amount;
            updateAdminDashboardHeader();
        }
        
        renderAdminPage();
    } catch (err) {
        console.error("Add credits error:", err);
        showToast(`Transaction failed: ${err.message}`, "info");
    }
}

async function handleRemoveCredits(uid, email) {
    const amountStr = prompt(`Enter number of credits to REMOVE from ${email}:`, "10");
    if (amountStr === null) return;
    
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid positive number of credits.", "info");
        return;
    }
    
    showToast("Processing transaction...", "info");
    try {
        const userRef = doc(db, "users", uid);
        const transactionCollRef = collection(db, "credit_transactions");
        const newTxDocRef = doc(transactionCollRef);
        
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User document does not exist.");
            
            const currentCredits = userDoc.data().credits !== undefined ? userDoc.data().credits : 5;
            const newCredits = Math.max(0, currentCredits - amount);
            
            transaction.update(userRef, {
                credits: newCredits,
                updatedAt: Date.now()
            });
            transaction.set(newTxDocRef, {
                userId: uid,
                action: "admin_remove_credits",
                creditsUsed: currentCredits - newCredits,
                timestamp: Date.now()
            });
        });
        showToast(`Successfully removed credits from ${email}`, "success");
        
        // If the admin adjusted their own credits, update their header view
        if (uid === auth.currentUser.uid) {
            state.credits = Math.max(0, state.credits - amount);
            updateAdminDashboardHeader();
        }
        
        renderAdminPage();
    } catch (err) {
        console.error("Remove credits error:", err);
        showToast(`Transaction failed: ${err.message}`, "info");
    }
}

async function handleToggleSubscription(uid, currentStatus) {
    const newStatus = currentStatus === "pro" ? "free" : "pro";
    showToast(`Updating subscription to ${newStatus.toUpperCase()}...`, "info");
    try {
        const userRef = doc(db, "users", uid);
        const transactionCollRef = collection(db, "credit_transactions");
        const newTxDocRef = doc(transactionCollRef);
        
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User document does not exist.");
            
            transaction.update(userRef, {
                subscriptionStatus: newStatus,
                updatedAt: Date.now()
            });
            transaction.set(newTxDocRef, {
                userId: uid,
                action: `admin_toggle_sub_${newStatus}`,
                creditsUsed: 0,
                timestamp: Date.now()
            });
        });
        showToast(`Successfully toggled user subscription to ${newStatus.toUpperCase()}`, "success");
        
        // If the admin adjusted their own status, update their header view
        if (uid === auth.currentUser.uid) {
            state.subscriptionStatus = newStatus;
            updateAdminDashboardHeader();
        }
        
        renderAdminPage();
    } catch (err) {
        console.error("Toggle subscription error:", err);
        showToast(`Transaction failed: ${err.message}`, "info");
    }
}

// Update local admin stats headers
function updateAdminDashboardHeader() {
    const isPro = state.subscriptionStatus === "pro";
    el.adminRemainingCredits.textContent = isPro ? "Unlimited" : `${state.credits} Credits`;
}

// Event Bindings setup
function setupAdminEvents() {
    if (el.signoutBtn) {
        el.signoutBtn.addEventListener("click", () => {
            showToast("Signing out...", "info");
            signOut(auth)
                .then(() => redirectToClient())
                .catch(err => {
                    console.error("Sign out error:", err);
                    showToast("Error signing out.", "info");
                });
        });
    }
    
    if (el.navBrand) {
        el.navBrand.addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }
}

// Auth State Monitor
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        redirectToClient("Access Denied. Please sign in first.");
        return;
    }
    
    try {
        // Fetch user document from Firestore directly to verify role
        const userDocRef = doc(db, "users", user.uid);
        const snapshot = await runTransaction(db, async (transaction) => {
            return await transaction.get(userDocRef);
        });
        
        let isAdmin = false;
        let credits = 5;
        let subscriptionStatus = "free";
        
        if (snapshot.exists()) {
            const data = snapshot.data();
            isAdmin = data.isAdmin === true || user.email === 'admin@gmail.com';
            credits = data.credits !== undefined ? data.credits : 5;
            subscriptionStatus = data.subscriptionStatus || "free";
        } else {
            isAdmin = user.email === 'admin@gmail.com';
        }
        
        // Guard Check
        if (!isAdmin) {
            redirectToClient("Access Denied. Authorized administrators only.");
            return;
        }
        
        // Save state details
        state.isAdmin = true;
        state.credits = credits;
        state.subscriptionStatus = subscriptionStatus;
        state.currentUser = user.email;
        
        // Render Dashboard info
        updateAdminDashboardHeader();
        
        // Hide loading guard, render main content
        el.loadingGuard.classList.add("hide");
        el.dashboardContent.classList.remove("hide");
        
        // Initialize dashboard operations
        setupAdminEvents();
        renderAdminPage();
        showToast(`Administrator Authorized: ${user.email}`, "success");
    } catch (err) {
        console.error("Authorization check failure:", err);
        redirectToClient("Database connection error. Please verify database credentials.");
    }
});
