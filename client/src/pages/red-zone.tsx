import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Filter, 
  Search,
  Calendar,
  Building,
  BarChart2,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { format } from "date-fns";
import { RedZoneAlert } from "@shared/schema";
import { AlertSeverity } from "@shared/types";

export default function RedZone() {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['/api/red-zone'],
  });
  
  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
  });
  
  // Format customers data for lookups
  const customerMap = customers?.reduce((acc: any, customer: any) => {
    acc[customer.id] = customer;
    return acc;
  }, {}) || {};
  
  const filteredAlerts = alerts?.filter((alert: RedZoneAlert) => {
    const customerName = customerMap[alert.customer_id]?.name || '';
    const matchesSearch = alert.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = !severityFilter || alert.severity === severityFilter;
    
    return matchesSearch && matchesSeverity;
  });
  
  const getSeverityBadgeStyles = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return "bg-red-100 text-red-800";
      case 'high_risk':
        return "bg-red-100 text-red-800";
      case 'attention_needed':
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const severityLabel = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return "Critical";
      case 'high_risk':
        return "High Risk";
      case 'attention_needed':
        return "Attention Needed";
      default:
        return severity;
    }
  };
  
  // Group alerts by severity
  const alertsBySeverity = {
    critical: filteredAlerts?.filter((alert: RedZoneAlert) => alert.severity === 'critical') || [],
    high_risk: filteredAlerts?.filter((alert: RedZoneAlert) => alert.severity === 'high_risk') || [],
    attention_needed: filteredAlerts?.filter((alert: RedZoneAlert) => alert.severity === 'attention_needed') || [],
  };
  
  // Calculate severity counts for the summary
  const criticalCount = alertsBySeverity.critical.length;
  const highRiskCount = alertsBySeverity.high_risk.length;
  const attentionNeededCount = alertsBySeverity.attention_needed.length;
  const totalAlerts = criticalCount + highRiskCount + attentionNeededCount;

  return (
    <>
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Red Zone Alerts</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Identify and resolve critical customer issues
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button variant="outline" className="mr-2">
                <BarChart2 className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Alert Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-red-50 border-red-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-red-800">Critical</h3>
                <Badge className="bg-red-100 text-red-800">{criticalCount}</Badge>
              </div>
              <p className="text-sm text-red-600 mt-1">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-orange-800">High Risk</h3>
                <Badge className="bg-orange-100 text-orange-800">{highRiskCount}</Badge>
              </div>
              <p className="text-sm text-orange-600 mt-1">
                Needs action this week
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-yellow-800">Attention Needed</h3>
                <Badge className="bg-yellow-100 text-yellow-800">{attentionNeededCount}</Badge>
              </div>
              <p className="text-sm text-yellow-600 mt-1">
                Monitor closely
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-green-800">Total Active</h3>
                <Badge className="bg-green-100 text-green-800">{totalAlerts}</Badge>
              </div>
              <p className="text-sm text-green-600 mt-1">
                <span className="font-medium">8</span> resolved this month
              </p>
            </CardContent>
          </Card>
        </div>
      
        <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="search"
              placeholder="Search alerts or customers..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={severityFilter || ""} onValueChange={(value) => setSeverityFilter(value || null)}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <span>{severityFilter ? severityLabel(severityFilter as AlertSeverity) : 'All Severities'}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high_risk">High Risk</SelectItem>
                <SelectItem value="attention_needed">Attention Needed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="all">All Alerts</TabsTrigger>
            <TabsTrigger value="critical">Critical</TabsTrigger>
            <TabsTrigger value="high_risk">High Risk</TabsTrigger>
            <TabsTrigger value="attention_needed">Attention Needed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>All Red Zone Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-10">Loading alerts...</div>
                ) : filteredAlerts?.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {filteredAlerts.map((alert: RedZoneAlert) => (
                      <AlertItem 
                        key={alert.id} 
                        alert={alert} 
                        customer={customerMap[alert.customer_id]} 
                        getSeverityBadgeStyles={getSeverityBadgeStyles}
                        severityLabel={severityLabel}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No alerts match your search criteria.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="critical">
            <AlertsByTypeList 
              alerts={alertsBySeverity.critical} 
              isLoading={isLoading} 
              customerMap={customerMap}
              getSeverityBadgeStyles={getSeverityBadgeStyles}
              severityLabel={severityLabel}
              title="Critical Alerts"
            />
          </TabsContent>
          
          <TabsContent value="high_risk">
            <AlertsByTypeList 
              alerts={alertsBySeverity.high_risk} 
              isLoading={isLoading} 
              customerMap={customerMap}
              getSeverityBadgeStyles={getSeverityBadgeStyles}
              severityLabel={severityLabel}
              title="High Risk Alerts"
            />
          </TabsContent>
          
          <TabsContent value="attention_needed">
            <AlertsByTypeList 
              alerts={alertsBySeverity.attention_needed} 
              isLoading={isLoading} 
              customerMap={customerMap}
              getSeverityBadgeStyles={getSeverityBadgeStyles}
              severityLabel={severityLabel}
              title="Attention Needed Alerts"
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

interface AlertItemProps {
  alert: RedZoneAlert;
  customer: any;
  getSeverityBadgeStyles: (severity: AlertSeverity) => string;
  severityLabel: (severity: AlertSeverity) => string;
}

function AlertItem({ alert, customer, getSeverityBadgeStyles, severityLabel }: AlertItemProps) {
  return (
    <div className="py-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between">
        <div className="flex items-start">
          <div className="bg-red-100 rounded-md p-2 flex items-center justify-center mr-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{customer?.name || 'Unknown Customer'}</h3>
            <p className="text-sm text-red-600 mt-1">{alert.reason}</p>
            <div className="flex mt-2 items-center">
              <Badge className={cn(getSeverityBadgeStyles(alert.severity))}>
                {severityLabel(alert.severity)}
              </Badge>
              <span className="ml-3 text-sm text-gray-500 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Created on {format(new Date(alert.created_at), 'MMM d, yyyy')}
              </span>
              {customer && (
                <span className="ml-3 text-sm text-gray-500 flex items-center">
                  <Building className="h-4 w-4 mr-1" />
                  {customer.industry || 'No industry'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center mt-3 md:mt-0 space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/customers/${alert.customer_id}`}>
              View Customer
            </Link>
          </Button>
          <Button size="sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Resolve
          </Button>
        </div>
      </div>
    </div>
  );
}

interface AlertsByTypeListProps {
  alerts: RedZoneAlert[];
  isLoading: boolean;
  customerMap: Record<number, any>;
  getSeverityBadgeStyles: (severity: AlertSeverity) => string;
  severityLabel: (severity: AlertSeverity) => string;
  title: string;
}

function AlertsByTypeList({ 
  alerts, 
  isLoading, 
  customerMap, 
  getSeverityBadgeStyles, 
  severityLabel,
  title
}: AlertsByTypeListProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-10">Loading alerts...</div>
        ) : alerts?.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {alerts.map((alert: RedZoneAlert) => (
              <AlertItem 
                key={alert.id} 
                alert={alert} 
                customer={customerMap[alert.customer_id]} 
                getSeverityBadgeStyles={getSeverityBadgeStyles}
                severityLabel={severityLabel}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">No {title.toLowerCase()} found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
