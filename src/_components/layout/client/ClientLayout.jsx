'use client';

import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'; // Import bootstrap CSS
import 'react-phone-number-input/style.css';
import Sidebar from '@/_components/layout/client/Sidebar';
import { useGlobalContext } from '@/context/auth';
import { AppBackdrop, AppShellLayout, BlankLayoutWrapper, MainContentWrapper } from '@/_components/layout/client/styled';

const ClientLayout = ({ props, pathname }) => {
  const { loginUser } = useGlobalContext();
  const showSidebar = Boolean(loginUser?.isLoggedIn);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <AppBackdrop>
      <BlankLayoutWrapper className='layout-wrapper'>
        {showSidebar ? (
          <AppShellLayout data-collapsed={isSidebarCollapsed}>
            <Sidebar collapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed((previous) => !previous)} />
            <MainContentWrapper data-collapsed={isSidebarCollapsed}>{props}</MainContentWrapper>
          </AppShellLayout>
        ) : (
          <div className='container'>
            <MainContentWrapper>{props}</MainContentWrapper>
          </div>
        )}
      </BlankLayoutWrapper>
    </AppBackdrop>
  );
};
export default ClientLayout;
