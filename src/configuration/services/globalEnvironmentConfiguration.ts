import { AppParameter } from '../../constructs/AppParameter';
import { Statics } from '../../Statics';


export const ENTERPRISE_SEARCH_ENGINE = 'kiss-engine';

export const ENTERPRISE_SEARCH_PRIVATE_API_KEY = new AppParameter({
  type: 'secret',
  id: 'kcc-enterprise-search-private-api-key',
  description: 'Enterprise Search private API key (used by kiss, sync, and ES constructs)',
  path: `/${Statics.projectName}/kiss/elastic/enterprise-search-private-api-key-shared`,
});