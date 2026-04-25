import { avatarUrlFor } from "@/lib/avatar";

type Props = {
  user: { id: string; name: string; avatarUrl?: string | null };
  size?: number;
  className?: string;
  title?: string;
};

export function Avatar({ user, size = 32, className, title }: Props) {
  const url = avatarUrlFor(user);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={user.name}
      title={title ?? user.name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`rounded-full bg-subtle border border-border object-cover shrink-0 ${className ?? ""}`}
    />
  );
}
