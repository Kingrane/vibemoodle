import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ClipboardCopy, Loader2, Paperclip, Sparkles, Timer, X } from "lucide-react";
import type { MoodleModule } from "@/api/types";
import { gatherMaterial } from "@/api/material";
import { buildAgentPrompt } from "@/api/agentPrompt";
import { askSolver, SOLVER_LOGIN, SOLVER_READY } from "@/api/inception";
import { useSession } from "@/session/useSession";
import { cx } from "@/lib/cx";
import { PillButton } from "@/ui/primitives";

interface SolverState {
  status: "idle" | "loading" | "done" | "error";
  answer: string;
  error?: string;
  /** Полное время ответа модели, мс. */
  ms?: number;
  /** Время до первого фрагмента — тот самый «time to first token», мс. */
  firstMs?: number;
}

/** 531 → «531 мс», 1410 → «1,4 с». */
function formatMs(ms: number): string {
  return ms < 1000
    ? `${Math.round(ms)} мс`
    : `${(ms / 1000).toFixed(1).replace(".", ",")} с`;
}

/** Текстовая заготовка (bits.cpp и подобное), которую подкладываем модели. */
interface Attachment {
  name: string;
  text: string;
}

const FIELD =
  "w-full resize-y rounded-card border border-line bg-transparent px-3 py-2 text-body-sm outline-none transition-colors duration-300 placeholder:text-muted/50 focus:border-cream";

type CopyState = "idle" | "busy" | "done" | "fail";

const COPY_LABEL: Record<CopyState, string> = {
  idle: "секретная кнопка",
  busy: "собираю промпт…",
  done: "промпт скопирован",
  fail: "не удалось скопировать",
};

/**
 * В буфер обмена. Clipboard API зовём сразу, без await до него: Safari считает
 * жест израсходованным после первого ожидания и запись отклоняет. Фолбэк — для
 * http и старых браузеров; ему нужен сфокусированный выделенный textarea,
 * иначе Safari и iOS возвращают из execCommand false.
 */
