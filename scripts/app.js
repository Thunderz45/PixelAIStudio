import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    getDocs, 
    deleteDoc, 
    query, 
    orderBy,
    runTransaction,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getStorage, 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Your web app's Firebase configuration
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

// Initialize Firebase Services with Safe Fallbacks
let db = null;
let storage = null;
try {
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("PixelAI: Firestore and Storage services initialized successfully.");
} catch (error) {
    console.warn("PixelAI: Firestore or Storage failed to initialize:", error);
}

// Safe Analytics initialization that won't halt script execution if blocked (e.g. on mobile private browsing)
let analytics = null;
try {
    isSupported()
        .then((supported) => {
            if (supported) {
                analytics = getAnalytics(app);
                console.log("PixelAI: Firebase Analytics initialized successfully.");
            } else {
                console.log("PixelAI: Firebase Analytics is not supported in this environment.");
            }
        })
        .catch((error) => {
            console.warn("PixelAI: Firebase Analytics support check failed:", error);
        });
} catch (error) {
    console.warn("PixelAI: Firebase Analytics initialization failed:", error);
}

/**
 * PixelAI Studio - AI Image Generator Core Logic
 * Google AI Professional UI Experience with Safe Local Auth Gates
 */

// A robust, exception-proof storage wrapper that gracefully falls back to in-memory storage
// under environment restrictions (e.g. Chrome file:// CORS or private session policies)
const memoryStorage = {};
const safeStorage = {
    getItem(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            console.warn(`localStorage read blocked for key "${key}", using memory fallback.`, e);
            return memoryStorage[key] || null;
        }
    },
    setItem(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            console.warn(`localStorage write blocked for key "${key}", using memory fallback.`, e);
            memoryStorage[key] = value;
        }
    },
    removeItem(key) {
        try {
            window.localStorage.removeItem(key);
        } catch (e) {
            console.warn(`localStorage remove blocked for key "${key}", using memory fallback.`, e);
            delete memoryStorage[key];
        }
    }
};

// Shadow the global localStorage to prevent SecurityError under strict browser environments
const localStorage = safeStorage;

// Application state
const state = {
    prompt: "",
    category: "none",
    seed: null,
    isGenerating: false,
    currentImageUrl: "",
    
    // Auth States
    isLoggedIn: false,
    currentUser: null,
    isAdmin: false,
    
    // Credits & Subscription States
    credits: 5,
    subscriptionStatus: "free" // "free" or "pro"
};

// Technical neural network logging statuses
const NEURAL_LOGS = [
    "Connecting to visual rendering clusters...",
    "Tokenizing linguistic prompts...",
    "Analyzing semantic descriptors...",
    "Mapping latent space vectors...",
    "Iteratively removing Gaussian noise...",
    "Applying style category weights...",
    "Synthesizing high-definition pixels...",
    "Polishing resolution parameters..."
];

// DOM Elements (Queried dynamically via getters to prevent null-pointer script crashes)
const el = {
    get promptInput() { return document.getElementById("prompt-input"); },
    get generateBtn() { return document.getElementById("generate-btn"); },
    get stateEmpty() { return document.getElementById("state-empty"); },
    get stateLoading() { return document.getElementById("state-loading"); },
    get stateError() { return document.getElementById("state-error"); },
    get imageWrapper() { return document.getElementById("image-wrapper"); },
    get outputImage() { return document.getElementById("output-image"); },
    get actionButtons() { return document.getElementById("action-buttons"); },
    get downloadBtn() { return document.getElementById("download-btn"); },
    get copyBtn() { return document.getElementById("copy-btn"); },
    get categoryChips() { return document.querySelectorAll(".category-chip"); },
    get imageFrame() { return document.getElementById("image-frame"); },
    
    // View navigation elements
    get linkHome() { return document.getElementById("link-home"); },
    get linkStudio() { return document.getElementById("link-studio"); },
    get linkProfile() { return document.getElementById("link-profile"); },
    get viewHome() { return document.getElementById("view-home"); },
    get viewStudio() { return document.getElementById("view-studio"); },
    get viewProfile() { return document.getElementById("view-profile"); },
    get navBrand() { return document.getElementById("nav-brand"); },
    get heroGetStarted() { return document.getElementById("hero-get-started-btn"); },
    
    // Hamburger Menu & Backdrops
    get btnMenuToggle() { return document.getElementById("btn-menu-toggle"); },
    get btnMenuClose() { return document.getElementById("btn-menu-close"); },
    get navLinksMenu() { return document.getElementById("nav-links-menu"); },
    get drawerBackdrop() { return document.getElementById("drawer-backdrop"); },
    
    // Profile DOM Elements
    get profileDisplayName() { return document.getElementById("profile-display-name"); },
    get profileDisplayEmail() { return document.getElementById("profile-display-email"); },
    get profileDisplayBadge() { return document.getElementById("profile-display-badge"); },
    get btnThemeLight() { return document.getElementById("btn-theme-light"); },
    get btnThemeDark() { return document.getElementById("btn-theme-dark"); },
    get formUpdateProfile() { return document.getElementById("form-update-profile"); },
    get updateName() { return document.getElementById("update-name"); },
    get btnClearHistory() { return document.getElementById("btn-clear-history"); },
    get historyGrid() { return document.getElementById("history-grid"); },
    
    // Showcase cards
    get cardVector() { return document.getElementById("card-trigger-vector"); },
    get cardCartoon() { return document.getElementById("card-trigger-cartoon"); },
    get cardPhoto() { return document.getElementById("card-trigger-photo"); },
    get card3d() { return document.getElementById("card-trigger-3d"); },

    // Textarea actions & Counter
    get charCounter() { return document.getElementById("char-counter"); },
    get clearPromptBtn() { return document.getElementById("clear-prompt-btn"); },

    // Loading status & Toast Notification
    get logText() { return document.getElementById("log-text"); },
    get toastContainer() { return document.getElementById("toast-container"); },

    // Auth Selectors
    get btnAuthNav() { return document.getElementById("btn-auth-nav"); },
    get authModal() { return document.getElementById("auth-modal"); },
    get authCloseBtn() { return document.getElementById("auth-close-btn"); },
    get formLoginView() { return document.getElementById("form-login-view"); },
    get formSignupView() { return document.getElementById("form-signup-view"); },
    get formLogin() { return document.getElementById("form-login"); },
    get formSignup() { return document.getElementById("form-signup"); },
    
    get loginEmail() { return document.getElementById("login-email"); },
    get loginPassword() { return document.getElementById("login-password"); },
    
    get signupName() { return document.getElementById("signup-name"); },
    get signupEmail() { return document.getElementById("signup-email"); },
    get signupPassword() { return document.getElementById("signup-password"); },
    
    get switchToSignup() { return document.getElementById("switch-to-signup"); },
    get switchToLogin() { return document.getElementById("switch-to-login"); },

    // Credits & Subscription Elements
    get navUserStats() { return document.getElementById("nav-user-stats"); },
    get navCreditsCount() { return document.getElementById("nav-credits-count"); },
    get navCreditsBadge() { return document.getElementById("nav-credits-badge"); },
    get navProBadge() { return document.getElementById("nav-pro-badge"); },
    get studioCreditsDisplay() { return document.getElementById("studio-credits-display"); },
    get studioPlanBadge() { return document.getElementById("studio-plan-badge"); },
    get btnUpgradeStudio() { return document.getElementById("btn-upgrade-studio"); },
    
    // Subscription Modal Elements
    get subscriptionModal() { return document.getElementById("subscription-modal"); },
    get subCloseBtn() { return document.getElementById("sub-close-btn"); },
    get btnSubscribePro() { return document.getElementById("btn-subscribe-pro"); },
    get btnCancelPro() { return document.getElementById("btn-cancel-pro"); },
    get planCardFree() { return document.getElementById("plan-card-free"); },
    get planCardPro() { return document.getElementById("plan-card-pro"); },
    
    // Welcome Credits Modal Elements
    get welcomeCreditsModal() { return document.getElementById("welcome-credits-modal"); },
    get welcomeCreditsCloseBtn() { return document.getElementById("welcome-credits-close-btn"); },
    
    // Admin Panel Elements
    get linkAdmin() { return document.getElementById("link-admin"); },
    get viewAdmin() { return document.getElementById("view-admin"); },
    get adminUsersTable() { return document.getElementById("admin-users-table-body"); },
    get adminRemainingCredits() { return document.getElementById("admin-remaining-credits"); }
};

