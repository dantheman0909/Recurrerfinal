import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Permission {
  id: string;
  name: string;
  description: string;
  admin_access: boolean;
  team_lead_access: boolean;
  csm_access: boolean;
}

const RolesManagementPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedPermissions, setEditedPermissions] = useState<Permission[]>([]);

  // Fetch all permissions
  const { data: permissions, isLoading, isError, error } = useQuery({
    queryKey: ['/api/roles/permissions'],
    queryFn: async () => {
      const response = await fetch('/api/roles/permissions');
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }
      return response.json();
    },
  });

  // Update permissions mutation
  const updateMutation = useMutation({
    mutationFn: async (permissions: Permission[]) => {
      const response = await fetch('/api/roles/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update permissions');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Permissions updated',
        description: 'Role permissions have been updated successfully.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/roles/permissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/roles/user-permissions'] });
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });

  // Set initial edited permissions when data is loaded
  React.useEffect(() => {
    if (permissions) {
      setEditedPermissions(permissions);
    }
  }, [permissions]);

  // Toggle permission for a specific role
  const togglePermission = (permissionId: string, role: 'admin_access' | 'team_lead_access' | 'csm_access') => {
    setEditedPermissions(prevPermissions => {
      return prevPermissions.map(permission => {
        if (permission.id === permissionId) {
          return { ...permission, [role]: !permission[role] };
        }
        return permission;
      });
    });
  };

  // Save all permission changes
  const savePermissions = () => {
    updateMutation.mutate(editedPermissions);
  };

  // Reset to original permissions
  const resetPermissions = () => {
    if (permissions) {
      setEditedPermissions(permissions);
    }
  };

  // Check if any changes have been made
  const hasChanges = () => {
    if (!permissions) return false;
    
    return JSON.stringify(permissions) !== JSON.stringify(editedPermissions);
  };

  // Track if a permission is changed
  const isPermissionChanged = (permissionId: string) => {
    if (!permissions) return false;
    
    const original = permissions.find(p => p.id === permissionId);
    const edited = editedPermissions.find(p => p.id === permissionId);
    
    if (!original || !edited) return false;
    
    return (
      original.admin_access !== edited.admin_access ||
      original.team_lead_access !== edited.team_lead_access ||
      original.csm_access !== edited.csm_access
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load permissions.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Role Permissions</h1>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={resetPermissions}
            disabled={!hasChanges() || updateMutation.isPending}
          >
            Reset
          </Button>
          <Button
            onClick={savePermissions}
            disabled={!hasChanges() || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Spinner size="small" className="mr-2" /> 
                Saving...
              </>
            ) : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Role Permissions</AlertTitle>
        <AlertDescription>
          Use this page to configure which actions each role can perform. 
          Changes will take effect immediately for all users with the affected roles.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Permissions by Role</CardTitle>
            <CardDescription>
              Manage which permissions are available to each role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Permission</TableHead>
                  <TableHead className="w-1/6 text-center">Admin</TableHead>
                  <TableHead className="w-1/6 text-center">Team Lead</TableHead>
                  <TableHead className="w-1/6 text-center">CSM</TableHead>
                  <TableHead className="w-1/6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedPermissions.map((permission) => (
                  <TableRow key={permission.id} className={isPermissionChanged(permission.id) ? 'bg-muted/30' : ''}>
                    <TableCell className="font-medium">
                      <div className="font-medium">{permission.name}</div>
                      <div className="text-sm text-muted-foreground">{permission.description}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Switch
                          checked={permission.admin_access}
                          onCheckedChange={() => togglePermission(permission.id, 'admin_access')}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Switch
                          checked={permission.team_lead_access}
                          onCheckedChange={() => togglePermission(permission.id, 'team_lead_access')}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Switch
                          checked={permission.csm_access}
                          onCheckedChange={() => togglePermission(permission.id, 'csm_access')}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {isPermissionChanged(permission.id) ? (
                        <div className="flex items-center text-yellow-600">
                          <ShieldAlert className="h-4 w-4 mr-1" />
                          <span className="text-xs">Modified</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          <span className="text-xs">Saved</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RolesManagementPage;