import { 
  Award, 
  CheckCircle2,
  Medal,
  Star, 
  Target, 
  Trophy, 
  UserCheck
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AchievementBadgeProps {
  type: string;
  title: string;
  description: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

export function AchievementBadge({
  type,
  title,
  description,
  size = 'md',
  className,
  showTooltip = true
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-10 w-10 p-2',
    lg: 'h-14 w-14 p-3'
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const getAchievementIcon = (type: string, iconClass: string) => {
    switch (type) {
      case 'tasks_completed':
        return <CheckCircle2 className={iconClass} />;
      case 'customer_health_improved':
        return <Target className={iconClass} />;
      case 'feedback_collected':
        return <Star className={iconClass} />;
      case 'playbooks_executed':
        return <Trophy className={iconClass} />;
      case 'red_zone_resolved':
        return <Medal className={iconClass} />;
      case 'login_streak':
        return <UserCheck className={iconClass} />;
      default:
        return <Award className={iconClass} />;
    }
  };

  const badge = (
    <div 
      className={cn(
        'rounded-full bg-primary/10 text-primary flex items-center justify-center', 
        sizeClasses[size],
        className
      )}
    >
      {getAchievementIcon(type, iconSize[size])}
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}