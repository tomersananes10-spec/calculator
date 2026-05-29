import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { NewCheck } from './pages/NewCheck'
import { CheckHistory } from './pages/CheckHistory'
import { CheckDetail } from './pages/CheckDetail'
import { Settings } from './pages/Settings'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/check/new" element={<NewCheck />} />
          <Route path="/check/:id" element={<CheckDetail />} />
          <Route path="/history" element={<CheckHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
