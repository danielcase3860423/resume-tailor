'use client';
import styled, { createGlobalStyle } from 'styled-components';
import { Button, Space, Table } from 'antd';

const palette = {
  ink: '#06101d',
  inkSoft: '#0d1b2d',
  teal: '#0d6f72',
  emerald: '#19b38a',
  mint: '#173e37',
  sand: '#111d2b',
  paper: '#0b1523',
  panel: '#101c2c',
  panelRaised: '#142436',
  line: 'rgba(148, 163, 184, 0.16)',
  text: '#e6eef8',
  textMuted: 'rgba(230, 238, 248, 0.68)',
  white: '#ffffff',
  danger: '#b42318'
};

export const GlobalAppStyles = createGlobalStyle`
  :root {
    --pgs-ink: ${palette.ink};
    --pgs-ink-soft: ${palette.inkSoft};
    --pgs-emerald: ${palette.emerald};
    --pgs-teal: ${palette.teal};
    --pgs-sand: ${palette.sand};
    --pgs-paper: ${palette.paper};
    --pgs-line: ${palette.line};
    --pgs-text: ${palette.text};
    --pgs-text-muted: ${palette.textMuted};
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    min-height: 100%;
    background:
      radial-gradient(circle at top left, rgba(25, 179, 138, 0.18), transparent 28%),
      radial-gradient(circle at top right, rgba(13, 111, 114, 0.18), transparent 24%),
      linear-gradient(180deg, #08111d 0%, #0d1624 48%, #0a1320 100%);
    color: var(--pgs-text);
    font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
  }

  body {
    overflow-x: hidden;
  }

  a {
    color: inherit;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: Georgia, "Times New Roman", serif;
    letter-spacing: -0.02em;
  }

  .container {
    width: min(1320px, calc(100% - 40px));
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .container {
      width: calc(100% - 24px);
    }
  }

  .ant-btn,
  .ant-input,
  .ant-input-affix-wrapper,
  .ant-select-selector,
  .ant-picker,
  .ant-modal-content,
  .ant-card,
  .ant-dropdown .ant-dropdown-menu,
  .ant-table-wrapper .ant-table {
    border-radius: 16px;
  }

  .ant-input,
  .ant-input-affix-wrapper,
  .ant-select-selector,
  .ant-picker,
  .ant-modal-content,
  .ant-card {
    background: rgba(16, 28, 44, 0.88) !important;
    color: ${palette.text} !important;
    border-color: ${palette.line} !important;
    box-shadow: 0 18px 40px -30px rgba(0, 0, 0, 0.72);
  }

  .ant-input:focus,
  .ant-input-focused,
  .ant-input-affix-wrapper-focused,
  .ant-select-focused .ant-select-selector,
  .ant-picker-focused {
    border-color: ${palette.emerald} !important;
    box-shadow: 0 0 0 4px rgba(15, 157, 121, 0.12) !important;
  }

  .ant-input::placeholder,
  .ant-select-selection-placeholder,
  .ant-picker-input > input::placeholder,
  .ant-input-affix-wrapper input::placeholder {
    color: rgba(230, 238, 248, 0.42) !important;
  }

  .ant-input,
  .ant-input-affix-wrapper input,
  .ant-select-selection-item,
  .ant-picker-input > input,
  .ant-select-arrow,
  .ant-picker-suffix,
  .ant-modal-title,
  .ant-form-item-label > label,
  .ant-dropdown-menu-item,
  .ant-empty-description,
  .ant-tag,
  .ant-pagination-item a,
  .ant-pagination-prev .ant-pagination-item-link,
  .ant-pagination-next .ant-pagination-item-link {
    color: ${palette.text} !important;
  }

  .ant-select-dropdown,
  .ant-picker-dropdown .ant-picker-panel-container,
  .ant-dropdown .ant-dropdown-menu {
    background: ${palette.panelRaised} !important;
    border: 1px solid ${palette.line};
    box-shadow: 0 24px 60px -38px rgba(0, 0, 0, 0.82);
  }

  .ant-select-item {
    color: ${palette.text} !important;
  }

  .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
    background: rgba(25, 179, 138, 0.18) !important;
  }

  .ant-select-item-option-active:not(.ant-select-item-option-disabled),
  .ant-dropdown-menu-item:hover,
  .ant-dropdown-menu-submenu-title:hover {
    background: rgba(25, 179, 138, 0.14) !important;
  }

  .ant-modal .ant-modal-content {
    padding: 22px;
    background: rgba(16, 28, 44, 0.96);
    backdrop-filter: blur(16px);
  }

  .ant-modal .ant-modal-header {
    background: transparent;
    margin-bottom: 20px;
  }

  .ant-modal .ant-modal-close,
  .ant-modal .ant-modal-close-x,
  .ant-btn-default,
  .ant-btn-text {
    color: ${palette.text} !important;
  }

  .ant-btn-default {
    background: rgba(20, 36, 54, 0.88) !important;
    border-color: ${palette.line} !important;
  }

  .ant-btn-default:hover,
  .ant-btn-default:focus {
    background: rgba(24, 43, 64, 0.96) !important;
    border-color: rgba(25, 179, 138, 0.3) !important;
  }

  .ant-table-wrapper .ant-table-pagination.ant-pagination {
    margin: 18px 18px 18px 0;
  }

  .ant-pagination-item,
  .ant-pagination-prev .ant-pagination-item-link,
  .ant-pagination-next .ant-pagination-item-link {
    background: rgba(16, 28, 44, 0.88) !important;
    border-color: ${palette.line} !important;
  }

  .ant-pagination-item-active {
    background: rgba(25, 179, 138, 0.18) !important;
    border-color: rgba(25, 179, 138, 0.36) !important;
  }

  .PhoneInputInput {
    border: none;
    outline: none;
    background: transparent;
    color: ${palette.text};
    min-height: 40px;
  }
`;

