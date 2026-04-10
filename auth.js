import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
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

const dom = {
  googleSignInBtn: document.getElementById("googleSignInBtn"),
  authStatus: document.getElementById("authStatus"),
};

dom.googleSignInBtn.addEventListener("click", handleGoogleSignIn);
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.replace("/game");
  }
});

async function handleGoogleSignIn() {
  try {
    dom.authStatus.textContent = "Opening Google sign-in...";
    await signInWithPopup(auth, provider);
    window.location.replace("/game");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in failed.";
    dom.authStatus.textContent = message.replace(/^Firebase:\s*/i, "").trim();
  }
}
