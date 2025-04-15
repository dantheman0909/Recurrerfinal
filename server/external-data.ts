import { Request, Response } from "express";
import { chargebeeService } from "./chargebee";
import { mysqlService } from "./mysql-service";
import { log } from "./vite";
import { db } from "./db";
import { customers, chargebeeInvoices } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { chargebeeSyncService } from "./chargebee-sync-service";

// Chargebee Routes
export const getChargebeeSubscriptions = async (req: Request, res: Response) => {
  try {
    if (!chargebeeService) {
      return res.status(500).json({ error: "Chargebee service not initialized" });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset as string || '';
    
    const subscriptions = await chargebeeService.getSubscriptions(limit, offset);
    res.json(subscriptions);
  } catch (error) {
    log(`Error fetching Chargebee subscriptions: ${error}`, 'chargebee');
    res.status(500).json({ error: "Failed to fetch subscriptions", details: error });
  }
};

export const getChargebeeSubscription = async (req: Request, res: Response) => {
  try {
    if (!chargebeeService) {
      return res.status(500).json({ error: "Chargebee service not initialized" });
    }
    
    const id = req.params.id;
    const subscription = await chargebeeService.getSubscription(id);
    
    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }
    
    res.json(subscription);
  } catch (error) {
    log(`Error fetching Chargebee subscription: ${error}`, 'chargebee');
    res.status(500).json({ error: "Failed to fetch subscription", details: error });
  }
};

