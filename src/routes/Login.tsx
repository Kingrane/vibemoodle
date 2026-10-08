import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { KeyRound, Lock, Check, ShieldCheck } from "lucide-react";
import { MOODLE_ORIGIN, TOKEN_ENDPOINT } from "@/api/transport";
import { useSession } from "@/session/useSession";
import { cx } from "@/lib/cx";
import { Eyebrow, PillButton, Reveal } from "@/ui/primitives";
import { Logo } from "@/ui/Logo";
import { ThemeToggle } from "@/ui/ThemeToggle";

type Mode = "password" | "token";

const FIELD =
  "w-full border-b border-line bg-transparent py-3 text-body outline-none transition-colors duration-300 placeholder:text-muted/60 focus:border-cream";

export function LoginPage() {
  const login = useSession((s) => s.login);
  const useExistingToken = useSession((s) => s.useExistingToken);
  const status = useSession((s) => s.status);
  const error = useSession((s) => s.error);
  const token = useSession((s) => s.token);

  const [mode, setMode] = useState<Mode>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rawToken, setRawToken] = useState("");
  const [remember, setRemember] = useState(() => useSession.getState().remember);

  if (token) return <Navigate to="/" replace />;

  const loading = status === "loading";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (mode === "password") await login(username, password, remember);
      else await useExistingToken(rawToken, remember);
    } catch {
      /* сообщение уже в store */
    }
  };

  return (
    <div className="min-h-dvh">
      <div className="wash" aria-hidden />

      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-8">
          <Logo to="/login" />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 py-16 md:px-8 md:py-24">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow>учебные курсы мехмата юфу</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-8 text-[64px] font-semibold leading-[0.92] tracking-[-0.03em] md:text-heading-lg">
                Курсы мехмата
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-8 max-w-xl text-body-lg text-muted">
                Сегодня я запланировал ничего не делать и все успел
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-caption text-muted">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue" /> дисциплины
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange" /> дедлайны
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-lilac" /> материалы
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green" /> оценки
                </span>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={120}>
              <div className="card p-6 md:p-8 lg:sticky lg:top-24">
                <div className="flex gap-2">
                  {(
                    [
                      ["password", "по паролю"],
                      ["token", "по токену"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value)}
                      className={cx(
                        "rounded-pill border px-4 py-2 text-caption transition-colors duration-300",
                        mode === value
                          ? "border-cream text-cream"
                          : "border-line text-muted hover:text-cream",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <form onSubmit={submit} className="mt-8 flex flex-col gap-6">
                  {mode === "password" ? (
                    <>
                      <label className="flex flex-col gap-1">
                        <span className="text-caption text-muted">логин EDU-MMCS</span>
                        <input
                          className={FIELD}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="например, ivanov"
                          autoComplete="username"
                          autoFocus
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-caption text-muted">пароль</span>
                        <input
                          className={FIELD}
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          required
                        />
                      </label>
                    </>
                  ) : (
                    <label className="flex flex-col gap-2">
                      <span className="text-caption text-muted">
                        токен веб-сервиса
                      </span>
                      <textarea
                        className={cx(FIELD, "min-h-24 resize-y font-mono text-body-sm")}
                        value={rawToken}
                        onChange={(e) => setRawToken(e.target.value)}
                        placeholder="70c3517cb0d13937fb31f1f4548f263e"
                        spellCheck={false}
                        required
                      />
                    </label>
                  )}

                  {error && (
                    <p className="text-body-sm text-pink" role="alert">
                      {error}
                    </p>
                  )}

                  <label className="flex cursor-pointer select-none items-center gap-3">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border border-line transition-colors duration-300 peer-checked:border-green peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-lime">
                      <Check
                        className={cx(
                          "h-3.5 w-3.5 text-green transition-opacity duration-200",
                          remember ? "opacity-100" : "opacity-0",
                        )}
                        strokeWidth={3}
                      />
                    </span>
                    <span className="text-body-sm text-muted">
                      запомнить меня
                      <span className="text-muted/70">
                        {" "}
                        — в следующий раз вход не потребуется
                      </span>
                    </span>
                  </label>

                  <PillButton type="submit" primary disabled={loading} className="w-full">
                    {loading ? "проверяем…" : "войти"}
                    {!loading && <KeyRound className="h-4 w-4" strokeWidth={1.5} />}
                  </PillButton>
                </form>

                <div className="mt-8 border-t border-line pt-6">
                  <p className="flex items-start gap-2 text-caption text-muted">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={1.5} />
                    <span>
                      {mode === "password" ? (
                        <>
                          Логин и пароль отправляются напрямую на{" "}
                          <span className="text-cream">{MOODLE_ORIGIN}</span> и нигде
                          не сохраняются. В браузере остаётся только токен сессии.
                        </>
                      ) : (
                        <>
                          Пароль вообще не нужен — приложение работает только с
                          токеном. Получить его можно запросом к{" "}
                          <span className="text-cream">/login/token.php</span>.
                        </>
                      )}
                    </span>
                  </p>

                  {mode === "token" && (
                    <pre className="mt-4 overflow-x-auto rounded-card border border-line bg-panel p-4 text-caption leading-relaxed text-muted">
                      <code>{`Invoke-RestMethod -Method Post \`
  -Uri "${TOKEN_ENDPOINT}" \`
  -Body @{
    username = 'ВАШ_ЛОГИН'
    password = 'ВАШ_ПАРОЛЬ'
    service  = 'moodle_mobile_app'
  }`}</code>
                    </pre>
                  )}

                  <p className="mt-4 flex items-center gap-2 text-caption text-muted">
                    <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                    соединение https, данные не проходят через чужие серверы
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1280px] items-center justify-center px-5 py-6 text-caption text-muted md:px-8">
          <span>
            {"{ "}
            <span className="text-green">romka навайбкодил</span>
            {" }"}
          </span>
        </div>
      </footer>
    </div>
  );
}
