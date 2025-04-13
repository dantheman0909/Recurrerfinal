import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  UserCircle, 
  Mail, 
  Calendar, 
  MapPin, 
  Building, 
  Phone, 
  Award, 
  Trophy,
  Star,
  Clock,
  Zap,
  User as UserIcon
} from 'lucide-react';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  department: string;
  phone?: string;
  location?: string;
  title?: string;
  joined_date?: string;
}

interface Achievement {
  id: number;
  user_id: number;
  achievement_type: string;
  achievement_title: string;
  achievement_description: string;
  badge_icon: string;
  xp_earned: number;
  level_unlocked: number | null;
  earned_at: string;
  is_viewed: boolean;
}

interface AchievementStats {
  totalXp: number;
  totalAchievements: number;
  level: number;
  achievementsByType: Record<string, number>;
  recentAchievements: Achievement[];
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // For demo purposes - would normally come from authentication context
  const userId = 1;
  
  // Fetch the current user's profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return response.json() as Promise<UserProfile>;
    },
  });
  
  // Fetch achievement stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/achievements/stats', userId],
    queryFn: async () => {
      const response = await fetch(`/api/achievements/stats?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch achievement stats');
      }
      return response.json() as Promise<AchievementStats>;
    },
  });
  
  // Fetch recent achievements
  const { data: achievements, isLoading: isLoadingAchievements } = useQuery({
    queryKey: ['/api/achievements', userId],
    queryFn: async () => {
      const response = await fetch(`/api/achievements?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }
      return response.json() as Promise<Achievement[]>;
    },
  });
  
  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'tasks_completed':
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 'customer_health_improved':
        return <Zap className="h-5 w-5 text-green-500" />;
      case 'feedback_collected':
        return <Star className="h-5 w-5 text-indigo-500" />;
      case 'playbooks_executed':
        return <Award className="h-5 w-5 text-blue-500" />;
      case 'red_zone_resolved':
        return <Clock className="h-5 w-5 text-pink-500" />;
      case 'login_streak':
        return <UserIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <Award className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };
  
  return (
    <div className="container px-4 py-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Profile sidebar */}
        <div className="md:w-1/3 lg:w-1/4">
          <Card className="mb-6">
            <CardContent className="pt-6">
              {isLoadingProfile ? (
                <div className="flex flex-col items-center">
                  <Skeleton className="h-24 w-24 rounded-full mb-4" />
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-4" />
                </div>
              ) : profile ? (
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={profile.avatar_url || ''} alt={profile.name} />
                    <AvatarFallback className="text-lg">{profile.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold mb-1">{profile.name}</h2>
                  <p className="text-muted-foreground mb-2">{profile.title || 'Customer Success Manager'}</p>
                  <Badge variant="outline" className="mb-4">
                    {profile.role || 'CSM'}
                  </Badge>
                  
                  <div className="w-full space-y-3 mt-4">
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{profile.email}</span>
                    </div>
                    {profile.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                    {profile.department && (
                      <div className="flex items-center text-sm">
                        <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{profile.department}</span>
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    {profile.joined_date && (
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Joined {formatDate(profile.joined_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  User profile not found
                </div>
              )}
            </CardContent>
          </Card>
          
          {!isLoadingStats && stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Achievement Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">CSM Level {stats.level}</span>
                      <span className="text-sm font-medium">{stats.totalXp} XP</span>
                    </div>
                    <Progress value={(stats.totalXp % 1000) / 10} className="h-2" />
                    <div className="flex justify-end mt-1">
                      <span className="text-xs text-muted-foreground">
                        {1000 - (stats.totalXp % 1000)} XP to next level
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Total Achievements</span>
                      <span className="text-sm font-medium">{stats.totalAchievements}</span>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/achievements">View All Achievements</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Main content */}
        <div className="flex-1">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview" className="px-4">
                <UserCircle className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="achievements" className="px-4">
                <Award className="h-4 w-4 mr-2" />
                Achievements
              </TabsTrigger>
              <TabsTrigger value="settings" className="px-4">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                  <CardDescription>
                    Summary of your activities and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingProfile ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p>
                        Welcome back, {profile?.name}! Here's a summary of your recent activities and performance metrics.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Recent Achievements</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {isLoadingAchievements ? (
                              <div className="space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-4/6" />
                              </div>
                            ) : achievements && achievements.length > 0 ? (
                              <div className="space-y-3">
                                {achievements.slice(0, 3).map((achievement) => (
                                  <div key={achievement.id} className="flex items-center space-x-2">
                                    <div className="flex-shrink-0">
                                      {getAchievementIcon(achievement.achievement_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {achievement.achievement_title}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {formatDate(achievement.earned_at)}
                                      </p>
                                    </div>
                                    <div className="text-xs text-amber-600 font-medium">
                                      +{achievement.xp_earned} XP
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No recent achievements found.
                              </p>
                            )}
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Activity Summary</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Completed Tasks</span>
                                <span className="text-sm font-medium">24</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Customers Managed</span>
                                <span className="text-sm font-medium">12</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Red Zone Resolved</span>
                                <span className="text-sm font-medium">7</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="achievements" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Achievements</CardTitle>
                  <CardDescription>
                    Your earned achievements and badges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAchievements ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-start space-x-4 py-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-4 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !achievements?.length ? (
                    <div className="text-center text-muted-foreground py-12">
                      <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>You haven't earned any achievements yet.</p>
                      <p className="text-sm mt-1">Complete tasks and help customers to earn achievements.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {achievements.map(achievement => (
                        <Card key={achievement.id} className="flex overflow-hidden">
                          <div className="flex-shrink-0 flex items-center justify-center w-16 bg-gradient-to-br from-gray-50 to-gray-100 border-r">
                            <div className="p-2 rounded-full bg-white shadow-sm">
                              {getAchievementIcon(achievement.achievement_type)}
                            </div>
                          </div>
                          <div className="flex-1 p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">{achievement.achievement_title}</h4>
                              <span className="text-xs text-amber-600 font-medium">+{achievement.xp_earned} XP</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{achievement.achievement_description}</p>
                            <div className="mt-2 text-xs text-muted-foreground">
                              {formatDate(achievement.earned_at)}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  {achievements && achievements.length > 0 && (
                    <div className="mt-6 text-center">
                      <Button variant="outline" asChild>
                        <a href="/achievements">View All Achievements</a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>
                    Manage your profile information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    This feature is coming soon. You'll be able to update your profile information, notification preferences, and account settings.
                  </p>
                  
                  <div className="flex justify-center">
                    <Button variant="outline" disabled>Edit Profile</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}