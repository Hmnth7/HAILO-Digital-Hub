# HAILO Digital Hub – Smart Waste Management System

> **College Design Project – Municipal IoT Dustbin Telemetry & Citizen Grievance Portal**

HAILO Digital Hub is a production-grade smart waste-management web platform designed for municipal and university campus operations. It bridges physical ultrasonic hardware sensors, dynamic QR-code-based citizen reporting, and automated municipal dispatch workflows.

---

## 🌟 Key System Capabilities

1. **Smart Dustbin Fleet Monitoring (50 Bins)**
   - Pre-mapped network of 50 unique smart bins (`BIN-A001` through `BIN-A050`) across academic blocks, cafeterias, hostels, sports complexes, and walkways.
   - Status logic based on live fill percentage:
     - `0–59%`: **NORMAL** 🟢
     - `60–79%`: **NORMAL / APPROACHING FULL** 🟢
     - `80–94%`: **ALMOST FULL** (Scheduled collection queue) 🟡
     - `95–99%`: **FULL** (Immediate collection alert) 🔴
     - `100%`: **OVERFLOW** (Critical hazard alarm) ⚠️

2. **Cryptographic QR Placard & Citizen Mobile Reporting**
   - Each dustbin has a permanent QR code encoding a dynamic URL (e.g. `/report/BIN-A002`).
   - When a citizen scans the QR code with their smartphone, the incident form **automatically resolves the Bin ID and physical location** without requiring manual typing.
   - Citizens choose from 8 problem categories (Overflow, Bad Smell, Leakage, Damaged Bin, Hazardous Waste, etc.), attach photos with live preview, and submit without login friction.
   - Generates an immediate tracking complaint ID (e.g., `CMP-1024`) with celebratory confirmation.

3. **Admin Operations Dashboard**
   - **4 Major Stat Cards**: Total Waste (200 Ltr), Recyclable Waste (160 Ltr: Bio/Paper/Plastic), Non-Recyclable (40 Ltr), Active Complaints (12) with trend indicators.
   - **Bin Filling Detection Card**: Visualizes "Number of times bins reached 80% full" (23 times this month), category bars (Bio 80/120L, Paper 80/100L, Plastic 80/80L, Rest 15/60L), and advisory warnings.
   - **Waste Trend Chart**: Interactive 12-month Recharts volume breakdown with multi-metric hover inspection.
   - **Recent Complaints Feed**: Real-time triage table linked to QR submissions.

4. **Interactive IoT Hardware Simulation Testbench**
   - Simulates an **ESP32 microcontroller** paired with an **HC-SR04 ultrasonic distance sensor**.
   - Real-time diagnostic readouts: Microcontroller status, 40kHz ultrasound status, live seconds heartbeat, ultrasonic distance (cm), and calculated fill percentage.
   - Interactive **Fill-Level Slider (0% to 100%)**: Dragging the slider dynamically updates target bins across the Dashboard, Monitoring Grid, and Bin Details page.
   - Presentation Quick Triggers: "Trigger Overflow", "New Citizen Report", "Auto-Resolve", "Empty Bin".

5. **Operational Modules**
   - **QR Management**: Grid of 50 scannable QR placards with single SVG download and batch printable sticker sheet.
   - **Collection Planner**: Smart dispatch queue for EV waste carts and compact tippers.
   - **Analytics**: Deep-dive diversion charts, status distribution pie charts, and category frequencies.
   - **Stakeholder Feedback**: 5-star community rating submission and manager review desk.
   - **Settings**: System thresholds, sound alarms, and one-click demo data reset.

---

## 🚀 Presentation Demo Flow (Step-by-Step for Evaluators)

| Step | Action | Expected Output |
|------|--------|-----------------|
| **1** | Open Admin Dashboard (`/dashboard`) | View Total Waste (200 Ltr), Recyclables (160 Ltr), 80% Threshold count (23x), and Waste Trends. |
| **2** | Open Bin Monitoring (`/bins`) | Inspect 50 smart bins. Select `BIN-A002` (Block B, 94% Full). |
| **3** | Open QR Management (`/qr-management`) | View QR code for `BIN-A002`. Click **Scan / Test Complaint Page**. |
| **4** | Citizen Form Opens (`/report/BIN-A002`) | Notice `BIN-A002` and `Block B – Ground Floor Lobby` are **pre-filled automatically**. |
| **5** | Submit Incident Report | Select *Overflowing waste*, observe demo photo preview, click **Submit Report**. |
| **6** | Complaint Confirmation (`/report/success/CMP-...`) | View generated Complaint ID, status `Pending`, and confetti celebration. |
| **7** | Return to Admin Dashboard | Confirm the new complaint immediately appears at the top of the complaints queue. |
| **8** | Change Complaint Status | Transition incident: `Pending` → `In Progress` → `Resolved`. |
| **9** | IoT Hardware Simulation | Open **IoT Simulator**, adjust the slider to 100% to demonstrate real-time overflow sensor alert! |

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React Icons
- **Data Visualization**: Recharts (Interactive Area, Bar, Line, and Pie charts)
- **QR Generation**: `qrcode.react` (High-res SVG and PNG QR rendering)
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
