import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { AppDataProvider } from './AppDataProvider';
import { AppShell } from '../components/layout/AppShell';
import { HomePage } from '../features/dashboard/HomePage';
import { HabitsPage } from '../features/organisation/HabitsPage';
import { FreelancePage } from '../features/freelance/FreelancePage';
import { PersonalPage } from '../features/personal/PersonalPage';
import { SettingsPage } from '../features/settings/SettingsPage';

const NotesPage = lazy(() =>
  import('../features/notes/NotesPage').then((module) => ({ default: module.NotesPage })),
);

const notesRoute = (
  <Suspense fallback={<div className="panel empty-state" aria-label="Chargement des notes">Chargement des notes…</div>}>
    <NotesPage />
  </Suspense>
);

export function DashboardApp({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  return (
    <AppDataProvider session={session}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell onSignOut={onSignOut} />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/organisation" element={<Navigate replace to="/habits" />} />
            <Route path="/freelance" element={<FreelancePage />} />
            <Route path="/notes" element={notesRoute} />
            <Route path="/notes/:noteId" element={notesRoute} />
            <Route path="/personnel" element={<PersonalPage />} />
            <Route path="/settings" element={<SettingsPage onSignOut={onSignOut} />} />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppDataProvider>
  );
}
