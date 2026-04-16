import React from "react";
import { NavLink } from "react-router-dom";

const menuItems = [
  { name: "Dashboard", path: "/" },
  { name: "Analyse Logs", path: "/logs" },
  { name: "Vulnérabilités", path: "/vulnerabilities" },
  { name: "CVE Explorer", path: "/cve" },
  { name: "Remédiation", path: "/remediation" },
  { name: "Analytics", path: "/analytics" },
  { name: "Paramètres", path: "/settings" },
];

function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 text-slate-100 p-5">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">SOC Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Security Analytics</p>
      </div>

      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `px-4 py-3 rounded-xl font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;