export const SelectOption = styled('li')({
  paddingLeft: 10
});

export const StyledLabel = styled.label`
  span {
    color: #ff0000;
    font-weight: bold;
    font-size: 1em;
  }
`;

export const AppBackdrop = styled.div({
  minHeight: '100vh',
  background: 'transparent'
});

export const BlankLayoutWrapper = styled.main({
  minHeight: '100vh',
  padding: 0,
  position: 'relative',
  '& .content-center': {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center'
  },
  '& .content-right': {
    display: 'flex',
    minHeight: '100vh',
    overflowX: 'hidden',
    position: 'relative'
  }
});

export const AppShellLayout = styled.div({
  display: 'grid',
  gridTemplateColumns: '248px minmax(0, 1fr)',
  gap: 0,
  alignItems: 'stretch',
  minHeight: '100vh',
  width: '100%',
  transition: 'grid-template-columns 0.18s ease',
  '&[data-collapsed="true"]': {
    gridTemplateColumns: '82px minmax(0, 1fr)'
  },
  '@media (max-width: 1024px)': {
    gridTemplateColumns: '1fr'
  }
});

export const SidebarPanel = styled.aside({
  position: 'sticky',
  top: 0,
  overflow: 'visible',
  height: '100vh',
  minHeight: '100vh',
  padding: '8px 10px',
  borderRight: `1px solid ${palette.line}`,
  background:
    'linear-gradient(180deg, rgba(8, 17, 29, 0.98) 0%, rgba(11, 21, 35, 0.98) 52%, rgba(10, 22, 35, 0.98) 100%)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'padding 0.18s ease',
  '&[data-collapsed="true"]': {
    padding: '8px 8px'
  },
  '@media (max-width: 1024px)': {
    position: 'static',
    height: 'auto',
    minHeight: 'auto'
  }
});

export const SidebarHeader = styled.div({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  gap: 10,
  padding: '8px 8px 12px',
  marginBottom: 8,
  borderBottom: `1px solid ${palette.line}`,
  '& .sidebar-brand': {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    cursor: 'pointer'
  },
  '& .sidebar-brand-mark': {
    width: 38,
    height: 38,
    borderRadius: 10,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(16, 28, 44, 0.9)',
    border: `1px solid ${palette.line}`,
    flexShrink: 0
  },
  '& .sidebar-brand-mark img': {
    width: 24,
    height: 24,
    objectFit: 'contain'
  },
  '& .sidebar-brand-copy': {
    display: 'grid',
    gap: 2,
    minWidth: 0
  },
  '& strong': {
    fontSize: 13,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: palette.text
  },
  '& span': {
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: palette.textMuted
  },
  '[data-collapsed="true"] &': {
    justifyContent: 'center'
  }
});

