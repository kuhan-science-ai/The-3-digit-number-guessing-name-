import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

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

const firebaseApp = initializeApp(getFirebaseConfig());
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const GAME_STORAGE_PREFIX = "number-guessing-game-state-v3";
const PROFILE_STORAGE_PREFIX = "number-guessing-game-profile-v1";
const LEADERBOARD_STORAGE_PREFIX = "number-guessing-game-leaderboard-v1";
const GLOBAL_PLAYER_STORAGE_KEY = "number-guessing-game-global-player-v1";
const GLOBAL_LEADERBOARD_COLLECTION = "leaderboardScores";
const DAILY_ATTEMPT_STORAGE_PREFIX = "number-guessing-game-daily-attempt-v1";
const SETTINGS_STORAGE_KEY = "number-guessing-game-settings-v1";
const STREAK_STORAGE_KEY = "number-guessing-game-daily-streak-v1";
const TUTORIAL_STORAGE_KEY = "number-guessing-game-tutorial-seen-v1";
const ONE_HINT_PROGRESS_STORAGE_PREFIX = "number-guessing-game-one-hint-progress-v1";
const ONE_HINT_STREAK_STORAGE_PREFIX = "number-guessing-game-one-hint-streak-v1";
const ONE_HINT_MAX_SCORE = 100;
const ONE_HINT_ATTEMPT_PENALTY = 8;
const ONE_HINT_HINT_PENALTY = 15;
const CHALLENGE_PARAM = "challenge";
const CHALLENGE_FROM_PARAM = "from";
const CHALLENGE_TO_PARAM = "to";
const MODE_PARAM = "mode";
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,18}$/;
const DEFAULT_AVATAR = "https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png";
const DEFAULT_STATUS = "A new secret number is ready. Enter your first guess.";
const DEFAULT_USERNAME_HELP = "Use 3-18 letters, numbers, or underscores.";
const GUEST_UID = "guest-player";
const DEFAULT_SETTINGS = {
  beginnerHints: true,
  sound: false,
  vibration: true,
};
const GAME_MODES = {
  classic: {
    label: "Classic",
    description: "Classic: 3 unique digits from 1 to 9.",
    length: 3,
    digits: "123456789",
    unique: true,
    placeholder: "479",
  },
  easy: {
    label: "Easy",
    description: "Easy: 3 digits, zero and repeated digits are allowed.",
    length: 3,
    digits: "0123456789",
    unique: false,
    placeholder: "202",
  },
  hard: {
    label: "Hard",
    description: "Hard: 4 unique digits from 1 to 9.",
    length: 4,
    digits: "123456789",
    unique: true,
    placeholder: "4792",
  },
  time: {
    label: "Time Attack",
    description: "Time Attack: classic rules with a 90-second clock.",
    length: 3,
    digits: "123456789",
    unique: true,
    placeholder: "479",
    timeLimitSeconds: 90,
  },
};
const ONE_HINT_DIFFICULTIES = {
  easy: {
    label: "Easy",
    buildQuestion: buildEasyOneHintQuestion,
  },
  medium: {
    label: "Medium",
    buildQuestion: buildMediumOneHintQuestion,
  },
  expert: {
    label: "Expert",
    buildQuestion: buildExpertOneHintQuestion,
  },
  insane: {
    label: "Insane",
    buildQuestion: buildInsaneOneHintQuestion,
  },
  impossible: {
    label: "Impossible",
    buildQuestion: buildImpossibleOneHintQuestion,
  },
};

const dom = {
  gamePageTabs: document.getElementById("gamePageTabs"),
  introTabPanel: document.getElementById("introTabPanel"),
  gameTabPanel: document.getElementById("gameTabPanel"),
  oneHintTabPanel: document.getElementById("oneHintTabPanel"),
  challengeTabPanel: document.getElementById("challengeTabPanel"),
  rankingsTabPanel: document.getElementById("rankingsTabPanel"),
  focusModeBtn: document.getElementById("focusModeBtn"),
  guessForm: document.getElementById("guessForm"),
  guessInputLabel: document.getElementById("guessInputLabel"),
  guessInput: document.getElementById("guessInput"),
  guessEmojiBurst: document.getElementById("guessEmojiBurst"),
  guessButton: document.getElementById("guessButton"),
  newGameBtn: document.getElementById("newGameBtn"),
  timerBadge: document.getElementById("timerBadge"),
  modeTabs: document.getElementById("modeTabs"),
  modeDescription: document.getElementById("modeDescription"),
  dailyChallengeBtn: document.getElementById("dailyChallengeBtn"),
  dailyInfoPanel: document.getElementById("dailyInfoPanel"),
  dailyDateText: document.getElementById("dailyDateText"),
  dailyRuleText: document.getElementById("dailyRuleText"),
  dailyStatusText: document.getElementById("dailyStatusText"),
  numberPad: document.getElementById("numberPad"),
  streakBadge: document.getElementById("streakBadge"),
  rankedBadge: document.getElementById("rankedBadge"),
  coachPanel: document.getElementById("coachPanel"),
  coachText: document.getElementById("coachText"),
  leaderboardTabs: document.getElementById("leaderboardTabs"),
  leaderboardScopeTabs: document.getElementById("leaderboardScopeTabs"),
  leaderboardTitle: document.getElementById("leaderboardTitle"),
  leaderboardList: document.getElementById("leaderboardList"),
  rankingsTodayBadge: document.getElementById("rankingsTodayBadge"),
  challengeFriendBtn: document.getElementById("challengeFriendBtn"),
  copyChallengeBtn: document.getElementById("copyChallengeBtn"),
  challengeLink: document.getElementById("challengeLink"),
  challengeCurrentUsername: document.getElementById("challengeCurrentUsername"),
  challengeOpponentInput: document.getElementById("challengeOpponentInput"),
  challengeMeta: document.getElementById("challengeMeta"),
  oneHintModeTabs: document.getElementById("oneHintModeTabs"),
  oneHintForm: document.getElementById("oneHintForm"),
  oneHintQuestion: document.getElementById("oneHintQuestion"),
  oneHintInput: document.getElementById("oneHintInput"),
  oneHintSubmitBtn: document.getElementById("oneHintSubmitBtn"),
  oneHintNewBtn: document.getElementById("oneHintNewBtn"),
  oneHintFormulaBtn: document.getElementById("oneHintFormulaBtn"),
  oneHintFormulaHint: document.getElementById("oneHintFormulaHint"),
  oneHintSolution: document.getElementById("oneHintSolution"),
  oneHintFeedback: document.getElementById("oneHintFeedback"),
  oneHintAttemptBadge: document.getElementById("oneHintAttemptBadge"),
  oneHintScoreBadge: document.getElementById("oneHintScoreBadge"),
  oneHintStreakBadge: document.getElementById("oneHintStreakBadge"),
  profileMenuBtn: document.getElementById("profileMenuBtn"),
  profileAvatar: document.getElementById("profileAvatar"),
  profileDropdown: document.getElementById("profileDropdown"),
  profileName: document.getElementById("profileName"),
  profileHandle: document.getElementById("profileHandle"),
  editUsernameBtn: document.getElementById("editUsernameBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsCloseBtn: document.getElementById("settingsCloseBtn"),
  beginnerHintsToggle: document.getElementById("beginnerHintsToggle"),
  soundToggle: document.getElementById("soundToggle"),
  vibrationToggle: document.getElementById("vibrationToggle"),
  showTutorialBtn: document.getElementById("showTutorialBtn"),
  installAppBtn: document.getElementById("installAppBtn"),
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
  celebrationAttempts: document.getElementById("celebrationAttempts"),
  celebrationTime: document.getElementById("celebrationTime"),
  celebrationMode: document.getElementById("celebrationMode"),
  shareResultBtn: document.getElementById("shareResultBtn"),
  celebrationCloseBtn: document.getElementById("celebrationCloseBtn"),
  usernameSetup: document.getElementById("usernameSetup"),
  usernameSetupForm: document.getElementById("usernameSetupForm"),
  usernameInput: document.getElementById("usernameInput"),
  usernameError: document.getElementById("usernameError"),
  tutorialOverlay: document.getElementById("tutorialOverlay"),
  tutorialStartBtn: document.getElementById("tutorialStartBtn"),
  tutorialSkipBtn: document.getElementById("tutorialSkipBtn"),
};

let currentUser = null;
let currentUsername = "";
let isGuestPlayer = false;
let activePageTab = "intro";
let focusMode = false;
let currentMode = "classic";
let isDailyChallenge = false;
let activeLeaderboardBoard = "classic";
let activeLeaderboardScope = "local";
let leaderboardRenderToken = 0;
let secretNumber = generateSecretNumber();
let attempts = 0;
let crossedDigits = [];
let currentChallengeToken = "";
let currentChallengeMeta = createChallengeMeta();
let roundStartedAt = null;
let timerInterval = null;
let solvedSummary = null;
let settings = loadSettings();
let deferredInstallPrompt = null;
let currentOneHintDifficulty = "easy";
let oneHintQuestionIndex = 0;
let currentOneHintQuestion = null;
let oneHintAttempts = 0;
let oneHintHintLevel = 0;
let oneHintSolved = false;
let oneHintInitialized = false;

init();

function init() {
  dom.gamePageTabs.addEventListener("click", handleGamePageTabClick);
  dom.focusModeBtn.addEventListener("click", toggleFocusMode);
  dom.guessForm.addEventListener("submit", handleGuessSubmit);
  dom.guessInput.addEventListener("keydown", handleGuessKeyDown);
  dom.guessInput.addEventListener("paste", handleGuessPaste);
  dom.guessInput.addEventListener("beforeinput", handleGuessBeforeInput);
  dom.guessInput.addEventListener("input", handleGuessInput);
  dom.modeTabs.addEventListener("click", handleModeTabClick);
  dom.dailyChallengeBtn.addEventListener("click", startDailyChallenge);
  dom.numberPad.addEventListener("click", handleNumberPadClick);
  dom.leaderboardScopeTabs.addEventListener("click", handleLeaderboardScopeClick);
  dom.leaderboardTabs.addEventListener("click", handleLeaderboardTabClick);
  dom.guessNotes.addEventListener("input", handleNotesInput);
  dom.digitTracker.addEventListener("click", handleDigitTrackerClick);
  dom.clearTrackerBtn.addEventListener("click", clearDigitTracker);
  dom.newGameBtn.addEventListener("click", resetGame);
  dom.challengeFriendBtn.addEventListener("click", handleCreateChallenge);
  dom.copyChallengeBtn.addEventListener("click", handleCopyChallengeLink);
  dom.challengeOpponentInput.addEventListener("input", handleChallengeOpponentInput);
  dom.oneHintModeTabs.addEventListener("click", handleOneHintModeClick);
  dom.oneHintForm.addEventListener("submit", handleOneHintSubmit);
  dom.oneHintInput.addEventListener("input", handleOneHintInput);
  dom.oneHintNewBtn.addEventListener("click", startNewOneHintQuestion);
  dom.oneHintFormulaBtn.addEventListener("click", showOneHintFormulaHint);
  dom.shareResultBtn.addEventListener("click", handleShareResult);
  dom.celebrationCloseBtn.addEventListener("click", hideCelebration);
  dom.signOutBtn.addEventListener("click", handleSignOut);
  dom.editUsernameBtn.addEventListener("click", handleEditUsername);
  dom.settingsBtn.addEventListener("click", showSettingsPanel);
  dom.settingsCloseBtn.addEventListener("click", hideSettingsPanel);
  dom.beginnerHintsToggle.addEventListener("change", handleSettingsChange);
  dom.soundToggle.addEventListener("change", handleSettingsChange);
  dom.vibrationToggle.addEventListener("change", handleSettingsChange);
  dom.showTutorialBtn.addEventListener("click", () => showTutorial(true));
  dom.installAppBtn.addEventListener("click", handleInstallApp);
  dom.tutorialStartBtn.addEventListener("click", completeTutorial);
  dom.tutorialSkipBtn.addEventListener("click", completeTutorial);
  dom.profileMenuBtn.addEventListener("click", toggleProfileMenu);
  dom.usernameSetupForm.addEventListener("submit", handleUsernameSetupSubmit);
  dom.usernameInput.addEventListener("input", handleUsernameInput);
  document.addEventListener("click", handleOutsideProfileMenuClick);
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("beforeunload", saveGameState);
  onAuthStateChanged(auth, handleAuthStateChange);
  updateAttemptCount();
  renderDigitTracker();
  setEmojiReaction("🎯 Steady start");
  setStatus("🔐 Sign in with Google to start playing.", "status-hint");
  updateProfileUi();
  updateModeUi();
  updateSettingsUi();
  renderLeaderboard();
  updateChallengeUi();
  renderOneHintQuestion();
  setGameLocked(true);
  updateTimerUi();
  registerServiceWorker();
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // The game still works if the browser refuses service worker registration.
    });
  }
}

function handleGamePageTabClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.dataset.tab) {
    return;
  }
  setActivePageTab(target.dataset.tab);
}

function setActivePageTab(tabName) {
  activePageTab = ["intro", "game", "oneHint", "challenge", "rankings"].includes(tabName) ? tabName : "intro";
  dom.gamePageTabs.querySelectorAll("[data-tab]").forEach((button) => {
    const isActive = button.dataset.tab === activePageTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  dom.introTabPanel.classList.toggle("is-active", activePageTab === "intro");
  dom.gameTabPanel.classList.toggle("is-active", activePageTab === "game");
  dom.oneHintTabPanel.classList.toggle("is-active", activePageTab === "oneHint");
  dom.challengeTabPanel.classList.toggle("is-active", activePageTab === "challenge");
  dom.rankingsTabPanel.classList.toggle("is-active", activePageTab === "rankings");

  if (activePageTab === "game") {
    dom.guessInput.focus();
  } else if (activePageTab === "oneHint") {
    dom.oneHintInput.focus();
  } else if (activePageTab === "challenge") {
    dom.challengeOpponentInput.focus();
  } else if (activePageTab === "rankings") {
    renderLeaderboard();
  }
}

function toggleFocusMode() {
  focusMode = !focusMode;
  document.body.classList.toggle("focus-mode", focusMode);
  dom.focusModeBtn.classList.toggle("is-active", focusMode);
  dom.focusModeBtn.setAttribute("aria-pressed", String(focusMode));
  dom.focusModeBtn.textContent = focusMode ? "Exit Focus" : "Focus Mode";
}

function createChallengeMeta(creatorUsername = "", opponentUsername = "") {
  return {
    creatorUsername: sanitizeUsername(creatorUsername),
    opponentUsername: sanitizeUsername(opponentUsername),
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function isBeginnerCoachAvailable() {
  return settings.beginnerHints && !isDailyRankedGame();
}

function updateBeginnerCoachToggleUi() {
  const disabledForDaily = isDailyRankedGame();
  dom.beginnerHintsToggle.disabled = disabledForDaily;
  dom.beginnerHintsToggle.title = disabledForDaily
    ? "Beginner coach is disabled for Daily games."
    : "";
}

function updateSettingsUi() {
  dom.beginnerHintsToggle.checked = Boolean(settings.beginnerHints);
  updateBeginnerCoachToggleUi();
  dom.soundToggle.checked = Boolean(settings.sound);
  dom.vibrationToggle.checked = Boolean(settings.vibration);
  dom.installAppBtn.disabled = !deferredInstallPrompt;
  updateCoachPanel();
}

function handleSettingsChange() {
  settings = {
    ...settings,
    beginnerHints: dom.beginnerHintsToggle.checked,
    sound: dom.soundToggle.checked,
    vibration: dom.vibrationToggle.checked,
  };
  saveSettings();
  updateSettingsUi();
}

function showSettingsPanel() {
  dom.profileDropdown.hidden = true;
  dom.profileMenuBtn.setAttribute("aria-expanded", "false");
  dom.settingsPanel.hidden = false;
}

function hideSettingsPanel() {
  dom.settingsPanel.hidden = true;
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateSettingsUi();
}

async function handleInstallApp() {
  if (!deferredInstallPrompt) {
    setStatus("Install will appear here when your browser supports it for this site.", "status-hint");
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  updateSettingsUi();
}

function playFeedback(kind = "tap") {
  if (settings.vibration && navigator.vibrate) {
    navigator.vibrate(kind === "win" ? [40, 25, 40] : 14);
  }

  if (!settings.sound) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = kind === "win" ? 720 : 420;
    gain.gain.setValueAtTime(0.045, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.13);
  } catch {
    // Feedback is optional; browsers may block audio until user interaction.
  }
}

function getSuggestedUsername() {
  return `code_master_${Math.floor(Math.random() * 90) + 10}`;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTodayLabel() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

function getPlayerLeaderboardId() {
  return currentUser?.uid || `name:${sanitizeUsername(currentUsername).toLowerCase() || "guest"}`;
}

function getGlobalPlayerId() {
  if (currentUser && currentUser.uid !== GUEST_UID) {
    return currentUser.uid;
  }

  try {
    const saved = localStorage.getItem(GLOBAL_PLAYER_STORAGE_KEY);
    if (saved) {
      return saved;
    }

    const generated = `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(GLOBAL_PLAYER_STORAGE_KEY, generated);
    return generated;
  } catch {
    return getPlayerLeaderboardId();
  }
}

function getDailyAttemptKey(mode = currentMode) {
  return `${DAILY_ATTEMPT_STORAGE_PREFIX}:${getTodayKey()}:${mode}:${getPlayerLeaderboardId()}`;
}

function loadDailyAttempt(mode = currentMode) {
  try {
    const raw = localStorage.getItem(getDailyAttemptKey(mode));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDailyAttempt(mode = currentMode, payload = {}) {
  localStorage.setItem(getDailyAttemptKey(mode), JSON.stringify({
    date: getTodayKey(),
    mode,
    ...payload,
  }));
}

function isDailyRankedGame() {
  return Boolean(isDailyChallenge);
}

function updateCoachPanel(text = "") {
  updateBeginnerCoachToggleUi();
  const available = isBeginnerCoachAvailable();
  dom.coachPanel.hidden = !available;

  if (!available) {
    dom.coachText.textContent = isDailyRankedGame()
      ? "Beginner coach is disabled during daily ranked games."
      : "Turn on beginner coach in settings to see learning tips here.";
    return;
  }

  dom.coachText.textContent = text || "Beginner coach is on. Submit a guess to get a simple learning tip.";
}

function buildCoachTip(score, guess) {
  if (isDailyRankedGame()) {
    return "";
  }

  if (score.correctPlace === 0 && score.wrongPlace === 0) {
    return `None of ${guess} belongs in the code. Cross those digits out and test a fresh set.`;
  }

  if (score.correctPlace > 0 && score.wrongPlace > 0) {
    return "Keep the right-place digit idea, but move the other matching digit into a different slot next time.";
  }

  if (score.correctPlace > 0) {
    return "At least one digit is already sitting in the correct position. Try changing the other positions first.";
  }

  return "You found a useful digit, but it needs a new position. Rotate those digits and compare the next clue.";
}

function showTutorial(force = false) {
  if (!force && localStorage.getItem(TUTORIAL_STORAGE_KEY) === "seen") {
    return;
  }
  dom.tutorialOverlay.hidden = false;
  document.body.classList.add("modal-open");
}

function completeTutorial() {
  localStorage.setItem(TUTORIAL_STORAGE_KEY, "seen");
  dom.tutorialOverlay.hidden = true;
  document.body.classList.remove("modal-open");
  setActivePageTab("game");
  dom.guessInput.focus();
}

function getModeConfig(mode = currentMode) {
  return GAME_MODES[mode] || GAME_MODES.classic;
}

function getModeLabel(mode = currentMode) {
  return getModeConfig(mode).label;
}

function getGuessHelp() {
  const config = getModeConfig();
  const repeatCopy = config.unique ? " with no repeated digits" : ", repeats allowed";
  const zeroCopy = config.digits.includes("0") ? "0 to 9" : "1 to 9";
  return `Enter a ${config.length}-digit number from ${zeroCopy}${repeatCopy}.`;
}

function sanitizeGuessValue(value) {
  const config = getModeConfig();
  let output = "";
  for (const digit of String(value || "").replace(/\D/g, "")) {
    if (!config.digits.includes(digit)) {
      continue;
    }
    if (config.unique && output.includes(digit)) {
      continue;
    }
    output += digit;
    if (output.length === config.length) {
      break;
    }
  }
  return output;
}

function isValidSecretForMode(value, mode = currentMode) {
  const config = getModeConfig(mode);
  const pattern = new RegExp(`^[${config.digits}]{${config.length}}$`);
  return pattern.test(value) && (!config.unique || new Set(value).size === value.length);
}

function setMode(nextMode, { keepRound = false } = {}) {
  if (!GAME_MODES[nextMode] || nextMode === currentMode) {
    return;
  }

  currentMode = nextMode;
  activeLeaderboardBoard = nextMode;
  isDailyChallenge = false;
  currentChallengeToken = "";
  currentChallengeMeta = createChallengeMeta();
  updateModeUi();
  renderLeaderboard();

  if (!keepRound && currentUser && currentUsername) {
    secretNumber = generateSecretNumber();
    initializeFreshRound(`${getModeLabel()} mode is ready. ${getGuessHelp()}`);
  }
}

function updateModeUi() {
  const config = getModeConfig();
  const dailyAttempt = loadDailyAttempt(currentMode);
  const dailyCompleted = Boolean(dailyAttempt?.completed);
  const dailyStarted = Boolean(dailyAttempt?.started);
  dom.modeDescription.textContent = isDailyChallenge
    ? `Daily ${config.label}: today's shared ${config.length}-digit code. One ranked run only.`
    : config.description;
  dom.rankedBadge.textContent = dailyCompleted
    ? "Daily complete"
    : (isDailyChallenge ? "Daily ranked" : "Practice");
  dom.dailyInfoPanel.hidden = !isDailyChallenge && !dailyStarted && !dailyCompleted;
  dom.dailyDateText.textContent = formatTodayLabel();
  dom.dailyRuleText.textContent = "One ranked run per day";
  dom.dailyStatusText.textContent = dailyCompleted
    ? `Completed in ${dailyAttempt.attempts || 0} ${Number(dailyAttempt.attempts) === 1 ? "guess" : "guesses"}`
    : (dailyStarted || isDailyChallenge ? "Today's run is active" : "Not started yet");
  dom.guessInputLabel.textContent = getGuessHelp();
  dom.guessInput.maxLength = String(config.length);
  dom.guessInput.placeholder = config.placeholder;
  dom.timerBadge.textContent = formatTimer();
  dom.dailyChallengeBtn.classList.toggle("is-active", isDailyChallenge);
  dom.dailyChallengeBtn.disabled = Boolean(dailyStarted || dailyCompleted) || dom.guessInput.disabled;
  dom.dailyChallengeBtn.textContent = dailyStarted || dailyCompleted ? "Daily Played" : "Daily";

  dom.modeTabs.querySelectorAll(".mode-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === currentMode);
    button.setAttribute("aria-selected", String(button.dataset.mode === currentMode));
  });

  dom.numberPad.querySelectorAll("[data-keypad]").forEach((button) => {
    const digit = button.dataset.keypad || "";
    if (/^\d$/.test(digit)) {
      button.disabled = !config.digits.includes(digit) || dom.guessInput.disabled;
    }
  });
  updateStreakBadge();
  updateCoachPanel();
}

function handleModeTabClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.dataset.mode) {
    return;
  }
  setMode(target.dataset.mode);
}

function startDailyChallenge() {
  const dailyAttempt = loadDailyAttempt(currentMode);
  if (dailyAttempt?.completed || dailyAttempt?.started) {
    isDailyChallenge = false;
    activeLeaderboardBoard = "daily";
    renderLeaderboard();
    setStatus(`You already played today's Daily ${getModeLabel()}. Come back tomorrow for a fresh ranked code.`, "status-hint");
    updateModeUi();
    return;
  }

  isDailyChallenge = true;
  activeLeaderboardBoard = "daily";
  currentChallengeToken = "";
  currentChallengeMeta = createChallengeMeta();
  secretNumber = generateDailySecret(currentMode);
  saveDailyAttempt(currentMode, {
    started: true,
    completed: false,
    startedAt: new Date().toISOString(),
    username: currentUsername,
    playerId: getPlayerLeaderboardId(),
  });
  initializeFreshRound(`Daily ${getModeLabel()} is loaded. ${getGuessHelp()}`);
}

function handleLeaderboardTabClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.dataset.board) {
    return;
  }
  activeLeaderboardBoard = target.dataset.board;
  renderLeaderboard();
}

function handleLeaderboardScopeClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.dataset.scope) {
    return;
  }

  if (!["local", "global"].includes(target.dataset.scope)) {
    return;
  }

  activeLeaderboardScope = target.dataset.scope;
  renderLeaderboard();
}

