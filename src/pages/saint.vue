<template>
  <f7-page name="saint" class="saint-page">
    <f7-navbar back-link>
      <f7-nav-right>
        <f7-link icon-only :href="todayUrl" aria-label="Сегодня">
          <SvgIcon icon="calendar-day" :color="navIconColor" :size="24" />
        </f7-link>
      </f7-nav-right>
    </f7-navbar>

    <h1 class="saint-headline">{{ title }}</h1>

    <div v-if="state === 'loading'" class="saint-state">
      <f7-preloader />
    </div>

    <div v-else-if="state === 'error' || !details" class="saint-state">
      <p>Не удалось загрузить страницу святого</p>
      <f7-button small outline @click="load">Повторить</f7-button>
    </div>

    <div v-else class="saint-content">
      <section v-if="pictureSrc || lifePreview" class="saint-card saint-life-card">
        <div v-if="pictureSrc" class="saint-photo">
          <img class="saint-photo-bg" :src="pictureSrc" alt="" aria-hidden="true" />
          <img class="saint-photo-fg" :src="pictureSrc" :srcset="pictureSrcset" :alt="details.name" />
        </div>

        <div v-if="lifePreview" class="saint-life">
          <h2 class="saint-section-title">Житие</h2>
          <f7-list dividers no-hairlines class="saint-list">
            <f7-list-item :title="details.name" :link="lifeUrl" />
          </f7-list>
          <a class="saint-life-preview" :href="lifeUrl">{{ lifePreview }}</a>
        </div>
      </section>

      <section v-for="section in sections" :key="section.key" class="saint-card saint-section">
        <div class="saint-section-head">
          <h2 class="saint-section-title">{{ section.title }}</h2>
          <p v-if="section.kind === 'links' && section.subtitle" class="saint-section-subtitle">
            {{ section.subtitle }}
          </p>
        </div>

        <CollapsibleList v-if="section.kind === 'memo'" class="saint-list" :items="section.days">
          <template #item="{ item: memoDay }">
            <f7-list-item
              class="saint-memo-day"
              :link="`/days/${memoDay.code}`"
              :title="memoDay.label"
              :footer="memoDay.description || undefined"
            >
              <template v-if="memoDay.isRelative" #header>
                <span class="saint-memo-tag">Переходящая</span>
              </template>
            </f7-list-item>
          </template>
        </CollapsibleList>

        <f7-list v-else dividers no-hairlines class="saint-list">
          <f7-list-item
            v-for="row in section.rows"
            :key="row.id"
            :link="row.url"
            :title="row.title"
            :header="row.header ?? undefined"
          />
        </f7-list>
      </section>
    </div>
  </f7-page>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import CollapsibleList from "@/components/CollapsibleList.vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { toDateCode } from "@/components/calendar/calendarMarkers";
import { buildSrcset, htmlToText, resolveImageUrl } from "@/components/calendar/dayFormat";
import { buildMemoDay, getServiceDateLabel, type SaintMemoDay } from "@/components/saint/memoDays";
import { getSaintLifeUrl } from "@/components/saint/saintText";
import { useTheme } from "@/composables/useTheme";
import { usePrayersStore } from "@/stores/prayers";
import { useSaintsStore, type SaintDetails } from "@/stores/saints";

interface LinkRow {
  id: number;
  title: string;
  url: string;
  /** Подпись над названием (например, дата службы) */
  header?: string | null;
}

type Section =
  | { kind: "memo"; key: string; title: string; days: SaintMemoDay[] }
  | { kind: "links"; key: string; title: string; subtitle?: string; rows: LinkRow[] };

const { id } = defineProps<{
  id?: string;
}>();

const saintId = Number(id);

const saintsStore = useSaintsStore();
const prayersStore = usePrayersStore();
const { isDarkMode } = useTheme();

const state = ref<"loading" | "loaded" | "error">("loading");
const details = shallowRef<SaintDetails | null>(null);

