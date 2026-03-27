import re


def parse_logs(file_path):
    results = []

    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        for raw_line in f:
            line = raw_line.strip()
            lower_line = line.lower()

            if not line:
                continue

            # Extraction IP éventuelle
            ip_match = re.search(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", line)
            ip = ip_match.group(0) if ip_match else None

            # 1) SECURITE
            if (
                "failed password" in lower_line
                or "login failed" in lower_line
                or "[security]" in lower_line
                or "unauthorized access" in lower_line
            ):
                results.append({
                    "type": "security",
                    "value": 1,
                    "ip": ip,
                    "raw": line
                })
                continue

            # 2) CPU
            if "cpu usage" in lower_line or "[cpu]" in lower_line:
                cpu_match = re.search(r"(\d+(?:\.\d+)?)", line.split("]")[-1])
                cpu_value = float(cpu_match.group(1)) if cpu_match else 0

                results.append({
                    "type": "cpu",
                    "value": cpu_value,
                    "raw": line
                })
                continue

            # 3) LOGS WEB
            if any(method in line for method in ["GET", "POST", "PUT", "DELETE"]):
                status_match = re.search(
                    r"\b(200|201|204|301|302|400|401|403|404|500|502|503)\b",
                    line
                )

                if status_match:
                    status_code = int(status_match.group(1))

                    if status_code >= 500:
                        results.append({
                            "type": "web_error",
                            "value": 1,
                            "status": status_code,
                            "ip": ip,
                            "raw": line
                        })
                    else:
                        results.append({
                            "type": "web_ok",
                            "value": 0,
                            "status": status_code,
                            "ip": ip,
                            "raw": line
                        })
                    continue

            # 4) ERREURS APPLICATIVES
            if (
                "error" in lower_line
                or "[error]" in lower_line
                or "database connection failed" in lower_line
                or "exception" in lower_line
                or "timeout" in lower_line
                or "unresponsive" in lower_line
            ):
                results.append({
                    "type": "app_error",
                    "value": 1,
                    "ip": ip,
                    "raw": line
                })
                continue

            # 5) INFO
            if "[info]" in lower_line:
                results.append({
                    "type": "info",
                    "value": 0,
                    "ip": ip,
                    "raw": line
                })
                continue

            # 6) INCONNU
            results.append({
                "type": "unknown",
                "value": 0,
                "ip": ip,
                "raw": line
            })

    return results