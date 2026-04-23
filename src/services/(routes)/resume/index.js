import BaseApiProvider from '@/services/(routes)/BaseApiProvider';
import { AxiosError } from 'axios';
import config from '@/services/(routes)/config';
import authHeader from '@/helpers/auth-header';
import { ERROR_FAILED } from '@/config/constants';

const API_URL = config.baseApiUrl + `resume/`;

class ResumeService extends BaseApiProvider {
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

  async getResumes({
    currentPage,
    limit,
    sortBy,
    sortOrder,
    startDate = '',
    endDate = '',
    companyName = '',
    profileId = '',
    profileName = '',
    description = '',
    associatedUserId = ''
  }) {
    return await this.api
      .get(
        API_URL +
          `get-resumes?page=${currentPage}&limit=${limit}&sortBy=${sortBy}&order=${sortOrder}` +
          `&startDate=${startDate}&endDate=${endDate}&companyName=${companyName}&profileId=${profileId}&profileName=${encodeURIComponent(profileName)}` +
          `&description=${description}&associatedUserId=${associatedUserId}`,
        { headers: authHeader() }
      )
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
}

const resumeService = new ResumeService();
export default resumeService;
