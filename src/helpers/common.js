import axios from 'axios';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function jwtDecode(token) {
  // if (!token) {
  //   return null;
  // }
  // const base64Url = token.split(".")[1];
  // const base64 = base64Url.replace("-", "+").replace("_", "/");
  // return JSON.parse(window.atob(base64));

  return jwt.decode(token);
}

export const randomUUID = (prefix = '') => {
  return prefix + uuidv4().toString().replace(/-/gi, '');
};

export const getAddressInfo = async () => {
  const url = `https://ipinfo.io/`;
  try {
    const { data, status } = await axios.get(url);
    if (status === 200) {
      return { city: data.city || '', loc: data.loc || '', zipcode: data.postal || '', region: data.region || '' };
    } else {
      return { city: '', loc: '', zipcode: '', region: '' };
    }
  } catch (e) {
    return { city: '', loc: '', zipcode: '', region: '' };
  }
};

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
export const validUSPhone = (phoneNumber) => /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(phoneNumber?.toString().trim());
export const validPassword = (password) => typeof password === 'string' && password.length >= 6 && password.length <= 40;
export const validName = (name) => typeof name === 'string' && name.length >= 3 && name.length <= 20;
export function formatPhoneNumber(input) {
  try {
    if (!input) return input?.toString();

    const phone = parsePhoneNumberFromString(input);

    // If parsing fails → return raw input
    if (!phone) return input;

    // 👉 If USA, force US format:
    if (phone.country === 'US') {
      const national = phone.nationalNumber; // ex: "2025550198"

      if (national.length === 10) {
        return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
      }

      return national; // fallback
    }

    // 👉 All other countries: clean international format
    return phone.formatInternational();
  } catch (e) {
    return input;
  }
}
