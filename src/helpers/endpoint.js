import jwt from 'jsonwebtoken';
import {
  TOKEN_SECRET,
  CONSTANT_USER_ROLE_ADMIN,
  CONSTANT_USER_ROLE_SUPER,
  CONSTANT_USER_ROLE_USER,
  CONSTANT_USER_ROLE_CALLER
} from '@/config/constants';
import { headers } from 'next/headers';
import { jwtDecode } from '@/helpers/common';

export function sendError(res, options) {
  const code = options && options.code ? options.code : 400;

  let message = options && options.msg ? options.msg : null;
  let fm = 'Unknown error';

  if (message !== null && message !== undefined) {
    if (message.length && typeof message[0] === 'object' && message[0].msg && message[0].param) {
      fm = message[0].msg;
    } else if (typeof message === 'string') {
      fm = message;
    } else if (typeof message === 'object') {
      if (message.code && message.severity) {
        fm = message.severity + ' - ' + message.code;
      } else if (message.msg) {
        fm = message.msg;
      } else if (message.message) {
        fm = message.message;
      }
    }
  }
  if (!res.headersSent) {
    if (res) {
      return res.json({ msg: fm }, { status: code });
    }
  }
}

export function hasAuthorization(req) {
  return !!req.headers.authorization;
}

export function isAuthorized(req) {
  let rv = false;
  if (hasAuthorization(req)) {
    try {
      jwt.verify(getToken(req), TOKEN_SECRET);
      rv = true;
    } catch {
      rv = false;
    }
  } else {
    rv = false;
  }
  return rv;
}

export function getToken(req) {
  const headersList = headers();
  const authorization = headersList.get('authorization');
  return authorization.split(' ')[1];
}

export function decodedToken(req) {
  return jwtDecode(getToken(req));
}

export function isThirdParty(req) {
  const token_name = req.headers.authorization;
  return token_name === 'kimura';
}

export function isAdmin(req) {
  const token = decodedToken(req);
  return token && token.role && token.role.toUpperCase() === CONSTANT_USER_ROLE_ADMIN;
}

export function isUser(req) {
  const token = decodedToken(req);
  return token && token.role && token.role.toUpperCase() === CONSTANT_USER_ROLE_USER;
}

export function isSuper(req) {
  const token = decodedToken(req);
  return token && token.role && token.role.toUpperCase() === CONSTANT_USER_ROLE_SUPER;
}

export function isCaller(req) {
  const token = decodedToken(req);
  return token && token.role && token.role.toUpperCase() === CONSTANT_USER_ROLE_CALLER;
}

// Removes all problematic invisible unicode characters
export function sanitizeText(str) {
  if (!str) return '';
  return str
    .replace(/\n/g, ' ')
    .replace(/[\u2010-\u2015\u2212]/g, '-') // normalize unicode hyphen/dash/minus variants
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, '-')
    .replace(/·/g, '-')
    .replace(/[\u{1F000}-\u{1FAFF}]/gu, '') // remove emojis
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // remove zero-width chars
}

const sanitizeASCII = (str) =>
  str
    .replace(/[\u2012-\u2015]/g, '-') // EM/EN dashes → hyphen
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
    .trim();

export const formatASCIIPart = (str) =>
  sanitizeASCII(str)
    .replace(/ /g, '_')
    .replace(/-/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

export function shortenRole(str) {
  const s = str.toLowerCase();

  if (s.includes('full') && s.includes('stack')) return 'FullStack';
  if (s.includes('frontend')) return 'FE';
  if (s.includes('backend')) return 'BE';
  if (s.includes('software engineer')) return 'SWE';
  if (s.includes('staff')) return 'Staff_SWE';
  if (s.includes('senior')) return 'Sr_SWE';
  if (s.includes('founding')) return 'Founding_Eng';

  return str.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20); // fallback
}

export function buildResumeFilename({ name, role, company, maxLength = 80 }) {
  const clean = (str) =>
    (str || '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const shortenSegment = (str, maxSegmentLength) => {
    if (!str || str.length <= maxSegmentLength) {
      return str;
    }

    const words = str.split("_").filter(Boolean);
    if (words.length > 1) {
      const compactWords = words.map((word) => word.slice(0, Math.max(3, Math.min(word.length, 8))));
      const compact = compactWords.join("_");
      if (compact.length <= maxSegmentLength) {
        return compact;
      }
    }

    if (maxSegmentLength <= 6) {
      return str.slice(0, maxSegmentLength);
    }

    return `${str.slice(0, maxSegmentLength - 3)}...`;
  };

  const cleanName = clean(name);
  const cleanRole = shortenRole(role);
  const cleanCompany = clean(company);

  if (!cleanName && !cleanRole && !cleanCompany) {
    return 'resume';
  }

  const buildBase = (parts) => parts.filter(Boolean).join('_');

  let adjustedRole = cleanRole;
  let adjustedCompany = cleanCompany;
  let base = buildBase([cleanName, adjustedRole, adjustedCompany]);

  if (base.length > maxLength) {
    adjustedRole = shortenSegment(adjustedRole, 20);
    adjustedCompany = shortenSegment(adjustedCompany, 20);
    base = buildBase([cleanName, adjustedRole, adjustedCompany]);
  }

  if (base.length > maxLength) {
    adjustedRole = shortenSegment(adjustedRole, 12);
    adjustedCompany = shortenSegment(adjustedCompany, 12);
    base = buildBase([cleanName, adjustedRole, adjustedCompany]);
  }

  if (base.length > maxLength && cleanName) {
    const reservedForOtherParts = [adjustedRole, adjustedCompany].filter(Boolean).join('_');
    const separatorLength = cleanName && reservedForOtherParts ? 1 : 0;
    const availableNameLength = Math.max(20, maxLength - reservedForOtherParts.length - separatorLength);
    base = buildBase([shortenSegment(cleanName, availableNameLength), adjustedRole, adjustedCompany]);
  }

  // return base;
  return 'Senior Software Engineer'
}

export function shortenLinkedIn(url) {
  // if (!url) return "";

  // let clean = url.trim();

  // // Not LinkedIn → leave unchanged
  // if (!clean.includes("linkedin.com")) return clean;

  // // Remove protocol + www
  // clean = clean.replace(/^https?:\/\//, "").replace(/^www\./, "");

  // // Remove trailing slash
  // clean = clean.replace(/\/+$/, "");

  // // Remove "linkedin.com"
  // clean = clean.replace(/^linkedin\.com/, "");

  // Ensure no accidental leading slashes duplication
  // return clean.replace(/^\/+/, "/");
  return url
}