// Category style prompt modifier mappings
const CATEGORY_PROMPTS = {
    "none": "",
    "vector": ", clean vector art illustration, flat colors, minimalist SVG style, white background",
    "cartoon": ", cute cartoon 2D style, bold outlines, vibrant colors, clean design, digital art",
    "photorealistic": ", photorealistic, highly detailed, real photo, DSLR camera, sharp focus, 8k resolution",
    "3d-render": ", cute 3d render, octane render, stylized art style, claymation, soft lighting",
    "anime": ", vibrant anime style, clean lines, colorful visual shading, key visual"
};

// ==========================================================================
// INDEXEDDB DATABASE FOR USER CREATION HISTORY
// ==========================================================================
const DB_NAME = "PixelAIHistoryDB";
const STORE_NAME = "history";
let dbConnection = null;
let unsubscribeCredits = null;

function initHistoryDB() {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME, { keyPath: "id" });
                }
            };
            request.onsuccess = (e) => {
                dbConnection = e.target.result;
                resolve(dbConnection);
            };
            request.onerror = (e) => {
                console.warn("IndexedDB failed to open:", e);
                resolve(null);
            };
        } catch (error) {
            console.warn("IndexedDB is not supported or blocked in this environment:", error);
            resolve(null);
        }
    });
}

async function saveGenerationToFirestore(uid, itemId, prompt, category, seed, blob) {
    if (!db || !storage) return null;
    try {
        // 1. Upload the image blob to Firebase Storage
        const imageRef = storageRef(storage, `users/${uid}/generations/${itemId}.jpg`);
        const snapshot = await uploadBytes(imageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // 2. Save metadata to Firestore
        const historyDocRef = doc(db, "users", uid, "history", itemId);
        const item = {
            id: itemId,
            uid: uid,
            prompt: prompt,
            category: category,
            seed: seed,
            imageUrl: downloadURL,
            timestamp: Date.now()
        };
        await setDoc(historyDocRef, item);
        console.log("Successfully saved generation to Firestore and Storage.");
        return downloadURL;
    } catch (err) {
        console.warn("Firestore/Storage history save failed:", err);
        return null;
    }
}

function saveServerItemToLocalIndexedDB(item) {
    return new Promise((resolve) => {
        if (!dbConnection) return resolve(false);
        try {
            const transaction = dbConnection.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const localItem = {
                id: item.id,
                uid: item.uid,
                prompt: item.prompt,
                category: item.category,
                seed: item.seed,
                imageData: item.imageUrl, // Store Firestore URL directly as imageData
                timestamp: item.timestamp
            };
            store.put(localItem);
            resolve(true);
        } catch (e) {
            console.warn("Failed to write server item to IndexedDB:", e);
            resolve(false);
        }
    });
}

function saveGenerationToHistory(uid, prompt, category, seed, blob) {
    const itemId = `${uid}_${Date.now()}`;
    
    // Save to local IndexedDB first
    if (dbConnection) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            try {
                const base64Data = reader.result;
                const transaction = dbConnection.transaction([STORE_NAME], "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const item = {
                    id: itemId,
                    uid: uid,
                    prompt: prompt,
                    category: category,
                    seed: seed,
                    imageData: base64Data,
                    timestamp: Date.now()
                };
                store.put(item);
                console.log("Successfully saved generation to IndexedDB history.");
            } catch (e) {
                console.warn("Failed to write to IndexedDB:", e);
            }
        };
    }
    
    // Also save to Firestore & Storage asynchronously
    saveGenerationToFirestore(uid, itemId, prompt, category, seed, blob);
}

