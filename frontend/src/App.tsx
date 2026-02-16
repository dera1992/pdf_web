import { Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { EditorLayout } from './layouts/EditorLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { LandingPage } from './pages/LandingPage'
import { PricingPage } from './pages/PricingPage'
import { DocsPage } from './pages/DocsPage'
import { DashboardPage } from './pages/DashboardPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { DocumentPage } from './pages/DocumentPage'
import { DocumentVersionPage } from './pages/DocumentVersionPage'
import { SettingsPage } from './pages/SettingsPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { SecurityPage } from './pages/SecurityPage'
import { ExportsPage } from './pages/ExportsPage'
import { ChatPage } from './pages/ChatPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SocialAuthCallbackPage } from './pages/SocialAuthCallbackPage'
import { ToolsPage } from './pages/ToolsPage'
import { ToolDetailPage } from './pages/ToolDetailPage'
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
        <Route path="/auth/callback/:provider" element={<SocialAuthCallbackPage />} />
        <Route path="/signup" element={<RegisterPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/tools/:toolId" element={<ToolDetailPage />} />
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
          <Route path="/change-password" element={<ChangePasswordPage />} />
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
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </Suspense>
  )
}