function generateDailySecret(mode = currentMode) {
  const today = new Date().toISOString().slice(0, 10);
  return generateSecretNumber(mode, hashString(`${today}:${mode}:3-digit-duel`));
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function createOneHintQuestion({ question, answer, hints = [], solution = "" }) {
  const normalizedAnswer = String(answer);
  const normalizedHints = hints.filter(Boolean);
  return {
    question,
    answer: normalizedAnswer,
    hints: normalizedHints,
    formulaHint: normalizedHints[0] || "",
    solution: solution || `The answer is \\(${normalizedAnswer}\\).`,
  };
}

function buildEasyOneHintQuestion(index) {
  const variant = index % 8;
  const step = Math.floor(index / 8);
  if (variant === 0) {
    const base = 4 + step;
    return createOneHintQuestion({
      question: `What is ${base} squared?`,
      answer: base * base,
      solution: `Square the base: \\(${base}^2=${base}\\cdot${base}=${base * base}\\).`,
    });
  }
  if (variant === 1) {
    const a = 12 + (step * 3);
    const b = 6 + (step * 2);
    return createOneHintQuestion({
      question: `What is ${a} plus ${b}?`,
      answer: a + b,
      solution: `Add the two terms: \\(${a}+${b}=${a + b}\\).`,
    });
  }
  if (variant === 2) {
    const a = 6 + step;
    const b = 4 + (step % 9);
    return createOneHintQuestion({
      question: `What is ${a} times ${b}?`,
      answer: a * b,
      solution: `Multiply directly: \\(${a}\\cdot${b}=${a * b}\\).`,
    });
  }
  if (variant === 3) {
    const n = 8 + step;
    return createOneHintQuestion({
      question: `What is the ${n}th even number?`,
      answer: n * 2,
      solution: `The \\(n\\)th even number is \\(2n\\), so \\(2\\cdot${n}=${n * 2}\\).`,
    });
  }
  if (variant === 4) {
    const answer = 20 + (step * 4);
    const multiplier = 2 + (step % 5);
    return createOneHintQuestion({
      question: `What number multiplied by ${multiplier} gives ${answer * multiplier}?`,
      answer,
      solution: `Divide by the multiplier: \\(\\dfrac{${answer * multiplier}}{${multiplier}}=${answer}\\).`,
    });
  }
  if (variant === 5) {
    const first = 7 + step;
    const difference = 3 + (step % 4);
    const n = 6 + (step % 5);
    const answer = first + ((n - 1) * difference);
    return createOneHintQuestion({
      question: `In an arithmetic sequence starting at ${first} and adding ${difference}, what is term ${n}?`,
      answer,
      solution: `Use \\(a_n=a_1+(n-1)d\\): \\(${first}+(${n}-1)\\cdot${difference}=${answer}\\).`,
    });
  }
  if (variant === 6) {
    const n = 5 + (step % 5);
    const r = 2;
    return createOneHintQuestion({
      question: `How many ways can you choose ${r} objects from ${n} objects?`,
      answer: combination(n, r),
      solution: `Use \\(\\binom{n}{r}=\\dfrac{n!}{r!(n-r)!}\\): \\(\\binom{${n}}{${r}}=${combination(n, r)}\\).`,
    });
  }
  const first = 3 + step;
  const ratio = 2;
  const n = 4 + (step % 4);
  const answer = first * (ratio ** (n - 1));
  return createOneHintQuestion({
    question: `In a geometric sequence starting at ${first} and multiplying by ${ratio}, what is term ${n}?`,
    answer,
    solution: `Use \\(a_n=a_1r^{n-1}\\): \\(${first}\\cdot${ratio}^{${n - 1}}=${answer}\\).`,
  });
}

function buildMediumOneHintQuestion(index) {
  const variant = index % 8;
  const step = Math.floor(index / 8);
  if (variant === 0) {
    const n = 12 + step;
    return createOneHintQuestion({
      question: `What is the ${n}th triangular number?`,
      answer: (n * (n + 1)) / 2,
      solution: `Use \\(T_n=\\dfrac{n(n+1)}{2}\\): \\(T_${n}=\\dfrac{${n}\\cdot${n + 1}}{2}\\).`,
    });
  }
  if (variant === 1) {
    const a = 11 + step;
    const b = 3 + (step % 7);
    return createOneHintQuestion({
      question: `What is ${a} squared minus ${b} squared?`,
      answer: (a * a) - (b * b),
      solution: `Use difference of squares: \\(${a}^2-${b}^2=(${a}-${b})(${a}+${b})=${(a * a) - (b * b)}\\).`,
    });
  }
  if (variant === 2) {
    const a = 5 + step;
    const b = 7 + (step % 11);
    return createOneHintQuestion({
      question: `What is the least common multiple of ${a} and ${b}?`,
      answer: lcm(a, b),
      solution: `Use \\(\\operatorname{lcm}(a,b)=\\dfrac{|ab|}{\\gcd(a,b)}\\): \\(\\operatorname{lcm}(${a},${b})=${lcm(a, b)}\\).`,
    });
  }
  if (variant === 3) {
    const n = 7 + step;
    return createOneHintQuestion({
      question: `What is ${n} factorial divided by ${n - 2} factorial?`,
      answer: n * (n - 1),
      solution: `Cancel the factorials: \\(\\dfrac{${n}!}{${n - 2}!}=${n}\\cdot${n - 1}=${n * (n - 1)}\\).`,
    });
  }
  if (variant === 4) {
    const a = 18 + (step * 2);
    const b = 4 + step;
    const c = 3 + (step % 10);
    return createOneHintQuestion({
      question: `What is ${a} plus ${b} times ${c}?`,
      answer: a + (b * c),
      solution: `Use order of operations: \\(${a}+${b}\\cdot${c}=${a + (b * c)}\\).`,
    });
  }
  if (variant === 5) {
    const n = 8 + (step % 6);
    const r = 3;
    return createOneHintQuestion({
      question: `How many ways can you choose ${r} objects from ${n} objects?`,
      answer: combination(n, r),
      solution: `Use \\(\\binom{n}{r}=\\dfrac{n!}{r!(n-r)!}\\): \\(\\binom{${n}}{${r}}=${combination(n, r)}\\).`,
    });
  }
  if (variant === 6) {
    const first = 6 + step;
    const ratio = 3;
    const n = 4 + (step % 3);
    const answer = first * ((ratio ** n) - 1) / (ratio - 1);
    return createOneHintQuestion({
      question: `What is the sum of the first ${n} terms of a geometric sequence starting at ${first} with ratio ${ratio}?`,
      answer,
      solution: `Use \\(S_n=a\\dfrac{r^n-1}{r-1}\\): \\(${first}\\dfrac{${ratio}^${n}-1}{${ratio}-1}=${answer}\\).`,
    });
  }
  const n = 30 + step;
  return createOneHintQuestion({
    question: `What is the sum of the prime factors of ${n}, counting repeats?`,
    answer: primeFactorSum(n),
    solution: `Factor \\(${n}\\) into primes and add the factors with repeats: \\(${primeFactors(n).join("+")}=${primeFactorSum(n)}\\).`,
  });
}

function buildExpertOneHintQuestion(index) {
  const variant = index % 8;
  const step = Math.floor(index / 8);
  if (variant === 0) {
    const n = 18 + step;
    return createOneHintQuestion({
      question: `What is Euler's totient of ${n}?`,
      answer: totient(n),
      solution: `Use \\(\\varphi(N)=N\\prod_{p\\mid N}\\left(1-\\dfrac{1}{p}\\right)\\): \\(\\varphi(${n})=${totient(n)}\\).`,
    });
  }
  if (variant === 1) {
    const a = 13 + step;
    const b = 7 + (step % 11);
    return createOneHintQuestion({
      question: `What is ${a} cubed minus ${b} cubed?`,
      answer: (a ** 3) - (b ** 3),
      solution: `Use \\(a^3-b^3=(a-b)(a^2+ab+b^2)\\): \\(${a}^3-${b}^3=${(a ** 3) - (b ** 3)}\\).`,
    });
  }
  if (variant === 2) {
    const a = 6 + step;
    const b = 8 + (step % 13);
    const c = 10 + (step % 17);
    const answer = lcm(lcm(a, b), c);
    return createOneHintQuestion({
      question: `What is the least common multiple of ${a}, ${b}, and ${c}?`,
      answer,
      solution: `Combine pairwise LCMs: \\(\\operatorname{lcm}(\\operatorname{lcm}(${a},${b}),${c})=${answer}\\).`,
    });
  }
  if (variant === 3) {
    const n = 5 + step;
    return createOneHintQuestion({
      question: `How many derangements are there of ${n} objects?`,
      answer: derangements(n),
      solution: `Use \\(!n=(n-1)\\big(!(n-1)+!(n-2)\\big)\\). For \\(n=${n}\\), \\(!${n}=${derangements(n)}\\).`,
    });
  }
  if (variant === 4) {
    const n = 15 + step;
    return createOneHintQuestion({
      question: `What is the ${n}th Fibonacci number if the sequence starts 1, 1?`,
      answer: fibonacci(n),
      solution: `Add the previous two terms repeatedly in \\(1,1,2,3,5,\\ldots\\). The \\(${n}\\)th term is \\(${fibonacci(n)}\\).`,
    });
  }
  if (variant === 5) {
    const n = 10 + (step % 6);
    const r = 4;
    return createOneHintQuestion({
      question: `How many ways can you choose ${r} objects from ${n} objects?`,
      answer: combination(n, r),
      solution: `Use \\(\\binom{n}{r}=\\dfrac{n!}{r!(n-r)!}\\): \\(\\binom{${n}}{${r}}=${combination(n, r)}\\).`,
    });
  }
  if (variant === 6) {
    const a = 5 + (step % 11);
    const m = [17, 19, 23, 29, 31, 37][step % 6];
    return createOneHintQuestion({
      question: `What is the modular inverse of ${a} modulo ${m}?`,
      answer: modInverse(a, m),
      solution: `Find \\(x\\) such that \\(${a}x\\equiv1\\pmod{${m}}\\). The inverse is \\(${modInverse(a, m)}\\).`,
    });
  }
  const n = 42 + step;
  return createOneHintQuestion({
    question: `How many positive divisors does ${n} have?`,
    answer: divisorCount(n),
    solution: `If \\(N=\\prod p_i^{e_i}\\), then \\(d(N)=\\prod(e_i+1)\\). For \\(${n}\\), \\(d(${n})=${divisorCount(n)}\\).`,
  });
}

function buildInsaneOneHintQuestion(index) {
  const variant = index % 8;
  const step = Math.floor(index / 8);
  if (variant === 0) {
    const base = 7 + step;
    const exponent = 4 + (step % 5);
    const modulus = 23 + (step * 2);
    const answer = modPow(base, exponent, modulus);
    return createOneHintQuestion({
      question: `What is the remainder when ${base} to the ${exponent} power is divided by ${modulus}?`,
      answer,
      hints: [
        `Formula: \\(${base}^{${exponent}} \\bmod ${modulus}\\). Reduce after each multiplication: \\(r_{k+1}\\equiv r_k\\cdot${base}\\pmod{${modulus}}\\).`,
        `Setup: start with \\(r_0=1\\), then multiply by \\(${base}\\) exactly \\(${exponent}\\) times, reducing modulo \\(${modulus}\\) each time.`,
        `Final path: repeated squaring gives the needed reduced powers; combine them to get \\(${answer}\\).`,
      ],
      solution: `Using modular reduction, \\(${base}^{${exponent}}\\equiv${answer}\\pmod{${modulus}}\\), so the remainder is \\(${answer}\\).`,
    });
  }
  if (variant === 1) {
    const a = 40 + (step * 3);
    const b = 30 + (step * 2);
    const divisor = gcd(a, b);
    const answer = (a * b) - divisor;
    return createOneHintQuestion({
      question: `What is ${a} times ${b} minus their greatest common divisor?`,
      answer,
      hints: [
        `Formula: \\(${a}\\cdot${b}-\\gcd(${a},${b})\\). Use \\(\\gcd(a,b)=\\gcd(b,a\\bmod b)\\).`,
        `Setup: Euclid's algorithm gives \\(\\gcd(${a},${b})=${divisor}\\).`,
        `Final path: \\(${a}\\cdot${b}=${a * b}\\), then subtract \\(${divisor}\\).`,
      ],
      solution: `\\(${a}\\cdot${b}-\\gcd(${a},${b})=${a * b}-${divisor}=${answer}\\).`,
    });
  }
  if (variant === 2) {
    const n = 6 + step;
    const answer = n * (n - 1) * (n - 2);
    return createOneHintQuestion({
      question: `What is ${n} factorial divided by ${n - 3} factorial?`,
      answer,
      hints: [
        `Formula: \\(\\dfrac{${n}!}{${n - 3}!}\\).`,
        `Setup: cancel every factor from \\(${n - 3}!\\) downward.`,
        `Final path: \\(${n}\\cdot${n - 1}\\cdot${n - 2}\\).`,
      ],
      solution: `\\(\\dfrac{${n}!}{${n - 3}!}=${n}\\cdot${n - 1}\\cdot${n - 2}=${answer}\\).`,
    });
  }
  if (variant === 3) {
    const n = 4 + step;
    const answer = catalan(n);
    return createOneHintQuestion({
      question: `What is the ${n}th Catalan number?`,
      answer,
      hints: [
        `Formula: \\(C_n=\\dfrac{(2n)!}{(n+1)!\\,n!}\\).`,
        `Setup: substitute \\(n=${n}\\): \\(C_${n}=\\dfrac{${2 * n}!}{${n + 1}!\\,${n}!}\\).`,
        `Final path: reduce the factorial fraction carefully before multiplying.`,
      ],
      solution: `\\(C_${n}=\\dfrac{${2 * n}!}{${n + 1}!\\,${n}!}=${answer}\\).`,
    });
  }
  if (variant === 4) {
    const a = 18 + step;
    const b = 12 + (step % 17);
    const answer = (a * a) + (b ** 3);
    return createOneHintQuestion({
      question: `What is ${a} squared plus ${b} cubed?`,
      answer,
      hints: [
        `Formula: \\(${a}^2+${b}^3\\).`,
        `Setup: \\(${a}^2=${a * a}\\) and \\(${b}^3=${b ** 3}\\).`,
        `Final path: add \\(${a * a}\\) and \\(${b ** 3}\\).`,
      ],
      solution: `\\(${a}^2+${b}^3=${a * a}+${b ** 3}=${answer}\\).`,
    });
  }
  if (variant === 5) {
    const n = 14 + (step % 7);
    const r = 5;
    const answer = combination(n, r);
    return createOneHintQuestion({
      question: `How many ways can you choose ${r} objects from ${n} objects?`,
      answer,
      hints: [
        `Formula: \\(\\binom{n}{r}=\\dfrac{n!}{r!(n-r)!}\\).`,
        `Setup: \\(\\binom{${n}}{${r}}=\\dfrac{${n}!}{${r}!\\,${n - r}!}\\).`,
        `Final path: cancel to \\(\\dfrac{${n}\\cdot${n - 1}\\cdot${n - 2}\\cdot${n - 3}\\cdot${n - 4}}{${r}!}\\).`,
      ],
      solution: `\\(\\binom{${n}}{${r}}=${answer}\\).`,
    });
  }
  if (variant === 6) {
    const first = 8 + step;
    const ratio = 2 + (step % 3);
    const n = 6;
    const answer = first * ((ratio ** n) - 1) / (ratio - 1);
    return createOneHintQuestion({
      question: `What is the sum of the first ${n} terms of a geometric sequence starting at ${first} with ratio ${ratio}?`,
      answer,
      hints: [
        `Formula: \\(S_n=a\\dfrac{r^n-1}{r-1}\\).`,
        `Setup: \\(S_${n}=${first}\\dfrac{${ratio}^${n}-1}{${ratio}-1}\\).`,
        `Final path: compute \\(${ratio}^${n}\\), subtract \\(1\\), then multiply by \\(${first}\\) and divide by \\(${ratio - 1}\\).`,
      ],
      solution: `\\(S_${n}=${first}\\dfrac{${ratio}^${n}-1}{${ratio}-1}=${answer}\\).`,
    });
  }
  const a = 9 + (step % 13);
  const m = [31, 37, 41, 43, 47, 53, 59][step % 7];
  const answer = modInverse(a, m);
  return createOneHintQuestion({
    question: `What is the modular inverse of ${a} modulo ${m}?`,
    answer,
    hints: [
      `Formula: find \\(x\\) where \\(${a}x\\equiv1\\pmod{${m}}\\).`,
      `Setup: test multiples of \\(${a}\\) or use the extended Euclidean algorithm.`,
      `Final path: the inverse is the number that makes \\(${a}x-1\\) divisible by \\(${m}\\).`,
    ],
    solution: `\\(${a}\\cdot${answer}\\equiv1\\pmod{${m}}\\), so the modular inverse is \\(${answer}\\).`,
  });
}

function buildImpossibleOneHintQuestion(index) {
  const variant = index % 8;
  const step = Math.floor(index / 8);
  if (variant === 0) {
    const n = 9 + step;
    const answer = catalan(n);
    return createOneHintQuestion({
      question: `What is the ${n}th Catalan number?`,
      answer,
      hints: [
        `Formula: \\(C_n=\\dfrac{(2n)!}{(n+1)!\\,n!}\\).`,
        `Setup: \\(C_${n}=\\dfrac{${2 * n}!}{${n + 1}!\\,${n}!}\\).`,
        `Final path: cancel the factorials before multiplying; the reduced value is \\(${answer}\\).`,
      ],
      solution: `\\(C_${n}=\\dfrac{${2 * n}!}{${n + 1}!\\,${n}!}=${answer}\\).`,
    });
  }
  if (variant === 1) {
    const a = 12 + step;
    const b = 10 + (step % 19);
    const c = 7 + (step % 14);
    const answer = (a ** 4) - (b ** 3) + (c * c);
    return createOneHintQuestion({
      question: `What is ${a} to the 4th power minus ${b} cubed plus ${c} squared?`,
      answer,
      hints: [
        `Formula: \\(${a}^4-${b}^3+${c}^2\\).`,
        `Setup: \\(${a}^4=(${a}^2)^2\\), \\(${b}^3=${b}\\cdot${b}\\cdot${b}\\), and \\(${c}^2=${c * c}\\).`,
        `Final path: combine \\(${a ** 4}\\), \\(-${b ** 3}\\), and \\(${c * c}\\).`,
      ],
      solution: `\\(${a}^4-${b}^3+${c}^2=${a ** 4}-${b ** 3}+${c * c}=${answer}\\).`,
    });
  }
  if (variant === 2) {
    const n = 25 + step;
    const answer = totient(n * n);
    return createOneHintQuestion({
      question: `What is Euler's totient of ${n} squared?`,
      answer,
      hints: [
        `Formula: \\(\\varphi(N)=N\\prod_{p\\mid N}\\left(1-\\dfrac{1}{p}\\right)\\).`,
        `Setup: use \\(N=${n}^2\\), then list the distinct prime factors of \\(${n}\\).`,
        `Final path: square \\(${n}\\), then multiply by \\(1-1/p\\) for each distinct prime \\(p\\).`,
      ],
      solution: `\\(\\varphi(${n}^2)=\\varphi(${n * n})=${answer}\\).`,
    });
  }
  if (variant === 3) {
    const n = 7 + step;
    const answer = derangements(n);
    return createOneHintQuestion({
      question: `How many derangements are there of ${n} objects?`,
      answer,
      hints: [
        `Formula: \\(!n=(n-1)\\big(!(n-1)+!(n-2)\\big)\\).`,
        `Setup: start from \\(!1=0\\) and \\(!2=1\\), then build upward to \\(!${n}\\).`,
        `Final path: apply the recurrence one row at a time until \\(n=${n}\\).`,
      ],
      solution: `Using \\(!n=(n-1)(!(n-1)+!(n-2))\\), \\(!${n}=${answer}\\).`,
    });
  }
  if (variant === 4) {
    const a = 19 + step;
    const b = 11 + (step % 13);
    const m = 101 + (step * 6);
    const answer = modPow(a, b, m);
    return createOneHintQuestion({
      question: `What is the remainder when ${a} to the ${b} power is divided by ${m}?`,
      answer,
      hints: [
        `Formula: compute \\(${a}^{${b}}\\bmod ${m}\\).`,
        `Setup: use repeated squaring: \\(a^{2k}\\equiv(a^k)^2\\pmod{${m}}\\).`,
        `Final path: write \\(${b}\\) as a sum of powers of \\(2\\), then multiply those reduced powers.`,
      ],
      solution: `Repeated squaring gives \\(${a}^{${b}}\\equiv${answer}\\pmod{${m}}\\).`,
    });
  }
  if (variant === 5) {
    const n = 16 + (step % 7);
    const r = 6;
    const answer = combination(n, r);
    return createOneHintQuestion({
      question: `How many ways can you choose ${r} objects from ${n} objects?`,
      answer,
      hints: [
        `Formula: \\(\\binom{n}{r}=\\dfrac{n!}{r!(n-r)!}\\).`,
        `Setup: \\(\\binom{${n}}{${r}}=\\dfrac{${n}!}{${r}!\\,${n - r}!}\\).`,
        `Final path: cancel \\(${n - r}!\\), then divide the remaining product by \\(${r}!\\).`,
      ],
      solution: `\\(\\binom{${n}}{${r}}=${answer}\\).`,
    });
  }
  if (variant === 6) {
    const n = 84 + step;
    const answer = divisorCount(n);
    return createOneHintQuestion({
      question: `How many positive divisors does ${n} have?`,
      answer,
      hints: [
        `Formula: if \\(N=\\prod p_i^{e_i}\\), then \\(d(N)=\\prod(e_i+1)\\).`,
        `Setup: prime-factorize \\(${n}\\), then read the exponents.`,
        `Final path: add \\(1\\) to every exponent and multiply those numbers.`,
      ],
      solution: `For \\(${n}\\), the divisor-count formula gives \\(d(${n})=${answer}\\).`,
    });
  }
  const first = 5 + step;
  const difference = 4 + (step % 7);
  const n = 18 + (step % 6);
  const answer = (n * ((2 * first) + ((n - 1) * difference))) / 2;
  return createOneHintQuestion({
    question: `What is the sum of the first ${n} terms of an arithmetic sequence starting at ${first} with difference ${difference}?`,
    answer,
    hints: [
      `Formula: \\(S_n=\\dfrac{n}{2}\\big(2a_1+(n-1)d\\big)\\).`,
      `Setup: \\(S_${n}=\\dfrac{${n}}{2}\\big(2\\cdot${first}+(${n}-1)\\cdot${difference}\\big)\\).`,
      `Final path: compute the expression inside parentheses first, then multiply by \\(${n}/2\\).`,
    ],
    solution: `\\(S_${n}=\\dfrac{${n}}{2}\\big(2\\cdot${first}+(${n}-1)\\cdot${difference}\\big)=${answer}\\).`,
  });
}

function gcd(a, b) {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left;
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function combination(n, r) {
  const k = Math.min(r, n - r);
  let numerator = 1n;
  let denominator = 1n;
  for (let index = 1; index <= k; index += 1) {
    numerator *= BigInt(n - k + index);
    denominator *= BigInt(index);
  }
  return numerator / denominator;
}

function primeFactors(n) {
  const factors = [];
  let remainder = n;
  for (let factor = 2; factor * factor <= remainder; factor += 1) {
    while (remainder % factor === 0) {
      factors.push(factor);
      remainder /= factor;
    }
  }
  if (remainder > 1) {
    factors.push(remainder);
  }
  return factors;
}

function primeFactorSum(n) {
  return primeFactors(n).reduce((total, factor) => total + factor, 0);
}

function divisorCount(n) {
  let count = 1;
  let remainder = n;
  for (let factor = 2; factor * factor <= remainder; factor += 1) {
    if (remainder % factor !== 0) {
      continue;
    }
    let exponent = 0;
    while (remainder % factor === 0) {
      exponent += 1;
      remainder /= factor;
    }
    count *= exponent + 1;
  }
  if (remainder > 1) {
    count *= 2;
  }
  return count;
}

function modInverse(value, modulus) {
  let previousRemainder = modulus;
  let remainder = ((value % modulus) + modulus) % modulus;
  let previousCoefficient = 0;
  let coefficient = 1;

  while (remainder > 0) {
    const quotient = Math.floor(previousRemainder / remainder);
    [previousRemainder, remainder] = [remainder, previousRemainder - (quotient * remainder)];
    [previousCoefficient, coefficient] = [coefficient, previousCoefficient - (quotient * coefficient)];
  }

  if (previousRemainder !== 1) {
    return 0;
  }

  return ((previousCoefficient % modulus) + modulus) % modulus;
}

function fibonacci(n) {
  let previous = 1n;
  let current = 1n;
  for (let index = 3; index <= n; index += 1) {
    const next = previous + current;
    previous = current;
    current = next;
  }
  return current;
}

function factorial(n) {
  let result = 1n;
  for (let value = 2; value <= n; value += 1) {
    result *= BigInt(value);
  }
  return result;
}

function catalan(n) {
  return factorial(2 * n) / (factorial(n + 1) * factorial(n));
}

function derangements(n) {
  let previous = 1n;
  let current = 0n;
  for (let value = 2; value <= n; value += 1) {
    const next = BigInt(value - 1) * (current + previous);
    previous = current;
    current = next;
  }
  return current;
}

function totient(n) {
  let result = n;
  let remainder = n;
  for (let factor = 2; factor * factor <= remainder; factor += 1) {
    if (remainder % factor !== 0) {
      continue;
    }
    while (remainder % factor === 0) {
      remainder /= factor;
    }
    result -= result / factor;
  }
  if (remainder > 1) {
    result -= result / remainder;
  }
  return result;
}

function modPow(base, exponent, modulus) {
  let result = 1;
  let current = base % modulus;
  let power = exponent;
  while (power > 0) {
    if (power % 2 === 1) {
      result = (result * current) % modulus;
    }
    current = (current * current) % modulus;
    power = Math.floor(power / 2);
  }
  return result;
}

function stopTimer() {
  if (!timerInterval) {
    return;
  }

  clearInterval(timerInterval);
  timerInterval = null;
}

function ensureTimerStarted() {
  if (!roundStartedAt) {
    roundStartedAt = Date.now();
  }

  if (!timerInterval) {
    timerInterval = window.setInterval(updateTimerUi, 1000);
  }

  updateTimerUi();
}

function getElapsedSeconds() {
  if (!roundStartedAt) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - roundStartedAt) / 1000));
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatTimer() {
  const config = getModeConfig();
  if (config.timeLimitSeconds) {
    const remaining = Math.max(0, config.timeLimitSeconds - getElapsedSeconds());
    return formatDuration(remaining);
  }
  return formatDuration(getElapsedSeconds());
}

