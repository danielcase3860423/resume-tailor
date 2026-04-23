import axiosProvider from "./axiosProvider";

class CoreApi {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    options = {
      headers: {
        "Create-By": "admin@peragreemsolutions.com",
      },
    };
    this.api = axiosProvider(`${this.baseUrl}`, options);

    this.setInterceptors({
      beforeRequest: this._beforeRequest,
      requestError: this._requestError,
      afterResponse: this._afterResponse,
      responseError: this._responseError,
    });
  }

  setInterceptors({
    beforeRequest,
    requestError,
    afterResponse,
    responseError,
  }) {
    this.api.interceptors.request.use(beforeRequest, requestError);
    this.api.interceptors.response.use(afterResponse, responseError);
  }

  _beforeRequest(config) {
    return config;
  }

  _requestError(error) {
    throw error;
  }

  _afterResponse(response) {
    return response.data || response;
  }

  _responseError(error) {
    throw error;
  }
}

module.exports = CoreApi;
