import { SpeedInsights } from '@vercel/speed-insights/next';
import GlobalProvider from '../context/auth';
import ClientLayout from '@/_components/layout/client/ClientLayout';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import { GlobalAppStyles } from '@/_components/layout/client/styled';
import 'antd/dist/reset.css';

export const metadata = {
  title: 'PeraGreemSolution',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg'
  }
};

export default async function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning={false} lang='en'>
      <body suppressHydrationWarning={false}>
        <AntdRegistry>
          <ConfigProvider
            theme={{
              algorithm: undefined,
              token: {
                colorPrimary: '#0f9d79',
                colorInfo: '#0f9d79',
                colorSuccess: '#0f9d79',
                colorBgBase: '#08111d',
                colorBgContainer: '#0b1523',
                colorText: '#e6eef8',
                colorTextSecondary: 'rgba(230, 238, 248, 0.68)',
                colorBorder: 'rgba(148, 163, 184, 0.16)',
                borderRadius: 16,
                fontFamily: '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif'
              }
            }}
          >
            <GlobalAppStyles />
            <GlobalProvider>
              <ClientLayout props={children} />
            </GlobalProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