export const SidebarToggleButton = styled.button({
  position: 'absolute',
  top: 14,
  right: -15,
  zIndex: 4,
  width: 28,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  borderRadius: 6,
  border: `1px solid ${palette.line}`,
  background: 'rgba(34, 40, 49, 0.98)',
  color: palette.text,
  cursor: 'pointer',
  boxShadow: '0 10px 24px -18px rgba(0, 0, 0, 0.9)',
  transition: 'all 0.18s ease',
  '& .anticon': {
    fontSize: 12
  },
  '&:hover': {
    background: 'rgba(44, 51, 61, 0.98)',
    borderColor: 'rgba(148, 163, 184, 0.26)'
  },
  '[data-collapsed="true"] &': {
    right: -14
  }
});

export const SidebarNav = styled.nav({
  display: 'grid',
  gap: 6,
  flex: 1,
  alignContent: 'start',
  justifyItems: 'start',
  paddingTop: 4,
  minHeight: 0,
  '[data-collapsed="true"] &': {
    justifyItems: 'center'
  }
});

export const SidebarNavButton = styled.button({
  width: 'fit-content',
  maxWidth: '100%',
  minHeight: 38,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '0 14px',
  borderRadius: 10,
  border: '1px solid transparent',
  background: 'transparent',
  color: palette.text,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.18s ease',
  '& span': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    color: 'rgba(230, 238, 248, 0.82)',
    fontSize: 16
  },
  '& strong': {
    fontSize: 13,
    fontWeight: 600
  },
  '&:hover': {
    background: 'rgba(20, 36, 54, 0.74)',
    borderColor: 'rgba(148, 163, 184, 0.12)'
  },
  '&[data-active="true"]': {
    background: 'rgba(19, 47, 64, 0.94)',
    borderColor: 'rgba(25, 179, 138, 0.28)'
  },
  '&[data-active="true"] span': {
    color: '#8ff2d6'
  },
  '[data-collapsed="true"] &': {
    justifyContent: 'center',
    padding: 0
  },
  '[data-collapsed="true"] & span': {
    width: 44,
    fontSize: 18
  }
});

export const SidebarFooter = styled.div({
  marginTop: 'auto',
  padding: '10px 8px 0',
  borderTop: `1px solid ${palette.line}`,
  display: 'grid',
  gap: 8,
  '& .sidebar-account-meta strong': {
    fontSize: 12,
    color: palette.text
  },
  '& .sidebar-account-meta span': {
    fontSize: 11,
    color: palette.textMuted,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  '& .sidebar-account': {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  '& .sidebar-account-trigger': {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    maxWidth: '100%',
    padding: '4px 0',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background 0.18s ease'
  },
  '& .sidebar-account-trigger:hover': {
    background: 'rgba(20, 36, 54, 0.32)'
  },
  '& .sidebar-account-meta': {
    display: 'grid',
    gap: 2
  },
  '[data-collapsed="true"] &': {
    justifyItems: 'center'
  },
  '[data-collapsed="true"] & .sidebar-account': {
    justifyContent: 'center'
  }
});

export const MainContentWrapper = styled.div({
  flexGrow: 1,
  minWidth: 0,
  display: 'flex',
  minHeight: '100%',
  flexDirection: 'column',
  background: 'transparent',
  padding: '20px 28px 0',
  overflowX: 'visible',
  '@media (max-width: 1024px)': {
    padding: '16px 18px 0'
  }
});

export const TopStrip = styled.div({
  background: palette.ink,
  color: 'rgba(255,255,255,0.82)',
  borderBottom: '1px solid rgba(255,255,255,0.08)'
});

export const TopStripInner = styled.div({
  minHeight: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
});

export const TopStripText = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap'
});

export const Header = styled.header({
  position: 'sticky',
  top: 0,
  zIndex: 30,
  backdropFilter: 'blur(18px)',
  background: 'rgba(11, 21, 35, 0.86)',
  borderBottom: `1px solid ${palette.line}`,
  boxShadow: '0 18px 44px -38px rgba(0, 0, 0, 0.86)'
});

export const HeaderWrapper = styled.div({
  minHeight: 88,
  display: 'flex',
  alignItems: 'center'
});

