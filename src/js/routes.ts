import { Router } from "framework7/types";

import HomePage from "../pages/home.vue";
import AboutPage from "../pages/about.vue";
import FormPage from "../pages/form.vue";
import PrayersPage from "../pages/prayers.vue";
import PrayersTextPage from "../pages/prayersText.vue";
import CalendarPage from "../pages/calendar.vue";
import DayPage from "../pages/day.vue";
import RitesPage from "../pages/rites.vue";
import SettingsPage from "../pages/settings.vue";

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
      // transition: "smooth",
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
    path: "(.*)",
    component: NotFoundPage,
  },
];

export default routes;