export const getChargebeeCustomers = async (req: Request, res: Response) => {
  try {
    if (!chargebeeService) {
      return res.status(500).json({ error: "Chargebee service not initialized" });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset as string || '';
    
    const customers = await chargebeeService.getCustomers(limit, offset);
    res.json(customers);
  } catch (error) {
    log(`Error fetching Chargebee customers: ${error}`, 'chargebee');
    res.status(500).json({ error: "Failed to fetch customers", details: error });
  }
};

export const getChargebeeCustomer = async (req: Request, res: Response) => {
  try {
    if (!chargebeeService) {
      return res.status(500).json({ error: "Chargebee service not initialized" });
    }
    
    const id = req.params.id;
    const customer = await chargebeeService.getCustomer(id);
    
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    res.json(customer);
  } catch (error) {
    log(`Error fetching Chargebee customer: ${error}`, 'chargebee');
    res.status(500).json({ error: "Failed to fetch customer", details: error });
  }
};

export const getChargebeeInvoices = async (req: Request, res: Response) => {
  try {
    if (!chargebeeService) {
      return res.status(500).json({ error: "Chargebee service not initialized" });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset as string || '';
    
    const invoices = await chargebeeService.getInvoices(limit, offset);
    res.json(invoices);
  } catch (error) {
    log(`Error fetching Chargebee invoices: ${error}`, 'chargebee');
    res.status(500).json({ error: "Failed to fetch invoices", details: error });
  }
};

export const getChargebeeInvoice = async (req: Request, res: Response) => {
  try {
    if (!chargebeeService) {
      return res.status(500).json({ error: "Chargebee service not initialized" });
    }
    
    const id = req.params.id;
    const invoice = await chargebeeService.getInvoice(id);
    
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    
    res.json(invoice);
  } catch (error) {
    log(`Error fetching Chargebee invoice: ${error}`, 'chargebee');
    res.status(500).json({ error: "Failed to fetch invoice", details: error });
  }
};

export const getInvoicesForSubscription = async (req: Request, res: Response) => {
  try {
    if (!chargebeeService) {
      return res.status(500).json({ error: "Chargebee service not initialized" });
    }
    
    const id = req.params.id;
    const invoices = await chargebeeService.getInvoicesForSubscription(id);
    res.json(invoices);
  } catch (error) {
    log(`Error fetching invoices for subscription: ${error}`, 'chargebee');
    res.status(500).json({ error: "Failed to fetch invoices for subscription", details: error });
  }
};

export const getNonRecurringInvoicesForCustomer = async (req: Request, res: Response) => {
  try {
    if (!chargebeeService) {
      return res.status(500).json({ error: "Chargebee service not initialized" });
    }
    
    const id = req.params.id;
    const force = req.query.force === 'true';
    
    // First try to get the customer to check for cached data
    // This is a compromise - we don't have separate invoice caching yet
    // But we can at least check if the customer data is cached recently
    const customerId = parseInt(req.query.customer_id as string);
    let useCache = false;
    let cacheAge = null;
    
    if (customerId && !force) {
      try {
        const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
        
        if (customer && customer.updated_from_chargebee_at instanceof Date) {
          const cacheAge = Date.now() - customer.updated_from_chargebee_at.getTime();
          const CACHE_FRESHNESS_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
          
          // If we have fresh customer data, we can assume invoices are fresh too
          useCache = cacheAge < CACHE_FRESHNESS_THRESHOLD_MS;
        }
      } catch (dbError) {
        log(`Error checking customer cache: ${dbError}`, 'chargebee');
        // Continue with API call if we can't check cache
      }
    }
    
    // For now, we'll still use the API since we don't have invoice caching yet
    // But we're prepared to use cache in the future
    const invoices = await chargebeeService.getNonRecurringInvoicesForCustomer(id);
    
    // Add metadata about data source
    const response = {
      data: invoices,
      meta: {
        source: 'api',
        cache_status: useCache ? 'available_but_not_used_yet' : 'not_available',
        cache_age: cacheAge
      }
    };
    
    res.json(response.data); // For now, just return the data for backward compatibility
  } catch (error) {
    log(`Error fetching non-recurring invoices: ${error}`, 'chargebee');
    res.status(500).json({ error: "Failed to fetch non-recurring invoices", details: error });
  }
};

export const getCurrentMonthNonRecurringInvoices = async (req: Request, res: Response) => {
  try {
    if (!chargebeeService) {
      return res.status(500).json({ error: "Chargebee service not initialized" });
    }
    
    const id = req.params.id;
    const force = req.query.force === 'true';
    
    // First try to get the customer to check for cached data
    // This is a compromise - we don't have separate invoice caching yet
    // But we can at least check if the customer data is cached recently
    const customerId = parseInt(req.query.customer_id as string);
    let useCache = false;
    let cacheAge = null;
    
    if (customerId && !force) {
      try {
        const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
        
        if (customer && customer.updated_from_chargebee_at instanceof Date) {
          const cacheAge = Date.now() - customer.updated_from_chargebee_at.getTime();
          const CACHE_FRESHNESS_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
          
          // If we have fresh customer data, we can assume invoices are fresh too
          useCache = cacheAge < CACHE_FRESHNESS_THRESHOLD_MS;
        }
      } catch (dbError) {
        log(`Error checking customer cache: ${dbError}`, 'chargebee');
        // Continue with API call if we can't check cache
      }
    }
    
    // For now, we'll still use the API since we don't have invoice caching yet
    // But we're prepared to use cache in the future
    const invoices = await chargebeeService.getCurrentMonthNonRecurringInvoices(id);
    
    // Add metadata about data source
    const response = {
      data: invoices,
      meta: {
        source: 'api',
        cache_status: useCache ? 'available_but_not_used_yet' : 'not_available',
        cache_age: cacheAge
      }
    };
    
    res.json(response.data); // For now, just return the data for backward compatibility
  } catch (error) {
    log(`Error fetching current month non-recurring invoices: ${error}`, 'chargebee');
    res.status(500).json({ error: "Failed to fetch current month non-recurring invoices", details: error });
  }
};

// Customer-specific external data
export const getCustomerExternalData = async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.id);
    const force = req.query.force === 'true'; // Optional parameter to force API refresh
    
    // Get the customer from the database
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
    
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    const externalData: any = {
      chargebee: null,
      mysql: null
    };
    
    // Define cache freshness threshold (24 hours)
    const CACHE_FRESHNESS_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    // Get Chargebee data if we have a Chargebee customer ID
    if (customer.chargebee_customer_id) {
      // Check if we have cached data in the database and it's fresh enough
      const hasCachedChargebeeData = customer.updated_from_chargebee_at instanceof Date;
      const isCacheStale = !hasCachedChargebeeData || 
                           (Date.now() - customer.updated_from_chargebee_at.getTime() > CACHE_FRESHNESS_THRESHOLD_MS);
      
      // Decide whether to use cached data or fetch from API
      const shouldUseAPI = force || isCacheStale || !hasCachedChargebeeData;
      
      // Initialize Chargebee data object
      externalData.chargebee = { 
        customer: null,
        subscription: null,
        invoices: null,
        data_source: shouldUseAPI ? 'api' : 'cached',
        last_updated: customer.updated_from_chargebee_at || null
      };
      
      // Only call Chargebee API if necessary
      if (shouldUseAPI && chargebeeService) {
        try {
          const chargebeeCustomer = await chargebeeService.getCustomer(customer.chargebee_customer_id);
          externalData.chargebee.customer = chargebeeCustomer;
          
          // If we have a subscription ID, get that data too
          if (customer.chargebee_subscription_id) {
            const subscription = await chargebeeService.getSubscription(customer.chargebee_subscription_id);
            const invoices = await chargebeeService.getInvoicesForSubscription(customer.chargebee_subscription_id);
            externalData.chargebee.subscription = subscription;
            externalData.chargebee.invoices = invoices;
          }
          
          // Update the cache timestamp for this customer
          await db.update(customers)
            .set({ updated_from_chargebee_at: new Date() })
            .where(eq(customers.id, customer.id));
        } catch (chargebeeError) {
          log(`Error fetching Chargebee data for customer ${customerId}: ${chargebeeError}`, 'chargebee');
          externalData.chargebee.error = "Failed to fetch Chargebee data";
          
          // If we failed to get fresh data, include a special flag
          externalData.chargebee.api_error = true;
          
          // If we have cached data, fall back to it even if stale
          if (hasCachedChargebeeData) {
            externalData.chargebee.data_source = 'stale_cache';
            externalData.chargebee.fallback_to_cached = true;
            
            // Build a basic customer object from our local data
            externalData.chargebee.customer = {
              id: customer.chargebee_customer_id,
              first_name: customer.name ? customer.name.split(' ')[0] : '',
              last_name: customer.name ? customer.name.split(' ').slice(1).join(' ') : '',
              email: customer.contact_email || '',
              company: customer.name || '',
              mrr: customer.mrr || 0,
              arr: customer.arr || 0,
              // Add any other cached fields that we have
            };
          }
        }
      } else {
        // Using cached data - build a Chargebee-like object from our database fields
        externalData.chargebee.customer = {
          id: customer.chargebee_customer_id,
          first_name: customer.name ? customer.name.split(' ')[0] : '',
          last_name: customer.name ? customer.name.split(' ').slice(1).join(' ') : '',
          email: customer.contact_email || '',
          company: customer.name || '',
          mrr: customer.mrr || 0,
          arr: customer.arr || 0,
          // Add any other fields that we're caching
        };
        
        if (customer.chargebee_subscription_id) {
          externalData.chargebee.subscription = {
            id: customer.chargebee_subscription_id,
            customer_id: customer.chargebee_customer_id,
            status: customer.subscription_status || 'active',
            plan_id: customer.plan_id || '',
            plan_amount: customer.mrr || 0,
            // Add any other subscription fields we're caching
          };
        }
      }
    }
    
    // Get MySQL data if we have a MySQL company ID
    if (customer.mysql_company_id) {
      // Check if we have cached data in the database and it's fresh enough
      const hasCachedMySQLData = customer.updated_from_mysql_at instanceof Date;
      const isCacheStale = !hasCachedMySQLData || 
                          (Date.now() - customer.updated_from_mysql_at.getTime() > CACHE_FRESHNESS_THRESHOLD_MS);
      
      // Decide whether to use cached data or fetch from API
      const shouldUseAPI = force || isCacheStale || !hasCachedMySQLData;
      
      // Initialize MySQL data object
      externalData.mysql = { 
        company: null,
        data_source: shouldUseAPI ? 'api' : 'cached',
        last_updated: customer.updated_from_mysql_at || null
      };
      
      // Only call MySQL service if necessary
      if (shouldUseAPI && mysqlService) {
        try {
          const mysqlCompany = await mysqlService.getCompanyDataById(customer.mysql_company_id);
          externalData.mysql.company = mysqlCompany;
          
          // Sync MySQL data to customer record
          if (mysqlCompany) {
            await db.update(customers)
              .set({
                name: mysqlCompany.company_name, // Update name from MySQL
                currency_code: 'INR', // Default currency is INR for MySQL data
                active_stores: mysqlCompany.active_stores,
                growth_subscription_count: mysqlCompany.growth_subscription_count,
                loyalty_active_store_count: mysqlCompany.loyalty_active_store_count,
                loyalty_inactive_store_count: mysqlCompany.loyalty_inactive_store_count,
                loyalty_active_channels: mysqlCompany.loyalty_active_channels,
                loyalty_channel_credits: mysqlCompany.loyalty_channel_credits,
                negative_feedback_alert_inactive: mysqlCompany.negative_feedback_alert_inactive,
                less_than_300_bills: mysqlCompany.less_than_300_bills,
                active_auto_campaigns_count: mysqlCompany.active_auto_campaigns_count,
                unique_customers_captured: mysqlCompany.unique_customers_captured,
                revenue_1_year: mysqlCompany.revenue_1_year,
                customers_with_min_one_visit: mysqlCompany.customers_with_min_one_visit,
                customers_with_min_two_visit: mysqlCompany.customers_with_min_two_visit,
                customers_without_min_visits: mysqlCompany.customers_without_min_visits,
                percentage_of_inactive_customers: mysqlCompany.percentage_of_inactive_customers,
                negative_feedbacks_count: mysqlCompany.negative_feedbacks_count,
                campaigns_sent_last_90_days: mysqlCompany.campaigns_sent_last_90_days,
                bills_received_last_30_days: mysqlCompany.bills_received_last_30_days,
                customers_acquired_last_30_days: mysqlCompany.customers_acquired_last_30_days,
                loyalty_type: mysqlCompany.loyalty_type,
                loyalty_reward: mysqlCompany.loyalty_reward,
                updated_from_mysql_at: new Date(),
                
                // Link to Chargebee if IDs are available in MySQL
                chargebee_customer_id: mysqlCompany.customer_id || customer.chargebee_customer_id,
                chargebee_subscription_id: mysqlCompany.subscription_id || customer.chargebee_subscription_id
              })
              .where(eq(customers.id, customer.id));
              
            log(`Synced MySQL data to customer ${customerId}`, 'mysql');
          }
        } catch (mysqlError) {
          log(`Error fetching MySQL data for customer ${customerId}: ${mysqlError}`, 'mysql');
          externalData.mysql.error = "Failed to fetch MySQL data";
          
          // If we failed to get fresh data, include a special flag
          externalData.mysql.api_error = true;
          
          // If we have cached data, fall back to it even if stale
          if (hasCachedMySQLData) {
            externalData.mysql.data_source = 'stale_cache';
            externalData.mysql.fallback_to_cached = true;
            
            // Build a basic company object from our local data
            externalData.mysql.company = {
              company_id: customer.mysql_company_id,
              company_name: customer.name || '',
              active_stores: customer.active_stores || 0,
              growth_subscription_count: customer.growth_subscription_count || 0,
              // Add any other cached fields that we have
            };
          }
        }
      } else {
        // Using cached data - build a MySQL-like object from our database fields
        externalData.mysql.company = {
          company_id: customer.mysql_company_id,
          company_name: customer.name || '',
          active_stores: customer.active_stores || 0,
          growth_subscription_count: customer.growth_subscription_count || 0,
          loyalty_active_store_count: customer.loyalty_active_store_count || 0,
          loyalty_inactive_store_count: customer.loyalty_inactive_store_count || 0,
          loyalty_active_channels: customer.loyalty_active_channels || 0,
          loyalty_channel_credits: customer.loyalty_channel_credits || 0,
          // Add all the other cached fields
          negative_feedback_alert_inactive: customer.negative_feedback_alert_inactive || false,
          less_than_300_bills: customer.less_than_300_bills || false,
          active_auto_campaigns_count: customer.active_auto_campaigns_count || 0,
          unique_customers_captured: customer.unique_customers_captured || 0,
          revenue_1_year: customer.revenue_1_year || 0
        };
      }
    }
    
    res.json(externalData);
  } catch (error) {
    log(`Error fetching external data for customer: ${error}`, 'external-data');
    res.status(500).json({ error: "Failed to fetch external data", details: error });
  }
};

