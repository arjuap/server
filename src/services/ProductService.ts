import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../config/auth-config';
import { ScrapedProduct, TransformedProduct } from '../types';

export class ProductService {
  baseUrl: string;
  private _authToken: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this._authToken = '';
  }

  // Set auth token
  setAuthToken(token: string) {
    this._authToken = token;
  }

  // Helper to get headers with auth token
  async getAuthHeaders() {
    if (!this._authToken) {
      throw new Error('Auth token not set. Please authenticate first.');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this._authToken}`
    };
  }

  // Get category from API instead of simple string matching
  async categorizeProduct(productTitle: string): Promise<string> {
    try {
      console.log('Requesting category for product:', productTitle);
      const promptText = `Categorize this product into one of the following categories: Appliances, Electronics, Household Essentials, Home, Furniture & Kitchen, Clothing, Beauty & Personal Care, Sports, Toys & Games, Books, Food & Grocery, Health & Wellness, Automotive, Pet Supplies, Office Products, Baby, Tools & Home Improvement, Jewelry, Garden & Outdoor, Art & Crafts, Movies & TV, Music
Important categorization rules:
- For footwear products (sneakers, boots, sandals, etc.), use the "Shoes" category even if they could fit other categories like "Sports"
- For toy cars, models, or playsets, always use "Toys" regardless of the theme
- For actual vehicles or automotive parts, use "Automotive"
- When multiple categories could apply, choose the most specific category`;
      const headers = await this.getAuthHeaders();
      const response = await axios.post(
        `${this.baseUrl}/api/categorize`,
        {
          product: productTitle,
          prompt: promptText
        },
        { headers, withCredentials: true }
      );
      console.log('Categorization API response:', response.data);
      let category = response.data.category;
      // Post-process the category if needed
      if (category === 'Gro') {
        category = 'Groceries';
      }
      return category;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error categorizing product:', 
        axiosError.response?.status, 
        axiosError.response?.data
      );
      // Fallback to simple inference if API fails
      return this.inferCategoryFallback(productTitle);
    }
  }

  // Fallback to simple string matching if API fails
  inferCategoryFallback(title: string): string {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('food') || titleLower.includes('snack') ||
        titleLower.includes('chocolate') || titleLower.includes('nutrition') ||
        titleLower.includes('protein') || titleLower.includes('milk') ||
        titleLower.includes('drink') || titleLower.includes('beverage')) {
      return 'Food & Grocery';
    } else if (titleLower.includes('book') || titleLower.includes('novel') ||
               titleLower.includes('paperback') || titleLower.includes('hardcover')) {
      return 'Books';
    } else if (titleLower.includes('shirt') || titleLower.includes('pants') ||
               titleLower.includes('jacket') || titleLower.includes('shoes') ||
               titleLower.includes('apparel') || titleLower.includes('wear')) {
      return 'Clothing';
    } else if (titleLower.includes('phone') || titleLower.includes('laptop') ||
               titleLower.includes('computer') || titleLower.includes('tablet') ||
               titleLower.includes('electronic') || titleLower.includes('gadget')) {
      return 'Electronics';
    } else if (titleLower.includes('toy') || titleLower.includes('game') ||
               titleLower.includes('puzzle') || titleLower.includes('play')) {
      return 'Toys & Games';
    }
    return 'Miscellaneous';
  }

  // Transform scraped data to match API expected format
  async transformScrapedData(scrapedProduct: ScrapedProduct): Promise<TransformedProduct> {
    // Get category from API
    const category = await this.categorizeProduct(scrapedProduct.title);
    return {
      productId: scrapedProduct.productId,
      title: scrapedProduct.title,
      price: scrapedProduct.price,
      imageUrl: scrapedProduct.image,
      site: scrapedProduct.site,
      category: category,
      url: scrapedProduct.url,
      visualObservations: {
        colors: [],
        size: '',
        ingredients: [],
        style: '',
        materials: [],
        otherObservations: []
      }
    };
  }

  // Store product in database with retry logic
  async storeProduct(scrapedProduct: ScrapedProduct, retryCount = 3): Promise<any> {
    try {
      console.log('Preparing to store product:', scrapedProduct);
      const transformedProduct = await this.transformScrapedData(scrapedProduct);
      console.log('Transformed product data:', transformedProduct);
      const headers = await this.getAuthHeaders();
      
      const response = await axios.post(
        `${this.baseUrl}/api/updateProductCatalogandViewedProductHistory`,
        {
          products: [transformedProduct]
        },
        {
          headers,
          withCredentials: true
        }
      );
      console.log('Product storage response:', response.data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error storing product:', 
        axiosError.response?.status, 
        axiosError.response?.data
      );
      
      // Retry logic for specific errors (server overload, network issues)
      if (retryCount > 0 && (
        !axiosError.response || // Network error
        axiosError.response.status >= 500 || // Server error
        axiosError.response.status === 429 // Rate limit
      )) {
        console.log(`Retrying product storage. Attempts remaining: ${retryCount-1}`);
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retryCount)));
        return this.storeProduct(scrapedProduct, retryCount - 1);
      }
      
      throw error;
    }
  }

  // Get user's stored products
  async getUserProducts() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(
        `${this.baseUrl}/api/getUserProductHistory`,
        {
          headers,
          withCredentials: true
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching user products:', error);
      throw error;
    }
  }
}

export const productService = new ProductService();