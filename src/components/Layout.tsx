
import React from 'react';
import Sidebar from './Sidebar';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <main className="flex-1 relative">
          {isMobile && (
            <div className="absolute top-2 left-2 z-10">
              <SidebarTrigger />
            </div>
          )}
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
