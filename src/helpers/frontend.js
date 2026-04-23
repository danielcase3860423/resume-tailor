import Swal from 'sweetalert2';
import { isValidEmail } from './common';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const showToastMsg = (title, iconClass) => {
  Swal.mixin({
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    toast: true,
    timerProgressBar: true
  }).fire(title, '', iconClass);
};

export function showToastInfoMsg(message) {
  showToastMsg(message, 'info');
}

export function showToastErrorMsg(message) {
  showToastMsg(message, 'error');
}

export function analyzeJobDescriptionRestrictions(jobDescription) {
  const text = String(jobDescription || '').toLowerCase();

  const hasSecurityClearanceRequirement =
    /\bsecurity clearance\b/.test(text) ||
    /\bclearance required\b/.test(text) ||
    /\brequires? (an |a )?(active )?(secret|top secret|ts\/sci|ts-sci|ts sci|public trust) clearance\b/.test(text) ||
    /\b(active|current)\s+(secret|top secret|ts\/sci|ts-sci|ts sci|public trust)\b/.test(text) ||
    /\bmust be able to obtain (an |a )?(secret|top secret|ts\/sci|ts-sci|ts sci|public trust|security) clearance\b/.test(text);

  const hasHybridRequirement = /\bhybrid\b/.test(text);
  const hasOnsiteRequirement =
    /\bonsite\b/.test(text) ||
    /\bon-site\b/.test(text) ||
    /\bon site\b/.test(text) ||
    /\bin office\b/.test(text) ||
    /\bin-office\b/.test(text);
  const hasRemoteOption =
    /\bremote\b/.test(text) ||
    /\bwork from home\b/.test(text) ||
    /\bwfh\b/.test(text);
  const hasLocationReviewWarning = hasHybridRequirement || hasOnsiteRequirement;

  return {
    hasSecurityClearanceRequirement,
    hasHybridRequirement,
    hasOnsiteRequirement,
    hasRemoteOption,
    hasLocationReviewWarning,
    shouldBlockResumeGeneration: hasSecurityClearanceRequirement
  };
}

export function required(value) {
  if (!value) {
    showToastErrorMsg('This field is required!');
  }
}

export function validEmail(email) {
  if (!isValidEmail(email)) {
    showToastErrorMsg('This is not a valid email.');
    return false;
  }
  return true;
}
