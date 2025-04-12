import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { 
  Layers, 
  Plus, 
  Search, 
  Clock, 
  ArrowRight, 
  Calendar, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare,
  AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaybookTriggerType, AccountHealth } from "@shared/types";
import { Playbook, PlaybookTask, insertPlaybookSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Create an extended schema for the form
const createPlaybookSchema = insertPlaybookSchema.extend({
  days: z.coerce.number().min(1).max(365).optional(),
  health_status: z.enum(["healthy", "at_risk", "red_zone"]).optional(),
});

type CreatePlaybookFormValues = z.infer<typeof createPlaybookSchema>;

export default function Playbooks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPlaybook, setCurrentPlaybook] = useState<Playbook | null>(null);
  const { toast } = useToast();
  
  const { data: playbooks, isLoading } = useQuery({
    queryKey: ['/api/playbooks'],
  });
  
  const createPlaybookMutation = useMutation({
    mutationFn: async (values: CreatePlaybookFormValues) => {
      // Convert the form values to the expected format
      const playbookData = {
        name: values.name,
        description: values.description,
        trigger_type: values.trigger_type,
        trigger_config: JSON.stringify({
          days: values.days,
          healthStatus: values.health_status
        })
      };
      
      // Create the playbook first
      const response = await apiRequest('/api/playbooks', 'POST', playbookData);
      
      // After creating the playbook, automatically create an initial task
      if (response && response.id) {
        try {
          // Add a default task to the playbook
          await apiRequest(`/api/playbooks/${response.id}/tasks`, 'POST', {
            title: "Initial task for " + values.name,
            description: "This is the first step in the playbook",
            order: 1,
            days_offset: 0
          });
        } catch (e) {
          console.error("Failed to create initial task for playbook:", e);
        }
      }
      
      return response;
    },
    onSuccess: (data) => {
      // Invalidate both playbooks and the specific playbook's tasks
      queryClient.invalidateQueries({ queryKey: ['/api/playbooks'] });
      if (data && data.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/playbooks/${data.id}/tasks`] });
      }
      
      toast({
        title: "Success",
        description: "Playbook created successfully with initial task",
      });
      setIsCreateDialogOpen(false);
      
      // Force refetch after a short delay to ensure UI is updated
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/playbooks'] });
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create playbook: " + error,
        variant: "destructive",
      });
    },
  });

  const updatePlaybookMutation = useMutation({
    mutationFn: async (values: CreatePlaybookFormValues & { id: number }) => {
      const { id, ...rest } = values;
      // Convert the form values to the expected format
      const playbookData = {
        name: rest.name,
        description: rest.description,
        trigger_type: rest.trigger_type,
        trigger_config: JSON.stringify({
          days: rest.days,
          healthStatus: rest.health_status
        })
      };
      
      // Update the playbook using apiRequest
      const response = await apiRequest(`/api/playbooks/${id}`, 'PATCH', playbookData);
      
      return response;
    },
    onSuccess: (data) => {
      // Invalidate both playbooks and the specific playbook's tasks
      queryClient.invalidateQueries({ queryKey: ['/api/playbooks'] });
      if (data && data.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/playbooks/${data.id}/tasks`] });
      }
      
      toast({
        title: "Success",
        description: "Playbook updated successfully",
      });
      setIsEditDialogOpen(false);
      
      // Force refetch after a short delay to ensure UI is updated
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/playbooks'] });
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update playbook: " + error,
        variant: "destructive",
      });
    },
  });
  
  const form = useForm<CreatePlaybookFormValues>({
    resolver: zodResolver(createPlaybookSchema),
    defaultValues: {
      name: "",
      description: "",
      trigger_type: "manual",
      days: undefined,
      health_status: undefined,
    },
  });

  const editForm = useForm<CreatePlaybookFormValues & { id: number }>({
    resolver: zodResolver(createPlaybookSchema.extend({ id: z.number() })),
    defaultValues: {
      id: 0,
      name: "",
      description: "",
      trigger_type: "manual",
      days: undefined,
      health_status: undefined,
    },
  });
  
  const handleEditPlaybook = (playbook: Playbook) => {
    setCurrentPlaybook(playbook);
    setIsEditDialogOpen(true);
    
    // Parse trigger_config if it exists
    let days;
    let healthStatus;
    if (playbook.trigger_config) {
      try {
        const config = JSON.parse(playbook.trigger_config as string);
        days = config.days;
        healthStatus = config.healthStatus;
      } catch (e) {
        console.error("Error parsing trigger_config", e);
      }
    }
    
    // Reset the form with the playbook data
    editForm.reset({
      id: playbook.id,
      name: playbook.name,
      description: playbook.description || "",
      trigger_type: playbook.trigger_type as PlaybookTriggerType || "manual",
      days: days,
      health_status: healthStatus as AccountHealth,
    });
  };
  
  const onSubmit = (values: CreatePlaybookFormValues) => {
    createPlaybookMutation.mutate(values);
  };
  
  const onEditSubmit = (values: CreatePlaybookFormValues & { id: number }) => {
    updatePlaybookMutation.mutate(values);
  };
  
  const filteredPlaybooks = playbooks?.filter((playbook: Playbook) => 
    playbook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (playbook.description && playbook.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const showTriggerFields = (triggerType: string) => {
    if (triggerType === 'time_after_onboarding' || triggerType === 'days_before_renewal') {
      return true;
    } else if (triggerType === 'account_health_change') {
      return false;
    } else {
      return false;
    }
  };

  return (
    <>
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">Playbooks</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage automated workflows for customer success
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Playbook
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Playbook</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                              <Textarea placeholder="Enter playbook description" {...field} />
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
                                <SelectItem value="time_after_onboarding">Time After Onboarding</SelectItem>
                                <SelectItem value="days_before_renewal">Days Before Renewal</SelectItem>
                                <SelectItem value="account_health_change">Account Health Change</SelectItem>
                                <SelectItem value="manual">Manual Activation</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Conditional fields based on trigger type */}
                      {form.watch("trigger_type") === "account_health_change" && (
                        <FormField
                          control={form.control}
                          name="health_status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Health Status</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select health status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="healthy">Healthy</SelectItem>
                                  <SelectItem value="at_risk">At Risk</SelectItem>
                                  <SelectItem value="red_zone">Red Zone</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {showTriggerFields(form.watch("trigger_type")) && (
                        <FormField
                          control={form.control}
                          name="days"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Days</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="Number of days" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <div className="flex justify-end mt-4">
                        <Button 
                          type="button"
                          variant="outline" 
                          onClick={() => setIsCreateDialogOpen(false)}
                          className="mr-2"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createPlaybookMutation.isPending}
                        >
                          {createPlaybookMutation.isPending ? "Creating..." : "Create Playbook"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              {/* Edit Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit Playbook</DialogTitle>
                  </DialogHeader>
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                      <FormField
                        control={editForm.control}
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
                        control={editForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter playbook description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
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
                                <SelectItem value="time_after_onboarding">Time After Onboarding</SelectItem>
                                <SelectItem value="days_before_renewal">Days Before Renewal</SelectItem>
                                <SelectItem value="account_health_change">Account Health Change</SelectItem>
                                <SelectItem value="manual">Manual Activation</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Conditional fields based on trigger type */}
                      {editForm.watch("trigger_type") === "account_health_change" && (
                        <FormField
                          control={editForm.control}
                          name="health_status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Health Status</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select health status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="healthy">Healthy</SelectItem>
                                  <SelectItem value="at_risk">At Risk</SelectItem>
                                  <SelectItem value="red_zone">Red Zone</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {showTriggerFields(editForm.watch("trigger_type")) && (
                        <FormField
                          control={editForm.control}
                          name="days"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Days</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="Number of days" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <div className="flex justify-end mt-4">
                        <Button 
                          type="button"
                          variant="outline" 
                          onClick={() => setIsEditDialogOpen(false)}
                          className="mr-2"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={updatePlaybookMutation.isPending}
                        >
                          {updatePlaybookMutation.isPending ? "Updating..." : "Update Playbook"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="search"
              placeholder="Search playbooks..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              All Types
            </Button>
            <Button variant="outline" size="sm">
              Active
            </Button>
            <Button variant="outline" size="sm">
              Draft
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="grid">
            {isLoading ? (
              <div className="text-center py-10">Loading playbooks...</div>
            ) : filteredPlaybooks && filteredPlaybooks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlaybooks.map((playbook: Playbook) => (
                  <PlaybookCard 
                    key={playbook.id} 
                    playbook={playbook} 
                    onEdit={() => handleEditPlaybook(playbook)} 
                  />
                ))}
                
                {/* "Create New Playbook" card */}
                <Card className="cursor-pointer hover:shadow-md border-dashed border-2 flex items-center justify-center h-full" onClick={() => setIsCreateDialogOpen(true)}>
                  <CardContent className="p-6 text-center">
                    <div className="rounded-full bg-teal-100 p-3 inline-flex mx-auto mb-4">
                      <Plus className="h-6 w-6 text-teal-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">New Playbook</h3>
                    <p className="text-sm text-gray-500 mt-2">
                      Create a new automation workflow
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">No playbooks match your search criteria.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="list">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>All Playbooks</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-10">Loading playbooks...</div>
                ) : filteredPlaybooks && filteredPlaybooks.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {filteredPlaybooks.map((playbook: Playbook) => (
                      <PlaybookListItem 
                        key={playbook.id} 
                        playbook={playbook} 
                        onEdit={() => handleEditPlaybook(playbook)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No playbooks match your search criteria.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

interface PlaybookCardProps {
  playbook: Playbook;
  onEdit: () => void;
}

function PlaybookCard({ playbook, onEdit }: PlaybookCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: tasks } = useQuery({
    queryKey: [`/api/playbooks/${playbook.id}/tasks`],
  });
  
  const getTriggerLabel = (triggerType: PlaybookTriggerType) => {
    switch (triggerType) {
      case 'time_after_onboarding':
        return 'After Onboarding';
      case 'days_before_renewal':
        return 'Before Renewal';
      case 'account_health_change':
        return 'Health Change';
      case 'manual':
        return 'Manual Activation';
      default:
        return triggerType;
    }
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="bg-teal-50 text-teal-700 mb-2">
            {getTriggerLabel(playbook.trigger_type as PlaybookTriggerType)}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <CardTitle>{playbook.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {playbook.description || 'No description provided'}
        </CardDescription>
      </CardHeader>
      
      {isExpanded && tasks && tasks.length > 0 && (
        <CardContent className="pb-2">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Tasks</h4>
          <div className="space-y-2">
            {tasks.slice(0, 3).map((task: PlaybookTask) => (
              <div key={task.id} className="flex items-start p-2 bg-gray-50 rounded-md">
                <CheckSquare className="h-4 w-4 text-teal-500 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  {task.due_days && (
                    <p className="text-xs text-gray-500">Due: {task.due_days} days {task.due_days > 0 ? 'after' : 'before'}</p>
                  )}
                </div>
              </div>
            ))}
            {tasks.length > 3 && (
              <p className="text-xs text-gray-500 text-center">
                +{tasks.length - 3} more tasks
              </p>
            )}
          </div>
        </CardContent>
      )}
      
      <CardFooter className="pt-2">
        <div className="flex justify-between items-center w-full">
          <span className="text-xs text-gray-500">
            {tasks ? `${tasks.length} tasks` : 'Loading tasks...'}
          </span>
          <Button variant="ghost" size="sm" className="text-teal-600" onClick={onEdit}>
            Edit <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface PlaybookListItemProps {
  playbook: Playbook;
  onEdit: () => void;
}

function PlaybookListItem({ playbook, onEdit }: PlaybookListItemProps) {
  const { data: tasks } = useQuery({
    queryKey: [`/api/playbooks/${playbook.id}/tasks`],
  });
  
  const getTriggerLabel = (triggerType: PlaybookTriggerType) => {
    switch (triggerType) {
      case 'time_after_onboarding':
        return 'After Onboarding';
      case 'days_before_renewal':
        return 'Before Renewal';
      case 'account_health_change':
        return 'Health Change';
      case 'manual':
        return 'Manual Activation';
      default:
        return triggerType;
    }
  };
  
  return (
    <div className="py-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="bg-teal-100 rounded-md p-2 flex items-center justify-center mr-3">
            <Layers className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{playbook.name}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {playbook.description || 'No description provided'}
            </p>
            <div className="flex mt-2">
              <Badge variant="outline" className="mr-2 bg-teal-50 text-teal-700">
                {getTriggerLabel(playbook.trigger_type as PlaybookTriggerType)}
              </Badge>
              <Badge variant="outline">
                {tasks ? `${tasks.length} tasks` : 'Loading tasks...'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">View</Button>
          <Button size="sm" onClick={onEdit}>Edit</Button>
        </div>
      </div>
    </div>
  );
}
