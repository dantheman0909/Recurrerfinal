import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';

const RolePermissionsPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  // Define permission structure in a type-safe way
  type Permission = {
    id: string;
    name: string;
    description: string;
    roles: {
      admin: boolean;
      team_lead: boolean;
      csm: boolean;
    };
  };

  // Fetch permissions from the API
  const { data: fetchedPermissions, status } = useQuery({
    queryKey: ['/api/roles/permissions'],
    queryFn: async () => {
      const response = await fetch('/api/roles/permissions');
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }
      const data = await response.json();
      
      // Convert from server format to frontend format
      return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        roles: {
          admin: p.admin_access,
          team_lead: p.team_lead_access,
          csm: p.csm_access
        }
      }));
    },
  });

  // Update permissions mutation
  const updatePermissions = useMutation({
    mutationFn: async (updatedPermissions: Permission[]) => {
      setIsLoading(true);
      // Convert from frontend format to server format
      const serverPermissions = updatedPermissions.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        admin_access: p.roles.admin,
        team_lead_access: p.roles.team_lead,
        csm_access: p.roles.csm
      }));
      
      const response = await fetch('/api/roles/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: serverPermissions }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update permissions');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Permissions updated',
        description: 'Role permissions have been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/roles/permissions'] });
      setIsLoading(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update permissions: ${error.message}`,
        variant: 'destructive',
      });
      setIsLoading(false);
    },
  });

  // List of all permissions for the application
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'view_customers',
      name: 'View Customers',
      description: 'View customer information and details',
      roles: {
        admin: true,
        team_lead: true,
        csm: true,
      },
    },
    {
      id: 'edit_customers',
      name: 'Edit Customers',
      description: 'Edit customer information and details',
      roles: {
        admin: true,
        team_lead: true,
        csm: false,
      },
    },
    {
      id: 'delete_customers',
      name: 'Delete Customers',
      description: 'Delete customers from the system',
      roles: {
        admin: true,
        team_lead: false,
        csm: false,
      },
    },
    {
      id: 'assign_customers',
      name: 'Assign Customers',
      description: 'Assign customers to CSMs',
      roles: {
        admin: true,
        team_lead: true,
        csm: false,
      },
    },
    {
      id: 'view_tasks',
      name: 'View Tasks',
      description: 'View all tasks in the system',
      roles: {
        admin: true,
        team_lead: true,
        csm: true,
      },
    },
    {
      id: 'manage_tasks',
      name: 'Manage Tasks',
      description: 'Create, edit, and delete tasks',
      roles: {
        admin: true,
        team_lead: true,
        csm: true,
      },
    },
    {
      id: 'view_reports',
      name: 'View Reports',
      description: 'Access reporting and analytics features',
      roles: {
        admin: true,
        team_lead: true,
        csm: false,
      },
    },
    {
      id: 'manage_users',
      name: 'Manage Users',
      description: 'Create, edit, and delete users',
      roles: {
        admin: true,
        team_lead: false,
        csm: false,
      },
    },
    {
      id: 'manage_settings',
      name: 'Manage Settings',
      description: 'Configure application settings',
      roles: {
        admin: true,
        team_lead: false,
        csm: false,
      },
    },
    {
      id: 'manage_integrations',
      name: 'Manage Integrations',
      description: 'Configure external integrations',
      roles: {
        admin: true,
        team_lead: false,
        csm: false,
      },
    },
  ]);

  // Toggle a permission for a specific role
  const togglePermission = (permissionId: string, role: 'admin' | 'team_lead' | 'csm') => {
    setPermissions(
      permissions.map((permission) => {
        if (permission.id === permissionId) {
          return {
            ...permission,
            roles: {
              ...permission.roles,
              [role]: !permission.roles[role],
            },
          };
        }
        return permission;
      })
    );
  };

  // Save permission changes (would typically call an API endpoint)
  const savePermissions = () => {
    // In a real implementation, this would make an API call to update permissions
    console.log('Saving permissions:', permissions);
    
    toast({
      title: 'Permissions updated',
      description: 'Role permissions have been saved successfully.',
    });
  };

  // Role descriptions for the overview tab
  const roleDescriptions = {
    admin: {
      title: 'Administrator',
      description: 'Full access to all features of the application, including user management, system configuration, and all customer data.',
      capabilities: [
        'Manage users and roles',
        'Configure system settings',
        'Set up integrations',
        'View and edit all customer data',
        'Access all reports and analytics',
        'Manage all tasks and playbooks',
      ],
    },
    team_lead: {
      title: 'Team Lead',
      description: 'Manages a team of CSMs and has access to their customer data and performance metrics.',
      capabilities: [
        'View team performance metrics',
        'Assign customers to team members',
        'Access reports for team members',
        'Create and assign tasks to team members',
        'View and edit customer data for the team',
        'Cannot manage users or system settings',
      ],
    },
    csm: {
      title: 'Customer Success Manager (CSM)',
      description: 'Handles day-to-day customer interactions and manages assigned customer accounts.',
      capabilities: [
        'View assigned customer data',
        'Create and manage tasks for assigned customers',
        'Update customer information',
        'Track customer health metrics',
        'Cannot view other CSMs\' customers',
        'Limited reporting capabilities',
      ],
    },
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Role & Access Management</h1>
        <Button onClick={savePermissions}>Save Changes</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Role Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(roleDescriptions).map(([role, info]) => (
              <Card key={role} className="h-full">
                <CardHeader>
                  <CardTitle>{info.title}</CardTitle>
                  <CardDescription>{info.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold mb-2">Capabilities:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {info.capabilities.map((capability, idx) => (
                      <li key={idx}>{capability}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>
                Configure which roles have access to specific features and actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>
                  Toggle permissions for each role. Changes are not saved until you click "Save Changes".
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Permission</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    <TableHead className="text-center">Team Lead</TableHead>
                    <TableHead className="text-center">CSM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell className="font-medium">{permission.name}</TableCell>
                      <TableCell>{permission.description}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            id={`admin-${permission.id}`}
                            checked={permission.roles.admin}
                            onCheckedChange={() => togglePermission(permission.id, 'admin')}
                            disabled={permission.id === 'manage_users'} 
                            // Admin must always have user management
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            id={`team_lead-${permission.id}`}
                            checked={permission.roles.team_lead}
                            onCheckedChange={() => togglePermission(permission.id, 'team_lead')}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            id={`csm-${permission.id}`}
                            checked={permission.roles.csm}
                            onCheckedChange={() => togglePermission(permission.id, 'csm')}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RolePermissionsPage;