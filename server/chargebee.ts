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
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || response.statusText;
        
        // Handle authentication errors specifically
        if (response.status === 401) {
          throw new Error(`Chargebee API authentication failed: Invalid API key or site name`);
        } else if (response.status === 403) {
          throw new Error(`Chargebee API authorization failed: Insufficient permissions`);
        } else {
          throw new Error(`Chargebee API error (${response.status}): ${errorMessage}`);
        }
      }

      return await response.json();
    } catch (error: any) {
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error(`Cannot connect to Chargebee: Please check your network connection and site name`);
      }
      
      console.error('Error calling Chargebee API:', error);
      throw error;
    }
  }

  // Get all subscriptions
  async getSubscriptions(limit: number = 100, offset: string = ''): Promise<ChargebeeSubscription[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    if (offset) {
      queryParams.append('offset', offset);
    }

    const response = await this.makeRequest(`/subscriptions?${queryParams.toString()}`);
    return response.list.map((item: any) => item.subscription);
  }

  // Get subscription by ID
  async getSubscription(id: string): Promise<ChargebeeSubscription> {
    const response = await this.makeRequest(`/subscriptions/${id}`);
    return response.subscription;
  }

  // Get all customers
  async getCustomers(limit: number = 100, offset: string = ''): Promise<ChargebeeCustomer[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    if (offset) {
      queryParams.append('offset', offset);
    }

    const response = await this.makeRequest(`/customers?${queryParams.toString()}`);
    return response.list.map((item: any) => item.customer);
  }

  // Get customer by ID
  async getCustomer(id: string): Promise<ChargebeeCustomer> {
    const response = await this.makeRequest(`/customers/${id}`);
    return response.customer;
  }

  // Get all invoices
  async getInvoices(limit: number = 100, offset: string = ''): Promise<ChargebeeInvoice[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    if (offset) {
      queryParams.append('offset', offset);
    }

    const response = await this.makeRequest(`/invoices?${queryParams.toString()}`);
    return response.list.map((item: any) => item.invoice);
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
  const site = process.env.CHARGEBEE_SITE;

  if (!apiKey) {
    console.warn('Chargebee API key not found. Set CHARGEBEE_API_KEY environment variable.');
    return null;
  }

  if (!site) {
    console.warn('Chargebee site not found. Set CHARGEBEE_SITE environment variable.');
    return null;
  }

  console.log(`Initializing Chargebee service with site: ${site}`);
  return new ChargebeeService({ apiKey, site });
};

// Export singleton instance
export const chargebeeService = initChargebeeService();