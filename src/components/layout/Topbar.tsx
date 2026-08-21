import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { logout } from "@/features/auth/authSlice";

export default function Topbar() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // MultiSelect me jo "dropdown ke bahar click ho to band ho jaye" wala
  // pattern use kiya tha, wahi yaha bhi
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout()); // Redux state + localStorage dono clear ho jayenge
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex items-center justify-end gap-4 border-b border-line-200 bg-white px-6 py-4">
      <button
        type="button"
        className="rounded-full p-2 text-ink-500 hover:bg-line-100"
        aria-label="Notifications"
      >
        <Bell size={18} />
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-line-100"
        >
          <div className="h-8 w-8 rounded-full bg-brand-100" />
          <div className="text-left text-sm leading-tight">
            <p className="font-medium text-ink-900">
              {(user?.name as string) ?? (user?.userId as string) ?? "Admin"}
            </p>
            <p className="text-xs text-ink-300">Admin</p>
          </div>
          <ChevronDown size={16} className="text-ink-500" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-40 rounded-lg border border-line-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-500 hover:bg-danger-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
