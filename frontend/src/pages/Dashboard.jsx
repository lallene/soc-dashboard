import React, { useEffect, useState, useCallback } from "react";
import { getAnalysis, getHistory } from "../api";
import { io } from "socket.io-client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const API_URL = process.env.REACT_APP_API_URL;
const socket = API_URL ? io(API_URL) : null;

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

  const fetchData = useCallback(async () => {
    if (currentSource !== "default") return;

    try {
      const result = await getAnalysis();
      setData(result);
    } catch (error) {
      console.error("Erreur API:", error);
      setMessage("Erreur lors du chargement des données.");
    }
  }, [currentSource]);

  const fetchHistory = useCallback(
    async (from = dateFrom, to = dateTo) => {
      try {
        const result = await getHistory(from, to);
        setHistory(result);
      } catch (error) {
        console.error("Erreur historique:", error);
      }
    },
    [dateFrom, dateTo]
  );

  const handleResetFilter = async () => {
    setDateFrom("");
    setDateTo("");
    await fetchHistory("", "");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Veuillez sélectionner un fichier .log");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoadingUpload(true);
      setMessage("");

      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage(result.error || "Erreur lors de l'upload.");
        return;
      }

      setData(result);
      setCurrentSource("uploaded");
      setMessage(`Fichier analysé : ${result.filename}`);
      setDateFrom("");
      setDateTo("");
      await fetchHistory("", "");

      if (result.anomaly) {
        setLiveAlert(true);
        setTimeout(() => setLiveAlert(false), 4000);
      }
    } catch (error) {
      console.error("Erreur upload:", error);
      setMessage("Erreur réseau pendant l'upload.");
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleBackToDefault = async () => {
    try {
      setCurrentSource("default");
      setMessage("Retour au fichier logs.txt");

      const result = await getAnalysis();
      setData(result);
      await fetchHistory(dateFrom, dateTo);
    } catch (error) {
      console.error("Erreur retour logs.txt:", error);
      setMessage("Impossible de recharger logs.txt");
    }
  };

  useEffect(() => {
    fetchHistory();

    if (currentSource === "default") {
      fetchData();
    }

    const handleAnalysisUpdate = (newData) => {
      setData(newData);
      setMessage(
        `Nouvelle analyse reçue en temps réel : ${newData.source || "fichier"}`
      );

      if (!dateFrom && !dateTo) {
        fetchHistory();
      }

      if (newData.anomaly) {
        setLiveAlert(true);
        setTimeout(() => setLiveAlert(false), 4000);
      }
    };

    if (socket) {
      socket.on("analysis_update", handleAnalysisUpdate);
    }

    return () => {
      if (socket) {
        socket.off("analysis_update", handleAnalysisUpdate);
      }
    };
  }, [currentSource, fetchData, fetchHistory, dateFrom, dateTo]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  const chartData = [
    { name: "Erreurs", value: data.errors, color: "#ef4444" },
    { name: "Logins", value: data.logins, color: "#3b82f6" },
    { name: "CPU %", value: data.cpu, color: "#eab308" },
  ];

  const historyChartData = [...history]
    .slice()
    .reverse()
    .map((row) => ({
      time: row.timestamp ? row.timestamp.split(" ")[1] : "",
      cpu: row.cpu,
      errors: row.errors,
      logins: row.logins,
    }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 mb-10 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            SOC Dashboard
          </h1>
          <p className="text-slate-400">Monitoring IT en temps réel</p>
        </div>

        <div
          className={`px-6 py-3 rounded-xl border-2 flex items-center gap-3 transition-all duration-500 ${
            data.anomaly
              ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              : "bg-emerald-500/10 border-emerald-500 text-emerald-500"
          }`}
        >
          <span
            className={`h-3 w-3 rounded-full ${
              data.anomaly ? "bg-red-500" : "bg-emerald-500"
            }`}
          ></span>
          <span className="font-bold text-lg uppercase">
            {data.anomaly ? "Anomalie Critique" : "Système Sain"}
          </span>
        </div>
      </header>

      {liveAlert && (
        <div className="mb-6 bg-red-600 text-white px-6 py-4 rounded-xl shadow-lg animate-pulse">
          🚨 Nouvelle anomalie détectée en temps réel
        </div>
      )}

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl mb-6">
        <h2 className="text-xl font-bold mb-4">Importer un fichier log</h2>

        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <input
            type="file"
            accept=".log,.txt"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-slate-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-500"
          />

          <button
            onClick={handleUpload}
            disabled={loadingUpload}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-semibold transition"
          >
            {loadingUpload ? "Analyse..." : "Upload & Analyse"}
          </button>

          <button
            onClick={handleBackToDefault}
            className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-lg font-semibold transition"
          >
            Revenir à logs.txt
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}

        <p className="mt-2 text-xs text-slate-400">
          Source active :{" "}
          {data.source ||
            (currentSource === "default" ? "logs.txt" : "fichier importé")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <p className="text-slate-400 text-sm mb-1 uppercase font-semibold">
            Alertes critiques
          </p>
          <p className="text-4xl font-bold text-red-500">
            {data.critical_alerts ?? 0}
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <p className="text-slate-400 text-sm mb-1 uppercase font-semibold">
            Événements sécurité
          </p>
          <p className="text-4xl font-bold text-blue-500">
            {data.security_events ?? 0}
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <p className="text-slate-400 text-sm mb-1 uppercase font-semibold">
            Sévérité
          </p>
          <p
            className={`text-3xl font-bold uppercase ${
              data.severity === "critical"
                ? "text-red-500"
                : data.severity === "warning"
                ? "text-yellow-500"
                : "text-emerald-500"
            }`}
          >
            {data.severity ?? "normal"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <p className="text-slate-400 text-sm mb-1 uppercase font-semibold">
            Taux d'Erreur
          </p>
          <p className="text-4xl font-bold text-red-500">{data.errors}</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <p className="text-slate-400 text-sm mb-1 uppercase font-semibold">
            Tentatives Login
          </p>
          <p className="text-4xl font-bold text-blue-500">{data.logins}</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <p className="text-slate-400 text-sm mb-1 uppercase font-semibold">
            Charge CPU
          </p>
          <p className="text-4xl font-bold text-yellow-500">{data.cpu}%</p>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl mb-8">
        <h3 className="text-xl font-bold mb-6">Visualisation des Flux</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                vertical={false}
              />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#f8fafc" }}
              />
              <Legend />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl mb-8">
        <h2 className="text-xl font-bold mb-4">
          Filtrer l&apos;historique par date
        </h2>

        <div className="flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex flex-col">
            <label className="text-sm text-slate-400 mb-2">Date début</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-slate-400 mb-2">Date fin</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <button
            onClick={() => fetchHistory(dateFrom, dateTo)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-semibold transition"
          >
            Filtrer
          </button>

          <button
            onClick={handleResetFilter}
            className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-lg font-semibold transition"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl mb-8">
        <h3 className="text-xl font-bold mb-6">Historique CPU</h3>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#f8fafc" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#eab308"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="errors"
                stroke="#ef4444"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="logins"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl mb-8">
        <h2 className="text-xl font-bold mb-4">Top IP suspectes</h2>

        <div className="space-y-3">
          {(data.top_ips ?? []).length > 0 ? (
            data.top_ips.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-slate-800 rounded-lg px-4 py-3"
              >
                <span className="font-mono text-slate-200">{item.ip}</span>
                <span className="text-red-400 font-bold">
                  {item.count} événements
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-400">Aucune IP suspecte détectée.</p>
          )}
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl mb-8">
        <h2 className="text-xl font-bold mb-4">Incidents récents</h2>

        <div className="space-y-3">
          {(data.recent_incidents ?? []).length > 0 ? (
            data.recent_incidents.map((incident, index) => (
              <div
                key={index}
                className="border-l-4 border-red-500 bg-slate-800 px-4 py-3 rounded-r-lg text-slate-200"
              >
                {incident}
              </div>
            ))
          ) : (
            <p className="text-slate-400">Aucun incident récent.</p>
          )}
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Historique</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Errors</th>
                <th className="py-3 pr-4">Logins</th>
                <th className="py-3 pr-4">CPU</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, i) => (
                <tr key={i} className="border-b border-slate-800">
                  <td className="py-3 pr-4">{row.timestamp}</td>
                  <td className="py-3 pr-4">{row.errors}</td>
                  <td className="py-3 pr-4">{row.logins}</td>
                  <td className="py-3 pr-4">{row.cpu}</td>
                  <td className="py-3 pr-4">{row.anomaly ? "🚨" : "OK"}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-4 text-slate-400">
                    Aucun historique disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;