// Данные читаются из БД (если святой скачан для офлайна), иначе по сети - см. getSaintDetails
const load = async () => {
  state.value = "loading";
  details.value = await saintsStore.getSaintDetails(saintId);
  state.value = details.value ? "loaded" : "error";
};
void load();

// Имя показываем сразу из индекса святых, пока не загрузилась карточка
const title = computed(
  () => details.value?.name ?? saintsStore.getSaintById(saintId)?.name ?? ""
);

const navIconColor = computed(() => (isDarkMode.value ? "baige-90" : "black-primary"));
const todayUrl = computed(() => `/days/${toDateCode(new Date())}`);

const pictureSrc = computed(() => resolveImageUrl(details.value?.picture ?? null));
const pictureSrcset = computed(() =>
  buildSrcset(
    details.value?.picture ?? null,
    details.value?.picture2x ?? null,
    details.value?.picture3x ?? null
  )
);

const lifeUrl = getSaintLifeUrl(saintId);
const lifePreview = computed(() => htmlToText(details.value?.life ?? ""));

/** Молитвы/каноны/службы - листовые элементы индекса молитв, их ссылки и названия берём оттуда */
const toRows = (ids: number[], getHeader?: (id: number) => string | null): LinkRow[] =>
  ids.flatMap((prayerId) => {
    const item = prayersStore.getItemById(prayerId);
    if (!item) return [];
    return [{ id: prayerId, title: item.name, url: item.url, header: getHeader?.(prayerId) }];
  });

// Минея разложена по месяцам и дням: «Октябрь» -> «Во 2-й день» -> служба
const getServiceHeader = (serviceId: number): string | null => {
  const service = prayersStore.getItemById(serviceId);
  const day = service?.parent != null ? prayersStore.getItemById(service.parent) : undefined;
  const month = day?.parent != null ? prayersStore.getItemById(day.parent) : undefined;
  return getServiceDateLabel(day?.name, month?.name);
};

const sections = computed<Section[]>(() => {
  const saint = details.value;
  if (!saint) return [];

  const today = new Date();
  const memoDays = saint.memoDays.flatMap((memo) => buildMemoDay(memo, today) ?? []);

  const result: Section[] = [
    {
      kind: "links",
      key: "hagiography",
      title: "Четьи-Минеи",
      subtitle: "в изложении свт. Димитрия (Ростовского)",
      rows: toRows(saint.hagiographyIds),
    },
    { kind: "memo", key: "memo", title: "Дни памяти", days: memoDays },
    {
      kind: "links",
      key: "prayers",
      title: "Молитвы",
      rows:
        saint.prayerId == null
          ? []
          : toRows([saint.prayerId]).map((row) => ({
              ...row,
              title: "Тропари, кондаки, молитвы, величание",
            })),
    },
    { kind: "links", key: "akathists", title: "Акафисты", rows: toRows(saint.akathistIds) },
    { kind: "links", key: "canons", title: "Каноны", rows: toRows(saint.canonIds) },
    {
      kind: "links",
      key: "services",
      title: "Службы",
      rows: toRows(saint.mineaIds, getServiceHeader),
    },
  ];

  return result.filter((section) =>
    section.kind === "memo" ? section.days.length > 0 : section.rows.length > 0
  );
});
</script>

<style scoped lang="less">
.saint-page {
  --saint-card-bg: var(--content-color-white-100);
  --saint-section-bg: var(--content-color-black-5);
  --saint-title: var(--content-color-black-primary);
  --saint-text: var(--content-color-black-secondary);
  --saint-muted: var(--content-color-black-60);
  --saint-subtle: var(--content-color-black-40);
  --saint-line: var(--content-color-black-10);
}

.dark .saint-page {
  --saint-card-bg: var(--content-color-baige-10);
  --saint-section-bg: var(--content-color-baige-5);
  --saint-title: var(--content-color-baige-90);
  --saint-text: var(--content-color-baige-90);
  --saint-muted: var(--content-color-baige-60);
  --saint-subtle: var(--content-color-baige-40);
  --saint-line: var(--content-color-baige-10);
}

