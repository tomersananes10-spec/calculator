import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login }          from './pages/Login'
import { Dashboard }      from './pages/Dashboard'
import { Calculator }     from './pages/Calculator'
import { BriefGenerator } from './pages/BriefGenerator'
import { Admin }          from './pages/Admin'
import { AuthCallback }   from './pages/AuthCallback'
import { Roved5Page }     from './pages/Roved5Page'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calculator"
          element={
            <ProtectedRoute>
              <Calculator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brief-generator"
          element={
            <ProtectedRoute>
              <BriefGenerator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/layer5"
          element={
            <ProtectedRoute>
              <Roved5Page />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
