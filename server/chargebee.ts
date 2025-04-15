// Chargebee integration service

export interface ChargebeeConfig {
  site: string;
  apiKey: string;
}

export interface ChargebeeSubscription {
  id: string;
  customer_id: string;
  status: string;
  plan_id: string;
  plan_amount: number;
  currency_code: string;
  next_billing_at: number;
  created_at: number;
  started_at: number;
  updated_at: number;
  billing_period?: number;
  billing_period_unit?: string;
}

export interface ChargebeeCustomer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  created_at: number;
  updated_at: number;
}

export interface ChargebeeInvoice {
  id: string;
  subscription_id: string;
  customer_id: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  date: number;
  due_date: number;
  paid_at?: number;
  total: number;
}

// Chargebee Service Class
export class ChargebeeService {
  private apiKey: string;
  private site: string;
  private baseUrl: string;

  constructor(config: ChargebeeConfig) {
    this.apiKey = config.apiKey;
    this.site = config.site;
    this.baseUrl = `https://${this.site}.chargebee.com/api/v2`;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${this.apiKey}:`).toString('base64');
    
    const headers: HeadersInit = {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    };

    if (method !== 'GET' && data) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Chargebee API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling Chargebee API:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to fetch all pages of a particular entity type
   * Handles pagination automatically by following the next_offset
   */
  private async fetchAllPages(endpoint: string, paramName: string = ''): Promise<any[]> {
    let allResults: any[] = [];
    let hasMore = true;
    let nextOffset = '';
    let page = 1;
    
    console.log(`Starting pagination for ${endpoint}`);
    
    try {
      while (hasMore) {
        const queryParams = new URLSearchParams();
        queryParams.append('limit', '100'); // Maximum allowed by Chargebee
        if (nextOffset) {
          queryParams.append('offset', nextOffset);
        }
        
        const url = `${endpoint}?${queryParams.toString()}`;
        console.log(`Fetching page ${page} from ${url}`);
        
        let response;
        try {
          response = await this.makeRequest(url);
        } catch (error) {
          console.error(`Error fetching page ${page} from ${url}:`, error);
          // Wait a bit and try again (simple retry mechanism)
          if (page > 1) {
            console.log('Retrying after error...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
              response = await this.makeRequest(url);
              console.log('Retry successful');
            } catch (retryError) {
              console.error('Retry failed:', retryError);
              break;
            }
          } else {
            break;
          }
        }
        
        if (!response || !response.list || !Array.isArray(response.list)) {
          console.warn(`Unexpected response format from Chargebee API for ${url}`);
          break;
        }
        
        // Extract items based on param name (e.g., "subscription", "customer", "invoice")
        const items = response.list.map((item: any) => 
          paramName && item[paramName] ? item[paramName] : item
        );
        
        allResults = allResults.concat(items);
        
        // Check if there's more data to fetch
        hasMore = !!response.next_offset;
        nextOffset = response.next_offset || '';
        
        console.log(`Fetched ${items.length} items, total so far: ${allResults.length}, hasMore: ${hasMore}`);
        page++;
        
        // Safety check to prevent infinite loops but with higher limit for large data sets
        if (page > 1000) { // Increased from 50 to 1000 to allow for up to 100,000 records
          console.warn('Reached maximum page limit (1000) for pagination safety');
          break;
        }
        
        // Add a small delay between requests to avoid rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (error) {
      console.error('Error during pagination:', error);
    }
    
    console.log(`Completed pagination for ${endpoint}, total items: ${allResults.length}`);
    return allResults;
  }

  // Get all subscriptions (single page)
  async getSubscriptions(limit: number = 100, offset: string = ''): Promise<ChargebeeSubscription[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    if (offset) {
      queryParams.append('offset', offset);
    }

    const response = await this.makeRequest(`/subscriptions?${queryParams.toString()}`);
    return response.list.map((item: any) => item.subscription);
  }
  
  // Get ALL subscriptions (with automatic pagination)
  async getAllSubscriptions(): Promise<ChargebeeSubscription[]> {
    console.log('Fetching all Chargebee subscriptions with pagination');
    const subscriptions = await this.fetchAllPages('/subscriptions', 'subscription');
    console.log(`Fetched a total of ${subscriptions.length} subscriptions from Chargebee`);
    return subscriptions;
  }

  // Get subscription by ID
  async getSubscription(id: string): Promise<ChargebeeSubscription> {
    const response = await this.makeRequest(`/subscriptions/${id}`);
    return response.subscription;
  }

  // Get all customers (single page)
  async getCustomers(limit: number = 100, offset: string = ''): Promise<ChargebeeCustomer[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    if (offset) {
      queryParams.append('offset', offset);
    }

    const response = await this.makeRequest(`/customers?${queryParams.toString()}`);
    return response.list.map((item: any) => item.customer);
  }
  
  // Get ALL customers (with automatic pagination)
  async getAllCustomers(): Promise<ChargebeeCustomer[]> {
    console.log('Fetching all Chargebee customers with pagination');
    const customers = await this.fetchAllPages('/customers', 'customer');
    console.log(`Fetched a total of ${customers.length} customers from Chargebee`);
    return customers;
  }

  // Get customer by ID
  async getCustomer(id: string): Promise<ChargebeeCustomer> {
    const response = await this.makeRequest(`/customers/${id}`);
    return response.customer;
  }

  // Get all invoices (single page)
  async getInvoices(limit: number = 100, offset: string = ''): Promise<ChargebeeInvoice[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    if (offset) {
      queryParams.append('offset', offset);
    }

    const response = await this.makeRequest(`/invoices?${queryParams.toString()}`);
    return response.list.map((item: any) => item.invoice);
  }
  
  // Get ALL invoices (with automatic pagination)
  async getAllInvoices(): Promise<ChargebeeInvoice[]> {
    console.log('Fetching all Chargebee invoices with pagination');
    const invoices = await this.fetchAllPages('/invoices', 'invoice');
    console.log(`Fetched a total of ${invoices.length} invoices from Chargebee`);
    return invoices;
  }

  // Get invoice by ID
  async getInvoice(id: string): Promise<ChargebeeInvoice> {
    const response = await this.makeRequest(`/invoices/${id}`);
    return response.invoice;
  }

  // Get invoices for a specific subscription
  async getInvoicesForSubscription(subscriptionId: string): Promise<ChargebeeInvoice[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('subscription_id[is]', subscriptionId);

    const response = await this.makeRequest(`/invoices?${queryParams.toString()}`);
    return response.list.map((item: any) => item.invoice);
  }
  
  // Get non-recurring invoices for a specific customer (add-ons, one-time charges)
  async getNonRecurringInvoicesForCustomer(customerId: string): Promise<ChargebeeInvoice[]> {
    console.log(`Fetching all invoices for customer ${customerId} with pagination`);
    
    // Setup pagination parameters for the first call
    const queryParams = new URLSearchParams();
    queryParams.append('customer_id[is]', customerId);
    queryParams.append('status[is]', 'paid'); // Only get paid invoices
    queryParams.append('sort_by[asc]', 'date'); // Sort by date ascending

    // Create a specific endpoint for this customer's invoices
    const endpoint = `/invoices`;
    
    // Use our pagination helper to fetch all pages
    const allInvoices = await this.fetchAllPages(`${endpoint}?${queryParams.toString()}`, 'invoice');
    
    console.log(`Fetched ${allInvoices.length} total invoices for customer ${customerId}`);
    
    // Augment invoice data
    const processedInvoices = allInvoices.map((invoice: any) => {
      return {
        ...invoice,
        line_items: invoice.line_items || [],
        recurring: !!invoice.subscription_id // Flag to easily identify recurring vs non-recurring
      };
    });
    
    // Filter to include only non-recurring invoices
    const nonRecurringInvoices = processedInvoices.filter((invoice: any) => {
      // Consider it non-recurring if:
      // 1. No subscription_id (one-time charge)
      // 2. Has add-on line items
      return !invoice.subscription_id || (invoice.line_items && invoice.line_items.some((item: any) => 
        item.entity_type === 'addon' || !item.subscription_id
      ));
    });
    
    console.log(`Found ${nonRecurringInvoices.length} non-recurring invoices for customer ${customerId}`);
    return nonRecurringInvoices;
  }
  
  // Get current month's paid non-recurring invoices for a customer
  async getCurrentMonthNonRecurringInvoices(customerId: string): Promise<ChargebeeInvoice[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    console.log(`Fetching current month's invoices for customer ${customerId}`);
    
    // Setup pagination parameters
    const queryParams = new URLSearchParams();
    queryParams.append('customer_id[is]', customerId);
    queryParams.append('date[between]', `[${Math.floor(startOfMonth.getTime() / 1000)},${Math.floor(endOfMonth.getTime() / 1000)}]`);
    queryParams.append('status[is]', 'paid');
    queryParams.append('sort_by[asc]', 'date');

    // Create a specific endpoint for this customer's invoices in the current month
    const endpoint = `/invoices`;
    
    // Use our pagination helper to fetch all pages
    const allInvoices = await this.fetchAllPages(`${endpoint}?${queryParams.toString()}`, 'invoice');
    
    console.log(`Fetched ${allInvoices.length} total invoices for customer ${customerId} in current month`);
    
    // Augment invoice data
    const processedInvoices = allInvoices.map((invoice: any) => {
      return {
        ...invoice,
        line_items: invoice.line_items || [],
        recurring: !!invoice.subscription_id
      };
    });
    
    // Filter to include only non-recurring invoices
    const nonRecurringInvoices = processedInvoices.filter((invoice: any) => {
      // Consider it non-recurring if:
      // 1. No subscription_id (one-time charge)
      // 2. Has add-on line items
      return !invoice.subscription_id || (invoice.line_items && invoice.line_items.some((item: any) => 
        item.entity_type === 'addon' || !item.subscription_id
      ));
    });
    
    console.log(`Found ${nonRecurringInvoices.length} non-recurring invoices for customer ${customerId} in current month`);
    return nonRecurringInvoices;
  }
  
