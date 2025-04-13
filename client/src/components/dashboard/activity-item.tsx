import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import { Link } from "wouter";
import type { ActivityItem as ActivityItemType } from "@shared/types";

interface ActivityItemProps {
  activity: ActivityItemType;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const getBadgeColor = () => {
    switch (activity.category) {
      case "Onboarding":
        return "bg-green-100 text-green-800";
      case "Meeting":
        return "bg-blue-100 text-blue-800";
      case "Red Zone":
        return "bg-red-100 text-red-800";
      case "Campaign":
        return "bg-purple-100 text-purple-800";
      case "Task":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <Avatar>
            <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
            <AvatarFallback>
              {activity.user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {activity.user.name} {activity.action}{" "}
            <Link href={`/${activity.target.type}s/${activity.target.id}`} className="font-semibold hover:underline">
              {activity.target.name}
            </Link>
          </p>
          <p className="text-sm text-gray-500">
            {timeAgo(activity.time)}
          </p>
        </div>
        <div>
          <Badge variant="outline" className={`${getBadgeColor()} border-0`}>
            {activity.category}
          </Badge>
        </div>
      </div>
    </div>
  );
}