// Название святого продолжает верхнюю панель
.saint-headline {
  margin: 0;
  padding: 0 16px 20px;
  border-bottom: 1px solid var(--f7-navbar-border-color);
  background: var(--f7-navbar-bg-color);
  font-family: var(--font-family);
  font-size: var(--mobile-heading-h3);
  font-weight: 700;
  line-height: 34px;
  color: var(--f7-navbar-text-color);
}

.saint-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 24px;
  font-family: var(--font-family);
  font-size: var(--mobile-main-text-regular-b3);
  text-align: center;
  color: var(--saint-text);

  p {
    margin: 0;
  }
}

.saint-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 15px 15px 40px;
  font-family: var(--font-family);
}

.saint-card {
  border-radius: 16px;
  background: var(--saint-section-bg);
  overflow: hidden;
}

.saint-life-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 12px;
  background: var(--saint-card-bg);
}

.saint-photo {
  position: relative;
  flex-shrink: 0;
  aspect-ratio: 327 / 465;
  overflow: hidden;
  border-radius: 16px;

  img {
    position: absolute;
    width: 100%;
  }
}

.saint-photo-bg {
  inset: 0;
  height: 100%;
  object-fit: cover;
  filter: blur(38px);
}

.saint-photo-fg {
  top: 3.5%;
  bottom: 2.8%;
  height: auto;
  object-fit: contain;
}

.saint-life {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
}

.saint-life-preview {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  font-size: var(--mobile-main-text-regular-b3);
  line-height: var(--mobile-main-text-regular-b3-line-height);
  color: var(--saint-muted);
  text-decoration: none;
}

.saint-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
}

.saint-section-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.saint-section-title {
  margin: 0;
  font-size: var(--mobile-main-text-bold-b1);
  font-weight: 700;
  line-height: var(--mobile-main-text-bold-b1-line-height);
  color: var(--saint-title);
}

.saint-section-subtitle {
  margin: 0;
  font-size: var(--mobile-main-text-regular-b3);
  line-height: var(--mobile-main-text-regular-b3-line-height);
  color: var(--saint-subtle);
}

// Строки списков - f7-list-item, настраиваем их переменными Framework7
.saint-list {
  --f7-list-margin-vertical: 0;
  --f7-list-bg-color: transparent;
  // С единицей измерения: значение используется внутри calc()
  --f7-list-item-padding-horizontal: 0px;
  --f7-list-item-padding-vertical: 6px;
  --f7-list-item-min-height: 36px;
  --f7-list-item-border-color: var(--saint-line);
  --f7-list-chevron-icon-color: var(--saint-subtle);
  --f7-list-item-title-font-size: var(--mobile-main-text-regular-b2);
  --f7-list-item-title-line-height: var(--mobile-main-text-regular-b2-line-height);
  --f7-list-item-title-text-color: var(--saint-text);
  --f7-list-item-header-text-color: var(--saint-muted);
  --f7-list-item-header-font-size: var(--mobile-main-text-regular-b3);
  --f7-list-item-header-line-height: var(--mobile-main-text-regular-b3-line-height);
  --f7-list-item-footer-text-color: var(--saint-text);
  --f7-list-item-footer-font-size: var(--mobile-main-text-regular-b3);
  --f7-list-item-footer-line-height: var(--mobile-main-text-regular-b3-line-height);

  --collapsible-list-toggle-color: var(--saint-text);

  // Названия и описания длинные: переносим строки, а не обрезаем
  :deep(.item-title),
  :deep(.item-header),
  :deep(.item-footer) {
    white-space: normal;
  }
}

.saint-memo-tag {
  display: inline-block;
  margin-bottom: 4px;
  padding: 3px 6px 2px;
  border: 1px solid var(--saint-subtle);
  border-radius: 4px;
  color: var(--saint-muted);
}
</style>
