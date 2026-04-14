import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
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
const STORAGE_KEY = "number-guessing-game-state-v2";

const dom = {
  guessForm: document.getElementById("guessForm"),
  guessInput: document.getElementById("guessInput"),
  guessButton: document.getElementById("guessButton"),
  newGameBtn: document.getElementById("newGameBtn"),
  profileMenuBtn: document.getElementById("profileMenuBtn"),
  profileAvatar: document.getElementById("profileAvatar"),
  profileDropdown: document.getElementById("profileDropdown"),
  profileName: document.getElementById("profileName"),
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
init();

function init() {
  dom.guessForm.addEventListener("submit", handleGuessSubmit);
  dom.guessInput.addEventListener("keydown", handleGuessKeyDown);
  dom.guessInput.addEventListener("paste", handleGuessPaste);
  dom.guessInput.addEventListener("beforeinput", handleGuessBeforeInput);
  dom.guessInput.addEventListener("input", handleGuessInput);
  dom.newGameBtn.addEventListener("click", resetGame);
  dom.celebrationCloseBtn.addEventListener("click", hideCelebration);
  dom.signOutBtn.addEventListener("click", handleSignOut);
  dom.profileMenuBtn.addEventListener("click", toggleProfileMenu);
  document.addEventListener("click", handleOutsideProfileMenuClick);
  window.addEventListener("beforeunload", saveGameState);
  onAuthStateChanged(auth, handleAuthStateChange);
  dom.guessInput.disabled = true;
  dom.guessButton.disabled = true;
  dom.newGameBtn.disabled = true;
}

function getStorageKey() {
  return STORAGE_KEY;
}

function saveGameState() {
  const history = [...dom.historyList.querySelectorAll(".history-item")].map((item) => ({
    heading: item.querySelector("h3")?.textContent || "",
    body: item.querySelector("p")?.textContent || "",
  }));

  const payload = {
    secretNumber,
    attempts,
    history,
    statusText: dom.statusText.textContent,
    statusClass: dom.statusText.className || "status-hint",
    isSolved: dom.guessInput.disabled && dom.guessButton.disabled && attempts > 0,
    currentInput: dom.guessInput.value,
  };

  localStorage.setItem(getStorageKey(), JSON.stringify(payload));
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearGameState() {
  localStorage.removeItem(getStorageKey());
}

function renderHistory(history) {
  dom.historyList.innerHTML = "";

  if (!history.length) {
    dom.historyList.innerHTML = '<p class="empty-state">Your hints will appear here after each guess.</p>';
    return;
  }

  history.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "history-item";

    const heading = document.createElement("h3");
    heading.textContent = entry.heading;

    const body = document.createElement("p");
    body.textContent = entry.body;

    item.append(heading, body);
    dom.historyList.append(item);
  });
}

function restoreGameState() {
  const saved = loadGameState();
  if (!saved) {
    return false;
  }

  const validSecret = typeof saved.secretNumber === "string"
    && /^[1-9]{3}$/.test(saved.secretNumber)
    && new Set(saved.secretNumber).size === 3;

  if (!validSecret) {
    clearGameState();
    return false;
  }

  secretNumber = saved.secretNumber;
  attempts = Number(saved.attempts) || 0;
  updateAttemptCount();
  renderHistory(Array.isArray(saved.history) ? saved.history : []);
  setStatus(saved.statusText || "Continue guessing the current secret number.", saved.statusClass || "status-hint");
  hideCelebration();

  const solved = Boolean(saved.isSolved);
  dom.guessInput.disabled = solved;
  dom.guessButton.disabled = solved;
  dom.guessInput.value = solved ? "" : (saved.currentInput || "");

  if (!solved) {
    dom.guessInput.focus();
  }

  return true;
}

function handleGuessSubmit(event) {
  event.preventDefault();

  const guess = dom.guessInput.value.trim();
  if (!isValidGuess(guess)) {
    setStatus("Enter exactly 3 different digits from 1 to 9, like 479. Zero and repeated digits are not allowed.", "status-hint");
    dom.guessInput.focus();
    return;
  }

  attempts += 1;
  updateAttemptCount();

  const hint = buildHint(secretNumber, guess);
  appendHistoryItem(guess, hint);
  saveGameState();

  if (guess === secretNumber) {
    setStatus(`You guessed it. The secret number was ${secretNumber}.`, "status-win");
    showCelebration(secretNumber, attempts);
    dom.guessInput.value = "";
    dom.guessInput.disabled = true;
    dom.guessButton.disabled = true;
    saveGameState();
    return;
  }

  setStatus(hint, "status-hint");
  dom.guessInput.value = "";
  saveGameState();
  dom.guessInput.focus();
}

function handleGuessInput() {
  const digitsOnly = dom.guessInput.value.replace(/[^1-9]/g, "");
  const uniqueDigits = uniqueDigitString(digitsOnly);

  if (dom.guessInput.value !== uniqueDigits) {
    dom.guessInput.value = uniqueDigits;
    setStatus("Use 3 different digits from 1 to 9. Zero and repeated digits are not allowed.", "status-hint");
  }

  saveGameState();
}

