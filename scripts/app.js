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
    
    // Credits & Subscription States
    credits: 0,
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
    get planCardPro() { return document.getElementById("plan-card-pro"); }
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

function saveGenerationToHistory(uid, prompt, category, seed, blob) {
    if (!dbConnection) return;
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
        try {
            const base64Data = reader.result;
            const transaction = dbConnection.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const item = {
                id: `${uid}_${Date.now()}`,
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

function getGenerationHistory(uid) {
    return new Promise((resolve) => {
        if (!dbConnection) return resolve([]);
        try {
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
        } catch (e) {
            console.warn("IndexedDB read error:", e);
            resolve([]);
        }
    });
}

function clearGenerationHistory(uid) {
    return new Promise((resolve) => {
        if (!dbConnection) return resolve(false);
        try {
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
        } catch (e) {
            console.warn("IndexedDB delete error:", e);
            resolve(false);
        }
    });
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
    onAuthStateChanged(auth, (user) => {
        if (user) {
            state.isLoggedIn = true;
            state.currentUser = user.displayName || user.email;
            
            // Initialize credits for new user
            const creditKey = `pixelai_credits_${user.uid}`;
            let userCredits = localStorage.getItem(creditKey);
            if (userCredits === null) {
                userCredits = "5";
                localStorage.setItem(creditKey, userCredits);
            }
            state.credits = parseInt(userCredits, 10);
            
            // Initialize subscription status
            const subKey = `pixelai_subscription_${user.uid}`;
            state.subscriptionStatus = localStorage.getItem(subKey) || "free";
            
            // Show profile navigation link
            if (el.linkProfile) el.linkProfile.classList.remove("hide");
            
            updateNavForUser(state.currentUser);
            updateCreditsUI();
        } else {
            state.isLoggedIn = false;
            state.currentUser = null;
            state.credits = 0;
            state.subscriptionStatus = "free";
            
            // Hide profile navigation link
            if (el.linkProfile) el.linkProfile.classList.add("hide");
            
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

    // Close mobile menu when switching views
    toggleMobileMenu(false);

    el.viewHome.classList.add("hide");
    el.viewStudio.classList.add("hide");
    el.viewProfile.classList.add("hide");
    
    el.linkHome.classList.remove("active");
    el.linkStudio.classList.remove("active");
    el.linkProfile.classList.remove("active");

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
}

function handleCancelSubscription() {
    if (!auth.currentUser) return;
    
    if (confirm("Are you sure you want to cancel your Pro plan subscription? You will return to the Free plan with your existing credits.")) {
        state.subscriptionStatus = "free";
        localStorage.setItem(`pixelai_subscription_${auth.currentUser.uid}`, "free");
        
        updateCreditsUI();
        closeSubscriptionModal();
        showToast("Pro subscription cancelled successfully.", "info");
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

function generateImage() {
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
            
            // Deduct credit if free tier
            if (!isPro) {
                state.credits = Math.max(0, state.credits - 1);
                localStorage.setItem(`pixelai_credits_${auth.currentUser.uid}`, state.credits.toString());
                updateCreditsUI();
            }
            
            showToast("Visual generated successfully!", "success");

            // Save to IndexedDB local history
            saveGenerationToHistory(auth.currentUser.uid, state.prompt, state.category, state.seed, blob);

            // Clean up button state
            state.isGenerating = false;
            el.generateBtn.disabled = false;
            el.generateBtn.querySelector(".btn-text").textContent = "Generate Image";
        })
        .catch((error) => {
            clearInterval(logInterval);
            console.error("AI Image generation failure: ", error);
            showCanvasState("error");
            el.imageFrame.classList.remove("loading-active");
            
            showToast("Failed to generate image. Please try again.", "info");

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
