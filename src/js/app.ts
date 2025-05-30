// Импортируем Vue
import { createApp } from "vue";

import type { App as TApp } from "vue";

// Импортируем Framework7
import Framework7 from "framework7/lite";

// Импортируем компоненты
import Dialog from "framework7/components/dialog";
import Popup from "framework7/components/popup";
import LoginScreen from "framework7/components/login-screen";
import Popover from "framework7/components/popover";
import Actions from "framework7/components/actions";
import Sheet from "framework7/components/sheet";
import Toast from "framework7/components/toast";
import Preloader from "framework7/components/preloader";
import Progressbar from "framework7/components/progressbar";
import Sortable from "framework7/components/sortable";
import Swipeout from "framework7/components/swipeout";
import Accordion from "framework7/components/accordion";
import ContactsList from "framework7/components/contacts-list";
import VirtualList from "framework7/components/virtual-list";
import ListIndex from "framework7/components/list-index";
import Timeline from "framework7/components/timeline";
import Tabs from "framework7/components/tabs";
import Panel from "framework7/components/panel";
import Card from "framework7/components/card";
import Chip from "framework7/components/chip";
import Form from "framework7/components/form";
import Input from "framework7/components/input";
import Checkbox from "framework7/components/checkbox";
import Radio from "framework7/components/radio";
import Toggle from "framework7/components/toggle";
import Range from "framework7/components/range";
import Stepper from "framework7/components/stepper";
import SmartSelect from "framework7/components/smart-select";
import Grid from "framework7/components/grid";
import Calendar from "framework7/components/calendar";
import Picker from "framework7/components/picker";
import InfiniteScroll from "framework7/components/infinite-scroll";
import PullToRefresh from "framework7/components/pull-to-refresh";
import DataTable from "framework7/components/data-table";
import Fab from "framework7/components/fab";
import Searchbar from "framework7/components/searchbar";
import Messages from "framework7/components/messages";
import Messagebar from "framework7/components/messagebar";
import Swiper from "framework7/components/swiper";
import PhotoBrowser from "framework7/components/photo-browser";
import Notification from "framework7/components/notification";
import Autocomplete from "framework7/components/autocomplete";
import Tooltip from "framework7/components/tooltip";
import Skeleton from "framework7/components/skeleton";
import ColorPicker from "framework7/components/color-picker";
import Treeview from "framework7/components/treeview";
import TextEditor from "framework7/components/text-editor";
//import Breadcrumbs from 'framework7/components/breadcrumbs';
import Typography from "framework7/components/typography";

Framework7.use([
  Dialog,
  Popup,
  // LoginScreen,
  Popover,
  Actions,
  Sheet,
  Toast,
  Preloader,
  Progressbar,
  Sortable,
  Swipeout,
  // Accordion,
  // ContactsList,
  VirtualList,
  // ListIndex,
  // Timeline,
  Tabs,
  Panel,
  Card,
  // Chip,
  Form,
  Input,
  Checkbox,
  Radio,
  Toggle,
  Range,
  Stepper,
  SmartSelect,
  Grid,
  Calendar,
  Picker,
  InfiniteScroll,
  PullToRefresh,
  // DataTable,
  Fab,
  Searchbar,
  // Messages,
  // Messagebar,
  Swiper,
  // PhotoBrowser,
  Notification,
  Autocomplete,
  Tooltip,
  Skeleton,
  // ColorPicker,
  Treeview,
  // TextEditor,
  // Breadcrumbs,
  Typography,
]);

// Import Framework7-Vue Plugin
import Framework7Vue, {
  f7AccordionContent,
  f7AccordionItem,
  f7AccordionToggle,
  f7Accordion,
  f7ActionsButton,
  f7ActionsGroup,
  f7ActionsLabel,
  f7Actions,
  f7App,
  f7AreaChart,
  f7Badge,
  f7BlockFooter,
  f7BlockHeader,
  f7BlockTitle,
  f7Block,
  f7BreadcrumbsCollapsed,
  f7BreadcrumbsItem,
  f7BreadcrumbsSeparator,
  f7Breadcrumbs,
  f7Button,
  f7CardContent,
  f7CardFooter,
  f7CardHeader,
  f7Card,
  f7Checkbox,
  f7Chip,
  f7FabBackdrop,
  f7FabButton,
  f7FabButtons,
  f7Fab,
  f7Gauge,
  f7Icon,
  f7Input,
  f7Link,
  f7ListButton,
  f7ListGroup,
  f7ListIndex,
  f7ListInput,
  f7ListItem,
  f7List,
  f7LoginScreenTitle,
  f7LoginScreen,
  f7Message,
  f7MessagebarAttachment,
  f7MessagebarAttachments,
  f7MessagebarSheetImage,
  f7MessagebarSheetItem,
  f7MessagebarSheet,
  f7Messagebar,
  f7MessagesTitle,
  f7Messages,
  f7NavLeft,
  f7NavRight,
  f7NavTitleLarge,
  f7NavTitle,
  f7Navbar,
  f7PageContent,
  f7Page,
  f7Panel,
  f7PhotoBrowser,
  f7PieChart,
  f7Popover,
  f7Popup,
  f7Preloader,
  f7Progressbar,
  f7Radio,
  f7Range,
  f7RoutableModals,
  f7Searchbar,
  f7Segmented,
  f7Sheet,
  f7SkeletonAvatar,
  f7SkeletonBlock,
  f7SkeletonImage,
  f7SkeletonText,
  f7Stepper,
  f7Subnavbar,
  f7SwipeoutActions,
  f7SwipeoutButton,
  f7Tab,
  f7Tabs,
  f7TextEditor,
  f7Toggle,
  f7Toolbar,
  f7TreeviewItem,
  f7Treeview,
  f7UseIcon,
  f7View,
  f7Views,
} from "framework7-vue";

