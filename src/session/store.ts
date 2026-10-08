import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MoodleError, requestToken } from "@/api/transport";
import { getSiteInfo } from "@/api/moodle";

const STORAGE_KEY = "mmcs.session";
const REMEMBER_KEY = "mmcs.remember";

function readRemember(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

function writeRemember(value: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, value ? "1" : "0");
  } catch {
    /* приватный режим — игнорируем */
  }
}

/**
 * Сессия живёт в localStorage, если включено «запомнить меня» (переживает
 * перезапуск браузера), иначе — в sessionStorage (пропадает при закрытии
 * вкладки). Пароль не сохраняется никогда, только токен.
 */
const hybridStorage: Storage = {
  get length() {
    return 0;
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  },
  key() {
    return null;
  },
  getItem(name) {
    return localStorage.getItem(name) ?? sessionStorage.getItem(name);
  },
  removeItem(name) {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
  setItem(name, value) {
    try {
      if (readRemember()) {
        localStorage.setItem(name, value);
        sessionStorage.removeItem(name);
      } else {
        sessionStorage.setItem(name, value);
        localStorage.removeItem(name);
      }
    } catch {
      /* игнорируем ошибки квоты/приватного режима */
    }
  },
};

export interface Session {
  token: string | null;
  userid: number | null;
  username: string | null;
  fullname: string | null;
  sitename: string | null;
  remember: boolean;
  status: "idle" | "loading" | "error";
  error: string | null;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  useExistingToken: (token: string, remember: boolean) => Promise<void>;
  setRemember: (value: boolean) => void;
  logout: () => void;
}

export const useSession = create<Session>()(
  persist(
    (set, get) => ({
      token: null,
      userid: null,
      username: null,
      fullname: null,
      sitename: null,
      remember: readRemember(),
      status: "idle",
      error: null,

      login: async (username, password, remember) => {
        writeRemember(remember);
        set({ status: "loading", error: null, remember });
        try {
          const token = await requestToken(username.trim(), password);
          const info = await getSiteInfo(token);
          set({
            token,
            userid: info.userid,
            username: info.username,
            fullname: info.fullname,
            sitename: info.sitename,
            status: "idle",
            error: null,
          });
        } catch (err) {
          const message =
            err instanceof MoodleError
              ? err.message
              : "Не удалось войти. Попробуйте ещё раз.";
          set({ status: "error", error: message });
          throw err;
        }
      },

      useExistingToken: async (token, remember) => {
        writeRemember(remember);
        set({ status: "loading", error: null, remember });
        try {
          const info = await getSiteInfo(token.trim());
          set({
            token: token.trim(),
            userid: info.userid,
            username: info.username,
            fullname: info.fullname,
            sitename: info.sitename,
            status: "idle",
            error: null,
          });
        } catch (err) {
          const message =
            err instanceof MoodleError ? err.message : "Токен недействителен.";
          set({ status: "error", error: message });
          throw err;
        }
      },

      setRemember: (value) => {
        writeRemember(value);
        // повторная запись сессии с новым правилом хранилища
        set({ remember: value });
      },

      logout: () =>
        set({
          token: null,
          userid: null,
          username: null,
          fullname: null,
          sitename: null,
          status: "idle",
          error: null,
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => hybridStorage),
      partialize: (s) => ({
        token: s.token,
        userid: s.userid,
        username: s.username,
        fullname: s.fullname,
        sitename: s.sitename,
      }),
    },
  ),
);

export const isAuthed = (s: Session) => Boolean(s.token && s.userid);
