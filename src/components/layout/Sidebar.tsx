import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, FilePenLine, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tests/new", label: "Test Creation", icon: FilePenLine },
  { to: "/test-tracking", label: "Test Tracking", icon: ClipboardCheck },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const asideRef = useRef<HTMLElement>(null);

  // Topbar ke profile dropdown wala hi "bahar click ho to band ho jaye" pattern,
  // sirf mobile drawer ke liye reuse kiya
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (asideRef.current && !asideRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  return (
    <>
      {/* Mobile-only dark backdrop, desktop pe kabhi render hi nahi hota */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
      />

      <aside
        ref={asideRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 shrink-0 border-r border-line-200 bg-white px-4 py-6 shadow-xl transition-transform duration-200 ease-in-out",
          "md:static md:z-auto md:shadow-none md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 px-2 text-lg font-semibold text-brand-600">
          PrepRoute
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 hover:bg-line-100",
                  isActive && "bg-brand-50 text-brand-600",
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
