import { Switch, Route, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import Login from '@/pages/Login';
import MonitorDashboard from '@/pages/MonitorDashboard';
import DirectorDashboard from '@/pages/DirectorDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import Schedules from '@/pages/Schedules';
import Activities from '@/pages/Activities';
import Settings from '@/pages/Settings';

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Login />;
  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'director') return <DirectorDashboard />;
  return <MonitorDashboard />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="text-4xl animate-bounce block">🦎</span>
          <p className="text-muted-foreground text-sm">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation('/login');
    return null;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          },
        }}
      />
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/">
          <ProtectedRoute>
            <RoleRouter />
          </ProtectedRoute>
        </Route>
        <Route path="/schedules">
          <ProtectedRoute>
            <Schedules />
          </ProtectedRoute>
        </Route>
        <Route path="/activities">
          <ProtectedRoute>
            <Activities />
          </ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        </Route>
        <Route path="/monitor">
          <ProtectedRoute>
            <MonitorDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/director">
          <ProtectedRoute>
            <DirectorDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/admin">
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        </Route>
        {/* 404 fallback */}
        <Route>
          <ProtectedRoute>
            <RoleRouter />
          </ProtectedRoute>
        </Route>
      </Switch>
    </>
  );
}
