from flask import Flask, jsonify, request
from flask_cors import CORS
import pickle
import numpy as np
import os
from database import init_db
import sqlite3
from database import DB_PATH
from collections import Counter
from parser import parse_logs
from flask_socketio import SocketIO

init_db()

from parser import parse_logs

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Base directory = dossier backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
LOG_PATH = os.path.join(DATA_DIR, "logs.txt")

# Crée le dossier data s'il n'existe pas
os.makedirs(DATA_DIR, exist_ok=True)

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

    errors = sum(1 for l in logs if "error" in l.get("type", ""))
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
        if l.get("type") in ["app_error", "web_error", "security"]
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

@app.route("/")
def home():
    return jsonify({
        "message": "API Monitoring IT OK",
        "routes": ["/analyze", "/upload"]
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
    save_analysis(result["errors"], result["logins"], result["cpu"], result["anomaly"])

    socketio.emit("analysis_update", result)


    return jsonify({
        "filename": filename,
        **result
    })


def save_analysis(errors, logins, cpu, anomaly):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO analysis (errors, logins, cpu, anomaly)
        VALUES (?, ?, ?, ?)
    """, (errors, logins, cpu, anomaly))

    conn.commit()
    conn.close()

@app.route("/history", methods=["GET"])
def history():
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    query = """
        SELECT timestamp, errors, logins, cpu, anomaly
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
            "timestamp": row[0],
            "errors": row[1],
            "logins": row[2],
            "cpu": row[3],
            "anomaly": row[4],
        }
        for row in rows
    ]

    return jsonify(data)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT timestamp, errors, logins, cpu, anomaly FROM analysis ORDER BY timestamp DESC LIMIT 20")
    rows = cursor.fetchall()

    conn.close()

    data = [
        {
            "timestamp": r[0],
            "errors": r[1],
            "logins": r[2],
            "cpu": r[3],
            "anomaly": r[4]
        }
        for r in rows
    ]

    return jsonify(data)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=False,
        allow_unsafe_werkzeug=True,
    )