import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { format, addDays } from "date-fns";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Icons
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Trash2,
  Save,
  AlertCircle,
} from "lucide-react";

// API and types
import { apiRequest } from "@/lib/queryClient";

// Schema for the playbook form data
const requiredFieldsOptions = [
  { id: "comment", label: "Comment" },
  { id: "recording_link", label: "Recording Link" },
  { id: "attachment", label: "Attachment" },
];

const playbookTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  due_type: z.enum(["fixed", "relative"]),
  due_offset: z.number().optional(),
  fixed_date: z.date().optional(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly", "bi-weekly"]),
  assignment_role: z.enum(["csm", "team_lead", "admin"]),
  required_fields: z.array(z.string()).optional(),
  template_message: z.string().optional(),
  position: z.number(),
});

const playbookSchema = z.object({
  name: z.string().min(1, "Playbook name is required"),
  description: z.string().optional(),
  trigger_type: z.enum(["manual", "new_customer", "usage_drop", "renewal_approaching", "custom_event"]),
  target_segments: z.array(z.enum(["starter", "growth", "key"])).min(1, "At least one account type must be selected"),
  filters: z.record(z.string()).optional(),
  tasks: z.array(playbookTaskSchema).min(1, "At least one task is required"),
});

type PlaybookFormValues = z.infer<typeof playbookSchema>;
type PlaybookTaskFormValues = z.infer<typeof playbookTaskSchema>;

const defaultTask: PlaybookTaskFormValues = {
  title: "",
  description: "",
  due_type: "relative",
  due_offset: 0,
  recurrence: "none",
  assignment_role: "csm",
  required_fields: [],
  template_message: "",
  position: 0,
};

