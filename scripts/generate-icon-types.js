import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.resolve(__dirname, "../src/assets/icons");
const OUT_FILE = path.resolve(__dirname, "../src/types/icon-name.d.ts");

export function generateIconTypes() {
  const names = fs
    .readdirSync(ICONS_DIR)
    .filter((file) => file.endsWith(".svg"))
    .map((file) => file.replace(/\.svg$/, ""))
    .sort();

  const content =
    "// Автогенерируемый файл, не редактировать вручную.\n" +
    "// Обновляется при запуске dev/build на основе файлов в src/assets/icons.\n" +
    "export type IconName =\n" +
    names.map((name) => `  | "${name}"`).join("\n") +
    ";\n";

  if (!fs.existsSync(OUT_FILE) || fs.readFileSync(OUT_FILE, "utf-8") !== content) {
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, content);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateIconTypes();
}
