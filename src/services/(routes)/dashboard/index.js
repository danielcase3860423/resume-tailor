import BaseApiProvider from '@/services/(routes)/BaseApiProvider';
import { AxiosError } from 'axios';
import authHeader from '@/helpers/auth-header';
import config from '@/services/(routes)/config';
import { ERROR_FAILED } from '@/config/constants';

const API_URL = config.baseApiUrl + 'dashboard/';

class DashboardService extends BaseApiProvider {
  _afterResponse(response) {
    return response;
  }

  _responseError(error) {
    if (error instanceof AxiosError) {
      return error.response;
    }

    throw error;
  }

  async getSummary({ preset = 'this_month', startDate = '', endDate = '' } = {}) {
    return await this.api
      .get(`${API_URL}summary?preset=${preset}&startDate=${startDate}&endDate=${endDate}`, {
        headers: authHeader()
      })
      .then((response) => {
        const { data, status } = response;
        if ([200, 201].includes(status)) {
          return data;
        }
      })
      .catch(({ response }) => {
        if (!response) {
          return { error: ERROR_FAILED, msg: 'ERROR-OCCUR' };
        }

        const { data, status } = response;
        if ([400, 401].includes(status)) {
          return { error: ERROR_FAILED, msg: data.msg || '' };
        }

        return { error: ERROR_FAILED, msg: 'ERROR-OCCUR' };
      });
  }
}

const dashboardService = new DashboardService();
export default dashboardService;
