import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
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

const firebaseApp = initializeApp(getFirebaseConfig());
const auth = getAuth(firebaseApp);
const GAME_STORAGE_PREFIX = "number-guessing-game-state-v3";
const PROFILE_STORAGE_PREFIX = "number-guessing-game-profile-v1";
const CHALLENGE_PARAM = "challenge";
const CHALLENGE_FROM_PARAM = "from";
const CHALLENGE_TO_PARAM = "to";
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,18}$/;
const DEFAULT_AVATAR = "https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png";
const DEFAULT_STATUS = "A new secret number is ready. Enter your first guess.";
const DEFAULT_USERNAME_HELP = "Use 3-18 letters, numbers, or underscores.";

const dom = {
  guessForm: document.getElementById("guessForm"),
  guessInput: document.getElementById("guessInput"),
  guessEmojiBurst: document.getElementById("guessEmojiBurst"),
  guessButton: document.getElementById("guessButton"),
  newGameBtn: document.getElementById("newGameBtn"),
  challengeFriendBtn: document.getElementById("challengeFriendBtn"),
  copyChallengeBtn: document.getElementById("copyChallengeBtn"),
  challengeLink: document.getElementById("challengeLink"),
  challengeCurrentUsername: document.getElementById("challengeCurrentUsername"),
  challengeOpponentInput: document.getElementById("challengeOpponentInput"),
  challengeMeta: document.getElementById("challengeMeta"),
  profileMenuBtn: document.getElementById("profileMenuBtn"),
  profileAvatar: document.getElementById("profileAvatar"),
  profileDropdown: document.getElementById("profileDropdown"),
  profileName: document.getElementById("profileName"),
  profileHandle: document.getElementById("profileHandle"),
  editUsernameBtn: document.getElementById("editUsernameBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  emojiReaction: document.getElementById("emojiReaction"),
  statusText: document.getElementById("statusText"),
  digitTracker: document.getElementById("digitTracker"),
  digitChips: [...document.querySelectorAll(".digit-chip")],
  clearTrackerBtn: document.getElementById("clearTrackerBtn"),
  guessNotes: document.getElementById("guessNotes"),
  historyList: document.getElementById("historyList"),
  attemptCount: document.getElementById("attemptCount"),
  winCelebration: document.getElementById("winCelebration"),
  celebrationText: document.getElementById("celebrationText"),
  celebrationCloseBtn: document.getElementById("celebrationCloseBtn"),
  usernameSetup: document.getElementById("usernameSetup"),
  usernameSetupForm: document.getElementById("usernameSetupForm"),
  usernameInput: document.getElementById("usernameInput"),
  usernameError: document.getElementById("usernameError"),
};

let currentUser = null;
let currentUsername = "";
let secretNumber = generateSecretNumber();
let attempts = 0;
let crossedDigits = [];
let currentChallengeToken = "";
let currentChallengeMeta = createChallengeMeta();

init();

function init() {
  dom.guessForm.addEventListener("submit", handleGuessSubmit);
  dom.guessInput.addEventListener("keydown", handleGuessKeyDown);
  dom.guessInput.addEventListener("paste", handleGuessPaste);
  dom.guessInput.addEventListener("beforeinput", handleGuessBeforeInput);
  dom.guessInput.addEventListener("input", handleGuessInput);
  dom.guessNotes.addEventListener("input", handleNotesInput);
  dom.digitTracker.addEventListener("click", handleDigitTrackerClick);
  dom.clearTrackerBtn.addEventListener("click", clearDigitTracker);
  dom.newGameBtn.addEventListener("click", resetGame);
  dom.challengeFriendBtn.addEventListener("click", handleCreateChallenge);
  dom.copyChallengeBtn.addEventListener("click", handleCopyChallengeLink);
  dom.challengeOpponentInput.addEventListener("input", handleChallengeOpponentInput);
  dom.celebrationCloseBtn.addEventListener("click", hideCelebration);
  dom.signOutBtn.addEventListener("click", handleSignOut);
  dom.editUsernameBtn.addEventListener("click", handleEditUsername);
  dom.profileMenuBtn.addEventListener("click", toggleProfileMenu);
  dom.usernameSetupForm.addEventListener("submit", handleUsernameSetupSubmit);
  dom.usernameInput.addEventListener("input", handleUsernameInput);
  document.addEventListener("click", handleOutsideProfileMenuClick);
  window.addEventListener("beforeunload", saveGameState);
  onAuthStateChanged(auth, handleAuthStateChange);
  updateAttemptCount();
  renderDigitTracker();
  setEmojiReaction("🎯 Steady start");
  setStatus("🔐 Sign in with Google to start playing.", "status-hint");
  updateProfileUi();
  updateChallengeUi();
  setGameLocked(true);
}

function createChallengeMeta(creatorUsername = "", opponentUsername = "") {
  return {
    creatorUsername: sanitizeUsername(creatorUsername),
    opponentUsername: sanitizeUsername(opponentUsername),
  };
}

function sanitizeUsername(value) {
  return String(value || "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 18);
}

function isValidUsername(value) {
  return USERNAME_PATTERN.test(value);
}

function usernamesMatch(left, right) {
  const normalizedLeft = sanitizeUsername(left).toLowerCase();
  const normalizedRight = sanitizeUsername(right).toLowerCase();
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight;
}

function getStorageKey(uid = currentUser?.uid) {
  return uid ? `${GAME_STORAGE_PREFIX}:${uid}` : "";
}

function getProfileStorageKey(uid = currentUser?.uid) {
  return uid ? `${PROFILE_STORAGE_PREFIX}:${uid}` : "";
}

function loadPlayerProfile() {
  const key = getProfileStorageKey();
  if (!key) {
    return null;
  }

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePlayerProfile(profile) {
  const key = getProfileStorageKey();
  if (!key) {
    return;
  }

  localStorage.setItem(key, JSON.stringify(profile));
}

function setUsernameMessage(message, isError = false) {
  dom.usernameError.textContent = message;
  dom.usernameError.classList.toggle("is-error", isError);
}

function showUsernameSetup(preset = currentUsername) {
  dom.usernameSetup.hidden = false;
  dom.usernameInput.value = preset;
  setUsernameMessage(DEFAULT_USERNAME_HELP, false);
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => {
    dom.usernameInput.focus();
    dom.usernameInput.select();
  });
}

function hideUsernameSetup() {
  dom.usernameSetup.hidden = true;
  document.body.classList.remove("modal-open");
}

function handleUsernameInput() {
  const sanitized = sanitizeUsername(dom.usernameInput.value);
  if (dom.usernameInput.value !== sanitized) {
    dom.usernameInput.value = sanitized;
  }

  setUsernameMessage(DEFAULT_USERNAME_HELP, false);
}

function updateProfileUi() {
  const fallbackName = currentUser?.displayName || currentUser?.email || "Player";
  dom.profileAvatar.src = currentUser?.photoURL || DEFAULT_AVATAR;
  dom.profileAvatar.alt = `${fallbackName} profile photo`;
  dom.profileName.textContent = currentUsername || fallbackName;
  dom.profileHandle.textContent = currentUser?.email ? `Google: ${currentUser.email}` : "Signed in with Google";
  updateChallengeUi();
}

function getChallengePanelCopy() {
  if (!currentUsername) {
    return "Choose your username first, then type an opponent username to create a shared-number duel link.";
  }

  const opponentDraft = sanitizeUsername(dom.challengeOpponentInput.value);
  if (currentChallengeToken && currentChallengeMeta.creatorUsername && currentChallengeMeta.opponentUsername) {
    if (usernamesMatch(currentUsername, currentChallengeMeta.creatorUsername)) {
      return `Your current duel link is ready for @${currentChallengeMeta.opponentUsername}. Share it so both of you solve the same hidden number.`;
    }

    if (usernamesMatch(currentUsername, currentChallengeMeta.opponentUsername)) {
      return `@${currentChallengeMeta.creatorUsername} challenged you to solve the same hidden number. Beat their attempt count.`;
    }

    return `This shared-number duel pairs @${currentChallengeMeta.creatorUsername} against @${currentChallengeMeta.opponentUsername}.`;
  }

  if (opponentDraft) {
    return `Generate one private duel link for @${opponentDraft}. Both players will receive the same hidden number.`;
  }

  return "Type your friend's username, then generate one private link that locks both players onto the same number.";
}

function updateChallengeUi() {
  dom.challengeCurrentUsername.textContent = currentUsername ? `@${currentUsername}` : "Choose username";
  const canCreateChallenge = Boolean(currentUser && currentUsername);
  dom.challengeOpponentInput.disabled = !canCreateChallenge;
  dom.challengeFriendBtn.disabled = !canCreateChallenge;
  dom.copyChallengeBtn.disabled = !currentChallengeToken;
  dom.challengeMeta.textContent = getChallengePanelCopy();
  updateChallengeLinkField();
}
function encodeChallengeSecret(secret) {
  return btoa(secret).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeChallengeSecret(token) {
  try {
    const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const secret = atob(normalized + padding);
    return isValidGuess(secret) ? secret : null;
  } catch {
    return null;
  }
}

function getChallengeFromUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get(CHALLENGE_PARAM);
  if (!token) {
    return null;
  }

  const secret = decodeChallengeSecret(token);
  if (!secret) {
    return null;
  }

  return {
    secret,
    token,
    meta: createChallengeMeta(
      url.searchParams.get(CHALLENGE_FROM_PARAM) || "",
      url.searchParams.get(CHALLENGE_TO_PARAM) || "",
    ),
  };
}

function syncChallengeUrl() {
  const url = new URL(window.location.href);

  if (currentChallengeToken) {
    url.searchParams.set(CHALLENGE_PARAM, currentChallengeToken);

    if (currentChallengeMeta.creatorUsername) {
      url.searchParams.set(CHALLENGE_FROM_PARAM, currentChallengeMeta.creatorUsername);
    } else {
      url.searchParams.delete(CHALLENGE_FROM_PARAM);
    }

    if (currentChallengeMeta.opponentUsername) {
      url.searchParams.set(CHALLENGE_TO_PARAM, currentChallengeMeta.opponentUsername);
    } else {
      url.searchParams.delete(CHALLENGE_TO_PARAM);
    }
  } else {
    url.searchParams.delete(CHALLENGE_PARAM);
    url.searchParams.delete(CHALLENGE_FROM_PARAM);
    url.searchParams.delete(CHALLENGE_TO_PARAM);
  }

  window.history.replaceState({}, "", url);
}

function buildChallengeLinkValue() {
  if (!currentChallengeToken) {
    return "";
  }

  const url = new URL(window.location.href);
  url.searchParams.set(CHALLENGE_PARAM, currentChallengeToken);

  if (currentChallengeMeta.creatorUsername) {
    url.searchParams.set(CHALLENGE_FROM_PARAM, currentChallengeMeta.creatorUsername);
  } else {
    url.searchParams.delete(CHALLENGE_FROM_PARAM);
  }

  if (currentChallengeMeta.opponentUsername) {
    url.searchParams.set(CHALLENGE_TO_PARAM, currentChallengeMeta.opponentUsername);
  } else {
    url.searchParams.delete(CHALLENGE_TO_PARAM);
  }

  return url.toString();
}

function updateChallengeLinkField() {
  dom.challengeLink.value = buildChallengeLinkValue();
}

function saveGameState() {
  const key = getStorageKey();
  if (!key) {
    return;
  }

  const history = [...dom.historyList.querySelectorAll(".history-item")].map((item) => ({
    heading: item.querySelector("h3")?.textContent || "",
    body: item.querySelector("p")?.textContent || "",
  }));

  const payload = {
    secretNumber,
    attempts,
    challengeToken: currentChallengeToken,
    challengeMeta: currentChallengeMeta,
    challengeOpponentDraft: sanitizeUsername(dom.challengeOpponentInput.value),
    crossedDigits,
    history,
    emojiReaction: dom.emojiReaction.textContent,
    statusText: dom.statusText.textContent,
    statusClass: dom.statusText.className || "status-hint",
    isSolved: dom.guessInput.disabled && dom.guessButton.disabled && attempts > 0,
    currentInput: dom.guessInput.value,
    notes: dom.guessNotes.value,
  };

  localStorage.setItem(key, JSON.stringify(payload));
}

function loadGameState() {
  const key = getStorageKey();
  if (!key) {
    return null;
  }

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearGameState() {
  const key = getStorageKey();
  if (!key) {
    return;
  }

  localStorage.removeItem(key);
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

function renderDigitTracker() {
  const crossedSet = new Set(crossedDigits);
  dom.digitChips.forEach((chip) => {
    const digit = chip.dataset.digit || "";
    chip.classList.toggle("crossed", crossedSet.has(digit));
    chip.setAttribute("aria-pressed", String(crossedSet.has(digit)));
  });
}

function scoreGuess(secret, guess) {
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

  return { correctPlace, wrongPlace };
}

function getEmojiReaction(correctPlace, wrongPlace, isWin) {
  if (isWin) {
    return "👑 Perfect hit";
  }
  if (correctPlace === 2) {
    return "🔥 Super strong guess";
  }
  if (correctPlace === 1 && wrongPlace >= 1) {
    return "🚀 Very promising";
  }
  if (wrongPlace >= 2) {
    return "🧠 Great clue";
  }
  if (correctPlace === 1) {
    return "💎 Nice placement";
  }
  if (wrongPlace === 1) {
    return "✨ Good direction";
  }
  return "🌌 Still searching";
}

function setEmojiReaction(text) {
  dom.emojiReaction.textContent = text;
  dom.emojiReaction.classList.remove("pulse");
  void dom.emojiReaction.offsetWidth;
  dom.emojiReaction.classList.add("pulse");
}

function popGuessEmoji(text) {
  const emoji = text.split(" ")[0] || "✨";
  dom.guessEmojiBurst.textContent = emoji;
  dom.guessEmojiBurst.classList.remove("show");
  void dom.guessEmojiBurst.offsetWidth;
  dom.guessEmojiBurst.classList.add("show");
}

function clearDigitTracker() {
  crossedDigits = [];
  renderDigitTracker();
  saveGameState();
}

function restoreGameState(saved = loadGameState()) {
  if (!saved || !currentUser) {
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
  currentChallengeToken = typeof saved.challengeToken === "string" ? saved.challengeToken : "";
  currentChallengeMeta = createChallengeMeta(
    saved.challengeMeta?.creatorUsername,
    saved.challengeMeta?.opponentUsername,
  );
  crossedDigits = Array.isArray(saved.crossedDigits)
    ? saved.crossedDigits.filter((digit) => /^[1-9]$/.test(digit))
    : [];
  dom.challengeOpponentInput.value = sanitizeUsername(
    saved.challengeOpponentDraft || currentChallengeMeta.opponentUsername,
  );
  updateAttemptCount();
  renderHistory(Array.isArray(saved.history) ? saved.history : []);
  renderDigitTracker();
  updateChallengeUi();
  syncChallengeUrl();
  setEmojiReaction(saved.emojiReaction || "🎯 Steady start");
  setStatus(saved.statusText || "Continue guessing the current secret number.", saved.statusClass || "status-hint");
  hideCelebration();

  const solved = Boolean(saved.isSolved);
  dom.guessInput.disabled = solved;
  dom.guessButton.disabled = solved;
  dom.guessInput.value = solved ? "" : (saved.currentInput || "");
  dom.guessNotes.value = saved.notes || "";

  if (!solved) {
    dom.guessInput.focus();
  }

  return true;
}
function initializeFreshRound(statusText = DEFAULT_STATUS) {
  attempts = 0;
  crossedDigits = [];
  hideCelebration();
  dom.guessInput.disabled = false;
  dom.guessButton.disabled = false;
  dom.newGameBtn.disabled = false;
  dom.guessInput.value = "";
  dom.guessNotes.value = "";
  dom.historyList.innerHTML = '<p class="empty-state">Your hints will appear here after each guess.</p>';
  updateAttemptCount();
  renderDigitTracker();
  updateChallengeUi();
  syncChallengeUrl();
  setEmojiReaction("🎯 Steady start");
  setStatus(statusText, "status-hint");
  saveGameState();
  dom.guessInput.focus();
}

function buildChallengeLoadedStatus() {
  if (currentChallengeMeta.creatorUsername && currentChallengeMeta.opponentUsername) {
    if (usernamesMatch(currentUsername, currentChallengeMeta.opponentUsername)) {
      return `🤝 @${currentChallengeMeta.creatorUsername} challenged you. Solve the same number in fewer attempts.`;
    }

    if (usernamesMatch(currentUsername, currentChallengeMeta.creatorUsername)) {
      return `🤝 Your duel against @${currentChallengeMeta.opponentUsername} is ready. Share the link and compare attempts.`;
    }

    return `🤝 Shared duel loaded for @${currentChallengeMeta.creatorUsername} vs @${currentChallengeMeta.opponentUsername}.`;
  }

  if (currentChallengeMeta.creatorUsername) {
    return `🤝 @${currentChallengeMeta.creatorUsername} shared a challenge with you.`;
  }

  return "🤝 Friend challenge loaded. Crack the shared secret number.";
}

function startChallengeRound(secret, token, meta) {
  secretNumber = secret;
  currentChallengeToken = token;
  currentChallengeMeta = createChallengeMeta(meta.creatorUsername, meta.opponentUsername);
  if (currentChallengeMeta.opponentUsername) {
    dom.challengeOpponentInput.value = currentChallengeMeta.opponentUsername;
  }
  initializeFreshRound(buildChallengeLoadedStatus());
}

function restoreGameFromLocation() {
  const challenge = getChallengeFromUrl();
  const saved = loadGameState();

  if (challenge) {
    if (saved && saved.challengeToken === challenge.token && saved.secretNumber === challenge.secret) {
      const restored = restoreGameState(saved);
      currentChallengeMeta = createChallengeMeta(
        challenge.meta.creatorUsername || currentChallengeMeta.creatorUsername,
        challenge.meta.opponentUsername || currentChallengeMeta.opponentUsername,
      );
      if (currentChallengeMeta.opponentUsername) {
        dom.challengeOpponentInput.value = currentChallengeMeta.opponentUsername;
      }
      updateChallengeUi();
      syncChallengeUrl();
      return restored;
    }

    startChallengeRound(challenge.secret, challenge.token, challenge.meta);
    return true;
  }

  const restored = restoreGameState(saved);
  if (restored) {
    syncChallengeUrl();
    return true;
  }

  currentChallengeToken = "";
  currentChallengeMeta = createChallengeMeta();
  updateChallengeUi();
  syncChallengeUrl();
  return false;
}

function handleDigitTrackerClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const digit = target.dataset.digit;
  if (!digit) {
    return;
  }

  if (crossedDigits.includes(digit)) {
    crossedDigits = crossedDigits.filter((entry) => entry !== digit);
  } else {
    crossedDigits = [...crossedDigits, digit].sort();
  }

  renderDigitTracker();
  saveGameState();
}

function handleNotesInput() {
  saveGameState();
}

function handleChallengeOpponentInput() {
  const sanitized = sanitizeUsername(dom.challengeOpponentInput.value);
  if (dom.challengeOpponentInput.value !== sanitized) {
    dom.challengeOpponentInput.value = sanitized;
  }

  updateChallengeUi();
  saveGameState();
}

function handleCreateChallenge() {
  if (!currentUsername) {
    showUsernameSetup();
    setStatus("Create your username first so your friend knows who challenged them.", "status-hint");
    return;
  }

  const opponentUsername = sanitizeUsername(dom.challengeOpponentInput.value);
  dom.challengeOpponentInput.value = opponentUsername;

  if (!isValidUsername(opponentUsername)) {
    setStatus("Enter an opponent username with 3-18 letters, numbers, or underscores.", "status-hint");
    dom.challengeOpponentInput.focus();
    return;
  }

  if (usernamesMatch(currentUsername, opponentUsername)) {
    setStatus("Choose an opponent username that is different from your own.", "status-hint");
    dom.challengeOpponentInput.focus();
    return;
  }

  currentChallengeToken = encodeChallengeSecret(secretNumber);
  currentChallengeMeta = createChallengeMeta(currentUsername, opponentUsername);
  updateChallengeUi();
  syncChallengeUrl();
  setStatus(`Challenge link ready for @${opponentUsername}. Share it so both of you solve the same hidden number.`, "status-hint");
  saveGameState();
}

async function handleCopyChallengeLink() {
  if (!currentChallengeToken) {
    handleCreateChallenge();
  }

  const link = dom.challengeLink.value.trim();
  if (!link) {
    setStatus("Create a challenge link first, then copy it.", "status-hint");
    return;
  }

  try {
    await navigator.clipboard.writeText(link);
    const opponentUsername = currentChallengeMeta.opponentUsername;
    const detail = opponentUsername ? ` for @${opponentUsername}` : "";
    setStatus(`✨ Challenge link copied${detail}.`, "status-hint");
  } catch {
    dom.challengeLink.focus();
    dom.challengeLink.select();
    setStatus("Copy failed automatically, so the challenge link is selected for you.", "status-hint");
  }
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

  const score = scoreGuess(secretNumber, guess);
  const hint = buildHint(secretNumber, guess);
  appendHistoryItem(guess, hint);
  saveGameState();

  if (guess === secretNumber) {
    const reaction = getEmojiReaction(score.correctPlace, score.wrongPlace, true);
    setEmojiReaction(reaction);
    popGuessEmoji(reaction);
    setStatus(`🎉 You guessed it. The secret number was ${secretNumber}.`, "status-win");
    showCelebration(secretNumber, attempts);
    dom.guessInput.value = "";
    dom.guessInput.disabled = true;
    dom.guessButton.disabled = true;
    saveGameState();
    return;
  }

  const reaction = getEmojiReaction(score.correctPlace, score.wrongPlace, false);
  setEmojiReaction(reaction);
  popGuessEmoji(reaction);
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
  currentChallengeToken = "";
  currentChallengeMeta = createChallengeMeta();
  updateChallengeUi();
  syncChallengeUrl();
  secretNumber = generateSecretNumber();
  initializeFreshRound("✨ A new secret number is ready. Enter your first guess.");
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
  dom.celebrationText.textContent = `The secret number was ${secret}. You solved it in ${totalAttempts} ${totalAttempts === 1 ? "attempt" : "attempts"}.`;
  dom.winCelebration.hidden = false;
}

function hideCelebration() {
  dom.winCelebration.hidden = true;
}

function renderLockedShell(message) {
  attempts = 0;
  crossedDigits = [];
  currentChallengeToken = "";
  currentChallengeMeta = createChallengeMeta();
  secretNumber = generateSecretNumber();
  dom.guessInput.value = "";
  dom.guessNotes.value = "";
  dom.challengeLink.value = "";
  dom.challengeOpponentInput.value = "";
  dom.historyList.innerHTML = '<p class="empty-state">Your hints will appear here after each guess.</p>';
  hideCelebration();
  renderDigitTracker();
  updateAttemptCount();
  setEmojiReaction("🎯 Steady start");
  setStatus(message, "status-hint");
  updateChallengeUi();
  setGameLocked(true);
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

function handleEditUsername() {
  dom.profileDropdown.hidden = true;
  dom.profileMenuBtn.setAttribute("aria-expanded", "false");
  showUsernameSetup(currentUsername);
}

function handleUsernameSetupSubmit(event) {
  event.preventDefault();

  const nextUsername = sanitizeUsername(dom.usernameInput.value);
  dom.usernameInput.value = nextUsername;

  if (!isValidUsername(nextUsername)) {
    setUsernameMessage(DEFAULT_USERNAME_HELP, true);
    dom.usernameInput.focus();
    return;
  }

  const previousUsername = currentUsername;
  const wasMissingUsername = !previousUsername;

  currentUsername = nextUsername;
  savePlayerProfile({ username: currentUsername });

  if (currentChallengeToken && usernamesMatch(currentChallengeMeta.creatorUsername, previousUsername)) {
    currentChallengeMeta = createChallengeMeta(currentUsername, currentChallengeMeta.opponentUsername);
  }

  updateProfileUi();
  hideUsernameSetup();
  setGameLocked(false);

  if (wasMissingUsername) {
    if (!restoreGameFromLocation()) {
      resetGame();
    }

    if (currentChallengeToken) {
      setStatus(buildChallengeLoadedStatus(), "status-hint");
    } else {
      setStatus(`Welcome @${currentUsername}. Your board is ready.`, "status-hint");
    }

    return;
  }

  updateChallengeUi();
  syncChallengeUrl();
  saveGameState();
  setStatus(`Username updated to @${currentUsername}.`, "status-hint");
}

function handleAuthStateChange(user) {
  if (user) {
    currentUser = user;
    currentUsername = sanitizeUsername(loadPlayerProfile()?.username || "");
    updateProfileUi();

    if (!currentUsername) {
      renderLockedShell("Choose a username to unlock your board and create named challenges.");
      showUsernameSetup();
      return;
    }

    hideUsernameSetup();
    setGameLocked(false);
    if (!restoreGameFromLocation()) {
      resetGame();
    }
    return;
  }

  currentUser = null;
  currentUsername = "";
  updateProfileUi();
  hideUsernameSetup();
  window.location.replace("/signin");
}

function setGameLocked(locked) {
  dom.guessInput.disabled = locked;
  dom.guessButton.disabled = locked;
  dom.newGameBtn.disabled = locked;

  if (locked) {
    dom.challengeFriendBtn.disabled = true;
    dom.copyChallengeBtn.disabled = true;
    dom.challengeOpponentInput.disabled = true;
  } else {
    updateChallengeUi();
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