function handleGuessKeyDown(event) {
  const allowedControlKeys = new Set([
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Tab",
    "Enter",
    "Home",
    "End",
  ]);

  if (event.ctrlKey || event.metaKey || event.altKey || allowedControlKeys.has(event.key)) {
    return;
  }

  if (!/^[1-9]$/.test(event.key)) {
    event.preventDefault();
    setStatus("Only digits from 1 to 9 are allowed in the guess box.", "status-hint");
    return;
  }

  const selectionStart = dom.guessInput.selectionStart ?? dom.guessInput.value.length;
  const selectionEnd = dom.guessInput.selectionEnd ?? dom.guessInput.value.length;
  const nextValue = [
    dom.guessInput.value.slice(0, selectionStart),
    event.key,
    dom.guessInput.value.slice(selectionEnd),
  ].join("");

  const nextDigits = nextValue.replace(/[^1-9]/g, "");
  if (nextDigits.length > 3 || new Set(nextDigits).size !== nextDigits.length) {
    event.preventDefault();
    setStatus("Only 3 different digits from 1 to 9 can be typed.", "status-hint");
  }
}

function handleGuessPaste(event) {
  event.preventDefault();
  const pasted = event.clipboardData?.getData("text") ?? "";
  const selectionStart = dom.guessInput.selectionStart ?? dom.guessInput.value.length;
  const selectionEnd = dom.guessInput.selectionEnd ?? dom.guessInput.value.length;
  const merged = [
    dom.guessInput.value.slice(0, selectionStart),
    pasted,
    dom.guessInput.value.slice(selectionEnd),
  ].join("");

  const sanitized = uniqueDigitString(merged);
  dom.guessInput.value = sanitized;

  if (sanitized !== merged) {
    setStatus("Pasted guesses also need 3 different digits from 1 to 9.", "status-hint");
  }

  saveGameState();
}

function handleGuessBeforeInput(event) {
  if (
    event.inputType === "deleteContentBackward" ||
    event.inputType === "deleteContentForward" ||
    event.inputType === "deleteByCut"
  ) {
    return;
  }

  const incoming = event.data ?? "";
  const selectionStart = dom.guessInput.selectionStart ?? dom.guessInput.value.length;
  const selectionEnd = dom.guessInput.selectionEnd ?? dom.guessInput.value.length;
  const nextValue = [
    dom.guessInput.value.slice(0, selectionStart),
    incoming,
    dom.guessInput.value.slice(selectionEnd),
  ].join("");

  const digitsOnly = nextValue.replace(/[^1-9]/g, "").slice(0, 3);
  const hasRepeat = new Set(digitsOnly).size !== digitsOnly.length;

  if (hasRepeat || /[^1-9]/.test(incoming)) {
    event.preventDefault();
    if (incoming) {
      setStatus("Only 3 different digits from 1 to 9 can be typed.", "status-hint");
    }
  }
}

function uniqueDigitString(value) {
  let output = "";
  for (const digit of value.replace(/[^1-9]/g, "")) {
    if (!output.includes(digit)) {
      output += digit;
    }
    if (output.length === 3) {
      break;
    }
  }
  return output;
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
  saveGameState();
  if (!dom.guessInput.disabled) {
    dom.guessInput.focus();
  }
}

function generateSecretNumber() {
  const digits = [];
  while (digits.length < 3) {
    const digit = String(Math.floor(Math.random() * 9) + 1);
    if (!digits.includes(digit)) {
      digits.push(digit);
    }
  }
  return digits.join("");
}

function isValidGuess(value) {
  return /^[1-9]{3}$/.test(value) && new Set(value).size === value.length;
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

async function handleSignOut() {
  try {
    await signOut(auth);
    window.location.replace("/signin");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-out failed.";
    setStatus(sanitizeFirebaseMessage(message), "status-hint");
  }
}

function handleAuthStateChange(user) {
  if (user) {
    dom.profileAvatar.src = user.photoURL || "https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png";
    dom.profileAvatar.alt = `${user.displayName || user.email || "Player"} profile photo`;
    dom.profileName.textContent = user.displayName || user.email || "Player";
    setGameLocked(false);
    return;
  }

  window.location.replace("/signin");
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
    if (!restoreGameState()) {
      resetGame();
    }
  }
}

function sanitizeFirebaseMessage(message) {
  return message.replace(/^Firebase:\s*/i, "").trim();
}

function toggleProfileMenu(event) {
  event.stopPropagation();
  const isHidden = dom.profileDropdown.hidden;
  dom.profileDropdown.hidden = !isHidden;
  dom.profileMenuBtn.setAttribute("aria-expanded", String(isHidden));
}

function handleOutsideProfileMenuClick(event) {
  if (!dom.profileDropdown || dom.profileDropdown.hidden) {
    return;
  }

  const target = event.target;
  if (
    target instanceof Node &&
    !dom.profileDropdown.contains(target) &&
    !dom.profileMenuBtn.contains(target)
  ) {
    dom.profileDropdown.hidden = true;
    dom.profileMenuBtn.setAttribute("aria-expanded", "false");
  }
}
