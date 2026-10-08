import { fileUrl } from "@/api/transport";
import type { MoodleFileContent } from "@/api/types";

/**
 * Готовит HTML, пришедший из Moodle (текст страницы, описание задания),
 * к безопасному выводу внутри нашего интерфейса.
 *
 * Что делаем:
 *  1. Подставляем реальные ссылки на файлы вместо плейсхолдеров `@@PLUGINFILE@@`.
 *  2. Вырезаем потенциально опасные теги и атрибуты (`<script>`, `onclick`,
 *     `javascript:` и т.п.) — контент чужой, относимся к нему настороженно.
 *  3. Открываем все ссылки в новой вкладке.
 */
export function buildMoodleHtml(
  raw: string | undefined | null,
  files: MoodleFileContent[] | undefined,
  token: string,
): string {
  if (!raw) return "";
  const list = files ?? [];

  // 1. Плейсхолдеры файлов вида @@PLUGINFILE@@/имя.png
  let html = raw.replace(/@@PLUGINFILE@@\/([^"'\s>)]+)/g, (whole, encoded) => {
    let name = encoded;
    try {
      name = decodeURIComponent(encoded);
    } catch {
      /* оставляем как есть */
    }
    const match =
      list.find((f) => f.filename === name) ??
      list.find((f) => f.filename === encoded) ??
      list.find((f) => f.filename.replace(/ /g, "%20") === encoded);
    return match ? fileUrl(match.fileurl, token) : whole;
  });

  // 2. Санитайз через парсер DOM
  if (typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");

  doc
    .querySelectorAll("script,style,iframe,object,embed,form,input,button,link,meta,base")
    .forEach((node) => node.remove());

  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (
        (name === "href" || name === "src" || name === "xlink:href") &&
        /^\s*(javascript|data:text\/html|vbscript):/i.test(attr.value.trim())
      ) {
        el.removeAttribute(attr.name);
      }
    }
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noreferrer noopener");
    }
  });

  html = doc.body.innerHTML;

  // 3. Не забываем про target у ссылок, если парсер их не сохранил
  return html;
}

export function hasHtml(raw?: string | null): boolean {
  return Boolean(raw && /<[a-z][\s\S]*>/i.test(raw));
}
