import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RedZoneAlert, Customer } from "@shared/schema";
import { Link } from "wouter";

interface RedZoneListProps {
  alerts: RedZoneAlert[];
  customers: { [key: number]: Customer };
}

export function RedZoneList({ alerts, customers }: RedZoneListProps) {
  return (
    <Card>
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            Red Zone Accounts
          </h3>
        </div>
      </div>
      <ul className="divide-y divide-gray-200">
        {alerts.map((alert) => (
          <RedZoneItem 
            key={alert.id} 
            alert={alert} 
            customer={customers && alert.customer_id && customers[alert.customer_id] ? customers[alert.customer_id].name : 'Unknown Customer'} 
          />
        ))}
      </ul>
      <CardFooter className="bg-gray-50 px-4 py-3 text-center">
        <div className="text-sm font-medium text-teal-600 hover:text-teal-500">
          <Link href="/red-zone">View all red zone accounts</Link>
        </div>
      </CardFooter>
    </Card>
  );
}

interface RedZoneItemProps {
  alert: RedZoneAlert;
  customer: string;
}

function RedZoneItem({ alert, customer }: RedZoneItemProps) {
  const getSeverityStyles = (severity: string) => {
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

  const severityMap = {
    'critical': 'Critical',
    'high_risk': 'High Risk',
    'attention_needed': 'Attention Needed'
  };
  
  const severityLabel = alert.severity && severityMap[alert.severity as keyof typeof severityMap] || 'Unknown';

  return (
    <li>
      <Link href={`/customers/${alert.customer_id}`} className="block hover:bg-gray-50">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate">
              {customer}
            </p>
            <div className="ml-2 flex-shrink-0 flex">
              <Badge className={cn("px-2 text-xs leading-5 font-semibold rounded-full", getSeverityStyles(alert.severity))}>
                {severityLabel}
              </Badge>
            </div>
          </div>
          <div className="mt-2 sm:flex sm:justify-between">
            <div className="sm:flex items-center">
              <p className="text-sm text-red-600">
                {alert.reason}
              </p>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
              <p className="bg-red-50 px-2 py-1 rounded text-xs text-red-600 font-medium">
                {alert.severity === 'critical' ? 'Revenue dropped 34%' : 'NPS score: 4.2/10'}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
