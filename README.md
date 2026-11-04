# HAILO Digital Hub – Smart Waste Management and Monitoring System

> **College Design Project – Municipal IoT Dustbin Telemetry, Permanent QR Placard System & Citizen Grievance Portal**

HAILO Digital Hub is a production-grade smart waste-management web platform designed for municipal and university campus operations. It bridges physical ultrasonic hardware sensors, dynamic QR-code-based citizen reporting, and automated municipal dispatch workflows.

---

## 🌟 Key System Capabilities

1. **Permanent 5-Dustbin Smart Fleet & Physical Placards**
   - Five permanently registered municipal dustbins:
     - `BIN-001`: Main Block (Academic Zone)
     - `BIN-002`: Cafeteria (Dining Zone)
     - `BIN-003`: Hostel (Residential Zone)
     - `BIN-004`: Library (Academic Zone)
     - `BIN-005`: Sports Complex (Athletics Zone)
   - Status logic based on live fill percentage:
     - `0–59%`: **NORMAL** 🟢
     - `60–79%`: **NORMAL / APPROACHING FULL** 🟢
     - `80–94%`: **ALMOST FULL** (Scheduled collection queue) 🟡
     - `95–99%`: **FULL** (Immediate collection alert) 🔴
     - `100%`: **OVERFLOW** (Critical hazard alarm) ⚠️

2. **Permanent QR Placard & Citizen Mobile Reporting**
   - Each dustbin has a permanent QR code pointing to its own reporting page:
     - `/report/BIN-001`
     - `/report/BIN-002`
     - `/report/BIN-003`
     - `/report/BIN-004`
     - `/report/BIN-005`
   - Configurable public HTTPS base URL ensuring phone cameras scanning on cellular networks reach the interface.
   - When a citizen scans a QR code with their mobile phone:
     - Auto-identifies the Bin ID and physical location with zero manual selection required.
     - Displays read-only placards.
     - Citizens choose from standardized issue categories: *Overflowing Waste*, *Bad Smell*, *Damaged Dustbin*, *Waste Leakage*, *Scattered Waste*, *Bin is Full*, *Needs Cleaning*, *Other*.
     - Optional photographic evidence upload and incident description.
     - Submitting creates a unique tracking complaint ID (`CMP-xxx`) and immediately routes to confirmation.
   - Route separation: `/report` provides options for camera scan or manual bin selection, while `/report/BIN-00X` directly opens the specific bin's form.

3. **QR Management & Placard Generation Desk**
   - 5 Individual cards showing QR code, Bin ID, location, active/inactive badge, reporting URL, and test link.
   - **Active/Inactive Status Toggle**: Admins can temporarily pause reporting for dustbins under maintenance. Inactive dustbins display a prominent notice on citizen reporting forms and safely block submissions.
   - **Download PNG**: High-resolution 1000x1200 sticker image with HAILO DIGITAL HUB branding, "SCAN TO REPORT WASTE ISSUES", QR code, Bin ID, and location.
   - **Download SVG**: Crisp vector placard graphic.
   - **Download All 5 (ZIP)**: Packages all 5 high-res PNG stickers, vector SVGs, and README installation guide.
   - **Printable A4 Sheet / PDF**: ISO standard A4 sheet containing all 5 placards with dashed scissor cut lines (✂) and municipal installation guide.

4. **Cleaning Staff Assignment & Grievance Resolution Workflow**
   - Admin manages full triage from Admin Dashboard:
     - Review, accept, or reject complaints.
     - Assign complaints to registered cleaning staff members (`Ramesh Kumar`, `Suresh Patel`, `Priya Sharma`, `Sunita Verma`, `Amit Singh`).
     - Real-time status progression: `PENDING` → `ACCEPTED` → `ASSIGNED` → `IN PROGRESS` → `RESOLVED`.
     - Mandatory before/after cleaning photo verification prior to marking complaints resolved.
     - Synchronized updates across Admin Dashboard, Customer Portal (`My Reports`), and Activity Log.

5. **Operations Dashboard & Hardware Telemetry**
   - Stat cards for total waste, recyclables, active complaints, and threshold alerts.
   - Interactive IoT hardware testbench simulating ESP32 microcontroller with HC-SR04 ultrasonic sensor.
   - Dynamic fill-level slider and automated EV rover dispatch triggers.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React Icons
- **Data Visualization**: Recharts (Interactive Area, Bar, Line, and Pie charts)
- **QR Generation**: `qrcode.react` (High-res SVG and Canvas QR rendering)
- **Zero-Dependency Document Generators**: Native browser Canvas-to-JPEG PDF 1.4 compiler and PKWARE ZIP archive builder
- **Delight & Feedback**: `canvas-confetti`
- **State & Storage**: Reactive React Context with localStorage persistence

---

## 💻 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
http://localhost:3000
```
