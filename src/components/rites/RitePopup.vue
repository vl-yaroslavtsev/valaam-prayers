<template>
  <!-- Динамический :class на f7-popup нельзя: Vue перезапишет class и сотрёт modal-in -->
  <f7-popup v-model:opened="opened" class="rite-popup">
    <f7-page :page-content="false">
      <div
        class="rite-card"
        :class="{ 'rite-card--repose': kind === 'repose' }"
        role="dialog"
        :aria-label="title"
      >
        <i class="rite-corner rite-corner--top-left" aria-hidden="true"></i>
        <i class="rite-corner rite-corner--top-right" aria-hidden="true"></i>
        <i class="rite-corner rite-corner--bottom-left" aria-hidden="true"></i>
        <i class="rite-corner rite-corner--bottom-right" aria-hidden="true"></i>

        <div v-if="loading" class="rite-state">
          <f7-button class="rite-round rite-round--right" aria-label="Закрыть" @click="opened = false">
            <SvgIcon icon="cancel" :size="14" color="primary-accent-50" />
          </f7-button>
          <f7-preloader />
        </div>

        <div v-else-if="loadError" class="rite-state">
          <f7-button class="rite-round rite-round--right" aria-label="Закрыть" @click="opened = false">
            <SvgIcon icon="cancel" :size="14" color="primary-accent-50" />
          </f7-button>
          <p class="rite-state__text">{{ loadError }}</p>
          <f7-button outline small @click="init">Повторить</f7-button>
        </div>

        <template v-else>
          <div class="page-content rite-scroll">
            <!-- Кнопки лежат внутри прокручиваемой области: как на бумажной записке, они уходят вместе с шапкой -->
            <f7-button
              class="rite-round rite-round--left"
              aria-label="О записке"
              @click="infoOpened = true"
            >
              <SvgIcon icon="question" :size="24" color="primary-accent-50" />
            </f7-button>
            <f7-button class="rite-round rite-round--right" aria-label="Закрыть" @click="opened = false">
              <SvgIcon icon="cancel" :size="14" color="primary-accent-50" />
            </f7-button>

            <header class="rite-header">
              <i class="rite-cross" aria-hidden="true"></i>
              <RiteSelect v-model="kindValue" name="kind" label="Вид записки" :options="kindOptions" />
              <RiteSelect
                v-model="typeValue"
                name="type"
                label="Поминовение"
                size="small"
                :options="typeOptions"
              />
            </header>

            <RiteDateField
              v-model="dateTs"
              :type="type"
              :min-date="minDate"
              :restrictions="restrictions"
            />

            <div class="rite-rows">
              <RiteNameRow
                v-for="(row, i) in rows"
                :key="i"
                :index="i"
                :name="row.name"
                :explanation="row.explanation"
                :error-text="rowErrorText(i)"
                :add-placeholder="i === firstEmptyRow"
                @select="openNameSheet(i)"
              />
            </div>
          </div>

          <footer class="rite-footer">
            <div v-if="strict && item?.status" class="rite-status">
              <span class="rite-status__label">Статус</span>
              <span class="rite-status__value" :style="{ color: statusTextColor ?? undefined }">
                {{ item.status.name }}
              </span>
            </div>

            <div class="rite-donate">
              <span class="rite-donate__label">{{ donateLabel }}</span>
              <button
                v-if="!strict"
                type="button"
                class="rite-donate__plaque"
                :class="{ 'rite-donate__plaque--error': donateHighlighted }"
                @click="openAmountSheet"
              >
                <span>{{ formatPrice(donate) }}&nbsp;₽</span>
                <f7-icon
                  v-if="donateHighlighted"
                  class="rite-donate__icon"
                  f7="exclamationmark_circle_fill"
                  aria-hidden="true"
                />
              </button>
              <span
                v-else
                class="rite-donate__value"
                :class="{ 'rite-donate__value--error': donateHighlighted }"
              >
                <span>{{ formatPrice(donate) }}&nbsp;₽</span>
                <f7-icon
                  v-if="donateHighlighted"
                  class="rite-donate__icon"
                  f7="exclamationmark_circle_fill"
                  aria-hidden="true"
                />
              </span>
            </div>

            <f7-button
              fill
              large
              class="rite-submit"
              :preloader="saving"
              :loading="saving"
              :disabled="saving"
              @click="submit"
            >
              {{ buttonText }}
            </f7-button>
          </footer>
        </template>
      </div>
    </f7-page>

    <!-- Подложка внутри попапа: общая подложка приложения оказывается под попапом и не затемняет записку -->
    <div class="rite-sheet-backdrop sheet-backdrop"></div>
    <RiteInfoSheet v-model:opened="infoOpened" :types="types" :type="type" />
    <NameEditSheet
      v-model:opened="nameSheetOpened"
      v-model:active-index="activeRowIndex"
      :rows="rows"
      :names="saintsNames"
      :explanations="explanations"
      :name-error="shownRowError(activeRowIndex).name"
      :explanation-error="shownRowError(activeRowIndex).explanation"
      @update:name="onNameChanged"
      @update:explanation="onExplanationChanged"
      @explanation-focus="explanationEditing = true"
      @explanation-blur="explanationEditing = false"
    />
    <AmountEditSheet
      v-model:opened="amountSheetOpened"
      :amount="donate"
      :recommended="recommendedAmount"
      :min-amount="minAmount"
      :server-error="serverErrors.donate ?? null"
      :kind-name="type?.typeName ?? ''"
      :type-name="type?.shortName ?? ''"
      :rows="rows"
      @apply="onDonateApply"
      @clear-server-error="clearDonateServerError"
    />
  </f7-popup>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { f7 } from "framework7-vue";
