const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  ADMIN: { label: "Admin", className: "bg-red-100 text-red-700" },
  MODERATOR: { label: "Moderator", className: "bg-orange-100 text-orange-700" },
  ORGANIZER: { label: "Organizer", className: "bg-blue-100 text-blue-700" },
  SELLER: { label: "Seller", className: "bg-green-100 text-green-700" },
  MEMBER: { label: "Anggota", className: "bg-muted text-muted-foreground" },
};

export function UserRoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role] ?? { label: role, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