async function getGenerationHistory(uid) {
    // 1. Get current local history from IndexedDB
    let localHistory = [];
    if (dbConnection) {
        try {
            localHistory = await new Promise((resolve) => {
                const transaction = dbConnection.transaction([STORE_NAME], "readonly");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = () => {
                    const all = request.result || [];
                    const filtered = all
                        .filter(item => item.uid === uid)
                        .sort((a, b) => b.timestamp - a.timestamp);
                    resolve(filtered);
                };
                request.onerror = () => resolve([]);
            });
        } catch (err) {
            console.warn("Local IndexedDB read failed:", err);
        }
    }
    
    // 2. Fetch history from Firestore and sync
    if (db) {
        try {
            const historyCollRef = collection(db, "users", uid, "history");
            const q = query(historyCollRef, orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            
            const serverHistory = [];
            querySnapshot.forEach((doc) => {
                serverHistory.push(doc.data());
            });
            
            // Sync server items with local IndexedDB if they are missing
            for (const item of serverHistory) {
                const exists = localHistory.some(localItem => localItem.id === item.id);
                if (!exists) {
                    await saveServerItemToLocalIndexedDB(item);
                    localHistory.push({
                        id: item.id,
                        uid: item.uid,
                        prompt: item.prompt,
                        category: item.category,
                        seed: item.seed,
                        imageData: item.imageUrl, // use imageUrl for display
                        timestamp: item.timestamp
                    });
                }
            }
            
            // Sort by timestamp descending
            localHistory.sort((a, b) => b.timestamp - a.timestamp);
        } catch (err) {
            console.warn("Failed to fetch history from Firestore:", err);
        }
    }
    
    return localHistory;
}

async function clearGenerationHistory(uid) {
    // 1. Clear local history from IndexedDB
    if (dbConnection) {
        try {
            await new Promise((resolve) => {
                const transaction = dbConnection.transaction([STORE_NAME], "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = () => {
                    const all = request.result || [];
                    const userItems = all.filter(item => item.uid === uid);
                    userItems.forEach(item => {
                        store.delete(item.id);
                    });
                    resolve(true);
                };
                request.onerror = () => resolve(false);
            });
        } catch (err) {
            console.warn("Local IndexedDB clear failed:", err);
        }
    }
    
    // 2. Clear history from Firestore
    if (db) {
        try {
            const historyCollRef = collection(db, "users", uid, "history");
            const querySnapshot = await getDocs(historyCollRef);
            const batchDeletes = [];
            querySnapshot.forEach((doc) => {
                batchDeletes.push(deleteDoc(doc.ref));
            });
            await Promise.all(batchDeletes);
        } catch (err) {
            console.warn("Failed to clear Firestore history:", err);
        }
    }
    
    return true;
}

// ==========================================================================
// APPEARANCE & THEME SWITCHER
// ==========================================================================
function initTheme() {
    const savedTheme = localStorage.getItem("pixelai_theme") || "light";
    setTheme(savedTheme);
}

function setTheme(theme) {
    if (theme === "dark") {
        document.body.classList.add("dark-theme");
        if (el.btnThemeDark) el.btnThemeDark.classList.add("active");
        if (el.btnThemeLight) el.btnThemeLight.classList.remove("active");
        localStorage.setItem("pixelai_theme", "dark");
    } else {
        document.body.classList.remove("dark-theme");
        if (el.btnThemeLight) el.btnThemeLight.classList.add("active");
        if (el.btnThemeDark) el.btnThemeDark.classList.remove("active");
        localStorage.setItem("pixelai_theme", "light");
    }
}

// ==========================================================================
// MOBILE DRAWER sidebar CONTROL
// ==========================================================================
function toggleMobileMenu(isOpen) {
    if (isOpen) {
        el.navLinksMenu.classList.add("open");
        el.drawerBackdrop.classList.remove("hide");
    } else {
        el.navLinksMenu.classList.remove("open");
        el.drawerBackdrop.classList.add("hide");
    }
}

// Helper to safely bind event listeners to DOM elements (preventing script crashes)
function safeBind(element, event, handler) {
    if (element) {
        try {
            element.addEventListener(event, handler);
        } catch (err) {
            console.error(`Failed to register "${event}" listener on element:`, element, err);
        }
    } else {
        console.warn(`Cannot bind "${event}" event: target element is missing/null in the DOM.`);
    }
}

// Setup Event Listeners
function init() {
    console.log("PixelAI: Initializing core application event listeners...");
    
    // Initialize user themes and databases
    initTheme();
    initHistoryDB();
    
    // Setup Firebase Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            state.isLoggedIn = true;
            state.currentUser = user.displayName || user.email;
            
            // Show profile navigation link
            if (el.linkProfile) el.linkProfile.classList.remove("hide");
            
            updateNavForUser(state.currentUser);
            
            // Initialize credits to 5 immediately to prevent 0 credits race conditions before sync
            state.credits = 5;
            updateCreditsUI();
            
            // Sync user data (credits & subscription) with Firestore
            await syncUserDataWithFirestore(user);
        } else {
            // Unsubscribe from real-time credits updates on logout
            if (unsubscribeCredits) {
                unsubscribeCredits();
                unsubscribeCredits = null;
            }
            
            state.isLoggedIn = false;
            state.currentUser = null;
            state.credits = 0;
            state.subscriptionStatus = "free";
            state.isAdmin = false;
            
            // Hide profile and admin navigation links
            if (el.linkProfile) el.linkProfile.classList.add("hide");
            if (el.linkAdmin) el.linkAdmin.classList.add("hide");
            
            el.btnAuthNav.textContent = "Sign In";
            el.btnAuthNav.className = "btn-auth-outline";
            updateCreditsUI();
            switchView("home");
        }
    });
    
    // Core actions
    safeBind(el.generateBtn, "click", generateImage);
    safeBind(el.downloadBtn, "click", downloadImage);
    safeBind(el.copyBtn, "click", copyPrompt);

    // Setup Category click listeners
    const chips = el.categoryChips;
    if (chips && chips.length > 0) {
        chips.forEach(chip => {
            safeBind(chip, "click", () => {
                chips.forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                state.category = chip.dataset.category;
                showToast(`Style updated to: ${chip.textContent.trim()}`, "info");
            });
        });
    }

    // Navigation triggers
    safeBind(el.linkHome, "click", (e) => { e.preventDefault(); switchView("home"); });
    safeBind(el.linkStudio, "click", (e) => { e.preventDefault(); switchView("studio"); });
    safeBind(el.linkProfile, "click", (e) => { e.preventDefault(); switchView("profile"); });
    safeBind(el.linkAdmin, "click", (e) => { e.preventDefault(); switchView("admin"); });
    safeBind(el.navBrand, "click", () => switchView("home"));
    safeBind(el.heroGetStarted, "click", () => switchView("studio"));

    // Hamburger Mobile Menu triggers
    safeBind(el.btnMenuToggle, "click", () => toggleMobileMenu(true));
    safeBind(el.btnMenuClose, "click", () => toggleMobileMenu(false));
    safeBind(el.drawerBackdrop, "click", () => toggleMobileMenu(false));

    // Showcase card navigation triggers
    setupShowcaseTrigger(el.cardVector, "vector");
    setupShowcaseTrigger(el.cardCartoon, "cartoon");
    setupShowcaseTrigger(el.cardPhoto, "photorealistic");
    setupShowcaseTrigger(el.card3d, "3d-render");

    // Character counter & clear prompt listener
    safeBind(el.promptInput, "input", handlePromptInput);
    safeBind(el.clearPromptBtn, "click", clearPrompt);

    // Auth Modal listeners
    safeBind(el.btnAuthNav, "click", handleAuthNavClick);
    safeBind(el.authCloseBtn, "click", closeAuthModal);
    
    if (el.switchToSignup) {
        safeBind(el.switchToSignup, "click", (e) => { e.preventDefault(); toggleAuthForm("signup"); });
    }
    if (el.switchToLogin) {
        safeBind(el.switchToLogin, "click", (e) => { e.preventDefault(); toggleAuthForm("login"); });
    }
    
    safeBind(el.formLogin, "submit", handleLoginSubmit);
    safeBind(el.formSignup, "submit", handleSignupSubmit);
    

    
    // Close modal on backdrop click
    safeBind(el.authModal, "click", (e) => {
        if (e.target === el.authModal) closeAuthModal();
    });
    
    // Subscription Modal Triggers
    safeBind(el.navCreditsBadge, "click", openSubscriptionModal);
    safeBind(el.btnUpgradeStudio, "click", openSubscriptionModal);
    safeBind(el.subCloseBtn, "click", closeSubscriptionModal);
    
    // Checkout Navigation (Razorpay Popup)
    safeBind(el.btnSubscribePro, "click", startRazorpayCheckout);
    
    // Plan Cancellation
    safeBind(el.btnCancelPro, "click", handleCancelSubscription);
    
    // Close subscription modal on backdrop click
    safeBind(el.subscriptionModal, "click", (e) => {
        if (e.target === el.subscriptionModal) closeSubscriptionModal();
    });

    // Welcome Credits Modal listeners
    safeBind(el.welcomeCreditsCloseBtn, "click", closeWelcomeCreditsPopup);
    safeBind(el.welcomeCreditsModal, "click", (e) => {
        if (e.target === el.welcomeCreditsModal) closeWelcomeCreditsPopup();
    });

    // Theme Switches
    safeBind(el.btnThemeLight, "click", () => setTheme("light"));
    safeBind(el.btnThemeDark, "click", () => setTheme("dark"));

    // Profile Settings Update
    safeBind(el.formUpdateProfile, "submit", handleUpdateProfile);
    safeBind(el.btnClearHistory, "click", handleClearHistory);
    
    console.log("PixelAI: Event listeners configured successfully.");
}

