import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  MoreVertical, 
  BookOpen, 
  ListChecks, 
  Clock, 
  Calendar, 
  Tag, 
  AlertCircle
} from "lucide-react";
import { PlaybookListItem } from "@shared/types";

export default function Playbooks() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch playbooks
  const { data: playbooks, isLoading } = useQuery<PlaybookListItem[]>({
    queryKey: ["/api/playbooks"],
  });

  // Filter playbooks based on search
  const filteredPlaybooks = playbooks?.filter(playbook => 
    searchQuery === "" || 
    playbook.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playbook.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Playbooks</h1>
          <Button className="flex items-center">
            <Plus className="h-4 w-4 mr-2" /> Create Playbook
          </Button>
        </div>
        
        {/* Info Card */}
        <Card className="mb-6 bg-gradient-to-r from-teal-500 to-teal-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-start">
              <BookOpen className="h-10 w-10 mr-4" />
              <div>
                <h2 className="text-xl font-semibold mb-2">What are Playbooks?</h2>
                <p className="mb-4">
                  Playbooks are automated workflows that help standardize your customer success processes.
                  They can be triggered based on time periods, events, or customer attributes.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <ListChecks className="h-5 w-5 mr-2" />
                    <span>Define repeatable task sequences</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    <span>Set trigger conditions</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    <span>Schedule recurring tasks</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              className="pl-10"
              placeholder="Search playbooks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Playbooks Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger Type</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">Loading playbooks...</TableCell>
                  </TableRow>
                ) : filteredPlaybooks && filteredPlaybooks.length > 0 ? (
                  filteredPlaybooks.map((playbook) => (
                    <TableRow key={playbook.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{playbook.name}</div>
                          <div className="text-sm text-gray-500">{playbook.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {playbook.triggerType === 'time' && <Clock className="h-4 w-4 mr-1 text-blue-500" />}
                          {playbook.triggerType === 'renewal' && <Calendar className="h-4 w-4 mr-1 text-green-500" />}
                          {playbook.triggerType === 'pod_type' && <Tag className="h-4 w-4 mr-1 text-purple-500" />}
                          {playbook.triggerType === 'custom' && <AlertCircle className="h-4 w-4 mr-1 text-orange-500" />}
                          <span className="capitalize">
                            {playbook.triggerType.replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{playbook.taskCount}</TableCell>
                      <TableCell>
                        <Badge variant={playbook.isActive ? "default" : "outline"}>
                          {playbook.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {playbook.createdBy.name}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit Playbook</DropdownMenuItem>
                            <DropdownMenuItem>Manage Tasks</DropdownMenuItem>
                            <DropdownMenuItem>
                              {playbook.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <div className="flex flex-col items-center">
                        <BookOpen className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-500 mb-1">No playbooks found</p>
                        <p className="text-sm text-gray-400 mb-4">Create your first playbook to automate your workflows</p>
                        <Button className="flex items-center">
                          <Plus className="h-4 w-4 mr-2" /> Create Playbook
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Playbook Templates */}
        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Playbook Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <h3 className="text-lg font-medium">Onboarding Process</h3>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 mb-4">
                Standard onboarding workflow for new customers with task sequences
                spanning the first 30-60 days.
              </p>
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <ListChecks className="h-4 w-4 mr-1" />
                <span>8 Tasks</span>
              </div>
              <Button variant="outline" className="w-full">Use Template</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <h3 className="text-lg font-medium">Quarterly Business Review</h3>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 mb-4">
                Tasks for preparing and conducting QBRs, scheduled to trigger 30 days
                before each customer's renewal date.
              </p>
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <ListChecks className="h-4 w-4 mr-1" />
                <span>5 Tasks</span>
              </div>
              <Button variant="outline" className="w-full">Use Template</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <h3 className="text-lg font-medium">Health Check</h3>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 mb-4">
                Regular health check workflow that runs monthly to check in on customer
                usage, sentiment, and growth opportunities.
              </p>
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <ListChecks className="h-4 w-4 mr-1" />
                <span>6 Tasks</span>
              </div>
              <Button variant="outline" className="w-full">Use Template</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
