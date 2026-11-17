/**
 * В буфер обмена. Clipboard API зовём сразу, без await до него: Safari считает
 * жест израсходованным после первого ожидания и запись отклоняет. Фолбэк — для
 * http и старых браузеров; ему нужен сфокусированный выделенный textarea,
 * иначе Safari и iOS возвращают из execCommand false.
 */
export function copyText(text: string): Promise<void> {
  try {
    const direct = navigator.clipboard?.writeText(text);
    if (direct) return direct.catch(() => fallbackCopy(text));
    fallbackCopy(text);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

function fallbackCopy(text: string): void {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  document.body.append(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, text.length);
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("копирование не сработало");
}
