import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Trophy, Award, Clock, User, Star, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart } from '@/components/ui/bar-chart';

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

export default function AchievementsPage() {
  const { toast } = useToast();
  const userId = 1; // For now, hardcode to user ID 1 (would normally come from auth context)
  
  // Fetch achievements
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
  
  // Mark achievement as viewed
  const markAsViewed = async (id: number) => {
    try {
      const response = await fetch(`/api/achievements/${id}/mark-viewed`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        toast({
          title: 'Achievement marked as viewed',
          description: 'Your achievement has been marked as viewed.',
        });
      }
    } catch (error) {
      console.error('Error marking achievement as viewed:', error);
    }
  };
  
  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'tasks_completed':
        return <Trophy className="h-8 w-8 text-yellow-500" />;
      case 'customer_health_improved':
        return <Zap className="h-8 w-8 text-green-500" />;
      case 'feedback_collected':
        return <Star className="h-8 w-8 text-indigo-500" />;
      case 'playbooks_executed':
        return <Award className="h-8 w-8 text-blue-500" />;
      case 'red_zone_resolved':
        return <Clock className="h-8 w-8 text-pink-500" />;
      case 'login_streak':
        return <User className="h-8 w-8 text-purple-500" />;
      default:
        return <Award className="h-8 w-8 text-muted-foreground" />;
    }
  };
  
  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'tasks_completed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'customer_health_improved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'feedback_collected':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'playbooks_executed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'red_zone_resolved':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'login_streak':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  const typeLabels: Record<string, string> = {
    tasks_completed: 'Tasks Completed',
    customer_health_improved: 'Health Improved',
    feedback_collected: 'Feedback Collected',
    playbooks_executed: 'Playbooks Executed',
    red_zone_resolved: 'Red Zone Resolved',
    login_streak: 'Login Streak',
  };
  
  const prepareChartData = () => {
    if (!stats?.achievementsByType) return { labels: [], data: [] };
    
    const labels = Object.keys(stats.achievementsByType).map(key => typeLabels[key] || key);
    const data = Object.values(stats.achievementsByType);
    
    const colors = [
      'rgba(255, 205, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(102, 126, 234, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 99, 132, 0.8)',
      'rgba(153, 102, 255, 0.8)',
    ];
    
    return {
      labels,
      datasets: [
        {
          label: 'Achievements by Type',
          data,
          backgroundColor: colors.slice(0, data.length),
          borderColor: colors.slice(0, data.length).map(color => color.replace('0.8', '1')),
          borderWidth: 1,
        },
      ],
    };
  };
  
  return (
    <div className="container px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Achievements</h1>
        <p className="text-muted-foreground mt-1">
          Track your progress and see what you've accomplished
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Level Progress */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>Your current level and XP</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-full" />
              </div>
            ) : !stats ? (
              <div className="text-center text-sm text-muted-foreground">
                No achievement data available
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <div className="font-medium text-lg">CSM Level {stats.level}</div>
                  <div className="text-sm text-muted-foreground">{stats.totalXp} XP</div>
                </div>
                
                <Progress value={(stats.totalXp % 1000) / 10} className="h-2 my-2" />
                
                <div className="text-sm text-muted-foreground text-right">
                  {1000 - (stats.totalXp % 1000)} XP to next level
                </div>
                
                <div className="mt-6 text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Total Achievements</span>
                    <span className="font-medium">{stats.totalAchievements}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total XP Earned</span>
                    <span className="font-medium">{stats.totalXp}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Achievement Distribution */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Achievement Distribution</CardTitle>
            <CardDescription>Breakdown of your achievements by type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-64 w-full" />
            ) : !stats?.achievementsByType ? (
              <div className="text-center text-sm text-muted-foreground py-12">
                No achievement data available
              </div>
            ) : (
              <div className="h-64">
                <BarChart data={prepareChartData()} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Achievement Timeline */}
      <Card className="mt-8 shadow-sm">
        <CardHeader>
          <CardTitle>Achievement Timeline</CardTitle>
          <CardDescription>Your achievements in chronological order</CardDescription>
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
            <div className="space-y-4">
              {achievements.map(achievement => (
                <div key={achievement.id} className="flex items-start space-x-4 py-4 border-b border-gray-100 last:border-0">
                  <div className="flex-shrink-0">
                    {getAchievementIcon(achievement.achievement_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        {achievement.achievement_title}
                        {!achievement.is_viewed && (
                          <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200">New</Badge>
                        )}
                      </h4>
                      <Badge className={getAchievementColor(achievement.achievement_type)}>
                        {typeLabels[achievement.achievement_type] || achievement.achievement_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{achievement.achievement_description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(achievement.earned_at)}
                      </span>
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                        +{achievement.xp_earned} XP
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}