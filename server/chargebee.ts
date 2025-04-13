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