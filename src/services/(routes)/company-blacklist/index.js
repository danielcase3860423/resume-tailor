import BaseApiProvider from '@/services/(routes)/BaseApiProvider';
import authHeader from '@/helpers/auth-header';
import config from '@/services/(routes)/config';
import { ERROR_FAILED } from '@/config/constants';

const API_URL = config.baseApiUrl + 'company-blacklist';

class CompanyBlacklistService extends BaseApiProvider {
  _handleError(response) {
    if (!response) {
      return { error: ERROR_FAILED, msg: 'ERROR-OCCUR' };
    }

    const { data, status } = response;
    if ([401, 403].includes(status)) {
      return { error: ERROR_FAILED, msg: data?.msg || 'Permission denied' };
    }

    return { error: ERROR_FAILED, msg: data?.msg || 'Request failed' };
  }

  async getCompanies() {
    return await this.api
      .get(API_URL, { headers: authHeader() })
      .then(({ data, status }) => ([200, 201].includes(status) ? data : null))
      .catch(({ response }) => this._handleError(response));
  }

  async createCompany(params) {
    return await this.api
      .post(API_URL, params, { headers: authHeader() })
      .then(({ data, status }) => ([200, 201].includes(status) ? data : null))
      .catch(({ response }) => this._handleError(response));
  }

  async createCompaniesBulk(params) {
    return this.createCompany(params);
  }

  async updateCompany(id, params) {
    return await this.api
      .put(`${API_URL}/${id}`, params, { headers: authHeader() })
      .then(({ data, status }) => ([200, 201].includes(status) ? data : null))
      .catch(({ response }) => this._handleError(response));
  }

  async deleteCompany(id) {
    return await this.api
      .delete(`${API_URL}/${id}`, { headers: authHeader() })
      .then(({ data, status }) => ([200, 201].includes(status) ? data : null))
      .catch(({ response }) => this._handleError(response));
  }
}

const companyBlacklistService = new CompanyBlacklistService();
export default companyBlacklistService;
