import React from 'react';
import { SettingsLayout } from '@/components/settings/settings-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from 'lucide-react';
import { Link } from 'wouter';

export default function SettingsPage() {
  return (
    <SettingsLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">General Settings</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Google Integration</CardTitle>
              <CardDescription>
                Connect to Google services for Gmail and Calendar integration
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Enable email and calendar features with your Google account
              </div>
              <Link href="/settings/google-oauth">
                <Button variant="outline" size="sm" className="gap-1">
                  Configure
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Gmail</CardTitle>
              <CardDescription>
                Manage Gmail integration features
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Configure Gmail settings and compose templates
              </div>
              <Link href="/settings/gmail">
                <Button variant="outline" size="sm" className="gap-1">
                  Configure
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>
                Manage Google Calendar integration
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Configure calendar settings and event templates
              </div>
              <Link href="/settings/calendar">
                <Button variant="outline" size="sm" className="gap-1">
                  Configure
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>
                Manage your profile settings
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Update your personal information and preferences
              </div>
              <Link href="/settings/profile">
                <Button variant="outline" size="sm" className="gap-1">
                  Edit Profile
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </SettingsLayout>
  );
}