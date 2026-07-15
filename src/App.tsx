import AuthScreen from './components/AuthScreen';
import { DashboardApp } from './app/DashboardApp';
import LoadingScreen from './components/LoadingScreen';
import SetupNotice from './components/SetupNotice';
import { useAuthGate } from './hooks/useAuthGate';

export default function App() { const { adminExists, error, isConfigured, loading, refreshAdminStatus, session, signOut } = useAuthGate(); if (!isConfigured) return <SetupNotice variant="env" />; if (loading) return <LoadingScreen />; if (error && adminExists === null && !session) return <SetupNotice detail={error} variant="schema" />; if (!session) return <AuthScreen adminExists={Boolean(adminExists)} gateError={error} onAdminStatusRefresh={refreshAdminStatus}/>; return <DashboardApp onSignOut={signOut} session={session} />; }
