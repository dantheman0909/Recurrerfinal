import React from "react";
import { cn } from "@/lib/utils";

interface GradientCardProps {
  className?: string;
  children: React.ReactNode;
}

export function GradientCard({ className, children }: GradientCardProps) {
  return (
    <div 
      className={cn(
        "bg-gradient-to-br from-[#1E99A0] via-[#0D9298] to-[#16797E] rounded-md text-white p-3 shadow-md", 
        className
      )}
    >
      {children}
    </div>
  );
}
