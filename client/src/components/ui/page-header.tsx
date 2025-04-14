import { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export function PageHeader({
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <section
      className={cn("grid gap-1", className)}
      {...props}
    >
      {children}
    </section>
  )
}

interface PageHeaderHeadingProps extends HTMLAttributes<HTMLHeadingElement> {}

export function PageHeaderHeading({
  className,
  ...props
}: PageHeaderHeadingProps) {
  return (
    <h1
      className={cn(
        "text-2xl font-bold tracking-tight md:text-3xl",
        className
      )}
      {...props}
    />
  )
}

interface PageHeaderDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export function PageHeaderDescription({
  className,
  ...props
}: PageHeaderDescriptionProps) {
  return (
    <p
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}