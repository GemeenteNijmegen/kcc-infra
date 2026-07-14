import { AppParameter } from '../../constructs/AppParameter';
import { Statics } from '../../Statics';


export const ENTERPRISE_SEARCH_ENGINE = 'kiss-engine';

/**
 * This parameter is filled manually by connecting to the EC2 instance
 * and following the steps in src/elasticsearch/get-enterprise-search-password.sh
 * TODO figure out how this should be done in prod.
 */
export const ENTERPRISE_SEARCH_PRIVATE_API_KEY = new AppParameter({
  type: 'secret',
  id: 'kcc-enterprise-search-private-api-key',
  description: 'Enterprise Search private API key (used by kiss, sync, and ES constructs). Note: this should be set manually, see IaC for docs.',
  path: `/${Statics.projectName}/kiss/elastic/enterprise-search-private-api-key`,
});