import { ref, watch, nextTick, type Ref } from "vue";
import type { SpotlightTarget } from "@/components/reading-tutorial/SpotlightHint.vue";
import type { NavbarIconKey } from "@/components/PrayersTextNavbar.vue";
import type { useReadingTutorial } from "@/composables/useReadingTutorial";
import {
  BOOKMARK_NAV_HINT_COPY,
  CHAPTER_NAV_HINT_COPY,
  RESET_PROGRESS_HINT,
  TOP_MENU_HINT_COPY,
  type NavHintCopy,
} from "@/composables/readingHintCopy";

const HINT_SHOW_DELAY_MS = 350;

type HintKey = "chapter" | "bookmark" | "bars";

export interface ReadingHintsToolbars {
  navbar: Readonly<
    Ref<{ getIconTargets: () => Array<{ key: NavbarIconKey; el: HTMLElement | null }> } | null>
  >;
  pageNav: Readonly<Ref<{ getResetLinkEl: () => HTMLElement | null } | null>>;
  chapterNav: Readonly<
    Ref<{ getToolbarEl: () => HTMLElement | null; getContentLinkEl: () => HTMLElement | null } | null>
  >;
  bookmarkNav: Readonly<
    Ref<{ getToolbarEl: () => HTMLElement | null; getListLinkEl: () => HTMLElement | null } | null>
  >;
}

export interface UseReadingHintsOptions {
  tutorial: ReturnType<typeof useReadingTutorial>;
  isNavbarHidden: Readonly<Ref<boolean>>;
  isPageNavHidden: Readonly<Ref<boolean>>;
  isChapterNavActive: Readonly<Ref<boolean>>;
  isBookmarkNavActive: Readonly<Ref<boolean>>;
  toolbars: ReadingHintsToolbars;
  onOpenSettings: () => void;
}

interface NavHintConfig {
  key: Exclude<HintKey, "bars">;
  isActive: Readonly<Ref<boolean>>;
  shouldShow: Readonly<Ref<boolean>>;
  markSeen: () => void;
  getToolbarEl: () => HTMLElement | null | undefined;
  getActionLinkEl: () => HTMLElement | null | undefined;
  copy: NavHintCopy;
}

/**
 * Уровень 2 обучающего режима читалки — контекстные подсказки SpotlightHint
 * (иконки панелей, тулбар глав и тулбар закладок).
 */
export function useReadingHints({
  tutorial,
  isNavbarHidden,
  isPageNavHidden,
  isChapterNavActive,
  isBookmarkNavActive,
  toolbars,
  onOpenSettings,
}: UseReadingHintsOptions) {
  const activeHintTargets = ref<SpotlightTarget[] | null>(null);
  let activeHintKey: HintKey | null = null;
  let activeHintDone: (() => void) | null = null;

  const showSpotlightHint = (key: HintKey, targets: SpotlightTarget[], onDone: () => void) => {
    if (!targets.length) return;
    activeHintTargets.value = targets;
    activeHintKey = key;
    activeHintDone = onDone;
  };

  const closeActiveHint = () => {
    activeHintTargets.value = null;
    activeHintKey = null;
    activeHintDone?.();
    activeHintDone = null;
  };

  const openSettingsFromHint = () => {
    closeActiveHint();
    onOpenSettings();
  };

  const registerNavHint = ({
    key,
    isActive,
    shouldShow,
    markSeen,
    getToolbarEl,
    getActionLinkEl,
    copy,
  }: NavHintConfig) => {
    const show = () => {
      if (!getToolbarEl()) return;

      const targets: SpotlightTarget[] = [
        {
          title: copy.toolbar.title,
          text: copy.toolbar.text,
          getTargetEl: () => getToolbarEl(),
          shape: "rounded",
          link: {
            label: copy.toolbar.linkLabel,
            onClick: openSettingsFromHint,
          },
        },
      ];

      if (getActionLinkEl()) {
        targets.push({
          title: copy.action.title,
          text: copy.action.text,
          getTargetEl: () => getActionLinkEl(),
          shape: "circle",
        });
      }

      showSpotlightHint(key, targets, markSeen);
    };

    watch(isActive, (active, _prev, onCleanup) => {
      if (!active) {
        if (activeHintKey === key) {
          closeActiveHint();
        }
        return;
      }
      if (!shouldShow.value || tutorial.isBasicsTutorialActive.value || activeHintTargets.value) {
        return;
      }

      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      onCleanup(() => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      });

      nextTick(() => {
        if (cancelled || !isActive.value) return;
        timer = setTimeout(() => {
          timer = null;
          if (cancelled || !isActive.value || !shouldShow.value || activeHintTargets.value) {
            return;
          }
          show();
        }, HINT_SHOW_DELAY_MS);
      });
    });
  };

  registerNavHint({
    key: "chapter",
    isActive: isChapterNavActive,
    shouldShow: tutorial.shouldShowChapterNavHint,
    markSeen: tutorial.markChapterNavHintSeen,
    getToolbarEl: () => toolbars.chapterNav.value?.getToolbarEl(),
    getActionLinkEl: () => toolbars.chapterNav.value?.getContentLinkEl(),
    copy: CHAPTER_NAV_HINT_COPY,
  });

  registerNavHint({
    key: "bookmark",
    isActive: isBookmarkNavActive,
    shouldShow: tutorial.shouldShowBookmarkNavHint,
    markSeen: tutorial.markBookmarkNavHintSeen,
    getToolbarEl: () => toolbars.bookmarkNav.value?.getToolbarEl(),
    getActionLinkEl: () => toolbars.bookmarkNav.value?.getListLinkEl(),
    copy: BOOKMARK_NAV_HINT_COPY,
  });

  watch([isNavbarHidden, isPageNavHidden], ([navHidden, pageNavHidden], _prev, onCleanup) => {
    if (navHidden || pageNavHidden || !tutorial.shouldShowBarsHint.value) return;
    const timer = setTimeout(() => {
      if (isNavbarHidden.value || isPageNavHidden.value) return;
      const targets: SpotlightTarget[] = (toolbars.navbar.value?.getIconTargets() ?? [])
        .filter((target): target is { key: NavbarIconKey; el: HTMLElement } => Boolean(target.el))
        .map((target) => ({
          title: TOP_MENU_HINT_COPY[target.key].title,
          text: TOP_MENU_HINT_COPY[target.key].text,
          getTargetEl: () => target.el,
          shape: "circle" as const,
        }));
      const resetEl = toolbars.pageNav.value?.getResetLinkEl();
      if (resetEl) {
        targets.push({
          title: RESET_PROGRESS_HINT.title,
          text: RESET_PROGRESS_HINT.text,
          getTargetEl: () => resetEl,
          shape: "circle",
        });
      }
      showSpotlightHint("bars", targets, tutorial.markBarsHintSeen);
    }, HINT_SHOW_DELAY_MS);
    onCleanup(() => clearTimeout(timer));
  });

  return {
    activeHintTargets,
    closeActiveHint,
  };
}
