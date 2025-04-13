import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { 
  ArrowDown, 
  ArrowUp, 
  CheckSquare, 
  Mail, 
  CalendarCheck, 
  AlertTriangle
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  icon: "tasks" | "campaigns" | "renewals" | "redzone";
  linkText: string;
  linkHref: string;
}

export function StatCard({ title, value, change, icon, linkText, linkHref }: StatCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "tasks":
        return <CheckSquare className="text-teal-600 text-xl" />;
      case "campaigns":
        return <Mail className="text-blue-600 text-xl" />;
      case "renewals":
        return <CalendarCheck className="text-yellow-600 text-xl" />;
      case "redzone":
        return <AlertTriangle className="text-red-600 text-xl" />;
      default:
        return <CheckSquare className="text-teal-600 text-xl" />;
    }
  };

  const getIconBgColor = () => {
    switch (icon) {
      case "tasks":
        return "bg-teal-100";
      case "campaigns":
        return "bg-blue-100";
      case "renewals":
        return "bg-yellow-100";
      case "redzone":
        return "bg-red-100";
      default:
        return "bg-teal-100";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${getIconBgColor()} rounded-md p-3`}>
            {getIcon()}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change !== undefined && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {change < 0 ? (
                      <ArrowDown className="text-green-500 h-3 w-3" />
                    ) : (
                      <ArrowUp className="text-red-500 h-3 w-3" />
                    )}
                    <span className="ml-1">{Math.abs(change)}%</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 px-4 py-4 sm:px-6">
        <div className="text-sm">
          <Link href={linkHref} className="font-medium text-teal-600 hover:text-teal-500">
            {linkText}
            <span className="sr-only"> {title}</span>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
