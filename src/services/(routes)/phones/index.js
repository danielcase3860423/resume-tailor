import BaseApiProvider from '@/services/(routes)/BaseApiProvider';
import { AxiosError } from 'axios';
import authHeader from '@/helpers/auth-header';
import config from '@/services/(routes)/config';
import { ERROR_FAILED } from '@/config/constants';

const API_URL = config.baseApiUrl + `phones/`;

class PhoneService extends BaseApiProvider {
  // Return full response instead of just data
  _afterResponse(response) {
    return response;
  }

  _responseError(error) {
    if (error instanceof AxiosError) {
      return error.response;
    } else {
      throw error;
    }
  }

  async getPhoneNumbers() {
    return await this.api
      .get(API_URL + `get`)
      .then((response) => {
        const { data, status } = response;
        if ([200, 201].includes(status)) {
          return data;
        }
      })
      .catch(({ response }) => {
        if (!response) {
          return { error: ERROR_FAILED, msg: 'ERROR-OCCUR' };
        } else {
          const { data, status } = response;
          if ([401].includes(status)) {
            return { error: ERROR_FAILED, msg: data.msg || '' };
          }
        }
      });
  }

  // ✅ Create a new phone
  async createPhoneNumber(params) {
    return await this.api
      .post(API_URL + `create`, params, { headers: authHeader() })
      .then(({ data, status }) => ([200, 201].includes(status) ? data : null))
      .catch(({ response }) => this._handleError(response));
  }

  // ✅ Update phone (PUT /phones/:id)
  async updatePhoneNumber(id, params) {
    return await this.api
      .put(API_URL + `${id}`, params, { headers: authHeader() })
      .then(({ data, status }) => ([200, 201].includes(status) ? data : null))
      .catch(({ response }) => this._handleError(response));
  }

  // ✅ Delete phone (DELETE /phones/:id)
  async deletePhoneNumber(id) {
    return await this.api
      .delete(API_URL + `${id}`, { headers: authHeader() })
      .then(({ data, status }) => ([200, 201].includes(status) ? data : null))
      .catch(({ response }) => this._handleError(response));
  }
}

const phoneService = new PhoneService();
export default phoneService;
