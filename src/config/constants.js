export { default as Logo } from '/public/assets/client/images/logo.svg';
export { default as AvatarImg } from '/public/assets/client/images/avatar.png';

export { default as loginBanner } from '/public/assets/client/images/auth-login.png';
export { default as LOADER } from '/public/assets/loader.svg';
export { default as LOADER_BLACK } from '/public/assets/loader_black.svg';

export const GOOGLE_LOGIN_CLIENT_KEY = '547919628583-plt1588ht6a2vtjcnoo4sulhljeptfr6.apps.googleusercontent.com';

export const CONSTANT_USER_ROLE_SUPER = 'SUPER';
export const CONSTANT_USER_ROLE_ADMIN = 'ADMIN';
export const CONSTANT_USER_ROLE_USER = 'VA';
export const CONSTANT_USER_ROLE_CALLER = 'CALLER';
export const CONSTANT_USER_ROLE_GUEST = 'GUEST';

// config/constants.js
export const ACCESSLIST = {
  [CONSTANT_USER_ROLE_ADMIN]: [
    { path: '/', label: 'Dashboard' },
    { path: '/users', label: 'Users' },
    { path: '/profiles', label: 'Profiles' },
    { path: '/blacklist', label: 'Blacklist' },
    { path: '/resume', label: 'Resume' },
    { path: '/applies', label: 'Applies' },
    { path: '/phones', label: 'Phones' },
    { path: '/jobs', label: 'Jobs' }
  ],
  [CONSTANT_USER_ROLE_USER]: [
    { path: '/', label: 'Dashboard' },
    { path: '/jobs', label: 'Jobs' },
    { path: '/resume', label: 'Resume' },
    { path: '/applies', label: 'Applies' }
  ],
  [CONSTANT_USER_ROLE_CALLER]: [
    { path: '/', label: 'Dashboard' },
    { path: '/calls', label: 'Calls' }
  ]
};

export const USER_TABLE_COLUMNS_BASE = [
  { title: 'NAME', dataIndex: 'username', key: 'username' },
  { title: 'EMAIL', dataIndex: 'email', key: 'email' },
  { title: 'ROLE', dataIndex: 'role', key: 'role' },
  { title: 'STATUS', dataIndex: 'status', key: 'status' }
];

export const PROFILE_TABLE_COLUMNS_BASE = [
  { title: 'NAME', dataIndex: 'profileName', key: 'profileName' },
  { title: 'TITLE', dataIndex: 'profileTitle', key: 'title' },
  { title: 'EMAIL', dataIndex: 'profileEmail', key: 'email' },
  { title: 'LINKEDIN', dataIndex: 'profileLinkedIn', key: 'linkedin' }
];

export const PHONE_TABLE_COLUMNS_BASE = [
  { title: 'SIP SERVER', dataIndex: 'sipServer', key: 'sipServer' },
  { title: 'SIP USERNAME', dataIndex: 'sipUsername', key: 'sipUsername' },
  {
    title: 'SIP PASSWORD',
    dataIndex: 'sipPassword',
    key: 'sipPassword',
    render: (sipPassword) => (!!sipPassword ? '******' : '')
  },
  { title: 'Status', dataIndex: 'status', key: 'status' }
];

///////////////////////////////////////////////////////
export const ERROR_SUCCESS = 'ok';
export const ERROR_FAILED = 'failed';
///////////////////////////////////////////////////////
export const DEFAULT_PAGINATION_SIZE = 50;

export const WEEK_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const COOKIE_USER_KEY = 't_lpvt_1fc983b4c305d209e7e05d96e713939f';

export const TOKEN_SECRET = 'rXG1Xkpe2T0PAk7iTlXlo6CipStL3SNR';
export const NON_STRUCTURED_COUNTRIES = ['GB', 'SG', 'HK', 'IE', 'AE'];
