import { Bell } from "lucide-react";
import { useAppSelector } from "@/app/hooks";

export default function Topbar() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <header className="flex items-center justify-end gap-4 border-b border-line-200 bg-white px-6 py-4">
      <button
        type="button"
        className="rounded-full p-2 text-ink-500 hover:bg-line-100"
        aria-label="Notifications"
      >
        <Bell size={18} />
      </button>
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-brand-100" />
        <div className="text-sm leading-tight">
          <p className="font-medium text-ink-900">
            {(user?.name as string) ?? (user?.userId as string) ?? "Admin"}
          </p>
          <p className="text-xs text-ink-300">Admin</p>
        </div>
      </div>
    </header>
  );
}
