import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarWithInitialsProps {
  name: string;
  imageUrl?: string | null;
  className?: string;
}

export function AvatarWithInitials({ name, imageUrl, className }: AvatarWithInitialsProps) {
  // Get initials from name (first letter of first name and first letter of last name)
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <Avatar className={className}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      <AvatarFallback 
        className="bg-gradient-to-br from-teal-400 to-teal-600 text-white font-medium"
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
