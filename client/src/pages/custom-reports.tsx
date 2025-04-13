import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import {
  AreaChart,
  BarChart2,
  Download,
  Edit,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Calendar
} from "lucide-react";
import { GradientChart } from "@/components/ui/gradient-chart";
import { RefreshButton } from "@/components/ui/refresh-button";
import { apiRequest } from "@/lib/queryClient";

// TypeScript interfaces to match our backend schema
interface CustomReport {
  id: number;
  name: string;
  description: string;
  chart_type: 'line' | 'bar' | 'pie' | 'area';
  is_public: boolean;
  filters: Record<string, any>;
  created_by: number | null;
  created_at: string;
  updated_at: string | null;
  last_run_at: string | null;
}

interface CustomMetric {
  id: number;
  report_id: number;
  name: string;
  description: string;
  data_source: 'mysql' | 'chargebee' | 'internal';
  metric_type: 'count' | 'sum' | 'average' | 'percent' | 'custom';
  sql_query: string | null;
  field_mapping: Record<string, any> | null;
  display_format: 'number' | 'currency' | 'percent' | 'date';
  display_color: string;
  target_value: number | null;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
}

interface ReportSchedule {
  id: number;
  report_id: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  last_sent_at: string | null;
  next_scheduled_at: string | null;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
}

// Form schemas
const createReportSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  chart_type: z.enum(["line", "bar", "pie", "area"]),
  is_public: z.boolean().default(true),
  filters: z.record(z.any()).optional()
});

const createMetricSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  data_source: z.enum(["mysql", "chargebee", "internal"]),
  metric_type: z.enum(["count", "sum", "average", "percent", "custom"]),
  sql_query: z.string().optional(),
  field_mapping: z.record(z.any()).optional(),
  display_format: z.enum(["number", "currency", "percent", "date"]),
  display_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  target_value: z.number().optional(),
  is_active: z.boolean().default(true)
});

const createScheduleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]),
  recipients: z.array(z.string().email("Must be a valid email")).min(1, "At least one recipient is required"),
  is_active: z.boolean().default(true)
});