import type { Dialog } from "framework7/types";
import AmountEditSheet from "@/components/rites/AmountEditSheet.vue";
import NameEditSheet from "@/components/rites/NameEditSheet.vue";
import RiteDateField from "@/components/rites/RiteDateField.vue";
import RiteInfoSheet from "@/components/rites/RiteInfoSheet.vue";
import RiteNameRow from "@/components/rites/RiteNameRow.vue";
import RiteSelect from "@/components/rites/RiteSelect.vue";
import SvgIcon from "@/components/SvgIcon.vue";
import {
  MAX_NAMES,
  MESSAGE_BAD_DATE,
  MESSAGE_NO_NAMES,
  MESSAGE_UNAVAILABLE,
  buildNames,
  formatNoteRow,
  isRowCountable,
  mapServerErrors,
  minimumDonate,
  pickTypeForKind,
  recommendedDonate,
  soleExplanation,
  typesOfKind,
  validateDonateAmount,
  validateRow,
  visibleExplanationError,
  type FieldError,
  type NoteRowError,
  type NoteRowItem,
  type ServerValidationError,
} from "@/services/rites/riteForm";
import {
  collectErrors,
  loadTypeRestrictions,
  submitRite,
  type ApiErrors,
  type Rite,
  type RiteType,
  type TypeRestriction,
} from "@/services/rites/ritesApi";
import { getExplanations, getRiteTypes, getSaintsNames } from "@/services/rites/ritesDirectory";
import {
  calculateMinDate,
  findNextValidDate,
  formatDateParam,
  isValidDate,
  mskDayStart,
} from "@/services/rites/ritesDates";
import { formatPrice, formatShortName, statusColor } from "@/services/rites/ritesFormat";
import { useTheme } from "@/composables/useTheme";
import { device } from "@/js/device";
import { useSettingsStore } from "@/stores/settings";

export type RitePopupMode = "create" | "edit" | "copy";

type Kind = "health" | "repose";

const { mode, item = null } = defineProps<{
  mode: RitePopupMode;
  /** Записка для редактирования или дублирования */
  item?: Rite | null;
}>();

const opened = defineModel<boolean>("opened", { default: false });

const emit = defineEmits<{
  /** Записка сохранена на сервере: для create и copy это новая, для edit обновлённая */
  saved: [rite: Rite];
}>();

const title = computed(() => (mode === "edit" ? "Форма редактирования записки" : "Форма подачи записки"));

const settingsStore = useSettingsStore();
const { isDarkMode } = useTheme();

/** Как при входе в чтение со скрытыми меню: режим берётся из настройки системных панелей */
function applyNoteSystemBars(): void {
  const barsMode = settingsStore.readingSystemBars;
  if (barsMode === "fullscreen") {
    device.showStatusBar(false);
    device.setFullScreen(true);
  } else if (barsMode === "hide-status-bar") {
    device.setFullScreen(false);
    device.showStatusBar(false);
  } else {
    device.setFullScreen(false);
    device.showStatusBar(true);
  }
}

