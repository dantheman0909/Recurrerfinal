import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RedZoneRule } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlusCircleIcon, XCircleIcon, PlusIcon, TrashIcon, AlertTriangleIcon, ShieldAlertIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AppLayout from "@/components/layouts/app-layout";

const severityOptions = [
  { value: "critical", label: "Critical" },
  { value: "high_risk", label: "High Risk" },
  { value: "attention_needed", label: "Attention Needed" },
];

const formSchema = z.object({
  name: z.string().min(3, { message: "Rule name must be at least 3 characters" }),
  description: z.string().optional(),
  severity: z.enum(["critical", "high_risk", "attention_needed"]),
  conditions: z.array(
    z.object({
      field: z.string(),
      operator: z.string(),
      value: z.string(),
    })
  ).min(1, { message: "At least one condition is required" }),
  auto_resolve: z.boolean().default(false),
  resolution_conditions: z.array(
    z.object({
      field_path: z.string(),
      operator: z.string(),
      value: z.string(),
    })
  ).optional(),
  team_lead_approval_required: z.boolean().default(false),
  notification_message: z.string().optional(),
  enabled: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

const RedZoneSettingsPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("rules");
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  
  // Fetch RedZone rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery<RedZoneRule[]>({
    queryKey: ["/api/red-zone/rules"],
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      severity: "attention_needed",
      conditions: [{ field: "", operator: "equals", value: "" }],
      auto_resolve: false,
      resolution_conditions: [],
      team_lead_approval_required: false,
      notification_message: "",
      enabled: true,
    },
  });
  
  // Create mutation for adding/updating RedZone rules
  const createRuleMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const url = editingRuleId 
        ? `/api/red-zone/rules/${editingRuleId}` 
        : "/api/red-zone/rules";
      
      const method = editingRuleId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save RedZone rule");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/red-zone/rules"] });
      toast({
        title: "Success",
        description: `RedZone rule ${editingRuleId ? "updated" : "created"} successfully`,
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save RedZone rule",
        variant: "destructive",
      });
    }
  });
  
  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      const response = await fetch(`/api/red-zone/rules/${ruleId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete RedZone rule");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/red-zone/rules"] });
      toast({
        title: "Success",
        description: "RedZone rule deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete RedZone rule",
        variant: "destructive",
      });
    }
  });
  
  // Add condition to form
  const addCondition = () => {
    const currentConditions = form.getValues("conditions") || [];
    form.setValue("conditions", [...currentConditions, { field: "", operator: "equals", value: "" }]);
  };
  
  // Remove condition from form
  const removeCondition = (index: number) => {
    const currentConditions = form.getValues("conditions") || [];
    if (currentConditions.length > 1) {
      form.setValue(
        "conditions",
        currentConditions.filter((_, i) => i !== index)
      );
    } else {
      toast({
        title: "Error",
        description: "At least one condition is required",
        variant: "destructive",
      });
    }
  };
  
  // Add resolution condition
  const addResolutionCondition = () => {
    const currentConditions = form.getValues("resolution_conditions") || [];
    form.setValue("resolution_conditions", [...currentConditions, { field_path: "", operator: "equals", value: "" }]);
  };
  
  // Remove resolution condition
  const removeResolutionCondition = (index: number) => {
    const currentConditions = form.getValues("resolution_conditions") || [];
    form.setValue(
      "resolution_conditions",
      currentConditions.filter((_, i) => i !== index)
    );
  };
  
  // Handle form submission
  const onSubmit = (data: FormValues) => {
    createRuleMutation.mutate(data);
  };
  
  // Reset form and editing state
  const resetForm = () => {
    form.reset({
      name: "",
      description: "",
      severity: "attention_needed",
      conditions: [{ field: "", operator: "equals", value: "" }],
      auto_resolve: false,
      resolution_conditions: [],
      team_lead_approval_required: false,
      notification_message: "",
      enabled: true,
    });
    setEditingRuleId(null);
  };
  
  // Edit a rule
  const editRule = (rule: any) => {
    setEditingRuleId(rule.id);
    
    // Prepare resolution conditions as expected by the form
    const resolutionConditions = rule.resolution_conditions || [];
    
    form.reset({
      name: rule.name,
      description: rule.description || "",
      severity: rule.severity,
      conditions: rule.conditions,
      auto_resolve: rule.auto_resolve,
      resolution_conditions: resolutionConditions,
      team_lead_approval_required: rule.team_lead_approval_required,
      notification_message: rule.notification_message || "",
      enabled: rule.enabled,
    });
  };

  // Get severity badge color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high_risk":
        return "bg-orange-500";
      case "attention_needed":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">RedZone Configuration</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="rules">RedZone Rules</TabsTrigger>
            <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
            <TabsTrigger value="history">Resolution History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="rules">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {editingRuleId ? "Edit RedZone Rule" : "Create RedZone Rule"}
                    </CardTitle>
                    <CardDescription>
                      Define conditions that trigger RedZone alerts for customers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rule Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter rule name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Enter a description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="severity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Severity</FormLabel>
                              <Select 
                                value={field.value} 
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select severity level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {severityOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div>
                          <h3 className="font-medium mb-2">Conditions</h3>
                          {form.getValues("conditions")?.map((_, index) => (
                            <div key={index} className="flex items-center gap-2 mb-2">
                              <FormField
                                control={form.control}
                                name={`conditions.${index}.field`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input placeholder="Field name" {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`conditions.${index}.operator`}
                                render={({ field }) => (
                                  <FormItem className="w-28">
                                    <Select 
                                      value={field.value} 
                                      onValueChange={field.onChange}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="equals">equals</SelectItem>
                                        <SelectItem value="not_equals">not equals</SelectItem>
                                        <SelectItem value="greater_than">greater than</SelectItem>
                                        <SelectItem value="less_than">less than</SelectItem>
                                        <SelectItem value="contains">contains</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`conditions.${index}.value`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input placeholder="Value" {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCondition(index)}
                              >
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                              </Button>
                            </div>
                          ))}
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCondition}
                            className="mt-2"
                          >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Condition
                          </Button>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="auto_resolve"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Auto-resolve</FormLabel>
                                <FormDescription>
                                  Automatically resolve alerts when conditions are met
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        {form.watch("auto_resolve") && (
                          <div>
                            <h3 className="font-medium mb-2">Resolution Conditions</h3>
                            {form.watch("resolution_conditions")?.map((_, index) => (
                              <div key={index} className="flex items-center gap-2 mb-2">
                                <FormField
                                  control={form.control}
                                  name={`resolution_conditions.${index}.field_path`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input placeholder="Field name" {...field} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name={`resolution_conditions.${index}.operator`}
                                  render={({ field }) => (
                                    <FormItem className="w-28">
                                      <Select 
                                        value={field.value} 
                                        onValueChange={field.onChange}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="equals">equals</SelectItem>
                                          <SelectItem value="not_equals">not equals</SelectItem>
                                          <SelectItem value="greater_than">greater than</SelectItem>
                                          <SelectItem value="less_than">less than</SelectItem>
                                          <SelectItem value="contains">contains</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name={`resolution_conditions.${index}.value`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input placeholder="Value" {...field} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeResolutionCondition(index)}
                                >
                                  <XCircleIcon className="h-5 w-5 text-red-500" />
                                </Button>
                              </div>
                            ))}
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addResolutionCondition}
                              className="mt-2"
                            >
                              <PlusIcon className="h-4 w-4 mr-2" />
                              Add Resolution Condition
                            </Button>
                          </div>
                        )}
                        
                        <FormField
                          control={form.control}
                          name="team_lead_approval_required"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Team Lead Approval</FormLabel>
                                <FormDescription>
                                  Require team lead approval for manual resolution
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="notification_message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notification Message</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Custom notification message to display with alerts"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="enabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Enabled</FormLabel>
                                <FormDescription>
                                  Enable or disable this rule
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex gap-2">
                          <Button type="submit" disabled={createRuleMutation.isPending}>
                            {editingRuleId ? "Update Rule" : "Create Rule"}
                          </Button>
                          
                          {editingRuleId && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={resetForm}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
              
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Configured Rules</CardTitle>
                    <CardDescription>
                      Manage your RedZone detection rules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rulesLoading ? (
                      <div className="text-center py-4">Loading rules...</div>
                    ) : rules.length === 0 ? (
                      <div className="text-center py-4 border rounded-lg">
                        <p className="text-muted-foreground">No RedZone rules configured yet</p>
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => setActiveTab("rules")}
                        >
                          <PlusCircleIcon className="h-4 w-4 mr-2" />
                          Create your first rule
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {rules.map((rule: any) => (
                          <Card key={rule.id} className="overflow-hidden">
                            <div className={`h-1 ${getSeverityColor(rule.severity)}`} />
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-lg">
                                    {rule.name}
                                  </CardTitle>
                                  <Badge 
                                    variant={rule.enabled ? "default" : "outline"}
                                    className="ml-2"
                                  >
                                    {rule.enabled ? "Enabled" : "Disabled"}
                                  </Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => editRule(rule)}
                                  >
                                    Edit
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-red-500">
                                        <TrashIcon className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this rule? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-red-500 hover:bg-red-600"
                                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                              <CardDescription>{rule.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-sm font-medium mb-1">Severity</h4>
                                  <Badge className={getSeverityColor(rule.severity) + " text-white"}>
                                    {severityOptions.find(o => o.value === rule.severity)?.label || rule.severity}
                                  </Badge>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-medium mb-1">Alert Conditions</h4>
                                  <div className="space-y-1">
                                    {rule.conditions.map((condition: any, i: number) => (
                                      <p key={i} className="text-sm">
                                        <span className="font-medium">{condition.field}</span>
                                        {" "}
                                        <span className="text-muted-foreground">{condition.operator}</span>
                                        {" "}
                                        <span>{condition.value}</span>
                                      </p>
                                    ))}
                                  </div>
                                </div>
                                
                                {rule.auto_resolve && rule.resolution_conditions?.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">Auto-resolution Conditions</h4>
                                    <div className="space-y-1">
                                      {rule.resolution_conditions.map((condition: any, i: number) => (
                                        <p key={i} className="text-sm">
                                          <span className="font-medium">{condition.field_path}</span>
                                          {" "}
                                          <span className="text-muted-foreground">{condition.operator}</span>
                                          {" "}
                                          <span>{condition.value}</span>
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex gap-4">
                                  <div className="flex items-center">
                                    <span className="text-sm font-medium mr-2">Auto-resolve:</span>
                                    <span>{rule.auto_resolve ? "Yes" : "No"}</span>
                                  </div>
                                  
                                  <div className="flex items-center">
                                    <span className="text-sm font-medium mr-2">Team Lead Approval:</span>
                                    <span>{rule.team_lead_approval_required ? "Required" : "Not Required"}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Active RedZone Alerts</CardTitle>
                <CardDescription>
                  All current RedZone alerts across customer accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16">
                  <ShieldAlertIcon className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Active Alerts Section</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    This section will display active RedZone alerts across all customers, showing severity, reason, time detected, and assigned CSM.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Resolution History</CardTitle>
                <CardDescription>
                  View history of resolved RedZone alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16">
                  <AlertTriangleIcon className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Resolution History Section</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    This section will show a history of resolved RedZone alerts, including resolution timestamps, methods (auto vs. manual), and resolution comments.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default RedZoneSettingsPage;