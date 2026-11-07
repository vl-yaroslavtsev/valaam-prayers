<template>
  <!-- Динамический :class на f7-popup нельзя: Vue перезапишет class и сотрёт modal-in -->
  <f7-popup v-model:opened="opened" class="rite-popup">
    <f7-page :page-content="false">
      <div
        ref="cardEl"
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
                :names="saintsNames"
                :explanations="explanations"
                :show-errors="submitted"
                :server-name-error="serverErrors[`name-${i}`]"
                :server-explanation-error="serverErrors[`explanation-${i}`]"
                @update:name="onNameChanged(i, $event)"
                @update:explanation="onExplanationChanged(i, $event)"
                @show-error="showError"
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
              <f7-list class="rite-donate__field" no-hairlines>
                <f7-list-input
                  type="text"
                  name="donate"
                  inputmode="numeric"
                  aria-label="Сумма пожертвования"
                  :value="donateText"
                  :readonly="donateReadonly"
                  :error-message="donateMessage"
                  :error-message-force="Boolean(donateMessage)"
                  @input="onDonateInput"
                  @focus="onDonateFocus"
                  @blur="onDonateBlur"
                >
                  <template #input>
                    <span class="rite-donate__currency" aria-hidden="true">₽</span>
                  </template>
                </f7-list-input>
              </f7-list>
            </div>

            <div v-if="generalErrors.length" class="rite-alert" role="alert">
              <span class="rite-alert__icon" aria-hidden="true">!</span>
              <div class="rite-alert__text">
                <p v-for="message in generalErrors" :key="message">{{ message }}</p>
              </div>
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

    <RiteInfoSheet v-model:opened="infoOpened" :types="types" :type="type" />
    <RiteErrorSheet v-model:opened="errorOpened" :text="errorText" />
  </f7-popup>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import RiteDateField from "@/components/rites/RiteDateField.vue";
import RiteErrorSheet from "@/components/rites/RiteErrorSheet.vue";
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
  calculateDonate,
  mapServerErrors,
  parseDonate,
  pickTypeForKind,
  typesOfKind,
  validateDonate,
  validateExplanation,
  validateName,
  type FieldError,
  type NameRow,
} from "@/services/rites/riteForm";
import {
  collectErrors,
  loadTypeRestrictions,
  submitRite,
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
import { formatPrice, statusColor } from "@/services/rites/ritesFormat";

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
const rows = reactive<NameRow[]>(Array.from({ length: MAX_NAMES }, () => ({ name: "", explanation: "" })));
const donate = ref(0);
const donateText = ref("");
const donateTouched = ref(false);
const now = ref(nowTs());

// Состояние отправки и ошибки
const submitted = ref(false);
const saving = ref(false);
const serverErrors = ref<Record<string, FieldError>>({});
const generalErrors = ref<string[]>([]);

const infoOpened = ref(false);
const errorOpened = ref(false);
const errorText = ref("");

const cardEl = ref<HTMLElement | null>(null);

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
const donateReadonly = computed(() => strict.value || rows.every((row) => !row.name.trim()));
const donateLabel = computed(() =>
  strict.value ? "Сумма пожертвования:" : "Рекомендуемая сумма пожертвования:",
);
const statusTextColor = computed(() => statusColor(item?.status ?? null, false) ?? "#1f1b1a");
const buttonText = computed(() => {
  if (saving.value) return "Сохранение...";
  return mode === "edit" ? "Сохранить изменения" : "Добавить в корзину";
});

const kindOptions = computed(() =>
  (["health", "repose"] as const)
    .map((value) => ({ value, label: typesOfKind(types.value, value)[0]?.typeName ?? "" }))
    .filter((option) => option.label),
);
const typeOptions = computed(() =>
  typesOfKind(types.value, kind.value).map((item) => ({ value: item.id, label: item.shortName })),
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

const donateError = computed(() => {
  if (serverErrors.value.donate) return serverErrors.value.donate;
  if (skipDonateCheck.value || !(submitted.value || donateTouched.value)) return null;
  return validateDonate(donate.value);
});
// Полное сообщение сервера помещается под полем целиком, у клиентской проверки хватает короткого
const donateMessage = computed(() =>
  serverErrors.value.donate ? serverErrors.value.donate.full : donateError.value?.short,
);

function clearGeneralErrors(): void {
  generalErrors.value = [];
}

function setDonate(value: number): void {
  donate.value = value;
  donateText.value = formatPrice(value);
}

/** Рекомендуемая сумма пересчитывается при любом изменении имён или типа, пока записка не оплачена */
function recalculateDonate(): void {
  if (strict.value) return;
  setDonate(calculateDonate(rows.map((row) => row.name), type.value));
}

function firstValidDate(): number | null {
  return type.value ? findNextValidDate(minDate.value, type.value, restrictions.value) : null;
}

/** Смена типа сбрасывает дату на ближайшую допустимую, как на сайте */
function onTypeChanged(): void {
  dateTs.value = firstValidDate();
  recalculateDonate();
  clearGeneralErrors();
}

watch(dateTs, clearGeneralErrors);

function onNameChanged(index: number, value: string): void {
  rows[index].name = value;
  delete serverErrors.value[`name-${index}`];
  recalculateDonate();
  clearGeneralErrors();
}

function onExplanationChanged(index: number, value: string): void {
  rows[index].explanation = value;
  delete serverErrors.value[`explanation-${index}`];
}

function onDonateInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, "");
  input.value = digits;
  donate.value = parseDonate(digits);
  donateText.value = digits;
  delete serverErrors.value.donate;
  clearGeneralErrors();
}

