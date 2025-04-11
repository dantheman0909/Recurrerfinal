import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  CheckSquare
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaybookTriggerType } from "@shared/types";
import { Playbook, PlaybookTask } from "@shared/schema";

export default function Playbooks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: playbooks, isLoading } = useQuery({
    queryKey: ['/api/playbooks'],
  });
  
  const filteredPlaybooks = playbooks?.filter((playbook: Playbook) => 
    playbook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (playbook.description && playbook.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Playbook Name</Label>
                      <Input id="name" placeholder="Enter playbook name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" placeholder="Enter playbook description" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="trigger_type">Trigger Type</Label>
                      <Select>
                        <SelectTrigger id="trigger_type">
                          <SelectValue placeholder="Select trigger type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time_after_onboarding">Time After Onboarding</SelectItem>
                          <SelectItem value="days_before_renewal">Days Before Renewal</SelectItem>
                          <SelectItem value="account_health_change">Account Health Change</SelectItem>
                          <SelectItem value="manual">Manual Activation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Trigger Configuration</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="days" className="text-sm">Days</Label>
                          <Input id="days" type="number" placeholder="Enter days" />
                        </div>
                        <div>
                          <Label htmlFor="health_status" className="text-sm">Health Status</Label>
                          <Select>
                            <SelectTrigger id="health_status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="healthy">Healthy</SelectItem>
                              <SelectItem value="at_risk">At Risk</SelectItem>
                              <SelectItem value="red_zone">Red Zone</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="mr-2"
                      >
                        Cancel
                      </Button>
                      <Button onClick={() => setIsCreateDialogOpen(false)}>Next: Add Tasks</Button>
                    </div>
                  </div>
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
                  <PlaybookCard key={playbook.id} playbook={playbook} />
                ))}
                
                {/* "Create New Playbook" card */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:shadow-md border-dashed border-2 flex items-center justify-center h-full">
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
                  </DialogTrigger>
                </Dialog>
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
                      <PlaybookListItem key={playbook.id} playbook={playbook} />
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
}

function PlaybookCard({ playbook }: PlaybookCardProps) {
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
          <Button variant="ghost" size="sm" className="text-teal-600">
            Edit <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface PlaybookListItemProps {
  playbook: Playbook;
}

function PlaybookListItem({ playbook }: PlaybookListItemProps) {
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
          <Button size="sm">Edit</Button>
        </div>
      </div>
    </div>
  );
}
