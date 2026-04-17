import React from "react";

function PlaceholderPage({ title, description }) {
  return (
    <div className="p-8">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl">
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
        <p className="text-slate-400 text-lg">{description}</p>
      </div>
    </div>
  );
}

export default PlaceholderPage;