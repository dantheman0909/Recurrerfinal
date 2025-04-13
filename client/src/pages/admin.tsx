import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Settings,
  Database,
  Upload,
  User,
  Users,
  Loader2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  FileText,
  Save,
  Link as LinkIcon,
  Key,
  BadgeDollarSign,
  Calendar,
  Clock,
  Percent,
  Search
} from "lucide-react";
import { UserRole } from "@shared/types";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("mysql-config");
  const { toast } = useToast();
  
  return (
    <>
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-gray-500 mr-3" />
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Admin Panel</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure system settings and integrations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="mysql-config" className="flex items-center">
              <Database className="h-4 w-4 mr-2" />
              Database Config
            </TabsTrigger>
            <TabsTrigger value="chargebee-config" className="flex items-center">
              <LinkIcon className="h-4 w-4 mr-2" />
              Chargebee
            </TabsTrigger>
            <TabsTrigger value="data-import" className="flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              Data Import
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="mysql-config">
            <DatabaseConfigTab />
          </TabsContent>
          
          <TabsContent value="chargebee-config">
            <ChargebeeConfigTab />
          </TabsContent>
          
          <TabsContent value="data-import">
            <DataImportTab setActiveTab={setActiveTab} />
          </TabsContent>
          
          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function DatabaseConfigTab() {
  const [mysqlConfig, setMysqlConfig] = useState({
    host: "",
    port: "3306",
    username: "",
    password: "",
    database: "",
    sync_frequency: "24",
    is_scheduled: true
  });
  
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM customers LIMIT 10");
  const [queryResults, setQueryResults] = useState<any>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [isConfigTested, setIsConfigTested] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // State for save query dialog
  const [saveQueryDialogOpen, setSaveQueryDialogOpen] = useState(false);
  const [queryName, setQueryName] = useState("");
  const [queryDescription, setQueryDescription] = useState("");
  
  // State for saved queries
  const [selectedSavedQuery, setSelectedSavedQuery] = useState<string | null>(null);
  
  // Query to fetch saved queries
  const { data: existingSavedQueries, isLoading: isLoadingSavedQueries } = useQuery({
    queryKey: ['/api/admin/mysql-saved-queries'],
  });
  
  // State for field mapping form
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [newMapping, setNewMapping] = useState({
    mysql_field: "",
    local_table: "",
    local_field: "",
    field_type: "text",
    is_key_field: false
  });
  
  // Track available MySQL fields from the query
  const [availableMySQLFields, setAvailableMySQLFields] = useState<string[]>([]);
  
  // Track available Recurrer fields from the database
  const [availableRecurrerFields, setAvailableRecurrerFields] = useState<string[]>([]);
  const [fieldSearchTerm, setFieldSearchTerm] = useState("");
  
  const { toast } = useToast();
  
  const { data: existingConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/admin/mysql-config'],
  });
  
  const { data: existingMappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ['/api/admin/mysql-field-mappings'],
  });
  
  // Query to get all available fields from the customers table
  const { data: existingCustomerFields } = useQuery({
    queryKey: ['/api/admin/customer-fields'],
  });
  
  // Set form fields if we have existing config
  React.useEffect(() => {
    if (existingConfig && Object.keys(existingConfig).length > 0) {
      setMysqlConfig({
        host: existingConfig.host || "",
        port: existingConfig.port?.toString() || "3306",
        username: existingConfig.username || "",
        password: existingConfig.password || "",
        database: existingConfig.database || "",
        sync_frequency: existingConfig.sync_frequency?.toString() || "24",
        is_scheduled: existingConfig.is_scheduled === false ? false : true
      });
      setIsConnected(true);
    }
  }, [existingConfig]);
  
  // Set mappings if we have existing ones
  React.useEffect(() => {
    if (existingMappings && existingMappings.length > 0) {
      setMappings(existingMappings);
    }
  }, [existingMappings]);
  
  // Extract available MySQL fields from query results
  React.useEffect(() => {
    if (queryResults && queryResults.length > 0) {
      // Get all field names from the first result object
      const fields = Object.keys(queryResults[0]);
      setAvailableMySQLFields(fields);
    }
  }, [queryResults]);
  
  // Extract available Recurrer fields from customer fields data
  React.useEffect(() => {
    if (existingCustomerFields && Array.isArray(existingCustomerFields)) {
      setAvailableRecurrerFields(existingCustomerFields);
    }
  }, [existingCustomerFields]);
  
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/mysql-config/test", {
        ...mysqlConfig,
        port: parseInt(mysqlConfig.port)
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: "Successfully connected to MySQL database.",
      });
      setIsConfigTested(true);
      setIsConnected(true);
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to MySQL database. Check your configuration.",
        variant: "destructive",
      });
      setIsConfigTested(true);
      setIsConnected(false);
    },
  });
  
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/mysql-config", {
        ...mysqlConfig,
        port: parseInt(mysqlConfig.port),
        created_by: 1 // Default to first user for demo
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Configuration Saved",
        description: "MySQL configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/mysql-config'] });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save MySQL configuration.",
        variant: "destructive",
      });
    },
  });
  
  const runQueryMutation = useMutation({
    mutationFn: async () => {
      // Ensure query doesn't already have a LIMIT clause
      let queryToExecute = sqlQuery;
      if (!queryToExecute.toLowerCase().includes('limit')) {
        queryToExecute = `${queryToExecute} LIMIT 10`;
      }
      
      const response = await apiRequest("POST", "/api/admin/mysql-query", {
        query: queryToExecute,
        preview: true // This is a preview query
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Handle the new response format that includes metadata
      if (data.isPreview && data.results) {
        setQueryResults(data.results);
        
        // Show a more detailed toast message for preview results
        let description;
        const previewCount = data.results.length || 0;
        const totalCount = data.totalResults || previewCount;
        
        if (totalCount > previewCount) {
          description = `Preview showing ${previewCount} of ${totalCount} total results (limited to 10 rows for preview).`;
        } else {
          description = `Query returned ${previewCount} results.`;
        }
        
        toast({
          title: "Query Executed",
          description,
        });
      } else {
        // Handle legacy format for backward compatibility
        setQueryResults(data);
        toast({
          title: "Query Executed",
          description: `Query returned ${data.length || 0} results.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Query Failed",
        description: error.message || "Failed to execute SQL query.",
        variant: "destructive",
      });
    },
  });
  
  const saveFieldMappingMutation = useMutation({
    mutationFn: async (mapping: any) => {
      const response = await apiRequest("POST", "/api/admin/mysql-field-mappings", {
        ...mapping,
        created_by: 1 // Default to first user for demo
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mapping Saved",
        description: "Field mapping has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/mysql-field-mappings'] });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save field mapping.",
        variant: "destructive",
      });
    },
  });
  
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMysqlConfig(prev => ({ ...prev, [name]: value }));
  };
  
  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };
  
  const handleSaveConfig = () => {
    saveConfigMutation.mutate();
  };
  
  const handleRunQuery = () => {
    runQueryMutation.mutate();
  };
  
  // Handler for field mapping form changes
  const handleMappingChange = (name: string, value: any) => {
    setNewMapping(prev => ({ ...prev, [name]: value }));
  };
  
  // Handler for checkbox changes
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setNewMapping(prev => ({ ...prev, [name]: checked }));
  };
  
  // Delete mapping mutation
  const deleteFieldMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/mysql-field-mappings/${id}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mapping Deleted",
        description: "Field mapping has been deleted successfully. The corresponding column has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/mysql-field-mappings'] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete field mapping.",
        variant: "destructive",
      });
    },
  });
  
  // Handle submitting the mapping form
  const handleSubmitMapping = () => {
    // Extract MySQL table name from the query if possible
    // This is a simple heuristic - a better approach would be server-side extraction
    let mysql_table = "";
    const fromMatch = sqlQuery.match(/\bFROM\s+(\w+)/i);
    if (fromMatch && fromMatch[1]) {
      mysql_table = fromMatch[1];
    }
    
    // Create a mapping object with the correct field names for the API
    const mapping = {
      mysql_table: mysql_table,
      mysql_field: newMapping.mysql_field,
      local_table: newMapping.local_table,
      local_field: newMapping.local_field,
      field_type: newMapping.field_type,
      is_key_field: newMapping.is_key_field,
      // Flag to tell the server to create a new column if it doesn't exist
      create_column_if_missing: true
    };
    
    saveFieldMappingMutation.mutate(mapping);
    
    // Reset form and close dialog after submission
    setNewMapping({
      mysql_field: "",
      local_table: "",
      local_field: "",
      field_type: "text",
      is_key_field: false
    });
    
    setMappingDialogOpen(false);
  };
  
  // Handle deleting a mapping
  const handleDeleteMapping = (id: number) => {
    if (confirm("Are you sure you want to delete this mapping? This will also delete the corresponding column from the database.")) {
      deleteFieldMappingMutation.mutate(id);
    }
  };
  
  const handleSaveMapping = (mapping: any) => {
    saveFieldMappingMutation.mutate(mapping);
  };
  
  // Add save query mutation
  const saveQueryMutation = useMutation({
    mutationFn: async () => {
      // Remove any LIMIT clause when saving the query for future use
      let queryToSave = sqlQuery;
      const limitRegex = /\s+LIMIT\s+\d+(\s*,\s*\d+)?/i;
      queryToSave = queryToSave.replace(limitRegex, '');
      
      const response = await apiRequest("POST", "/api/admin/mysql-saved-queries", {
        name: queryName,
        description: queryDescription,
        query: queryToSave,
        created_by: 1 // Default to first user for demo
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Query Saved",
        description: "Your SQL query has been saved successfully.",
      });
      setSaveQueryDialogOpen(false);
      setQueryName("");
      setQueryDescription("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/mysql-saved-queries'] });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save query.",
        variant: "destructive",
      });
    },
  });
  
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>MySQL Database Configuration</CardTitle>
          <CardDescription>
            Connect to your external MySQL database to sync customer data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="host">Host</Label>
                <Input 
                  id="host" 
                  name="host" 
                  placeholder="e.g., localhost or db.example.com" 
                  value={mysqlConfig.host}
                  onChange={handleConfigChange}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="port">Port</Label>
                <Input 
                  id="port" 
                  name="port" 
                  placeholder="3306" 
                  value={mysqlConfig.port}
                  onChange={handleConfigChange}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="database">Database Name</Label>
                <Input 
                  id="database" 
                  name="database" 
                  placeholder="e.g., customer_db" 
                  value={mysqlConfig.database}
                  onChange={handleConfigChange}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  name="username" 
                  placeholder="Database username" 
                  value={mysqlConfig.username}
                  onChange={handleConfigChange}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="Database password" 
                  value={mysqlConfig.password}
                  onChange={handleConfigChange}
                />
              </div>
              
              <div className="flex items-center justify-between mt-6">
                <div>
                  {isConfigTested && (
                    <Badge className={isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {isConnected ? "Connected" : "Connection Failed"}
                    </Badge>
                  )}
                </div>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={handleTestConnection}
                    disabled={testConnectionMutation.isPending}
                  >
                    {testConnectionMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>
                  <Button 
                    onClick={handleSaveConfig}
                    disabled={saveConfigMutation.isPending}
                  >
                    {saveConfigMutation.isPending ? (
                      <>
                        <Save className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Configuration'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isConnected && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Run SQL Query</CardTitle>
              <CardDescription>
                Test a query to see what data is available in your MySQL database
                <span className="block text-xs text-gray-500 mt-1">Query results are limited to 10 rows for preview purposes</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {existingSavedQueries && existingSavedQueries.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="saved-query">Saved Queries</Label>
                    <Select 
                      value={selectedSavedQuery || ""} 
                      onValueChange={(value) => {
                        if (value) {
                          setSelectedSavedQuery(value);
                          // Find and set the query from the saved queries
                          const selectedQuery = existingSavedQueries.find((q: any) => q.id.toString() === value);
                          if (selectedQuery) {
                            setSqlQuery(selectedQuery.query);
                          }
                        } else {
                          setSelectedSavedQuery(null);
                        }
                      }}
                    >
                      <SelectTrigger id="saved-query">
                        <SelectValue placeholder="Select a saved query or create a new one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Create new query --</SelectItem>
                        {existingSavedQueries.map((query: any) => (
                          <SelectItem key={query.id} value={query.id.toString()}>
                            {query.name} {query.is_active && "(Active)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Select a previously saved query or create a new one
                    </p>
                  </div>
                )}
                
                <div className="grid gap-2">
                  <Label htmlFor="sql-query">SQL Query</Label>
                  <Textarea 
                    id="sql-query" 
                    className="font-mono h-24"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM customers LIMIT 10"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sync_frequency">Sync Frequency (hours)</Label>
                    <Input 
                      id="sync_frequency" 
                      name="sync_frequency"
                      type="number"
                      min="1"
                      max="168"
                      value={mysqlConfig.sync_frequency}
                      onChange={handleConfigChange}
                    />
                    <p className="text-xs text-gray-500">
                      How often to sync data from MySQL (1-168 hours)
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label className="mb-2">Schedule Sync</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_scheduled"
                        name="is_scheduled"
                        checked={mysqlConfig.is_scheduled}
                        onCheckedChange={(checked) => {
                          setMysqlConfig(prev => ({...prev, is_scheduled: checked}));
                        }}
                      />
                      <Label htmlFor="is_scheduled" className="cursor-pointer">
                        {mysqlConfig.is_scheduled ? 'Automatic sync enabled' : 'Automatic sync disabled'}
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Toggle automatic data synchronization
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Dialog open={saveQueryDialogOpen} onOpenChange={setSaveQueryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSaveQueryDialogOpen(true);
                        }}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Query
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save SQL Query</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="query-name">Query Name</Label>
                          <Input 
                            id="query-name" 
                            placeholder="e.g., Active Customers" 
                            value={queryName}
                            onChange={(e) => setQueryName(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="query-description">Description (Optional)</Label>
                          <Textarea 
                            id="query-description" 
                            placeholder="e.g., Retrieves all active customers with their subscription details" 
                            value={queryDescription}
                            onChange={(e) => setQueryDescription(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="query-preview">Query</Label>
                          <Textarea 
                            id="query-preview" 
                            className="font-mono"
                            value={sqlQuery.replace(/\s+LIMIT\s+\d+(\s*,\s*\d+)?/i, '')}
                            readOnly
                          />
                          <p className="text-xs text-gray-500">
                            Saved queries will run without the 10-row preview limitation when used for data synchronization.
                            {sqlQuery.toLowerCase().includes('limit') && (
                              <span className="block mt-1 text-amber-600">Note: LIMIT clause will be removed when saving this query.</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          onClick={() => saveQueryMutation.mutate()}
                          disabled={saveQueryMutation.isPending || !queryName}
                        >
                          {saveQueryMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Query'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    onClick={handleRunQuery}
                    disabled={runQueryMutation.isPending}
                  >
                    {runQueryMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running Query...
                      </>
                    ) : (
                      'Run Query'
                    )}
                  </Button>
                </div>
                
                {queryResults && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Query Results</h3>
                    <div className="overflow-x-auto border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {queryResults.length > 0 && Object.keys(queryResults[0]).map((key) => (
                              <th key={key} className="px-4 py-2 text-left font-medium text-gray-500">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {queryResults.map((row: any, i: number) => (
                            <tr key={i}>
                              {Object.values(row).map((value: any, j: number) => (
                                <td key={j} className="px-4 py-2">{value?.toString() || ''}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Field Mapping</CardTitle>
              <CardDescription>
                Map MySQL fields to Recurrer fields to sync data properly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-4 mb-2">
                  <div className="font-medium text-sm text-gray-500">MySQL Table</div>
                  <div className="font-medium text-sm text-gray-500">MySQL Field</div>
                  <div className="font-medium text-sm text-gray-500">Recurrer Table</div>
                  <div className="font-medium text-sm text-gray-500">Recurrer Field</div>
                  <div className="font-medium text-sm text-gray-500">Data Type</div>
                  <div className="font-medium text-sm text-gray-500">Primary Key</div>
                </div>
                
                {mappings.map((mapping, index) => (
                  <div key={index} className="grid grid-cols-6 gap-4 items-center group">
                    <Input value={mapping.mysql_table} disabled />
                    <Input value={mapping.mysql_field} disabled />
                    <Input value={mapping.local_table} disabled />
                    <Input value={mapping.local_field} disabled />
                    <Badge variant="outline" className={
                      mapping.field_type === 'number' ? 'bg-blue-50 text-blue-700' : 
                      mapping.field_type === 'percentage' ? 'bg-green-50 text-green-700' :
                      mapping.field_type === 'percentage_calculated' ? 'bg-emerald-50 text-emerald-700' :
                      mapping.field_type === 'date' ? 'bg-amber-50 text-amber-700' :
                      mapping.field_type === 'time' ? 'bg-indigo-50 text-indigo-700' :
                      mapping.field_type === 'revenue' ? 'bg-purple-50 text-purple-700' :
                      'bg-gray-50 text-gray-700'
                    }>
                      {mapping.field_type === 'number' ? 'Number' :
                       mapping.field_type === 'percentage' ? 'Percentage' :
                       mapping.field_type === 'percentage_calculated' ? 'Percentage (Calculated)' :
                       mapping.field_type === 'date' ? 'Date' :
                       mapping.field_type === 'time' ? 'Time' :
                       mapping.field_type === 'revenue' ? 'Revenue (₹)' :
                       'Text'}
                    </Badge>
                    <div className="flex items-center justify-between">
                      {mapping.is_key_field ? (
                        <Badge className="bg-yellow-50 text-yellow-700">
                          <Key className="h-3 w-3 mr-1" />
                          Primary Key
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteMapping(mapping.id)}
                        title="Delete this mapping"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      onClick={() => setMappingDialogOpen(true)}
                      disabled={!queryResults || queryResults.length === 0}
                    >
                      Add Field Mapping
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Map Database Fields</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="mysql-field">MySQL Field</Label>
                        {availableMySQLFields.length > 0 ? (
                          <Select 
                            value={newMapping.mysql_field}
                            onValueChange={(value) => handleMappingChange('mysql_field', value)}
                          >
                            <SelectTrigger id="mysql-field">
                              <SelectValue placeholder="Select field from query results" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMySQLFields.map(field => (
                                <SelectItem key={field} value={field}>
                                  {field}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                            Please run a query first to see available fields from your MySQL database.
                          </div>
                        )}
                        <p className="text-xs text-gray-500">These fields are pulled from your query results.</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="local-table">Recurrer Table</Label>
                          <Select 
                            value={newMapping.local_table} 
                            onValueChange={(value) => handleMappingChange('local_table', value)}
                          >
                            <SelectTrigger id="local-table">
                              <SelectValue placeholder="Select table" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customers">Customers</SelectItem>
                              <SelectItem value="customer_metrics">Customer Metrics</SelectItem>
                              <SelectItem value="tasks">Tasks</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="local-field">Recurrer Field</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {newMapping.local_field || "Select or create a field..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput 
                                  placeholder="Search fields..." 
                                  className="h-9"
                                  value={fieldSearchTerm}
                                  onValueChange={setFieldSearchTerm}
                                />
                                <CommandList>
                                  <CommandEmpty>No matching fields found. Type to create a new field.</CommandEmpty>
                                  <CommandGroup>
                                    {availableRecurrerFields.filter(field => 
                                      field.toLowerCase().includes(fieldSearchTerm.toLowerCase())
                                    ).map(field => (
                                      <CommandItem
                                        key={field}
                                        value={field}
                                        onSelect={() => {
                                          handleMappingChange('local_field', field);
                                          setFieldSearchTerm("");
                                        }}
                                      >
                                        {field}
                                        {newMapping.local_field === field && (
                                          <Check className="ml-auto h-4 w-4" />
                                        )}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                  {fieldSearchTerm && !availableRecurrerFields.some(f => 
                                    f.toLowerCase() === fieldSearchTerm.toLowerCase()
                                  ) && (
                                    <CommandGroup heading="Create new field">
                                      <CommandItem
                                        onSelect={() => {
                                          handleMappingChange('local_field', fieldSearchTerm);
                                          setFieldSearchTerm("");
                                        }}
                                        className="text-blue-600"
                                      >
                                        <span>Create "{fieldSearchTerm}"</span>
                                        <Search className="ml-auto h-4 w-4" />
                                      </CommandItem>
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <p className="text-xs text-gray-500">
                            If field doesn't exist, it will be created automatically in the database.
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="field-type">Data Type</Label>
                          <Select 
                            value={newMapping.field_type}
                            onValueChange={(value) => handleMappingChange('field_type', value)}
                          >
                            <SelectTrigger id="field-type">
                              <SelectValue placeholder="Select data type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">
                                <div className="flex items-center">
                                  <FileText className="w-4 h-4 mr-2" />
                                  <span>Text</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="number">
                                <div className="flex items-center">
                                  <span className="w-4 h-4 mr-2 font-bold">#</span>
                                  <span>Number</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="percentage">
                                <div className="flex items-center">
                                  <Percent className="w-4 h-4 mr-2" />
                                  <span>Percentage</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="percentage_calculated">
                                <div className="flex items-center">
                                  <Percent className="w-4 h-4 mr-2" />
                                  <span>Percentage (Calculated)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="date">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  <span>Date</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="time">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-2" />
                                  <span>Time</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="revenue">
                                <div className="flex items-center">
                                  <BadgeDollarSign className="w-4 h-4 mr-2" />
                                  <span>Revenue (₹)</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="is_key_field" className="flex items-center space-x-2">
                            <div>Primary Key</div>
                            <div className="text-gray-500 text-xs">(Unique identifier)</div>
                          </Label>
                          <div className="flex items-center space-x-2 h-10 px-2 border rounded-md">
                            <input
                              type="checkbox"
                              id="is_key_field"
                              name="is_key_field"
                              className="h-4 w-4 rounded border-gray-300 text-primary"
                              checked={newMapping.is_key_field}
                              onChange={handleCheckboxChange}
                            />
                            <div className="text-sm text-gray-600">
                              Mark as primary key for matching records
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-4 space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setMappingDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSubmitMapping}
                          disabled={!newMapping.mysql_field || !newMapping.local_table || !newMapping.local_field}
                        >
                          Save Mapping
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      
      {!isConnected && (
        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
              <div>
                <h3 className="font-medium text-yellow-800">No Database Connection</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  You don't have an active MySQL connection. Configure and test your connection first, or you can use CSV import as an alternative.
                </p>
                <Button variant="outline" className="mt-3 bg-white">
                  Go to CSV Import
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChargebeeConfigTab() {
  const [chargebeeConfig, setChargebeeConfig] = useState({
    site: "",
    apiKey: "",
    sync_frequency: 24
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("connection");
  
  // Fetch existing Chargebee configuration
  const { data: existingConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/admin/chargebee-config'],
  });
  
  // Field mappings state
  const [selectedEntityType, setSelectedEntityType] = useState<string>("customer");
  
  // Fetch field mappings
  const { data: fieldMappings, isLoading: isLoadingMappings, refetch: refetchMappings } = useQuery({
    queryKey: ['/api/admin/chargebee-field-mappings'],
    enabled: activeTab === "mappings"
  });
  
  // Fetch available Chargebee fields
  const { data: availableFields = {}, isLoading: isLoadingFields } = useQuery({
    queryKey: ['/api/admin/chargebee-available-fields'],
    enabled: activeTab === "mappings"
  });
  
  // Set form fields if we have existing config
  React.useEffect(() => {
    if (existingConfig) {
      // Check if the data is not null and has the expected properties
      if (typeof existingConfig === 'object' && existingConfig !== null) {
        const config = existingConfig as Record<string, any>;
        setChargebeeConfig({
          site: config.site || "",
          apiKey: config.apiKey || "",
          sync_frequency: config.sync_frequency || 24
        });
        
        // Only set as connected if we have actual values
        if (config.site && config.apiKey) {
          setIsConnected(true);
        }
      }
    }
  }, [existingConfig]);
  
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === "sync_frequency") {
      // Ensure sync_frequency is between 1 and 168 hours (1 week)
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        const boundedValue = Math.min(Math.max(numValue, 1), 168);
        setChargebeeConfig(prev => ({ ...prev, [name]: boundedValue }));
      }
    } else {
      setChargebeeConfig(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/chargebee-config/test", chargebeeConfig);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: "Successfully connected to Chargebee.",
      });
      setIsConnected(true);
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Chargebee. Check your configuration.",
        variant: "destructive",
      });
      setIsConnected(false);
    },
  });
  
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/chargebee-config", chargebeeConfig);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Configuration Saved",
        description: "Chargebee configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/chargebee-config'] });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save Chargebee configuration.",
        variant: "destructive",
      });
    },
  });
  
  const addFieldMappingMutation = useMutation({
    mutationFn: async (mapping: any) => {
      const response = await apiRequest("POST", "/api/admin/chargebee-field-mappings", mapping);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mapping Added",
        description: "Field mapping has been added successfully.",
      });
      refetchMappings();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add field mapping",
        variant: "destructive",
      });
    },
  });
  
  const deleteFieldMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/chargebee-field-mappings/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mapping Deleted",
        description: "Field mapping has been deleted successfully.",
      });
      refetchMappings();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete field mapping",
        variant: "destructive",
      });
    },
  });
  
  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };
  
  const handleSaveConfig = () => {
    saveConfigMutation.mutate();
  };
  
  const handleAddMapping = (mapping: any) => {
    addFieldMappingMutation.mutate(mapping);
  };
  
  const handleDeleteMapping = (id: number) => {
    deleteFieldMappingMutation.mutate(id);
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connection">
          <Card>
            <CardHeader>
              <CardTitle>Chargebee Integration</CardTitle>
              <CardDescription>
                Connect to Chargebee for financial data (read-only access)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingConfig ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin mr-2">
                    <RefreshCw className="h-5 w-5 text-gray-400" />
                  </div>
                  <p>Loading configuration...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="site">Chargebee Site</Label>
                        <Input 
                          id="site" 
                          name="site" 
                          placeholder="e.g., yourcompany" 
                          value={chargebeeConfig.site}
                          onChange={handleConfigChange}
                        />
                        <p className="text-xs text-gray-500">
                          Your Chargebee site name (yourcompany.chargebee.com)
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="apiKey">API Key</Label>
                        <Input 
                          id="apiKey" 
                          name="apiKey" 
                          type="password" 
                          placeholder="Chargebee API Key" 
                          value={chargebeeConfig.apiKey}
                          onChange={handleConfigChange}
                        />
                        <p className="text-xs text-gray-500">
                          Create a read-only API key in your Chargebee dashboard
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="sync_frequency">Sync Frequency (hours)</Label>
                    <Input 
                      id="sync_frequency" 
                      name="sync_frequency"
                      type="number"
                      min="1"
                      max="168"
                      value={chargebeeConfig.sync_frequency}
                      onChange={handleConfigChange}
                    />
                    <p className="text-xs text-gray-500">
                      How often to sync data from Chargebee (1-168 hours)
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6">
                    <div>
                      {isConnected && (
                        <Badge className="bg-green-100 text-green-800">
                          Connected
                        </Badge>
                      )}
                    </div>
                    <div className="space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={handleTestConnection}
                        disabled={testConnectionMutation.isPending}
                      >
                        {testConnectionMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          "Test Connection"
                        )}
                      </Button>
                      <Button 
                        onClick={handleSaveConfig}
                        disabled={saveConfigMutation.isPending}
                      >
                        {saveConfigMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Configuration"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="mappings">
          <Card>
            <CardHeader>
              <CardTitle>Field Mappings</CardTitle>
              <CardDescription>
                Map Chargebee fields to Recurrer database fields for selective data synchronization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMappings || isLoadingFields ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin mr-2">
                    <RefreshCw className="h-5 w-5 text-gray-400" />
                  </div>
                  <p>Loading field mappings...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label>Entity Type</Label>
                    <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an entity type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      Select the type of Chargebee entity to map fields from
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Current Mappings</h3>
                    </div>
                    
                    {!fieldMappings || fieldMappings.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-md">
                        <p className="text-gray-500">No field mappings configured yet</p>
                        <p className="text-sm text-gray-400">
                          Add mappings below to specify which Chargebee data to import
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Entity</TableHead>
                              <TableHead>Chargebee Field</TableHead>
                              <TableHead>Local Table</TableHead>
                              <TableHead>Local Field</TableHead>
                              <TableHead>Key Field</TableHead>
                              <TableHead className="w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fieldMappings.map((mapping: any) => (
                              <TableRow key={mapping.id}>
                                <TableCell>{mapping.chargebee_entity}</TableCell>
                                <TableCell>{mapping.chargebee_field}</TableCell>
                                <TableCell>{mapping.local_table}</TableCell>
                                <TableCell>{mapping.local_field}</TableCell>
                                <TableCell>{mapping.is_key_field ? "Yes" : "No"}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteMapping(mapping.id)}
                                    disabled={deleteFieldMappingMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4 mt-6">
                    <h3 className="text-lg font-semibold">Add New Mapping</h3>
                    <AddFieldMappingForm 
                      entityType={selectedEntityType}
                      availableFields={availableFields[selectedEntityType] || []}
                      onAddMapping={handleAddMapping}
                      isLoading={addFieldMappingMutation.isPending}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Field mapping form component
function AddFieldMappingForm({
  entityType,
  availableFields,
  onAddMapping,
  isLoading
}: {
  entityType: string;
  availableFields: any[];
  onAddMapping: (mapping: any) => void;
  isLoading: boolean;
}) {
  const [chargebeeField, setChargebeeField] = useState("");
  const [localTable, setLocalTable] = useState("customers");
  const [localField, setLocalField] = useState("");
  const [isKeyField, setIsKeyField] = useState(false);
  
  // Reset field when entity type changes
  React.useEffect(() => {
    setChargebeeField("");
  }, [entityType]);
  
  // Reset local field when table changes
  React.useEffect(() => {
    setLocalField("");
  }, [localTable]);
  
  // Local table options based on entity type
  const getLocalTables = () => {
    if (entityType === "customer") {
      return [{ value: "customers", label: "Customers" }];
    } else if (entityType === "subscription") {
      return [
        { value: "customers", label: "Customers" },
        { value: "subscriptions", label: "Subscriptions" }
      ];
    } else {
      return [
        { value: "customers", label: "Customers" },
        { value: "invoices", label: "Invoices" }
      ];
    }
  };
  
  // Local field options based on table
  const getLocalFields = () => {
    if (localTable === "customers") {
      return [
        { value: "recurrer_id", label: "Recurrer ID" },
        { value: "name", label: "Name" },
        { value: "contact_email", label: "Email" },
        { value: "industry", label: "Industry" },
        { value: "mrr", label: "MRR" },
        { value: "arr", label: "ARR" },
        { value: "chargebee_id", label: "Chargebee ID" }
      ];
    } else if (localTable === "subscriptions") {
      return [
        { value: "subscription_id", label: "Subscription ID" },
        { value: "customer_id", label: "Customer ID" },
        { value: "plan_name", label: "Plan Name" },
        { value: "amount", label: "Amount" },
        { value: "status", label: "Status" },
        { value: "next_billing_at", label: "Next Billing Date" }
      ];
    } else {
      return [
        { value: "invoice_id", label: "Invoice ID" },
        { value: "customer_id", label: "Customer ID" },
        { value: "amount", label: "Amount" },
        { value: "status", label: "Status" },
        { value: "due_date", label: "Due Date" }
      ];
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const mapping = {
      chargebee_entity: entityType,
      chargebee_field: chargebeeField,
      local_table: localTable,
      local_field: localField,
      is_key_field: isKeyField
    };
    
    onAddMapping(mapping);
    
    // Reset form fields
    setChargebeeField("");
    setLocalField("");
    setIsKeyField(false);
  };
  
  return (
    <form onSubmit={handleSubmit} className="border rounded-md p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="chargebee_field">Chargebee Field</Label>
          <Select value={chargebeeField} onValueChange={setChargebeeField}>
            <SelectTrigger id="chargebee_field" className="w-full">
              <SelectValue placeholder="Select a field" />
            </SelectTrigger>
            <SelectContent>
              {availableFields.map((field: any) => (
                <SelectItem key={field.name} value={field.name}>
                  {field.description || field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            The field from Chargebee to import
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="local_table">Local Table</Label>
          <Select value={localTable} onValueChange={setLocalTable}>
            <SelectTrigger id="local_table" className="w-full">
              <SelectValue placeholder="Select a table" />
            </SelectTrigger>
            <SelectContent>
              {getLocalTables().map(table => (
                <SelectItem key={table.value} value={table.value}>
                  {table.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            The table in Recurrer where data will be stored
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="local_field">Local Field</Label>
          <Select value={localField} onValueChange={setLocalField}>
            <SelectTrigger id="local_field" className="w-full">
              <SelectValue placeholder="Select a field" />
            </SelectTrigger>
            <SelectContent>
              {getLocalFields().map(field => (
                <SelectItem key={field.value} value={field.value}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            The field in the local table to store the data
          </p>
        </div>
        
        <div className="flex items-center space-x-2 pt-8">
          <Checkbox
            id="is_key_field"
            checked={isKeyField}
            onCheckedChange={(checked) => setIsKeyField(checked === true)}
          />
          <Label htmlFor="is_key_field" className="font-normal cursor-pointer">
            Key Field (used for record matching)
          </Label>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={!chargebeeField || !localTable || !localField || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Mapping"
          )}
        </Button>
      </div>
    </form>
  );
}

function DataImportTab({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const { toast } = useToast();
  const [showNoMySQLMessage, setShowNoMySQLMessage] = useState(true);
  
  const { data: mysqlConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/admin/mysql-config'],
  });
  
  // Check if MySQL is configured
  React.useEffect(() => {
    if (mysqlConfig && Object.keys(mysqlConfig).length > 0) {
      setShowNoMySQLMessage(false);
    } else {
      setShowNoMySQLMessage(true);
    }
  }, [mysqlConfig]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      
      // Read CSV file and generate preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const csvData = event.target.result as string;
          const rows = csvData.split('\n');
          if (rows.length > 0) {
            const headers = rows[0].split(',');
            const data = [];
            
            // Process up to 5 rows for preview
            for (let i = 1; i < Math.min(rows.length, 6); i++) {
              if (rows[i].trim()) {
                const values = rows[i].split(',');
                const row: Record<string, string> = {};
                
                headers.forEach((header, index) => {
                  row[header.trim()] = values[index]?.trim() || '';
                });
                
                data.push(row);
              }
            }
            
            setPreviewData(data);
          }
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };
  
  const handleImport = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Send file to server endpoint
    fetch('/api/import/csv', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      setIsUploading(false);
      if (data.success) {
        toast({
          title: "Import Successful",
          description: `Imported ${data.count || previewData.length} records from ${selectedFile.name}`,
        });
      } else {
        throw new Error(data.error || "Import failed");
      }
    })
    .catch(error => {
      setIsUploading(false);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
    });
  };
  
  // Sample CSV download links now use direct anchor tags with the download attribute
  
  return (
    <div className="grid grid-cols-1 gap-6">
      {showNoMySQLMessage ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
              No Database Connection
            </CardTitle>
            <CardDescription>
              You don't have an active MySQL connection. Configure and test your connection first, or you can use CSV import as an alternative.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button 
                onClick={() => setActiveTab("mysql-config")}
                variant="outline"
              >
                <Database className="h-4 w-4 mr-2" />
                Go to Database Config
              </Button>
              <a 
                href="/sample/customer-import-sample.csv"
                download
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download Sample CSV
              </a>
            </div>
          </CardContent>
        </Card>
      ) : null}
      
      <Card>
        <CardHeader>
          <CardTitle>CSV Data Import</CardTitle>
          <CardDescription>
            Upload customer data from a CSV file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="csv-file">Select CSV File</Label>
                <a 
                  href="/sample/customer-import-sample.csv"
                  download
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Download Sample CSV
                </a>
              </div>
              
              <Input 
                id="csv-file" 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
              />
              <p className="text-xs text-gray-500">
                File should include customer data with headers for company_id, company_name, etc.
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleImport}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Data'
                )}
              </Button>
            </div>
            
            {previewData.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Data Preview</h3>
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(previewData[0]).map((key) => (
                          <th key={key} className="px-4 py-2 text-left font-medium text-gray-500">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((value: any, j) => (
                            <td key={j} className="px-4 py-2">{value?.toString() || ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Google Sheets Import</CardTitle>
          <CardDescription>
            Import data directly from Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sheet-url">Google Sheet URL</Label>
              <Input 
                id="sheet-url" 
                placeholder="https://docs.google.com/spreadsheets/d/..." 
              />
              <p className="text-xs text-gray-500">
                Sheet must be shared with view access
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button>
                Connect to Sheet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserManagementTab() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
  });
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "New user has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      toast({
        title: "Create Failed",
        description: error.message || "Failed to create user.",
        variant: "destructive",
      });
    },
  });
  
  const handleCreateUser = (data: any) => {
    createUserMutation.mutate(data);
  };
  
  const getRoleBadgeStyles = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return "bg-purple-100 text-purple-800";
      case 'team_lead':
        return "bg-blue-100 text-blue-800";
      case 'csm':
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <User className="h-4 w-4 mr-2" />
                New User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Enter user's full name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter user's email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="team_lead">Team Lead</SelectItem>
                      <SelectItem value="csm">CSM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="mr-2"
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleCreateUser({
                    name: "New User",
                    email: "user@example.com",
                    role: "csm"
                  })}>
                    Create User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">Loading users...</div>
          ) : users && users.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {users.map((user: any) => (
                <div key={user.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <AvatarWithInitials 
                      name={user.name}
                      imageUrl={user.avatar_url}
                      className="h-10 w-10"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={getRoleBadgeStyles(user.role as UserRole)}>
                      {user.role.replace('_', ' ')}
                    </Badge>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        Reset Password
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No users found. Create your first user to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