function restoreNoteSystemBars(): void {
  device.setFullScreen(false);
  device.showStatusBar(true);
  device.setStatusBarTextColor(isDarkMode.value ? "light" : "dark");
}

const nowTs = (): number => Math.floor(Date.now() / 1000);

// Данные с сервера
const loading = ref(false);
const loadError = ref("");
const types = ref<RiteType[]>([]);
const restrictions = ref<TypeRestriction[]>([]);
const explanationsByKind = ref<Record<Kind, string[]>>({ health: [], repose: [] });
const saintsNames = ref<string[]>([]);

// Поля формы
const type = ref<RiteType | null>(null);
const dateTs = ref<number | null>(null);
const rows = reactive<NoteRowItem[]>(Array.from({ length: MAX_NAMES }, () => ({ name: "", explanation: "" })));
const rowTouched = ref<boolean[]>(Array.from({ length: MAX_NAMES }, () => false));
const donate = ref(0);
const now = ref(nowTs());

// Состояние отправки и ошибки
const submitted = ref(false);
const saving = ref(false);
const serverErrors = ref<Record<string, FieldError>>({});

const infoOpened = ref(false);
const nameSheetOpened = ref(false);
const amountSheetOpened = ref(false);
const activeRowIndex = ref(0);
/** Поле пометки в фокусе: пока есть подсказки, ошибку не показываем */
const explanationEditing = ref(false);

let errorDialog: Dialog.Dialog | null = null;

const ready = computed(() => !loading.value && !loadError.value);
const kind = computed<Kind>(() => type.value?.type ?? "health");
const explanations = computed(() => explanationsByKind.value[kind.value]);
const minDate = computed(() => (type.value ? calculateMinDate(now.value, type.value) : 0));

/**
 * Записка не в корзине (оплачена и дальше): как на сайте, сумму менять нельзя,
 * тип, дату и имена можно.
 */
const strict = computed(
  () => mode === "edit" && Boolean(item?.status) && item?.status?.xmlId !== "new",
);
const skipDonateCheck = computed(() => strict.value && Boolean(item?.isFree));
const donateLabel = computed(() =>
  strict.value ? "Сумма пожертвования:" : "Рекомендуемая сумма пожертвования:",
);
const recommendedAmount = computed(() => recommendedDonate(rows, explanations.value, type.value));
const minAmount = computed(() => minimumDonate(rows, explanations.value, type.value));
const statusTextColor = computed(() => statusColor(item?.status ?? null, false) ?? "#1f1b1a");
const buttonText = computed(() => {
  if (saving.value) return "Сохранение...";
  return mode === "edit" ? "Сохранить изменения" : "Добавить в корзину";
});

const firstEmptyRow = computed(() => rows.findIndex((row) => !formatNoteRow(row)));

const kindOptions = computed(() =>
  (["health", "repose"] as const)
    .map((value) => ({ value, label: typesOfKind(types.value, value)[0]?.typeName ?? "" }))
    .filter((option) => option.label),
);
const typeOptions = computed(() =>
  typesOfKind(types.value, kind.value).map((item) => ({
    value: item.id,
    label: formatShortName(item.shortName),
  })),
);

const kindValue = computed<string | number>({
  get: () => kind.value,
  set(value) {
    type.value = pickTypeForKind(types.value, value as Kind, type.value);
    onTypeChanged();
  },
});
const typeValue = computed<string | number>({
  get: () => type.value?.id ?? 0,
  set(value) {
    type.value = types.value.find((item) => item.id === value) ?? type.value;
    onTypeChanged();
  },
});

/** Ошибка суммы на бланке: серверная сразу, клиентская после попытки отправки */
const donateHighlighted = computed(
  () => Boolean(serverErrors.value.donate) || (submitted.value && donateIsClientProblem()),
);

function shownRowError(index: number): NoteRowError {
  const row = rows[index] ?? { name: "", explanation: "" };
  const client = validateRow(row, explanations.value);
  const showClient = submitted.value || rowTouched.value[index];
  const editing = explanationEditing.value && nameSheetOpened.value && index === activeRowIndex.value;
  return {
    name: serverErrors.value[`name-${index}`] ?? (showClient ? client.name : null),
    explanation:
      serverErrors.value[`explanation-${index}`] ??
      (showClient ? visibleExplanationError(row.explanation, explanations.value, editing) : null),
  };
}

