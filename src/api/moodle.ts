import { callFunction, fileUrl } from "./transport";
import type {
  ActionEvent,
  CatalogCourse,
  CourseGradeOverview,
  GradeItem,
  MoodleAssignment,
  MoodleCourse,
  MoodleEvent,
  MoodleModule,
  MoodlePage,
  MoodleQuiz,
  MoodleSection,
  MoodleUrlResource,
  QuizAttempt,
  QuizBestGrade,
  QuizReview,
  SearchCourseResult,
  SiteInfo,
  SubmissionState,
  SubmissionStatus,
  UserGrade,
} from "./types";

export const getSiteInfo = (token: string) =>
  callFunction<SiteInfo>(token, "core_webservice_get_site_info");

export const getUserCourses = (token: string, userid: number) =>
  callFunction<MoodleCourse[]>(token, "core_enrol_get_users_courses", { userid });

export const getCourseContents = (token: string, courseid: number) =>
  callFunction<MoodleSection[]>(token, "core_course_get_contents", { courseid });

export const getCourseModule = (token: string, cmid: number) =>
  callFunction<{ cm: MoodleModule; warnings?: unknown[] }>(
    token,
    "core_course_get_course_module",
    { cmid },
  );

export const getPages = async (token: string, courseid: number) => {
  const data = await callFunction<{ pages: MoodlePage[] }>(
    token,
    "mod_page_get_pages_by_courses",
    { courseids: [courseid] },
  );
  return data.pages ?? [];
};

export const getAssignments = async (token: string, courseid: number) => {
  const data = await callFunction<{
    courses: { assignments: MoodleAssignment[] }[];
  }>(token, "mod_assign_get_assignments", { courseids: [courseid] });
  return data.courses?.[0]?.assignments ?? [];
};

export const getQuizzes = async (token: string, courseid: number) => {
  const data = await callFunction<{ quizzes: MoodleQuiz[] }>(
    token,
    "mod_quiz_get_quizzes_by_courses",
    { courseids: [courseid] },
  );
  return data.quizzes ?? [];
};

export const getUrls = async (token: string, courseid: number) => {
  const data = await callFunction<{ urls: MoodleUrlResource[] }>(
    token,
    "mod_url_get_urls_by_courses",
    { courseids: [courseid] },
  );
  return data.urls ?? [];
};

export const getQuizBestGrade = (token: string, quizid: number) =>
  callFunction<QuizBestGrade>(token, "mod_quiz_get_user_best_grade", { quizid });

export const getQuizAttempts = async (token: string, quizid: number) => {
  const data = await callFunction<{ attempts: QuizAttempt[] }>(
    token,
    "mod_quiz_get_user_attempts",
    { quizid, status: "all" },
  );
  return data.attempts ?? [];
};

/** Полный разбор попытки: вопросы, ответы, отзыв, вложения. */
export const getQuizAttemptReview = (token: string, attemptid: number) =>
  callFunction<QuizReview>(token, "mod_quiz_get_attempt_review", { attemptid });


/** Курсы одной категории (для каталога). Отдаёт в том числе `enrollmentmethods`. */
export const getCoursesByCategory = async (token: string, categoryid: number) => {
  const data = await callFunction<{ courses: CatalogCourse[] }>(
    token,
    "core_course_get_courses_by_field",
    { field: "category", value: String(categoryid) },
  );
  return data.courses ?? [];
};

export const searchCourses = (token: string, query: string) =>
  callFunction<{ courses: SearchCourseResult[]; total: number }>(
    token,
    "core_course_search_courses",
    { criterianame: "search", criteriavalue: query },
  );

export async function getCourseGradeItems(
  token: string,
  courseid: number,
  userid: number,
): Promise<GradeItem[]> {
  const data = await callFunction<{ usergrades: UserGrade[] }>(
    token,
    "gradereport_user_get_grade_items",
    { courseid, userid },
  );
  return data.usergrades?.[0]?.gradeitems ?? [];
}

export const getOverviewGrades = async (token: string, userid: number) => {
  const data = await callFunction<{ grades: CourseGradeOverview[] }>(
    token,
    "gradereport_overview_get_course_grades",
    { userid },
  );
  return data.grades ?? [];
};

/** Moodle ограничивает limitnum значением 50 — догружаем страницами. */
export async function getActionEvents(
  token: string,
  options: { limit?: number; from?: number; to?: number } = {},
) {
  const now = Math.floor(Date.now() / 1000);
  const from = options.from ?? now - 60 * 60 * 24 * 14;
  const cap = options.limit ?? 50;
  const maxPages = Math.max(1, Math.min(10, Math.ceil(cap / 50)));

  const collected: ActionEvent[] = [];
  let aftereventid = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await callFunction<{ events: ActionEvent[] }>(
      token,
      "core_calendar_get_action_events_by_timesort",
      {
        timesortfrom: from,
        ...(options.to ? { timesortto: options.to } : {}),
        aftereventid,
        limitnum: 50,
      },
    );
    const events = data.events ?? [];
    collected.push(...events);
    if (events.length < 50) break;
    aftereventid = events[events.length - 1].id;
  }

  return collected.slice(0, cap);
}

export async function getCourseEvents(token: string, courseid: number) {
  const data = await callFunction<{ events: MoodleEvent[] }>(
    token,
    "core_calendar_get_action_events_by_course",
    { courseid, limitnum: 40, timesortfrom: 0 },
  );
  return data.events ?? [];
}

export async function getCourseCalendar(
  token: string,
  courseid: number,
): Promise<MoodleEvent[]> {
  const now = new Date();
  const data = await callFunction<{ events: MoodleEvent[] }>(
    token,
    "core_calendar_get_calendar_monthly_view",
    {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      courseid,
      includenavigation: false,
    },
  );
  return data.events ?? [];
}

const STATE_MAP: Record<string, SubmissionState> = {
  new: "new",
  draft: "draft",
  submitted: "submitted",
  reopened: "reopened",
};

export async function getSubmissionState(
  token: string,
  assignid: number,
): Promise<SubmissionState> {
  const data = await callFunction<SubmissionStatus>(
    token,
    "mod_assign_get_submission_status",
    { assignid },
  );
  if (data.graded || data.lastattempt?.graded) return "graded";
  const status = data.lastattempt?.submission?.status;
  if (status && STATE_MAP[status]) return STATE_MAP[status];
  return "unknown";
}

export { fileUrl };
