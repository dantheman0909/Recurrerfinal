import React from "react";
import { HelpCircle } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface HelpTooltipProps {
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  iconClassName?: string;
}

const HelpTooltip = ({
  content,
  side = "top",
  align = "center",
  className = "",
  iconClassName = ""
}: HelpTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button 
            className={`inline-flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${className}`}
            type="button"
            onClick={(e) => e.preventDefault()}
          >
            <HelpCircle className={`h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors ${iconClassName}`} />
            <span className="sr-only">Help</span>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align}
          className="max-w-[250px] font-manrope bg-white p-3 text-sm leading-snug text-gray-700 shadow-md rounded-md border border-gray-100"
          sideOffset={4}
        >
          {typeof content === 'string' ? (
            <div className="font-medium">{content}</div>
          ) : (
            content
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { HelpTooltip };