import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/session/useSession";
import * as api from "./moodle";
import * as submission from "./submission";

/** Все запросы привязаны к токену — при выходе кэш недоступен. */

export function useSiteInfo() {
  const { token } = useSession();
  return useQuery({
    queryKey: ["site", token],
    queryFn: () => api.getSiteInfo(token!),
    enabled: !!token,
    staleTime: 1000 * 60 * 30,
  });
}

export function useMyCourses() {
  const { token, userid } = useSession();
  return useQuery({
    queryKey: ["courses", token, userid],
    queryFn: () => api.getUserCourses(token!, userid!),
    enabled: !!token && !!userid,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCourseContents(courseid: number) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["contents", token, courseid],
    queryFn: () => api.getCourseContents(token!, courseid),
    enabled: !!token && Number.isFinite(courseid),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCourseGrades(courseid: number) {
  const { token, userid } = useSession();
  return useQuery({
    queryKey: ["grades", token, courseid, userid],
    queryFn: () => api.getCourseGradeItems(token!, courseid, userid!),
    enabled: !!token && !!userid && Number.isFinite(courseid),
    staleTime: 1000 * 60 * 5,
  });
}

export function useOverviewGrades() {
  const { token, userid } = useSession();
  return useQuery({
    queryKey: ["overview-grades", token, userid],
    queryFn: () => api.getOverviewGrades(token!, userid!),
    enabled: !!token && !!userid,
    staleTime: 1000 * 60 * 5,
  });
}

export function useActionEvents(limit = 30) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["action-events", token, limit],
    queryFn: () => api.getActionEvents(token!, { limit }),
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
  });
}

export function useActionEventsRange(from: number, to: number, limit = 300) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["action-events-range", token, from, to, limit],
    queryFn: () => api.getActionEvents(token!, { from, to, limit }),
    enabled: !!token,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCourseEvents(courseid: number) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["course-events", token, courseid],
    queryFn: () => api.getCourseEvents(token!, courseid),
    enabled: !!token && Number.isFinite(courseid),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSubmissionState(assignid: number | undefined) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["submission", token, assignid],
    queryFn: () => api.getSubmissionState(token!, assignid!),
    enabled: !!token && !!assignid,
    staleTime: 1000 * 60 * 2,
  });
}

/** Полный статус сдачи (для формы отправки). */
export function useSubmissionStatus(assignid: number | undefined) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["submission-status", token, assignid],
    queryFn: () => submission.getSubmissionStatus(token!, assignid!),
    enabled: !!token && !!assignid,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCourseSearch(query: string) {
  const { token } = useSession();
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search", token, trimmed],
    queryFn: () => api.searchCourses(token!, trimmed),
    enabled: !!token && trimmed.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

/* ------------------------- просмотр материалов ------------------------- */

export function useCourseModule(cmid: number) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["module", token, cmid],
    queryFn: () => api.getCourseModule(token!, cmid),
    enabled: !!token && Number.isFinite(cmid),
    staleTime: 1000 * 60 * 10,
  });
}

export function usePages(courseid: number) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["pages", token, courseid],
    queryFn: () => api.getPages(token!, courseid),
    enabled: !!token && Number.isFinite(courseid),
    staleTime: 1000 * 60 * 10,
  });
}

export function useAssignments(courseid: number) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["assignments", token, courseid],
    queryFn: () => api.getAssignments(token!, courseid),
    enabled: !!token && Number.isFinite(courseid),
    staleTime: 1000 * 60 * 10,
  });
}

export function useQuizzes(courseid: number) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["quizzes", token, courseid],
    queryFn: () => api.getQuizzes(token!, courseid),
    enabled: !!token && Number.isFinite(courseid),
    staleTime: 1000 * 60 * 10,
  });
}

export function useUrls(courseid: number) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["urls", token, courseid],
    queryFn: () => api.getUrls(token!, courseid),
    enabled: !!token && Number.isFinite(courseid),
    staleTime: 1000 * 60 * 10,
  });
}

export function useQuizBestGrade(quizid: number | undefined) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["quiz-grade", token, quizid],
    queryFn: () => api.getQuizBestGrade(token!, quizid!),
    enabled: !!token && !!quizid,
    staleTime: 1000 * 60 * 5,
  });
}
