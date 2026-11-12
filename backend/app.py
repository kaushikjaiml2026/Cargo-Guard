from copy import deepcopy
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

vehicles = {
    "TN38AB1234": {
        "id": "TN38AB1234",
        "name": "Demo Heavy Truck",
        "route": "Coimbatore → Chennai",
        "capacityKg": 20000,
        "loadKg": 14500,
        "frontAxleKg": 7000,
        "rearAxleKg": 7500,
        "movementScore": 8,
        "updatedAt": "Just now",
    },
    "TN37CD5678": {
        "id": "TN37CD5678",
        "name": "Demo Cargo Lorry",
        "route": "Coimbatore → Bengaluru",
        "capacityKg": 16000,
        "loadKg": 15100,
        "frontAxleKg": 9800,
        "rearAxleKg": 5300,
        "movementScore": 12,
        "updatedAt": "Just now",
    },
}


def analyze(vehicle):
    """Illustrative rules only; not a real-vehicle safety certification."""
    capacity = vehicle["capacityKg"]
    load = vehicle["loadKg"]
    front = vehicle["frontAxleKg"]
    rear = vehicle["rearAxleKg"]
    total_axle = front + rear
    imbalance = abs(front - rear) / total_axle * 100 if total_axle else 0
    load_pct = load / capacity * 100 if capacity else 0

    alerts = []
    if load > capacity:
        alerts.append({
            "level": "critical",
            "title": "Configured capacity exceeded",
            "detail": f"Recorded load is {load_pct:.1f}% of the demo capacity."
        })
    if imbalance > 20:
        alerts.append({
            "level": "warning",
            "title": "Uneven axle reading",
            "detail": f"Front/rear reading difference is {imbalance:.1f}% of combined axle readings."
        })
    if vehicle["movementScore"] > 60:
        alerts.append({
            "level": "warning",
            "title": "Unusual cargo movement signal",
            "detail": "The simulated movement score crossed the demo threshold."
        })

    risk = "critical" if any(a["level"] == "critical" for a in alerts) else (
        "warning" if alerts else "normal"
    )
    return {
        "risk": risk,
        "loadPercent": round(load_pct, 1),
        "axleImbalancePercent": round(imbalance, 1),
        "alerts": alerts,
        "recommendation": (
            "Stop the demo workflow and request a qualified inspection; do not rely on this prototype for a real vehicle."
            if alerts else
            "No demo rule was triggered. This is not proof that a real vehicle is safe."
        )
    }


def present(vehicle):
    result = deepcopy(vehicle)
    result["analysis"] = analyze(vehicle)
    return result


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "CargoGuard API"})


@app.get("/api/vehicles")
def get_vehicles():
    return jsonify([present(v) for v in vehicles.values()])


@app.get("/api/vehicles/<vehicle_id>")
def get_vehicle(vehicle_id):
    vehicle = vehicles.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404
    return jsonify(present(vehicle))


@app.post("/api/vehicles/<vehicle_id>/simulate")
def simulate(vehicle_id):
    vehicle = vehicles.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    body = request.get_json(silent=True) or {}
    scenario = body.get("scenario", "normal")
    if scenario not in {"normal", "overload", "uneven", "shift"}:
        return jsonify({"error": "Choose normal, overload, uneven, or shift"}), 400

    # Values are deliberately synthetic for a classroom/hackathon demo.
    scenarios = {
        "normal": (14500, 7000, 7500, 8),
        "overload": (21800, 10800, 11000, 10),
        "uneven": (15000, 11200, 3800, 12),
        "shift": (14800, 7200, 7600, 85),
    }
    vehicle["loadKg"], vehicle["frontAxleKg"], vehicle["rearAxleKg"], vehicle["movementScore"] = scenarios[scenario]
    vehicle["updatedAt"] = "Just now"
    return jsonify(present(vehicle))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
