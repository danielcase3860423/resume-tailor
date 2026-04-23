import BaseApiProvider from '@/services/(routes)/BaseApiProvider';
import { AxiosError } from 'axios';
import authHeader from '@/helpers/auth-header';
import config from '@/services/(routes)/config';
import { ERROR_FAILED } from '@/config/constants';

const API_URL = config.baseApiUrl + `jobs/`;

class JobsService extends BaseApiProvider {
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

  async syncJobs(keywords = '') {
    return await this.api
      .get(API_URL + `sync`, { headers: authHeader(), params: { keywords } })
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

  async getJobs({ currentPage, limit, company = '', title = '', extension = '' }) {
    return await this.api
      .get(API_URL + `get?page=${currentPage}&limit=${limit}&company=${company}&title=${title}&extension=${extension}`)
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

  async deleteJob(id) {
    return await this.api
      .delete(API_URL + `${id}`, { headers: authHeader() })
      .then(({ data, status }) => ([200, 201].includes(status) ? data : null))
      .catch(({ response }) => this._handleError(response));
  }
}

const jobsService = new JobsService();
export default jobsService;
