import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ClipboardCopy, KeyRound, X } from "lucide-react";
import { buildOpencodeConfig, SUPER2_PASSWORD, SUPER2_READY } from "@/lib/opencodeConfig";
import { copyText } from "@/lib/clipboard";
import { cx } from "@/lib/cx";
import { PillButton } from "@/ui/primitives";

const FIELD =
  "w-full resize-y rounded-card border border-line bg-transparent px-3 py-2 text-body-sm outline-none transition-colors duration-300 placeholder:text-muted/50 focus:border-cream";

type CopyState = "idle" | "done" | "fail";

/**
 * «Супер кнопка 2» — конфиг opencode по паролю.
 *
 * Пароль лежит в env (`VITE_SUPER2_PASSWORD`); без него кнопки нет. После
 * верного пароля конфиг (`lib/opencodeConfig.ts`) сразу уходит в буфер, а текст
 * остаётся в поле — если буфер недоступен, копируется вручную.
 */
export function SuperConfig() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [config, setConfig] = useState("");
  const [copy, setCopy] = useState<CopyState>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setPassword("");
    setError("");
    setConfig("");
    setCopy("idle");
  };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (copy !== "done" && copy !== "fail") return;
    const timer = setTimeout(() => setCopy("idle"), 2500);
    return () => clearTimeout(timer);
  }, [copy]);

  if (!SUPER2_READY) return null;

  const unlock = () => {
    if (password !== SUPER2_PASSWORD) {
      setError("неверный пароль");
      return;
    }
    const text = buildOpencodeConfig();
    setConfig(text);
    setError("");
    // Ни одного await до copyText: иначе Safari отклонит запись.
    copyText(text)
      .then(() => setCopy("done"))
      .catch(() => setCopy("fail"));
  };

  return (
    <>
      <PillButton onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4 text-blue" strokeWidth={1.5} />
        супер кнопка 2
      </PillButton>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Конфиг opencode"
            onClick={close}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-canvas/80 p-4 backdrop-blur-sm sm:items-center"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85dvh] w-full max-w-[560px] flex-col rounded-card border border-line bg-panel"
            >
              <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div className="flex flex-col gap-2">
                  <span className="eyebrow">супер кнопка 2</span>
                  <span className="text-caption text-muted">
                    конфиг opencode · coarena, moonmath и orcarouter deepseek
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Закрыть"
                  onClick={close}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:text-cream"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
                {config ? (
                  <textarea
                    readOnly
                    value={config}
                    onFocus={(e) => e.target.select()}
                    className={cx(FIELD, "min-h-60 flex-1 font-mono text-caption")}
                  />
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      unlock();
                    }}
                    className="flex flex-col gap-3"
                  >
                    <span className="text-caption text-muted">пароль</span>
                    <input
                      ref={inputRef}
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="введите пароль"
                      aria-label="Пароль"
                      className={FIELD}
                    />
                    {error && <p className="text-caption text-pink">{error}</p>}
                  </form>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-line px-5 py-4">
                {config ? (
                  <>
                    <PillButton
                      onClick={() => {
                        copyText(config)
                          .then(() => setCopy("done"))
                          .catch(() => setCopy("fail"));
                      }}
                    >
                      {copy === "done" ? (
                        <Check className="h-4 w-4 text-green" strokeWidth={1.5} />
                      ) : (
                        <ClipboardCopy className="h-4 w-4" strokeWidth={1.5} />
                      )}
                      {copy === "done" ? "конфиг скопирован" : "скопировать ещё раз"}
                    </PillButton>
                    <span className="text-caption text-muted">
                      {copy === "fail"
                        ? "буфер недоступен — выделите текст и скопируйте вручную"
                        : `${config.length} симв.`}
                    </span>
                  </>
                ) : (
                  <>
                    <PillButton primary onClick={unlock}>
                      <KeyRound className="h-4 w-4" strokeWidth={1.5} />
                      открыть и скопировать
                    </PillButton>
                    <span className="text-caption text-muted">пароль из env</span>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
