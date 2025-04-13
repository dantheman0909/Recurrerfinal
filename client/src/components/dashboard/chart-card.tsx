import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { ChartComponent } from "@/components/ui/chart";
import type { ChartData } from "@shared/types";

interface ChartCardProps {
  title: string;
  type: "bar" | "line" | "doughnut";
  data: ChartData;
  timeFrames?: string[];
  height?: number;
}

export function ChartCard({ 
  title, 
  type, 
  data, 
  timeFrames = ["This week", "This month", "This quarter", "This year"], 
  height = 250 
}: ChartCardProps) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(timeFrames[0]);

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
        {timeFrames && timeFrames.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center text-sm text-gray-500">
              <span className="mr-2">{selectedTimeFrame}</span>
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {timeFrames.map((timeFrame) => (
                <DropdownMenuItem 
                  key={timeFrame}
                  className="cursor-pointer"
                  onClick={() => setSelectedTimeFrame(timeFrame)}
                >
                  {timeFrame}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-5 sm:p-6" style={{ height: `${height}px` }}>
        <ChartComponent type={type} data={data} />
      </CardContent>
    </Card>
  );
}
