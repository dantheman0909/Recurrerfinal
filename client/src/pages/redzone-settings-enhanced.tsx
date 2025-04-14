import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
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
// Because we created these types in a separate file, use interface imports to prevent naming conflicts
import type {
  AvailableFields,
  RedZoneRuleForm,
  Condition,
  Conditions,
  LogicOperator
} from "@shared/redzone-types";
// Import the schema for form validation
import { redZoneRuleFormSchema } from "@shared/redzone-types";
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
import { Skeleton } from "@/components/ui/skeleton";
import { default as ConditionGroupComponent } from "@/components/red-zone/condition-group";

const severityOptions = [
  { value: "critical", label: "Critical" },
  { value: "high_risk", label: "High Risk" },
  { value: "attention_needed", label: "Attention Needed" },
];

const RedZoneSettingsPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("rules");
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  
  // Fetch available fields
  const { data: availableFields, isLoading: fieldsLoading } = useQuery<AvailableFields>({
    queryKey: ["/api/red-zone/available-fields"],
  });
  
  // Fetch RedZone rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery<RedZoneRule[]>({
    queryKey: ["/api/red-zone/rules"],
  });
  
  const form = useForm<RedZoneRuleForm>({
    resolver: zodResolver(redZoneRuleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      severity: "attention_needed",
      conditions: {
        logicOperator: "AND",
        groups: [
          {
            logicOperator: "AND",
            conditions: [
              { field: "", operator: "equals", value: "" }
            ]
          }
        ]
      },
      auto_resolve: false,
      resolution_conditions: [],
      team_lead_approval_required: false,
      notification_message: "",
      enabled: true,
    },
  });
  
  // Create mutation for adding/updating RedZone rules
  const createRuleMutation = useMutation({
    mutationFn: async (data: RedZoneRuleForm) => {
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
      
      setEditingRuleId(null);
      resetForm();
      setActiveTab("rules");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save RedZone rule",
        variant: "destructive",
      });
    },
  });
  
  // Delete mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/red-zone/rules/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete RedZone rule");
      }
      
      return { success: true };
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
  
  // Add condition to a specific group
  const addCondition = (groupIndex: number) => {
    const currentGroups = form.getValues("conditions.groups") || [];
    if (groupIndex >= currentGroups.length) return;
    
    const currentConditions = currentGroups[groupIndex].conditions || [];
    
    // Create a new groups array with the updated conditions
    const updatedGroups = [...currentGroups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      conditions: [...currentConditions, { field: "", operator: "equals", value: "" }]
    };
    
    form.setValue("conditions.groups", updatedGroups);
  };
  
  // Remove condition from a specific group
  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    const currentGroups = form.getValues("conditions.groups") || [];
    if (groupIndex >= currentGroups.length) return;
    
    const currentConditions = currentGroups[groupIndex].conditions || [];
    if (currentConditions.length <= 1) {
      toast({
        title: "Error",
        description: "At least one condition is required in each group",
        variant: "destructive",
      });
      return;
    }
    
    // Create a new groups array with the updated conditions
    const updatedGroups = [...currentGroups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      conditions: currentConditions.filter((_, i) => i !== conditionIndex)
    };
    
    form.setValue("conditions.groups", updatedGroups);
  };
  
  // Add a new condition group
  const addConditionGroup = () => {
    const currentGroups = form.getValues("conditions.groups") || [];
    
    form.setValue("conditions.groups", [
      ...currentGroups,
      {
        logicOperator: "AND",
        conditions: [{ field: "", operator: "equals", value: "" }]
      }
    ]);
  };
  
  // Remove a condition group
  const removeConditionGroup = (groupIndex: number) => {
    const currentGroups = form.getValues("conditions.groups") || [];
    if (currentGroups.length <= 1) {
      toast({
        title: "Error",
        description: "At least one condition group is required",
        variant: "destructive",
      });
      return;
    }
    
    form.setValue(
      "conditions.groups",
      currentGroups.filter((_, i) => i !== groupIndex)
    );
  };
  
  // Handle changes to group logic operator
  const handleLogicOperatorChange = (groupIndex: number, operator: LogicOperator) => {
    const currentGroups = form.getValues("conditions.groups") || [];
    if (groupIndex >= currentGroups.length) return;
    
    // Create a new groups array with the updated logic operator
    const updatedGroups = [...currentGroups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      logicOperator: operator
    };
    
    form.setValue("conditions.groups", updatedGroups);
  };
  
  // Handle changes to the top-level logic operator
  const handleTopLevelLogicOperatorChange = (operator: LogicOperator) => {
    form.setValue("conditions.logicOperator", operator);
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
  
  // Edit an existing rule
  const editRule = (rule: RedZoneRule) => {
    try {
      // Parse the conditions from JSON if needed
      const conditions = typeof rule.conditions === 'string'
        ? JSON.parse(rule.conditions as string)
        : rule.conditions;
        
      // Convert to the new format if it's in the old format (array of conditions)
      let formattedConditions: Conditions;
      
      if (Array.isArray(conditions)) {
        formattedConditions = {
          logicOperator: "AND",
          groups: [
            {
              logicOperator: "AND",
              conditions: conditions
            }
          ]
        };
      } else if (conditions.groups) {
        // Already in the new format
        formattedConditions = conditions as Conditions;
      } else {
        // Fallback to default format
        formattedConditions = {
          logicOperator: "AND",
          groups: [
            {
              logicOperator: "AND",
              conditions: [{ field: "", operator: "equals", value: "" }]
            }
          ]
        };
      }
      
      // Parse resolution conditions if needed
      const resolutionConditions = typeof rule.resolution_conditions === 'string'
        ? JSON.parse(rule.resolution_conditions as string)
        : rule.resolution_conditions || [];
      
      // Set form values
      form.reset({
        name: rule.name,
        description: rule.description || "",
        severity: rule.severity as "critical" | "high_risk" | "attention_needed",
        conditions: formattedConditions,
        auto_resolve: rule.auto_resolve || false,
        resolution_conditions: resolutionConditions,
        team_lead_approval_required: rule.team_lead_approval_required || false,
        notification_message: rule.notification_message || "",
        enabled: rule.enabled,
      });
      
      setEditingRuleId(rule.id);
      setActiveTab("create");
    } catch (error) {
      console.error("Error parsing rule data:", error);
      toast({
        title: "Error",
        description: "Failed to parse rule data for editing",
        variant: "destructive",
      });
    }
  };
  
  // Reset the form to default values
  const resetForm = () => {
    form.reset({
      name: "",
      description: "",
      severity: "attention_needed",
      conditions: {
        logicOperator: "AND",
        groups: [
          {
            logicOperator: "AND",
            conditions: [{ field: "", operator: "equals", value: "" }]
          }
        ]
      },
      auto_resolve: false,
      resolution_conditions: [],
      team_lead_approval_required: false,
      notification_message: "",
      enabled: true,
    });
    setEditingRuleId(null);
  };
  
  // Submit handler
  const onSubmit = (data: RedZoneRuleForm) => {
    createRuleMutation.mutate(data);
  };
  
  return (
    <div className="container pb-8">
      <h1 className="text-3xl font-bold mb-2">RedZone Settings</h1>
      <p className="text-muted-foreground mb-6">
        Configure rules and conditions for the RedZone alert system
      </p>
      
      <Tabs
        defaultValue="rules"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="rules">Rule List</TabsTrigger>
          <TabsTrigger value="create">
            {editingRuleId ? "Edit Rule" : "Create Rule"}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">RedZone Rules</h2>
              <Button onClick={() => {
                resetForm();
                setActiveTab("create");
              }}>
                <PlusCircleIcon className="h-4 w-4 mr-2" />
                Create New Rule
              </Button>
            </div>
            
            {rulesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <Card key={n}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : rules.length === 0 ? (
              <Card>
                <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                  <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No RedZone Rules Configured</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first rule to start monitoring customer health
                  </p>
                  <Button onClick={() => setActiveTab("create")}>
                    <PlusCircleIcon className="h-4 w-4 mr-2" />
                    Create Your First Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          {rule.name}
                          {rule.severity === "critical" && (
                            <Badge variant="destructive" className="ml-2">Critical</Badge>
                          )}
                          {rule.severity === "high_risk" && (
                            <Badge variant="outline" className="ml-2 bg-orange-500 text-white">High Risk</Badge>
                          )}
                          {rule.severity === "attention_needed" && (
                            <Badge variant="secondary" className="ml-2">Attention Needed</Badge>
                          )}
                          {!rule.enabled && (
                            <Badge variant="outline" className="ml-2">Disabled</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {rule.description || "No description provided"}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editRule(rule)}
                        >
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the rule "{rule.name}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteRuleMutation.mutate(rule.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <div className="mt-1">
                          <span className="font-medium">Conditions:</span>{' '}
                          <span className="text-muted-foreground">
                            {typeof rule.conditions === 'string'
                              ? JSON.parse(rule.conditions).length
                              : Array.isArray(rule.conditions)
                                ? rule.conditions.length
                                : rule.conditions?.groups?.reduce((total, group) => 
                                    total + group.conditions.length, 0) || 0} condition{
                              (typeof rule.conditions === 'string'
                                ? JSON.parse(rule.conditions).length
                                : Array.isArray(rule.conditions)
                                  ? rule.conditions.length
                                  : rule.conditions?.groups?.reduce((total, group) => 
                                      total + group.conditions.length, 0) || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {rule.auto_resolve && (
                          <div className="mt-1">
                            <span className="font-medium">Auto-resolve:</span>{' '}
                            <span className="text-muted-foreground">
                              {typeof rule.resolution_conditions === 'string'
                                ? JSON.parse(rule.resolution_conditions).length
                                : Array.isArray(rule.resolution_conditions)
                                  ? rule.resolution_conditions.length
                                  : 0} condition{
                                (typeof rule.resolution_conditions === 'string'
                                  ? JSON.parse(rule.resolution_conditions).length
                                  : Array.isArray(rule.resolution_conditions)
                                    ? rule.resolution_conditions.length
                                    : 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {rule.team_lead_approval_required && (
                          <div className="mt-1">
                            <span className="font-medium">Team Lead Approval Required</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </TabsContent>
        
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingRuleId ? "Edit RedZone Rule" : "Create RedZone Rule"}
              </CardTitle>
              <CardDescription>
                Configure conditions that trigger RedZone alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                <SelectValue placeholder="Select severity" />
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
                    </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter a description for this rule"
                            className="resize-none h-20"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Describe when this rule should trigger and why
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Rule Conditions</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Specify the conditions that will trigger this RedZone rule
                      </p>
                      
                      <div className="mb-4">
                        <div className="flex items-center mb-2">
                          <FormField
                            control={form.control}
                            name="conditions.logicOperator"
                            render={({ field }) => (
                              <FormItem className="w-24">
                                <Select 
                                  value={field.value} 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    handleTopLevelLogicOperatorChange(value as LogicOperator);
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="AND">AND</SelectItem>
                                    <SelectItem value="OR">OR</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <span className="mx-2 text-sm font-medium">between condition groups</span>
                          </div>
                        </div>
                      
                      {fieldsLoading ? (
                        <div className="space-y-4">
                          <Skeleton className="h-40 w-full" />
                          <Skeleton className="h-40 w-full" />
                        </div>
                      ) : (
                        <>
                          {form.getValues("conditions.groups")?.map((group, groupIndex) => (
                            <ConditionGroupComponent 
                              key={groupIndex}
                              form={form}
                              groupIndex={groupIndex}
                              availableFields={availableFields}
                              onAddCondition={addCondition}
                              onRemoveCondition={removeCondition}
                              onLogicOperatorChange={handleLogicOperatorChange}
                              onRemoveGroup={removeConditionGroup}
                            />
                          ))}
                          
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addConditionGroup}
                            className="mt-2"
                          >
                            <PlusCircleIcon className="h-4 w-4 mr-2" />
                            Add Condition Group
                          </Button>
                        </>
                      )}
                      </div>
                    </div>
                  
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="notification_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notification Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter a notification message"
                            className="resize-none h-20"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This message will be shown in the notification when the rule is triggered
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    
                    <FormField
                      control={form.control}
                      name="team_lead_approval_required"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Team Lead Approval</FormLabel>
                            <FormDescription>
                              Require team lead approval for resolution
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
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Rule</FormLabel>
                          <FormDescription>
                            When enabled, this rule will actively monitor customers
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
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setActiveTab("rules");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createRuleMutation.isPending}
                    >
                      {createRuleMutation.isPending ? (
                        "Saving..."
                      ) : editingRuleId ? (
                        "Update Rule"
                      ) : (
                        "Create Rule"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default RedZoneSettingsPage;