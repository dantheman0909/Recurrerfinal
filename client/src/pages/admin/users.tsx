import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, DialogTrigger, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription, DialogFooter, DialogClose 
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Check, MoreHorizontal, Pencil, Trash2, UserPlus, PlusCircle, Users
} from 'lucide-react';

// User types with role information
type UserRole = 'admin' | 'team_lead' | 'csm';

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  team_lead_id?: number | null;
  avatar?: string | null;
}

export default function UsersManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('all-users');
  const [openAddUserDialog, setOpenAddUserDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignedTeamLead, setAssignedTeamLead] = useState<number | null>(null);

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (newUser: Omit<User, 'id'>) => {
      const response = await apiRequest('POST', '/api/users', newUser);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setOpenAddUserDialog(false);
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create user: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Update user (assign to team lead) mutation
  const updateUserMutation = useMutation({
    mutationFn: async (updates: { userId: number; teamLeadId: number | null }) => {
      const response = await apiRequest('PATCH', `/api/users/${updates.userId}`, {
        team_lead_id: updates.teamLeadId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setOpenAssignDialog(false);
      toast({
        title: 'Success',
        description: 'User assignment updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update user: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Handle form submission for new user
  const handleAddUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const newUser = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as UserRole,
      team_lead_id: formData.get('role') === 'csm' 
        ? Number(formData.get('team_lead_id')) || null
        : null
    };
    
    createUserMutation.mutate(newUser);
  };

  // Handle assigning CSM to team lead
  const handleAssignToTeamLead = () => {
    if (!selectedUser) return;
    
    updateUserMutation.mutate({
      userId: selectedUser.id,
      teamLeadId: assignedTeamLead
    });
  };

  // Filter users by role
  const adminUsers = users.filter((user: User) => user.role === 'admin');
  const teamLeadUsers = users.filter((user: User) => user.role === 'team_lead');
  const csmUsers = users.filter((user: User) => user.role === 'csm');

  // Get CSMs assigned to a team lead
  const getTeamMembers = (teamLeadId: number) => {
    return csmUsers.filter((user: User) => user.team_lead_id === teamLeadId);
  };

  // Function to get user initials for avatar fallback
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Function to get role badge style based on role
  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { variant: 'default', className: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'team_lead':
        return { variant: 'secondary', className: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'csm':
        return { variant: 'outline', className: 'bg-green-100 text-green-800 border-green-200' };
      default:
        return { variant: 'outline', className: '' };
    }
  };

  // Function to get team lead name by ID
  const getTeamLeadName = (teamLeadId: number | null | undefined) => {
    if (!teamLeadId) return 'None';
    const teamLead = users.find((user: User) => user.id === teamLeadId);
    return teamLead ? teamLead.name : 'Unknown';
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and team assignments
          </p>
        </div>
        <Button onClick={() => setOpenAddUserDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all-users">All Users</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="team-leads">Team Leads</TabsTrigger>
          <TabsTrigger value="csms">CSMs</TabsTrigger>
        </TabsList>
        
        {/* All Users Tab */}
        <TabsContent value="all-users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                View and manage all users in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Team Lead</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={user.avatar || ''} />
                          <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={getRoleBadgeVariant(user.role).variant as any} 
                          className={getRoleBadgeVariant(user.role).className}
                        >
                          {user.role === 'team_lead' ? 'Team Lead' : user.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.role === 'csm' ? getTeamLeadName(user.team_lead_id) : '-'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {user.role === 'csm' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setAssignedTeamLead(user.team_lead_id || null);
                                  setOpenAssignDialog(true);
                                }}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Assign to Team Lead
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-red-500">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admins Tab */}
        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Administrators</CardTitle>
              <CardDescription>
                Users with full access to all features and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={user.avatar || ''} />
                          <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Leads Tab */}
        <TabsContent value="team-leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Leads</CardTitle>
              <CardDescription>
                Manage team leads and their assigned CSMs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6">
                {teamLeadUsers.map((teamLead: User) => {
                  const teamMembers = getTeamMembers(teamLead.id);
                  
                  return (
                    <Card key={teamLead.id} className="shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={teamLead.avatar || ''} />
                              <AvatarFallback>{getUserInitials(teamLead.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle>{teamLead.name}</CardTitle>
                              <CardDescription>{teamLead.email}</CardDescription>
                            </div>
                          </div>
                          <Badge 
                            variant="secondary"
                            className="bg-blue-100 text-blue-800 border-blue-200"
                          >
                            Team Lead
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Team Members ({teamMembers.length})
                        </h4>
                        {teamMembers.length > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>CSM</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {teamMembers.map((member: User) => (
                                  <TableRow key={member.id}>
                                    <TableCell className="flex items-center space-x-3">
                                      <Avatar className="h-7 w-7">
                                        <AvatarImage src={member.avatar || ''} />
                                        <AvatarFallback>{getUserInitials(member.name)}</AvatarFallback>
                                      </Avatar>
                                      <span>{member.name}</span>
                                    </TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell className="text-right">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                          setSelectedUser(member);
                                          setAssignedTeamLead(null);
                                          setOpenAssignDialog(true);
                                        }}
                                      >
                                        Unassign
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-md text-muted-foreground">
                            <p className="mb-2">No CSMs assigned to this team lead yet</p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // To be implemented: Open dialog with list of unassigned CSMs
                              }}
                            >
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Assign CSMs
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CSMs Tab */}
        <TabsContent value="csms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Success Managers</CardTitle>
              <CardDescription>
                View all CSMs and their team assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Team Lead</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csmUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={user.avatar || ''} />
                          <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.team_lead_id ? (
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {getTeamLeadName(user.team_lead_id)}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setAssignedTeamLead(user.team_lead_id || null);
                            setOpenAssignDialog(true);
                          }}
                        >
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={openAddUserDialog} onOpenChange={setOpenAddUserDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with the appropriate role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select name="role" defaultValue="csm">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="team_lead">Team Lead</SelectItem>
                    <SelectItem value="csm">CSM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="team_lead_id" className="text-right">
                  Team Lead
                </Label>
                <Select name="team_lead_id">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a team lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {teamLeadUsers.map((teamLead: User) => (
                      <SelectItem key={teamLead.id} value={teamLead.id.toString()}>
                        {teamLead.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign to Team Lead Dialog */}
      <Dialog open={openAssignDialog} onOpenChange={setOpenAssignDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign CSM to Team Lead</DialogTitle>
            <DialogDescription>
              {selectedUser && `Assign ${selectedUser.name} to a team lead or remove their current assignment.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="font-medium">Select Team Lead</p>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto border rounded-md p-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="unassigned" 
                  checked={assignedTeamLead === null}
                  onCheckedChange={() => setAssignedTeamLead(null)}
                />
                <Label htmlFor="unassigned" className="cursor-pointer">Unassigned (no team lead)</Label>
              </div>
              
              <div className="my-2 border-t border-gray-200"></div>
              
              {teamLeadUsers.map((teamLead: User) => (
                <div key={teamLead.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`team-lead-${teamLead.id}`} 
                    checked={assignedTeamLead === teamLead.id}
                    onCheckedChange={() => setAssignedTeamLead(teamLead.id)}
                  />
                  <Label 
                    htmlFor={`team-lead-${teamLead.id}`} 
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={teamLead.avatar || ''} />
                      <AvatarFallback>{getUserInitials(teamLead.name)}</AvatarFallback>
                    </Avatar>
                    <span>{teamLead.name}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpenAssignDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignToTeamLead}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? 'Updating...' : 'Save Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}