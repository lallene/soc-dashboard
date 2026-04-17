import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getAnalysis, getHistory } from "../api";
import { io } from "socket.io-client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell, LineChart, Line, Legend
} from "recharts";

// Sécurité : si REACT_APP_API_URL est absent, on utilise localhost:5000
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const StatCard = ({ title, value, colorClass, suffix = "" }) => (
  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
    <p className="text-slate-400 text-sm mb-1 uppercase font-semibold">{title}</p>
    <p className={`text-4xl font-bold ${colorClass}`}>{value}{suffix}</p>
  </div>
);

function Dashboard() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [file, setFile] = useState(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [message, setMessage] = useState("");
  const [currentSource, setCurrentSource] = useState("default");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [liveAlert, setLiveAlert] = useState(false);

  // 1. Mémorisation des données graphiques
  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Erreurs", value: data.errors, color: "#ef4444" },
      { name: "Logins", value: data.logins, color: "#3b82f6" },
      { name: "CPU %", value: data.cpu, color: "#eab308" },
    ];
  }, [data]);

  const historyChartData = useMemo(() => {
    return [...history].reverse().map((row) => ({
      time: row.timestamp ? row.timestamp.split(" ")[1] : "",
      cpu: row.cpu,
      errors: row.errors,
      logins: row.logins,
    }));
  }, [history]);

  // 2. Définition des fonctions d'action (AVANT le return)
  const fetchAll = useCallback(async () => {
    try {
      const [analysis, hist] = await Promise.all([
        getAnalysis(),
        getHistory(dateFrom, dateTo)
      ]);
      setData(analysis);
      setHistory(hist);
    } catch (err) {
      setMessage("Erreur de synchronisation des données.");
    }
  }, [dateFrom, dateTo]);

  const handleUpload = async () => {
    if (!file) return setMessage("Sélectionnez un fichier d'abord.");
    const formData = new FormData();
    formData.append("file", file);

    setLoadingUpload(true);
    try {
      const res = await fetch(`${API_URL}/upload`, { 
        method: "POST", 
        body: formData 
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur serveur");
      
      setData(result);
      setCurrentSource("uploaded");
      setMessage(`Analysé : ${result.filename}`);
      // Refresh l'historique pour inclure le nouvel upload
      getHistory("", "").then(setHistory);
    } catch (err) {
      setMessage(`Erreur : ${err.message}`);
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleBackToDefault = async () => {
    try {
      setCurrentSource("default");
      setFile(null);
      setMessage("Retour au flux de production logs.txt");
      const result = await getAnalysis();
      setData(result);
      const hist = await getHistory("", "");
      setHistory(hist);
      setDateFrom("");
      setDateTo("");
    } catch (err) {
      setMessage("Erreur lors du retour aux logs par défaut.");
    }
  };

  // 3. Gestion du temps réel
  useEffect(() => {
    fetchAll();

    const onUpdate = (newData) => {
      setData(newData);
      if (newData.anomaly) {
        setLiveAlert(true);
        setTimeout(() => setLiveAlert(false), 5000);
      }
      getHistory(dateFrom, dateTo).then(setHistory);
    };

    socket.on("analysis_update", onUpdate);
    return () => socket.off("analysis_update", onUpdate);
  }, [fetchAll, dateFrom, dateTo]);

  if (!data) return (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
        <p className="animate-pulse font-mono tracking-widest text-sm">INITIALIZING SOC SYSTEMS...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">SOC Monitoring</h1>
          <p className="text-slate-500 font-mono text-xs italic">Source active: {data.source || "Production Stream"}</p>
        </div>
        <div className={`px-6 py-2 rounded-full border-2 font-bold transition-all ${data.anomaly ? 'border-red-500 bg-red-500/10 text-red-500 animate-pulse' : 'border-emerald-500 bg-emerald-500/10 text-emerald-500'}`}>
           {data.anomaly ? "🚨 ALERTE ANOMALIE" : "✅ SYSTÈME SAIN"}
        </div>
      </header>

      {/* IMPORT SECTION */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-3 text-slate-300">Importer un nouveau journal (.log)</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="file"
                accept=".log,.txt"
                onChange={(e) => setFile(e.target.files[0])}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 transition-all cursor-pointer"
              />
              <button
                onClick={handleUpload}
                disabled={loadingUpload}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 px-6 py-2 rounded-lg font-bold transition-all min-w-[180px]"
              >
                {loadingUpload ? "Traitement..." : "Analyser le fichier"}
              </button>
            </div>
          </div>
          <div className="md:border-l border-slate-800 md:pl-6 flex flex-col items-end gap-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contrôle</p>
            <button
              onClick={handleBackToDefault}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-4 py-2 rounded-lg border border-slate-700 transition-all"
            >
              Reset Live Stream
            </button>
          </div>
        </div>
        {message && <p className="text-xs text-blue-400 italic font-medium"># {message}</p>}
      </div>

      {/* GRILLE STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Alertes" value={data.critical_alerts} colorClass="text-red-500" />
        <StatCard title="Sécurité" value={data.security_events} colorClass="text-blue-500" />
        <StatCard title="CPU Usage" value={data.cpu} colorClass="text-yellow-500" suffix="%" />
        <StatCard title="Sévérité" value={data.severity} colorClass={data.severity === 'critical' ? 'text-red-500' : 'text-emerald-500'} />
      </div>

      {/* GRAPHES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 h-[400px]">
          <h3 className="mb-6 font-bold text-slate-400 text-sm tracking-widest uppercase italic">Métriques Actuelles</h3>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px'}} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 h-[400px]">
          <h3 className="mb-6 font-bold text-slate-400 text-sm tracking-widest uppercase italic">Historique de Charge</h3>
          <ResponsiveContainer>
            <LineChart data={historyChartData}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px'}} />
              <Legend />
              <Line type="monotone" dataKey="cpu" stroke="#eab308" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LOGS TABLE & INCIDENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h3 className="mb-4 font-bold text-slate-300">Journal des flux récents</h3>
          <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
             <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-900 text-slate-500">
                  <tr>
                    <th className="pb-4">Timestamp</th>
                    <th className="pb-4">Erreurs</th>
                    <th className="pb-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {history.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 font-mono text-slate-400">{h.timestamp}</td>
                      <td className="py-3 font-bold">{h.errors}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-sm text-[10px] font-black ${h.anomaly ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                          {h.anomaly ? "ANOMALIE" : "OK"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h3 className="mb-4 font-bold text-red-500 text-xs tracking-widest uppercase">Incidents Détectés</h3>
          <div className="space-y-3">
            {data.recent_incidents?.length > 0 ? (
              data.recent_incidents.map((inc, i) => (
                <div key={i} className="p-3 bg-red-500/5 border-l-2 border-red-500 text-[10px] text-slate-400 rounded-r-lg font-mono leading-relaxed">
                  {inc}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-600 italic">Aucun incident à signaler.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;