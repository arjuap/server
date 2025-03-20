import { SiteConfig, ScrapedProduct } from '../../types';
import { siteConfigs } from '../sites-config/site-registry';

export class ProductScraperService {
  public static identifySite(url: string): SiteConfig | null {
    // First check for the main URL pattern
    const config = siteConfigs.find(config => url.includes(config.urlPattern));
    if (config) return config;
    
    // If not found, check for shortened URL patterns
    const configByShortUrl = siteConfigs.find(config => 
      config.shortUrlPatterns?.some(pattern => url.includes(pattern))
    );
    
    return configByShortUrl || null;
  }

  public static isProductPage(url: string, config: SiteConfig): boolean {
    console.log('Checking if product page:', {
      url,
      pattern: config.productPagePattern,
      alternatePatterns: config.alternatePatterns
    });

    const primaryRegex = new RegExp(config.productPagePattern);
    if (primaryRegex.test(url)) return true;

    if (config.alternatePatterns) {
      return config.alternatePatterns.some(pattern => {
        const regex = new RegExp(pattern);
        return regex.test(url);
      });
    }

    return false;
  }

  public static extractProductId(url: string, config: SiteConfig): string | null {
    // Try primary pattern first
    const primaryMatch = url.match(new RegExp(config.productIdRegex.primary));
    if (primaryMatch) return primaryMatch[1];

    // Try alternate patterns
    const alternateMatch = url.match(new RegExp(config.productIdRegex.alternate));
    if (alternateMatch) return alternateMatch[1];

    // Try mobile pattern
    const mobileMatch = url.match(new RegExp(config.productIdRegex.mobile));
    if (mobileMatch) return mobileMatch[1];

    return null;
  }

  public static formatPrice(price: string | null | undefined, config: SiteConfig): string {
    if (!price) return 'N/A';
    
    const cleanPrice = price.replace(config.priceFormat.removeChars, '');
    if (!cleanPrice || isNaN(parseFloat(cleanPrice))) return 'N/A';
    
    return `${config.priceFormat.currency}${parseFloat(cleanPrice).toFixed(2)}`;
  }
}