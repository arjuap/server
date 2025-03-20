// Site configuration types
export type SiteConfig = {
    name: string;
    urlPattern: string;
    shortUrlPatterns?: string[];
    productPagePattern: string;
    alternatePatterns?: string[];
    productIdRegex: {
      primary: string;
      alternate: string;
      mobile: string;
    };
    selectors: {
      title: string;
      price: {
        primary: string;
        deals: string;
        ourPrice: string;
        salePrice: string;
      };
      image: {
        primary: string;
        fallback: string;
      };
      originalPrice: string;
      availability: string;
    };
    priceFormat: {
      removeChars: RegExp;
      decimal: string;
      currency: string;
    };
  };
  
  // Product types
  export interface ScrapedProduct {
    productId: string;
    title: string;
    price: string | number;
    image: string;
    site: string;
    url: string;
    [key: string]: any; // For any additional properties
  }
  
  export interface TransformedProduct {
    productId: string;
    title: string;
    price: string | number;
    imageUrl: string;
    site: string;
    category: string;
    url: string;
    visualObservations: {
      colors: string[];
      size: string;
      ingredients: string[];
      style: string;
      materials: string[];
      otherObservations: string[];
    };
  }
  
  // Webhook response type
  export interface WebhookResponse {
    success: boolean;
    message: string;
    data?: any;
  }