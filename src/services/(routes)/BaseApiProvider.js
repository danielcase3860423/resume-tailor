import CoreApi from './CoreApi';
import config from './config';

class BaseApiProvider extends CoreApi {
  constructor() {
    super(config.baseUrl);
  }
}

export default BaseApiProvider;