// Navigation Helper with Login Guards
function switchView(viewName) {
    if ((viewName === "studio" || viewName === "profile") && !state.isLoggedIn) {
        openAuthModal("login");
        showToast("Authentication required to access this section.", "info");
        return;
    }
    
    if (viewName === "admin" && (!state.isLoggedIn || !state.isAdmin)) {
        switchView("home");
        showToast("Access denied. Admin authorization required.", "info");
        return;
    }

    // Close mobile menu when switching views
    toggleMobileMenu(false);

    el.viewHome.classList.add("hide");
    el.viewStudio.classList.add("hide");
    el.viewProfile.classList.add("hide");
    if (el.viewAdmin) el.viewAdmin.classList.add("hide");
    
    el.linkHome.classList.remove("active");
    el.linkStudio.classList.remove("active");
    el.linkProfile.classList.remove("active");
    if (el.linkAdmin) el.linkAdmin.classList.remove("active");

    if (viewName === "home") {
        el.viewHome.classList.remove("hide");
        el.linkHome.classList.add("active");
    } else if (viewName === "studio") {
        el.viewStudio.classList.remove("hide");
        el.linkStudio.classList.add("active");
    } else if (viewName === "profile") {
        el.viewProfile.classList.remove("hide");
        el.linkProfile.classList.add("active");
        renderProfilePage();
    } else if (viewName === "admin") {
        el.viewAdmin.classList.remove("hide");
        el.linkAdmin.classList.add("active");
        renderAdminPage();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Helper to handle showcase card selection with Auth checks
function setupShowcaseTrigger(cardEl, categoryName) {
    if (!cardEl) return;
    cardEl.addEventListener("click", () => {
        if (!state.isLoggedIn) {
            openAuthModal("login");
            showToast("Sign in first to try category styles.", "info");
            return;
        }
        switchView("studio");
        // Trigger select chip click
        const targetChip = Array.from(el.categoryChips).find(c => c.dataset.category === categoryName);
        if (targetChip) {
            targetChip.click();
        }
    });
}

// Textarea input handler
function handlePromptInput() {
    const val = el.promptInput.value;
    el.charCounter.textContent = `${val.length} / 400`;
    
    if (val.length > 0) {
        el.clearPromptBtn.classList.remove("hide");
    } else {
        el.clearPromptBtn.classList.add("hide");
    }
}

// Clear prompt textarea
function clearPrompt() {
    el.promptInput.value = "";
    el.charCounter.textContent = "0 / 400";
    el.clearPromptBtn.classList.add("hide");
    el.promptInput.focus();
    showToast("Prompt cleared", "info");
}

// Floating Toast Notification system
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

// ==========================================================================
// SESSION MANAGEMENT (Firebase Auth)
// ==========================================================================

function updateNavForUser(username) {
    const cleanName = username.split(" ")[0];
    el.btnAuthNav.textContent = `Sign Out (${cleanName})`;
    el.btnAuthNav.className = "btn-auth-outline active-session";
}

// Sync user data (credits & subscription) with Firestore via real-time listener
function syncUserDataWithFirestore(user) {
    if (!db) {
        state.credits = 5;
        state.subscriptionStatus = "free";
        updateCreditsUI();
        return;
    }
    
    const userDocRef = doc(db, "users", user.uid);
    
    // Clean up any existing listener first
    if (unsubscribeCredits) {
        unsubscribeCredits();
        unsubscribeCredits = null;
    }
    
    unsubscribeCredits = onSnapshot(userDocRef, async (docSnap) => {
        let isNewUser = false;
        if (docSnap.exists()) {
            const data = docSnap.data();
            state.credits = data.credits !== undefined ? data.credits : 5;
            state.subscriptionStatus = data.subscriptionStatus || "free";
            state.isAdmin = data.isAdmin === true || user.email === 'admin@gmail.com';
            updateAdminUI();
            updateCreditsUI();
        } else {
            // First time logging in or missing server doc, create it with 5 credits
            isNewUser = true;
            try {
                const isAdminEmail = user.email === 'admin@gmail.com';
                
                // Immediately set state.credits to 5 and update UI to avoid race condition/delay
                state.credits = 5;
                state.subscriptionStatus = "free";
                state.isAdmin = isAdminEmail;
                updateAdminUI();
                updateCreditsUI();
                
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || "",
                    credits: 5,
                    subscriptionStatus: "free",
                    isAdmin: isAdminEmail,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            } catch (err) {
                console.warn("Failed to create user document in Firestore:", err);
            }
        }
        
        // Trigger welcome credits popup if this is a new user
        const welcomeShownKey = `pixelai_welcome_shown_${user.uid}`;
        if (isNewUser && !localStorage.getItem(welcomeShownKey)) {
            localStorage.setItem(welcomeShownKey, "true");
            showWelcomeCreditsPopup();
        }
    }, (err) => {
        console.warn("Real-time credits sync listener failed:", err);
    });
}

// Centered credit deduction using Firestore Transactions
async function deductCreditTransaction(uid, actionName) {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const userDocRef = doc(db, "users", uid);
    const transactionCollRef = collection(db, "credit_transactions");
    const newTxDocRef = doc(transactionCollRef); // Auto-ID document reference
    
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
            throw new Error("User profile not found in database.");
        }
        
        const currentCredits = userDoc.data().credits !== undefined ? userDoc.data().credits : 5;
        if (currentCredits < 1) {
            throw new Error("Insufficient credits.");
        }
        
        // 1. Decrement user's credits
        transaction.update(userDocRef, {
            credits: currentCredits - 1,
            updatedAt: Date.now()
        });
        
        // 2. Write new log to credit_transactions
        transaction.set(newTxDocRef, {
            userId: uid,
            action: actionName,
            creditsUsed: 1,
            timestamp: Date.now()
        });
    });
}

