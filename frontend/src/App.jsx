import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import PlaceholderPage from "./components/PlaceholderPage";
import DashboardPage from "./pages/DashboardPage";
import CvePage from "./pages/CvePage";
import NetworkPage from "./pages/NetworkPage"; // <-- Import de la nouvelle page

function App() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardPage />;
      case "network": // <-- Route pour l'analyse PCAP
        return <NetworkPage />;
      case "logs":
        return (
          <PlaceholderPage
            title="Analyse des Logs"
            description="Cette section accueillera l’analyse détaillée des fichiers de logs, avec recherche, filtres et incidents détaillés."
          />
        );
      case "vulnerabilities":
        return (
          <PlaceholderPage
            title="Vulnérabilités"
            description="Cette section servira à importer et analyser les fichiers de vulnérabilités."
          />
        );
      case "cve":
        return <CvePage />;
      case "remediation":
        return (
          <PlaceholderPage
            title="Remédiation"
            description="Cette section affichera les recommandations de correction et de mitigation."
          />
        );
      case "analytics":
        return (
          <PlaceholderPage
            title="Analytics"
            description="Cette section regroupera les statistiques avancées, tendances et indicateurs SOC."
          />
        );
      case "settings":
        return (
          <PlaceholderPage
            title="Paramètres"
            description="Cette section contiendra la configuration du dashboard et des connexions API."
          />
        );
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />
      <main className="flex-1 overflow-y-auto">{renderContent()}</main>
    </div>
  );
}

export default App;