/** Типы ответов Moodle Web Services (только используемые поля). */

export interface SiteInfo {
  sitename: string;
  siteurl: string;
  username: string;
  fullname: string;
  userid: number;
  release: string;
  userpictureurl?: string;
  lang?: string;
}

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  displayname?: string;
  summary?: string;
  visible: number;
  progress?: number | null;
  startdate?: number;
  enddate?: number;
  enrolledusercount?: number;
  format?: string;
  courseimage?: string;
}

export interface MoodleFileContent {
  type: string;
  filename: string;
  filepath: string;
  filesize: number;
  fileurl: string;
  mimetype?: string;
  isexternalfile?: boolean;
  timemodified?: number;
}

export interface MoodleModuleDate {
  label: string;
  timestamp: number;
  dataid?: string;
}

export interface MoodleCompletion {
  state: number; // 0 incomplete, 1 complete, 2 pass, 3 fail
  timecompleted?: number;
  hascompletion?: boolean;
  isautomatic?: boolean;
  istrackeduser?: boolean;
  uservisible?: boolean;
}

export interface MoodleModule {
  id: number; // cmid
  url?: string;
  name: string;
  instance?: number;
  modname: string;
  modplural?: string;
  modicon?: string;
  course?: number;
  module?: number;
  sectionnum?: number;
  visible: number;
  uservisible: boolean;
  visibleoncoursepage?: number;
  description?: string;
  afterlink?: string | null;
  availability?: string | null;
  indent?: number;
  completion?: number;
  completiondata?: MoodleCompletion;
  contents?: MoodleFileContent[];
  dates?: MoodleModuleDate[];
}

export interface MoodleSection {
  id: number;
  name: string;
  summary?: string;
  summaryformat?: number;
  section: number;
  hiddenbynumsections?: boolean;
  visible?: number;
  uservisible?: boolean;
  modules: MoodleModule[];
}

export interface GradeItem {
  id: number;
  itemname: string | null;
  itemtype: string;
  itemmodule: string | null;
  iteminstance?: number;
  itemnumber?: number | null;
  categoryid?: number | null;
  cmid?: number | null;
  weightraw?: number;
  weightformatted?: string;
  graderaw: number | null;
  gradeformatted: string;
  grademin: number | null;
  grademax: number | null;
  percentageformatted?: string;
  gradedategraded?: number;
  gradedatesubmitted?: number;
  gradehiddenbydate?: boolean;
  locked?: boolean;
}

export interface UserGrade {
  courseid: number;
  courseidnumber?: string;
  userid: number;
  userfullname?: string;
  maxdepth?: number;
  gradeitems: GradeItem[];
}

export interface CourseGradeOverview {
  courseid: number;
  courseidnumber?: string;
  grade: string | null;
  rawgrade: number | null;
  rank?: number;
}

export interface MoodleEvent {
  id: number;
  name: string;
  description?: string;
  component?: string;
  modulename?: string;
  instance?: number;
  eventtype?: string;
  timestart?: number;
  timesort: number;
  timeduration?: number;
  courseid?: number;
  groupid?: number;
  location?: string;
  url?: string;
  visible?: number;
  course?: {
    id: number;
    fullname: string;
    shortname: string;
    idnumber?: string;
    visible?: number;
  };
  icon?: { key: string; component: string; alttext: string };
  action?: {
    name: string;
    url: string;
    itemcount?: number;
    actionable?: boolean;
    showitemcount?: boolean;
  };
  overdue?: boolean;
}

export interface ActionEvent {
  id: number;
  name: string;
  description?: string;
  location?: string;
  component?: string;
  modulename?: string;
  instance?: number;
  eventtype?: string;
  timesort: number;
  timeusermidnight?: number;
  courseid?: number;
  url?: string;
  course?: MoodleEvent["course"];
  icon?: MoodleEvent["icon"];
  action?: MoodleEvent["action"];
  overdue?: boolean;
}

/** Настройка плагина сдачи задания (mod_assign_get_assignments → configs). */
export interface AssignConfigItem {
  plugin: string;
  subtype: string; // assignsubmission | assignfeedback
  name: string;
  value: string;
}

export interface SubmissionFileArea {
  area: string;
  files?: MoodleFileContent[];
  maxfiles?: number;
  maxbytes?: number;
}

export interface SubmissionEditorField {
  name: string;
  description?: string;
  text: string;
  format?: number;
}

export interface SubmissionPluginData {
  type: string; // file | onlinetext | comments
  name: string;
  fileareas?: SubmissionFileArea[];
  editorfields?: SubmissionEditorField[];
}