// Centered credit refund using Firestore Transactions (in case generation fails)
async function refundCreditTransaction(uid, actionName) {
    if (!db) return;
    try {
        const userDocRef = doc(db, "users", uid);
        const transactionCollRef = collection(db, "credit_transactions");
        const newTxDocRef = doc(transactionCollRef);
        
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (userDoc.exists()) {
                const currentCredits = userDoc.data().credits !== undefined ? userDoc.data().credits : 5;
                transaction.update(userDocRef, {
                    credits: currentCredits + 1,
                    updatedAt: Date.now()
                });
                transaction.set(newTxDocRef, {
                    userId: uid,
                    action: actionName,
                    creditsUsed: -1, // negative implies refund / credit increment
                    timestamp: Date.now()
                });
            }
        });
        console.log("Credit transaction successfully refunded.");
    } catch (err) {
        console.warn("Failed to refund credit transaction:", err);
    }
}

async function updateUserSubscriptionInFirestore(uid, subscriptionStatus) {
    if (!db) return;
    try {
        const userDocRef = doc(db, "users", uid);
        await setDoc(userDocRef, { subscriptionStatus, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
        console.warn("Failed to update subscription in Firestore:", err);
    }
}

// ==========================================================================
// AUTHENTICATION SUBMIT HANDLERS
// ==========================================================================

function openAuthModal(defaultView = "login") {
    el.authModal.classList.remove("hide");
    toggleAuthForm(defaultView);
}

function closeAuthModal() {
    el.authModal.classList.add("hide");
    el.loginEmail.value = "";
    el.loginPassword.value = "";
    el.signupName.value = "";
    el.signupEmail.value = "";
    el.signupPassword.value = "";
}

function toggleAuthForm(formType) {
    if (formType === "login") {
        el.formLoginView.classList.remove("hide");
        el.formSignupView.classList.add("hide");
    } else {
        el.formLoginView.classList.add("hide");
        el.formSignupView.classList.remove("hide");
    }
}

function updateCreditsUI() {
    if (state.isLoggedIn) {
        if (el.navUserStats) el.navUserStats.classList.remove("hide");
        
        const isPro = state.subscriptionStatus === "pro";
        
        // Update nav elements
        if (isPro) {
            if (el.navCreditsCount) el.navCreditsCount.textContent = "∞";
            if (el.navProBadge) el.navProBadge.classList.remove("hide");
        } else {
            if (el.navCreditsCount) el.navCreditsCount.textContent = state.credits;
            if (el.navProBadge) el.navProBadge.classList.add("hide");
        }
        
        // Update studio panel elements
        if (el.studioCreditsDisplay) {
            el.studioCreditsDisplay.textContent = isPro ? "Unlimited" : `${state.credits} Credits`;
        }
        
        if (el.studioPlanBadge) {
            if (isPro) {
                el.studioPlanBadge.className = "plan-badge-pro";
                el.studioPlanBadge.textContent = "Pro Plan";
            } else {
                el.studioPlanBadge.className = "plan-badge-free";
                el.studioPlanBadge.textContent = "Free Plan";
            }
        }
        
        if (el.btnUpgradeStudio) {
            el.btnUpgradeStudio.innerHTML = isPro ? '<i class="ri-settings-4-line"></i> Manage' : '<i class="ri-vip-crown-line"></i> Upgrade';
        }
    } else {
        if (el.navUserStats) el.navUserStats.classList.add("hide");
    }
}

function updateAdminUI() {
    if (state.isLoggedIn && state.isAdmin) {
        if (el.linkAdmin) el.linkAdmin.classList.remove("hide");
        if (el.adminRemainingCredits) {
            const isPro = state.subscriptionStatus === "pro";
            el.adminRemainingCredits.textContent = isPro ? "Unlimited" : `${state.credits} Credits`;
        }
    } else {
        if (el.linkAdmin) el.linkAdmin.classList.add("hide");
    }
}

async function renderAdminPage() {
    if (!state.isAdmin) return;
    try {
        el.adminUsersTable.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px;"><i class="ri-loader-4-line spin"></i> Loading users directory...</td></tr>`;
        
        const usersColl = collection(db, "users");
        const snapshot = await getDocs(usersColl);
        
        el.adminUsersTable.innerHTML = "";
        
        if (snapshot.empty) {
            el.adminUsersTable.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">No users registered in the database.</td></tr>`;
            return;
        }
        
        snapshot.forEach(docSnap => {
            const userData = docSnap.data();
            const uid = docSnap.id;
            
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
            
            // Bind actions
            row.querySelector(".btn-admin-add").addEventListener("click", () => handleAdminAddCredits(uid, userData.email || 'user', userData.credits));
            row.querySelector(".btn-admin-remove").addEventListener("click", () => handleAdminRemoveCredits(uid, userData.email || 'user', userData.credits));
            row.querySelector(".btn-admin-toggle").addEventListener("click", () => handleAdminToggleSubscription(uid, userData.subscriptionStatus || 'free'));
            
            el.adminUsersTable.appendChild(row);
        });
    } catch (err) {
        console.error("Admin view loading failure:", err);
        el.adminUsersTable.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #db4437;"><i class="ri-error-warning-line"></i> Failed to query users: ${err.message}</td></tr>`;
    }
}

async function handleAdminAddCredits(uid, email, currentCredits = 5) {
    const amountStr = prompt(`Enter the number of credits you want to ADD to ${email}:`, "10");
    if (amountStr === null) return; // cancel
    
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid positive number of credits.", "info");
        return;
    }
    
    showToast("Adding credits...", "info");
    try {
        const userRef = doc(db, "users", uid);
        const transactionCollRef = collection(db, "credit_transactions");
        const newTxDocRef = doc(transactionCollRef);
        
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User does not exist.");
            }
            const credits = userDoc.data().credits !== undefined ? userDoc.data().credits : 5;
            transaction.update(userRef, {
                credits: credits + amount,
                updatedAt: Date.now()
            });
            transaction.set(newTxDocRef, {
                userId: uid,
                action: "admin_add_credits",
                creditsUsed: -amount, // Negative indicates refund / balance increment
                timestamp: Date.now()
            });
        });
        showToast(`Successfully added ${amount} credits to ${email}`, "success");
        renderAdminPage();
    } catch (err) {
        console.error("Admin add credits transaction failure:", err);
        showToast(`Failed to add credits: ${err.message}`, "info");
    }
}

