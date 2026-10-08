# AGENTS.md — мехмат.edu

Клиент учебных курсов мехмата ЮФУ (Moodle `edu.mmcs.sfedu.ru`). Чтение:
дедлайны, материалы, оценки, прогресс — плюс сдача своих заданий файлами и
онлайн-текстом по явному действию пользователя. Интерфейс на русском, дизайн — по
`design.md` (стиль Gsap, двойная тема).

Этот файл — рабочая инструкция для агента. Пользовательские доки — в `README.md`,
дизайн-референс — в `design.md`.

---

## 1. Жёсткие правила (не нарушать)

1. **Чтение + сдача своих заданий — и ничего больше.** По умолчанию всё чтение.
   Единственная запись на сервер — отправка ответа на задание (файлы/онлайн-текст)
   по явному действию пользователя: `src/api/submission.ts` +
   `src/ui/SubmissionForm.tsx`. Тесты не проходить, чужие данные не трогать,
   ничего не отправлять автоматически и без подтверждения.
2. **Не лезть в преподавательские функции.** Только аккаунт студента.
3. **Нет своего бэкенда.** Браузер обращается к Moodle напрямую. Если понадобится
   прокси — меняются только адреса в `src/api/transport.ts`.
4. **Пароль не сохраняется никогда.** В хранилище лежит только токен веб-сервиса.
5. **Дизайн-система — источник правды.** Не вводить новые цвета, тени, радиусы;
   использовать переменные и классы из `src/index.css`.
6. **Весь UI — на русском** (нижний регистр в подписях, как в макете).

## 2. Команды

```powershell
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # tsc -b --noEmit — обязателен перед сдачей
npm run build        # tsc -b && vite build
npm run preview      # прод-сборка
```

Проверка перед завершением задачи: `npm run typecheck` и `npm run build`
должны проходить без ошибок.

## 3. Стек

React 19 + Vite 8 + TypeScript + Tailwind 4 (`@tailwindcss/vite`, без конфига —
тема в CSS через `@theme`), TanStack Query 5, React Router 7, Zustand 5,
lucide-react. Алиас `@/` → `src/`.

## 4. Карта кода

```
src/
  api/
    transport.ts   HTTP к Moodle: обмен пароля на токен, callFunction, fileUrl,
                   MoodleError, encodeParams (плоские ключи courseids[0])
    moodle.ts      все вызовы ws-функций, разбор ответов
    submission.ts  ЕДИНСТВЕННЫЙ пишущий модуль: загрузка файлов в черновик
                   (webservice/upload.php), mod_assign_save_submission,
                   submit_for_grading, remove_submission
    types.ts       типы ответов Moodle
    hooks.ts       React Query хуки (ключи: ["courses"], ["contents", id], …)
  session/
    store.ts       zustand + persist; токен/профиль; «запомнить меня»
    useSession.ts  селекторы сессии
  lib/
    moodleHtml.ts  безопасный рендер HTML из Moodle (санитайз + @@PLUGINFILE@@)
    format.ts      даты, размеры, русские склонения, подписи типов модулей
    palette.ts     таксономия 5 акцентов, accentFor(seed)
    deadlines.ts   события Moodle → объекты дедлайнов
    useReveal.ts   появление блоков при скролле (scroll + rAF)
    useTheme.ts    тёмная/светлая тема (ключ mmcs.theme)
    cx.ts, useDebounced.ts
  ui/              AppShell, primitives, CourseCard, FileList, FilePreview,
                   SubmissionForm (форма сдачи), DeadlineRow, SubmissionBadge,
                   Logo, UserMenu, ThemeToggle
  routes/          Login, Dashboard, Courses, CoursePage, ModulePage, Grades,
                   Calendar, Search
  App.tsx          роуты
  index.css        дизайн-система (переменные тем + классы утилит)
```

Роуты: `/login`, `/` (дешборд), `/courses`, `/courses/:courseid`,
`/module/:cmid`, `/grades`, `/calendar`, `/search`.

## 5. Слой данных

**Точки входа (обе с `Access-Control-Allow-Origin: *`):**