export const NavbarHeader = styled.div({
  display: 'flex',
  minHeight: 88,
  alignItems: 'center'
});

export const NavbarBrand = styled.a({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  textDecoration: 'none',
  marginRight: '2rem',
  '.img-fluid': {
    width: 52,
    height: 42,
    objectFit: 'contain',
    filter: 'drop-shadow(0 8px 24px rgba(15, 157, 121, 0.28))'
  }
});

export const NavbarBrandTypo = styled.div({
  display: 'grid',
  gap: 2,
  '& strong': {
    fontFamily: 'Georgia, "Times New Roman", serif',
    color: palette.text,
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1
  },
  '& span': {
    color: palette.textMuted,
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase'
  }
});

export const ContentWrapper = styled.div({
  display: 'flex',
  overflowX: 'visible',
  position: 'relative',
  minHeight: '100%',
  '&.resume': {
    paddingTop: 0,
    minHeight: 'calc(100vh - 88px)'
  },
  '& .ant-space': {
    width: '100%'
  }
});

export const AuthLayout = styled.div({
  display: 'grid',
  gridTemplateColumns: 'minmax(320px, 1.15fr) minmax(340px, 0.85fr)',
  gap: 28,
  alignItems: 'stretch',
  width: '100%',
  minHeight: 'calc(100vh - 80px)',
  '@media (max-width: 1024px)': {
    gridTemplateColumns: '1fr'
  }
});

export const ImgWrapper = styled.div({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 28,
  padding: '32px',
  minHeight: 540,
  color: palette.white,
  background: 'rgba(11, 21, 35, 0.92)',
  border: `1px solid ${palette.line}`,
  boxShadow: '0 30px 70px -48px rgba(0, 0, 0, 0.88)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: 24,
  '@media (max-width: 1024px)': {
    minHeight: 'auto',
    padding: '24px'
  }
});

export const AuthBrandBlock = styled.div({
  position: 'relative',
  zIndex: 1,
  maxWidth: 560,
  '& .auth-brand-logo': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  '& .auth-brand-logo img': {
    width: 36,
    height: 36,
    objectFit: 'contain'
  },
  '& .auth-brand-logo strong': {
    fontSize: 18,
    lineHeight: 1,
    color: palette.text
  }
});

export const AuthEyebrow = styled.div({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '7px 12px',
  borderRadius: 12,
  background: 'rgba(20, 36, 54, 0.84)',
  border: `1px solid ${palette.line}`,
  color: palette.textMuted,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.1em'
});

export const AuthTitle = styled.h1({
  margin: '18px 0 12px',
  fontSize: 'clamp(2.2rem, 4vw, 3.3rem)',
  lineHeight: 0.98,
  color: palette.white
});

export const AuthBody = styled.p({
  margin: 0,
  maxWidth: 520,
  fontSize: 14,
  lineHeight: 1.7,
  color: palette.textMuted
});

export const AuthStatGrid = styled.div({
  position: 'relative',
  zIndex: 1,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
  maxWidth: 420
});

export const AuthStatCard = styled.div({
  padding: '16px',
  borderRadius: 18,
  background: 'rgba(20, 36, 54, 0.72)',
  border: `1px solid ${palette.line}`,
  '& strong': {
    display: 'block',
    color: palette.white,
    fontSize: 18,
    marginBottom: 6
  },
  '& span': {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 1.6
  }
});

export const LoginFormContent = styled.div({
  width: '100%',
  maxWidth: 520,
  margin: '0 auto',
  background: 'rgba(11, 21, 35, 0.92)',
  padding: '30px',
  borderRadius: 28,
  border: `1px solid ${palette.line}`,
  boxShadow: '0 30px 70px -48px rgba(0, 0, 0, 0.88)',
  backdropFilter: 'blur(18px)',
  '@media (max-width: 900px)': {
    maxWidth: '100%',
    padding: '22px'
  },
  '& h5': {
    margin: 0,
    lineHeight: 1.1,
    color: palette.text,
    fontSize: 28,
    fontWeight: 700
  },
  '& p': {
    marginTop: 10,
    lineHeight: 1.65,
    fontWeight: 400,
    fontSize: 14,
    color: palette.textMuted
  },
  '& label': {
    display: 'block',
    paddingBottom: 8,
    color: palette.text,
    fontWeight: 600,
    fontSize: 13
  },
  '& .form-control': {
    minHeight: 42,
    fontSize: 14
  }
});