function rowErrorText(index: number): string {
  const error = shownRowError(index);
  return error.name?.short ?? error.explanation?.short ?? "";
}

/**
 * Нулевая сумма при пустой записке — не отдельная ошибка поля:
 * о ней говорит сообщение «пустая записка».
 */
function donateIsClientProblem(): boolean {
  if (skipDonateCheck.value) return false;
  const counted = rows.filter((row) => isRowCountable(row, explanations.value)).length;
  if (counted === 0 && donate.value <= 0) return false;
  return validateDonateAmount(donate.value, minAmount.value) !== null;
}

function setDonate(value: number): void {
  donate.value = value;
}

/** Рекомендуемая сумма пересчитывается при любом изменении имён или типа, пока записка не оплачена */
function recalculateDonate(): void {
  if (strict.value) return;
  setDonate(recommendedAmount.value);
}

function firstValidDate(): number | null {
  return type.value ? findNextValidDate(minDate.value, type.value, restrictions.value) : null;
}

/** Смена типа сбрасывает дату на ближайшую допустимую, как на сайте */
function onTypeChanged(): void {
  dateTs.value = firstValidDate();
  recalculateDonate();
}

function touchRow(index: number): void {
  rowTouched.value[index] = true;
}

function onNameChanged(index: number, value: string): void {
  rows[index].name = value;
  touchRow(index);
  delete serverErrors.value[`name-${index}`];
  recalculateDonate();
}

/** Префикс с единственной пометкой становится этой пометкой */
function resolveExplanations(): void {
  let changed = false;
  rows.forEach((row, index) => {
    const sole = soleExplanation(row.explanation, explanations.value);
    if (!sole) return;
    row.explanation = sole;
    delete serverErrors.value[`explanation-${index}`];
    changed = true;
  });
  if (changed) recalculateDonate();
}

function onExplanationChanged(index: number, value: string): void {
  rows[index].explanation = value;
  touchRow(index);
  delete serverErrors.value[`explanation-${index}`];
  recalculateDonate();
}

function openNameSheet(index: number): void {
  activeRowIndex.value = index;
  amountSheetOpened.value = false;
  nameSheetOpened.value = true;
}

function openAmountSheet(): void {
  if (strict.value) return;
  nameSheetOpened.value = false;
  amountSheetOpened.value = true;
}

/** Оплаченную записку менять нельзя: ошибку суммы показываем тостом, шторку не открываем */
function showDonateProblem(): void {
  if (!strict.value) {
    openAmountSheet();
    return;
  }
  const text =
    serverErrors.value.donate?.full ??
    validateDonateAmount(donate.value, minAmount.value)?.short ??
    "Неверная сумма";
  showToast(plainText(text));
}

function onDonateApply(value: number): void {
  setDonate(value);
}

function clearDonateServerError(): void {
  delete serverErrors.value.donate;
}

function showToast(text: string): void {
  f7.toast.show({ text, closeTimeout: 3500, position: "bottom" });
}

function showRetryDialog(text: string): void {
  errorDialog?.destroy();
  errorDialog = f7.dialog.create({
    text,
    buttons: [{ text: "Закрыть" }, { text: "Повторить", strong: true }],
    onClick(_dialog, index) {
      if (index === 1) void submit();
    },
  });
  errorDialog.open();
}

function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** true: отправку делать рано. Одна ошибка поля открывает шторку, несколько — тост */
function presentProblems(rowIndexes: number[], donateProblem: boolean, general: string[]): boolean {
  const fieldCount = rowIndexes.length + (donateProblem ? 1 : 0);
  if (fieldCount === 0 && general.length === 0) return false;

  if (fieldCount === 1 && rowIndexes.length === 1) openNameSheet(rowIndexes[0]);
  else if (fieldCount === 1 && donateProblem) showDonateProblem();

  if (fieldCount > 1) {
    const prefix = general.length ? `${general.join(" ")} ` : "";
    showToast(`${prefix}Проверьте выделенные поля`);
  } else if (general.length) {
    showToast(general.join(" "));
  }
  return true;
}