// Пока сумму вводят, она без пробелов, чтобы курсор не прыгал
function onDonateFocus(event: Event): void {
  donateText.value = donate.value ? String(donate.value) : "";
  (event.target as HTMLInputElement).value = donateText.value;
}

function onDonateBlur(): void {
  donateTouched.value = true;
  donateText.value = formatPrice(donate.value);
}

function showError(text: string): void {
  errorText.value = text;
  errorOpened.value = true;
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
  donateTouched.value = false;
  serverErrors.value = {};
  generalErrors.value = [];
  infoOpened.value = false;
  errorOpened.value = false;
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

watch(opened, (value) => {
  if (value) void init();
});

/** Поле для фокуса при первой найденной ошибке */
function focusFirstInvalid(): void {
  const invalid = rows.findIndex(
    (row) => validateName(row.name) || validateExplanation(row.explanation, explanations.value),
  );
  let selector = "";
  if (invalid >= 0) {
    selector = validateName(rows[invalid].name)
      ? `input[name="name-${invalid}"]`
      : `input[name="explanation-${invalid}"]`;
  } else if (!skipDonateCheck.value && validateDonate(donate.value)) {
    selector = 'input[name="donate"]';
  }
  if (selector) void nextTick(() => cardEl.value?.querySelector<HTMLInputElement>(selector)?.focus());
}

async function submit(): Promise<void> {
  if (!type.value) return;
  submitted.value = true;
  generalErrors.value = [];

  const general: string[] = [];
  if (rows.every((row) => !row.name.trim())) general.push(MESSAGE_NO_NAMES);

  const day = dateTs.value;
  if (day === null || day < minDate.value || !isValidDate(day, type.value, restrictions.value)) {
    general.push(MESSAGE_BAD_DATE);
  }

  const hasFieldErrors = rows.some(
    (row) => validateName(row.name) || validateExplanation(row.explanation, explanations.value),
  );
  const donateInvalid = !skipDonateCheck.value && Boolean(validateDonate(donate.value));
  if (general.length || hasFieldErrors || donateInvalid || day === null) {
    generalErrors.value = general;
    focusFirstInvalid();
    return;
  }

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

    const mapped = mapServerErrors(collectErrors(result.errors));
    serverErrors.value = mapped.fields;
    const hasFields = Object.keys(mapped.fields).length > 0;
    generalErrors.value = mapped.general.length || hasFields ? mapped.general : [MESSAGE_UNAVAILABLE];
  } catch (error) {
    console.error("Не удалось отправить записку:", error);
    generalErrors.value = [MESSAGE_UNAVAILABLE];
  } finally {
    saving.value = false;
  }
}
</script>

