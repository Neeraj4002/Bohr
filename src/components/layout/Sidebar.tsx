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
    <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Google-style Branding */}
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-xl font-medium tracking-tight font-display">
          <span className="text-primary">10,000</span>{' '}
          <span className="text-foreground">Hours</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Master Your Skills</p>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 text-sm font-medium",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Link
          to="/focus"
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 w-full font-medium text-sm elevation-2 hover:elevation-3"
        >
          <Focus className="w-5 h-5" />
          <span>Start Focus</span>
        </Link>
      </div>
    </aside>
  );
}
