import React, { useState } from "react";
import { getCVE } from "../api";

function CvePage() {
  const [cveId, setCveId] = useState("");
  const [cveData, setCveData] = useState(null);
  const [loadingCve, setLoadingCve] = useState(false);
  const [error, setError] = useState("");

  // Helpers pour le style des scores
  const getSeverityLabel = (score) => {
    const val = parseFloat(score);
    if (isNaN(val)) return "N/A";
    if (val >= 9) return "CRITIQUE";
    if (val >= 7) return "ÉLEVÉ";
    if (val >= 4) return "MOYEN";
    return "FAIBLE";
  };

  const getSeverityColor = (score) => {
    const val = parseFloat(score || 0);
    if (val >= 9) return "text-red-500";
    if (val >= 7) return "text-orange-400";
    if (val >= 4) return "text-yellow-400";
    return "text-emerald-400";
  };

  const handleSearchCVE = async (e) => {
    if (e) e.preventDefault();
    if (!cveId.trim()) return;

    try {
      setLoadingCve(true);
      setError("");
      
      // On récupère les données (le backend s'occupe de la traduction)
      const data = await getCVE(cveId.trim().toUpperCase());
      setCveData(data);
    } catch (err) {
      setError("Impossible de trouver cette CVE. Vérifiez l'ID.");
      setCveData(null);
    } finally {
      setLoadingCve(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen text-slate-200">
      {/* Barre de recherche */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl mb-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span className="text-blue-500">🛡️</span> CVE Explorer
        </h1>
        <form onSubmit={handleSearchCVE} className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Ex: CVE-2024-1234"
            value={cveId}
            onChange={(e) => setCveId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 w-full outline-none focus:ring-2 focus:ring-blue-600 transition-all"
          />
          <button 
            type="submit" 
            disabled={loadingCve}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-8 py-2 rounded-lg font-bold transition-colors"
          >
            {loadingCve ? "Chargement..." : "Rechercher"}
          </button>
        </form>
        {error && <p className="text-red-400 mt-3 text-sm font-medium">{error}</p>}
      </div>

      {/* Affichage des données */}
      {cveData && !loadingCve && (
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-8 animate-in fade-in duration-500">
          <div>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight border-b border-slate-800 pb-4">
              {cveData.cve_id || cveData.id}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Description Originale (EN) */}
              <div className="bg-slate-800/20 p-5 rounded-xl border border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Description Originale (EN)</p>
                <p className="text-slate-400 leading-relaxed italic">
                  {cveData.summary || cveData.description || "No description available."}
                </p>
              </div>

              {/* Traduction (FR) - Envoyée par le backend */}
              <div className="bg-blue-900/10 p-5 rounded-xl border border-blue-900/20">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">Traduction (FR)</p>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {cveData.summary_fr || "Traduction non disponible pour cette vulnérabilité."}
                </p>
              </div>
            </div>
          </div>

          {/* Widgets de Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
              <span className="block text-slate-500 text-xs font-bold uppercase mb-2">Score CVSS</span>
              <span className={`text-3xl font-black ${getSeverityColor(cveData.cvss)}`}>
                {cveData.cvss ?? "N/A"}
              </span>
            </div>
            
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
              <span className="block text-slate-500 text-xs font-bold uppercase mb-2">Sévérité</span>
              <span className={`text-xl font-bold uppercase ${getSeverityColor(cveData.cvss)}`}>
                {getSeverityLabel(cveData.cvss)}
              </span>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
              <span className="block text-slate-500 text-xs font-bold uppercase mb-2">Publication</span>
              <span className="text-lg font-semibold text-slate-200">
                {cveData.published || cveData.published_time || "N/A"}
              </span>
            </div>
          </div>

          {/* Section Références en bas de page */}
{cveData.references && cveData.references.length > 0 && (
  <div className="mt-8 pt-6 border-t border-slate-800">
    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
      Sources & Documentation
    </h3>
    <div className="grid grid-cols-1 gap-2">
      {cveData.references.slice(0, 6).map((ref, index) => (
        <a
          key={index}
          href={ref}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center justify-between bg-slate-800/40 hover:bg-slate-800 p-3 rounded-lg border border-slate-700/50 transition-all"
        >
          <span className="text-blue-400 text-sm truncate mr-4 group-hover:text-blue-300">
            {ref}
          </span>
          <span className="text-slate-600 group-hover:text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </span>
        </a>
      ))}
    </div>
  </div>
)}
        </div>
      )}
    </div>
  );
}

export default CvePage;