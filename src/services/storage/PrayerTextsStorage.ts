import { BaseStorage } from "./BaseStorage";

export class PrayerTextsStorage extends BaseStorage<"prayer-texts"> {
  constructor() {
    super("prayer-texts");
  }
} 

