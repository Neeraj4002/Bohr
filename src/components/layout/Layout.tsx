import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#202124] overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-hidden bg-[#F8F9FA] dark:bg-[#202124]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