/** Поля с записью: для создания пустая записка, для копии и редактирования имена исходной */
function fillRows(source: Rite | null): void {
  rows.forEach((row, index) => {
    row.name = source?.names[index]?.name ?? "";
    row.explanation = source?.names[index]?.explanation ?? "";
  });
}

function fillForm(): void {
  const source = mode === "create" ? null : item;
  const available = types.value.filter((candidate) => !candidate.disabled);
  type.value =
    available.find((candidate) => candidate.id === source?.type?.id) ??
    typesOfKind(types.value, "health")[0] ??
    available[0] ??
    null;

  fillRows(source);

  // Дата исходной записки, если она ещё не прошла и допустима, иначе ближайшая допустимая
  const sourceFrom = source?.period?.from?.ts;
  const start = sourceFrom ? Math.max(mskDayStart(sourceFrom), minDate.value) : minDate.value;
  dateTs.value = type.value ? findNextValidDate(start, type.value, restrictions.value) : null;

  if (source) setDonate(source.sum);
  else recalculateDonate();
}

async function init(): Promise<void> {
  submitted.value = false;
  saving.value = false;
  serverErrors.value = {};
  rowTouched.value = Array.from({ length: MAX_NAMES }, () => false);
  infoOpened.value = false;
  nameSheetOpened.value = false;
  amountSheetOpened.value = false;
  activeRowIndex.value = 0;
  loadError.value = "";
  loading.value = true;

  // Имена нужны только для подсказок: форма открывается и без них
  getSaintsNames()
    .then((list) => (saintsNames.value = list))
    .catch((error) => console.error("Не удалось загрузить имена для подсказок:", error));

  try {
    const [loadedTypes, loadedRestrictions, health, repose] = await Promise.all([
      getRiteTypes(),
      loadTypeRestrictions(),
      getExplanations("health"),
      getExplanations("repose"),
    ]);
    types.value = loadedTypes;
    restrictions.value = loadedRestrictions;
    explanationsByKind.value = { health, repose };
    now.value = nowTs();
    fillForm();
  } catch (error) {
    console.error("Не удалось загрузить данные формы записки:", error);
    loadError.value = "Не удалось загрузить форму. Проверьте соединение и повторите.";
  } finally {
    loading.value = false;
  }
}

watch(nameSheetOpened, (isOpen) => {
  if (!isOpen) explanationEditing.value = false;
});

watch(opened, (value) => {
  if (value) {
    applyNoteSystemBars();
    void init();
    return;
  }
  restoreNoteSystemBars();
  explanationEditing.value = false;
  nameSheetOpened.value = false;
  amountSheetOpened.value = false;
  errorDialog?.close();
});

watch(
  () => settingsStore.readingSystemBars,
  () => {
    if (opened.value) applyNoteSystemBars();
  },
);

/**
 * Как на сайте: при возвращении на вкладку минимальная дата считается заново.
 * Если выбранный день уже прошёл, берётся ближайший допустимый.
 */
function refreshMinDate(): void {
  if (document.visibilityState !== "visible" || !opened.value || !ready.value || !type.value) return;
  now.value = nowTs();
  const current = dateTs.value;
  const start = current !== null && current > minDate.value ? current : minDate.value;
  dateTs.value = findNextValidDate(start, type.value, restrictions.value);
}

onMounted(() => document.addEventListener("visibilitychange", refreshMinDate));
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", refreshMinDate);
  if (opened.value) restoreNoteSystemBars();
  errorDialog?.destroy();
});

function clientRowProblems(): number[] {
  return rows.flatMap((row, index) => {
    const error = validateRow(row, explanations.value);
    return error.name || error.explanation ? [index] : [];
  });
}

