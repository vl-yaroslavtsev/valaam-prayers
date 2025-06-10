import { createStore } from "framework7/lite";

export interface Product {
  id: string;
  title: string;
  description: string;
}

export interface Day {
  id: string;
  title: string;
  description: string;
}

export interface StoreState {
  products: Product[];
  days: Day[];
}

const store = createStore({
  state: {
    products: [] as Product[],
    days: [] as Day[],
  },
  getters: {
    products({ state }: { state: StoreState }) {
      return state.products;
    },
    days({ state }: { state: StoreState }) {
      return state.days;
    },
  },
  actions: {
    addProduct({ state }: { state: StoreState }, product: Product) {
      state.products = [...state.products, product];
    },
  },
});

store.state.products = [
  {
    id: "1",
    title: "Apple iPhone 8",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nisi tempora similique reiciendis, error nesciunt vero, blanditiis pariatur dolor, minima sed sapiente rerum, dolorem corrupti hic modi praesentium unde saepe perspiciatis.",
  },
  {
    id: "2",
    title: "Apple iPhone 8 Plus",
    description:
      "Velit odit autem modi saepe ratione totam minus, aperiam, labore quia provident temporibus quasi est ut aliquid blanditiis beatae suscipit odio vel! Nostrum porro sunt sint eveniet maiores, dolorem itaque!",
  },
  {
    id: "3",
    title: "Apple iPhone X",
    description:
      "Expedita sequi perferendis quod illum pariatur aliquam, alias laboriosam! Vero blanditiis placeat, mollitia necessitatibus reprehenderit. Labore dolores amet quos, accusamus earum asperiores officiis assumenda optio architecto quia neque, quae eum.",
  },
];

store.state.days = [
  {
    id: "20241001",
    title: "1 октября",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nisi tempora similique reiciendis, error nesciunt vero, blanditiis pariatur dolor, minima sed sapiente rerum, dolorem corrupti hic modi praesentium unde saepe perspiciatis.",
  },
  {
    id: "20241002",
    title: "2 октября",
    description:
      "Velit odit autem modi saepe ratione totam minus, aperiam, labore quia provident temporibus quasi est ut aliquid blanditiis beatae suscipit odio vel! Nostrum porro sunt sint eveniet maiores, dolorem itaque!",
  },
  {
    id: "20241003",
    title: "3 октября",
    description:
      "Expedita sequi perferendis quod illum pariatur aliquam, alias laboriosam! Vero blanditiis placeat, mollitia necessitatibus reprehenderit. Labore dolores amet quos, accusamus earum asperiores officiis assumenda optio architecto quia neque, quae eum.",
  },
];

export default store;