function updateTimerUi() {
  dom.timerBadge.textContent = formatTimer();
  const config = getModeConfig();
  const timedOut = config.timeLimitSeconds && getElapsedSeconds() >= config.timeLimitSeconds;
  if (timedOut && !dom.guessInput.disabled && currentUser && currentUsername) {
    dom.guessInput.disabled = true;
    dom.guessButton.disabled = true;
    setEmojiReaction("⏱️ Time up");
    setStatus(`Time is up. The secret number was ${secretNumber}. Start a new Time Attack to try again.`, "status-hint");
    stopTimer();
    saveGameState();
  }
}

function handleNumberPadClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || dom.guessInput.disabled) {
    return;
  }

  const key = target.dataset.keypad;
  if (!key) {
    return;
  }

  if (key === "clear") {
    dom.guessInput.value = "";
  } else if (key === "backspace") {
    dom.guessInput.value = dom.guessInput.value.slice(0, -1);
  } else {
    dom.guessInput.value = sanitizeGuessValue(dom.guessInput.value + key);
  }

  playFeedback("tap");
  handleGuessInput();
  dom.guessInput.focus();
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
  dom.usernameInput.value = preset || getSuggestedUsername();
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
  const fallbackName = isGuestPlayer ? "Guest Player" : (currentUser?.displayName || currentUser?.email || "Player");
  dom.profileAvatar.src = currentUser?.photoURL || DEFAULT_AVATAR;
  dom.profileAvatar.alt = `${fallbackName} profile photo`;
  dom.profileName.textContent = currentUsername || fallbackName;
  dom.profileHandle.textContent = isGuestPlayer
    ? "Playing as guest. Sign in for named friend challenges."
    : (currentUser?.email ? `Google: ${currentUser.email}` : "Signed in with Google");
  dom.signOutBtn.textContent = isGuestPlayer ? "Sign in" : "Sign out";
  updateChallengeUi();
}

