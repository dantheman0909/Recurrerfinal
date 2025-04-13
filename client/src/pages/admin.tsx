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
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Settings,
  Database,
  Upload,
  User,
  Users,
  RefreshCw,
  Save,
  Link as LinkIcon,
  FileText,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  });
  
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM customers LIMIT 10");
  const [queryResults, setQueryResults] = useState<any>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [isConfigTested, setIsConfigTested] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const { toast } = useToast();
  
  const { data: existingConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/admin/mysql-config'],
  });
  
  const { data: existingMappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ['/api/admin/mysql-field-mappings'],
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
      const response = await apiRequest("POST", "/api/admin/mysql-query", {
        query: sqlQuery
      });
      return response.json();
    },
    onSuccess: (data) => {
      setQueryResults(data);
      toast({
        title: "Query Executed",
        description: `Query returned ${data.length || 0} results.`,
      });
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
  
  const handleSaveMapping = (mapping: any) => {
    saveFieldMappingMutation.mutate(mapping);
  };
  
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
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                
                <div className="flex justify-end">
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
                <div className="grid grid-cols-4 gap-4 mb-2">
                  <div className="font-medium text-sm text-gray-500">MySQL Table</div>
                  <div className="font-medium text-sm text-gray-500">MySQL Field</div>
                  <div className="font-medium text-sm text-gray-500">Recurrer Table</div>
                  <div className="font-medium text-sm text-gray-500">Recurrer Field</div>
                </div>
                
                {mappings.map((mapping, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 items-center">
                    <Input value={mapping.mysql_table} disabled />
                    <Input value={mapping.mysql_field} disabled />
                    <Input value={mapping.local_table} disabled />
                    <Input value={mapping.local_field} disabled />
                  </div>
                ))}
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">Add Field Mapping</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Map Database Fields</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="mysql-table">MySQL Table</Label>
                          <Input id="mysql-table" placeholder="e.g., customers" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="mysql-field">MySQL Field</Label>
                          <Input id="mysql-field" placeholder="e.g., customer_name" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="recurrer-table">Recurrer Table</Label>
                          <Select>
                            <SelectTrigger id="recurrer-table">
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
                          <Label htmlFor="recurrer-field">Recurrer Field</Label>
                          <Select>
                            <SelectTrigger id="recurrer-field">
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="name">Name</SelectItem>
                              <SelectItem value="industry">Industry</SelectItem>
                              <SelectItem value="contact_name">Contact Name</SelectItem>
                              <SelectItem value="contact_email">Contact Email</SelectItem>
                              <SelectItem value="mrr">MRR</SelectItem>
                              <SelectItem value="arr">ARR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button>Save Mapping</Button>
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
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  
  // Fetch existing Chargebee configuration
  const { data: existingConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/admin/chargebee-config'],
  });
  
  // Set form fields if we have existing config
  React.useEffect(() => {
    if (existingConfig && existingConfig.site && existingConfig.api_key) {
      setChargebeeConfig({
        site: existingConfig.site || "",
        apiKey: existingConfig.api_key || "", // Fixed: api_key instead of apiKey to match database schema
      });
      setIsConnected(true);
    }
  }, [existingConfig]);
  
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setChargebeeConfig(prev => ({ ...prev, [name]: value }));
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
  
  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };
  
  const handleSaveConfig = () => {
    saveConfigMutation.mutate();
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chargebee Integration</CardTitle>
        <CardDescription>
          Connect to Chargebee for financial data (read-only access)
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                >
                  Test Connection
                </Button>
                <Button onClick={handleSaveConfig}>
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
