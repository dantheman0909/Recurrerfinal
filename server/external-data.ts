import { Request, Response } from "express";
import { chargebeeService } from "./chargebee";
import { mysqlService } from "./mysql-service";
import { log } from "./vite";
import { db } from "./db";
import { customers } from "@shared/schema";
import { eq } from "drizzle-orm";

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

// Customer-specific external data
export const getCustomerExternalData = async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.id);
    
    // Get the customer from the database
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
    
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    const externalData: any = {
      chargebee: null,
      mysql: null
    };
    
    // Get Chargebee data if we have a Chargebee customer ID
    if (customer.chargebee_customer_id && chargebeeService) {
      try {
        const chargebeeCustomer = await chargebeeService.getCustomer(customer.chargebee_customer_id);
        externalData.chargebee = { customer: chargebeeCustomer };
        
        // If we have a subscription ID, get that data too
        if (customer.chargebee_subscription_id) {
          const subscription = await chargebeeService.getSubscription(customer.chargebee_subscription_id);
          const invoices = await chargebeeService.getInvoicesForSubscription(customer.chargebee_subscription_id);
          externalData.chargebee.subscription = subscription;
          externalData.chargebee.invoices = invoices;
        }
      } catch (chargebeeError) {
        log(`Error fetching Chargebee data for customer ${customerId}: ${chargebeeError}`, 'chargebee');
        externalData.chargebee = { error: "Failed to fetch Chargebee data" };
      }
    }
    
    // Get MySQL data if we have a MySQL company ID
    if (customer.mysql_company_id && mysqlService) {
      try {
        const mysqlCompany = await mysqlService.getCompanyDataById(customer.mysql_company_id);
        externalData.mysql = { company: mysqlCompany };
      } catch (mysqlError) {
        log(`Error fetching MySQL data for customer ${customerId}: ${mysqlError}`, 'mysql');
        externalData.mysql = { error: "Failed to fetch MySQL data" };
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