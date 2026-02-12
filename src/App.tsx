import { Routes, Route, Navigate } from "react-router-dom";
import { TopNav } from "./components/TopNav";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

// src/App.tsx
function AppLayout({ children }: { children: React.ReactNode }) {
return (
  <div className="min-h-dvh flex flex-col bg-bg text-fg">
    <TopNav />
    <main className="flex-1">{children}</main>
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
