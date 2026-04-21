import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
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

const dom = {
  googleSignInBtn: document.getElementById("googleSignInBtn"),
  authStatus: document.getElementById("authStatus"),
};

function setAuthStatus(message, pending = false) {
  dom.authStatus.textContent = message;
  dom.googleSignInBtn.disabled = pending;
  dom.googleSignInBtn.textContent = pending ? "Opening Google..." : "Continue with Google";
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

  if (code === "auth/invalid-credential" || code === "auth/invalid-api-key") {
    return "Firebase sign-in settings are invalid. Check the Firebase web app config.";
  }

  const message = error instanceof Error ? error.message : "Google sign-in failed.";
  if (/redirect_uri_mismatch/i.test(message)) {
    return "Google rejected the sign-in redirect. Use popup sign-in and add your website domain in Firebase Authentication -> Settings -> Authorized domains.";
  }

  return message.replace(/^Firebase:\s*/i, "").trim();
}

async function prepareAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Keep going with default persistence if the browser blocks local persistence.
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
  setAuthStatus("Opening Google sign-in...", true);

  try {
    await signInWithPopup(auth, provider);
    setAuthStatus("Signed in. Sending you to the game...", true);
    window.location.replace("/game");
  } catch (error) {
    setAuthStatus(getFriendlyAuthMessage(error), false);
    isSigningIn = false;
  }
}

prepareAuth();
