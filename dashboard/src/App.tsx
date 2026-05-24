import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BotProvider } from '@/context/BotContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { Skeleton } from '@/components/ui/Skeleton';

const MessagesPage = lazy(() =>
  import('@/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
);
const GroupsPage = lazy(() =>
  import('@/pages/GroupsPage').then((m) => ({ default: m.GroupsPage })),
);
const ActivityPage = lazy(() =>
  import('@/pages/ActivityPage').then((m) => ({ default: m.ActivityPage })),
);
const HistoryPage = lazy(() =>
  import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);
const ConfigPage = lazy(() =>
  import('@/pages/ConfigPage').then((m) => ({ default: m.ConfigPage })),
);
const LogsPage = lazy(() =>
  import('@/pages/LogsPage').then((m) => ({ default: m.LogsPage })),
);

function PageFallback() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BotProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route
                path="mensagens"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <MessagesPage />
                  </Suspense>
                }
              />
              <Route
                path="grupos"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <GroupsPage />
                  </Suspense>
                }
              />
              <Route
                path="atividade"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ActivityPage />
                  </Suspense>
                }
              />
              <Route
                path="historico"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <HistoryPage />
                  </Suspense>
                }
              />
              <Route
                path="config"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ConfigPage />
                  </Suspense>
                }
              />
              <Route
                path="logs"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <LogsPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </BotProvider>
    </ToastProvider>
  );
}
