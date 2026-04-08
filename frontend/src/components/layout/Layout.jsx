import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <Sidebar isOpen={isSidebarOpen} />
      <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
