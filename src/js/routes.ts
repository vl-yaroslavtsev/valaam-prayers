import { Router } from "framework7/types";

import HomePage from "../pages/home.vue";
import AboutPage from "../pages/about.vue";
import FormPage from "../pages/form.vue";
import PrayersPage from "../pages/prayers.vue";
import PrayersTextPage from "../pages/prayers-text.vue";
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
  },
  {
    path: "/prayers/text/:elementId",
    component: PrayersTextPage,
    options: {
      transition: "f7-fade",
    },
  },
  {
    path: "/calendar/",
    component: CalendarPage,
  },
  {
    path: "/days/:id",
    component: DayPage,
  },
  {
    path: "/rites/",
    component: RitesPage,
  },
  {
    path: "/settings/",
    component: SettingsPage,
  },
  {
    path: "(.*)",
    component: NotFoundPage,
  },
];

export default routes;
