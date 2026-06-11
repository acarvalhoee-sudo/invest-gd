import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import MainLayout    from './layouts/MainLayout'
import DashboardPage from './pages/DashboardPage'
import StudyFormPage from './pages/StudyFormPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout><DashboardPage /></MainLayout>} path="/" />
        <Route element={<MainLayout><StudyFormPage /></MainLayout>} path="/estudos/novo" />
        <Route element={<MainLayout><StudyFormPage /></MainLayout>} path="/estudos/:id/editar" />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(222 47% 9%)',
            color:      'hsl(213 31% 91%)',
            fontSize:   '13px',
            borderRadius: '10px',
            border:     '1px solid hsl(222 47% 18%)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          duration: 4000,
        }}
      />
    </BrowserRouter>
  )
}
