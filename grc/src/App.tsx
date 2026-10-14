import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EntityFormModal } from './components/forms/EntityFormModal'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { DetailDrawer } from './components/panels/DetailDrawer'
import { ConfirmDialog, Toasts } from './components/ui/overlays'
import { GrcProvider } from './store/GrcStore'
import { UiProvider } from './store/UiStore'

// Chaque vue est chargée à la demande (React Flow et Recharts ne pèsent que sur les pages qui les utilisent).
const ActionPlansPage = lazy(() => import('./pages/ActionPlansPage').then((m) => ({ default: m.ActionPlansPage })))
const AuditLossesPage = lazy(() => import('./pages/AuditLossesPage').then((m) => ({ default: m.AuditLossesPage })))
const ControlsKriPage = lazy(() => import('./pages/ControlsKriPage').then((m) => ({ default: m.ControlsKriPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ProcessMapPage = lazy(() => import('./pages/ProcessMapPage').then((m) => ({ default: m.ProcessMapPage })))
const RelationsGraphPage = lazy(() => import('./pages/RelationsGraphPage').then((m) => ({ default: m.RelationsGraphPage })))
const ExecutionsPage = lazy(() => import('./pages/ExecutionsPage').then((m) => ({ default: m.ExecutionsPage })))
const RiskRegisterPage = lazy(() => import('./pages/RiskRegisterPage').then((m) => ({ default: m.RiskRegisterPage })))

export default function App() {
  return (
    <GrcProvider>
      <UiProvider>
        <HashRouter>
          <Sidebar />
          <div className="flex min-h-full flex-col pl-64">
            <Header />
            <main className="mx-auto w-full max-w-[1600px] flex-1 px-8 py-7">
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/cartographie" element={<ProcessMapPage />} />
                  <Route path="/risques" element={<RiskRegisterPage />} />
                  <Route path="/controles" element={<ControlsKriPage />} />
                  <Route path="/realisation" element={<ExecutionsPage />} />
                  <Route path="/plans" element={<ActionPlansPage />} />
                  <Route path="/audit" element={<AuditLossesPage />} />
                  <Route path="/relations" element={<RelationsGraphPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>
          <DetailDrawer />
          <EntityFormModal />
          <ConfirmDialog />
          <Toasts />
        </HashRouter>
      </UiProvider>
    </GrcProvider>
  )
}

function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Chargement">
      <div className="h-6 w-64 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-96 rounded bg-slate-100" />
      <div className="mt-6 grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200/70" />
        ))}
      </div>
      <div className="mt-5 h-80 rounded-xl bg-slate-200/50" />
    </div>
  )
}
