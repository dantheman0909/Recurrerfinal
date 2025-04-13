import { Button } from "@/components/ui/button";
import { CheckCircle, MoreVertical } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import type { UpcomingTask } from "@shared/types";

interface TaskItemProps {
  task: UpcomingTask;
  onComplete?: (id: string) => void;
}

export function TaskItem({ task, onComplete }: TaskItemProps) {
  const handleComplete = () => {
    if (onComplete) {
      onComplete(task.id);
    }
  };

  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {task.title}
            </p>
            <p className="text-xs text-gray-500">
              Due {task.dueDate} • <Link href={`/customers/${task.customer.id}`} className="hover:underline">{task.customer.name}</Link>
            </p>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleComplete}
            className="text-gray-500 hover:text-gray-700 mr-2"
          >
            <CheckCircle className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer">
                Edit task
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                Reassign task
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                View details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
