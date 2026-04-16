import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyASRaubwlYzbd5kcgQ-ZYxqD2YHI2-aaZo",
  authDomain: "the-number-guessing-game-dbdab.firebaseapp.com",
  projectId: "the-number-guessing-game-dbdab",
  storageBucket: "the-number-guessing-game-dbdab.firebasestorage.app",
  messagingSenderId: "44554448991",
  appId: "1:44554448991:web:d137f2e3c7ce6f56b0abea",
  measurementId: "G-QJWQYZ7GFE",
};

const auth = getAuth(initializeApp(firebaseConfig));
const provider = new GoogleAuthProvider();
const AUTH_REDIRECT_FLAG = "number-guessing-game-auth-redirect";
let isSigningIn = false;

const dom = {
  googleSignInBtn: document.getElementById("googleSignInBtn"),
  authStatus: document.getElementById("authStatus"),
};

function setAuthStatus(message, pending = false) {
  dom.authStatus.textContent = message;
  dom.googleSignInBtn.disabled = pending;
  dom.googleSignInBtn.textContent = pending ? "Opening Google..." : "Continue with Google";
}

function setRedirectFlag() {
  sessionStorage.setItem(AUTH_REDIRECT_FLAG, "1");
}

function clearRedirectFlag() {
  sessionStorage.removeItem(AUTH_REDIRECT_FLAG);
}

function prefersRedirectFlow() {
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

function getFriendlyAuthMessage(error) {
  const code = typeof error?.code === "string" ? error.code : "";

  if (code === "auth/cancelled-popup-request") {
    return "The popup sign-in was interrupted. Redirect sign-in is safer on this deployed site, so try again once.";
  }

  if (code === "auth/popup-closed-by-user") {
    return "You closed the Google sign-in window before finishing.";
  }

  if (code === "auth/network-request-failed") {
    return "Network issue while signing in. Check your internet connection and try again.";
  }

  if (code === "auth/unauthorized-domain") {
    return `Firebase has not authorized ${window.location.hostname} yet. Add it in Firebase Authentication -> Settings -> Authorized domains.`;
  }

  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled in Firebase Authentication yet.";
  }

  const message = error instanceof Error ? error.message : "Google sign-in failed.";
  return message.replace(/^Firebase:\s*/i, "").trim();
}

if (dom.googleSignInBtn) {
  dom.googleSignInBtn.addEventListener("click", handleGoogleSignIn);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    clearRedirectFlag();
    setAuthStatus("Signed in. Sending you to the game...", true);
    window.location.replace("/game");
  }
});

async function prepareAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Keep going with default persistence if the browser blocks local persistence.
  }

  const wasRedirecting = sessionStorage.getItem(AUTH_REDIRECT_FLAG) === "1";
  if (wasRedirecting) {
    setAuthStatus("Finishing Google sign-in...", true);
  }

  try {
    const result = await getRedirectResult(auth);
    clearRedirectFlag();

    if (result?.user) {
      setAuthStatus("Signed in. Sending you to the game...", true);
      window.location.replace("/game");
      return;
    }

    if (wasRedirecting) {
      setAuthStatus("Google sign-in did not complete. Try again.", false);
    }
  } catch (error) {
    clearRedirectFlag();
    setAuthStatus(getFriendlyAuthMessage(error), false);
  }
}

async function startRedirectSignIn(message) {
  setRedirectFlag();
  setAuthStatus(message, true);

  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    clearRedirectFlag();
    setAuthStatus(getFriendlyAuthMessage(error), false);
    isSigningIn = false;
  }
}

async function handleGoogleSignIn() {
  if (isSigningIn) {
    setAuthStatus("A Google sign-in flow is already starting. Finish that first.", true);
    return;
  }

  isSigningIn = true;

  if (prefersRedirectFlow()) {
    await startRedirectSignIn("Redirecting to Google sign-in...");
    return;
  }

  setAuthStatus("Opening Google sign-in...", true);

  try {
    await signInWithPopup(auth, provider);
    setAuthStatus("Signed in. Sending you to the game...", true);
    window.location.replace("/game");
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "";

    if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
      await startRedirectSignIn("Popup sign-in had trouble. Redirecting to Google sign-in...");
      return;
    }

    setAuthStatus(getFriendlyAuthMessage(error), false);
    isSigningIn = false;
  }
}

prepareAuth();
