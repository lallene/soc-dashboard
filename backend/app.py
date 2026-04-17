from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from collections import Counter
import pickle
import numpy as np
import os
import sqlite3
import requests
from deep_translator import GoogleTranslator

from database import init_db, DB_PATH
from parser import parse_logs

# Initialisation base SQLite
init_db()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Dossiers et fichiers
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
LOG_PATH = os.path.join(DATA_DIR, "logs.txt")

# Crée le dossier data si besoin
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Vérifie que le modèle existe
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"model.pkl introuvable : {MODEL_PATH}\n"
        f"Lance d'abord model.py pour générer le modèle."
    )

# Charge le modèle
with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)


def analyze_log_file(file_path, model):
    logs = parse_logs(file_path)

    errors = sum(
        1 for l in logs
        if l.get("type") in ["app_error", "web_error", "error"]
    )
    logins = sum(1 for l in logs if l.get("type") == "security")
    cpu_values = [l["value"] for l in logs if l.get("type") == "cpu"]
    cpu = max(cpu_values, default=0)

    security_events = sum(1 for l in logs if l.get("type") == "security")
    critical_alerts = sum(
        1 for l in logs if l.get("type") in ["app_error", "web_error"]
    )

    errors_by_type = {
        "app_error": sum(1 for l in logs if l.get("type") == "app_error"),
        "web_error": sum(1 for l in logs if l.get("type") == "web_error"),
        "security": sum(1 for l in logs if l.get("type") == "security"),
    }

    ips = [l.get("ip") for l in logs if l.get("ip")]
    ip_counter = Counter(ips)
    top_ips = [
        {"ip": ip, "count": count}
        for ip, count in ip_counter.most_common(5)
    ]

    recent_incidents = [
        l["raw"]
        for l in logs
        if l.get("type") in ["app_error", "web_error", "security", "error"]
    ][-5:]

    if cpu >= 90 or security_events >= 5 or errors >= 3:
        severity = "critical"
    elif cpu >= 70 or security_events >= 3 or errors >= 1:
        severity = "warning"
    else:
        severity = "normal"

    features = np.array([[errors, logins, cpu]])
    prediction = model.predict(features)
    anomaly = int(prediction[0] == -1)

    return {
        "errors": errors,
        "logins": logins,
        "cpu": cpu,
        "anomaly": anomaly,
        "severity": severity,
        "security_events": security_events,
        "critical_alerts": critical_alerts,
        "errors_by_type": errors_by_type,
        "source": os.path.basename(file_path),
        "top_ips": top_ips,
        "recent_incidents": recent_incidents,
    }


def save_analysis(errors, logins, cpu, anomaly):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO analysis (errors, logins, cpu, anomaly)
        VALUES (?, ?, ?, ?)
        """,
        (errors, logins, cpu, anomaly),
    )

    conn.commit()
    conn.close()


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "API Monitoring IT OK",
        "routes": ["/analyze", "/upload", "/history", "/cve/<cve_id>"]
    })


@app.route("/analyze", methods=["GET"])
def analyze():
    if not os.path.exists(LOG_PATH):
        return jsonify({
            "error": f"Fichier introuvable : {LOG_PATH}"
        }), 404

    result = analyze_log_file(LOG_PATH, model)
    return jsonify(result)


@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "Aucun fichier envoyé"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "Nom de fichier vide"}), 400

    filename = os.path.basename(file.filename)
    save_path = os.path.join(DATA_DIR, filename)
    file.save(save_path)

    result = analyze_log_file(save_path, model)
    save_analysis(
        result["errors"],
        result["logins"],
        result["cpu"],
        result["anomaly"]
    )

    socketio.emit("analysis_update", result)

    return jsonify({
        "filename": filename,
        **result
    })


@app.route("/history", methods=["GET"])
def history():
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    query = """
        SELECT id, timestamp, errors, logins, cpu, anomaly
        FROM analysis
    """
    params = []

    if date_from and date_to:
        query += " WHERE date(timestamp) BETWEEN ? AND ?"
        params.extend([date_from, date_to])

    query += " ORDER BY id DESC LIMIT 50"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    data = [
        {
            "id": row[0],
            "timestamp": row[1],
            "errors": row[2],
            "logins": row[3],
            "cpu": row[4],
            "anomaly": row[5],
        }
        for row in rows
    ]

    return jsonify(data)



def get_cve_data(cve_id):
    url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        res_json = response.json()
        
        vulnerabilities = res_json.get("vulnerabilities", [])
        if not vulnerabilities:
            return {"id": cve_id, "summary": "CVE non trouvée", "cvss": "N/A", "references": []}

        cve_item = vulnerabilities[0]["cve"]
        
        # --- Extraction des données existantes ---
        descriptions = cve_item.get("descriptions", [])
        summary = next((d["value"] for d in descriptions if d["lang"] == "en"), "No description")
        
        metrics = cve_item.get("metrics", {})
        cvss_data = metrics.get("cvssMetricV31") or metrics.get("cvssMetricV30")
        score = cvss_data[0]["cvssData"]["baseScore"] if cvss_data else "N/A"

        # --- NOUVEAU : Extraction des Références ---
        # On récupère les URLs dans la liste des références
        refs_list = cve_item.get("references", [])
        references = [r.get("url") for r in refs_list if r.get("url")]

        data = {
            "id": cve_id,
            "summary": summary,
            "cvss": score,
            "published": cve_item.get("published", "N/A").split("T")[0],
            "references": references # Ajout au dictionnaire
        }

        # Traduction
        data['summary_fr'] = GoogleTranslator(source='en', target='fr').translate(data['summary'])

    except Exception as e:
        print(f"Erreur API : {e}")
        data = {
            "id": cve_id, 
            "summary": "Erreur réseau", 
            "summary_fr": "Impossible de joindre la base NVD.",
            "references": []
        }

    return data

@app.route("/cve/<cve_id>", methods=["GET"])
def cve_endpoint(cve_id):
    result = get_cve_data(cve_id)
    return jsonify(result)

def analyze_pcap_deep(file_path):
    packets = rdpcap(file_path)
    flows = []
    
    for pkt in packets:
        if IP in pkt:
            src = pkt[IP].src
            dst = pkt[IP].dst
            proto = "TCP" if TCP in pkt else "UDP" if UDP in pkt else "Other"
            
            # On cherche spécifiquement le port 1234 ou 21
            port = None
            if TCP in pkt: port = pkt[TCP].dport
            elif UDP in pkt: port = pkt[UDP].dport
            
            if port in [21, 1234]:
                flows.append({"src": src, "dst": dst, "port": port, "proto": proto})

    # On ne garde que les 10 plus pertinents pour l'affichage
    return flows[:10]
@app.route("/upload_pcap", methods=["POST"])
def upload_pcap():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "Aucun fichier détecté"}), 400
        
        file = request.files['file']
        filename = os.path.basename(file.filename)
        path = os.path.join(UPLOAD_FOLDER, filename) # <-- Utilise la variable globale
        file.save(path)
        
        from pcap_analyzer import analyze_pcap
        result = analyze_pcap(path)
        
        if "error" in result:
            return jsonify(result), 500
            
        return jsonify(result)

    except Exception as e:
        print(f"CRASH SERVEUR: {str(e)}")
        return jsonify({"error": f"Erreur interne : {str(e)}"}), 500

    except Exception as e:
        # Capture toutes les autres erreurs (permissions, crash Scapy, etc.)
        print(f"CRASH SERVEUR: {str(e)}")
        return jsonify({"error": f"Erreur interne du serveur: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=False,
        allow_unsafe_werkzeug=True,
    )