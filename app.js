import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
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

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const dom = {
  guessForm: document.getElementById("guessForm"),
  guessInput: document.getElementById("guessInput"),
  guessButton: document.getElementById("guessButton"),
  newGameBtn: document.getElementById("newGameBtn"),
  authTitle: document.getElementById("authTitle"),
  authStatus: document.getElementById("authStatus"),
  googleSignInBtn: document.getElementById("googleSignInBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  statusText: document.getElementById("statusText"),
  historyList: document.getElementById("historyList"),
  attemptCount: document.getElementById("attemptCount"),
  winCelebration: document.getElementById("winCelebration"),
  celebrationText: document.getElementById("celebrationText"),
  celebrationCloseBtn: document.getElementById("celebrationCloseBtn"),
};

let secretNumber = generateSecretNumber();
let attempts = 0;
let currentUser = null;

init();

function init() {
  dom.guessForm.addEventListener("submit", handleGuessSubmit);
  dom.newGameBtn.addEventListener("click", resetGame);
  dom.celebrationCloseBtn.addEventListener("click", hideCelebration);
  dom.googleSignInBtn.addEventListener("click", handleGoogleSignIn);
  dom.signOutBtn.addEventListener("click", handleSignOut);
  onAuthStateChanged(auth, handleAuthStateChange);
  setGameLocked(true);
}

function handleGuessSubmit(event) {
  event.preventDefault();

  const guess = dom.guessInput.value.trim();
  if (!isValidGuess(guess)) {
    setStatus("Enter exactly 3 digits, like 479.", "status-hint");
    dom.guessInput.focus();
    return;
  }

  attempts += 1;
  updateAttemptCount();

  const hint = buildHint(secretNumber, guess);
  appendHistoryItem(guess, hint);

  if (guess === secretNumber) {
    setStatus(`You guessed it. The secret number was ${secretNumber}.`, "status-win");
    showCelebration(secretNumber, attempts);
    dom.guessInput.value = "";
    dom.guessInput.disabled = true;
    dom.guessButton.disabled = true;
    return;
  }

  setStatus(hint, "status-hint");
  dom.guessInput.value = "";
  dom.guessInput.focus();
}

function resetGame() {
  secretNumber = generateSecretNumber();
  attempts = 0;
  hideCelebration();
  dom.guessInput.disabled = false;
  dom.guessButton.disabled = false;
  dom.guessInput.value = "";
  dom.historyList.innerHTML = '<p class="empty-state">Your hints will appear here after each guess.</p>';
  updateAttemptCount();
  setStatus("A new secret number is ready. Enter your first guess.", "status-hint");
  if (!dom.guessInput.disabled) {
    dom.guessInput.focus();
  }
}

function generateSecretNumber() {
  const digits = [];
  while (digits.length < 3) {
    const digit = String(Math.floor(Math.random() * 10));
    if (!digits.length && digit === "0") {
      continue;
    }
    if (!digits.includes(digit)) {
      digits.push(digit);
    }
  }
  return digits.join("");
}

function isValidGuess(value) {
  return /^\d{3}$/.test(value);
}

function buildHint(secret, guess) {
  let correctPlace = 0;
  let wrongPlace = 0;

  for (let index = 0; index < guess.length; index += 1) {
    const digit = guess[index];
    if (digit === secret[index]) {
      correctPlace += 1;
    } else if (secret.includes(digit)) {
      wrongPlace += 1;
    }
  }

  if (correctPlace === 0 && wrongPlace === 0) {
    return "None of the digits are correct.";
  }

  const parts = [];
  if (correctPlace > 0) {
    parts.push(`${numberWord(correctPlace)} ${pluralize("digit", correctPlace)} ${correctPlace === 1 ? "is" : "are"} correct and in the right place`);
  }
  if (wrongPlace > 0) {
    parts.push(`${numberWord(wrongPlace)} ${pluralize("digit", wrongPlace)} ${wrongPlace === 1 ? "is" : "are"} correct but in the wrong place`);
  }

  return sentenceCase(parts.join(" and ")) + ".";
}

function numberWord(value) {
  const words = {
    0: "zero",
    1: "one",
    2: "two",
    3: "three",
  };
  return words[value] || String(value);
}

function pluralize(word, count) {
  return count === 1 ? word : `${word}s`;
}

function sentenceCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function appendHistoryItem(guess, hint) {
  const emptyState = dom.historyList.querySelector(".empty-state");
  if (emptyState) {
    emptyState.remove();
  }

  const item = document.createElement("article");
  item.className = "history-item";

  const heading = document.createElement("h3");
  heading.textContent = `Guess ${attempts}: ${guess}`;

  const body = document.createElement("p");
  body.textContent = hint;

  item.append(heading, body);
  dom.historyList.prepend(item);
}

function updateAttemptCount() {
  dom.attemptCount.textContent = `${attempts} ${attempts === 1 ? "attempt" : "attempts"}`;
}

function setStatus(text, className) {
  dom.statusText.textContent = text;
  dom.statusText.className = className;
}

function showCelebration(secret, totalAttempts) {
  if (!dom.winCelebration || !dom.celebrationText) {
    return;
  }

  dom.celebrationText.textContent = `The secret number was ${secret}. You solved it in ${totalAttempts} ${totalAttempts === 1 ? "attempt" : "attempts"}.`;
  dom.winCelebration.hidden = false;
}

function hideCelebration() {
  if (!dom.winCelebration) {
    return;
  }

  dom.winCelebration.hidden = true;
}

async function handleGoogleSignIn() {
  try {
    dom.authStatus.textContent = "Opening Google sign-in...";
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in failed.";
    dom.authStatus.textContent = sanitizeFirebaseMessage(message);
  }
}

async function handleSignOut() {
  try {
    await signOut(auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-out failed.";
    dom.authStatus.textContent = sanitizeFirebaseMessage(message);
  }
}

function handleAuthStateChange(user) {
  currentUser = user;
  if (user) {
    const displayName = user.displayName || user.email || "Player";
    dom.authTitle.textContent = `Welcome, ${displayName}`;
    dom.authStatus.textContent = "You are signed in. The puzzle board is unlocked.";
    dom.googleSignInBtn.hidden = true;
    dom.signOutBtn.hidden = false;
    setGameLocked(false);
    dom.guessInput.focus();
    return;
  }

  dom.authTitle.textContent = "Sign in to play";
  dom.authStatus.textContent = "Use Google sign-in to unlock the game and track your puzzle attempts.";
  dom.googleSignInBtn.hidden = false;
  dom.signOutBtn.hidden = true;
  setGameLocked(true);
}

function setGameLocked(locked) {
  dom.guessInput.disabled = locked;
  dom.guessButton.disabled = locked;
  dom.newGameBtn.disabled = locked;
  if (locked) {
    hideCelebration();
    dom.guessInput.value = "";
    setStatus("Sign in with Google to start playing.", "status-hint");
  } else {
    resetGame();
  }
}

function sanitizeFirebaseMessage(message) {
  return message.replace(/^Firebase:\s*/i, "").trim();
}
