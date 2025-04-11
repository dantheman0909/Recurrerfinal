import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  changePercent?: number;
  footerLink?: string;
  footerText?: string;
  iconBgColor?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  changePercent,
  footerLink,
  footerText = "View all",
  iconBgColor = "bg-teal-100"
}: StatsCardProps) {
  const isPositiveChange = changePercent && changePercent > 0;
  const isNegativeChange = changePercent && changePercent < 0;
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 pt-5">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", iconBgColor)}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">
                {value}
              </div>
              {changePercent && (
                <div 
                  className={cn(
                    "ml-2 flex items-baseline text-sm font-semibold",
                    isPositiveChange ? "text-green-600" : "",
                    isNegativeChange ? "text-red-600" : ""
                  )}
                >
                  {isPositiveChange && (
                    <ArrowUp className="self-center flex-shrink-0 h-5 w-5 text-green-500" />
                  )}
                  {isNegativeChange && (
                    <ArrowDown className="self-center flex-shrink-0 h-5 w-5 text-red-500" />
                  )}
                  <span className="sr-only">
                    {isPositiveChange ? "Increased" : "Decreased"} by
                  </span>
                  {Math.abs(changePercent)}%
                </div>
              )}
            </dd>
          </div>
        </div>
      </CardContent>
      {footerLink && (
        <CardFooter className="bg-gray-50 px-4 py-4">
          <div className="text-sm">
            <a href={footerLink} className="font-medium text-teal-600 hover:text-teal-500">
              {footerText}<span className="sr-only"> {title}</span>
            </a>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