<style lang="less">
.rite-popup {
  // Записка всегда светлая: тёмной темы у неё нет
  --rite-text: #1f1b1a;
  --rite-muted: rgba(31, 27, 26, 0.6);
  --rite-accent: var(--red-r-100);
  --rite-line: rgba(235, 87, 87, 0.35);
  --rite-line-active: var(--red-r-100);
  --rite-error: var(--red-r-100);
  --rite-paper: #fff;

  --f7-popup-tablet-width: 480px;
  --f7-popup-tablet-height: 774px;
  --f7-popup-tablet-border-radius: 16px;
  --f7-popup-bg-color: var(--rite-paper);

  // Поля внутри записки не должны подхватывать тему приложения
  --f7-text-color: var(--rite-text);
  --f7-input-text-color: var(--rite-text);
  --f7-input-placeholder-color: var(--rite-muted);
  --f7-input-error-text-color: var(--rite-error);
  --f7-input-error-font-size: 12px;
  --f7-list-bg-color: transparent;
  --f7-list-item-title-text-color: var(--rite-text);
  --f7-autocomplete-dropdown-text-color: var(--rite-text);
  --f7-page-bg-color: var(--rite-paper);

  color: var(--rite-text);

  .page {
    background: var(--rite-paper);
  }

  // Рамка записки: на телефоне на весь экран, на планшете карточка 480 x 774
  .rite-card {
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    height: 100%;
    overflow: hidden;
    border: 2px solid var(--rite-accent);
    background: var(--rite-paper);

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
    top: calc(26px + var(--f7-safe-area-top));
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
    padding: calc(23px + var(--f7-safe-area-top)) 30px 20px;
    scroll-padding-bottom: 20px;
  }

  .rite-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
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

  // Дата поминовения
  .rite-date {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: fit-content;
    max-width: 100%;
    margin: 0 auto 10px;
    padding: 6px 12px;
    border-radius: 8px;
    background: var(--rite-paper);
    box-shadow: inset 0 0 0 1px rgba(31, 27, 26, 0.2);

    &__icon {
      flex: none;
    }

    &__input {
      width: 200px;
      max-width: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      font-size: 14px;
      line-height: 18px;
      color: var(--rite-text);
      text-align: center;
      cursor: pointer;
      -webkit-appearance: none;
    }
  }

  // Строки записки: имя и пометка, под каждой строкой линия как на бумажной записке
  .rite-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 20px;
    border-bottom: 1px solid var(--rite-line);
    transition: border-color 0.2s;

    &:focus-within {
      border-bottom-color: var(--rite-line-active);
    }

    &--error,
    &--error:focus-within {
      border-bottom: 2px solid var(--rite-error);
    }
  }

  .rite-cell {
    position: relative;
    min-width: 0;
  }

  // Сброс оформления списка F7: поле рисуем строкой записки
  .rite-field,
  .rite-donate__field {
    margin: 0;

    ul {
      padding: 0;
      background: none;

      &::before,
      &::after {
        display: none;
      }
    }

    li {
      padding: 0;
    }

    .item-content {
      min-height: 0;
      margin: 0;
      padding: 0;

      &.item-input::before,
      &.item-input::after,
      &.item-input.item-input-with-value::after,
      &.item-input.item-input-focused::after {
        display: none;
      }
    }

    .item-inner {
      min-height: 0;
      margin: 0;
      padding: 0;

      &::before,
      &::after {
        display: none;
      }
    }

    .item-input-wrap {
      position: relative;
      margin: 0;
    }

    input {
      width: 100%;
      height: 36px;
      padding: 14px 0 4px;
      border: 0;
      border-radius: 0;
      background: transparent;
      font-size: 14px;
      line-height: 18px;
      color: var(--rite-text);

      &::placeholder {
        color: var(--rite-muted);
        opacity: 1;
      }

      &:disabled {
        opacity: 1;
      }
    }

    .item-input-error-message {
      margin: 0;
      padding-bottom: 2px;
      font-size: 12px;
      line-height: 16px;
      color: var(--rite-error);
    }

    .item-input-with-error-message input {
      padding-right: 28px;
      color: var(--rite-error);
    }
  }

  .rite-error-button {
    position: absolute;
    top: 14px;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--rite-error);
    font-size: 12px;
    line-height: 1;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
  }

  // Подсказки имён и пометок
  .rite-cell .autocomplete-dropdown {
    top: 100%;
    z-index: 20;
    width: 100%;
    max-height: 224px;
    overflow: auto;
    border-radius: 8px;
    background: var(--rite-paper);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    scrollbar-width: thin;
    scrollbar-color: rgba(161, 109, 79, 0.6) transparent;

    .autocomplete-dropdown-inner {
      padding: 4px 6px;
    }

    .list {
      --f7-list-item-padding-horizontal: 8px;
      --f7-list-item-min-height: 0;

      margin: 0;
      font-size: 14px;
      line-height: 18px;
      color: var(--rite-text);
    }

    li {
      border-radius: 6px;
    }

    .item-content {
      min-height: 0;
      padding: 0;
    }

    .item-inner {
      min-height: 0;
      padding: 6px 8px;

      &::before,
      &::after {
        display: none;
      }
    }

    .item-title {
      font-size: 14px;
      line-height: 18px;
    }

    .autocomplete-dropdown-selected,
    label.active-state {
      background: var(--content-color-baige-100);
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

  .rite-donate__field {
    position: relative;
    flex: none;
    width: 92px;

    .item-input-wrap {
      border: 1px solid rgba(31, 27, 26, 0.2);
      border-radius: 8px;
      background: var(--rite-paper);
    }

    input {
      height: 36px;
      padding: 8px 28px 7px 10px;
      font-size: 16px;
      line-height: 20px;
      font-weight: 700;
      text-align: right;
    }

    .item-input-with-error-message .item-input-wrap {
      border-color: var(--rite-error);
    }

    .item-input-with-error-message input {
      padding-right: 28px;
    }

    // Место под сообщение F7 резервирует само, а здесь оно шире поля:
    // выводим его поверх соседних строк, прижатым к правому краю
    .item-input-with-error-message {
      padding-bottom: 0 !important;
    }

    .item-input-error-message {
      top: calc(100% + 2px);
      right: 0;
      left: auto;
      width: max-content;
      max-width: 260px;
      overflow: visible;
      white-space: normal;
      text-align: right;
    }
  }

  .rite-donate:has(.item-input-with-error-message) {
    margin-bottom: 8px;
  }

  .rite-donate__currency {
    position: absolute;
    top: 8px;
    right: 10px;
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
    pointer-events: none;
  }

  // Общие ошибки: розовая полоса над кнопкой
  .rite-alert {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(235, 87, 87, 0.12);
    font-size: 14px;
    line-height: 18px;
    color: var(--rite-text);

    &__icon {
      display: flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--rite-error);
      font-size: 12px;
      line-height: 1;
      font-weight: 700;
      color: #fff;
    }

    &__text p {
      margin: 0;
    }

    &__text p + p {
      margin-top: 4px;
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
