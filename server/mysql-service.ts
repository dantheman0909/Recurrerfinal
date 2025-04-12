import * as mysql from 'mysql2/promise';

// MySQL Connection Config
export interface MySQLConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

// Company data returned from MySQL query
export interface CompanyData {
  company_id: string;
  company_name: string;
  active_stores: number; 
  company_create_date: Date;
  hubspot_id: string;
  growth_subscription_count: number;
  loyalty_active_store_count: number;
  loyalty_inactive_store_count: number;
  loyalty_active_channels: string;
  loyalty_channel_credits: number;
  negative_feedback_alert_inactive: number;
  less_than_300_bills: number;
  wa_header_active: number;
  contact_emails: string;
  active_auto_campaigns_count: number;
  unique_customers_captured: number;
  total_revenue_last_1_year_per_growth_subscription_per_month: number;
  revenue_1_year: number;
  customers_with_min_one_visit: number;
  customers_with_min_two_visit: number;
  aov: number;
  customers_profiled_with_birthday: number;
  customers_profiled_with_anniversary: number;
  next_month_birthdays: number;
  next_month_anniversaries: number;
  customers_without_min_visits: number;
  percentage_of_inactive_customers: number;
  negative_feedbacks_count: number;
  customer_id: string;
  subscription_id: string;
  campaigns_sent_last_90_days: number;
  loyalty_type: string;
  loyalty_reward: string;
  bills_received_last_30_days: number;
  customers_acquired_last_30_days: number;
  updated_at: Date;
}

export class MySQLService {
  private connection: mysql.Pool | null = null;
  private config: MySQLConfig;