function getChallengePanelCopy() {
  if (isGuestPlayer) {
    return "Guest play is instant. Sign in with Google when you want named friend challenges.";
  }

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
  const canCreateChallenge = Boolean(currentUser && currentUsername && !isGuestPlayer);
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
    return /^\d{3,4}$/.test(secret) ? secret : null;
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

  const mode = GAME_MODES[url.searchParams.get(MODE_PARAM)] ? url.searchParams.get(MODE_PARAM) : "classic";
  const secret = decodeChallengeSecret(token);
  if (!secret || !isValidSecretForMode(secret, mode)) {
    return null;
  }

  return {
    secret,
    token,
    mode,
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
    url.searchParams.set(MODE_PARAM, currentMode);

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
    url.searchParams.delete(MODE_PARAM);
  }

  window.history.replaceState({}, "", url);
}

function buildChallengeLinkValue() {
  if (!currentChallengeToken) {
    return "";
  }

  const url = new URL(window.location.href);
  url.searchParams.set(CHALLENGE_PARAM, currentChallengeToken);
  url.searchParams.set(MODE_PARAM, currentMode);

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
    heading: [
      item.querySelector(".history-guess-number")?.textContent,
      item.querySelector(".history-guess-digits")?.textContent,
    ].filter(Boolean).join(": ") || item.querySelector("h3")?.textContent || "",
    body: item.querySelector("p")?.textContent || "",
  }));

  const payload = {
    secretNumber,
    currentMode,
    isDailyChallenge,
    timerStarted: Boolean(roundStartedAt),
    roundStartedAt,
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
    dom.historyList.append(createHistoryItem(entry.heading, entry.body));
  });
}

function createHistoryItem(headingText, bodyText) {
  const item = document.createElement("article");
  item.className = "history-item";

  const heading = document.createElement("h3");
  const match = String(headingText || "").match(/^(Guess\s+\d+):?\s*(\d+)?$/i);
  const guessNumber = document.createElement("span");
  guessNumber.className = "history-guess-number";
  guessNumber.textContent = match?.[1] || String(headingText || "Guess");

  heading.append(guessNumber);

  if (match?.[2]) {
    const guessDigits = document.createElement("span");
    guessDigits.className = "history-guess-digits";
    guessDigits.textContent = match[2];
    heading.append(guessDigits);
  }

  const body = document.createElement("p");
  body.textContent = bodyText;

  item.append(heading, body);
  return item;
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
  const secretCounts = {};
  const guessCounts = {};

  for (let index = 0; index < guess.length; index += 1) {
    if (guess[index] === secret[index]) {
      correctPlace += 1;
      continue;
    }
    secretCounts[secret[index]] = (secretCounts[secret[index]] || 0) + 1;
    guessCounts[guess[index]] = (guessCounts[guess[index]] || 0) + 1;
  }

  let wrongPlace = 0;
  Object.entries(guessCounts).forEach(([digit, count]) => {
    wrongPlace += Math.min(count, secretCounts[digit] || 0);
  });

  return { correctPlace, wrongPlace };
}

