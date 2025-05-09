import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatINR } from "@/lib/utils";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  AlertCircle,
  Settings,
  Database,
  Upload,
  User as UserIcon,
  Users,
  Loader2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  FileText,
  Save,
  Link as LinkIcon,
  Info as InfoIcon,
  Key,
  BadgeDollarSign,
  Calendar,
  Clock,
  ChevronDown,
  Trophy,
  Bell,
  Award,
  Star,
  Zap,
  LineChart,
  Check,
  BadgeCheck,
  Percent,
  Search,
  ChevronsUpDown,
  Download
} from "lucide-react";
import { UserRole } from "@shared/types";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";

// Component to fetch total record counts from the database
function TotalRecordsCounter({ entity, chargebeeConfig }: { entity: string, chargebeeConfig: any }) {
  const [dbCount, setDbCount] = useState<number | null>(null); // Count from database
  const [totalCount, setTotalCount] = useState<number | null>(null); // Total from Chargebee
  const [loading, setLoading] = useState(true);
  
  React.useEffect(() => {
    const fetchTotalCount = async () => {
      try {
        setLoading(true);
        
        // Get count from the actual database for our local records
        const response = await fetch(`/api/admin/entity-count/${entity}`);
        const data = await response.json();
        
        // Check if data has the count property and it's a number
        if (data && typeof data.count === 'number') {
          setDbCount(data.count);
          console.log(`Received ${entity} count from database:`, data.count);
        } else {
          console.error(`Invalid response format for ${entity} count:`, data);
          setDbCount(0);
        }
        
        // Also get the total count from Chargebee's last sync stats
        if (chargebeeConfig?.last_sync_stats) {
          let syncStats;
          try {
            // Handle the case where last_sync_stats might be a JSON string
            if (typeof chargebeeConfig.last_sync_stats === 'string') {
              syncStats = JSON.parse(chargebeeConfig.last_sync_stats);
            } else {
              syncStats = chargebeeConfig.last_sync_stats;
            }
            
            // Extract the total count from sync stats
            if (syncStats && syncStats[entity]) {
              if (typeof syncStats[entity] === 'object') {
                setTotalCount(syncStats[entity].total || 0);
              } else {
                setTotalCount(syncStats[entity] || 0);
              }
            } else {
              setTotalCount(0);
            }
          } catch (e) {
            console.error(`Error parsing last_sync_stats for ${entity}:`, e);
            setTotalCount(0);
          }
        } else {
          setTotalCount(0);
        }
      } catch (error) {
        console.error(`Error fetching ${entity} count:`, error);
        setDbCount(0);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTotalCount();
  }, [entity, chargebeeConfig?.last_synced_at]);
  
  if (loading) {
    return <span className="animate-pulse">Loading...</span>;
  }
  
  // Show DB count / Total count if we have both
  if (totalCount !== null && totalCount > 0) {
    return <>{dbCount?.toLocaleString() || 0} / {totalCount?.toLocaleString() || 0}</>;
  }
  
  // Otherwise just show DB count
  return <>{dbCount?.toLocaleString() || 0}</>;
}

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
            <TabsTrigger value="system-settings" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              System Settings
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
          
          <TabsContent value="system-settings">
            <SystemSettingsTab />
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
  const [queryPreview, setQueryPreview] = useState<string>("");
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [mappingToDelete, setMappingToDelete] = useState<number | null>(null);
  const [isConfigTested, setIsConfigTested] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // State for mappings
  const [mappings, setMappings] = useState<any[]>([]);
  
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
  // State to store table-specific fields (used to filter the field dropdown)
  const [existingTableFields, setExistingTableFields] = useState<Record<string, string[]>>({
    customers: [],
    customer_metrics: [],
    tasks: []
  });
  const [fieldSearchTerm, setFieldSearchTerm] = useState("");
  
  const { toast } = useToast();
  
  const { data: existingConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/admin/mysql-config'],
  });
  
  const { data: existingMappings, isLoading: isLoadingFieldMappings } = useQuery({
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
  
  // Load the last executed query and select the last active saved query when component mounts
  React.useEffect(() => {
    const lastQuery = localStorage.getItem('mysql_last_executed_query');
    if (lastQuery) {
      setSqlQuery(lastQuery);
      
      // Also automatically run the query to display the results
      const runLastQuery = async () => {
        try {
          // Run the query to show preview results
          runQueryMutation.mutate();
        } catch (error) {
          console.error("Failed to run last query:", error);
        }
      };
      
      // Only run if we're connected to MySQL
      if (isConnected) {
        runLastQuery();
      }
    }
  }, [isConnected]);
  
  // Auto-select the active saved query when saved queries are loaded
  React.useEffect(() => {
    if (existingSavedQueries && existingSavedQueries.length > 0) {
      // Find the active query or the most recently used one
      const activeQuery = existingSavedQueries.find((q: any) => q.is_active === true);
      if (activeQuery) {
        setSelectedSavedQuery(activeQuery.id.toString());
        setSqlQuery(activeQuery.query);
      }
    }
  }, [existingSavedQueries]);
  
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
      // Store all fields to have them available
      setAvailableRecurrerFields(existingCustomerFields);
      
      // Query the server for table-specific fields
      const fetchTableFields = async () => {
        try {
          // Get fields for customers table 
          const customersResponse = await fetch('/api/admin/table-fields/customers');
          if (customersResponse.ok) {
            const customersFields = await customersResponse.json();
            
            // Get fields for customer_metrics table
            const metricsResponse = await fetch('/api/admin/table-fields/customer_metrics');
            const metricsFields = metricsResponse.ok ? await metricsResponse.json() : [];
            
            // Get fields for tasks table
            const tasksResponse = await fetch('/api/admin/table-fields/tasks');
            const tasksFields = tasksResponse.ok ? await tasksResponse.json() : [];
            
            // Update existing table fields state with all table fields
            setExistingTableFields(prev => ({
              ...prev,
              'customers': customersFields,
              'customer_metrics': metricsFields,
              'tasks': tasksFields
            }));
          }
          
          // Fields are already fetched and set above
        } catch (error) {
          console.error('Error fetching table fields:', error);
        }
      };
      
      fetchTableFields();
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
      
      // Add the new mapping to the local state for immediate UI update
      setMappings(prevMappings => [...prevMappings, data]);
      
      // Also refresh from server
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
    // Store the last executed query in localStorage
    localStorage.setItem('mysql_last_executed_query', sqlQuery);
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
      // Immediately update local state to reflect the deletion
      setMappings(prevMappings => prevMappings.filter(mapping => mapping.id !== data.deletedId));
      // Also refresh from server
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
    // Set the mapping to delete and show the confirmation dialog
    setMappingToDelete(id);
    setShowDeleteDialog(true);
  };
  
  // Handle confirmation of deletion
  const confirmDeleteMapping = () => {
    if (mappingToDelete !== null) {
      deleteFieldMappingMutation.mutate(mappingToDelete);
      setShowDeleteDialog(false);
      setMappingToDelete(null);
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
      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this mapping? This will also delete the corresponding column from the database.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteMapping}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
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
                      value={selectedSavedQuery || "create_new"} 
                      onValueChange={(value) => {
                        if (value === "create_new") {
                          setSelectedSavedQuery(null);
                          setSqlQuery("SELECT * FROM customers LIMIT 10");
                        } else if (value) {
                          setSelectedSavedQuery(value);
                          // Find and set the query from the saved queries
                          const selectedQuery = existingSavedQueries.find((q: any) => q.id.toString() === value);
                          if (selectedQuery) {
                            setSqlQuery(selectedQuery.query);
                          }
                        }
                      }}
                    >
                      <SelectTrigger id="saved-query">
                        <SelectValue placeholder="Select a saved query or create a new one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="create_new">-- Create new query --</SelectItem>
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
                              {Object.entries(row).map(([key, value]: [string, any], j: number) => (
                                <td key={j} className="px-4 py-2">
                                  {key === 'revenue_1_year' && value !== null && !isNaN(Number(value))
                                    ? formatINR(value)
                                    : value?.toString() || ''}
                                </td>
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
                                    {/* Use table-specific fields if available, otherwise use all fields */}
                                    {(newMapping.local_table && existingTableFields[newMapping.local_table] 
                                      ? existingTableFields[newMapping.local_table]
                                      : availableRecurrerFields
                                    ).filter(field => 
                                      // Filter by search term
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
                                  {fieldSearchTerm && (newMapping.local_table && existingTableFields[newMapping.local_table] 
                                    ? !existingTableFields[newMapping.local_table].some(f => f.toLowerCase() === fieldSearchTerm.toLowerCase())
                                    : !availableRecurrerFields.some(f => f.toLowerCase() === fieldSearchTerm.toLowerCase())
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
                            Showing fields from the selected Recurrer table.
                            {!newMapping.local_table && <span className="block text-yellow-500 mt-1">Select a table to see available fields.</span>}
                            {fieldSearchTerm && <span className="block mt-1">If field doesn't exist, it will be created automatically.</span>}
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
    sync_frequency: 24,
    status: 'inactive',
    last_synced_at: null,
    last_sync_stats: null
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("connection");
  
  // Fetch existing Chargebee configuration
  const { data: existingConfig, isLoading: isLoadingConfig, refetch: refetchConfig } = useQuery({
    queryKey: ['/api/admin/chargebee-config'],
  });
  
  // Manual sync mutations for Chargebee data
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/chargebee-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync Chargebee data');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Prepare detailed statistics message if available
      let statsMessage = `Successfully synchronized ${data.records} records from Chargebee.`;
      
      if (data.syncStats) {
        statsMessage = `Successfully synchronized ${data.records} records from Chargebee:\n` +
                       `• ${data.syncStats.customers || 0} customers\n` +
                       `• ${data.syncStats.subscriptions || 0} subscriptions\n` +
                       `• ${data.syncStats.invoices || 0} invoices`;
      }
      
      toast({
        title: 'Data Sync Complete',
        description: statsMessage,
      });
      
      // Refresh the configuration to update the last_synced_at timestamp
      refetchConfig();
      
      // Invalidate customers data to reflect the changes
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    },
    onError: (error) => {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'An error occurred during data synchronization.',
        variant: 'destructive',
      });
    }
  });

  // Manual sync mutation for non-recurring invoices
  const nonRecurringInvoicesSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/chargebee-sync/non-recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync non-recurring invoices');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Non-Recurring Invoices Sync Complete',
        description: `Successfully synchronized ${data.invoices_synced} non-recurring invoices out of ${data.invoices_found} found.`,
      });
      
      // Refresh the configuration to update the last_synced_at timestamp
      refetchConfig();
      
      // Invalidate customers data to reflect the changes
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    },
    onError: (error) => {
      toast({
        title: 'Non-Recurring Invoices Sync Failed',
        description: error instanceof Error ? error.message : 'An error occurred during non-recurring invoices synchronization.',
        variant: 'destructive',
      });
    }
  });
  
  // Full invoices sync mutation
  const fullInvoicesSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/invoices-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync all invoices');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Full Invoices Sync Complete',
        description: `Successfully synchronized ${data.invoices_synced} invoices out of ${data.invoices_found} found in ${data.processing_time_seconds} seconds (${data.invoices_per_minute} per minute).`,
      });
      
      // Refresh the configuration to update the last_synced_at timestamp
      refetchConfig();
      
      // Invalidate entity counts to reflect changes
      queryClient.invalidateQueries({ queryKey: ['/api/admin/entity-count/invoices'] });
    },
    onError: (error) => {
      toast({
        title: 'Full Invoices Sync Failed',
        description: error instanceof Error ? error.message : 'An error occurred during the full invoices synchronization.',
        variant: 'destructive',
      });
    }
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
        
        // Parse last_sync_stats JSON if it exists
        let parsedStats = null;
        if (config.last_sync_stats) {
          try {
            // If it's already an object, use it directly, otherwise parse the JSON string
            parsedStats = typeof config.last_sync_stats === 'string' 
              ? JSON.parse(config.last_sync_stats) 
              : config.last_sync_stats;
          } catch (e) {
            console.error('Error parsing last_sync_stats:', e);
          }
        }
        
        setChargebeeConfig({
          site: config.site || "",
          apiKey: config.apiKey || "",
          sync_frequency: config.sync_frequency || 24,
          status: config.status || 'inactive',
          last_synced_at: config.last_synced_at || null,
          last_sync_stats: parsedStats
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
    onSuccess: (data) => {
      toast({
        title: "Mapping Deleted",
        description: "Field mapping has been deleted successfully.",
      });
      // Immediately update local state to reflect the deletion (for UI responsiveness)
      if (fieldMappings) {
        // Let the queryClient refetch handle the update instead of manually updating
        // This avoids the TypeScript error with setFieldMappings not being defined
      }
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
                  
                  <div className="border-t mt-6 pt-6">
                    <h3 className="text-lg font-medium mb-4">Data Synchronization</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-700">
                          Last synchronized: {chargebeeConfig.last_synced_at ? 
                            new Date(chargebeeConfig.last_synced_at).toLocaleString() : 
                            'Never'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {chargebeeConfig.status === 'active' ? 
                            `Automatic sync every ${chargebeeConfig.sync_frequency} hours` : 
                            'Automatic sync is disabled'}
                        </p>
                        {chargebeeConfig.last_sync_stats && (
                          <div className="text-xs text-gray-600 pt-1">
                            <div className="flex items-center mb-1">
                              <p className="font-medium">Current database totals:</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <InfoIcon className="h-3 w-3 ml-1 text-gray-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="w-[240px] text-xs">
                                      Format: Database Count / Total Synced Count<br/>
                                      Database count shows records stored in our database. Total synced count shows all records processed from Chargebee.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="flex space-x-4 mt-1">
                              <span>
                                <Badge variant="outline" className="bg-blue-50 text-blue-800 mr-1">
                                  <TotalRecordsCounter entity="customers" chargebeeConfig={chargebeeConfig} />
                                </Badge>
                                customers
                              </span>
                              <span>
                                <Badge variant="outline" className="bg-green-50 text-green-800 mr-1">
                                  <TotalRecordsCounter entity="subscriptions" chargebeeConfig={chargebeeConfig} />
                                </Badge>
                                subscriptions
                              </span>
                              <span>
                                <Badge variant="outline" className="bg-purple-50 text-purple-800 mr-1">
                                  <TotalRecordsCounter entity="invoices" chargebeeConfig={chargebeeConfig} />
                                </Badge>
                                invoices
                              </span>
                            </div>
                            <div className="mt-1 text-gray-500">
                              <p>Last sync processed: {chargebeeConfig.last_sync_stats?.processed || 'Unknown'} records</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex">
                          <Button
                            onClick={() => manualSyncMutation.mutate()}
                            disabled={manualSyncMutation.isPending || nonRecurringInvoicesSyncMutation.isPending || fullInvoicesSyncMutation.isPending}
                          >
                            {manualSyncMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Sync Now
                              </>
                            )}
                          </Button>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => nonRecurringInvoicesSyncMutation.mutate()}
                            disabled={nonRecurringInvoicesSyncMutation.isPending || manualSyncMutation.isPending || fullInvoicesSyncMutation.isPending}
                            title="Sync one-time invoices and other non-recurring charges"
                          >
                            {nonRecurringInvoicesSyncMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Syncing One-time...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Sync One-time Invoices
                              </>
                            )}
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={() => fullInvoicesSyncMutation.mutate()}
                            disabled={fullInvoicesSyncMutation.isPending || nonRecurringInvoicesSyncMutation.isPending || manualSyncMutation.isPending}
                            title="Sync all invoices (recurring and non-recurring)"
                            className="bg-purple-50 text-purple-800 hover:bg-purple-100"
                          >
                            {fullInvoicesSyncMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Syncing All Invoices...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Sync All Invoices
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
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
    
    // First get a preview of the data to validate it
    fetch('/api/customers/import/preview', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(previewResult => {
      if (previewResult.success) {
        // If there are validation errors, show them
        if (previewResult.preview.validation_errors && previewResult.preview.validation_errors.length > 0) {
          // Filter out non-blocking warnings like auto-generated IDs
          const actualErrors = previewResult.preview.validation_errors.filter(
            (err: any) => !err.message.includes('auto-generated')
          );
          
          // If there are actual errors (not just auto-generated fields)
          if (actualErrors.length > 0) {
            const errorSummary = actualErrors
              .slice(0, 5) // Show only first 5 errors
              .map((err: any) => `Row ${err.row}: ${err.message} (${err.field})`)
              .join('\n');
              
            const totalErrors = actualErrors.length;
            const additionalErrors = totalErrors > 5 ? `\n...and ${totalErrors - 5} more errors` : '';
            
            toast({
              title: "Validation Errors",
              description: `Please fix the following issues:\n${errorSummary}${additionalErrors}`,
              variant: "destructive",
            });
            setIsUploading(false);
            return;
          }
          
          // If we only had auto-generated ID notices but no actual errors, show an informational toast
          if (previewResult.preview.validation_errors.length > actualErrors.length) {
            const autoGenCount = previewResult.preview.validation_errors.length - actualErrors.length;
            toast({
              title: "Import Ready",
              description: `${autoGenCount} rows will have auto-generated Recurrer IDs. Click Import again to proceed.`,
            });
            // Don't stop the import process, the user can continue
          }
        }
        
        // If validation passes, proceed with actual import
        formData.append('confirmed', 'true');
        
        // Proceed with actual import
        return fetch('/api/customers/import/csv', {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          setIsUploading(false);
          if (data.success) {
            toast({
              title: "Import Successful",
              description: `Imported ${data.new} new and updated ${data.updated} existing records`,
            });
            
            // Invalidate customers data to refresh views
            queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
          } else {
            throw new Error(data.error || "Import failed");
          }
        });
      } else {
        throw new Error(previewResult.error || "Preview failed");
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
          <div className="flex items-start">
            <div className="mr-2">
              <Upload className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle>CSV Import</CardTitle>
              <CardDescription>
                Import customer data from a CSV file
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex mb-4">
              <Button 
                variant="outline"
                className="flex items-center"
                asChild
              >
                <a href="/sample/customer-import-sample.csv" download>
                  <FileText className="h-4 w-4 mr-2" />
                  Download Template
                </a>
              </Button>
              <p className="ml-4 text-sm text-gray-500 flex items-center">
                Download a CSV template with the required format
              </p>
            </div>
            
            <div className="border rounded-md p-5">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer pb-2 border-b border-gray-200">
                    <h3 className="text-md font-medium">Required and Optional Fields</h3>
                    <ChevronDown className="h-5 w-5 text-gray-500 transition-transform ui-open:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Required Fields</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                      <div>
                        <div className="flex items-start">
                          <span className="text-red-500 mr-1">*</span>
                          <div>
                            <p className="font-medium text-sm">name</p>
                            <p className="text-xs text-gray-500">Company or customer name</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-start">
                          <span className="text-red-500 mr-1">*</span>
                          <div>
                            <p className="font-medium text-sm">recurrer_id</p>
                            <p className="text-xs text-gray-500">Unique identifier (auto-generated if missing)</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-start">
                          <span className="text-red-500 mr-1">*</span>
                          <div>
                            <p className="font-medium text-sm">contact_email</p>
                            <p className="text-xs text-gray-500">Primary contact email address</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-start">
                          <span className="text-red-500 mr-1">*</span>
                          <div>
                            <p className="font-medium text-sm">contact_phone</p>
                            <p className="text-xs text-gray-500">Primary contact phone number</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-start">
                          <span className="text-red-500 mr-1">*</span>
                          <div>
                            <p className="font-medium text-sm">chargebee_customer_id</p>
                            <p className="text-xs text-gray-500">Chargebee customer identifier</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-start">
                          <span className="text-red-500 mr-1">*</span>
                          <div>
                            <p className="font-medium text-sm">chargebee_subscription_id</p>
                            <p className="text-xs text-gray-500">Chargebee subscription identifier</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <Tabs defaultValue="contact">
                      <TabsList className="mb-2">
                        <TabsTrigger value="contact">Contact & Profile</TabsTrigger>
                        <TabsTrigger value="financial">Financial</TabsTrigger>
                        <TabsTrigger value="store">Store Metrics</TabsTrigger>
                        <TabsTrigger value="engagement">Engagement</TabsTrigger>
                        <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="contact" className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">reelo_id</p>
                                <p className="text-xs text-gray-500">Reelo system identifier</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">industry</p>
                                <p className="text-xs text-gray-500">Customer's business industry</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">contact_name</p>
                                <p className="text-xs text-gray-500">Primary contact person's name</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">mysql_company_id</p>
                                <p className="text-xs text-gray-500">MySQL database unique ID</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">logo_url</p>
                                <p className="text-xs text-gray-500">URL to customer logo image</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">health_status</p>
                                <p className="text-xs text-gray-500">Customer health (healthy, at_risk, red_zone)</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="financial" className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">mrr</p>
                                <p className="text-xs text-gray-500">Monthly Recurring Revenue (numeric)</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">arr</p>
                                <p className="text-xs text-gray-500">Annual Recurring Revenue (numeric)</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">currency_code</p>
                                <p className="text-xs text-gray-500">Currency code (e.g., USD, INR)</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">renewal_date</p>
                                <p className="text-xs text-gray-500">Contract renewal date (YYYY-MM-DD)</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">revenue_1_year</p>
                                <p className="text-xs text-gray-500">Total revenue over past year</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">onboarded_at</p>
                                <p className="text-xs text-gray-500">Date onboarded (YYYY-MM-DD)</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="store" className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">active_stores</p>
                                <p className="text-xs text-gray-500">Number of active store locations</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">growth_subscription_count</p>
                                <p className="text-xs text-gray-500">Number of growth subscriptions</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">assigned_csm</p>
                                <p className="text-xs text-gray-500">ID of assigned CSM</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">less_than_300_bills</p>
                                <p className="text-xs text-gray-500">Flag if customer has less than 300 bills</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">wa_header_active</p>
                                <p className="text-xs text-gray-500">WhatsApp header active flag</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">company_create_date</p>
                                <p className="text-xs text-gray-500">When company was created (YYYY-MM-DD)</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="engagement" className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">bills_received_last_30_days</p>
                                <p className="text-xs text-gray-500">Bills in last 30 days</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">campaigns_sent_last_90_days</p>
                                <p className="text-xs text-gray-500">Campaigns sent in last 90 days</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">customers_acquired_last_30_days</p>
                                <p className="text-xs text-gray-500">New customers in last 30 days</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">unique_customers_captured</p>
                                <p className="text-xs text-gray-500">Total unique customers</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">customers_with_min_one_visit</p>
                                <p className="text-xs text-gray-500">Customers with at least one visit</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">customers_with_min_two_visit</p>
                                <p className="text-xs text-gray-500">Customers with at least two visits</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">customers_without_min_visits</p>
                                <p className="text-xs text-gray-500">Customers without minimum visits</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">active_auto_campaigns_count</p>
                                <p className="text-xs text-gray-500">Number of active auto campaigns</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">negative_feedbacks_count</p>
                                <p className="text-xs text-gray-500">Total count of negative feedback</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">negative_feedback_alert_inactive</p>
                                <p className="text-xs text-gray-500">Inactive negative feedback alerts</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">percentage_of_inactive_customers</p>
                                <p className="text-xs text-gray-500">Percentage of inactive customers</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="loyalty" className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">loyalty_active_store_count</p>
                                <p className="text-xs text-gray-500">Stores with active loyalty programs</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">loyalty_inactive_store_count</p>
                                <p className="text-xs text-gray-500">Stores with inactive loyalty programs</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">loyalty_active_channels</p>
                                <p className="text-xs text-gray-500">Active communication channels</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">loyalty_channel_credits</p>
                                <p className="text-xs text-gray-500">Channel credits for loyalty program</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">loyalty_type</p>
                                <p className="text-xs text-gray-500">Type of loyalty program (points, visits, purchases)</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium text-sm">loyalty_reward</p>
                                <p className="text-xs text-gray-500">Reward tier for loyalty program</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 text-sm">CSV Format Information</AlertTitle>
                    <AlertDescription className="text-blue-700 text-xs">
                      <ul className="list-disc pl-5 mt-1">
                        <li>Fields marked with <span className="text-red-500">*</span> are required</li>
                        <li><span className="font-medium">recurrer_id</span> will be automatically generated if not provided</li>
                        <li>All CSV imports must include a header row with exact field names</li>
                        <li>You can download a sample file with the exact format using the button above</li>
                        <li>The system will validate all fields and report any errors before importing</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            <div className="border border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center">
              <div className="mb-4">
                <Upload className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-md font-medium mb-1">Drag and drop your CSV file here or click to browse</h3>
              <p className="text-sm text-gray-500 mb-4">CSV files only, up to 10MB</p>
              
              <Input 
                id="csv-file" 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
                className="max-w-xs"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/api/customers/export/csv'}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export Current Customers
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/api/customers/sample/csv'}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
              
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

function SystemSettingsTab() {
  const { toast } = useToast();
  
  // Achievement threshold settings
  const [thresholds, setThresholds] = useState({
    tasks_completed: 10,
    customer_health_improved: 5,
    feedback_collected: 5,
    playbooks_executed: 5,
    red_zone_resolved: 3,
    login_streak: 5
  });

  // Badge configuration
  const [badgeConfig, setBadgeConfig] = useState({
    tasks_completed: { icon: 'trophy', color: 'amber' },
    customer_health_improved: { icon: 'zap', color: 'teal' },
    feedback_collected: { icon: 'star', color: 'indigo' },
    playbooks_executed: { icon: 'award', color: 'blue' },
    red_zone_resolved: { icon: 'clock', color: 'pink' },
    login_streak: { icon: 'user', color: 'purple' }
  });
  
  // XP configuration
  const [xpConfig, setXpConfig] = useState({
    tasks_completed: 100,
    customer_health_improved: 150,
    feedback_collected: 75,
    playbooks_executed: 125,
    red_zone_resolved: 200,
    login_streak: 50
  });
  
  // Notification settings
  const [notificationConfig, setNotificationConfig] = useState({
    enableAchievementNotifications: true,
    notifyOnLevelUp: true,
    showBadgesInProfile: true,
    showAchievementsInDashboard: true
  });

  // Custom metrics settings
  const [customMetrics, setCustomMetrics] = useState([
    { id: 1, name: 'Customer Retention Rate', formula: 'retained_customers / total_customers * 100', target: 90, display: true },
    { id: 2, name: 'Average Response Time', formula: 'total_response_time / total_responses', target: 24, display: true },
    { id: 3, name: 'Task Completion Rate', formula: 'completed_tasks / total_tasks * 100', target: 85, display: true }
  ]);
  
  // Fetch achievement threshold settings
  const { data: thresholdsData, isLoading: thresholdsLoading, error: thresholdsError } = useQuery({
    queryKey: ['/api/admin/system/achievement-thresholds'],
    onSuccess: (data) => {
      setThresholds(data);
    },
    onError: (error) => {
      console.error('Error fetching achievement thresholds:', error);
      toast({
        title: "Failed to Load Settings",
        description: "There was an error loading achievement thresholds.",
        variant: "destructive",
      });
    }
  });
  
  // Fetch badge configuration
  const { data: badgeData, isLoading: badgeLoading, error: badgeError } = useQuery({
    queryKey: ['/api/admin/system/badge-config'],
    onSuccess: (data) => {
      setBadgeConfig(data);
    },
    onError: (error) => {
      console.error('Error fetching badge configuration:', error);
      toast({
        title: "Failed to Load Settings",
        description: "There was an error loading badge configuration.",
        variant: "destructive",
      });
    }
  });
  
  // Fetch XP configuration
  const { data: xpData, isLoading: xpLoading, error: xpError } = useQuery({
    queryKey: ['/api/admin/system/xp-config'],
    onSuccess: (data) => {
      setXpConfig(data);
    },
    onError: (error) => {
      console.error('Error fetching XP configuration:', error);
      toast({
        title: "Failed to Load Settings",
        description: "There was an error loading XP configuration.",
        variant: "destructive",
      });
    }
  });
  
  // Fetch notification settings
  const { data: notificationData, isLoading: notificationLoading, error: notificationError } = useQuery({
    queryKey: ['/api/admin/system/notification-settings'],
    onSuccess: (data) => {
      setNotificationConfig(data);
    },
    onError: (error) => {
      console.error('Error fetching notification settings:', error);
      toast({
        title: "Failed to Load Settings",
        description: "There was an error loading notification settings.",
        variant: "destructive",
      });
    }
  });
  
  // Mutations for saving settings
  const saveThresholdsMutation = useMutation({
    mutationFn: (data: typeof thresholds) => 
      apiRequest('POST', '/api/admin/system/achievement-thresholds', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system/achievement-thresholds'] });
      toast({
        title: "Thresholds Saved",
        description: "Achievement thresholds have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error saving thresholds:", error);
      toast({
        title: "Failed to Save Thresholds",
        description: "There was an error saving achievement thresholds.",
        variant: "destructive",
      });
    }
  });
  
  const saveBadgeConfigMutation = useMutation({
    mutationFn: (data: typeof badgeConfig) => 
      apiRequest('POST', '/api/admin/system/badge-config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system/badge-config'] });
      toast({
        title: "Badge Config Saved",
        description: "Badge configuration has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error saving badge config:", error);
      toast({
        title: "Failed to Save Badge Config",
        description: "There was an error saving badge configuration.",
        variant: "destructive",
      });
    }
  });
  
  const saveXpConfigMutation = useMutation({
    mutationFn: (data: typeof xpConfig) => 
      apiRequest('POST', '/api/admin/system/xp-config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system/xp-config'] });
      toast({
        title: "XP Config Saved",
        description: "XP configuration has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error saving XP config:", error);
      toast({
        title: "Failed to Save XP Config",
        description: "There was an error saving XP configuration.",
        variant: "destructive",
      });
    }
  });
  
  const saveNotificationSettingsMutation = useMutation({
    mutationFn: (data: typeof notificationConfig) => 
      apiRequest('POST', '/api/admin/system/notification-settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system/notification-settings'] });
      toast({
        title: "Notification Settings Saved",
        description: "Notification settings have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error saving notification settings:", error);
      toast({
        title: "Failed to Save Notification Settings",
        description: "There was an error saving notification settings.",
        variant: "destructive",
      });
    }
  });
  
  // Save all settings
  const handleSaveSettings = async () => {
    try {
      // Custom metrics still use localStorage until we create an API endpoint for them
      localStorage.setItem('custom_metrics', JSON.stringify(customMetrics));
      
      // Save all configurations via API
      await Promise.all([
        saveThresholdsMutation.mutateAsync(thresholds),
        saveBadgeConfigMutation.mutateAsync(badgeConfig),
        saveXpConfigMutation.mutateAsync(xpConfig),
        saveNotificationSettingsMutation.mutateAsync(notificationConfig)
      ]);
      
      toast({
        title: "All Settings Saved",
        description: "System settings have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      // Individual error toasts are already shown by each mutation
    }
  };
  
  // Handle threshold changes
  const handleThresholdChange = (key: string, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setThresholds(prev => ({
        ...prev,
        [key]: numValue
      }));
    }
  };
  
  // Handle XP config changes
  const handleXpChange = (key: string, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setXpConfig(prev => ({
        ...prev,
        [key]: numValue
      }));
    }
  };
  
  // Handle notification config changes
  const handleNotificationChange = (key: string, value: boolean) => {
    setNotificationConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Handle badge config changes
  const handleBadgeConfigChange = (achievementType: string, field: 'icon' | 'color', value: string) => {
    setBadgeConfig(prev => ({
      ...prev,
      [achievementType]: {
        ...prev[achievementType as keyof typeof prev],
        [field]: value
      }
    }));
  };
  
  // Add custom metric
  const [newMetric, setNewMetric] = useState({
    name: '',
    formula: '',
    target: 0,
    display: true
  });
  
  const handleAddCustomMetric = () => {
    if (newMetric.name && newMetric.formula) {
      setCustomMetrics(prev => [
        ...prev,
        {
          id: Date.now(),
          name: newMetric.name,
          formula: newMetric.formula,
          target: newMetric.target,
          display: newMetric.display
        }
      ]);
      
      // Reset form
      setNewMetric({
        name: '',
        formula: '',
        target: 0,
        display: true
      });
      
      toast({
        title: "Metric Added",
        description: `Custom metric "${newMetric.name}" has been added.`,
      });
    } else {
      toast({
        title: "Validation Error",
        description: "Name and formula are required for custom metrics.",
        variant: "destructive",
      });
    }
  };
  
  // Delete custom metric
  const handleDeleteMetric = (id: number) => {
    setCustomMetrics(prev => prev.filter(metric => metric.id !== id));
    toast({
      title: "Metric Deleted",
      description: "Custom metric has been deleted.",
    });
  };
  
  // Toggle metric display
  const handleToggleMetricDisplay = (id: number) => {
    setCustomMetrics(prev => prev.map(metric => 
      metric.id === id ? { ...metric, display: !metric.display } : metric
    ));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Settings</h2>
        <Button onClick={handleSaveSettings}>
          <Save className="h-4 w-4 mr-2" />
          Save All Settings
        </Button>
      </div>
      
      <Tabs defaultValue="achievement-settings">
        <TabsList className="mb-4">
          <TabsTrigger value="achievement-settings">
            <Trophy className="h-4 w-4 mr-2" />
            Achievement Settings
          </TabsTrigger>
          <TabsTrigger value="notification-settings">
            <Bell className="h-4 w-4 mr-2" />
            Notification Settings
          </TabsTrigger>
          <TabsTrigger value="badge-settings">
            <BadgeCheck className="h-4 w-4 mr-2" />
            Badge Configuration
          </TabsTrigger>
          <TabsTrigger value="custom-metrics">
            <LineChart className="h-4 w-4 mr-2" />
            Custom Metrics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="achievement-settings">
          <Card>
            <CardHeader>
              <CardTitle>Achievement Thresholds</CardTitle>
              <CardDescription>
                Configure the thresholds for achievement unlocks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tasks_completed_threshold">Tasks Completed</Label>
                  <div className="flex items-center">
                    <Input
                      id="tasks_completed_threshold"
                      type="number"
                      value={thresholds.tasks_completed}
                      onChange={(e) => handleThresholdChange('tasks_completed', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">tasks</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Number of tasks a user needs to complete to earn this achievement
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer_health_improved_threshold">Customer Health Improved</Label>
                  <div className="flex items-center">
                    <Input
                      id="customer_health_improved_threshold"
                      type="number"
                      value={thresholds.customer_health_improved}
                      onChange={(e) => handleThresholdChange('customer_health_improved', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">customers</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Number of customer health scores improved to earn this achievement
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="feedback_collected_threshold">Feedback Collected</Label>
                  <div className="flex items-center">
                    <Input
                      id="feedback_collected_threshold"
                      type="number"
                      value={thresholds.feedback_collected}
                      onChange={(e) => handleThresholdChange('feedback_collected', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">feedbacks</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Number of customer feedback collected to earn this achievement
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="playbooks_executed_threshold">Playbooks Executed</Label>
                  <div className="flex items-center">
                    <Input
                      id="playbooks_executed_threshold"
                      type="number"
                      value={thresholds.playbooks_executed}
                      onChange={(e) => handleThresholdChange('playbooks_executed', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">playbooks</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Number of playbooks successfully executed to earn this achievement
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="red_zone_resolved_threshold">Red Zone Resolved</Label>
                  <div className="flex items-center">
                    <Input
                      id="red_zone_resolved_threshold"
                      type="number"
                      value={thresholds.red_zone_resolved}
                      onChange={(e) => handleThresholdChange('red_zone_resolved', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">resolutions</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Number of red zone situations resolved to earn this achievement
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login_streak_threshold">Login Streak</Label>
                  <div className="flex items-center">
                    <Input
                      id="login_streak_threshold"
                      type="number"
                      value={thresholds.login_streak}
                      onChange={(e) => handleThresholdChange('login_streak', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">days</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Number of consecutive days logged in to earn this achievement
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>XP Configuration</CardTitle>
              <CardDescription>
                Configure the experience points awarded for each achievement type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tasks_completed_xp">Tasks Completed XP</Label>
                  <div className="flex items-center">
                    <Input
                      id="tasks_completed_xp"
                      type="number"
                      value={xpConfig.tasks_completed}
                      onChange={(e) => handleXpChange('tasks_completed', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">XP</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer_health_improved_xp">Customer Health Improved XP</Label>
                  <div className="flex items-center">
                    <Input
                      id="customer_health_improved_xp"
                      type="number"
                      value={xpConfig.customer_health_improved}
                      onChange={(e) => handleXpChange('customer_health_improved', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">XP</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="feedback_collected_xp">Feedback Collected XP</Label>
                  <div className="flex items-center">
                    <Input
                      id="feedback_collected_xp"
                      type="number"
                      value={xpConfig.feedback_collected}
                      onChange={(e) => handleXpChange('feedback_collected', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">XP</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="playbooks_executed_xp">Playbooks Executed XP</Label>
                  <div className="flex items-center">
                    <Input
                      id="playbooks_executed_xp"
                      type="number"
                      value={xpConfig.playbooks_executed}
                      onChange={(e) => handleXpChange('playbooks_executed', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">XP</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="red_zone_resolved_xp">Red Zone Resolved XP</Label>
                  <div className="flex items-center">
                    <Input
                      id="red_zone_resolved_xp"
                      type="number"
                      value={xpConfig.red_zone_resolved}
                      onChange={(e) => handleXpChange('red_zone_resolved', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">XP</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login_streak_xp">Login Streak XP</Label>
                  <div className="flex items-center">
                    <Input
                      id="login_streak_xp"
                      type="number"
                      value={xpConfig.login_streak}
                      onChange={(e) => handleXpChange('login_streak', e.target.value)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">XP</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-2">Level Configuration</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Users level up every 1000 XP. Configure specific thresholds and rewards for each level.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notification-settings">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how achievement notifications are displayed to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-achievement-notifications">Enable Achievement Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications when users earn new achievements
                  </p>
                </div>
                <Switch 
                  id="enable-achievement-notifications"
                  checked={notificationConfig.enableAchievementNotifications}
                  onCheckedChange={(value) => handleNotificationChange('enableAchievementNotifications', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-level-up">Notify on Level Up</Label>
                  <p className="text-sm text-muted-foreground">
                    Show special notifications when users level up
                  </p>
                </div>
                <Switch 
                  id="notify-level-up"
                  checked={notificationConfig.notifyOnLevelUp}
                  onCheckedChange={(value) => handleNotificationChange('notifyOnLevelUp', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-badges-profile">Show Badges in Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Display earned badges on user profiles
                  </p>
                </div>
                <Switch 
                  id="show-badges-profile"
                  checked={notificationConfig.showBadgesInProfile}
                  onCheckedChange={(value) => handleNotificationChange('showBadgesInProfile', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-achievements-dashboard">Show Achievements in Dashboard</Label>
                  <p className="text-sm text-muted-foreground">
                    Display recent achievements on the dashboard
                  </p>
                </div>
                <Switch 
                  id="show-achievements-dashboard"
                  checked={notificationConfig.showAchievementsInDashboard}
                  onCheckedChange={(value) => handleNotificationChange('showAchievementsInDashboard', value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="badge-settings">
          <Card>
            <CardHeader>
              <CardTitle>Badge Configuration</CardTitle>
              <CardDescription>
                Configure icons and colors for achievement badges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(badgeConfig).map(([type, config]) => (
                  <Card key={type} className="border-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        <div className="ml-auto p-2 rounded-full bg-primary/10">
                          {type === 'tasks_completed' && <Trophy className={`h-5 w-5 text-${config.color}-500`} />}
                          {type === 'customer_health_improved' && <Zap className={`h-5 w-5 text-${config.color}-500`} />}
                          {type === 'feedback_collected' && <Star className={`h-5 w-5 text-${config.color}-500`} />}
                          {type === 'playbooks_executed' && <Award className={`h-5 w-5 text-${config.color}-500`} />}
                          {type === 'red_zone_resolved' && <Clock className={`h-5 w-5 text-${config.color}-500`} />}
                          {type === 'login_streak' && <UserIcon className={`h-5 w-5 text-${config.color}-500`} />}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor={`${type}-icon`}>Icon</Label>
                          <Select
                            value={config.icon}
                            onValueChange={(value) => handleBadgeConfigChange(type, 'icon', value)}
                          >
                            <SelectTrigger id={`${type}-icon`}>
                              <SelectValue placeholder="Select icon" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="trophy">Trophy</SelectItem>
                              <SelectItem value="award">Award</SelectItem>
                              <SelectItem value="star">Star</SelectItem>
                              <SelectItem value="zap">Lightning</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="clock">Clock</SelectItem>
                              <SelectItem value="heart">Heart</SelectItem>
                              <SelectItem value="check">Checkmark</SelectItem>
                              <SelectItem value="thumbsup">Thumbs Up</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor={`${type}-color`}>Color</Label>
                          <Select
                            value={config.color}
                            onValueChange={(value) => handleBadgeConfigChange(type, 'color', value)}
                          >
                            <SelectTrigger id={`${type}-color`}>
                              <SelectValue placeholder="Select color" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="red">Red</SelectItem>
                              <SelectItem value="amber">Amber</SelectItem>
                              <SelectItem value="yellow">Yellow</SelectItem>
                              <SelectItem value="green">Green</SelectItem>
                              <SelectItem value="teal">Teal</SelectItem>
                              <SelectItem value="blue">Blue</SelectItem>
                              <SelectItem value="indigo">Indigo</SelectItem>
                              <SelectItem value="purple">Purple</SelectItem>
                              <SelectItem value="pink">Pink</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="custom-metrics">
          <Card>
            <CardHeader>
              <CardTitle>Custom Metrics</CardTitle>
              <CardDescription>
                Define custom metrics for advanced reporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <h3 className="text-lg font-medium">Add New Metric</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="metric-name">Metric Name</Label>
                      <Input
                        id="metric-name"
                        value={newMetric.name}
                        onChange={(e) => setNewMetric(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Customer Satisfaction Score"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="metric-formula">Formula/Calculation</Label>
                      <Input
                        id="metric-formula"
                        value={newMetric.formula}
                        onChange={(e) => setNewMetric(prev => ({ ...prev, formula: e.target.value }))}
                        placeholder="e.g. sum(satisfaction_scores) / count(responses)"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="metric-target">Target Value</Label>
                      <Input
                        id="metric-target"
                        type="number"
                        value={newMetric.target}
                        onChange={(e) => setNewMetric(prev => ({ ...prev, target: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g. 90"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-8">
                      <Checkbox
                        id="metric-display"
                        checked={newMetric.display}
                        onCheckedChange={(checked) => setNewMetric(prev => ({ ...prev, display: checked === true }))}
                      />
                      <Label htmlFor="metric-display">Display on dashboard</Label>
                    </div>
                  </div>
                  
                  <Button className="w-full md:w-auto" onClick={handleAddCustomMetric}>
                    Add Metric
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-4">Current Custom Metrics</h3>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Formula</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Display</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customMetrics.map((metric) => (
                          <TableRow key={metric.id}>
                            <TableCell className="font-medium">{metric.name}</TableCell>
                            <TableCell>
                              <code className="p-1 bg-muted rounded text-xs">{metric.formula}</code>
                            </TableCell>
                            <TableCell>{metric.target}</TableCell>
                            <TableCell>
                              <Switch
                                checked={metric.display}
                                onCheckedChange={() => handleToggleMetricDisplay(metric.id)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMetric(metric.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
                <UserIcon className="h-4 w-4 mr-2" />
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