async function handleAdminRemoveCredits(uid, email, currentCredits = 5) {
    const amountStr = prompt(`Enter the number of credits you want to REMOVE from ${email}:`, "10");
    if (amountStr === null) return; // cancel
    
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid positive number of credits.", "info");
        return;
    }
    
    showToast("Removing credits...", "info");
    try {
        const userRef = doc(db, "users", uid);
        const transactionCollRef = collection(db, "credit_transactions");
        const newTxDocRef = doc(transactionCollRef);
        
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User does not exist.");
            }
            const credits = userDoc.data().credits !== undefined ? userDoc.data().credits : 5;
            const newCredits = Math.max(0, credits - amount);
            
            transaction.update(userRef, {
                credits: newCredits,
                updatedAt: Date.now()
            });
            transaction.set(newTxDocRef, {
                userId: uid,
                action: "admin_remove_credits",
                creditsUsed: credits - newCredits, // Positive represents cost/deduction
                timestamp: Date.now()
            });
        });
        showToast(`Successfully removed credits from ${email}`, "success");
        renderAdminPage();
    } catch (err) {
        console.error("Admin remove credits transaction failure:", err);
        showToast(`Failed to remove credits: ${err.message}`, "info");
    }
}

async function handleAdminToggleSubscription(uid, currentStatus = "free") {
    const newStatus = currentStatus === "pro" ? "free" : "pro";
    showToast(`Toggling plan to ${newStatus.toUpperCase()}...`, "info");
    try {
        const userRef = doc(db, "users", uid);
        const transactionCollRef = collection(db, "credit_transactions");
        const newTxDocRef = doc(transactionCollRef);
        
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User does not exist.");
            }
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
        showToast(`Successfully toggled subscription for user to ${newStatus.toUpperCase()}`, "success");
        renderAdminPage();
    } catch (err) {
        console.error("Admin toggle subscription transaction failure:", err);
        showToast(`Failed to toggle plan: ${err.message}`, "info");
    }
}

function openSubscriptionModal() {
    if (!state.isLoggedIn) {
        openAuthModal("login");
        showToast("You must sign in to view pricing plans.", "info");
        return;
    }
    
    const isPro = state.subscriptionStatus === "pro";
    
    // Toggle active classes on cards
    if (isPro) {
        el.planCardFree.classList.remove("active");
        el.planCardPro.classList.add("active");
        el.planCardPro.classList.add("active-pro");
        el.btnSubscribePro.classList.add("hide");
        el.btnCancelPro.classList.remove("hide");
    } else {
        el.planCardFree.classList.add("active");
        el.planCardPro.classList.remove("active");
        el.planCardPro.classList.remove("active-pro");
        el.btnSubscribePro.classList.remove("hide");
        el.btnCancelPro.classList.add("hide");
    }
    
    el.subscriptionModal.classList.remove("hide");
}

function closeSubscriptionModal() {
    el.subscriptionModal.classList.add("hide");
}

let welcomeCreditsTimeout = null;

function showWelcomeCreditsPopup() {
    if (el.welcomeCreditsModal) {
        el.welcomeCreditsModal.classList.remove("hide");
        
        // Reset the progress bar animation
        const progressEl = document.getElementById("welcome-credits-progress");
        if (progressEl) {
            progressEl.style.animation = 'none';
            progressEl.offsetHeight; // trigger reflow
            progressEl.style.animation = 'shrinkProgress 5s linear forwards';
        }
        
        if (welcomeCreditsTimeout) clearTimeout(welcomeCreditsTimeout);
        
        welcomeCreditsTimeout = setTimeout(() => {
            closeWelcomeCreditsPopup();
        }, 5000);
    }
}

function closeWelcomeCreditsPopup() {
    if (el.welcomeCreditsModal) {
        el.welcomeCreditsModal.classList.add("hide");
    }
    if (welcomeCreditsTimeout) {
        clearTimeout(welcomeCreditsTimeout);
        welcomeCreditsTimeout = null;
    }
}

function startRazorpayCheckout() {
    if (!state.isLoggedIn || !auth.currentUser) {
        openAuthModal("login");
        showToast("You must sign in to subscribe.", "info");
        return;
    }
    
    showToast("Connecting to Razorpay...", "info");
    
    const options = {
        "key": "rzp_test_T3eWLzmc2b5Cbc",
        "amount": "10000", // ₹100 = 10000 Paise
        "currency": "INR",
        "name": "PixelAI Studio",
        "description": "Pro Creator Subscription Plan",
        "image": "https://cdn.jsdelivr.net/npm/remixicon@3.5.0/icons/logos/google-fill.svg",
        "handler": function (response) {
            if (response && response.razorpay_payment_id) {
                handleRazorpaySuccess(response.razorpay_payment_id);
            }
        },
        "prefill": {
            "name": state.currentUser || "Guest User",
            "email": auth.currentUser.email || "guest@example.com"
        },
        "theme": {
            "color": "#1a73e8"
        }
    };
    
    try {
        const rzp = new Razorpay(options);
        rzp.open();
    } catch (err) {
        console.error("Razorpay loading error: ", err);
        showToast("Failed to initialize Razorpay checkout.", "info");
    }
}

function handleRazorpaySuccess(paymentId) {
    state.subscriptionStatus = "pro";
    localStorage.setItem(`pixelai_subscription_${auth.currentUser.uid}`, "pro");
    localStorage.setItem(`pixelai_payment_id_${auth.currentUser.uid}`, paymentId);
    
    updateCreditsUI();
    closeSubscriptionModal();
    showToast(`Payment successful! ID: ${paymentId}. Welcome to Pro Creator.`, "success");
    
    updateUserSubscriptionInFirestore(auth.currentUser.uid, "pro");
}

function handleCancelSubscription() {
    if (!auth.currentUser) return;
    
    if (confirm("Are you sure you want to cancel your Pro plan subscription? You will return to the Free plan with your existing credits.")) {
        state.subscriptionStatus = "free";
        localStorage.setItem(`pixelai_subscription_${auth.currentUser.uid}`, "free");
        
        updateCreditsUI();
        closeSubscriptionModal();
        showToast("Pro subscription cancelled successfully.", "info");
        
        updateUserSubscriptionInFirestore(auth.currentUser.uid, "free");
    }
}