export const FormWrapper = styled.div({
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
});

export const FlexCenterBox = styled.div({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1
});

export const FlexBox = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
  flex: 1
});

export const HeaderItem = styled(Space)({
  minHeight: '88px',
  '& .ant-space-item': {
    display: 'flex',
    alignItems: 'center'
  },
  '& .ant-btn': {
    height: 44,
    borderRadius: 12,
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 600,
    paddingInline: 18,
    color: `${palette.text} !important`,
    border: '1px solid transparent',
    background: 'transparent'
  },
  '& .ant-btn-active': {
    backgroundColor: `${palette.ink} !important`,
    color: `${palette.white} !important`,
    borderColor: `${palette.ink} !important`,
    boxShadow: '0 12px 26px -18px rgba(7, 17, 31, 0.9)'
  }
});

export const HeaderMeta = styled.div({
  display: 'grid',
  gap: 2,
  marginRight: 10,
  textAlign: 'right',
  '& strong': {
    fontSize: 13,
    color: palette.text
  },
  '& span': {
    fontSize: 11,
    color: palette.textMuted,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  '@media (max-width: 920px)': {
    display: 'none'
  }
});

export const StyledButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'variant'
})(({ variant = 'primary' }) => {
  const isSecondary = variant === 'secondary';

  return {
    width: 'fit-content',
    minHeight: 46,
    borderRadius: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    border: isSecondary ? `1px solid rgba(7, 17, 31, 0.12)` : 'none',
    background: isSecondary
      ? 'rgba(20, 36, 54, 0.92)'
      : 'linear-gradient(135deg, #0f9d79 0%, #0f766e 100%)',
    color: isSecondary ? `${palette.text} !important` : '#fff !important',
    boxShadow: isSecondary ? 'none' : '0 18px 36px -24px rgba(15, 118, 110, 0.85)',
    '&:hover, &:focus, &:active': {
      textDecoration: 'none',
      background: isSecondary
        ? 'rgba(24, 43, 64, 1) !important'
        : 'linear-gradient(135deg, #129e7d 0%, #116c66 100%) !important',
      color: isSecondary ? `${palette.text} !important` : '#fff !important',
      border: isSecondary ? `1px solid rgba(7, 17, 31, 0.18) !important` : 'none',
      boxShadow: isSecondary ? '0 16px 30px -28px rgba(7, 17, 31, 0.8)' : '0 20px 40px -24px rgba(15, 118, 110, 0.85)'
    },
    '& .ant-btn-icon': {
      display: 'flex'
    }
  };
});

export const LoginBtn = styled(Button)({
  width: '100%',
  minHeight: 44,
  background: 'linear-gradient(135deg, #0f9d79 0%, #0f766e 100%)',
  borderRadius: 12,
  color: '#fff !important',
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  lineHeight: 1,
  padding: '0 1.625rem !important',
  marginTop: '14px',
  border: 'none',
  boxShadow: '0 22px 42px -26px rgba(15, 118, 110, 0.8)',
  '&:hover, &:focus, &:active': {
    textDecoration: 'none',
    background: 'linear-gradient(135deg, #129e7d 0%, #116c66 100%) !important',
    boxShadow: '0 24px 44px -26px rgba(15, 118, 110, 0.82)',
    border: 'none'
  },
  '& .ant-btn-icon': {
    display: 'flex'
  }
});

export const SpinWrapper = styled.div({
  display: 'flex',
  justifyContent: 'center',
  minHeight: '40vh',
  alignItems: 'center',
  '& .ant-spin-dot-holder': {
    color: palette.emerald
  }
});

export const PageShell = styled.div({
  width: '100%',
  minWidth: 0,
  paddingTop: 8
});

export const SurfaceCard = styled.section({
  background: 'rgba(11, 21, 35, 0.9)',
  border: `1px solid ${palette.line}`,
  borderRadius: 28,
  padding: 24,
  boxShadow: '0 24px 56px -44px rgba(0, 0, 0, 0.88)',
  backdropFilter: 'blur(14px)',
  '@media (max-width: 768px)': {
    padding: 18
  }
});

