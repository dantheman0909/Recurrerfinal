import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/ui/bar-chart";
import { format } from "date-fns";

interface ViewReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertsData: {
    critical: number;
    highRisk: number;
    attentionNeeded: number;
  };
}

export function ViewReportModal({ open, onOpenChange, alertsData }: ViewReportModalProps) {
  const currentDate = format(new Date(), "MMMM d, yyyy");

  const chartData = [
    { name: "Critical", value: alertsData.critical },
    { name: "High Risk", value: alertsData.highRisk },
    { name: "Attention Needed", value: alertsData.attentionNeeded },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Red Zone Alerts Report</DialogTitle>
          <DialogDescription>
            Summary of active alerts as of {currentDate}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <h3 className="text-lg font-medium text-red-800">Critical</h3>
                <p className="text-3xl font-bold text-red-600">{alertsData.critical}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <h3 className="text-lg font-medium text-orange-800">High Risk</h3>
                <p className="text-3xl font-bold text-orange-600">{alertsData.highRisk}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <h3 className="text-lg font-medium text-yellow-800">Attention</h3>
                <p className="text-3xl font-bold text-yellow-600">{alertsData.attentionNeeded}</p>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Alert Distribution</h3>
              <div className="h-[300px]">
                <BarChart 
                  data={chartData}
                  index="name"
                  categories={["value"]}
                  colors={["#f43f5e"]}
                  valueFormatter={(value) => `${value} alerts`}
                  yAxisWidth={48}
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500">
              <p className="mb-2">Report Summary:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Total active alerts: {alertsData.critical + alertsData.highRisk + alertsData.attentionNeeded}</li>
                <li>Most common alert type: {
                  Math.max(alertsData.critical, alertsData.highRisk, alertsData.attentionNeeded) === alertsData.critical ? "Critical" :
                  Math.max(alertsData.critical, alertsData.highRisk, alertsData.attentionNeeded) === alertsData.highRisk ? "High Risk" : "Attention Needed"
                }</li>
                <li>Report generated on: {currentDate}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
          <Button variant="outline">Export PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}