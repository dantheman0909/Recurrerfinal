import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AchievementBadge } from './achievement-badge';

interface ProfileProgressProps {
  userId: number;
}

interface AchievementStats {
  totalXp: number;
  totalAchievements: number;
  level: number;
  achievementsByType: Record<string, number>;
  recentAchievements: {
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
  }[];
}

export function ProfileProgress({ userId }: ProfileProgressProps) {
  // Fetch achievement stats
  const { data: stats, isLoading } = useQuery({
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
    <div className="bg-card rounded-lg p-4 shadow-sm border">
      <div className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full" />
            <div className="flex flex-wrap gap-2 mt-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-6 rounded-full" />
              ))}
            </div>
          </>
        ) : !stats ? (
          <div className="text-center text-sm text-muted-foreground">
            No achievement data available
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div className="font-medium text-sm">CSM Level {stats.level}</div>
              <div className="text-xs text-muted-foreground">{stats.totalXp} XP</div>
            </div>
            
            <Progress value={calculateXpProgress()} className="h-1.5" />
            
            <div className="text-xs text-muted-foreground text-right">
              {1000 - (stats.totalXp % 1000)} XP to next level
            </div>
            
            {stats.recentAchievements.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-2">Recent Achievements</div>
                <div className="flex flex-wrap gap-2">
                  {stats.recentAchievements.slice(0, 5).map((achievement) => (
                    <AchievementBadge
                      key={achievement.id}
                      type={achievement.achievement_type}
                      title={achievement.achievement_title}
                      description={achievement.achievement_description}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}