export interface SubmissionAttempt {
  id: number;
  userid: number;
  attemptnumber?: number;
  timecreated?: number;
  timemodified?: number;
  status: string; // new | draft | submitted | reopened
  groupid?: number;
  plugins?: SubmissionPluginData[];
}

export interface FeedbackGrade {
  id?: number;
  assignment?: number;
  grade?: string | number;
  grader?: number;
}

export interface FeedbackPlugin {
  type: string;
  name: string;
  editorfields?: SubmissionEditorField[];
  fileareas?: SubmissionFileArea[];
}

export interface SubmissionFeedback {
  grade?: FeedbackGrade;
  gradefordisplay?: string;
  gradeddate?: number;
  plugins?: FeedbackPlugin[];
}

export interface SubmissionStatus {
  lastattempt?: {
    submission?: SubmissionAttempt;
    teamsubmission?: SubmissionAttempt;
    submissionsenabled?: boolean;
    locked?: boolean;
    graded?: boolean;
    canedit?: boolean;
    caneditowner?: boolean;
    cansubmit?: boolean;
    extensionduedate?: number;
    gradingstatus?: string;
  };
  feedback?: SubmissionFeedback;
  graded?: boolean;
}

export type SubmissionState =
  | "new"
  | "draft"
  | "submitted"
  | "graded"
  | "reopened"
  | "unknown";

export interface SearchCourseResult {
  id: number;
  fullname: string;
  shortname: string;
  summary?: string;
  categoryid?: number;
  enrolledusercount?: number;
  courseimage?: string;
  visible?: number;
}

/** Категория курсов (`core_course_get_categories`). */
export interface CourseCategory {
  id: number;
  name: string;
  parent: number;
  depth: number;
  coursecount: number;
  visible?: number;
  idnumber?: string;
}

/** Курс из каталога (`core_course_get_courses_by_field`). */
export interface CatalogCourse {
  id: number;
  fullname: string;
  displayname?: string;
  shortname: string;
  categoryid: number;
  categoryname?: string;
  summary?: string;
  summaryformat?: number;
  /** Способы записи: `manual`, `self`, `guest`. */
  enrollmentmethods?: string[];
  startdate?: number;
  enddate?: number;
  visible?: number;
}

export interface EnrolWarning {
  item?: string;
  itemid?: number;
  warningcode?: string;
  message?: string;
}

export interface EnrolResult {
  status?: boolean;
  warnings?: EnrolWarning[];
}

export interface MoodlePage {
  id: number;
  coursemodule: number;
  course: number;
  name: string;
  intro?: string;
  introformat?: number;
  content?: string;
  contentformat?: number;
  contentfiles?: MoodleFileContent[];
  introfiles?: MoodleFileContent[];
  timemodified?: number;
}

export interface MoodleUrlResource {
  id: number;
  coursemodule: number;
  course: number;
  name: string;
  intro?: string;
  externalurl: string;
  display?: number;
  displayoptions?: string;
}

export interface MoodleAssignment {
  id: number;
  cmid: number;
  course: number;
  name: string;
  nosubmissions?: number;
  duedate?: number;
  allowsubmissionsfromdate?: number;
  cutoffdate?: number;
  gradingduedate?: number;
  grade?: number;
  intro?: string;
  introformat?: number;
  introfiles?: MoodleFileContent[];
  introattachments?: MoodleFileContent[];
  teamsubmission?: number;
  maxattempts?: number;
  attemptreopenmethod?: string;
  submissionattachments?: number;
  submissiondrafts?: number;
  requiresubmissionstatement?: number;
  preventsubmissionnotingroup?: number;
  configs?: AssignConfigItem[];
}

export interface MoodleQuiz {
  id: number;
  coursemodule: number;
  course: number;
  name: string;
  intro?: string;
  introformat?: number;
  timeopen?: number;
  timeclose?: number;
  timelimit?: number;
  attempts?: number;
  grademethod?: number;
  grade?: number;
  hasquestions?: number;
}

export interface QuizBestGrade {
  hasgrade: boolean;
  grade?: string;
  gradetopass?: number;
}


export interface CalEvent {
  id: number;
  name: string;
  description?: string;
  format?: number;
  courseid?: number;
  categoryid?: number;
  userid?: number;
  modulename?: string;
  instance?: number;
  eventtype?: string;
  timestart?: number;
  timesort?: number;
  timeduration?: number;
  visible?: number;
  url?: string;
  course?: MoodleEvent["course"];
  icon?: MoodleEvent["icon"];
}