function applyServerErrors(errors: ApiErrors | null): void {
  const mapped = mapServerErrors(collectErrors(errors));
  serverErrors.value = mapped.fields;
  const fieldErrors: ServerValidationError[] = Object.entries(mapped.fields).map(([field, error]) => ({
    field,
    ...error,
  }));
  const rowIndexes = [
    ...new Set(
      fieldErrors.flatMap((error) => {
        const match = /^(?:name|explanation)-(\d+)$/.exec(error.field);
        return match ? [Number(match[1])] : [];
      }),
    ),
  ];
  const donateProblem = fieldErrors.some((error) => error.field === "donate");
  const fieldCount = rowIndexes.length + (donateProblem ? 1 : 0);
  if (fieldCount === 0) {
    showRetryDialog(plainText(mapped.general[0] ?? MESSAGE_UNAVAILABLE));
    return;
  }
  if (fieldCount === 1 && rowIndexes.length === 1) openNameSheet(rowIndexes[0]);
  else if (fieldCount === 1) showDonateProblem();

  if (fieldCount > 1) {
    const extra = mapped.general.length ? ` ${plainText(mapped.general.join(" "))}` : "";
    showToast(`Проверьте выделенные поля.${extra}`);
  } else if (mapped.general.length) {
    showToast(plainText(mapped.general.join(" ")));
  }
}

async function submit(): Promise<void> {
  if (!type.value || saving.value) return;
  resolveExplanations();
  submitted.value = true;
  serverErrors.value = {};

  const general: string[] = [];
  if (rows.every((row) => !row.name.trim())) general.push(MESSAGE_NO_NAMES);

  const day = dateTs.value;
  const dateInvalid =
    day === null || day < minDate.value || !isValidDate(day, type.value, restrictions.value);
  if (dateInvalid) general.push(MESSAGE_BAD_DATE);

  if (presentProblems(clientRowProblems(), donateIsClientProblem(), general) || day === null) return;

  saving.value = true;
  try {
    const result = await submitRite({
      id: mode === "edit" ? item?.id : undefined,
      typeId: type.value.id,
      names: buildNames(rows, explanations.value),
      date: formatDateParam(day),
      donate: donate.value,
    });

    if (result.ok) {
      emit("saved", result.data);
      opened.value = false;
      return;
    }

    applyServerErrors(result.errors);
  } catch (error) {
    console.error("Не удалось отправить записку:", error);
    showRetryDialog(MESSAGE_UNAVAILABLE);
  } finally {
    saving.value = false;
  }
}
</script>

