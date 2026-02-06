import { Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { EditorLayout } from './layouts/EditorLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { DocumentPage } from './pages/DocumentPage'
import { DocumentVersionPage } from './pages/DocumentVersionPage'
import { SettingsPage } from './pages/SettingsPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { SecurityPage } from './pages/SecurityPage'
import { ExportsPage } from './pages/ExportsPage'
import { ChatPage } from './pages/ChatPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuthRefresh } from './hooks/useAuthRefresh'

export const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
)

const AppRoutes = () => {
  useAuthRefresh()

  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workspace/:id" element={<WorkspacePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/exports" element={<ExportsPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Route>
        <Route
          element={
            <ProtectedRoute>
              <EditorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/document/:documentId" element={<DocumentPage />} />
          <Route path="/document/:documentId/version/:versionId" element={<DocumentVersionPage />} />
        </Route>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </Suspense>
  )
}
