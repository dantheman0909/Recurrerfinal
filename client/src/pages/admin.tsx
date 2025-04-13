import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  Database, 
  Shield, 
  User, 
  Users, 
  Settings,
  CreditCard,
  Key,
  ToggleLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash,
  Plus,
  PencilLine,
  RefreshCw
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useUserContext } from "@/lib/user-context";
import { formatDate } from "@/lib/utils";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("data");
  const { user } = useUserContext();
  const queryClient = useQueryClient();
  
  // Only admin users should have access to this page
  if (user?.role !== "admin") {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-500 mb-4">You don't have permission to access the admin panel.</p>
              <Button asChild>
                <a href="/dashboard">Return to Dashboard</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-teal-600 mr-2" />
            <h1 className="text-2xl font-semibold text-gray-900">Admin Panel</h1>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="data">Data Management</TabsTrigger>
            <TabsTrigger value="mysql">MySQL Configuration</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="settings">System Settings</TabsTrigger>
          </TabsList>
          
          {/* Data Management Tab */}
          <TabsContent value="data">
            <DataManagementTab />
          </TabsContent>
          
          {/* MySQL Configuration Tab */}
          <TabsContent value="mysql">
            <MySQLConfigTab />
          </TabsContent>
          
          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <IntegrationsTab />
          </TabsContent>
          
          {/* User Management Tab */}
          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>
          
          {/* System Settings Tab */}
          <TabsContent value="settings">
            <SystemSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DataManagementTab() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<{ imported: number; updated: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch recent data activities
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/admin/data-activities"],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
      setUploadStatus('idle');
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!csvFile) {
      setUploadError("Please select a file to upload");
      return;
    }

    setUploadStatus('uploading');

    try {
      const formData = new FormData();
      formData.append('csv', csvFile);
      
      const response = await fetch('/api/admin/import-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      setUploadResult(result);
      setUploadStatus('success');
      queryClient.invalidateQueries({ queryKey: ["/api/admin/data-activities"] });
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError((error as Error).message || "Upload failed");
      setUploadStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Data Import & Export</CardTitle>
            <CardDescription>Upload customer data or export existing data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CSV
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Customer Data CSV</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="csvFile">CSV File</Label>
                        <Input
                          id="csvFile"
                          type="file"
                          accept=".csv"
                          onChange={handleFileChange}
                        />
                        <p className="text-sm text-gray-500">
                          Upload a CSV file with customer data. Each record will be given a unique ID.
                          If a record with the same ID already exists, it will be updated.
                        </p>
                      </div>
                      
                      {uploadStatus === 'error' && (
                        <div className="bg-red-50 text-red-800 p-3 rounded-md flex items-start">
                          <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                          <p className="text-sm">{uploadError}</p>
                        </div>
                      )}
                      
                      {uploadStatus === 'success' && (
                        <div className="bg-green-50 text-green-800 p-3 rounded-md flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Upload successful!</p>
                            <p className="text-sm">
                              Imported {uploadResult?.imported} new records and updated {uploadResult?.updated} existing records.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleUpload} 
                        disabled={!csvFile || uploadStatus === 'uploading'}
                      >
                        {uploadStatus === 'uploading' ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : 'Upload File'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" className="flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Export Customers
                </Button>
                
                <Button variant="outline" className="flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Export Tasks
                </Button>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-3">Recent Data Activities</h3>
                {isLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading activities...</div>
                ) : activities && activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity: any, index: number) => (
                      <div key={index} className="flex items-start border-l-4 border-teal-500 pl-3 py-1">
                        <div>
                          <p className="text-sm font-medium">{activity.action}</p>
                          <div className="flex items-center text-xs text-gray-500">
                            <span>{activity.user}</span>
                            <span className="mx-1">•</span>
                            <span>{formatDate(activity.timestamp)}</span>
                          </div>
                          {activity.details && (
                            <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">No recent data activities</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Data Statistics</CardTitle>
            <CardDescription>Current data in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold">125</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <p className="text-2xl font-bold">1,345</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Playbooks</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Users</p>
                <p className="text-2xl font-bold">18</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium text-gray-500">Last Data Sync</p>
                <p className="text-base">Yesterday at 11:43 PM</p>
              </div>
              <Button className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data Stats
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Cleanup Tools</CardTitle>
          <CardDescription>Use these tools carefully - actions cannot be undone</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Duplicate Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">
                  Find and merge duplicate customer records based on name, email, or other fields.
                </p>
                <Button variant="outline" className="w-full">Run Duplicate Check</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Data Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">
                  Validate data integrity and find records with missing or invalid values.
                </p>
                <Button variant="outline" className="w-full">Run Validation</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Archive Old Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">
                  Archive tasks and activities older than the specified timeframe.
                </p>
                <Button variant="outline" className="w-full">Archive Data</Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MySQLConfigTab() {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Form schema for MySQL configuration
  const configSchema = z.object({
    host: z.string().min(1, "Host is required"),
    port: z.coerce.number().int().min(1, "Port is required"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    database: z.string().min(1, "Database name is required")
  });
  
  // Query schema
  const querySchema = z.object({
    query: z.string().min(1, "Query is required")
  });
  
  // MySQL config form
  const configForm = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      host: "",
      port: 3306,
      username: "",
      password: "",
      database: ""
    }
  });
  
  // Query form
  const queryForm = useForm<z.infer<typeof querySchema>>({
    resolver: zodResolver(querySchema),
    defaultValues: {
      query: "SELECT * FROM customers LIMIT 10"
    }
  });
  
  // Fetch current MySQL config
  const { data: mysqlConfig, isLoading: configLoading } = useQuery({
    queryKey: ["/api/mysql-config"],
  });
  
  // Fetch field mappings
  const { data: fieldMappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ["/api/mysql-field-mappings"],
  });
  
  // Fill form with existing config if available
  React.useEffect(() => {
    if (mysqlConfig && !configLoading) {
      configForm.reset({
        host: mysqlConfig.host || "",
        port: mysqlConfig.port || 3306,
        username: mysqlConfig.username || "",
        password: mysqlConfig.password || "",
        database: mysqlConfig.database || ""
      });
    }
  }, [mysqlConfig, configLoading]);
  
  // MySQL config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: z.infer<typeof configSchema>) => {
      if (mysqlConfig?.id) {
        return apiRequest("PATCH", `/api/mysql-config/${mysqlConfig.id}`, data);
      } else {
        return apiRequest("POST", "/api/mysql-config", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mysql-config"] });
    }
  });
  
  // Query execution mutation
  const executeQueryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof querySchema>) => {
      return apiRequest("POST", "/api/admin/mysql-query", data);
    }
  });
  
  // Test connection handler
  const handleTestConnection = async () => {
    setTestStatus('testing');
    try {
      const isValid = await configForm.trigger();
      if (!isValid) {
        setTestStatus('error');
        setTestMessage('Please fill in all required fields');
        return;
      }
      
      const formData = configForm.getValues();
      const response = await apiRequest("POST", "/api/admin/mysql-test", formData);
      const data = await response.json();
      
      if (data.success) {
        setTestStatus('success');
        setTestMessage('Connection successful!');
      } else {
        setTestStatus('error');
        setTestMessage(data.message || 'Connection failed');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage((error as Error).message || 'Connection test failed');
    }
  };
  
  // Save configuration handler
  const onSaveConfig = async (data: z.infer<typeof configSchema>) => {
    try {
      await saveConfigMutation.mutateAsync(data);
      setTestMessage('Configuration saved successfully');
      setTestStatus('success');
    } catch (error) {
      setTestMessage((error as Error).message || 'Failed to save configuration');
      setTestStatus('error');
    }
  };
  
  // Execute query handler
  const onExecuteQuery = async (data: z.infer<typeof querySchema>) => {
    try {
      await executeQueryMutation.mutateAsync(data);
    } catch (error) {
      console.error("Query execution error:", error);
    }
  };

  // Query result display
  const QueryResultDisplay = () => {
    if (executeQueryMutation.isPending) {
      return <div className="text-center py-4">Executing query...</div>;
    }
    
    if (executeQueryMutation.isError) {
      return (
        <div className="bg-red-50 p-4 rounded-md text-red-800">
          <p className="font-medium">Query Error</p>
          <p className="text-sm mt-1">
            {(executeQueryMutation.error as Error)?.message || "Failed to execute query"}
          </p>
        </div>
      );
    }
    
    if (executeQueryMutation.isSuccess) {
      const data = executeQueryMutation.data as any;
      
      if (!data || !data.columns || !data.rows) {
        return <div className="text-center py-4">No results returned</div>;
      }
      
      return (
        <div className="mt-4 border rounded-md overflow-auto max-h-60">
          <Table>
            <TableHeader>
              <TableRow>
                {data.columns.map((column: string, index: number) => (
                  <TableHead key={index}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row: any[], rowIndex: number) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex}>
                      {cell !== null ? String(cell) : "NULL"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MySQL Database Configuration</CardTitle>
          <CardDescription>
            Connect to your MySQL database to sync customer data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...configForm}>
            <form onSubmit={configForm.handleSubmit(onSaveConfig)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={configForm.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host</FormLabel>
                      <FormControl>
                        <Input placeholder="localhost" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={configForm.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={configForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={configForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={configForm.control}
                  name="database"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Database Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {testStatus === 'success' && (
                <div className="bg-green-50 p-3 rounded-md flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-sm text-green-800">{testMessage}</p>
                </div>
              )}
              
              {testStatus === 'error' && (
                <div className="bg-red-50 p-3 rounded-md flex items-center">
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-sm text-red-800">{testMessage}</p>
                </div>
              )}
              
              <div className="flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                >
                  {testStatus === 'testing' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : 'Test Connection'}
                </Button>
                
                <Button 
                  type="submit"
                  disabled={saveConfigMutation.isPending || configForm.formState.isSubmitting}
                >
                  {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Run MySQL Query</CardTitle>
            <CardDescription>
              Execute a query to preview your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              disabled={!mysqlConfig?.isActive}
              onClick={() => setQueryDialogOpen(true)}
            >
              <Database className="h-4 w-4 mr-2" />
              Open Query Builder
            </Button>
            
            <Dialog open={queryDialogOpen} onOpenChange={setQueryDialogOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>MySQL Query Builder</DialogTitle>
                </DialogHeader>
                <Form {...queryForm}>
                  <form onSubmit={queryForm.handleSubmit(onExecuteQuery)} className="space-y-4">
                    <FormField
                      control={queryForm.control}
                      name="query"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SQL Query</FormLabel>
                          <FormControl>
                            <Textarea rows={5} {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter a SELECT query to preview data from your MySQL database
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit"
                      disabled={executeQueryMutation.isPending}
                    >
                      {executeQueryMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Executing...
                        </>
                      ) : 'Execute Query'}
                    </Button>
                  </form>
                </Form>
                
                <QueryResultDisplay />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setMappingDialogOpen(true)}
                  >
                    Map Fields
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Field Mappings</CardTitle>
            <CardDescription>
              Map MySQL fields to platform fields
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => setMappingDialogOpen(true)}
              disabled={!mysqlConfig?.isActive}
            >
              <Database className="h-4 w-4 mr-2" />
              Configure Field Mappings
            </Button>
            
            <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>MySQL Field Mappings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Map fields from your MySQL database to fields in the Recurrer platform.
                    If a field doesn't exist in the platform, you can create it.
                  </p>
                  
                  {mappingsLoading ? (
                    <div className="text-center py-4">Loading field mappings...</div>
                  ) : fieldMappings && fieldMappings.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>MySQL Field</TableHead>
                            <TableHead>MySQL Table</TableHead>
                            <TableHead>Platform Field</TableHead>
                            <TableHead>Transformation</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fieldMappings.map((mapping: any) => (
                            <TableRow key={mapping.id}>
                              <TableCell>{mapping.mysqlField}</TableCell>
                              <TableCell>{mapping.mysqlTable}</TableCell>
                              <TableCell>{mapping.platformField}</TableCell>
                              <TableCell>
                                {mapping.transformationType || "Direct"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={mapping.isActive ? "default" : "outline"}>
                                  {mapping.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm">
                                  <PencilLine className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No field mappings configured yet
                    </div>
                  )}
                  
                  <Button className="w-full mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field Mapping
                  </Button>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
                    Close
                  </Button>
                  <Button>
                    Save Mappings
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Synchronization</CardTitle>
          <CardDescription>
            Control how and when data is synced from MySQL to Recurrer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-base font-medium mb-2">Sync Status</h3>
              <div className="bg-green-50 p-3 rounded-md flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-800">Last sync successful</p>
                  <p className="text-xs text-green-700">Yesterday at 11:43 PM</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-base font-medium mb-2">Sync Schedule</h3>
              <Select defaultValue="daily">
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Google Workspace</CardTitle>
                <CardDescription>Gmail & Calendar integration</CardDescription>
              </div>
              <Badge>Connected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">Connected Account</Label>
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src="" alt="User avatar" />
                    <AvatarFallback>AM</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">admin@recurrer.com</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">OAuth Scopes</Label>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">gmail.readonly</Badge>
                  <Badge variant="outline" className="text-xs">calendar.events</Badge>
                  <Badge variant="outline" className="text-xs">userinfo.email</Badge>
                </div>
              </div>
              
              <Button variant="outline" className="w-full">
                Reconfigure
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Chargebee</CardTitle>
                <CardDescription>Billing and subscription data</CardDescription>
              </div>
              <Badge>Connected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">API Key</Label>
                <div className="flex items-center">
                  <div className="bg-gray-100 p-2 rounded-md flex-grow">
                    <p className="text-sm text-gray-600">••••••••••••••••</p>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-2">
                    <PencilLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">Site</Label>
                <p className="text-sm">recurrer-test</p>
              </div>
              
              <Button variant="outline" className="w-full">
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>HubSpot</CardTitle>
                <CardDescription>CRM and marketing data</CardDescription>
              </div>
              <Badge variant="outline">Not Connected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Connect your HubSpot account to sync CRM data, contacts, and marketing activities.
              </p>
              
              <Button className="w-full">
                Connect HubSpot
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Intercom</CardTitle>
                <CardDescription>Customer messaging platform</CardDescription>
              </div>
              <Badge variant="outline">Not Connected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Connect Intercom to view customer conversations and support tickets.
              </p>
              
              <Button className="w-full">
                Connect Intercom
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Stripe</CardTitle>
                <CardDescription>Payment processing</CardDescription>
              </div>
              <Badge variant="outline">Not Connected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Connect Stripe to view payment histories and subscription details.
              </p>
              
              <Button className="w-full">
                Connect Stripe
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Slack</CardTitle>
                <CardDescription>Team communication</CardDescription>
              </div>
              <Badge variant="outline">Not Connected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Connect Slack to receive notifications and alerts in your team channels.
              </p>
              
              <Button className="w-full">
                Connect Slack
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>OAuth Configuration</CardTitle>
          <CardDescription>
            Configure OAuth settings for external application connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Redirect URI</Label>
                <div className="flex">
                  <Input 
                    value="https://recurrer.example.com/auth/callback" 
                    readOnly 
                    className="rounded-r-none"
                  />
                  <Button variant="outline" className="rounded-l-none">
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Use this URI when registering Recurrer in external OAuth providers
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Client ID</Label>
                <div className="flex">
                  <Input 
                    value="recurrer-client-12345" 
                    className="rounded-r-none"
                  />
                  <Button variant="outline" className="rounded-l-none">
                    Copy
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <div className="flex">
                <Input 
                  type="password"
                  value="••••••••••••••••••••••••••"
                  className="rounded-r-none"
                />
                <Button variant="outline" className="rounded-l-none">
                  Show
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Keep this secret secure and never expose it in client-side code
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Authorized Domains</Label>
              <Input 
                value="recurrer.example.com,app.recurrer.example.com" 
              />
              <p className="text-xs text-gray-500">
                Comma-separated list of domains allowed to use this OAuth configuration
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserManagementTab() {
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Form schema for user creation
  const userSchema = z.object({
    email: z.string().email("Invalid email address"),
    fullName: z.string().min(1, "Full name is required"),
    role: z.enum(["admin", "team_lead", "csm"], {
      required_error: "Role is required",
    }),
  });
  
  // User form
  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      fullName: "",
      role: "csm",
    }
  });
  
  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userSchema>) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setCreateUserDialogOpen(false);
      userForm.reset();
    },
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/reset-password`, { userId });
    },
  });
  
  // Create user handler
  const onCreateUser = async (data: z.infer<typeof userSchema>) => {
    try {
      await createUserMutation.mutateAsync(data);
    } catch (error) {
      console.error("Create user error:", error);
    }
  };
  
  // Delete user handler
  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        await deleteUserMutation.mutateAsync(userId);
      } catch (error) {
        console.error("Delete user error:", error);
      }
    }
  };
  
  // Reset password handler
  const handleResetPassword = async (userId: string) => {
    try {
      await resetPasswordMutation.mutateAsync(userId);
      alert("Password reset email has been sent to the user.");
    } catch (error) {
      console.error("Reset password error:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users and their access to the platform
              </CardDescription>
            </div>
            <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <User className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(onCreateUser)} className="space-y-4">
                    <FormField
                      control={userForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="user@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="team_lead">Team Lead</SelectItem>
                              <SelectItem value="csm">CSM</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            This determines what permissions the user will have
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button 
                        type="submit"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading users...</div>
          ) : users && users.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                            <AvatarFallback>
                              {user.fullName?.charAt(0) || user.email?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={
                          user.role === "admin" ? "default" : 
                          user.role === "team_lead" ? "secondary" : "outline"
                        }>
                          {user.role === "admin" ? "Admin" : 
                           user.role === "team_lead" ? "Team Lead" : "CSM"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-0">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-red-600">
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">No users found</div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <CardDescription>
              Configure what each role can access and modify
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Team Lead</TableHead>
                      <TableHead>CSM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Customer Management</TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Task Management</TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Create Playbooks</TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>View Reports</TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Admin Panel</TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>User Management</TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-green-500" /></TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <Button variant="outline">
                <PencilLine className="h-4 w-4 mr-2" />
                Edit Permissions
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Authentication Settings</CardTitle>
            <CardDescription>
              Configure authentication methods and security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Google OAuth</h3>
                  <p className="text-xs text-gray-500">Allow users to sign in with Google</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Email Password</h3>
                  <p className="text-xs text-gray-500">Allow users to sign in with email/password</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                  <p className="text-xs text-gray-500">Require 2FA for all users</p>
                </div>
                <Switch />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Password Policy</h3>
                <Select defaultValue="strong">
                  <SelectTrigger>
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                    <SelectItem value="standard">Standard (8+ chars, 1 number)</SelectItem>
                    <SelectItem value="strong">Strong (8+ chars, mixed case, numbers, symbols)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Session Timeout</h3>
                <Select defaultValue="8h">
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hour</SelectItem>
                    <SelectItem value="4h">4 hours</SelectItem>
                    <SelectItem value="8h">8 hours</SelectItem>
                    <SelectItem value="24h">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SystemSettingsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Preferences</CardTitle>
          <CardDescription>
            Configure global system settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-base font-medium">General Settings</h3>
              
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input defaultValue="Recurrer, Inc." />
              </div>
              
              <div className="space-y-2">
                <Label>Default Time Zone</Label>
                <Select defaultValue="America/New_York">
                  <SelectTrigger>
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select defaultValue="MM/DD/YYYY">
                  <SelectTrigger>
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-base font-medium">Notification Settings</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Email Notifications</h4>
                  <p className="text-xs text-gray-500">Send notifications via email</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">In-App Notifications</h4>
                  <p className="text-xs text-gray-500">Display notifications in-app</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Red Zone Alerts</h4>
                  <p className="text-xs text-gray-500">Send immediate alerts for red zone entries</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="space-y-2">
                <Label>Daily Digest Time</Label>
                <Select defaultValue="8:00">
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6:00">6:00 AM</SelectItem>
                    <SelectItem value="7:00">7:00 AM</SelectItem>
                    <SelectItem value="8:00">8:00 AM</SelectItem>
                    <SelectItem value="9:00">9:00 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Red Zone Configuration</CardTitle>
            <CardDescription>
              Configure red zone alerts and thresholds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>NPS Score Threshold</Label>
                <div className="flex">
                  <Input type="number" defaultValue="6" className="w-20 mr-2" />
                  <p className="text-sm text-gray-500 flex items-center">
                    Customers with NPS below this value will enter red zone
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>No Campaign Days</Label>
                <div className="flex">
                  <Input type="number" defaultValue="60" className="w-20 mr-2" />
                  <p className="text-sm text-gray-500 flex items-center">
                    Days without a campaign before red zone
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Data Tagging Threshold</Label>
                <div className="flex">
                  <Input type="number" defaultValue="50" className="w-20 mr-2" />
                  <p className="text-sm text-gray-500 flex items-center">
                    Percent below which enters red zone
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Revenue Drop Threshold</Label>
                <div className="flex">
                  <Input type="number" defaultValue="20" className="w-20 mr-2" />
                  <p className="text-sm text-gray-500 flex items-center">
                    Percent drop that triggers red zone
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Automated Playbook Trigger</h4>
                  <p className="text-xs text-gray-500">Trigger tasks when account enters red zone</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Monitor system performance and health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">API Status</p>
                <div className="flex items-center mt-1">
                  <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                  <p className="text-sm font-medium">Operational</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Database Status</p>
                <div className="flex items-center mt-1">
                  <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                  <p className="text-sm font-medium">Operational</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Last Backup</p>
                <p className="text-sm">Today at 3:00 AM</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">System Version</p>
                <p className="text-sm">v1.2.5</p>
              </div>
              
              <Button className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Check for Updates
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Enable or disable features across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Playbooks Module</h3>
                <p className="text-xs text-gray-500">Workflow automation tools</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Reports Module</h3>
                <p className="text-xs text-gray-500">Advanced analytics and reports</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Red Zone Alerts</h3>
                <p className="text-xs text-gray-500">Customer health monitoring</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">MySQL Integration</h3>
                <p className="text-xs text-gray-500">External database connection</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Google Workspace</h3>
                <p className="text-xs text-gray-500">Gmail and Calendar integration</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Chargebee Integration</h3>
                <p className="text-xs text-gray-500">Billing data synchronization</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Import React for useEffect hook
import React from "react";
