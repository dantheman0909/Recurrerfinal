import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface RefreshButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  onRefresh: () => Promise<any>;
  successMessage?: string;
  errorMessage?: string;
  children?: React.ReactNode;
}

export function RefreshButton({
  className,
  variant = "outline",
  size = "default",
  onRefresh,
  successMessage = "Data refreshed successfully",
  errorMessage = "Failed to refresh data",
  children,
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast({
        title: "Success",
        description: successMessage,
        variant: "default",
      });
    } catch (error) {
      console.error("Refresh error:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleRefresh}
      disabled={isRefreshing}
    >
      <RefreshCw 
        className={cn(
          "h-4 w-4 mr-2", 
          isRefreshing && "animate-spin"
        )} 
      />
      {children}
    </Button>
  );
}