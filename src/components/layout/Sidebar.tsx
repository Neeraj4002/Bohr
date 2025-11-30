import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  CheckSquare, 
  User, 
  BookOpen,
  Focus,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/skills', label: 'Skills', icon: Target },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/journal', label: 'Journal', icon: BookOpen },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold tracking-tight">10,000 Hours</h1>
        <p className="text-sm text-muted-foreground mt-1">Master Your Skills</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors notion-minimal",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Link
          to="/focus"
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors w-full"
        >
          <Focus className="w-5 h-5" />
          <span className="font-medium">Focus Mode</span>
        </Link>
      </div>
    </aside>
  );
}
