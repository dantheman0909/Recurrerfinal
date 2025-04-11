import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Task } from "@shared/schema";
import { User, Calendar, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TaskListProps {
  tasks: Task[];
  users: { [key: number]: { name: string } };
}

export function TaskList({ tasks, users }: TaskListProps) {
  return (
    <Card>
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Tasks
          </h3>
          <div className="flex">
            <Button variant="outline" size="sm" className="bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200">
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </Button>
          </div>
        </div>
      </div>
      <ul className="divide-y divide-gray-200">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} assignee={users[task.assigned_to || 0]?.name || 'Unassigned'} />
        ))}
      </ul>
      <CardFooter className="bg-gray-50 px-4 py-3 text-center">
        <a href="/tasks" className="text-sm font-medium text-teal-600 hover:text-teal-500">
          View all tasks
        </a>
      </CardFooter>
    </Card>
  );
}

interface TaskItemProps {
  task: Task;
  assignee: string;
}

function TaskItem({ task, assignee }: TaskItemProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending':
        return "bg-yellow-100 text-yellow-800";
      case 'in_progress':
        return "bg-green-100 text-green-800";
      case 'completed':
        return "bg-blue-100 text-blue-800";
      case 'overdue':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date | null | string | undefined) => {
    if (!date) return 'No due date';
    return format(new Date(date), 'MMM d, yyyy');
  };

  return (
    <li>
      <a href={`/tasks/${task.id}`} className="block hover:bg-gray-50">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-teal-600 truncate">
              {task.title}
            </p>
            <div className="ml-2 flex-shrink-0 flex">
              <Badge className={cn("px-2 text-xs leading-5 font-semibold rounded-full", getStatusStyles(task.status))}>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          <div className="mt-2 sm:flex sm:justify-between">
            <div className="sm:flex">
              <p className="flex items-center text-sm text-gray-500">
                <User className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                Assigned to: {assignee}
              </p>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
              <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
              <p>
                Due <time dateTime={task.due_date?.toString() || ''}>{formatDate(task.due_date)}</time>
              </p>
            </div>
          </div>
        </div>
      </a>
    </li>
  );
}
