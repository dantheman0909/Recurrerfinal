import { useState, useEffect } from 'react';
import { Annotation } from '@shared/schema';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AnnotationItem } from './annotation-item';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb,
  Plus,
  X
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnnotationListProps {
  entityType: string;
  entityId: number;
  currentUserId: number;
}

type AnnotationType = 'comment' | 'highlight' | 'suggestion' | 'action_item';

export function AnnotationList({ 
  entityType, 
  entityId, 
  currentUserId 
}: AnnotationListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [annotationType, setAnnotationType] = useState<AnnotationType>('comment');
  const [currentTab, setCurrentTab] = useState<'all' | 'open' | 'resolved'>('all');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { subscribeToEntity, sendMessage } = useWebSocket();
  
  // Subscribe to WebSocket updates for this entity
  useEffect(() => {
    subscribeToEntity(entityType, entityId);
  }, [entityType, entityId, subscribeToEntity]);
  
  // Fetch annotations
  const { data: annotations = [], isLoading } = useQuery({
    queryKey: ['/api/annotations', entityType, entityId],
    queryFn: async () => {
      const response = await fetch(`/api/annotations/${entityType}/${entityId}`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch annotations");
      }
      return response.json();
    }
  });
  
  // Create annotation
  const { mutate: createAnnotation, isPending: isCreating } = useMutation({
    mutationFn: async (data: { content: string; type: string }) => {
      const response = await apiRequest('/api/annotations/' + entityType + '/' + entityId, {
        method: 'POST',
        data: {
          content: data.content,
          type: data.type,
          user_id: currentUserId,
          entity_type: entityType,
          entity_id: entityId
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/annotations', entityType, entityId] });
      setNewContent('');
      setIsAdding(false);
      
      // Notify other clients via WebSocket
      sendMessage({
        type: 'annotation_created',
        entity_type: entityType,
        entity_id: entityId,
        data
      });
      
      toast({
        title: 'Annotation created',
        description: 'Your annotation has been added successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating annotation',
        description: 'There was a problem creating your annotation. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Update annotation
  const { mutate: updateAnnotation } = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const response = await apiRequest(`/api/annotations/${id}`, {
        method: 'PUT',
        data: { content }
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/annotations', entityType, entityId] });
      
      // Notify other clients via WebSocket
      sendMessage({
        type: 'annotation_updated',
        entity_type: entityType,
        entity_id: entityId,
        data
      });
      
      toast({
        title: 'Annotation updated',
        description: 'Your annotation has been updated successfully.'
      });
    },
    onError: () => {
      toast({
        title: 'Error updating annotation',
        description: 'There was a problem updating your annotation. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Delete annotation
  const { mutate: deleteAnnotation } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/annotations/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/annotations', entityType, entityId] });
      
      // Notify other clients via WebSocket
      sendMessage({
        type: 'annotation_deleted',
        entity_type: entityType,
        entity_id: entityId,
        data: { id: data.id }
      });
      
      toast({
        title: 'Annotation deleted',
        description: 'The annotation has been deleted successfully.'
      });
    },
    onError: () => {
      toast({
        title: 'Error deleting annotation',
        description: 'There was a problem deleting the annotation. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Resolve annotation
  const { mutate: resolveAnnotation } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/annotations/${id}`, {
        method: 'PUT',
        data: { is_resolved: true }
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/annotations', entityType, entityId] });
      
      // Notify other clients via WebSocket
      sendMessage({
        type: 'annotation_resolved',
        entity_type: entityType,
        entity_id: entityId,
        data
      });
      
      toast({
        title: 'Annotation resolved',
        description: 'The annotation has been marked as resolved.'
      });
    },
    onError: () => {
      toast({
        title: 'Error resolving annotation',
        description: 'There was a problem resolving the annotation. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Add reply to annotation
  const { mutate: addReply } = useMutation({
    mutationFn: async ({ parentId, content }: { parentId: number; content: string }) => {
      const response = await apiRequest(`/api/annotations/${parentId}/replies`, {
        method: 'POST',
        data: {
          content,
          user_id: currentUserId,
          type: 'comment' // Default to comment type for replies
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/annotations', entityType, entityId] });
      
      // Notify other clients via WebSocket
      sendMessage({
        type: 'annotation_reply_added',
        entity_type: entityType,
        entity_id: entityId,
        data
      });
      
      toast({
        title: 'Reply added',
        description: 'Your reply has been added to the annotation.'
      });
    },
    onError: () => {
      toast({
        title: 'Error adding reply',
        description: 'There was a problem adding your reply. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  const handleCreateAnnotation = () => {
    if (newContent.trim()) {
      createAnnotation({ content: newContent, type: annotationType });
    }
  };
  
  const handleAddReply = (parentId: number, content: string) => {
    addReply({ parentId, content });
  };
  
  const handleEditAnnotation = (id: number, content: string) => {
    updateAnnotation({ id, content });
  };
  
  const handleResolveAnnotation = (id: number) => {
    resolveAnnotation(id);
  };
  
  const handleDeleteAnnotation = (id: number) => {
    deleteAnnotation(id);
  };
  
  // Filter annotations based on current tab
  const filteredAnnotations = annotations.filter((annotation: Annotation & { 
    user: { id: number; name: string; avatar_url?: string; role: string };
    replies?: (Annotation & { user: { id: number; name: string; avatar_url?: string; role: string } })[];
  }) => {
    // Only include root annotations (not replies)
    if (annotation.parent_id !== null) return false;
    
    if (currentTab === 'open') {
      return !annotation.is_resolved;
    } else if (currentTab === 'resolved') {
      return annotation.is_resolved;
    }
    return true;
  });
  
  // Render type icon for the new annotation form
  const renderTypeIcon = () => {
    switch (annotationType) {
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'suggestion':
        return <Lightbulb className="h-4 w-4" />;
      case 'highlight':
        return <AlertTriangle className="h-4 w-4" />;
      case 'action_item':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex justify-between items-center">
          <span>Annotations</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1"
          >
            {isAdding ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add New
              </>
            )}
          </Button>
        </CardTitle>
        
        <Tabs 
          defaultValue="all" 
          className="w-full"
          onValueChange={(value) => setCurrentTab(value as 'all' | 'open' | 'resolved')}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        {isAdding && (
          <div className="mb-6 space-y-3 border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">New Annotation</h3>
              <Select
                value={annotationType}
                onValueChange={(value) => setAnnotationType(value as AnnotationType)}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment" className="text-xs">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" />
                      <span>Comment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="suggestion" className="text-xs">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-3 w-3" />
                      <span>Suggestion</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="highlight" className="text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Highlight</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="action_item" className="text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Action Item</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Textarea
              placeholder="Write your annotation here..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="resize-none"
            />
            
            <div className="flex justify-end">
              <Button 
                onClick={handleCreateAnnotation} 
                disabled={!newContent.trim() || isCreating}
                size="sm"
                className="flex items-center gap-1"
              >
                {renderTypeIcon()}
                {isCreating ? 'Adding...' : 'Add Annotation'}
              </Button>
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <p>Loading annotations...</p>
          </div>
        ) : filteredAnnotations.length > 0 ? (
          <div className="space-y-4">
            {filteredAnnotations.map((annotation: Annotation & {
              user: { id: number; name: string; avatar_url?: string; role: string };
              replies?: (Annotation & { user: { id: number; name: string; avatar_url?: string; role: string } })[];
            }) => (
              <AnnotationItem
                key={annotation.id}
                annotation={annotation}
                currentUserId={currentUserId}
                onReply={handleAddReply}
                onEdit={handleEditAnnotation}
                onResolve={handleResolveAnnotation}
                onDelete={handleDeleteAnnotation}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-gray-500">No annotations found.</p>
            <p className="text-gray-400 text-sm">
              {isAdding 
                ? 'Add your first annotation above.' 
                : 'Click "Add New" to create an annotation.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}