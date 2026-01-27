import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  LayoutDashboard,
  Scissors,
  Users,
  Clock,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Ban,
  BarChart3,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/servicos', label: 'Serviços', icon: Scissors },
  { href: '/profissionais', label: 'Profissionais', icon: Users },
  { href: '/horarios', label: 'Horários', icon: Clock },
  { href: '/bloqueios', label: 'Bloqueios', icon: Ban },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/planos-clientes', label: 'Planos Clientes', icon: Crown },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function DashboardLayout({ children }) {
  const { user, barbershop, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const publicUrl = barbershop ? `${window.location.origin}/b/${barbershop.slug}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-white/10 rounded-md transition-colors"
            data-testid="mobile-menu-button"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-bold text-xl uppercase tracking-tight">
            {barbershop?.name || 'BarberHub'}
          </h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform duration-300 lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h1 className="font-heading font-bold text-2xl uppercase tracking-tight">
                <span className="text-primary">Barber</span>Hub
              </h1>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-1 hover:bg-white/10 rounded"
                data-testid="close-sidebar-button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {barbershop && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {barbershop.name}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  data-testid={`nav-${item.href.slice(1)}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Public Link */}
          {barbershop && (
            <div className="p-4 border-t border-border">
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <LinkIcon className="w-4 h-4" />
                  <span>Link público</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background/50 px-2 py-1 rounded truncate">
                    /b/{barbershop.slug}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyLink}
                    data-testid="copy-link-button"
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* User & Logout */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <span className="text-primary font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
