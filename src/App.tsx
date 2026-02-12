import { Routes, Route, Navigate } from "react-router-dom";
import { TopNav } from "./components/TopNav";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className="min-h-screen bg-noise">
      <TopNav />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppLayout>
            <LoginPage />
          </AppLayout>
        }
      />

      <Route
        path="/player"
        element={
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
