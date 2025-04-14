import { WebSocketProvider } from '@/hooks/use-websocket';
import { AnnotationList } from './annotation-list';

interface StandaloneAnnotationListProps {
  entityType: string;
  entityId: number;
  currentUserId: number;
}

/**
 * A wrapper component that includes its own WebSocketProvider
 * This allows the component to be used anywhere in the application
 * without requiring the parent components to be wrapped in WebSocketProvider
 */
export function StandaloneAnnotationList({
  entityType,
  entityId,
  currentUserId
}: StandaloneAnnotationListProps) {
  return (
    <WebSocketProvider>
      <AnnotationList
        entityType={entityType}
        entityId={entityId}
        currentUserId={currentUserId}
      />
    </WebSocketProvider>
  );
}