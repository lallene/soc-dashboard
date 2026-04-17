from scapy.all import rdpcap, IP, TCP, UDP, Raw
from collections import Counter
import re

def analyze_pcap(file_path):
    try:
        packets = rdpcap(file_path)
        
        # Initialisation des compteurs et structures
        stats = {
            "total_packets": len(packets),
            "protocols": Counter(),
            "ip_sources": Counter(),
            "ports_dest": Counter(),
            "total_bytes": 0,
            "alerts": [] # Contiendra les preuves d'attaques
        }

        # Signatures d'attaques courantes pour le Deep Inspection
        SHELL_COMMANDS = [b"whoami", b"id", b"/bin/sh", b"cat /etc/", b"ls -la", b"powershell"]
        
        for pkt in packets:
            stats["total_bytes"] += len(pkt)
            
            if IP in pkt:
                src_ip = pkt[IP].src
                stats["ip_sources"][src_ip] += 1
                
                # Identification du protocole
                proto = "Autre"
                port = None
                
                if TCP in pkt: 
                    proto = "TCP"
                    port = pkt[TCP].dport
                    # Détection SYN Scan (Reconnaissance)
                    if pkt[TCP].flags == "S":
                        stats["alerts"].append({
                            "type": "RECON",
                            "msg": f"SYN Scan (Tentative de connexion)",
                            "src": src_ip,
                            "severity": "low"
                        })
                elif UDP in pkt: 
                    proto = "UDP"
                    port = pkt[UDP].dport
                
                stats["protocols"][proto] += 1
                if port: stats["ports_dest"][port] += 1

                # --- DEEP PACKET INSPECTION (DPI) ---
                if Raw in pkt:
                    payload = pkt[Raw].load
                    
                    # 1. Détection de Shell sur ports suspects (1234, 4444, etc.)
                    if port in [1234, 4444, 5555, 8080]:
                        if any(cmd in payload for cmd in SHELL_COMMANDS):
                            stats["alerts"].append({
                                "type": "EXPLOIT",
                                "msg": f"Reverse Shell détecté (Commande système)",
                                "src": src_ip,
                                "payload": payload.decode('utf-8', errors='ignore')[:60],
                                "severity": "critical"
                            })

                    # 2. Détection d'identifiants en clair (FTP Port 21)
                    if port == 21:
                        if b"USER " in payload or b"PASS " in payload:
                            stats["alerts"].append({
                                "type": "LEAK",
                                "msg": f"Identifiants FTP interceptés",
                                "src": src_ip,
                                "payload": payload.decode('utf-8', errors='ignore').strip(),
                                "severity": "high"
                            })

        # --- POST-TRAITEMENT ET FORMATAGE ---
        
        # On ne garde que les alertes uniques pour éviter de polluer le dashboard
        unique_alerts = []
        seen = set()
        for a in stats["alerts"]:
            identifier = f"{a['type']}-{a['src']}-{a['msg']}"
            if identifier not in seen:
                unique_alerts.append(a)
                seen.add(identifier)

        return {
            "packet_count": stats["total_packets"],
            "data_transfered": f"{round(stats['total_bytes'] / 1024, 2)} KB",
            "protocol_dist": [{"name": k, "value": v} for k, v in stats["protocols"].items()],
            "top_ips": [{"ip": ip, "count": c} for ip, c in stats["ip_sources"].most_common(5)],
            "top_ports": [{"port": p, "count": c} for p, c in stats["ports_dest"].most_common(5)],
            "alerts": unique_alerts,
            "severity": "critical" if any(a['severity'] == "critical" for a in unique_alerts) else "normal"
        }

    except Exception as e:
        print(f"Erreur d'analyse PCAP : {e}")
        return {"error": f"Erreur lors de l'analyse : {str(e)}"}