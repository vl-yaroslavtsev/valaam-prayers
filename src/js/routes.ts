import type { Router } from "framework7/types";

import HomePage from "../pages/home.vue";
import AboutPage from "../pages/about.vue";
import FormPage from "../pages/form.vue";
import PrayersPage from "../pages/prayers.vue";
import PrayersTextPage from "../pages/prayersText.vue";
import CalendarPage from "../pages/calendar.vue";
import DayPage from "../pages/day.vue";
import SaintPage from "../pages/saint.vue";
import RitesPage from "../pages/rites.vue";
import SettingsPage from "../pages/settings.vue";
import SettingsTestPage from "../pages/settingsTest.vue";
import SettingsOfflinePage from "../pages/settingsOffline.vue";
import SettingsReadingPage from "../pages/settingsReading.vue";

import NotFoundPage from "../pages/404.vue";

const routes: Router.RouteParameters[] = [
  {
    path: "/",
    component: HomePage,
  },
  {
    path: "/about/",
    component: AboutPage,
  },
  {
    path: "/form/",
    component: FormPage,
  },
  {
    path: "/prayers/:sectionId",
    component: PrayersPage,
    options: {
      transition: "fade-slide",
    },
  },
  {
    path: "/prayers/text/:elementId",
    component: PrayersTextPage,
    options: {
      // transition: "f7-dive",
    },
  },
  {
    path: "/prayers/composed-text/:sectionId",
    component: PrayersTextPage,
    options: {
      // transition: "fade-slide",
    },
  },
  {
    path: "/calendar/",
    component: CalendarPage,
    options: {
      transition: "fade-slide",
    },
  },
  {
    path: "/days/:id",
    component: DayPage,
    options: {
      transition: "fade-slide",
    },
  },
  {
    // Мысль, притча, богослужебные указания дня в читалке
    path: "/days/:code/text/:kind",
    component: PrayersTextPage,
  },
  {
    path: "/days/:code/readings/:readingId",
    component: PrayersTextPage,
  },
  {
    path: "/saints/:id",
    component: SaintPage,
    options: {
      transition: "fade-slide",
    },
  },
  {
    // Житие святого в читалке
    path: "/saints/:saintId/life",
    component: PrayersTextPage,
  },
  {
    path: "/rites/",
    component: RitesPage,
    options: {
      transition: "fade-slide",
    },
  },
  {
    path: "/settings/",
    component: SettingsPage,
    options: {
      transition: "fade-slide",
    },
  },
  {
    path: "/settings-test/",
    component: SettingsTestPage,
    options: {
      transition: "fade-slide",
    },
  },
  {
    path: "/settings/offline/",
    component: SettingsOfflinePage,
    options: {
      transition: "fade-slide",
    },
  },
  {
    path: "/settings/reading/",
    component: SettingsReadingPage,
    options: {
      transition: "fade-slide",
    },
  },
  {
    path: "(.*)",
    component: NotFoundPage,
  },
];

export default routes;
