import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useSession } from "@/session/useSession";
import { AppShell } from "@/ui/AppShell";
import { LoginPage } from "@/routes/Login";
import { DashboardPage } from "@/routes/Dashboard";
import { CoursesPage } from "@/routes/Courses";
import { CoursePage } from "@/routes/CoursePage";
import { GradesPage } from "@/routes/Grades";
import { CalendarPage } from "@/routes/Calendar";
import { SearchPage } from "@/routes/Search";
import { ModulePage } from "@/routes/ModulePage";

function Protected({ children }: { children: ReactNode }) {
  const token = useSession((s) => s.token);
  const userid = useSession((s) => s.userid);
  if (!token || !userid) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/courses"
        element={
          <Protected>
            <CoursesPage />
          </Protected>
        }
      />
      <Route
        path="/courses/:courseid"
        element={
          <Protected>
            <CoursePage />
          </Protected>
        }
      />
      <Route
        path="/grades"
        element={
          <Protected>
            <GradesPage />
          </Protected>
        }
      />
      <Route
        path="/calendar"
        element={
          <Protected>
            <CalendarPage />
          </Protected>
        }
      />
      <Route
        path="/module/:cmid"
        element={
          <Protected>
            <ModulePage />
          </Protected>
        }
      />
      <Route
        path="/search"
        element={
          <Protected>
            <SearchPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