- `POST /login/token.php` — логин+пароль → токен, сервис `moodle_mobile_app`.
- `POST /webservice/rest/server.php` — вызовы ws-функций по токену.
- Файлы: `webservice/pluginfile.php` + `&token=` (см. `fileUrl`).
- Загрузка файла (запись): `POST webservice/upload.php?token=…&filepath=%2F&itemid=…`
  (multipart, поле `file`). Возвращает `itemid` области черновика.

**Используемые ws-функции:** `core_webservice_get_site_info`,
`core_enrol_get_users_courses`, `core_course_get_contents`,
`core_course_get_course_module`, `core_course_search_courses`,
`gradereport_user_get_grade_items`, `gradereport_overview_get_course_grades`,
`core_calendar_get_action_events_by_timesort`,
`core_calendar_get_action_events_by_course`,
`core_calendar_get_calendar_monthly_view`, `mod_assign_get_submission_status`,
`mod_page_get_pages_by_courses`, `mod_assign_get_assignments`,
`mod_quiz_get_quizzes_by_courses`, `mod_quiz_get_user_best_grade`,
`mod_url_get_urls_by_courses`.

**Запись (только сдача задания, `submission.ts`):** `mod_assign_save_submission`
(`plugindata[files_filemanager]=itemid` и/или
`plugindata[onlinetext_editor][text|format|itemid]`),
`mod_assign_submit_for_grading` (только если `submissiondrafts=1` или
`requiresubmissionstatement=1`), `mod_assign_remove_submission`.

**Важные детали:**

- Параметры уходят плоскими ключами (`courseids[0]`, `events[eventtype]`) —
  за это отвечает `encodeParams`/`flatten`.
- `core_calendar_get_action_events_by_timesort`: `limitnum` **максимум 50**,
  пагинация по `aftereventid` (см. `getActionEvents` в `moodle.ts`).
- Типы модулей в курсах пользователя: `page`, `assign`, `resource`, `label`,
  `quiz`, `url`, `folder`. `book`/`forum` могут отсутствовать.
- **Сдавать можно ⟺ `lastattempt.canedit`.** Флаг `cansubmit` в Moodle 5.2
  приходит **всегда false** — на него нельзя полагаться (проверено на
  edu.mmcs.sfedu.ru). Гейт формы: `submissionsenabled && !locked && canedit`.
  Настройки задания берутся из `configs` (`assignsubmission`: `file`,
  `onlinetext`) — `maxfilesubmissions`, `maxsubmissionsizebytes`,
  `filetypeslist`, `wordlimit`.
- Оценка и отзыв — в `mod_assign_get_submission_status.feedback`:
  `gradefordisplay` (готовая строка «2,75 / 3,00»), `gradeddate`,
  `plugins` (тип `comments` → `editorfields[0].text` — HTML-отзыв).

**Просмотр материалов (`ModulePage.tsx`).** `core_course_get_course_module`
даёт `cm` (modname/instance/course), затем `ModuleView` тянет
`core_course_get_contents` по `cm.course` и находит модуль по `id === cmid`.
Отдельные «Body»-компоненты под каждый тип вызывают свой хук **условно по
modname** (хуки не вызываются для чужих типов):

| modname | хук | что показываем |
| --- | --- | --- |
| `page` | `usePages` | HTML страницы |
| `resource` | — | `mod.contents`: PDF/видео во фрейме + список файлов |
| `folder` | — | список файлов из `mod.contents` |
| `assign` | `useAssignments` + `useSubmissionStatus` | даты, баллы, вложения; `SubmissionForm` — сдача файлов/онлайн-текста, когда `canedit` |
| `quiz` | `useQuizzes` + `useQuizBestGrade` | даты, попытки, лучший результат, CTA |
| `url` | `useUrls` | внешняя ссылка |
| `label` | — | рендерится **инлайн** в списке курса, не как строка-ссылка |
| иное | — | `description` + кнопка «открыть в Moodle» |

Ссылки в строках курса (`CoursePage`) всегда ведут на `/module/:cmid` — материал
открывается внутри приложения, а не улетает в Moodle.