// MySQL Routes
export const getMySQLCompanies = async (req: Request, res: Response) => {
  try {
    if (!mysqlService) {
      return res.status(500).json({ error: "MySQL service not initialized" });
    }
    
    const companies = await mysqlService.getCompanyData();
    res.json(companies);
  } catch (error) {
    log(`Error fetching company data from MySQL: ${error}`, 'mysql');
    res.status(500).json({ error: "Failed to fetch company data", details: error });
  }
};

export const getMySQLCompany = async (req: Request, res: Response) => {
  try {
    if (!mysqlService) {
      return res.status(500).json({ error: "MySQL service not initialized" });
    }
    
    const id = req.params.id;
    const company = await mysqlService.getCompanyDataById(id);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    res.json(company);
  } catch (error) {
    log(`Error fetching company data by ID from MySQL: ${error}`, 'mysql');
    res.status(500).json({ error: "Failed to fetch company data", details: error });
  }
};

// Import MySQL data to a customer record
export const importMySQLDataToCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId, mysqlCompanyId } = req.body;
    
    if (!customerId || !mysqlCompanyId) {
      return res.status(400).json({ error: "Missing required fields: customerId and mysqlCompanyId" });
    }
    
    if (!mysqlService) {
      return res.status(500).json({ error: "MySQL service not initialized" });
    }
    
    // Find the customer
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
    
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    // Get MySQL company data
    const mysqlCompany = await mysqlService.getCompanyDataById(mysqlCompanyId);
    
    if (!mysqlCompany) {
      return res.status(404).json({ error: "MySQL company not found" });
    }
    
    // Update customer with MySQL data
    await db.update(customers)
      .set({
        mysql_company_id: mysqlCompanyId,
        name: mysqlCompany.company_name,
        currency_code: 'INR', // Default currency is INR for MySQL data
        active_stores: mysqlCompany.active_stores,
        growth_subscription_count: mysqlCompany.growth_subscription_count,
        loyalty_active_store_count: mysqlCompany.loyalty_active_store_count,
        loyalty_inactive_store_count: mysqlCompany.loyalty_inactive_store_count,
        loyalty_active_channels: mysqlCompany.loyalty_active_channels,
        loyalty_channel_credits: mysqlCompany.loyalty_channel_credits,
        negative_feedback_alert_inactive: mysqlCompany.negative_feedback_alert_inactive,
        less_than_300_bills: mysqlCompany.less_than_300_bills,
        active_auto_campaigns_count: mysqlCompany.active_auto_campaigns_count,
        unique_customers_captured: mysqlCompany.unique_customers_captured,
        revenue_1_year: mysqlCompany.revenue_1_year,
        customers_with_min_one_visit: mysqlCompany.customers_with_min_one_visit,
        customers_with_min_two_visit: mysqlCompany.customers_with_min_two_visit,
        customers_without_min_visits: mysqlCompany.customers_without_min_visits,
        percentage_of_inactive_customers: mysqlCompany.percentage_of_inactive_customers,
        negative_feedbacks_count: mysqlCompany.negative_feedbacks_count,
        campaigns_sent_last_90_days: mysqlCompany.campaigns_sent_last_90_days,
        bills_received_last_30_days: mysqlCompany.bills_received_last_30_days,
        customers_acquired_last_30_days: mysqlCompany.customers_acquired_last_30_days,
        loyalty_type: mysqlCompany.loyalty_type,
        loyalty_reward: mysqlCompany.loyalty_reward,
        updated_from_mysql_at: new Date(),
        
        // Link to Chargebee if IDs are available in MySQL
        chargebee_customer_id: mysqlCompany.customer_id || customer.chargebee_customer_id,
        chargebee_subscription_id: mysqlCompany.subscription_id || customer.chargebee_subscription_id
      })
      .where(eq(customers.id, customerId));
    
    // Return the updated customer data  
    const [updatedCustomer] = await db.select().from(customers).where(eq(customers.id, customerId));
    
    res.json({ 
      success: true, 
      message: `Successfully imported MySQL data for customer ${customerId}`,
      customer: updatedCustomer
    });
  } catch (error) {
    log(`Error importing MySQL data: ${error}`, 'mysql');
    res.status(500).json({ error: "Failed to import MySQL data", details: error });
  }
};