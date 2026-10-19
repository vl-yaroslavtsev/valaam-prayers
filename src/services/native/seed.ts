import { hasNativeCapability, nativeCall, onNativeEvent } from "@/services/native/nativeRpc";
import type { SeedState } from "@/services/native/protocol";

/** Блокирующий этап seed (индексы) занимает секунды, дольше ждать не имеет смысла: дальше работаем по сети */
export const SEED_WAIT_TIMEOUT_MS = 30_000;

/**
 * Ждёт, пока нативка применит индексы seed (docs/native-bridge-protocol.md, "Seed").
 * Возвращает итоговое состояние или null, если seed не поддерживается, нативка не ответила или вышел таймаут.
 * Фоновый импорт модулей (status "importing") не ждём: он идёт через download.progress.
 */
export function waitForSeedIndexes(timeoutMs = SEED_WAIT_TIMEOUT_MS): Promise<SeedState | null> {
  if (!hasNativeCapability("seed")) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (state: SeedState | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(state);
    };

    // Подписка до запроса: событие может прийти раньше ответа
    const unsubscribe = onNativeEvent("seed.state", (state) => {
      if (state.status !== "applying") finish(state);
    });
    const timer = setTimeout(() => {
      console.warn("Seed: индексы не применились за отведённое время, продолжаем по сети");
      finish(null);
    }, timeoutMs);

    nativeCall("seed.getState").then(
      (state) => {
        if (state.status !== "applying") finish(state);
      },
      (err) => {
        console.error("Seed: не удалось получить состояние", err);
        finish(null);
      }
    );
  });
}
