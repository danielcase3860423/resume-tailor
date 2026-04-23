'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { deleteCookie } from 'cookies-next';
import {
  AppstoreOutlined,
  UserOutlined,
  ProfileOutlined,
  StopOutlined,
  FileTextOutlined,
  SolutionOutlined,
  PhoneOutlined,
  SearchOutlined,
  CustomerServiceOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { Avatar, Badge, Dropdown } from 'antd';
import { ACCESSLIST, AvatarImg, COOKIE_USER_KEY, ERROR_SUCCESS, Logo } from '@/config/constants';
import { useGlobalContext } from '@/context/auth';
import { showToastErrorMsg, showToastInfoMsg } from '@/helpers/frontend';
import userService from '@/services/(routes)/users';
import { SidebarFooter, SidebarHeader, SidebarNav, SidebarNavButton, SidebarPanel, SidebarToggleButton } from '@/_components/layout/client/styled';

const ICON_BY_PATH = {
  '/': <AppstoreOutlined />,
  '/users': <UserOutlined />,
  '/profiles': <ProfileOutlined />,
  '/blacklist': <StopOutlined />,
  '/resume': <FileTextOutlined />,
  '/applies': <SolutionOutlined />,
  '/phones': <PhoneOutlined />,
  '/jobs': <SearchOutlined />,
  '/calls': <CustomerServiceOutlined />
};

export default function Sidebar({ collapsed = false, onToggle }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loginUser, setLoginUser } = useGlobalContext();
  const currentRole = loginUser?.user?.role?.toUpperCase();

  const navItems = useMemo(() => {
    if (!currentRole) {
      return [];
    }

    return ACCESSLIST[currentRole] || [];
  }, [currentRole]);

  if (!loginUser?.isLoggedIn || !navItems.length) {
    return null;
  }

  const accountLabel = loginUser?.user?.username || 'Workspace user';
  const accountInitial = accountLabel.trim().charAt(0).toUpperCase() || 'U';

  const onHandleLogOut = async () => {
    const data = await userService.logout();
    if (data.error !== undefined) {
      showToastErrorMsg(data.msg);
      return;
    }

    if (data.result === ERROR_SUCCESS) {
      setLoginUser({ isLoggedIn: false, user: null });
      router.push('/');
      showToastInfoMsg(data.msg);
      deleteCookie(COOKIE_USER_KEY);
    }
  };

  const accountMenuItems = [
    {
      key: 'account-summary',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: collapsed ? 0 : 220 }}>
          <Badge color='green' dot offset={[-4, 30]}>
            <Avatar src={AvatarImg.src} size={36} alt='Current user avatar'>
              {accountInitial}
            </Avatar>
          </Badge>
          <div style={{ display: 'grid', gap: 2 }}>
            <div style={{ fontWeight: 600, color: '#e6eef8', lineHeight: 1.2 }}>{accountLabel}</div>
            <div style={{ fontSize: 12, color: 'rgba(230,238,248,0.62)', lineHeight: 1.2 }}>
              {loginUser?.user?.email || loginUser?.user?.role || 'Account'}
            </div>
          </div>
        </div>
      ),
      disabled: true,
      style: { cursor: 'default', background: 'transparent' }
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      disabled: true
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Log out',
      danger: true
    }
  ];

  return (
    <SidebarPanel data-collapsed={collapsed}>
      <SidebarToggleButton type='button' onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </SidebarToggleButton>
      <SidebarHeader>
        <div className='sidebar-brand' onClick={() => router.push('/')} role='button' tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/')}>
          <div className='sidebar-brand-mark'>
            <img src={Logo.src} alt='PeraGreemSolution logo' />
          </div>
          {!collapsed && (
            <div className='sidebar-brand-copy'>
              <strong>PeraGreemSolution</strong>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarNav>
        {navItems
          .filter((item) => item.label)
          .map(({ path, label }) => {
            const isActive = path === '/' ? pathname === path : pathname.startsWith(path);

            return (
              <SidebarNavButton key={path} data-active={isActive} type='button' onClick={() => router.push(path)}>
                <span>{ICON_BY_PATH[path] || <AppstoreOutlined />}</span>
                {!collapsed && <strong>{label}</strong>}
              </SidebarNavButton>
            );
          })}
      </SidebarNav>
      <SidebarFooter>
        <Dropdown
          trigger={['click']}
          menu={{
            items: accountMenuItems,
            onClick: ({ key }) => {
              if (key === 'logout') {
                onHandleLogOut();
              }
            }
          }}
        >
          <div
            className='sidebar-account sidebar-account-trigger'
            role='button'
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.currentTarget.click();
              }
            }}
          >
            <Badge color='green' dot offset={[-4, 34]}>
              <Avatar src={AvatarImg.src} size={40} alt='Current user avatar'>
                {accountInitial}
              </Avatar>
            </Badge>
            {!collapsed && (
              <div className='sidebar-account-meta'>
                <strong>{accountLabel}</strong>
                <span>{loginUser?.user?.role || 'Member'}</span>
              </div>
            )}
          </div>
        </Dropdown>
      </SidebarFooter>
    </SidebarPanel>
  );
}
