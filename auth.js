import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
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
    return "A Google sign-in window is already open. Finish that popup first.";
  }

  if (code === "auth/popup-closed-by-user") {
    return "You closed the Google sign-in window before finishing.";
  }

  if (code === "auth/network-request-failed") {
    return "Network issue while signing in. Check your internet connection and try again.";
  }

  const message = error instanceof Error ? error.message : "Google sign-in failed.";
  return message.replace(/^Firebase:\s*/i, "").trim();
}

if (dom.googleSignInBtn) {
  dom.googleSignInBtn.addEventListener("click", handleGoogleSignIn);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    setAuthStatus("Signed in. Sending you to the game...", true);
    window.location.replace("/game");
  }
});

async function handleGoogleSignIn() {
  if (isSigningIn) {
    setAuthStatus("A Google sign-in window is already opening. Finish that popup first.", true);
    return;
  }

  isSigningIn = true;
  setAuthStatus("Opening Google sign-in...", true);

  try {
    await signInWithPopup(auth, provider);
    setAuthStatus("Signed in. Sending you to the game...", true);
    window.location.replace("/game");
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "";

    if (code === "auth/popup-blocked") {
      setAuthStatus("Popup blocked. Redirecting to Google sign-in...", true);
      await signInWithRedirect(auth, provider);
      return;
    }

    setAuthStatus(getFriendlyAuthMessage(error), false);
    isSigningIn = false;
    return;
  }
}