**HTML из Moodle** рендерится только через `buildMoodleHtml()`:
подставляет реальные URL вместо `@@PLUGINFILE@@/…`, вырезает
`script/style/iframe/object/embed/form` и `on*`/`javascript:`-атрибуты, ставит
ссылкам `target="_blank"`. Нельзя рендерить сырой HTML без этой функции.
Стили для вставленного HTML — класс `.moodle-content` в `index.css`.

## 6. Сессия и «запомнить меня»

- Ключ сессии — `mmcs.session` (zustand persist), ключ правила — `mmcs.remember`.
- «Запомнить меня» включено (по умолчанию): данные в `localStorage` —
  вход переживает перезапуск браузера. Выключено: только `sessionStorage` —
  сессия умирает с вкладкой.
- Роутингом хранилища занимается `hybridStorage` в `session/store.ts`; при
  смене флага `setRemember()` переписывает сессию в нужное хранилище.
- Пароль не хранится нигде; восстанавливается сессия из токена —
  при старте `Protected` пускает дальше, хуки тянут данные по токену.

## 7. Дизайн-система (кратко из design.md)

- Тёмная тема: canvas `#0e100f`, кремовый `#fffce1`, панель `#191919`,
  хайрлайны `#42433d`. Светлая: «тёплая бумага» `#f4f2eb`, чернила `#080807`,
  хайрлайн `#beb9aa`. Переключатель — `data-theme` на `<html>`.
- **5 акцентов — таксономия, не декор:** green, orange, pink, lilac, blue.
  Выбор цвета — `accentFor(seed)`; не добавлять шестой цвет.
- Типографика — герой: крупные размеры, отрицательный трекинг, `line-height`
  ~1.0. Шкала и токены — в `src/index.css` (`.text-caption`, `.text-body`,
  `.text-heading` и т.д.).
- Кнопки — ghost-pill (100px радиус, hairline, без заливки); primary — с
  зелёным градиентным штрихом.
- Секции — `{ eyebrow }` в фигурных скобках, разделители — хайрлайны 1px.
- **Без теней.** Глубина — только градиентные заливки и смена поверхности.
- Не использовать чистый белый/чёрный для фона и текста.
- В футере (и на странице входа) есть подпись-вотермарка
  `{ romka навайбкодил }` — не удалять; менять только по просьбе пользователя.

## 8. Соглашения

- Названия и подписи — по-русски, нижний регистр; код/идентификаторы — английские.
- Типы ответов Moodle — в `api/types.ts`, никакого `any` в публичных сигнатурах.
- Новые запросы — только через `callFunction` и хуки; ключи query: сущность +
  `token` + параметры.
- Компоненты — в `ui/`, страницы — в `routes/`; переиспользуемое выносить
  (пример: `FileList` общий для курса и просмотрщика).
- Изменения делать точечно, стиль соседнего кода сохранять.

## 9. Проверка

1. `npm run typecheck` — без ошибок.
2. `npm run build` — без ошибок.
3. Вручную/Playwright: вход, открытие курса, открытие материала разных типов
   (`page`, `assign`, `quiz`, `resource`), переключение темы, перезагрузка
   страницы (сессия должна сохраниться при «запомнить меня»).
4. Форма сдачи: на открытом задании (`canedit=true`) видна зона файлов или
   текстовый редактор, на закрытом — «приём ответов закрыт». **Реальную
   отправку во время разработки не делать** — только рендер и разбор флагов.

Тестовый аккаунт мехмата для проверки — в скилле `edu-mmcs` (не хранить
пароль в репозитории).

## 10. Известные ограничения

- Личные сообщения на сайте отключены админом (`errorcode: disabled`).
- `mod_assign_get_submission_status.cansubmit` всегда `false` в Moodle 5.2 —
  использовать `canedit`.
- Реальная отправка сдачи не проверялась вживую (не портить учебный аккаунт):
  загрузка файла и структура вызова подтверждены, но e2e-сдача — на пользователе.
- Приложение — не официальный сервис ЮФУ.
- Не git-репозиторий; деплой — Vercel (`vercel.json`, SPA-роутинг), переменных
  окружения не требует.
