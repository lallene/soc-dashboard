import React from "react";

function Sidebar({ activeSection, setActiveSection }) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "logs", label: "Analyse Logs", icon: "📄" },
    { id: "network", label: "Analyse Réseau", icon: "🌐" }, // <-- Nouvelle section PCAP
    { id: "vulnerabilities", label: "Vulnérabilités", icon: "🛡️" },
    { id: "cve", label: "CVE Explorer", icon: "🔍" },
    { id: "remediation", label: "Remédiation", icon: "🧯" },
    { id: "analytics", label: "Analytics", icon: "📈" },
    { id: "settings", label: "Paramètres", icon: "⚙️" },
  ];

  return (
    <aside className="w-72 min-h-screen bg-slate-900 border-r border-slate-800 px-5 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          SOC Analytics
        </h1>
        <p className="text-slate-400 text-sm mt-1 font-medium">
          Dashboard de supervision sécurité
        </p>
      </div>

      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-semibold transition-all duration-200 ${
              activeSection === item.id
                ? "bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)] scale-[1.02]"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Petit indicateur de statut en bas de Sidebar (optionnel) */}
      <div className="mt-auto pt-10">
        <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Serveur Actif</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono truncate">v1.2.0-stable</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;