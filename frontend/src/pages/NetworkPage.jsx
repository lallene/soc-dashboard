import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ShieldAlert, Activity, FileSearch, ShieldCheck, Terminal, Download } from "lucide-react";

const COLORS = ["#3b82f6", "#ef4444", "#eab308", "#8b5cf6", "#10b981"];

const NetworkPage = () => {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setErrorMsg("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/upload_pcap", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'analyse.");
      
      setAnalysis(data);
    } catch (err) {
      setErrorMsg(err.message);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Activity className="text-blue-500" /> SOC Network Analyzer
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest">Forensics & Traffic Deep Inspection</p>
        </div>
        {analysis && (
          <div className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest ${analysis.severity === 'critical' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-emerald-500/10 border-emerald-500 text-emerald-500'}`}>
            Status: {String(analysis.severity)}
          </div>
        )}
      </div>

      {/* Upload Zone */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8 shadow-2xl">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 w-full">
            <label className="block text-slate-500 text-[10px] font-black uppercase mb-2 tracking-widest">Fichier PCAP source</label>
            <input 
              type="file" 
              accept=".pcap" 
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer bg-slate-950 p-2 rounded-xl border border-slate-800"
            />
          </div>
          <button 
            onClick={handleUpload}
            disabled={loading || !file}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            {loading ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Analyse...</> : <><FileSearch size={18} /> Scanner le trafic</>}
          </button>
        </div>
        {errorMsg && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3">
            <ShieldAlert className="text-red-500" size={20} />
            <p className="text-red-500 text-xs font-mono">{errorMsg}</p>
          </div>
        )}
      </div>

      {analysis && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Paquets Analysés</span>
              <p className="text-4xl font-black text-white mt-2">{analysis.packet_count.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Volume de Données</span>
              <p className="text-4xl font-black text-white mt-2">{analysis.data_transfered}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Alertes Détectées</span>
              <p className={`text-4xl font-black mt-2 ${analysis.alerts.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {analysis.alerts.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Distribution Protocole */}
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 flex flex-col items-center">
              <h3 className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <ShieldCheck size={14} className="text-blue-500" /> Top Protocoles
              </h3>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={analysis.protocol_dist} 
                      dataKey="value" 
                      nameKey="name" 
                      innerRadius={60} 
                      outerRadius={100} 
                      paddingAngle={5}
                    >
                      {analysis.protocol_dist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px'}} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Ports */}
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
              <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <Download size={14} className="text-blue-500" /> Ports de Destination
              </h3>
              <div className="space-y-4">
                {analysis.top_ports.map((p, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-bold uppercase">
                      <span className="text-slate-400">Port {p.port}</span>
                      <span className="text-blue-400">{p.count} pkts</span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-blue-600 rounded-full" style={{width: `${(p.count / analysis.packet_count) * 100}%`}} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security Alerts - Deep Packet Inspection Results */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="bg-red-500/5 px-8 py-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                <Terminal size={16} /> Rapport d'Analyse Forensique (DPI)
              </h3>
            </div>
            <div className="divide-y divide-slate-800">
              {analysis.alerts.length > 0 ? analysis.alerts.map((alert, i) => (
                <div key={i} className="p-8 hover:bg-slate-800/30 transition group">
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className={`px-3 py-1 rounded text-[10px] font-black uppercase w-fit h-fit ${
                      alert.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-orange-600/20 text-orange-500'
                    }`}>
                      {alert.type}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-lg mb-1">{alert.msg}</h4>
                      <p className="text-slate-500 text-xs">IP Source: <span className="text-blue-400 font-mono">{alert.src}</span></p>
                      
                      {alert.payload && (
                        <div className="mt-4">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Données Extraites (Payload)</span>
                          <pre className="bg-black p-4 rounded-xl border border-slate-800 text-emerald-500 text-xs font-mono overflow-x-auto shadow-inner leading-relaxed">
                            {alert.payload}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center">
                  <ShieldCheck size={48} className="text-emerald-500 mx-auto mb-4 opacity-20" />
                  <p className="text-slate-500 text-sm italic font-medium">Aucune activité malveillante détectée dans la charge utile des paquets.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkPage;