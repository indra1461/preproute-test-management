import { NavLink } from "react-router-dom";
import { LayoutDashboard, FilePenLine, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tests/new", label: "Test Creation", icon: FilePenLine },
  { to: "/test-tracking", label: "Test Tracking", icon: ClipboardCheck },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-line-200 bg-white px-4 py-6 md:block">
      <div className="mb-8 px-2 text-lg font-semibold text-brand-600">
        PrepRoute
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
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
  );
}
