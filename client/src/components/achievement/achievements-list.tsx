import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Award,
  CheckCircle2,
  Medal,
  Star,
  Target,
  Trophy,
  UserCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

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

export function AchievementsList({ userId }: { userId: number }) {
  const queryClient = useQueryClient();

  // Fetch achievements
  const { data: achievements = [], isLoading: isLoadingAchievements } = useQuery({
    queryKey: ['/api/achievements', userId],
    queryFn: async () => {
      const response = await fetch(`/api/achievements?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }
      return response.json();
    },
    enabled: !!userId,
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
    enabled: !!userId,
  });

  // Mark achievement as viewed
  const markAsViewedMutation = useMutation({
    mutationFn: async (achievementId: number) => {
      return apiRequest(`/api/achievements/${achievementId}/mark-viewed`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/achievements', userId] });
    },
  });

  // Get icon for achievement type
  const getAchievementIcon = (type: string, className = "h-5 w-5") => {
    switch (type) {
      case 'tasks_completed':
        return <CheckCircle2 className={className} />;
      case 'customer_health_improved':
        return <Target className={className} />;
      case 'feedback_collected':
        return <Star className={className} />;
      case 'playbooks_executed':
        return <Trophy className={className} />;
      case 'red_zone_resolved':
        return <Medal className={className} />;
      case 'login_streak':
        return <UserCheck className={className} />;
      default:
        return <Award className={className} />;
    }
  };

  const handleAchievementView = (achievement: Achievement) => {
    if (!achievement.is_viewed) {
      markAsViewedMutation.mutate(achievement.id);
    }
  };

  const isLoading = isLoadingAchievements || isLoadingStats;
  const hasUnviewed = achievements.some((a: Achievement) => !a.is_viewed);

  // Calculate XP progress to next level
  const calculateXpProgress = () => {
    if (!stats) return 0;
    
    const xpPerLevel = 1000;
    const currentLevelXp = stats.level * xpPerLevel;
    const previousLevelXp = (stats.level - 1) * xpPerLevel;
    const xpInCurrentLevel = stats.totalXp - previousLevelXp;
    
    return (xpInCurrentLevel / xpPerLevel) * 100;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Your Achievements</span>
          {hasUnviewed && (
            <Badge variant="destructive" className="text-xs">New</Badge>
          )}
        </CardTitle>
        <CardDescription>Track your progress and unlock rewards</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center p-6 text-muted-foreground">Loading achievements...</div>
        ) : !stats ? (
          <div className="text-center p-6 text-muted-foreground">No achievement data available</div>
        ) : (
          <>
            {/* Level and XP progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-semibold">Level {stats.level}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.totalXp} XP
                </div>
              </div>
              <Progress value={calculateXpProgress()} className="h-2" />
              <div className="text-xs text-muted-foreground text-right">
                {1000 - (stats.totalXp % 1000)} XP to Level {stats.level + 1}
              </div>
            </div>

            <Separator />

            {/* Achievement stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.totalAchievements}</div>
                <div className="text-xs text-muted-foreground">Total Achievements</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalXp}</div>
                <div className="text-xs text-muted-foreground">Total XP</div>
              </div>
            </div>

            <Separator />

            {/* Recent achievements */}
            <div>
              <h4 className="text-sm font-medium mb-2">Recent Achievements</h4>
              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {achievements.length === 0 ? (
                    <div className="text-center p-4 text-sm text-muted-foreground">
                      No achievements yet. Complete tasks to earn rewards!
                    </div>
                  ) : (
                    achievements.map((achievement: Achievement) => (
                      <Dialog key={achievement.id}>
                        <DialogTrigger asChild>
                          <div
                            className={`
                              p-3 rounded-lg border cursor-pointer
                              hover:bg-accent hover:text-accent-foreground
                              transition-colors relative flex items-center gap-3
                              ${!achievement.is_viewed ? 'border-primary' : ''}
                            `}
                            onClick={() => handleAchievementView(achievement)}
                          >
                            <div className="bg-primary/10 p-2 rounded-full text-primary">
                              {getAchievementIcon(achievement.achievement_type)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{achievement.achievement_title}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(achievement.earned_at), { addSuffix: true })}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-primary">
                              +{achievement.xp_earned} XP
                            </div>
                            {!achievement.is_viewed && (
                              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {getAchievementIcon(achievement.achievement_type)}
                              <span>{achievement.achievement_title}</span>
                            </DialogTitle>
                            <DialogDescription>
                              Earned {formatDistanceToNow(new Date(achievement.earned_at), { addSuffix: true })}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p>{achievement.achievement_description}</p>
                            <div className="flex justify-between items-center">
                              <Badge variant="outline" className="px-3 py-1">
                                +{achievement.xp_earned} XP
                              </Badge>
                              {achievement.level_unlocked && (
                                <Badge variant="secondary" className="px-3 py-1">
                                  Level {achievement.level_unlocked} Unlocked
                                </Badge>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" size="sm">
          View All Achievements
        </Button>
        <Button variant="outline" size="sm">
          Achievement Progress
        </Button>
      </CardFooter>
    </Card>
  );
}