<style lang="less">
.rite-popup {
  // Иначе попап сидит внутри прокручиваемой страницы и уезжает, когда фокус попадает в поле шторки
  &.popup {
    position: fixed;
  }

  // Записка всегда светлая: тёмной темы у неё нет
  --rite-text: #1f1b1a;
  --rite-muted: rgba(31, 27, 26, 0.6);
  --rite-accent: var(--red-r-100);
  --rite-line: rgba(235, 87, 87, 0.65); //rgba(235, 87, 87, 0.35);
  --rite-line-active: var(--red-r-100);
  --rite-error: var(--red-r-100);
  --rite-paper: #fff;

  --f7-popup-tablet-width: 480px;
  --f7-popup-tablet-height: 774px;
  --f7-popup-tablet-border-radius: 16px;
  --f7-popup-bg-color: var(--rite-paper);

  .page {
    background: var(--rite-paper);
  }

  // Рамка записки: на телефоне на весь экран, на планшете карточка 480 x 774
  .rite-card {
    --rite-card-margin: 2px;

    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    height: calc(100% - var(--rite-card-margin) * 2);
    overflow: hidden;
    border: 2px solid var(--rite-accent);
    background: var(--rite-paper);
    margin: var(--rite-card-margin);
    // Только бумага записки: листы ошибки и описания живут рядом и берут цвет темы
    color: var(--rite-text);
    --f7-text-color: var(--rite-text);
    --f7-input-text-color: var(--rite-text);
    --f7-input-placeholder-color: var(--rite-muted);
    --f7-input-error-text-color: var(--rite-error);
    --f7-input-error-font-size: 12px;
    --f7-list-bg-color: transparent;
    --f7-list-item-title-text-color: var(--rite-text);
    --f7-page-bg-color: var(--rite-paper);

    &.rite-card--repose {
      --rite-accent: var(--content-color-black-primary);
      --rite-line: rgba(31, 27, 26, 0.2);
      --rite-line-active: var(--content-color-black-primary);
    }
  }

  @media (min-width: 630px) and (min-height: 630px) {
    .rite-card {
      border-radius: 16px;
    }
  }

  .rite-corner {
    position: absolute;
    z-index: 1;
    width: 36.5px;
    height: 35.57px;
    background: url("../../assets/rite/corner-health.svg") center / 100% 100% no-repeat;
    pointer-events: none;

    &--top-left {
      top: -2px;
      left: -2px;
      transform: scaleY(-1);
    }

    &--top-right {
      top: -2px;
      right: -2px;
      transform: scale(-1, -1);
    }

    &--bottom-left {
      bottom: -2px;
      left: -2px;
    }

    &--bottom-right {
      bottom: -2px;
      right: -2px;
      transform: scaleX(-1);
    }
  }

  .rite-card--repose .rite-corner {
    background-image: url("../../assets/rite/corner-repose.svg");
  }

  // Круглые кнопки: вопрос слева, закрыть справа
  .rite-round.button {
    --f7-button-height: 32px;
    --f7-button-border-radius: 50%;
    --f7-button-padding-horizontal: 0;

    position: absolute;
    top: 26px; //calc(26px + var(--f7-safe-area-top));
    z-index: 5;
    width: 32px;
    min-width: 32px;
    padding: 0;
    background: var(--brand-color-secondary-accent);

    &.rite-round--left {
      left: 26px;
    }

    &.rite-round--right {
      right: 26px;
    }
  }

  .rite-state {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 0 30px;
    text-align: center;
  }

  .rite-state__text {
    margin: 0;
    font-size: 14px;
    line-height: 18px;
  }

  // Прокручивается всё, кроме нижней части с суммой и кнопкой
  .rite-scroll {
    flex: 1;
    height: auto;
    min-height: 0;
    padding: 23px 30px 20px;//calc(23px + var(--f7-safe-area-top)) 30px 20px;
    scroll-padding-bottom: 20px;
  }

  .rite-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px; //10px;
    margin-bottom: 20px;
  }

  .rite-cross {
    display: block;
    flex: none;
    width: 26px;
    height: 40px;
    margin-bottom: 4px;
    background: url("../../assets/rite/cross-health.svg") center / 22.75px 35.23px no-repeat;
    transform: scaleY(-1);
  }

  .rite-card--repose .rite-cross {
    background-image: url("../../assets/rite/cross-repose.svg");
  }

  // Дата поминовения: текст и иконка, без рамки. В макете это не кнопка
  .rite-date {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: fit-content;
    max-width: 100%;
    margin: 0 auto 20px; //10px;
    cursor: pointer;

    &__icon {
      flex: none;
    }

    &__input {
      width: auto;
      max-width: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      field-sizing: content;
      font-size: 16px;
      line-height: 18px;
      color: var(--rite-text);
      text-align: center;
      cursor: pointer;
      -webkit-appearance: none;
    }
  }

  .rite-footer {
    position: relative;
    display: flex;
    flex: none;
    flex-direction: column;
    gap: 16px;
    padding: 12px 30px calc(30px + var(--f7-safe-area-bottom));
    background: var(--rite-paper);

    // Строки уходят под нижнюю часть плавно, без резкой обрезки
    &::before {
      content: "";
      position: absolute;
      right: 0;
      bottom: 100%;
      left: 0;
      height: 16px;
      background: linear-gradient(rgba(255, 255, 255, 0), var(--rite-paper));
      pointer-events: none;
    }
  }

  .rite-status,
  .rite-donate {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
  }

  .rite-status__value {
    text-align: right;
  }

  .rite-donate__plaque {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    width: 140px;
    margin: 0;
    padding: 8px 10px;
    border: 1px solid rgba(31, 27, 26, 0.2);
    border-radius: 8px;
    background: var(--rite-paper);
    font: inherit;
    font-weight: 700;
    line-height: 20px;
    color: var(--rite-text);
    cursor: pointer;

    &--error {
      border-color: var(--rite-error);
      color: var(--rite-error);
    }
  }

  .rite-donate__icon {
    font-size: 18px;
    color: var(--rite-error);
  }

  .rite-donate__value {
    display: inline-flex;
    align-items: center;
    gap: 6px;

    &--error {
      color: var(--rite-error);
    }
  }

  .rite-submit.button {
    --f7-button-height: 52px;
    --f7-button-border-radius: 10px;
    --f7-button-bg-color: var(--content-color-black-primary);
    --f7-button-fill-bg-color: var(--content-color-black-primary);
    --f7-button-fill-text-color: #fff;

    padding: 0 30px;
    border: 1px solid rgba(241, 241, 241, 0.05);
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
  }
}
</style>
