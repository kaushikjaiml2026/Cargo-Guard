# CargoGuard — beginner-friendly prototype

A software-only heavy-vehicle load-safety demo with:
- Flask REST API (shared by web and mobile)
- React + Vite web dashboard
- Expo / React Native mobile app
- Simulated readings; no physical sensors required

> Safety notice: This is an educational prototype. Its thresholds and simulated readings are not certified for real vehicles. Never use it to decide whether a real vehicle is safe to operate. Real deployments require vehicle-specific engineering limits, calibrated sensors, validation, and qualified inspection.

## 1. Requirements
- Python 3.10+
- Node.js 20+
- npm
- Expo Go on a phone (optional; web dashboard works without it)

## 2. Start the backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```
API runs at http://localhost:5000. Test with http://localhost:5000/api/health.

## 3. Start the web dashboard
Open another terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173).

## 4. Start the mobile app
Open another terminal:
```bash
cd mobile
npm install
```
Edit `mobile/App.js`: set `API_BASE` to your computer's LAN IP, for example `http://192.168.1.8:5000/api`.
Your phone and computer must be on the same Wi-Fi. Do not use `localhost` on a physical phone.
```bash
npx expo start
```
Scan the QR code with Expo Go. For Android emulator use `http://10.0.2.2:5000/api`; for iOS simulator use `http://localhost:5000/api`.

## 5. Demo flow
1. Open the web dashboard or mobile app.
2. Select a vehicle.
3. Click one of the simulation buttons: Normal, Overload, Uneven, or Cargo shift.
4. Watch the risk status and readings update.
5. Reset to Normal before showing the next scenario.

## 6. API
- `GET /api/health` — service status
- `GET /api/vehicles` — all vehicle summaries
- `GET /api/vehicles/<id>` — one vehicle and its latest analysis
- `POST /api/vehicles/<id>/simulate` — JSON body `{"scenario":"overload"}`

Supported scenarios: `normal`, `overload`, `uneven`, `shift`.

## 7. Architecture
Web (React) ─┐
             ├── Flask REST API ── simulated readings + risk rules
Mobile (Expo)┘

The backend is the single source of truth. The first version stores demo data in memory, so readings reset when the server restarts. Add a database only after the basic prototype works.