export const SectionStack = styled.div({
  display: 'grid',
  gap: 20
});

export const DashboardPageHeader = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 14,
  flexWrap: 'wrap'
});

export const DashboardPageIntro = styled.div({
  display: 'grid',
  gap: 6,
  '& h1, & h2, & h3, & h4, & h5': {
    margin: 0,
    color: palette.white,
    fontSize: 28,
    lineHeight: 1.05
  },
  '& p': {
    margin: 0,
    maxWidth: 760,
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 1.65
  }
});

export const DashboardMetaRow = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap'
});

export const DashboardMetaChip = styled.span({
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 28,
  padding: '0 11px',
  borderRadius: 12,
  background: 'rgba(16, 28, 44, 0.96)',
  border: `1px solid ${palette.line}`,
  color: '#c8d3e3',
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'uppercase'
});

export const DashboardStatGrid = styled.div({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12
});

export const DashboardStatCard = styled.div({
  background: 'rgba(11, 21, 35, 0.9)',
  border: `1px solid ${palette.line}`,
  borderRadius: 16,
  padding: '14px 16px',
  display: 'grid',
  gap: 6,
  minWidth: 0,
  '& strong': {
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#8296b2'
  },
  '& b': {
    fontSize: 24,
    lineHeight: 1,
    color: '#f4f7fb'
  },
  '& span': {
    fontSize: 12,
    color: '#8ea1bb'
  }
});

export const DashboardTableSection = styled(SurfaceCard)({
  minWidth: 0,
  borderRadius: 16,
  padding: 14
});

export const DashboardSectionHeader = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 12,
  '& strong': {
    display: 'block',
    fontSize: 16,
    color: '#f2f6fb'
  },
  '& span': {
    display: 'block',
    marginTop: 4,
    fontSize: 13,
    color: '#8fa2bb'
  }
});

export const PageToolbar = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 14
});

export const ToolbarGroup = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap'
});

export const ColorTable = styled(Table)({
  overflow: 'hidden',
  border: `1px solid ${palette.line}`,
  borderRadius: 16,
  background: 'rgba(11,21,35,0.72)',
  '& .ant-table': {
    background: 'transparent'
  },
  '& .ant-table-container table > thead > tr:first-child th:first-child': {
    borderStartStartRadius: 16
  },
  '& .ant-table-container table > thead > tr:first-child th:last-child': {
    borderStartEndRadius: 16
  },
  '& .ant-table-thead > tr > th': {
    background: 'linear-gradient(180deg, rgba(7,17,31,0.98), rgba(15,33,55,0.95)) !important',
    color: '#fff !important',
    borderBottom: 'none !important',
    fontSize: 12,
    paddingTop: 12,
    paddingBottom: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  '& .ant-table-tbody > tr > td': {
    background: 'rgba(11, 21, 35, 0.55)',
    color: palette.text,
    fontSize: 13,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottom: `1px solid ${palette.line} !important`
  },
  '& .ant-table-tbody > tr:hover > td': {
    background: 'rgba(25, 179, 138, 0.08) !important'
  },
  '& .ant-table-tbody > tr.ant-table-row-selected > td': {
    background: 'rgba(26, 44, 63, 0.96) !important',
    color: '#f4f7fb !important'
  },
  '& .ant-table-tbody > tr.ant-table-row-selected:hover > td': {
    background: 'rgba(31, 54, 77, 0.98) !important',
    color: '#f4f7fb !important'
  },
  '& .ant-table-tbody > tr.ant-table-row-selected > td span': {
    color: 'inherit !important'
  },
  '& .ant-table-tbody > tr.ant-table-row-selected .ant-btn-text.ant-btn-dangerous': {
    color: '#ff8b8b !important'
  },
  '& .ant-table-tbody > tr.ant-table-row-selected .ant-btn-text.ant-btn-dangerous:hover': {
    color: '#ffb0b0 !important'
  },
  '& .ant-pagination': {
    marginTop: 14,
    marginBottom: 0
  },
  '& .ant-table-filter-trigger .anticon, .ant-table-column-sorter-inner .anticon': {
    color: 'rgba(255,255,255,0.72) !important'
  },
  '& .ant-table-filter-trigger.active .anticon': {
    color: '#fff !important'
  }
});
