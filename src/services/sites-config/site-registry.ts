import { SiteConfig } from '../../types';
import { amazonConfig } from './amazon';
import { targetConfig } from './target';
import { walmartConfig } from './walmart';

export const siteConfigs: SiteConfig[] = [
  amazonConfig,
  targetConfig,
  walmartConfig
];