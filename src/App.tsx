import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import CreateEditTestPage from "@/pages/CreateEditTestPage";
import AddQuestionsPage from "@/pages/AddQuestionsPage";
import PreviewPublishPage from "@/pages/PreviewPublishPage";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tests/new" element={<CreateEditTestPage />} />
              <Route path="/tests/:id/edit" element={<CreateEditTestPage />} />
              <Route
                path="/tests/:id/questions"
                element={<AddQuestionsPage />}
              />
              <Route
                path="/tests/:id/preview"
                element={<PreviewPublishPage />}
              />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
