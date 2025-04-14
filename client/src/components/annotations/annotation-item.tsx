import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Annotation } from '@shared/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  CheckCircle2, 
  Reply, 
  Trash2, 
  Edit, 
  AlertTriangle,
  Lightbulb,
  Check
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AnnotationItemProps {
  annotation: Annotation & { 
    user: { id: number; name: string; avatar_url?: string; role: string };
    replies?: (Annotation & { user: { id: number; name: string; avatar_url?: string; role: string } })[];
  };
  currentUserId: number;
  onReply: (parentId: number, content: string) => void;
  onEdit: (id: number, content: string) => void;
  onResolve: (id: number) => void;
  onDelete: (id: number) => void;
}

export function AnnotationItem({ 
  annotation, 
  currentUserId, 
  onReply, 
  onEdit, 
  onResolve, 
  onDelete 
}: AnnotationItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(annotation.content);
  
  const isOwner = annotation.user_id === currentUserId;
  const formattedDate = annotation.created_at 
    ? formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })
    : '';
  
  const handleReplySubmit = () => {
    if (replyContent.trim()) {
      onReply(annotation.id, replyContent);
      setReplyContent('');
      setIsReplying(false);
    }
  };
  
  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== annotation.content) {
      onEdit(annotation.id, editContent);
      setIsEditing(false);
    } else {
      setIsEditing(false);
      setEditContent(annotation.content);
    }
  };
  
  // Render icon based on annotation type
  const renderTypeIcon = () => {
    switch (annotation.type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 mr-1" />;
      case 'suggestion':
        return <Lightbulb className="h-4 w-4 mr-1" />;
      case 'highlight':
        return <AlertTriangle className="h-4 w-4 mr-1" />;
      case 'action_item':
        return <CheckCircle2 className="h-4 w-4 mr-1" />;
      default:
        return <MessageSquare className="h-4 w-4 mr-1" />;
    }
  };
  
  return (
    <div className={cn(
      "p-4 mb-4 rounded-lg border",
      annotation.is_resolved ? "bg-green-50 border-green-200" : "bg-white border-gray-200",
      !annotation.parent_id ? "shadow-sm" : "ml-8 mt-2 mb-2"
    )}>
      <div className="flex items-start gap-4">
        <Avatar className="h-8 w-8">
          <AvatarImage src={annotation.user.avatar_url} alt={annotation.user.name} />
          <AvatarFallback>{annotation.user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{annotation.user.name}</h4>
            <span className="text-xs text-gray-500">{formattedDate}</span>
            
            <Badge variant="outline" className="ml-auto flex items-center text-xs">
              {renderTypeIcon()}
              {annotation.type.replace('_', ' ')}
            </Badge>
            
            {annotation.is_resolved && (
              <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Resolved
              </Badge>
            )}
          </div>
          
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full"
              />
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(annotation.content);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleEditSubmit}>Save</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{annotation.content}</p>
          )}
          
          <div className="flex gap-2 mt-2">
            {!annotation.is_resolved && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs"
                  onClick={() => setIsReplying(!isReplying)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
                
                {isOwner && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                  onClick={() => onResolve(annotation.id)}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Resolve
                </Button>
              </>
            )}
            
            {isOwner && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                onClick={() => onDelete(annotation.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
          
          {isReplying && (
            <div className="mt-2 space-y-2">
              <Textarea 
                value={replyContent} 
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                className="w-full"
              />
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleReplySubmit}>Reply</Button>
              </div>
            </div>
          )}
          
          {/* Render replies */}
          {annotation.replies && annotation.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {annotation.replies.map((reply) => (
                <div key={reply.id} className="flex items-start gap-3 border-l-2 border-gray-200 pl-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={reply.user.avatar_url} alt={reply.user.name} />
                    <AvatarFallback>{reply.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-xs">{reply.user.name}</h5>
                      <span className="text-xs text-gray-500">
                        {reply.created_at 
                          ? formatDistanceToNow(new Date(reply.created_at), { addSuffix: true }) 
                          : ''}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-700 mt-1">{reply.content}</p>
                    
                    {reply.user_id === currentUserId && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs text-red-600 hover:text-red-700 mt-1"
                        onClick={() => onDelete(reply.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}