import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Database, Settings, BarChart } from 'lucide-react';
import { useNavigate } from 'wouter';

export default function AdminPage() {
  const [, navigate] = useNavigate();

  const adminSections = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and team assignments',
      icon: Users,
      action: () => navigate('/admin/users')
    },
    {
      title: 'Integrations',
      description: 'Configure external data sources and integrations',
      icon: Database,
      action: () => navigate('/admin/integrations')
    },
    {
      title: 'Chargebee Settings',
      description: 'Configure Chargebee billing integration settings',
      icon: Settings,
      action: () => navigate('/settings/chargebee')
    },
    {
      title: 'Analytics Settings',
      description: 'Configure analytics and reporting settings',
      icon: BarChart,
      action: () => navigate('/admin/analytics')
    }
  ];

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <p className="text-muted-foreground mb-8">
        Manage your company settings, users, and integrations from this central admin panel.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminSections.map((section, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center gap-4">
              <section.icon className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={section.action}
                className="w-full"
              >
                Manage {section.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}