  constructor(config: MySQLConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      this.connection = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      // Test connection
      const [rows] = await this.connection.query('SELECT 1');
      console.log('MySQL connection established successfully');
    } catch (error) {
      console.error('Error connecting to MySQL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      console.log('MySQL connection closed');
    }
  }

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      const [rows] = await this.connection!.query(sql, params);
      return rows as T[];
    } catch (error) {
      console.error('Error executing MySQL query:', error);
      throw error;
    }
  }

  async getCompanyData(): Promise<CompanyData[]> {
    const query = `
    SELECT 
      c.reelo_id AS company_id,
      c.name AS company_name,
      c.active_stores_count AS active_stores,
      c.createdate AS company_create_date,
      c.hubspot_id AS hubspot_id,
      COUNT(DISTINCT d.reelo_id) AS growth_subscription_count,
      SUM(CASE WHEN d.loyalty_activated = 1 THEN 1 ELSE 0 END) AS loyalty_active_store_count,
      SUM(CASE WHEN d.loyalty_activated = 0 OR d.loyalty_activated IS NULL THEN 1 ELSE 0 END) AS loyalty_inactive_store_count,
      GROUP_CONCAT(DISTINCT d.loyalty_active_channels) AS loyalty_active_channels,
      CASE 
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%sms%' 
            AND GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%whatsapp%' 
            AND GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%email%' 
          THEN GREATEST(c.sms_credits, c.wa_utility_credits, c.email_credits)
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%sms%' 
            AND GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%whatsapp%' 
          THEN GREATEST(c.sms_credits, c.wa_utility_credits)
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%sms%' 
            AND GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%email%' 
          THEN GREATEST(c.sms_credits, c.email_credits)
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%whatsapp%' 
            AND GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%email%' 
          THEN GREATEST(c.wa_utility_credits, c.email_credits)
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%sms%' 
          THEN c.sms_credits
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%whatsapp%' 
          THEN c.wa_utility_credits
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%email%' 
          THEN c.email_credits
      END AS loyalty_channel_credits,
      SUM(CASE WHEN d.negative_feedback_alert_activated = 0 OR d.negative_feedback_alert_activated IS NULL THEN 1 ELSE 0 END) AS negative_feedback_alert_inactive,
      SUM(CASE WHEN d.bills_received_last_30_days < 300 THEN 1 ELSE 0 END) AS less_than_300_bills,
      MAX(CASE WHEN c.whatsapp_sender_id IS NULL OR c.whatsapp_sender_id = '' OR c.whatsapp_sender_id = 'unknown' THEN 0 ELSE 1 END) AS wa_header_active,
      (SELECT GROUP_CONCAT(ct.email SEPARATOR ', ') 
       FROM contacts ct
       JOIN company_contact cc ON ct.reelo_id = cc.contact_id
       WHERE cc.company_id = c.reelo_id AND ct.email IS NOT NULL AND ct.email <> '') 
       AS contact_emails,
      COALESCE(LENGTH(c.auto_campaigns) - LENGTH(REPLACE(c.auto_campaigns, ',', '')) + 1, 0) AS active_auto_campaigns_count,
      SUM(d.customers_visited_last_30_days) / NULLIF(SUM(d.bills_received_last_30_days), 0) AS unique_customers_captured,
      c.revenue_last_1_year / NULLIF(COUNT(DISTINCT d.reelo_id), 0) / 12 AS total_revenue_last_1_year_per_growth_subscription_per_month,
      c.revenue_last_1_year AS revenue_1_year,
      c.customers_with_min_one_visit,
      c.customers_with_min_two_visit,
      c.aov,
      c.customers_profiled_with_birthday,
      c.customers_profiled_with_anniversary,
      c.next_month_birthdays,
      c.next_month_anniversaries,
      c.customers_without_min_visits,
      c.percentage_of_inactive_customers,
      c.negative_feedbacks_count,
      c.customer_id,
      c.subscription_id,
      c.campaigns_sent_last_90_days,
      JSON_UNQUOTE(JSON_EXTRACT(c.loyalty_rewards, '$.type')) AS loyalty_type,
      JSON_UNQUOTE(JSON_EXTRACT(c.loyalty_rewards, '$.tier')) AS loyalty_reward,
      SUM(d.bills_received_last_30_days) AS bills_received_last_30_days,
      SUM(d.customers_acquired_last_30_days) AS customers_acquired_last_30_days,
      c.updated_at
    FROM 
      companies c
      JOIN company_deal cd ON c.reelo_id = cd.company_id
      JOIN deals d ON cd.deal_id = d.reelo_id
    WHERE 
      d.subscription_plan LIKE '%growth%'
      AND d.is_active = 1
      AND c.updated_at >= DATE_SUB(NOW(), INTERVAL 4 DAY)
      AND d.subscription_plan IS NOT NULL
      AND d.subscription_plan <> ''
      AND c.reelo_id NOT IN (
          '618cece4633e300aa89bfba0', '626fc380ad1e9d301415d090', '62e23515db2250adbfa5a80b', 
          '6300025355508127f7b1ff9f', '633bd8a9180d7ba59b4ab94c', '63cfca9dbd6794b0e2e601e8'
      )
    GROUP BY 
      c.reelo_id
    LIMIT 100;
    `;

    return this.query<CompanyData>(query);
  }

  // Additional method to get company data by ID
  async getCompanyDataById(companyId: string): Promise<CompanyData | null> {
    const query = `
    SELECT 
      c.reelo_id AS company_id,
      c.name AS company_name,
      c.active_stores_count AS active_stores,
      c.createdate AS company_create_date,
      c.hubspot_id AS hubspot_id,
      COUNT(DISTINCT d.reelo_id) AS growth_subscription_count,
      SUM(CASE WHEN d.loyalty_activated = 1 THEN 1 ELSE 0 END) AS loyalty_active_store_count,
      SUM(CASE WHEN d.loyalty_activated = 0 OR d.loyalty_activated IS NULL THEN 1 ELSE 0 END) AS loyalty_inactive_store_count,
      GROUP_CONCAT(DISTINCT d.loyalty_active_channels) AS loyalty_active_channels,
      CASE 
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%sms%' 
            AND GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%whatsapp%' 
            AND GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%email%' 
          THEN GREATEST(c.sms_credits, c.wa_utility_credits, c.email_credits)
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%sms%' 
            AND GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%whatsapp%' 
          THEN GREATEST(c.sms_credits, c.wa_utility_credits)
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%sms%' 
            AND GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%email%' 
          THEN GREATEST(c.sms_credits, c.email_credits)
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%whatsapp%' 
            AND GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%email%' 
          THEN GREATEST(c.wa_utility_credits, c.email_credits)
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%sms%' 
          THEN c.sms_credits
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%whatsapp%' 
          THEN c.wa_utility_credits
          WHEN GROUP_CONCAT(DISTINCT d.loyalty_active_channels) LIKE '%email%' 
          THEN c.email_credits
      END AS loyalty_channel_credits,
      SUM(CASE WHEN d.negative_feedback_alert_activated = 0 OR d.negative_feedback_alert_activated IS NULL THEN 1 ELSE 0 END) AS negative_feedback_alert_inactive,
      SUM(CASE WHEN d.bills_received_last_30_days < 300 THEN 1 ELSE 0 END) AS less_than_300_bills,
      MAX(CASE WHEN c.whatsapp_sender_id IS NULL OR c.whatsapp_sender_id = '' OR c.whatsapp_sender_id = 'unknown' THEN 0 ELSE 1 END) AS wa_header_active,
      (SELECT GROUP_CONCAT(ct.email SEPARATOR ', ') 
       FROM contacts ct
       JOIN company_contact cc ON ct.reelo_id = cc.contact_id
       WHERE cc.company_id = c.reelo_id AND ct.email IS NOT NULL AND ct.email <> '') 
       AS contact_emails,
      COALESCE(LENGTH(c.auto_campaigns) - LENGTH(REPLACE(c.auto_campaigns, ',', '')) + 1, 0) AS active_auto_campaigns_count,
      SUM(d.customers_visited_last_30_days) / NULLIF(SUM(d.bills_received_last_30_days), 0) AS unique_customers_captured,
      c.revenue_last_1_year / NULLIF(COUNT(DISTINCT d.reelo_id), 0) / 12 AS total_revenue_last_1_year_per_growth_subscription_per_month,
      c.revenue_last_1_year AS revenue_1_year,
      c.customers_with_min_one_visit,
      c.customers_with_min_two_visit,
      c.aov,
      c.customers_profiled_with_birthday,
      c.customers_profiled_with_anniversary,
      c.next_month_birthdays,
      c.next_month_anniversaries,
      c.customers_without_min_visits,
      c.percentage_of_inactive_customers,
      c.negative_feedbacks_count,
      c.customer_id,
      c.subscription_id,
      c.campaigns_sent_last_90_days,
      JSON_UNQUOTE(JSON_EXTRACT(c.loyalty_rewards, '$.type')) AS loyalty_type,
      JSON_UNQUOTE(JSON_EXTRACT(c.loyalty_rewards, '$.tier')) AS loyalty_reward,
      SUM(d.bills_received_last_30_days) AS bills_received_last_30_days,
      SUM(d.customers_acquired_last_30_days) AS customers_acquired_last_30_days,
      c.updated_at
    FROM 
      companies c
      JOIN company_deal cd ON c.reelo_id = cd.company_id
      JOIN deals d ON cd.deal_id = d.reelo_id
    WHERE 
      c.reelo_id = ?
      AND d.subscription_plan LIKE '%growth%'
      AND d.is_active = 1
    GROUP BY 
      c.reelo_id;
    `;

    const results = await this.query<CompanyData>(query, [companyId]);
    return results.length > 0 ? results[0] : null;
  }
}

// Initialize MySQL service
export const initMySQLService = (): MySQLService | null => {
  const host = process.env.MYSQL_HOST;
  const port = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306;
  const username = process.env.MYSQL_USERNAME;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !username || !password || !database) {
    console.error('MySQL configuration not found. Set MYSQL_* environment variables.');
    return null;
  }

  return new MySQLService({
    host,
    port,
    username,
    password,
    database
  });
};

// Export singleton instance
export const mysqlService = initMySQLService();