export default function CustomReports() {
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedMetricId, setSelectedMetricId] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState<'report' | 'metric' | 'editMetric' | 'schedule' | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all reports
  const { data: reports = [], isLoading: isLoadingReports, refetch: refetchReports } = useQuery<CustomReport[]>({
    queryKey: ['/api/custom-reports'],
  });

  // Get metrics for selected report
  const { data: metrics = [], isLoading: isLoadingMetrics, refetch: refetchMetrics } = useQuery<CustomMetric[]>({
    queryKey: ['/api/custom-reports', selectedReportId, 'metrics'],
    enabled: !!selectedReportId
  });

  // Get schedules for selected report
  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery<ReportSchedule[]>({
    queryKey: ['/api/custom-reports', selectedReportId, 'schedules'],
    enabled: !!selectedReportId
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: (newReport: z.infer<typeof createReportSchema>) => 
      apiRequest('/api/custom-reports', {
        method: 'POST',
        data: newReport
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-reports'] });
      toast({
        title: "Success",
        description: "Report created successfully",
      });
      setOpenDialog(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create report. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create metric mutation
  const createMetricMutation = useMutation({
    mutationFn: ({ reportId, metric }: { reportId: number, metric: z.infer<typeof createMetricSchema> }) => 
      apiRequest(`/api/custom-reports/${reportId}/metrics`, {
        method: 'POST',
        data: metric
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-reports', selectedReportId, 'metrics'] });
      toast({
        title: "Success",
        description: "Metric added successfully",
      });
      setOpenDialog(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add metric. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: ({ reportId, schedule }: { reportId: number, schedule: z.infer<typeof createScheduleSchema> }) => 
      apiRequest(`/api/custom-reports/${reportId}/schedules`, {
        method: 'POST',
        data: schedule
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-reports', selectedReportId, 'schedules'] });
      toast({
        title: "Success",
        description: "Schedule created successfully",
      });
      setOpenDialog(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create schedule. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Run report mutation
  const runReportMutation = useMutation({
    mutationFn: (reportId: number) => 
      apiRequest(`/api/custom-reports/${reportId}/run`, {
        method: 'POST'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-reports'] });
      toast({
        title: "Success",
        description: "Report executed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to run report. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: (reportId: number) => 
      apiRequest(`/api/custom-reports/${reportId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-reports'] });
      setSelectedReportId(null);
      toast({
        title: "Success",
        description: "Report deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Update metric mutation
  const updateMetricMutation = useMutation({
    mutationFn: ({ reportId, metricId, metric }: { reportId: number, metricId: number, metric: z.infer<typeof createMetricSchema> }) => 
      apiRequest(`/api/custom-reports/${reportId}/metrics/${metricId}`, {
        method: 'PUT',
        data: metric
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-reports', selectedReportId, 'metrics'] });
      toast({
        title: "Success",
        description: "Metric updated successfully",
      });
      setOpenDialog(null);
      setSelectedMetricId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update metric. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Delete metric mutation
  const deleteMetricMutation = useMutation({
    mutationFn: ({ reportId, metricId }: { reportId: number, metricId: number }) => 
      apiRequest(`/api/custom-reports/${reportId}/metrics/${metricId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-reports', selectedReportId, 'metrics'] });
      toast({
        title: "Success",
        description: "Metric deleted successfully",
      });
      setOpenDialog(null);
      setSelectedMetricId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete metric. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Form for creating a new report
  const reportForm = useForm<z.infer<typeof createReportSchema>>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      name: "",
      description: "",
      chart_type: "line",
      is_public: true,
      filters: {}
    }
  });

  // Form for adding a metric to a report
  const metricForm = useForm<z.infer<typeof createMetricSchema>>({
    resolver: zodResolver(createMetricSchema),
    defaultValues: {
      name: "",
      description: "",
      data_source: "mysql",
      metric_type: "count",
      sql_query: "",
      field_mapping: {},
      display_format: "number",
      display_color: "#0D9298",
      target_value: 0,
      is_active: true
    }
  });

  // Form for scheduling a report
  const scheduleForm = useForm<z.infer<typeof createScheduleSchema>>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      frequency: "monthly",
      recipients: [""],
      is_active: true
    }
  });

  // Handle report form submission
  const onReportSubmit = (values: z.infer<typeof createReportSchema>) => {
    createReportMutation.mutate(values);
  };

  // Handle metric form submission
  const onMetricSubmit = (values: z.infer<typeof createMetricSchema>) => {
    if (!selectedReportId) return;
    
    if (selectedMetricId) {
      // Update existing metric
      updateMetricMutation.mutate({ 
        reportId: selectedReportId, 
        metricId: selectedMetricId,
        metric: values 
      });
    } else {
      // Create new metric
      createMetricMutation.mutate({ reportId: selectedReportId, metric: values });
    }
  };
  
  // Handle deleting a metric
  const deleteMetric = (metricId: number) => {
    if (!selectedReportId) return;
    
    if (window.confirm("Are you sure you want to delete this metric? This action cannot be undone.")) {
      deleteMetricMutation.mutate({ 
        reportId: selectedReportId, 
        metricId: metricId 
      });
    }
  };

  // Handle schedule form submission
  const onScheduleSubmit = (values: z.infer<typeof createScheduleSchema>) => {
    if (!selectedReportId) return;
    createScheduleMutation.mutate({ reportId: selectedReportId, schedule: values });
  };

  // Select a report to view details
  const selectReport = (reportId: number) => {
    setSelectedReportId(reportId);
  };

  // Handle running a report
  const runReport = (reportId: number) => {
    runReportMutation.mutate(reportId);
  };

  // Handle deleting a report
  const deleteReport = (reportId: number) => {
    // Use Dialog instead of browser confirm
    if (window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      deleteReportMutation.mutate(reportId);
    }
  };
  
  // Edit metric function
  const editMetric = (metricId: number) => {
    const metric = metrics.find((m: CustomMetric) => m.id === metricId);
    if (metric) {
      metricForm.reset({
        name: metric.name,
        description: metric.description,
        data_source: metric.data_source,
        metric_type: metric.metric_type,
        sql_query: metric.sql_query || "",
        field_mapping: metric.field_mapping || {},
        display_format: metric.display_format,
        display_color: metric.display_color,
        target_value: metric.target_value || 0,
        is_active: metric.is_active
      });
      setSelectedMetricId(metric.id);
      setOpenDialog('editMetric');
    }
  };

  // Helper to get chart component by type
  const getChartComponent = (type: string, data: any[]) => {
    switch(type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "white", 
                  borderRadius: "0.375rem", 
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  border: "none"
                }}
              />
              <Legend />
              {metrics.filter(metric => metric.report_id === selectedReportId).map((metric: CustomMetric) => (
                <Line
                  key={metric.id}
                  type="monotone"
                  dataKey="value"
                  name={metric.name}
                  stroke={metric.display_color}
                  dot={{ fill: metric.display_color }}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "white", 
                  borderRadius: "0.375rem", 
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  border: "none"
                }}
              />
              <Legend />
              {metrics.filter(metric => metric.report_id === selectedReportId).map((metric: CustomMetric) => (
                <Bar
                  key={metric.id}
                  dataKey="value"
                  name={metric.name}
                  fill={metric.display_color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={metrics.filter(metric => metric.report_id === selectedReportId).map((metric: CustomMetric) => ({
                  name: metric.name,
                  value: metric.target_value || 0
                }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({name, value}) => `${name}: ${value}`}
                labelLine={false}
              >
                {metrics.filter(metric => metric.report_id === selectedReportId).map((metric: CustomMetric, index: number) => (
                  <Cell key={`cell-${index}`} fill={metric.display_color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "white", 
                  borderRadius: "0.375rem", 
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  border: "none"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <GradientChart 
            data={data}
            height={300}
            showGrid={true}
          />
        );
      default:
        return <div className="flex items-center justify-center h-full">No chart type specified</div>;
    }
  };

  // Sample data for preview when no metrics exist
  const sampleData = [
    { name: 'Jan', value: 100 },
    { name: 'Feb', value: 200 },
    { name: 'Mar', value: 150 },
    { name: 'Apr', value: 300 },
    { name: 'May', value: 250 },
    { name: 'Jun', value: 400 },
  ];

  return (
    <>
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">Custom Reports</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create, manage, and analyze custom reports for your business
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 gap-2">
              <RefreshButton
                variant="outline"
                onRefresh={async () => {
                  await refetchReports();
                  return Promise.resolve();
                }}
                successMessage="Reports refreshed successfully"
                errorMessage="Failed to refresh reports"
              >
                Refresh
              </RefreshButton>
              
              <Dialog open={openDialog === 'report'} onOpenChange={(open) => setOpenDialog(open ? 'report' : null)}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create New Report</DialogTitle>
                    <DialogDescription>
                      Define your custom report details. You can add metrics after creating the report.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...reportForm}>
                    <form onSubmit={reportForm.handleSubmit(onReportSubmit)} className="space-y-4">
                      <FormField
                        control={reportForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Report Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Monthly Customer Health" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={reportForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Tracks key customer health metrics on a monthly basis"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={reportForm.control}
                        name="chart_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chart Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select chart type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="line">Line Chart</SelectItem>
                                <SelectItem value="bar">Bar Chart</SelectItem>
                                <SelectItem value="pie">Pie Chart</SelectItem>
                                <SelectItem value="area">Area Chart</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={reportForm.control}
                        name="is_public"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-1">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Make report public</FormLabel>
                              <FormDescription>
                                Public reports can be viewed by all team members
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={createReportMutation.isPending}>
                          {createReportMutation.isPending ? "Creating..." : "Create Report"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="all">All Reports</TabsTrigger>
            <TabsTrigger value="my-reports">My Reports</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            {isLoadingReports ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <BarChart2 className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No reports created yet</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-sm">
                  Get started by creating your first custom report to track and analyze your key metrics.
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => setOpenDialog('report')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report: CustomReport) => (
                  <Card 
                    key={report.id} 
                    className={`cursor-pointer transition-shadow hover:shadow-md ${selectedReportId === report.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => selectReport(report.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{report.name}</CardTitle>
                        <div className="flex space-x-1">
                          {report.is_public && (
                            <Badge variant="outline">Public</Badge>
                          )}
                          <Badge 
                            variant="secondary"
                            className="capitalize"
                          >
                            {report.chart_type}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>{report.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="text-sm space-y-2">
                        <div className="flex items-center text-gray-500">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            Created: {format(new Date(report.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {report.last_run_at && (
                          <div className="flex items-center text-gray-500">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            <span>
                              Last run: {format(new Date(report.last_run_at), 'MMM d, yyyy HH:mm')}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 flex justify-between">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          runReport(report.id);
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Run
                      </Button>
                      <div className="space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Edit functionality
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteReport(report.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="my-reports">
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <BarChart2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">My Reports</h3>
              <p className="mt-1 text-sm text-gray-500 max-w-sm">
                Reports created by you will appear here.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="scheduled">
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Scheduled Reports</h3>
              <p className="mt-1 text-sm text-gray-500 max-w-sm">
                Reports scheduled for automatic delivery will appear here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        {selectedReportId && (
          <div className="mt-8">
            <Separator className="my-6" />
            
            {reports.filter((r: CustomReport) => r.id === selectedReportId).map((report: CustomReport) => (
              <div key={report.id} className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{report.name}</h2>
                    <p className="text-gray-500">{report.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => runReport(report.id)}
                      disabled={runReportMutation.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${runReportMutation.isPending ? 'animate-spin' : ''}`} />
                      Run Report
                    </Button>
                    <Button 
                      variant="outline"
                      disabled
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>Report Preview</span>
                      {report.chart_type === 'line' && <LineChartIcon className="h-5 w-5" />}
                      {report.chart_type === 'bar' && <BarChart2 className="h-5 w-5" />}
                      {report.chart_type === 'pie' && <PieChartIcon className="h-5 w-5" />}
                      {report.chart_type === 'area' && <AreaChart className="h-5 w-5" />}
                    </CardTitle>
                    <CardDescription>
                      {report.last_run_at 
                        ? `Last updated: ${format(new Date(report.last_run_at), 'MMM d, yyyy HH:mm')}` 
                        : 'Report has not been run yet'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {isLoadingMetrics ? (
                        <div className="flex items-center justify-center h-full">
                          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      ) : metrics.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <p className="text-gray-500">No metrics added to this report yet.</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => setOpenDialog('metric')}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Metric
                          </Button>
                        </div>
                      ) : (
                        getChartComponent(report.chart_type, sampleData)
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Metrics section */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle>Metrics</CardTitle>
                        <Dialog open={openDialog === 'metric'} onOpenChange={(open) => setOpenDialog(open ? 'metric' : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Metric
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Add Metric</DialogTitle>
                              <DialogDescription>
                                Define a metric to track in your custom report.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <Form {...metricForm}>
                              <form onSubmit={metricForm.handleSubmit(onMetricSubmit)} className="space-y-4">
                                <FormField
                                  control={metricForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Metric Name</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Active Users" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={metricForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          placeholder="Number of active users per month"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={metricForm.control}
                                    name="data_source"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Data Source</FormLabel>
                                        <Select 
                                          onValueChange={(value) => {
                                            field.onChange(value);
                                            // Reset SQL query when data source changes
                                            metricForm.setValue("sql_query", "");
                                            metricForm.setValue("field_mapping", {});
                                          }} 
                                          defaultValue={field.value}
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select data source" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="mysql">MySQL</SelectItem>
                                            <SelectItem value="chargebee">Chargebee</SelectItem>
                                            <SelectItem value="internal">Internal</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={metricForm.control}
                                    name="metric_type"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Metric Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select metric type" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="count">Count</SelectItem>
                                            <SelectItem value="sum">Sum</SelectItem>
                                            <SelectItem value="average">Average</SelectItem>
                                            <SelectItem value="percent">Percentage</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                {metricForm.watch("data_source") === "mysql" && (
                                  <FormField
                                    control={metricForm.control}
                                    name="sql_query"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>SQL Query</FormLabel>
                                        <FormControl>
                                          <Textarea 
                                            placeholder="SELECT COUNT(*) as count FROM users WHERE last_login_at > DATE_SUB(NOW(), INTERVAL 30 DAY)"
                                            {...field}
                                            className="font-mono text-sm"
                                            rows={5}
                                          />
                                        </FormControl>
                                        <FormDescription>
                                          Enter SQL query to extract data for this metric
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}
                                
                                {metricForm.watch("data_source") === "chargebee" && (
                                  <div className="space-y-4">
                                    <div className="p-4 border rounded-md bg-slate-50">
                                      <h4 className="font-medium text-sm mb-2">Chargebee Data</h4>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <FormField
                                            control={metricForm.control}
                                            name="sql_query"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Data Field</FormLabel>
                                                <Select 
                                                  onValueChange={(value) => {
                                                    field.onChange(value);
                                                    metricForm.setValue('field_mapping', { field: value });
                                                  }} 
                                                  defaultValue={field.value}
                                                >
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select data field" />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                    <SelectItem value="subscriptions">Subscriptions</SelectItem>
                                                    <SelectItem value="mrr">MRR</SelectItem>
                                                    <SelectItem value="customers">Customers</SelectItem>
                                                    <SelectItem value="revenue">Revenue</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                  Select data to pull from Chargebee
                                                </FormDescription>
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                        <div>
                                          <FormField
                                            control={metricForm.control}
                                            name="target_value"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Filter Value</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    type="text"
                                                    placeholder="Filter value"
                                                    {...field}
                                                    onChange={(e) => {
                                                      field.onChange(parseInt(e.target.value) || 0);
                                                    }}
                                                  />
                                                </FormControl>
                                                <FormDescription>
                                                  Set threshold value for comparison
                                                </FormDescription>
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {metricForm.watch("data_source") === "internal" && (
                                  <div className="space-y-4">
                                    <div className="p-4 border rounded-md bg-slate-50">
                                      <h4 className="font-medium text-sm mb-2">Internal Data</h4>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <FormField
                                            control={metricForm.control}
                                            name="sql_query"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Data Field</FormLabel>
                                                <Select 
                                                  onValueChange={(value) => {
                                                    field.onChange(value);
                                                    metricForm.setValue('field_mapping', { field: value });
                                                  }} 
                                                  defaultValue={field.value}
                                                >
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select data field" />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                    <SelectItem value="customers">Customer Count</SelectItem>
                                                    <SelectItem value="tasks">Task Completion</SelectItem>
                                                    <SelectItem value="health_score">Health Scores</SelectItem>
                                                    <SelectItem value="achievements">Achievements</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                  Select data from internal system metrics
                                                </FormDescription>
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                        <div>
                                          <FormField
                                            control={metricForm.control}
                                            name="target_value"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Filter Value</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    type="text"
                                                    placeholder="Filter value"
                                                    {...field}
                                                    onChange={(e) => {
                                                      field.onChange(parseInt(e.target.value) || 0);
                                                    }}
                                                  />
                                                </FormControl>
                                                <FormDescription>
                                                  Set threshold value for comparison
                                                </FormDescription>
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-3 gap-4">
                                  <FormField
                                    control={metricForm.control}
                                    name="display_format"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Display Format</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Format" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="number">Number</SelectItem>
                                            <SelectItem value="currency">Currency</SelectItem>
                                            <SelectItem value="percent">Percentage</SelectItem>
                                            <SelectItem value="date">Date</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={metricForm.control}
                                    name="display_color"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Display Color</FormLabel>
                                        <FormControl>
                                          <div className="flex items-center">
                                            <div 
                                              className="w-6 h-6 mr-2 rounded-full border border-gray-300" 
                                              style={{ backgroundColor: field.value }}
                                            />
                                            <Input 
                                              type="color"
                                              value={field.value}
                                              onChange={field.onChange}
                                            />
                                          </div>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={metricForm.control}
                                    name="target_value"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Target Value</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                <FormField
                                  control={metricForm.control}
                                  name="is_active"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-1">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel>Active</FormLabel>
                                        <FormDescription>
                                          Include this metric in the report
                                        </FormDescription>
                                      </div>
                                    </FormItem>
                                  )}
                                />
                                
                                <DialogFooter>
                                  <Button type="submit" disabled={createMetricMutation.isPending}>
                                    {createMetricMutation.isPending ? "Adding..." : "Add Metric"}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <CardDescription>
                        Metrics included in this report
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingMetrics ? (
                        <div className="flex items-center justify-center h-32">
                          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      ) : metrics.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <p className="text-gray-500">No metrics added to this report yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {metrics.filter(metric => metric.report_id === selectedReportId).map((metric: CustomMetric) => (
                            <div key={metric.id} className="flex items-center justify-between p-3 border rounded-md">
                              <div className="flex items-center">
                                <div 
                                  className="w-4 h-4 rounded-full mr-3" 
                                  style={{ backgroundColor: metric.display_color }}
                                />
                                <div>
                                  <h4 className="font-medium">{metric.name}</h4>
                                  <p className="text-sm text-gray-500">{metric.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <Badge variant="outline" className="mr-2 capitalize">
                                  {metric.data_source}
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => editMetric(metric.id)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => deleteMetric(metric.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Schedule section */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle>Schedule</CardTitle>
                        <Dialog open={openDialog === 'schedule'} onOpenChange={(open) => setOpenDialog(open ? 'schedule' : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Schedule
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Schedule Report</DialogTitle>
                              <DialogDescription>
                                Set up automatic report delivery to stakeholders.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <Form {...scheduleForm}>
                              <form onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)} className="space-y-4">
                                <FormField
                                  control={scheduleForm.control}
                                  name="frequency"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Frequency</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select frequency" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="daily">Daily</SelectItem>
                                          <SelectItem value="weekly">Weekly</SelectItem>
                                          <SelectItem value="monthly">Monthly</SelectItem>
                                          <SelectItem value="quarterly">Quarterly</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={scheduleForm.control}
                                  name="recipients"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Recipients</FormLabel>
                                      <FormControl>
                                        <div className="space-y-2">
                                          {field.value.map((_, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                              <Input
                                                placeholder="email@example.com"
                                                value={field.value[index]}
                                                onChange={(e) => {
                                                  const newRecipients = [...field.value];
                                                  newRecipients[index] = e.target.value;
                                                  field.onChange(newRecipients);
                                                }}
                                              />
                                              {index === field.value.length - 1 ? (
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="icon"
                                                  onClick={() => {
                                                    field.onChange([...field.value, '']);
                                                  }}
                                                >
                                                  <Plus className="h-4 w-4" />
                                                </Button>
                                              ) : (
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="icon"
                                                  onClick={() => {
                                                    const newRecipients = [...field.value];
                                                    newRecipients.splice(index, 1);
                                                    field.onChange(newRecipients);
                                                  }}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </FormControl>
                                      <FormDescription>
                                        Add email addresses to receive this report
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={scheduleForm.control}
                                  name="is_active"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-1">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel>Active</FormLabel>
                                        <FormDescription>
                                          Enable automatic delivery of this report
                                        </FormDescription>
                                      </div>
                                    </FormItem>
                                  )}
                                />
                                
                                <DialogFooter>
                                  <Button type="submit" disabled={createScheduleMutation.isPending}>
                                    {createScheduleMutation.isPending ? "Scheduling..." : "Schedule Report"}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <CardDescription>
                        Automatic report delivery
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingSchedules ? (
                        <div className="flex items-center justify-center h-32">
                          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      ) : schedules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <p className="text-gray-500">No schedules configured.</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => setOpenDialog('schedule')}
                          >
                            Create Schedule
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {schedules.map((schedule: ReportSchedule) => (
                            <div key={schedule.id} className="p-3 border rounded-md">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium capitalize">{schedule.frequency} Delivery</h4>
                                <Badge variant={schedule.is_active ? "default" : "outline"}>
                                  {schedule.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-500 space-y-1">
                                <p>Recipients: {schedule.recipients && schedule.recipients.length > 0 ? schedule.recipients.join(", ") : "None"}</p>
                                {schedule.last_sent_at && (
                                  <p>Last sent: {format(new Date(schedule.last_sent_at), 'MMM d, yyyy HH:mm')}</p>
                                )}
                                {schedule.next_scheduled_at && (
                                  <p>Next scheduled: {format(new Date(schedule.next_scheduled_at), 'MMM d, yyyy HH:mm')}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
            
            {/* Edit Metric Dialog */}
            <Dialog open={openDialog === 'editMetric'} onOpenChange={(open) => {
              setOpenDialog(open ? 'editMetric' : null);
              if (!open) {
                setSelectedMetricId(null);
                metricForm.reset({
                  name: "",
                  description: "",
                  data_source: "mysql",
                  metric_type: "count",
                  sql_query: "",
                  field_mapping: {},
                  display_format: "number",
                  display_color: "#0D9298",
                  target_value: 0,
                  is_active: true
                });
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Metric</DialogTitle>
                  <DialogDescription>
                    Update the metric details.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...metricForm}>
                  <form onSubmit={metricForm.handleSubmit(onMetricSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={metricForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={metricForm.control}
                        name="data_source"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Source</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="mysql">MySQL</SelectItem>
                                <SelectItem value="chargebee">Chargebee</SelectItem>
                                <SelectItem value="internal">Internal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={metricForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={metricForm.control}
                      name="metric_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Metric Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="count">Count</SelectItem>
                              <SelectItem value="sum">Sum</SelectItem>
                              <SelectItem value="average">Average</SelectItem>
                              <SelectItem value="percent">Percent</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {metricForm.watch("data_source") === "mysql" && (
                      <FormField
                        control={metricForm.control}
                        name="sql_query"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SQL Query</FormLabel>
                            <FormControl>
                              <Textarea 
                                className="font-mono"
                                placeholder="SELECT COUNT(*) FROM customers WHERE..."
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  
                    {metricForm.watch("data_source") === "chargebee" && (
                      <div>
                        <FormField
                          control={metricForm.control}
                          name="field_mapping"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Field Mapping</FormLabel>
                              <FormDescription>
                                Define the Chargebee fields to use in this metric
                              </FormDescription>
                              <div className="p-3 border rounded">
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      placeholder="Field Name"
                                      value={field.value?.field_name || ''}
                                      onChange={(e) => {
                                        const newMapping = { ...field.value, field_name: e.target.value };
                                        field.onChange(newMapping);
                                      }}
                                    />
                                    <Input
                                      placeholder="Filter Value"
                                      value={field.value?.filter_value || ''}
                                      onChange={(e) => {
                                        const newMapping = { ...field.value, filter_value: e.target.value };
                                        field.onChange(newMapping);
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    
                    {metricForm.watch("data_source") === "internal" && (
                      <div>
                        <FormField
                          control={metricForm.control}
                          name="field_mapping"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Field Mapping</FormLabel>
                              <FormDescription>
                                Define the internal fields to use in this metric
                              </FormDescription>
                              <div className="p-3 border rounded">
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      placeholder="Field Name"
                                      value={field.value?.field_name || ''}
                                      onChange={(e) => {
                                        const newMapping = { ...field.value, field_name: e.target.value };
                                        field.onChange(newMapping);
                                      }}
                                    />
                                    <Input
                                      placeholder="Filter Value"
                                      value={field.value?.filter_value || ''}
                                      onChange={(e) => {
                                        const newMapping = { ...field.value, filter_value: e.target.value };
                                        field.onChange(newMapping);
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={metricForm.control}
                        name="display_format"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Format</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Format" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="currency">Currency</SelectItem>
                                <SelectItem value="percent">Percentage</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={metricForm.control}
                        name="display_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Color</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-8 h-8 rounded-full border border-gray-300" 
                                  style={{ backgroundColor: field.value }}
                                />
                                <Input 
                                  type="color"
                                  className="w-auto h-8 p-0 border-0"
                                  value={field.value}
                                  onChange={(e) => {
                                    field.onChange(e.target.value);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={metricForm.control}
                        name="target_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Value</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={metricForm.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-1">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                              Include this metric in the report
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          if (selectedMetricId && selectedReportId) {
                            if (window.confirm("Are you sure you want to delete this metric?")) {
                              deleteMetricMutation.mutate({
                                reportId: selectedReportId,
                                metricId: selectedMetricId
                              });
                            }
                          }
                        }}
                      >
                        Delete Metric
                      </Button>
                      <Button type="submit" disabled={updateMetricMutation.isPending}>
                        {updateMetricMutation.isPending ? "Updating..." : "Update Metric"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </>
  );
}