// Import Icons and App Custom Styles
import "../css/f7.less";
import "../css/icons.less";
import "../css/app.less";

// Import App Component
import App from "../components/App.vue";

// Init Framework7-Vue Plugin
Framework7.use(Framework7Vue);

// Init App
const app = createApp(App);

// Register Framework7 Vue components
registerComponents(app);

// Запуск приложения
app.mount("#app");

function registerComponents(app: TApp<Element>) {
  // app.component('f7-accordion-content', f7AccordionContent);
  // app.component('f7-accordion-item', f7AccordionItem);
  // app.component('f7-accordion-toggle', f7AccordionToggle);
  // app.component('f7-accordion', f7Accordion);
  app.component("f7-actions-button", f7ActionsButton);
  app.component("f7-actions-group", f7ActionsGroup);
  app.component("f7-actions-label", f7ActionsLabel);
  app.component("f7-actions", f7Actions);
  app.component("f7-app", f7App);
  // app.component('f7-area-chart', f7AreaChart);
  app.component("f7-badge", f7Badge);
  app.component("f7-block-footer", f7BlockFooter);
  app.component("f7-block-header", f7BlockHeader);
  app.component("f7-block-title", f7BlockTitle);
  app.component("f7-block", f7Block);
  // app.component('f7-breadcrumbs-collapsed', f7BreadcrumbsCollapsed);
  // app.component('f7-breadcrumbs-item', f7BreadcrumbsItem);
  // app.component('f7-breadcrumbs-separator', f7BreadcrumbsSeparator);
  // app.component('f7-breadcrumbs', f7Breadcrumbs);
  app.component("f7-button", f7Button);
  app.component("f7-card-content", f7CardContent);
  app.component("f7-card-footer", f7CardFooter);
  app.component("f7-card-header", f7CardHeader);
  app.component("f7-card", f7Card);
  app.component("f7-checkbox", f7Checkbox);
  // app.component('f7-chip', f7Chip);
  app.component("f7-fab-backdrop", f7FabBackdrop);
  app.component("f7-fab-button", f7FabButton);
  app.component("f7-fab-buttons", f7FabButtons);
  app.component("f7-fab", f7Fab);
  // app.component('f7-gauge', f7Gauge);
  app.component("f7-icon", f7Icon);
  app.component("f7-input", f7Input);
  app.component("f7-link", f7Link);
  app.component("f7-list-button", f7ListButton);
  app.component("f7-list-group", f7ListGroup);
  app.component("f7-list-index", f7ListIndex);
  app.component("f7-list-input", f7ListInput);
  app.component("f7-list-item", f7ListItem);
  app.component("f7-list", f7List);
  app.component("f7-login-screen-title", f7LoginScreenTitle);
  // app.component('f7-login-screen', f7LoginScreen);
  // app.component('f7-message', f7Message);
  // app.component('f7-messagebar-attachment', f7MessagebarAttachment);
  // app.component('f7-messagebar-attachments', f7MessagebarAttachments);
  // app.component('f7-messagebar-sheet-image', f7MessagebarSheetImage);
  // app.component('f7-messagebar-sheet-item', f7MessagebarSheetItem);
  // app.component('f7-messagebar-sheet', f7MessagebarSheet);
  // app.component('f7-messagebar', f7Messagebar);
  // app.component('f7-messages-title', f7MessagesTitle);
  // app.component('f7-messages', f7Messages);
  app.component("f7-nav-left", f7NavLeft);
  app.component("f7-nav-right", f7NavRight);
  app.component("f7-nav-title-large", f7NavTitleLarge);
  app.component("f7-nav-title", f7NavTitle);
  app.component("f7-navbar", f7Navbar);
  app.component("f7-page-content", f7PageContent);
  app.component("f7-page", f7Page);
  app.component("f7-panel", f7Panel);
  // app.component('f7-photo-browser', f7PhotoBrowser);
  // app.component('f7-pie-chart', f7PieChart);
  app.component("f7-popover", f7Popover);
  app.component("f7-popup", f7Popup);
  app.component("f7-preloader", f7Preloader);
  app.component("f7-progressbar", f7Progressbar);
  app.component("f7-radio", f7Radio);
  app.component("f7-range", f7Range);
  app.component("f7-routable-modals", f7RoutableModals);
  app.component("f7-searchbar", f7Searchbar);
  app.component("f7-segmented", f7Segmented);
  app.component("f7-sheet", f7Sheet);
  app.component("f7-skeleton-avatar", f7SkeletonAvatar);
  app.component("f7-skeleton-block", f7SkeletonBlock);
  app.component("f7-skeleton-image", f7SkeletonImage);
  app.component("f7-skeleton-text", f7SkeletonText);
  app.component("f7-stepper", f7Stepper);
  app.component("f7-subnavbar", f7Subnavbar);
  app.component("f7-swipeout-actions", f7SwipeoutActions);
  app.component("f7-swipeout-button", f7SwipeoutButton);
  app.component("f7-tab", f7Tab);
  app.component("f7-tabs", f7Tabs);
  // app.component('f7-text-editor', f7TextEditor);
  app.component("f7-toggle", f7Toggle);
  app.component("f7-toolbar", f7Toolbar);
  app.component("f7-treeview-item", f7TreeviewItem);
  app.component("f7-treeview", f7Treeview);
  app.component("f7-use-icon", f7UseIcon);
  app.component("f7-view", f7View);
  app.component("f7-views", f7Views);
}