// ==========================================================================
// USER PROFILE SETTINGS & HISTORIES RENDERERS
// ==========================================================================

function renderProfilePage() {
    if (!auth.currentUser) return;
    
    const user = auth.currentUser;
    el.profileDisplayName.textContent = user.displayName || "Studio Creator";
    el.profileDisplayEmail.textContent = user.email;
    el.updateName.value = user.displayName || "";

    const isPro = state.subscriptionStatus === "pro";
    if (isPro) {
        el.profileDisplayBadge.className = "plan-badge-pro";
        el.profileDisplayBadge.textContent = "Pro Plan";
    } else {
        el.profileDisplayBadge.className = "plan-badge-free";
        el.profileDisplayBadge.textContent = "Free Plan";
    }

    // Fetch and render generation history
    getGenerationHistory(user.uid).then(historyItems => {
        el.historyGrid.innerHTML = "";
        
        if (historyItems.length === 0) {
            el.historyGrid.innerHTML = `
                <div class="history-empty-state">
                    <i class="ri-image-line"></i>
                    <p>Your generated visual creations will appear here.</p>
                </div>
            `;
            return;
        }

        historyItems.forEach(item => {
            const itemEl = document.createElement("div");
            itemEl.className = "history-item";
            
            const formattedDate = new Date(item.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            itemEl.innerHTML = `
                <div class="history-img-box">
                    <img src="${item.imageData}" alt="Generated AI artwork">
                </div>
                <div class="history-info">
                    <p class="history-prompt" title="${item.prompt}">${item.prompt}</p>
                    <div class="history-meta">
                        <span class="history-style">${item.category === "none" ? "Default" : item.category}</span>
                        <span>${formattedDate}</span>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="btn-history-action btn-hist-download" data-id="${item.id}">
                        <i class="ri-download-2-line"></i> Download
                    </button>
                    <button class="btn-history-action btn-hist-copy" data-prompt="${item.prompt}">
                        <i class="ri-file-copy-line"></i> Copy
                    </button>
                </div>
            `;
            
            // Bind action buttons
            itemEl.querySelector(".btn-hist-download").addEventListener("click", () => {
                downloadBase64Image(item.imageData, item.prompt, item.seed);
            });
            itemEl.querySelector(".btn-hist-copy").addEventListener("click", () => {
                navigator.clipboard.writeText(item.prompt).then(() => {
                    showToast("Prompt copied to clipboard!", "success");
                });
            });

            el.historyGrid.appendChild(itemEl);
        });
    });
}

function downloadBase64Image(base64Data, prompt, seed) {
    try {
        const link = document.createElement("a");
        link.href = base64Data;
        const cleanPrompt = prompt.trim()
            .substring(0, 30)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
        link.download = `pixelai-studio-${cleanPrompt}-${seed || 'history'}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Image downloaded successfully!", "success");
    } catch (err) {
        console.error("History download failed:", err);
        showToast("Failed to download image", "info");
    }
}

function handleUpdateProfile(e) {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    const newName = el.updateName.value.trim();
    if (!newName) {
        showToast("Display name cannot be empty.", "info");
        return;
    }

    showToast("Saving settings...", "info");
    updateProfile(auth.currentUser, {
        displayName: newName
    }).then(() => {
        state.currentUser = newName;
        updateNavForUser(newName);
        el.profileDisplayName.textContent = newName;
        showToast("Profile settings updated successfully!", "success");
    }).catch(err => {
        console.error("Profile update error:", err);
        showToast("Failed to update profile settings.", "info");
    });
}

function handleClearHistory() {
    if (!auth.currentUser) return;
    if (confirm("Are you sure you want to clear your creation history? This action cannot be undone.")) {
        clearGenerationHistory(auth.currentUser.uid).then(success => {
            if (success) {
                renderProfilePage();
                showToast("Creation history cleared successfully.", "success");
            } else {
                showToast("Failed to clear creation history.", "info");
            }
        });
    }
}

function handleAuthNavClick() {
    if (state.isLoggedIn) {
        showToast("Signing out...", "info");
        signOut(auth)
            .then(() => {
                showToast("Signed out successfully", "info");
            })
            .catch((error) => {
                console.error("Sign out failure: ", error);
                showToast("Error signing out", "info");
            });
    } else {
        openAuthModal("login");
    }
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const email = el.loginEmail.value.trim().toLowerCase();
    const password = el.loginPassword.value;
    
    showToast("Signing in...", "info");
    
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            closeAuthModal();
            showToast(`Welcome back, ${userCredential.user.displayName || email}!`, "success");
            switchView("studio");
        })
        .catch((error) => {
            console.error("Login failure: ", error);
            let message = "Invalid email or password";
            if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
                message = "Invalid email or password.";
            } else if (error.code === "auth/invalid-email") {
                message = "Please enter a valid email address.";
            } else if (error.code === "auth/too-many-requests") {
                message = "Too many login attempts. Please try again later.";
            }
            showToast(message, "info");
        });
}

function triggerWelcomeEmail(email, name) {
    fetch('/api/send-welcome', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            name: name,
            origin: window.location.origin
        })
    }).then(res => res.json())
      .then(data => {
          if (data.success) {
              console.log('Welcome email dispatched successfully:', data);
          } else {
              console.warn('Failed to dispatch welcome email:', data.error);
          }
      })
      .catch(err => {
          console.error('Welcome email dispatch error:', err);
      });
}

function handleSignupSubmit(e) {
    e.preventDefault();
    const name = el.signupName.value.trim();
    const email = el.signupEmail.value.trim().toLowerCase();
    const password = el.signupPassword.value;
    
    showToast("Creating account...", "info");
    
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            return updateProfile(userCredential.user, {
                displayName: name
            }).then(() => {
                closeAuthModal();
                showToast(`Welcome, ${name}! Account registered.`, "success");
                switchView("studio");
                
                // Trigger welcome email dispatch
                triggerWelcomeEmail(email, name);
            });
        })
        .catch((error) => {
            console.error("Signup failure: ", error);
            let message = "Failed to create account.";
            if (error.code === "auth/email-already-in-use") {
                message = "Email address already registered.";
            } else if (error.code === "auth/weak-password") {
                message = "Password should be at least 6 characters.";
            } else if (error.code === "auth/invalid-email") {
                message = "Please enter a valid email address.";
            }
            showToast(message, "info");
        });
}



// ==========================================================================
// IMAGE GENERATION MODULE
// ==========================================================================

async function generateImage() {
    if (!state.isLoggedIn) {
        openAuthModal("login");
        showToast("You must sign in to generate images.", "info");
        return;
    }

    const isPro = state.subscriptionStatus === "pro";
    if (!isPro && state.credits <= 0) {
        showToast("You have run out of free generation credits.", "info");
        openSubscriptionModal();
        return;
    }

    const rawPrompt = el.promptInput.value.trim();
    if (!rawPrompt) {
        el.promptInput.parentElement.style.borderColor = "#db4437";
        setTimeout(() => {
            el.promptInput.parentElement.style.borderColor = "";
        }, 1200);
        el.promptInput.focus();
        showToast("Please enter a valid prompt", "info");
        return;
    }

    if (state.isGenerating) return;
    state.isGenerating = true;

    // Deduct credit using Firestore Transaction (Free tier only)
    if (!isPro) {
        try {
            showToast("Checking and deducting credit...", "info");
            await deductCreditTransaction(auth.currentUser.uid, "image_generation");
        } catch (err) {
            console.error("Credit transaction failed:", err);
            showToast(err.message || "Failed to deduct credit.", "info");
            state.isGenerating = false;
            return;
        }
    } else {
        // Log Pro generation for audit trail (0 credits)
        try {
            const transactionCollRef = collection(db, "credit_transactions");
            const newTxDocRef = doc(transactionCollRef);
            await setDoc(newTxDocRef, {
                userId: auth.currentUser.uid,
                action: "image_generation_pro",
                creditsUsed: 0,
                timestamp: Date.now()
            });
        } catch (err) {
            console.warn("Failed to write pro audit log:", err);
        }
    }

    state.prompt = rawPrompt;
    state.seed = Math.floor(Math.random() * 999999999);

    // Update UI states
    showCanvasState("loading");
    el.imageFrame.classList.add("loading-active");
    el.actionButtons.classList.add("hide");
    el.generateBtn.disabled = true;
    el.generateBtn.querySelector(".btn-text").textContent = "Creating Visual...";
    
    showToast("Launching neural image generation...", "info");

    // Setup dynamic loading logs rotation
    let logIdx = 0;
    el.logText.textContent = NEURAL_LOGS[0];
    const logInterval = setInterval(() => {
        if (!state.isGenerating) {
            clearInterval(logInterval);
            return;
        }
        logIdx = (logIdx + 1) % NEURAL_LOGS.length;
        el.logText.textContent = NEURAL_LOGS[logIdx];
    }, 2500);

    // Build final category-based prompt
    let finalPrompt = state.prompt;
    if (state.category && CATEGORY_PROMPTS[state.category]) {
        finalPrompt += CATEGORY_PROMPTS[state.category];
    }
    
    // Add sky blue and white defaults
    finalPrompt += ", sky blue and white accents, high quality, masterpiece, detailed rendering";

    // Setup Clipdrop request parameters
    const formData = new FormData();
    formData.append("prompt", finalPrompt);

    const apiPromise = fetch("https://clipdrop-api.co/text-to-image/v1", {
        method: "POST",
        headers: {
            "x-api-key": "2a67157b582234dae3ae8f76a8988190bfeef42d735ee367b3903649f6d289a3fc2b53bb5d432e3bafc42816e265f53c"
        },
        body: formData
    });
    
    // Timeout handler (Clipdrop should complete within 25 seconds)
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Clipdrop API request timed out")), 25000);
    });

    const runFetchPromise = apiPromise.then(async (response) => {
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Clipdrop API error (${response.status}): ${errText || response.statusText}`);
        }
        return response.blob();
    });

    Promise.race([runFetchPromise, timeoutPromise])
        .then((blob) => {
            clearInterval(logInterval);
            
            // Clean up old object URL if any to prevent memory leaks
            if (state.currentImageUrl && state.currentImageUrl.startsWith("blob:")) {
                URL.revokeObjectURL(state.currentImageUrl);
            }
            
            const objectUrl = URL.createObjectURL(blob);
            state.currentImageUrl = objectUrl;
            el.outputImage.src = objectUrl;
            showCanvasState("loaded");
            el.imageFrame.classList.remove("loading-active");
            el.actionButtons.classList.remove("hide");
            
            showToast("Visual generated successfully!", "success");

            // Save to IndexedDB local history
            saveGenerationToHistory(auth.currentUser.uid, state.prompt, state.category, state.seed, blob);

            // Clean up button state
            state.isGenerating = false;
            el.generateBtn.disabled = false;
            el.generateBtn.querySelector(".btn-text").textContent = "Generate Image";
        })
        .catch(async (error) => {
            clearInterval(logInterval);
            console.error("AI Image generation failure: ", error);
            showCanvasState("error");
            el.imageFrame.classList.remove("loading-active");
            
            // Refund the credit (Free tier only)
            if (!isPro) {
                showToast("Generation failed. Refunding credit...", "info");
                await refundCreditTransaction(auth.currentUser.uid, "image_generation_refund");
            } else {
                showToast("Failed to generate image. Please try again.", "info");
            }

            state.isGenerating = false;
            el.generateBtn.disabled = false;
            el.generateBtn.querySelector(".btn-text").textContent = "Generate Image";
        });
}

