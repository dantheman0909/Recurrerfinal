import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import { storage } from './storage';

// ChargebeeService configuration interface
interface ChargebeeConfig {
  site: string;
  apiKey: string;
}

/**
 * A service for interacting with the Chargebee API
 */
export class ChargebeeService {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: ChargebeeConfig) {
    this.baseUrl = `https://${config.site}.chargebee.com/api/v2`;
    this.authHeader = `Basic ${Buffer.from(config.apiKey + ':').toString('base64')}`;
  }

  /**
   * Helper method to make authenticated requests to the Chargebee API
   */
  private async request<T>(endpoint: string, method = 'GET', data?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    const options = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chargebee API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json() as T;
  }

  /**
   * Get a list of customers from Chargebee
   */
  async getCustomers(limit = 10): Promise<any[]> {
    const response: any = await this.request(`/customers?limit=${limit}`);
    return response.list.map((item: any) => item.customer);
  }

  /**
   * Get a list of subscriptions from Chargebee
   */
  async getSubscriptions(limit = 10): Promise<any[]> {
    const response: any = await this.request(`/subscriptions?limit=${limit}`);
    return response.list.map((item: any) => item.subscription);
  }

  /**
   * Get a list of invoices from Chargebee
   */
  async getInvoices(limit = 10): Promise<any[]> {
    const response: any = await this.request(`/invoices?limit=${limit}`);
    return response.list.map((item: any) => item.invoice);
  }

  /**
   * Get a customer by ID
   */
  async getCustomer(customerId: string): Promise<any> {
    const response: any = await this.request(`/customers/${customerId}`);
    return response.customer;
  }

  /**
   * Get a subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    const response: any = await this.request(`/subscriptions/${subscriptionId}`);
    return response.subscription;
  }

  /**
   * Get an invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<any> {
    const response: any = await this.request(`/invoices/${invoiceId}`);
    return response.invoice;
  }

  /**
   * Get invoices for a subscription
   */
  async getInvoicesForSubscription(subscriptionId: string): Promise<any[]> {
    const response: any = await this.request(`/invoices?subscription_id[is]=${subscriptionId}`);
    return response.list.map((item: any) => item.invoice);
  }
}

/**
 * Get a singleton instance of the ChargebeeService
 * Throws an error if Chargebee is not configured
 */
export async function getChargebeeService(): Promise<ChargebeeService> {
  const config = await storage.getChargebeeConfig();
  
  if (!config) {
    throw new Error('Chargebee not configured');
  }
  
  return new ChargebeeService({
    site: config.site,
    apiKey: config.api_key
  });
}