import { device } from "@/js/device";

/** Сколько держать экран включённым после последнего действия при чтении. */
export const SCREEN_TIMEOUT_MS = 10 * 60 * 1000;

const INTERACTION_THROTTLE_MS = 5000;

let wakeLockTimeout: ReturnType<typeof setTimeout> | null = null;
let lastInteractionTime = 0;
let activeReaders = 0;
let listening = false;

function disableScreenLock() {
  if (wakeLockTimeout !== null) {
    clearTimeout(wakeLockTimeout);
    wakeLockTimeout = null;
  }
  device.keepScreenOn(false);
}

function resetScreenTimer() {
  if (wakeLockTimeout !== null) {
    clearTimeout(wakeLockTimeout);
  }
  wakeLockTimeout = setTimeout(() => {
    wakeLockTimeout = null;
    device.keepScreenOn(false);
  }, SCREEN_TIMEOUT_MS);
}

function onUserInteraction() {
  if (activeReaders === 0) return;

  const now = Date.now();
  if (now - lastInteractionTime <= INTERACTION_THROTTLE_MS) return;

  lastInteractionTime = now;
  device.keepScreenOn(true);
  resetScreenTimer();
}

function addListeners() {
  if (listening) return;
  listening = true;
  // scroll не всплывает, а текст читалки крутится во вложенном контейнере
  document.addEventListener("scroll", onUserInteraction, { passive: true, capture: true });
  document.addEventListener("touchstart", onUserInteraction, { passive: true });
}

function removeListeners() {
  if (!listening) return;
  listening = false;
  document.removeEventListener("scroll", onUserInteraction, true);
  document.removeEventListener("touchstart", onUserInteraction);
}

/** Включает удержание экрана и продлевает его на 10 минут при чтении. */
export function startReadingScreenTimeout() {
  activeReaders += 1;
  device.keepScreenOn(true);
  resetScreenTimer();
  addListeners();
}

/** Снимает удержание, когда читалка больше не на экране. */
export function stopReadingScreenTimeout() {
  if (activeReaders === 0) return;
  activeReaders -= 1;
  if (activeReaders > 0) return;

  removeListeners();
  disableScreenLock();
  lastInteractionTime = 0;
}

/** Продлевает таймаут от действий без touch/scroll, например кнопок громкости. */
export function noteReadingInteraction() {
  onUserInteraction();
}