function copyText(text: string): Promise<void> {
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

/** Минимальная разметка ответа: ```-блоки как код, остальное как текст. */
function AnswerView({ text }: { text: string }) {
  const parts = text.split("```");
  return (
    <div className="flex flex-col gap-4">
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const code = part.replace(/^[a-zA-Z0-9+#-]*\n/, "").replace(/\s+$/, "");
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-card border border-line bg-canvas p-4 text-caption leading-relaxed"
            >
              <code className="font-mono">{code}</code>
            </pre>
          );
        }
        const body = part.trim();
        if (!body) return null;
        return (
          <p key={i} className="whitespace-pre-wrap text-body-sm text-muted">
            {body}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Две кнопки на странице материала.
 *
 * «Супер кнопка» — мгновенный ответ модели: видна только SOLVER_LOGIN (ключ
 * оплачивает владелец), логин перепроверяется на каждый клик. Открывает панель и
 * сразу отправляет материал в модель.
 * «Секретная кнопка» — доступна всем: собирает самодостаточный промпт из условия
 * задания и копирует его в буфер, чтобы отдать агенту-кодеру.
 *
 * Панель не показывается до нажатия: её открывает «супер кнопка», а еле заметная
 * стрелка у края — только открывает, без запроса (там же лежат заготовки).
 */
export function SuperButton({
  cm,
  mod,
  token,
}: {
  cm: MoodleModule;
  mod?: MoodleModule;
  token: string;
}) {
  const username = useSession((s) => s.username);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SolverState>({ status: "idle", answer: "" });
  const [files, setFiles] = useState<Attachment[]>([]);
  const [paste, setPaste] = useState("");
  const [copy, setCopy] = useState<CopyState>("idle");
  /**
   * Материал тянем сразу при открытии страницы: Safari не разрешает писать в
   * буфер после await, поэтому на клик текст обязан быть уже готовым.
   */
  const [material, setMaterial] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    setMaterial(null);
    gatherMaterial(token, cm, mod)
      .then((text) => {
        if (alive) setMaterial(text);
      })
      .catch(() => {
        // Не дотянулись — не блокируем кнопку: промпт соберётся по названию.
        if (alive) setMaterial("");
      });
    return () => {
      alive = false;
    };
  }, [token, cm, mod]);

  /** Заготовки одним блоком: и для модели, и для промпта агенту. */
  const extraContext = () =>
    [...files.map((f) => `--- ${f.name} ---\n${f.text}`), paste.trim()]
      .filter(Boolean)
      .join("\n\n");

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const read = await Promise.all(
      Array.from(list).map(async (file) => ({ name: file.name, text: await file.text() })),
    );
    setFiles((prev) => [...prev, ...read]);
  };

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading", answer: "" });
    try {
      // Кэш материала используем только если он непустой, иначе тянем заново.
      const text = material || (await gatherMaterial(token, cm, mod));
      // Заготовки со страницы сдаются вместе с текстом материала.
      const extra = extraContext();
      const question = [
        text || cm.name,
        extra && `Заготовки от студента:\n${extra}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      // Замеряем именно запрос к модели — без времени сбора текста из Moodle.
      const started = performance.now();
      let first: number | undefined;
      const answer = await askSolver(
        { title: cm.name, material: question },
        (partial) => {
          first ??= performance.now() - started;
          setState({ status: "loading", answer: partial, firstMs: first });
        },
        controller.signal,
      );
      setState({
        status: "done",
        answer,
        ms: performance.now() - started,
        firstMs: first,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({
        status: "error",
        answer: "",
        error: err instanceof Error ? err.message : "Не удалось получить ответ.",
      });
    }
  };

  const copyPrompt = () => {
    if (material === null) return;
    // Ни одного await до copyText: Safari отклоняет запись, если жест израсходован.
    const prompt = buildAgentPrompt({
      title: cm.name,
      material,
      attachments: extraContext(),
    });
    setCopy("busy");
    copyText(prompt)
      .then(() => setCopy("done"))
      .catch(() => setCopy("fail"));
  };

  useEffect(() => {
    if (copy !== "done" && copy !== "fail") return;
    const timer = setTimeout(() => setCopy("idle"), 2500);
    return () => clearTimeout(timer);
  }, [copy]);

  /** Решать моделью может только владелец ключа; остальным остаётся промпт. */
  const canSolve = SOLVER_READY && username?.toLowerCase() === SOLVER_LOGIN;
  const busy = state.status === "loading";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 self-start">
        {/* «Супер кнопка» — только владельцу ключа; логин перепроверяем и на клик. */}
        {canSolve && (
          <PillButton
            onClick={() => {
              if (username?.toLowerCase() !== SOLVER_LOGIN) return;
              setOpen(true);
              void run();
            }}
          >
            <Sparkles className="h-4 w-4 text-lilac" strokeWidth={1.5} />
            супер кнопка
          </PillButton>
        )}

        {/* «Секретная кнопка» — доступна всем: копирует промпт для агента. */}
        <PillButton onClick={copyPrompt} disabled={material === null || copy === "busy"}>
          {copy === "done" ? (
            <Check className="h-4 w-4 text-green" strokeWidth={1.5} />
          ) : (
            <ClipboardCopy className="h-4 w-4" strokeWidth={1.5} />
          )}
          {material === null ? COPY_LABEL.busy : COPY_LABEL[copy]}
        </PillButton>
      </div>

      {/* Панель уходит в портал: внутри .reveal есть will-change: transform,
          который превратил бы предка в containing block и «fixed» считался бы
          от блока Reveal, а не от окна. */}
      {createPortal(
        <>
          <div
            aria-hidden={!open}
            onClick={() => setOpen(false)}
            className={cx(
              "fixed inset-0 z-40 bg-canvas/70 backdrop-blur-sm transition-opacity duration-300",
              open ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />

          {/* Еле заметная стрелка у правого края: открывает панель без запроса. */}
          <button
            type="button"
            aria-label="Открыть супер ассистента"
            aria-hidden={open}
            tabIndex={open ? -1 : 0}
            onClick={() => setOpen(true)}
            className={cx(
              "fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-pill border border-r-0 border-line bg-panel/70 py-4 pl-1.5 pr-1 text-muted backdrop-blur-sm transition-[opacity,translate] duration-300 [transition-timing-function:var(--ease-out-expo)] hover:text-cream",
              open ? "pointer-events-none translate-x-full opacity-0" : "opacity-25 hover:opacity-100",
            )}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>

          <aside
            aria-hidden={!open}
            className={cx(
              "fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[560px] flex-col border-l border-line bg-panel transition-[translate] duration-500 [transition-timing-function:var(--ease-out-expo)]",
              open ? "translate-x-0" : "translate-x-[calc(100%+2rem)]",
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="flex flex-col gap-2">
                <span className="eyebrow">супер ассистент</span>
                <span className="text-caption text-muted">
                  5 секунд и готово
                </span>
              </div>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:text-cream"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <span className="text-caption text-muted">материал</span>
              <p className="mt-1 text-body-sm">{cm.name}</p>

              <div className="mt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-caption text-muted">заготовки · необязательно</span>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-caption text-muted transition-colors duration-300 hover:text-cream"
                  >
                    <Paperclip className="h-3.5 w-3.5" strokeWidth={1.5} />
                    прикрепить файл
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>

                {files.length > 0 && (
                  <ul className="mt-3 flex flex-col">
                    {files.map((file, i) => (
                      <li
                        key={`${file.name}-${i}`}
                        className="flex items-center gap-3 border-b border-line py-2 last:border-b-0"
                      >
                        <Paperclip className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
                        <span className="min-w-0 flex-1 truncate text-body-sm">{file.name}</span>
                        <span className="shrink-0 text-caption text-muted/70">
                          {file.text.length} симв.
                        </span>
                        <button
                          type="button"
                          aria-label={`Убрать ${file.name}`}
                          onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="shrink-0 text-muted transition-colors duration-300 hover:text-pink"
                        >
                          <X className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <textarea
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  rows={3}
                  placeholder="…или вставьте содержимое файла текстом"
                  className={cx(FIELD, "mt-3")}
                />
              </div>

              <div className={cx("mt-6 border-t border-line pt-6", !canSolve && "hidden")}>
                {busy && !state.answer && (
                  <div className="flex items-center gap-3 text-body-sm text-muted">
                    <Loader2 className="spin h-4 w-4" strokeWidth={1.5} />
                    супер скорость
                  </div>
                )}

                {state.status === "error" && (
                  <p className="flex items-start gap-2 text-body-sm text-pink">
                    {state.error}
                  </p>
                )}

                {(state.ms != null || state.firstMs != null) && (
                  <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption">
                    {state.ms != null && (
                      <span className="inline-flex items-center gap-1.5 text-green">
                        <Timer className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ответ за {formatMs(state.ms)}
                      </span>
                    )}
                    {state.firstMs != null && (
                      <span className="text-muted">
                        первый фрагмент {formatMs(state.firstMs)}
                      </span>
                    )}
                  </div>
                )}

                {state.answer && <AnswerView text={state.answer} />}

                {busy && state.answer && (
                  <span className="mt-3 inline-block h-4 w-1 animate-pulse bg-lilac align-middle" />
                )}

                {state.status === "idle" && (
                  <p className="text-body-sm text-muted">
                    Нажмите «супер кнопку», чтобы получить решение.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-line px-6 py-4">
              {canSolve && (
                <PillButton primary onClick={run} disabled={busy}>
                  <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                  {busy ? "решаю…" : state.answer ? "решить ещё раз" : "решить"}
                </PillButton>
              )}

              <span className="text-caption text-muted">
                :)
              </span>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </>
  );
}