export default function PlaybookWorkflow() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get user roles for assignment options
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    retry: false,
  });

  // Form setup
  const form = useForm<PlaybookFormValues>({
    resolver: zodResolver(playbookSchema),
    defaultValues: {
      name: "",
      description: "",
      trigger_type: "manual",
      target_segments: ["growth"],
      filters: {},
      tasks: [{ ...defaultTask, position: 0 }],
    },
  });

  // Tasks field array
  const { fields, append, remove, move, update } = useFieldArray({
    name: "tasks",
    control: form.control,
  });

  // Handle moving tasks up/down
  const moveTaskUp = (index: number) => {
    if (index > 0) {
      move(index, index - 1);
      // Update positions after move
      const updatedTasks = form.getValues().tasks;
      updatedTasks.forEach((task, idx) => {
        update(idx, { ...task, position: idx });
      });
    }
  };

  const moveTaskDown = (index: number) => {
    if (index < fields.length - 1) {
      move(index, index + 1);
      // Update positions after move
      const updatedTasks = form.getValues().tasks;
      updatedTasks.forEach((task, idx) => {
        update(idx, { ...task, position: idx });
      });
    }
  };

  // Create playbook mutation
  const createPlaybookMutation = useMutation({
    mutationFn: async (data: PlaybookFormValues) => {
      // Format the data for the API
      const formattedData = {
        name: data.name,
        description: data.description,
        trigger_type: data.trigger_type,
        target_segments: data.target_segments,
        filters: data.filters,
        active: true,
        tasks: data.tasks.map((task, index) => ({
          ...task,
          position: index,
          required_fields: task.required_fields || [],
        })),
      };

      return await apiRequest('/api/playbooks/workflow', 'POST', formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/playbooks'] });
      toast({
        title: "Success",
        description: "Playbook created successfully",
      });
      setLocation("/playbooks");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create playbook: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Step navigation
  const nextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 0) {
      form.trigger(["name", "description", "trigger_type", "target_segments"]);
      if (form.formState.errors.name || form.formState.errors.trigger_type || form.formState.errors.target_segments) {
        return;
      }
    } else if (currentStep === 1) {
      form.trigger("tasks");
      if (form.formState.errors.tasks) {
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 2));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Form submission
  const onSubmit = (data: PlaybookFormValues) => {
    createPlaybookMutation.mutate(data);
  };

  // Add new task
  const addTask = () => {
    append({
      ...defaultTask,
      position: fields.length,
    });
  };

  // Step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Playbook Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter playbook name" {...field} />
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
                    <Textarea 
                      placeholder="Enter playbook description" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trigger_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trigger type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="new_customer">New Customer Created</SelectItem>
                      <SelectItem value="usage_drop">Usage Drop</SelectItem>
                      <SelectItem value="renewal_approaching">Renewal Approaching</SelectItem>
                      <SelectItem value="custom_event">Custom Event (Future Support)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Target Account Types</FormLabel>
              <div className="mt-2 space-y-2">
                {["starter", "growth", "key"].map((type) => (
                  <FormField
                    key={type}
                    control={form.control}
                    name="target_segments"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(type as any)}
                            onCheckedChange={(checked) => {
                              const currentValues = field.value || [];
                              if (checked) {
                                field.onChange([...currentValues, type]);
                              } else {
                                field.onChange(
                                  currentValues.filter((value) => value !== type)
                                );
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="capitalize">{type}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              {form.formState.errors.target_segments && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.target_segments.message}
                </p>
              )}
            </div>

            <div>
              <FormLabel>Filters (Optional)</FormLabel>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <FormField
                  control={form.control}
                  name={`filters.pod`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>POD</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter POD" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name={`filters.location_count`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Count</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. >=5" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name={`filters.arr`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ARR</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. <500000" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name={`filters.plan_type`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Type</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter plan type" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Task Series Builder</h3>
              <Button onClick={addTask} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>

            {fields.length === 0 && (
              <div className="text-center p-8 border border-dashed rounded-lg">
                <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-500">No tasks added yet. Click "Add Task" to start building your playbook.</p>
              </div>
            )}

            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2">Task {index + 1}</Badge>
                        <CardTitle className="text-base">
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.title`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <FormControl>
                                  <Input 
                                    placeholder="Enter task title" 
                                    {...field} 
                                    className="border-0 px-0 text-lg font-semibold"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardTitle>
                      </div>
                      <div className="flex space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => moveTaskUp(index)}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move Up</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => moveTaskDown(index)}
                                disabled={index === fields.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move Down</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => remove(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Task</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`tasks.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter task description" 
                                {...field} 
                                value={field.value || ""}
                                className="resize-none h-24"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`tasks.${index}.due_type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date Type</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select due date type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="relative">Relative to Trigger</SelectItem>
                                  <SelectItem value="fixed">Fixed Date</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {form.watch(`tasks.${index}.due_type`) === "relative" && (
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.due_offset`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Days After Trigger</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min={0} 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    value={field.value || 0}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Number of days after the playbook is triggered
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                        {form.watch(`tasks.${index}.due_type`) === "fixed" && (
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.fixed_date`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Fixed Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={!field.value ? "text-muted-foreground" : ""}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name={`tasks.${index}.recurrence`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recurrence</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select recurrence pattern" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`tasks.${index}.assignment_role`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assignee Role</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select assignment role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="csm">CSM</SelectItem>
                                <SelectItem value="team_lead">Team Lead</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mt-4">
                      <FormLabel>Required Fields</FormLabel>
                      <div className="mt-2">
                        <FormField
                          control={form.control}
                          name={`tasks.${index}.required_fields`}
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex flex-wrap gap-4">
                                {requiredFieldsOptions.map((option) => (
                                  <FormItem
                                    key={option.id}
                                    className="flex flex-row items-center space-x-2 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(option.id)}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          if (checked) {
                                            field.onChange([...currentValue, option.id]);
                                          } else {
                                            field.onChange(
                                              currentValue.filter((value) => value !== option.id)
                                            );
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{option.label}</FormLabel>
                                  </FormItem>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name={`tasks.${index}.template_message`}
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Template Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter template message with variables like &#123;&#123;customer_name&#125;&#125;" 
                              {...field} 
                              value={field.value || ""}
                              className="resize-none h-24"
                            />
                          </FormControl>
                          <FormDescription>
                            You can use variables like &#123;&#123;customer_name&#125;&#125;, &#123;&#123;renewal_date&#125;&#125;, &#123;&#123;csm_name&#125;&#125;
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Playbook Summary</h3>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Playbook Name</h4>
                      <p className="text-lg">{form.watch("name")}</p>
                    </div>
                    
                    {form.watch("description") && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-500">Description</h4>
                        <p>{form.watch("description")}</p>
                      </div>
                    )}
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm text-gray-500">Trigger Type</h4>
                        <p className="capitalize">{form.watch("trigger_type").replace(/_/g, " ")}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-gray-500">Target Account Types</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {form.watch("target_segments").map((segment) => (
                            <Badge key={segment} variant="outline" className="capitalize">
                              {segment}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {Object.keys(form.watch("filters") || {}).some(key => !!form.watch(`filters.${key}`)) && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-500">Filters</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
                          {Object.entries(form.watch("filters") || {}).map(([key, value]) => 
                            value ? (
                              <div key={key} className="flex">
                                <span className="font-medium capitalize mr-2">{key.replace(/_/g, " ")}:</span>
                                <span>{value}</span>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Task Timeline</h3>
              <Card>
                <CardContent className="pt-6">
                  {form.watch("tasks").length === 0 ? (
                    <p className="text-gray-500">No tasks defined in this playbook.</p>
                  ) : (
                    <div className="relative pl-6 border-l border-gray-200">
                      {form.watch("tasks")
                        .sort((a, b) => {
                          // Sort by due_offset for relative tasks
                          if (a.due_type === "relative" && b.due_type === "relative") {
                            return (a.due_offset || 0) - (b.due_offset || 0);
                          }
                          // Fixed dates always after relative dates
                          if (a.due_type === "relative" && b.due_type === "fixed") {
                            return -1;
                          }
                          if (a.due_type === "fixed" && b.due_type === "relative") {
                            return 1;
                          }
                          // Sort fixed dates chronologically
                          if (a.due_type === "fixed" && b.due_type === "fixed" && a.fixed_date && b.fixed_date) {
                            return a.fixed_date.getTime() - b.fixed_date.getTime();
                          }
                          // Default to position
                          return a.position - b.position;
                        })
                        .map((task, i) => (
                          <div 
                            key={i} 
                            className="mb-6 relative"
                          >
                            <div 
                              className="absolute -left-10 mt-1 w-4 h-4 rounded-full bg-primary border-4 border-white"
                            />
                            <div>
                              <div className="flex items-center">
                                <Badge variant="outline" className="mr-2">
                                  {task.due_type === "relative" 
                                    ? `Day ${task.due_offset || 0}` 
                                    : task.fixed_date 
                                      ? format(task.fixed_date, "MMM d, yyyy")
                                      : "Fixed Date"
                                  }
                                </Badge>
                                <h4 className="font-medium">{task.title}</h4>
                              </div>
                              
                              {task.description && (
                                <p className="text-gray-600 mt-1">{task.description}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm">
                                <div className="flex items-center">
                                  <span className="font-medium mr-1">Assignee:</span> 
                                  <span className="capitalize">{task.assignment_role.replace(/_/g, " ")}</span>
                                </div>
                                
                                {task.recurrence !== "none" && (
                                  <div className="flex items-center">
                                    <span className="font-medium mr-1">Recurrence:</span>
                                    <span className="capitalize">{task.recurrence}</span>
                                  </div>
                                )}
                                
                                {task.required_fields && task.required_fields.length > 0 && (
                                  <div className="flex items-center">
                                    <span className="font-medium mr-1">Required:</span>
                                    <span>{task.required_fields.map(f => 
                                      f.replace(/_/g, " ")
                                    ).join(", ")}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Step indicators
  const steps = [
    { name: "Basic Details", description: "Define playbook basics" },
    { name: "Task Series", description: "Build the task sequence" },
    { name: "Review", description: "Verify and save" },
  ];

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Create New Playbook</h1>
        <Button variant="outline" onClick={() => setLocation("/playbooks")}>Cancel</Button>
      </div>

      <div className="mb-8">
        <Tabs value={currentStep.toString()} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            {steps.map((step, index) => (
              <TabsTrigger
                key={index}
                value={index.toString()}
                disabled={true}
                className={`
                  ${index < currentStep ? "bg-primary/10 text-primary" : ""}
                  ${index === currentStep ? "bg-primary text-primary-foreground" : ""}
                  ${index > currentStep ? "bg-gray-100 text-gray-500" : ""}
                `}
              >
                {index < currentStep && <Check className="mr-2 h-4 w-4" />}
                {step.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <p className="text-sm text-gray-500 mt-2">
            {steps[currentStep].description}
          </p>
        </Tabs>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {renderStepContent()}

          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep < 2 ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={createPlaybookMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createPlaybookMutation.isPending ? (
                  "Creating Playbook..."
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Playbook
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}