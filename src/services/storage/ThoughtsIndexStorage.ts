import { BaseStorage } from "./BaseStorage";

export class ThoughtsIndexStorage extends BaseStorage<"thoughts-index"> {
  constructor() {
    super("thoughts-index");
  }
} 