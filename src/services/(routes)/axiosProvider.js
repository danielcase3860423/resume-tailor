import axios from 'axios';

const defaultOptions = {};

function axiosProvider(baseUrl, options) {
  return axios.create({
    baseURL: baseUrl,
    headers: {
      // MyCustomHeader1: '1',
    },
    ...defaultOptions,
    ...options,
  });
}

module.exports = axiosProvider;
