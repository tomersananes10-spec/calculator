import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login }           from './pages/Login'
import { Dashboard }       from './pages/Dashboard'
import { Calculator }      from './pages/Calculator'
import { BriefGenerator }  from './pages/BriefGenerator'
import { Admin }           from './pages/Admin'
import { Profile }         from './pages/Profile'
import { AuthCallback }    from './pages/AuthCallback'
import { Roved5Page }      from './pages/Roved5Page'
import { ApprovalsPage }   from './pages/ApprovalsPage'
import { SuppliersPage }   from './pages/SuppliersPage'
import { ProjectsPage }    from './pages/ProjectsPage'
import { ProtectedRoute }  from './components/ProtectedRoute'
import { AppLayout }       from './components/AppLayout'

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"          element={<Login />} />
        <Route path="/auth/callback"  element={<AuthCallback />} />
        <Route path="/"               element={<Protected><Dashboard /></Protected>} />
        <Route path="/briefs"         element={<Protected><BriefGenerator /></Protected>} />
        <Route path="/calculator"     element={<Protected><Calculator /></Protected>} />
        <Route path="/brief-generator" element={<Protected><BriefGenerator /></Protected>} />
        <Route path="/layer5"         element={<Protected><Roved5Page /></Protected>} />
        <Route path="/approvals"      element={<Protected><ApprovalsPage /></Protected>} />
        <Route path="/suppliers"      element={<Protected><SuppliersPage /></Protected>} />
        <Route path="/projects"       element={<Protected><ProjectsPage /></Protected>} />
        <Route path="/profile"        element={<Protected><Profile /></Protected>} />
        <Route path="/admin"          element={<Protected><Admin /></Protected>} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