function getEmojiReaction(correctPlace, wrongPlace, isWin) {
  if (isWin) {
    return "👑 Perfect hit";
  }
  if (correctPlace >= 3) {
    return "🔥 Nearly there";
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

  const savedMode = GAME_MODES[saved.currentMode] ? saved.currentMode : "classic";
  const validSecret = typeof saved.secretNumber === "string"
    && isValidSecretForMode(saved.secretNumber, savedMode);

  if (!validSecret) {
    clearGameState();
    return false;
  }

  currentMode = savedMode;
  isDailyChallenge = Boolean(saved.isDailyChallenge);
  secretNumber = saved.secretNumber;
  attempts = Number(saved.attempts) || 0;
  roundStartedAt = attempts > 0 ? Number(saved.roundStartedAt) || Date.now() : null;
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
  updateModeUi();
  renderHistory(Array.isArray(saved.history) ? saved.history : []);
  renderDigitTracker();
  renderLeaderboard();
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
    if (roundStartedAt) {
      ensureTimerStarted();
    } else {
      updateTimerUi();
    }
    dom.guessInput.focus();
  } else {
    stopTimer();
    updateTimerUi();
  }

  return true;
}
function initializeFreshRound(statusText = DEFAULT_STATUS) {
  attempts = 0;
  crossedDigits = [];
  roundStartedAt = null;
  solvedSummary = null;
  stopTimer();
  hideCelebration();
  dom.guessInput.disabled = false;
  dom.guessButton.disabled = false;
  dom.newGameBtn.disabled = false;
  dom.guessInput.value = "";
  dom.guessNotes.value = "";
  dom.historyList.innerHTML = '<p class="empty-state">Your hints will appear here after each guess.</p>';
  updateAttemptCount();
  updateModeUi();
  renderDigitTracker();
  renderLeaderboard();
  updateChallengeUi();
  syncChallengeUrl();
  setEmojiReaction("🎯 Steady start");
  updateCoachPanel();
  updateTimerUi();
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

function startChallengeRound(secret, token, meta, mode = "classic") {
  currentMode = GAME_MODES[mode] ? mode : "classic";
  isDailyChallenge = false;
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
      currentMode = challenge.mode;
      isDailyChallenge = false;
      currentChallengeMeta = createChallengeMeta(
        challenge.meta.creatorUsername || currentChallengeMeta.creatorUsername,
        challenge.meta.opponentUsername || currentChallengeMeta.opponentUsername,
      );
      if (currentChallengeMeta.opponentUsername) {
        dom.challengeOpponentInput.value = currentChallengeMeta.opponentUsername;
      }
      updateModeUi();
      updateChallengeUi();
      syncChallengeUrl();
      return restored;
    }

    startChallengeRound(challenge.secret, challenge.token, challenge.meta, challenge.mode);
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

function getOneHintDifficultyConfig() {
  return ONE_HINT_DIFFICULTIES[currentOneHintDifficulty] || ONE_HINT_DIFFICULTIES.easy;
}

function getOneHintProgressKey(difficulty = currentOneHintDifficulty) {
  const playerId = currentUser?.uid || GUEST_UID;
  const playerName = currentUsername || "player";
  return `${ONE_HINT_PROGRESS_STORAGE_PREFIX}:${playerId}:${playerName}:${difficulty}`;
}

function getOneHintStreakKey(difficulty = currentOneHintDifficulty) {
  const playerId = currentUser?.uid || GUEST_UID;
  const playerName = currentUsername || "player";
  return `${ONE_HINT_STREAK_STORAGE_PREFIX}:${playerId}:${playerName}:${difficulty}`;
}

function getInitialOneHintQuestionIndex(difficulty = currentOneHintDifficulty) {
  const playerSeed = `${currentUser?.uid || GUEST_UID}:${currentUsername || "player"}`;
  return hashString(`${playerSeed}:one-hint:${difficulty}`) % 20;
}

function createDefaultOneHintProgress(difficulty = currentOneHintDifficulty) {
  return {
    index: getInitialOneHintQuestionIndex(difficulty),
    attempts: 0,
    hintLevel: 0,
    solved: false,
    currentInput: "",
  };
}

function loadOneHintProgress(difficulty = currentOneHintDifficulty) {
  try {
    const raw = localStorage.getItem(getOneHintProgressKey(difficulty));
    if (!raw) {
      return createDefaultOneHintProgress(difficulty);
    }

    const migratedIndex = Number(raw);
    if (Number.isSafeInteger(migratedIndex) && migratedIndex >= 0) {
      return { ...createDefaultOneHintProgress(difficulty), index: migratedIndex };
    }

    const saved = JSON.parse(raw);
    const fallback = createDefaultOneHintProgress(difficulty);
    return {
      index: Number.isSafeInteger(saved.index) && saved.index >= 0 ? saved.index : fallback.index,
      attempts: Number.isSafeInteger(saved.attempts) && saved.attempts >= 0 ? saved.attempts : 0,
      hintLevel: Number.isSafeInteger(saved.hintLevel) && saved.hintLevel >= 0 ? saved.hintLevel : 0,
      solved: Boolean(saved.solved),
      currentInput: typeof saved.currentInput === "string" ? saved.currentInput.replace(/\D/g, "") : "",
    };
  } catch {
    return createDefaultOneHintProgress(difficulty);
  }
}

function saveOneHintProgress(difficulty = currentOneHintDifficulty) {
  try {
    localStorage.setItem(getOneHintProgressKey(difficulty), JSON.stringify({
      index: oneHintQuestionIndex,
      attempts: oneHintAttempts,
      hintLevel: oneHintHintLevel,
      solved: oneHintSolved,
      currentInput: oneHintSolved ? "" : dom.oneHintInput.value,
    }));
  } catch {
    // One Hint can still generate fresh clues if storage is unavailable.
  }
}

function loadOneHintStreak(difficulty = currentOneHintDifficulty) {
  try {
    const saved = JSON.parse(localStorage.getItem(getOneHintStreakKey(difficulty)) || "{}");
    return {
      current: Number.isSafeInteger(saved.current) && saved.current >= 0 ? saved.current : 0,
      best: Number.isSafeInteger(saved.best) && saved.best >= 0 ? saved.best : 0,
    };
  } catch {
    return { current: 0, best: 0 };
  }
}

function saveOneHintStreak(streak, difficulty = currentOneHintDifficulty) {
  try {
    localStorage.setItem(getOneHintStreakKey(difficulty), JSON.stringify(streak));
  } catch {
    // Streaks are a nice-to-have; gameplay should continue without storage.
  }
}

function resetOneHintStreak(difficulty = currentOneHintDifficulty) {
  const streak = loadOneHintStreak(difficulty);
  saveOneHintStreak({ current: 0, best: streak.best }, difficulty);
}

function recordOneHintSolvedStreak(difficulty = currentOneHintDifficulty) {
  const streak = loadOneHintStreak(difficulty);
  const current = streak.current + 1;
  const next = { current, best: Math.max(streak.best, current) };
  saveOneHintStreak(next, difficulty);
  return next;
}

function getCurrentOneHintQuestion() {
  const config = getOneHintDifficultyConfig();
  return currentOneHintQuestion || config.buildQuestion(oneHintQuestionIndex);
}

function getOneHintScore(attempts = oneHintAttempts, hintLevel = oneHintHintLevel) {
  return Math.max(10, ONE_HINT_MAX_SCORE - (attempts * ONE_HINT_ATTEMPT_PENALTY) - (hintLevel * ONE_HINT_HINT_PENALTY));
}

function getOneHintHints(question = getCurrentOneHintQuestion()) {
  if (Array.isArray(question.hints)) {
    return question.hints;
  }

  return question.formulaHint ? [question.formulaHint] : [];
}

function supportsOneHintFormulaHint(question = getCurrentOneHintQuestion()) {
  return getOneHintHints(question).length > 0;
}

function hideOneHintFormulaHint() {
  dom.oneHintFormulaHint.textContent = "";
  dom.oneHintFormulaHint.hidden = true;
}

function updateOneHintFormulaHintUi(question = getCurrentOneHintQuestion()) {
  const hints = getOneHintHints(question);
  const canShowHint = hints.length > 0 && oneHintHintLevel < hints.length;
  dom.oneHintFormulaBtn.hidden = !canShowHint;
  dom.oneHintFormulaBtn.disabled = !canShowHint || oneHintSolved || !currentUser || !currentUsername;
  dom.oneHintFormulaBtn.textContent = `Hint ${Math.min(oneHintHintLevel + 1, hints.length)}${oneHintHintLevel > 0 ? ` / ${hints.length}` : ""}`;
  if (!canShowHint) {
    dom.oneHintFormulaBtn.hidden = hints.length === 0;
  }
}

function showOneHintFormulaHint() {
  const currentQuestion = getCurrentOneHintQuestion();
  const hints = getOneHintHints(currentQuestion);
  if (!supportsOneHintFormulaHint(currentQuestion) || oneHintHintLevel >= hints.length) {
    return;
  }

  oneHintHintLevel += 1;
  dom.oneHintFormulaHint.textContent = hints.slice(0, oneHintHintLevel).join("\n\n");
  dom.oneHintFormulaHint.hidden = false;
  updateOneHintStatsUi();
  updateOneHintFormulaHintUi(currentQuestion);
  saveOneHintProgress();
  typesetFormulaHint();
}

function typesetFormulaHint() {
  const mathJax = window.MathJax;
  if (!mathJax?.typesetPromise) {
    return;
  }

  mathJax.typesetPromise([dom.oneHintFormulaHint]).catch(() => {
    // Leave the readable LaTeX source visible if MathJax cannot render.
  });
}

function updateOneHintStatsUi() {
  const streak = loadOneHintStreak();
  dom.oneHintAttemptBadge.textContent = `${oneHintAttempts} ${oneHintAttempts === 1 ? "try" : "tries"}`;
  dom.oneHintScoreBadge.textContent = `${getOneHintScore()} pts`;
  dom.oneHintStreakBadge.textContent = `${streak.current} streak · best ${streak.best}`;
}

function hideOneHintSolution() {
  dom.oneHintSolution.textContent = "";
  dom.oneHintSolution.hidden = true;
}

function showOneHintSolution(question = getCurrentOneHintQuestion()) {
  dom.oneHintSolution.innerHTML = "";
  const title = document.createElement("p");
  title.textContent = `Worked solution · ${getOneHintScore()} pts`;
  const body = document.createElement("p");
  body.textContent = question.solution;
  dom.oneHintSolution.append(title, body);
  dom.oneHintSolution.hidden = false;

  const mathJax = window.MathJax;
  if (mathJax?.typesetPromise) {
    mathJax.typesetPromise([dom.oneHintSolution]).catch(() => {
      // The plain solution remains readable if MathJax cannot render.
    });
  }
}

function initializeOneHintQuestionForPlayer() {
  if (oneHintInitialized) {
    return true;
  }

  if (!currentUser || !currentUsername) {
    return false;
  }

  const saved = loadOneHintProgress(currentOneHintDifficulty);
  oneHintQuestionIndex = saved.index;
  currentOneHintQuestion = getOneHintDifficultyConfig().buildQuestion(oneHintQuestionIndex);
  oneHintAttempts = saved.attempts;
  oneHintHintLevel = Math.min(saved.hintLevel, getOneHintHints(currentOneHintQuestion).length);
  oneHintSolved = saved.solved;
  oneHintInitialized = true;
  dom.oneHintInput.value = saved.currentInput.slice(0, currentOneHintQuestion.answer.length);
  return true;
}

function renderOneHintQuestion() {
  dom.oneHintModeTabs.querySelectorAll("[data-one-hint-mode]").forEach((button) => {
    const isActive = button.dataset.oneHintMode === currentOneHintDifficulty;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  const hasPlayerQuestion = initializeOneHintQuestionForPlayer();
  if (!hasPlayerQuestion) {
    dom.oneHintQuestion.textContent = "Your clue is loading.";
    dom.oneHintInput.value = "";
    dom.oneHintInput.maxLength = "4";
    dom.oneHintInput.placeholder = "Answer";
    dom.oneHintFeedback.textContent = "Use the clue. This mode only says correct or wrong.";
    dom.oneHintFeedback.className = "one-hint-feedback";
    oneHintAttempts = 0;
    oneHintHintLevel = 0;
    updateOneHintStatsUi();
    dom.oneHintInput.disabled = true;
    dom.oneHintSubmitBtn.disabled = true;
    updateOneHintFormulaHintUi({ formulaHint: "" });
    hideOneHintSolution();
    return;
  }

  const currentQuestion = getCurrentOneHintQuestion();
  dom.oneHintQuestion.textContent = currentQuestion.question;
  if (oneHintSolved) {
    dom.oneHintInput.value = "";
  }
  dom.oneHintInput.maxLength = String(Math.max(1, currentQuestion.answer.length));
  dom.oneHintInput.placeholder = "Answer";
  dom.oneHintFeedback.textContent = oneHintSolved ? "Correct." : "Use the clue. This mode only says correct or wrong.";
  dom.oneHintFeedback.className = "one-hint-feedback";
  dom.oneHintFeedback.classList.toggle("is-correct", oneHintSolved);
  updateOneHintStatsUi();
  dom.oneHintInput.disabled = oneHintSolved || !currentUser || !currentUsername;
  dom.oneHintSubmitBtn.disabled = oneHintSolved || !currentUser || !currentUsername;
  if (oneHintHintLevel > 0) {
    dom.oneHintFormulaHint.textContent = getOneHintHints(currentQuestion).slice(0, oneHintHintLevel).join("\n\n");
    dom.oneHintFormulaHint.hidden = false;
    typesetFormulaHint();
  } else {
    hideOneHintFormulaHint();
  }
  if (oneHintSolved) {
    showOneHintSolution(currentQuestion);
  } else {
    hideOneHintSolution();
  }
  updateOneHintFormulaHintUi(currentQuestion);
}

function startNewOneHintQuestion() {
  initializeOneHintQuestionForPlayer();
  if (!oneHintSolved && oneHintAttempts > 0) {
    resetOneHintStreak();
  }
  oneHintQuestionIndex += 1;
  currentOneHintQuestion = getOneHintDifficultyConfig().buildQuestion(oneHintQuestionIndex);
  oneHintAttempts = 0;
  oneHintHintLevel = 0;
  oneHintSolved = false;
  dom.oneHintInput.value = "";
  saveOneHintProgress();
  renderOneHintQuestion();
  dom.oneHintInput.focus();
}

function handleOneHintModeClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.dataset.oneHintMode) {
    return;
  }

  if (!ONE_HINT_DIFFICULTIES[target.dataset.oneHintMode]) {
    return;
  }

  currentOneHintDifficulty = target.dataset.oneHintMode;
  oneHintInitialized = false;
  currentOneHintQuestion = null;
  oneHintAttempts = 0;
  oneHintHintLevel = 0;
  oneHintSolved = false;
  renderOneHintQuestion();
  dom.oneHintInput.focus();
}

function handleOneHintInput() {
  const sanitized = String(dom.oneHintInput.value || "").replace(/\D/g, "").slice(0, dom.oneHintInput.maxLength);
  if (dom.oneHintInput.value !== sanitized) {
    dom.oneHintInput.value = sanitized;
  }
  saveOneHintProgress();
}

function handleOneHintSubmit(event) {
  event.preventDefault();

  if (oneHintSolved) {
    return;
  }

  const answer = getCurrentOneHintQuestion().answer;
  const guess = dom.oneHintInput.value.trim();
  if (!guess) {
    dom.oneHintFeedback.textContent = "Try again.";
    dom.oneHintFeedback.className = "one-hint-feedback is-wrong";
    dom.oneHintInput.focus();
    return;
  }

  oneHintAttempts += 1;
  updateOneHintStatsUi();

  if (guess === answer) {
    oneHintSolved = true;
    recordOneHintSolvedStreak();
    updateOneHintStatsUi();
    dom.oneHintFeedback.textContent = `Correct. Score: ${getOneHintScore()} pts.`;
    dom.oneHintFeedback.className = "one-hint-feedback is-correct";
    dom.oneHintInput.disabled = true;
    dom.oneHintSubmitBtn.disabled = true;
    updateOneHintFormulaHintUi();
    showOneHintSolution();
    saveOneHintProgress();
    return;
  }

  dom.oneHintFeedback.textContent = "Wrong. Try again.";
  dom.oneHintFeedback.className = "one-hint-feedback is-wrong";
  dom.oneHintInput.value = "";
  saveOneHintProgress();
  dom.oneHintInput.focus();
}

function handleCreateChallenge() {
  if (isGuestPlayer) {
    setStatus("Sign in with Google to create named friend challenges.", "status-hint");
    return;
  }

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

  if (isDailyChallenge) {
    const dailyAttempt = loadDailyAttempt(currentMode);
    if (dailyAttempt?.completed) {
      setStatus(`You already finished today's Daily ${getModeLabel()}. Tomorrow brings a new ranked code.`, "status-hint");
      dom.guessInput.value = "";
      dom.guessInput.disabled = true;
      dom.guessButton.disabled = true;
      return;
    }
  }

  const guess = dom.guessInput.value.trim();
  if (!isValidGuess(guess)) {
    setStatus(getGuessHelp(), "status-hint");
    dom.guessInput.focus();
    return;
  }

  ensureTimerStarted();
  attempts += 1;
  updateAttemptCount();
  playFeedback("tap");

  const score = scoreGuess(secretNumber, guess);
  const hint = buildHint(secretNumber, guess);
  appendHistoryItem(guess, hint);
  updateCoachPanel(buildCoachTip(score, guess));
  saveGameState();

  if (guess === secretNumber) {
    const elapsedSeconds = getElapsedSeconds();
    const reaction = getEmojiReaction(score.correctPlace, score.wrongPlace, true);
    setEmojiReaction(reaction);
    popGuessEmoji(reaction);
    setStatus(`🎉 You guessed it. The secret number was ${secretNumber}.`, "status-win");
    recordLeaderboardScore(attempts, elapsedSeconds);
    playFeedback("win");
    showCelebration(secretNumber, attempts, elapsedSeconds);
    dom.guessInput.value = "";
    dom.guessInput.disabled = true;
    dom.guessButton.disabled = true;
    stopTimer();
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
  const sanitized = sanitizeGuessValue(dom.guessInput.value);

  if (dom.guessInput.value !== sanitized) {
    dom.guessInput.value = sanitized;
    setStatus(getGuessHelp(), "status-hint");
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

  const config = getModeConfig();
  if (!config.digits.includes(event.key)) {
    event.preventDefault();
    setStatus(getGuessHelp(), "status-hint");
    return;
  }

  const selectionStart = dom.guessInput.selectionStart ?? dom.guessInput.value.length;
  const selectionEnd = dom.guessInput.selectionEnd ?? dom.guessInput.value.length;
  const nextValue = [
    dom.guessInput.value.slice(0, selectionStart),
    event.key,
    dom.guessInput.value.slice(selectionEnd),
  ].join("");

  const sanitized = sanitizeGuessValue(nextValue);
  if (sanitized !== nextValue || sanitized.length > config.length) {
    event.preventDefault();
    setStatus(getGuessHelp(), "status-hint");
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

  const sanitized = sanitizeGuessValue(merged);
  dom.guessInput.value = sanitized;

  if (sanitized !== merged) {
    setStatus(getGuessHelp(), "status-hint");
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

  const sanitized = sanitizeGuessValue(nextValue);

  if (sanitized !== nextValue) {
    event.preventDefault();
    if (incoming) {
      setStatus(getGuessHelp(), "status-hint");
    }
  }
}

function uniqueDigitString(value) {
  return sanitizeGuessValue(value);
}

function resetGame() {
  if (attempts > 0 && !dom.guessInput.disabled) {
    const confirmed = window.confirm("Start a new secret number? Your current guesses and notes will be cleared.");
    if (!confirmed) {
      return;
    }
  }

  currentChallengeToken = "";
  currentChallengeMeta = createChallengeMeta();
  isDailyChallenge = false;
  activeLeaderboardBoard = currentMode;
  updateChallengeUi();
  syncChallengeUrl();
  secretNumber = generateSecretNumber();
  initializeFreshRound(`✨ A new ${getModeLabel()} number is ready. ${getGuessHelp()}`);
}

function generateSecretNumber(mode = currentMode, seed = null) {
  const config = getModeConfig(mode);
  const random = Number.isInteger(seed) ? seededRandom(seed) : Math.random;
  const digits = [];
  while (digits.length < config.length) {
    const digit = config.digits[Math.floor(random() * config.digits.length)];
    if (!config.unique || !digits.includes(digit)) {
      digits.push(digit);
    }
  }
  return digits.join("");
}

function isValidGuess(value) {
  return isValidSecretForMode(value);
}

function buildHint(secret, guess) {
  const { correctPlace, wrongPlace } = scoreGuess(secret, guess);

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
    4: "four",
  };
  return words[value] || String(value);
}

function pluralize(word, count) {
  return count === 1 ? word : `${word}s`;
}

function sentenceCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getLeaderboardKey(mode = currentMode, daily = isDailyChallenge) {
  const dailyKey = daily ? `daily:${new Date().toISOString().slice(0, 10)}` : "regular";
  return `${LEADERBOARD_STORAGE_PREFIX}:${mode}:${dailyKey}`;
}

function loadLeaderboardScores(mode = currentMode, daily = isDailyChallenge) {
  try {
    const raw = localStorage.getItem(getLeaderboardKey(mode, daily));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getGlobalLeaderboardBoardKey(mode = currentMode, daily = isDailyChallenge) {
  return daily ? `daily:${getTodayKey()}:${mode}` : `regular:${mode}`;
}

function getGlobalLeaderboardDocId(mode = currentMode, daily = isDailyChallenge, playerId = getGlobalPlayerId()) {
  return `${getGlobalLeaderboardBoardKey(mode, daily)}:${playerId}`.replace(/[^A-Za-z0-9_-]/g, "_");
}

function isBetterLeaderboardScore(nextScore, previousScore) {
  if (!previousScore) {
    return true;
  }

  const nextAttempts = Number(nextScore.attempts) || Number.MAX_SAFE_INTEGER;
  const previousAttempts = Number(previousScore.attempts) || Number.MAX_SAFE_INTEGER;
  if (nextAttempts !== previousAttempts) {
    return nextAttempts < previousAttempts;
  }

  return (Number(nextScore.seconds) || Number.MAX_SAFE_INTEGER) < (Number(previousScore.seconds) || Number.MAX_SAFE_INTEGER);
}

function withTimeout(promise, milliseconds, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

async function recordGlobalLeaderboardScore(score) {
  const playerId = getGlobalPlayerId();
  const docId = getGlobalLeaderboardDocId(score.mode, score.daily, playerId);
  const scoreRef = doc(db, GLOBAL_LEADERBOARD_COLLECTION, docId);
  const nextScore = {
    ...score,
    playerId,
    boardKey: getGlobalLeaderboardBoardKey(score.mode, score.daily),
    updatedAt: serverTimestamp(),
  };

  try {
    const currentScore = await withTimeout(getDoc(scoreRef), 8000, "Global leaderboard save timed out.");
    if (currentScore.exists() && !isBetterLeaderboardScore(nextScore, currentScore.data())) {
      return;
    }

    await withTimeout(setDoc(scoreRef, nextScore), 8000, "Global leaderboard save timed out.");
  } catch (error) {
    console.warn("Global leaderboard save failed:", error);
    setStatus("Local score saved. Global leaderboard could not be updated right now.", "status-hint");
  }
}

async function loadGlobalLeaderboardScores(mode = currentMode, daily = isDailyChallenge) {
  const boardKey = getGlobalLeaderboardBoardKey(mode, daily);
  const scoresQuery = query(
    collection(db, GLOBAL_LEADERBOARD_COLLECTION),
    where("boardKey", "==", boardKey),
  );

  const snapshot = await withTimeout(getDocs(scoresQuery), 8000, "Global leaderboard load timed out.");
  return snapshot.docs
    .map((entry) => entry.data())
    .sort((left, right) => left.attempts - right.attempts || left.seconds - right.seconds)
    .slice(0, 20);
}

function recordLeaderboardScore(totalAttempts, elapsedSeconds) {
  const playerId = getPlayerLeaderboardId();
  const scores = loadLeaderboardScores(currentMode, isDailyChallenge)
    .filter((score) => {
      const scorePlayerId = score.playerId || `name:${sanitizeUsername(score.username).toLowerCase()}`;
      return scorePlayerId !== playerId;
    });

  const score = {
    playerId,
    username: currentUsername || "Player",
    attempts: totalAttempts,
    seconds: elapsedSeconds,
    mode: currentMode,
    daily: isDailyChallenge,
    date: new Date().toISOString(),
  };

  scores.push(score);

  scores.sort((left, right) => left.attempts - right.attempts || left.seconds - right.seconds);
  localStorage.setItem(getLeaderboardKey(currentMode, isDailyChallenge), JSON.stringify(scores.slice(0, 6)));
  if (isDailyChallenge) {
    saveDailyAttempt(currentMode, {
      started: true,
      completed: true,
      completedAt: new Date().toISOString(),
      attempts: totalAttempts,
      seconds: elapsedSeconds,
      username: currentUsername,
      playerId,
    });
    recordDailyStreak();
  }
  recordGlobalLeaderboardScore(score).then(() => {
    if (activeLeaderboardScope === "global") {
      renderLeaderboard();
    }
  });
  renderLeaderboard();
}

function loadDailyStreak() {
  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lastSolvedDate: "" };
  } catch {
    return { count: 0, lastSolvedDate: "" };
  }
}

function getDateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return offsetDays === 0 ? getTodayKey() : date.toISOString().slice(0, 10);
}

function recordDailyStreak() {
  const streak = loadDailyStreak();
  const today = getDateKey();
  const yesterday = getDateKey(-1);

  if (streak.lastSolvedDate === today) {
    updateStreakBadge();
    return;
  }

  const next = {
    count: streak.lastSolvedDate === yesterday ? Number(streak.count || 0) + 1 : 1,
    lastSolvedDate: today,
  };
  localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(next));
  updateStreakBadge();
}

function updateStreakBadge() {
  const streak = loadDailyStreak();
  const count = Number(streak.count || 0);
  dom.streakBadge.textContent = `${count} day ${count === 1 ? "streak" : "streak"}`;
}

function getLeaderboardBoardLabel(mode, daily) {
  return daily ? `Daily ${getModeLabel(mode)}` : getModeLabel(mode);
}

function renderLeaderboardScores(scores, boardMode, boardDaily) {
  if (!scores.length) {
    const boardLabel = getLeaderboardBoardLabel(boardMode, boardDaily);
    const scopeCopy = activeLeaderboardScope === "global" ? "global score" : "score";
    dom.leaderboardList.innerHTML = `<p class="empty-state">Finish ${boardLabel} to record your first ${scopeCopy}.</p>`;
    return;
  }

  scores.slice(0, 5).forEach((score, index) => {
    const item = document.createElement("div");
    item.className = "leaderboard-item";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = `#${index + 1}`;

    const name = document.createElement("strong");
    name.textContent = `@${sanitizeUsername(score.username) || "Player"}`;

    const meta = document.createElement("small");
    meta.textContent = `${score.attempts} ${score.attempts === 1 ? "attempt" : "attempts"} · ${formatDuration(Number(score.seconds) || 0)}`;

    item.append(rank, name, meta);
    dom.leaderboardList.append(item);
  });

  if (boardDaily && activeLeaderboardScope === "local") {
    const played = loadDailyAttempt(boardMode);
    if (played?.completed) {
      const note = document.createElement("p");
      note.className = "leaderboard-note";
      note.textContent = `You used today's Daily ${getModeLabel(boardMode)} run. Next ranked attempt unlocks tomorrow.`;
      dom.leaderboardList.append(note);
    }
  }
}

async function renderLeaderboard() {
  const boardMode = activeLeaderboardBoard === "daily" ? currentMode : activeLeaderboardBoard;
  const boardDaily = activeLeaderboardBoard === "daily";
  const renderToken = ++leaderboardRenderToken;
  dom.leaderboardList.innerHTML = "";
  dom.leaderboardTitle.textContent = `${activeLeaderboardScope === "global" ? "Global" : "Local"} leaderboard`;
  dom.rankingsTodayBadge.textContent = activeLeaderboardScope === "global" ? "Global scores" : "Local scores";

  dom.leaderboardScopeTabs.querySelectorAll("[data-scope]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.scope === activeLeaderboardScope);
    button.setAttribute("aria-selected", String(button.dataset.scope === activeLeaderboardScope));
  });

  dom.leaderboardTabs.querySelectorAll("[data-board]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.board === activeLeaderboardBoard);
    button.setAttribute("aria-selected", String(button.dataset.board === activeLeaderboardBoard));
  });

  if (activeLeaderboardScope === "local") {
    renderLeaderboardScores(loadLeaderboardScores(boardMode, boardDaily), boardMode, boardDaily);
    return;
  }

  dom.leaderboardList.innerHTML = '<p class="empty-state">Loading global leaderboard. If it does not respond, your local scores are still saved.</p>';
  const loadingTimeoutId = window.setTimeout(() => {
    if (renderToken === leaderboardRenderToken && activeLeaderboardScope === "global") {
      dom.leaderboardList.innerHTML = '<p class="empty-state">Global leaderboard is taking too long to respond. Your local scores are still saved.</p>';
    }
  }, 9000);
  try {
    const scores = await loadGlobalLeaderboardScores(boardMode, boardDaily);
    window.clearTimeout(loadingTimeoutId);
    if (renderToken !== leaderboardRenderToken) {
      return;
    }
    dom.leaderboardList.innerHTML = "";
    renderLeaderboardScores(scores, boardMode, boardDaily);
  } catch (error) {
    window.clearTimeout(loadingTimeoutId);
    console.warn("Global leaderboard load failed:", error);
    if (renderToken === leaderboardRenderToken) {
      dom.leaderboardList.innerHTML = '<p class="empty-state">Global leaderboard is unavailable right now. Your local scores are still saved.</p>';
    }
  }
}

function buildShareText() {
  const summary = solvedSummary || {
    secret: secretNumber,
    attempts,
    seconds: getElapsedSeconds(),
    mode: currentMode,
    daily: isDailyChallenge,
  };
  const modePrefix = summary.daily ? `Daily ${getModeLabel(summary.mode)}` : getModeLabel(summary.mode);
  return `I cracked ${modePrefix} in ${summary.attempts} ${summary.attempts === 1 ? "guess" : "guesses"} (${formatDuration(summary.seconds)}). Can you beat me? ${window.location.origin}`;
}

async function handleShareResult() {
  const text = buildShareText();
  try {
    if (navigator.share) {
      await navigator.share({ title: "3 Digit Duel", text, url: window.location.origin });
    } else {
      await navigator.clipboard.writeText(text);
      setStatus("Result copied. Send it to a friend and make them sweat a little.", "status-hint");
    }
  } catch {
    setStatus("Share cancelled. Your result is still safe on the board.", "status-hint");
  }
}

function appendHistoryItem(guess, hint) {
  const emptyState = dom.historyList.querySelector(".empty-state");
  if (emptyState) {
    emptyState.remove();
  }

  dom.historyList.prepend(createHistoryItem(`Guess ${attempts}: ${guess}`, hint));
}

function updateAttemptCount() {
  dom.attemptCount.textContent = `${attempts} ${attempts === 1 ? "attempt" : "attempts"}`;
}

function setStatus(text, className) {
  dom.statusText.textContent = text;
  dom.statusText.className = className;
}

function showCelebration(secret, totalAttempts, elapsedSeconds = getElapsedSeconds()) {
  solvedSummary = {
    secret,
    attempts: totalAttempts,
    seconds: elapsedSeconds,
    mode: currentMode,
    daily: isDailyChallenge,
  };
  const modeLabel = isDailyChallenge ? `Daily ${getModeLabel()}` : getModeLabel();
  dom.celebrationText.textContent = `The secret number was ${secret}. You solved ${modeLabel} in ${totalAttempts} ${totalAttempts === 1 ? "attempt" : "attempts"}.`;
  dom.celebrationAttempts.textContent = String(totalAttempts);
  dom.celebrationTime.textContent = formatDuration(elapsedSeconds);
  dom.celebrationMode.textContent = modeLabel;
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
  isDailyChallenge = false;
  secretNumber = generateSecretNumber();
  roundStartedAt = null;
  stopTimer();
  dom.guessInput.value = "";
  dom.guessNotes.value = "";
  dom.challengeLink.value = "";
  dom.challengeOpponentInput.value = "";
  dom.historyList.innerHTML = '<p class="empty-state">Your hints will appear here after each guess.</p>';
  hideCelebration();
  updateModeUi();
  renderDigitTracker();
  renderLeaderboard();
  updateAttemptCount();
  updateTimerUi();
  setEmojiReaction("🎯 Steady start");
  setStatus(message, "status-hint");
  updateChallengeUi();
  setGameLocked(true);
}

async function handleSignOut() {
  if (isGuestPlayer) {
    window.location.replace("/signin");
    return;
  }

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
    isGuestPlayer = false;
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
    showTutorial();
    return;
  }

  currentUser = {
    uid: GUEST_UID,
    displayName: "Guest Player",
    email: "",
    photoURL: DEFAULT_AVATAR,
  };
  isGuestPlayer = true;
  currentUsername = sanitizeUsername(loadPlayerProfile()?.username || getSuggestedUsername());
  savePlayerProfile({ username: currentUsername });
  updateProfileUi();
  hideUsernameSetup();
  setGameLocked(false);
  if (!restoreGameFromLocation()) {
    resetGame();
  }
  setStatus(`Guest mode ready as @${currentUsername}. Sign in later for named friend challenges.`, "status-hint");
  showTutorial();
}

function setGameLocked(locked) {
  dom.guessInput.disabled = locked;
  dom.guessButton.disabled = locked;
  dom.newGameBtn.disabled = locked;
  dom.oneHintInput.disabled = locked || oneHintSolved;
  dom.oneHintSubmitBtn.disabled = locked || oneHintSolved;
  dom.oneHintNewBtn.disabled = locked;
  dom.oneHintFormulaBtn.disabled = locked || oneHintSolved || !supportsOneHintFormulaHint();
  dom.dailyChallengeBtn.disabled = locked;
  dom.modeTabs.querySelectorAll(".mode-tab").forEach((button) => {
    button.disabled = locked;
  });

  if (locked) {
    dom.challengeFriendBtn.disabled = true;
    dom.copyChallengeBtn.disabled = true;
    dom.challengeOpponentInput.disabled = true;
  } else {
    updateChallengeUi();
  }

  updateModeUi();
  renderOneHintQuestion();
  if (locked) {
    dom.dailyChallengeBtn.disabled = true;
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

