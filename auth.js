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

function getFirebaseConfig() {
  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1";

  return {
    apiKey: "AIzaSyASRaubwlYzbd5kcgQ-ZYxqD2YHI2-aaZo",
    authDomain: isLocalHost ? "the-number-guessing-game-dbdab.firebaseapp.com" : window.location.host,
    projectId: "the-number-guessing-game-dbdab",
    storageBucket: "the-number-guessing-game-dbdab.firebasestorage.app",
    messagingSenderId: "44554448991",
    appId: "1:44554448991:web:d137f2e3c7ce6f56b0abea",
    measurementId: "G-QJWQYZ7GFE",
  };
}

const auth = getAuth(initializeApp(getFirebaseConfig()));
const provider = new GoogleAuthProvider();
const REDIRECT_FLAG = "number-guessing-game-mobile-auth-redirect";
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

function isMobileLikeDevice() {
  const ua = navigator.userAgent || "";
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  return coarsePointer || /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

function shouldUseRedirectFlow() {
  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  return !isLocalHost && isMobileLikeDevice();
}

function markRedirectStarted() {
  sessionStorage.setItem(REDIRECT_FLAG, "1");
}

function clearRedirectStarted() {
  sessionStorage.removeItem(REDIRECT_FLAG);
}

function getFriendlyAuthMessage(error) {
  const code = typeof error?.code === "string" ? error.code : "";

  if (code === "auth/cancelled-popup-request") {
    return "Another Google sign-in popup is already open. Close it, then try one click only.";
  }

  if (code === "auth/popup-blocked") {
    return "Your browser blocked the Google sign-in popup. Allow popups for this site and try again.";
  }

  if (code === "auth/popup-closed-by-user") {
    return "You closed the Google sign-in popup before finishing.";
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

async function prepareAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Keep going with default persistence if the browser blocks local persistence.
  }

  try {
    const result = await getRedirectResult(auth);
    clearRedirectStarted();

    if (result?.user) {
      setAuthStatus("Signed in. Sending you to the game...", true);
      window.location.replace("/game");
      return;
    }
  } catch (error) {
    clearRedirectStarted();
    setAuthStatus(getFriendlyAuthMessage(error), false);
    return;
  }

  if (sessionStorage.getItem(REDIRECT_FLAG) === "1") {
    clearRedirectStarted();
    setAuthStatus("Continue with Google to finish the sign-in on this device.", false);
  }
}

if (dom.googleSignInBtn) {
  dom.googleSignInBtn.addEventListener("click", handleGoogleSignIn);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    clearRedirectStarted();
    setAuthStatus("Signed in. Sending you to the game...", true);
    window.location.replace("/game");
    return;
  }

  if (!isSigningIn) {
    setAuthStatus("Use your Google account to unlock the number guessing game.", false);
  }
});

async function handleGoogleSignIn() {
  if (isSigningIn) {
    setAuthStatus("A Google sign-in flow is already opening. Wait for it to finish.", true);
    return;
  }

  isSigningIn = true;

  if (shouldUseRedirectFlow()) {
    markRedirectStarted();
    setAuthStatus("Redirecting to Google sign-in for mobile...", true);

    try {
      await signInWithRedirect(auth, provider);
      return;
    } catch (error) {
      clearRedirectStarted();
      setAuthStatus(getFriendlyAuthMessage(error), false);
      isSigningIn = false;
      return;
    }
  }

  setAuthStatus("Opening Google sign-in...", true);

  try {
    await signInWithPopup(auth, provider);
    setAuthStatus("Signed in. Sending you to the game...", true);
    window.location.replace("/game");
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "";

    if (code === "auth/popup-blocked" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      markRedirectStarted();
      setAuthStatus("Popup was blocked. Redirecting to Google sign-in...", true);

      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        clearRedirectStarted();
        setAuthStatus(getFriendlyAuthMessage(redirectError), false);
        isSigningIn = false;
        return;
      }
    }

    setAuthStatus(getFriendlyAuthMessage(error), false);
    isSigningIn = false;
  }
}

prepareAuth();