// Show specific canvas preview states
function showCanvasState(stateName) {
    el.stateEmpty.classList.add("hide");
    el.stateLoading.classList.add("hide");
    el.stateError.classList.add("hide");
    el.imageWrapper.classList.add("hide");

    if (stateName === "empty") el.stateEmpty.classList.remove("hide");
    else if (stateName === "loading") el.stateLoading.classList.remove("hide");
    else if (stateName === "error") el.stateError.classList.remove("hide");
    else if (stateName === "loaded") el.imageWrapper.classList.remove("hide");
}

// Download image from client side using browser blobs
async function downloadImage() {
    if (!state.currentImageUrl) return;

    const originalText = el.downloadBtn.innerHTML;
    el.downloadBtn.innerHTML = '<i class="ri-loader-4-line spin"></i> Downloading...';
    el.downloadBtn.disabled = true;
    showToast("Preparing your file download...", "info");

    try {
        const response = await fetch(state.currentImageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = blobUrl;
        
        // Clean prompt name for filename
        const cleanPrompt = state.prompt.trim()
            .substring(0, 30)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
            
        link.download = `pixelai-studio-${cleanPrompt}-${state.seed}.jpg`;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        showToast("Image downloaded successfully!", "success");
    } catch (err) {
        console.error("Download error:", err);
        window.open(state.currentImageUrl, "_blank");
        showToast("Opened download link in a new window", "info");
    } finally {
        el.downloadBtn.innerHTML = originalText;
        el.downloadBtn.disabled = false;
    }
}

// Copy prompt to clipboard
function copyPrompt() {
    if (!state.prompt) return;
    navigator.clipboard.writeText(state.prompt)
        .then(() => {
            showToast("Prompt copied to clipboard!", "success");
        })
        .catch(err => {
            console.error("Copy failed: ", err);
            showToast("Unable to copy prompt", "info");
        });
}

// Boot up
if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
