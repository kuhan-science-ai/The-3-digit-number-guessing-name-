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
  return {
    apiKey: "AIzaSyASRaubwlYzbd5kcgQ-ZYxqD2YHI2-aaZo",
    authDomain: "the-number-guessing-game-dbdab.firebaseapp.com",
    projectId: "the-number-guessing-game-dbdab",
    storageBucket: "the-number-guessing-game-dbdab.firebasestorage.app",
    messagingSenderId: "44554448991",
    appId: "1:44554448991:web:d137f2e3c7ce6f56b0abea",
    measurementId: "G-QJWQYZ7GFE",
  };
}

const auth = getAuth(initializeApp(getFirebaseConfig()));
const provider = new GoogleAuthProvider();
let isSigningIn = false;
let checkedRedirectResult = false;

const dom = {
  googleSignInBtn: document.getElementById("googleSignInBtn"),
  authStatus: document.getElementById("authStatus"),
};

function setAuthStatus(message, pending = false) {
  dom.authStatus.textContent = message;
  dom.googleSignInBtn.disabled = pending;
  dom.googleSignInBtn.textContent = pending ? "Opening Google..." : "Continue with Google";
}

function shouldUseRedirectSignIn() {
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return Boolean(coarsePointer || mobileUserAgent);
}

function getFriendlyAuthMessage(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  const rawMessage = error instanceof Error ? error.message : "";

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

  if (code === "auth/argument-error" && /initial state/i.test(rawMessage)) {
    return "Mobile sign-in lost its saved state. Try again and keep this tab open until Google sends you back.";
  }

  if (code === "auth/unauthorized-domain") {
    return `Firebase has not authorized ${window.location.hostname} yet. Add it in Firebase Authentication -> Settings -> Authorized domains.`;
  }

  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled in Firebase Authentication yet.";
  }

  if (code === "auth/invalid-credential" || code === "auth/invalid-api-key") {
    return "Firebase sign-in settings are invalid. Check the Firebase web app config.";
  }

  if (/redirect_uri_mismatch/i.test(rawMessage)) {
    return "Google sign-in is almost ready. Add this redirect URI in Google Cloud: https://the-3-digit-number-guessing-game.onrender.com/__/auth/handler";
  }

  return (rawMessage || "Google sign-in failed.").replace(/^Firebase:\s*/i, "").trim();
}

async function prepareAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Keep going with default persistence if the browser blocks local persistence.
  }
}

async function finishRedirectSignIn() {
  try {
    setAuthStatus("Checking Google sign-in...", true);
    const result = await getRedirectResult(auth);
    checkedRedirectResult = true;

    if (result?.user) {
      setAuthStatus("Signed in. Sending you to the game...", true);
      window.location.replace("/game");
      return;
    }

    if (!auth.currentUser) {
      setAuthStatus("Use Google for saved identity, or jump in instantly as a guest.", false);
    }
  } catch (error) {
    checkedRedirectResult = true;
    setAuthStatus(getFriendlyAuthMessage(error), false);
  }
}

if (dom.googleSignInBtn) {
  dom.googleSignInBtn.addEventListener("click", handleGoogleSignIn);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    setAuthStatus("Signed in. Sending you to the game...", true);
    window.location.replace("/game");
    return;
  }

  if (!isSigningIn && checkedRedirectResult) {
    setAuthStatus("Use Google for saved identity, or jump in instantly as a guest.", false);
  }
});

async function handleGoogleSignIn() {
  if (isSigningIn) {
    setAuthStatus("A Google sign-in flow is already opening. Wait for it to finish.", true);
    return;
  }

  isSigningIn = true;
  setAuthStatus("Opening Google sign-in...", true);

  try {
    if (shouldUseRedirectSignIn()) {
      await signInWithRedirect(auth, provider);
      return;
    }

    await signInWithPopup(auth, provider);
    setAuthStatus("Signed in. Sending you to the game...", true);
    window.location.replace("/game");
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "";
    if (["auth/popup-blocked", "auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(code)) {
      try {
        setAuthStatus("Popup did not work. Redirecting to Google instead...", true);
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        setAuthStatus(getFriendlyAuthMessage(redirectError), false);
        isSigningIn = false;
        return;
      }
    }

    setAuthStatus(getFriendlyAuthMessage(error), false);
    isSigningIn = false;
  }
}

prepareAuth().then(finishRedirectSignIn);