  // Get available fields for mapping for each entity type
  getAvailableFields(): Record<string, Array<{ name: string, description: string }>> {
    return {
      customer: [
        { name: 'id', description: 'Customer ID' },
        { name: 'first_name', description: 'First Name' },
        { name: 'last_name', description: 'Last Name' },
        { name: 'email', description: 'Email Address' },
        { name: 'company', description: 'Company Name' },
        { name: 'created_at', description: 'Created Date' },
        { name: 'updated_at', description: 'Last Updated Date' },
        { name: 'billing_address', description: 'Billing Address' },
        { name: 'auto_collection', description: 'Auto Collection Method' },
        { name: 'net_term_days', description: 'Payment Terms (Days)' },
        { name: 'allow_direct_debit', description: 'Allow Direct Debit' },
        { name: 'taxability', description: 'Tax Status' },
        { name: 'phone', description: 'Phone Number' },
      ],
      subscription: [
        { name: 'id', description: 'Subscription ID' },
        { name: 'customer_id', description: 'Customer ID' },
        { name: 'status', description: 'Subscription Status' },
        { name: 'plan_id', description: 'Plan ID' },
        { name: 'plan_amount', description: 'Plan Amount' },
        { name: 'currency_code', description: 'Currency' },
        { name: 'next_billing_at', description: 'Next Billing Date' },
        { name: 'created_at', description: 'Created Date' },
        { name: 'started_at', description: 'Start Date' },
        { name: 'updated_at', description: 'Last Updated Date' },
        { name: 'billing_period', description: 'Billing Period' },
        { name: 'billing_period_unit', description: 'Billing Period Unit' },
        { name: 'plan_quantity', description: 'Quantity' },
        { name: 'trial_start', description: 'Trial Start Date' },
        { name: 'trial_end', description: 'Trial End Date' },
      ],
      invoice: [
        { name: 'id', description: 'Invoice ID' },
        { name: 'subscription_id', description: 'Subscription ID' },
        { name: 'customer_id', description: 'Customer ID' },
        { name: 'status', description: 'Invoice Status' },
        { name: 'amount', description: 'Amount' },
        { name: 'amount_paid', description: 'Amount Paid' },
        { name: 'amount_due', description: 'Amount Due' },
        { name: 'date', description: 'Invoice Date' },
        { name: 'due_date', description: 'Due Date' },
        { name: 'paid_at', description: 'Payment Date' },
        { name: 'total', description: 'Total Amount' },
        { name: 'recurring', description: 'Is Recurring' },
        { name: 'first_invoice', description: 'Is First Invoice' },
        { name: 'has_advance_charges', description: 'Has Advance Charges' },
      ]
    };
  }
}

// Initialize chargebee service
export const initChargebeeService = (): ChargebeeService | null => {
  const apiKey = process.env.CHARGEBEE_API_KEY;
  const site = process.env.CHARGEBEE_SITE || 'getreelo';

  if (!apiKey) {
    console.error('Chargebee API key not found. Set CHARGEBEE_API_KEY environment variable.');
    return null;
  }

  return new ChargebeeService({ apiKey, site });
};

// Export singleton instance
export const chargebeeService = initChargebeeService();