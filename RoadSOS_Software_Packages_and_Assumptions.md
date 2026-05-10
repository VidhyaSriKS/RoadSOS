# RoadSOS — Project Documentation

## Software Packages Used & Assumptions

---

**Project Title:** RoadSOS — Road Accident Emergency Assistance Application

**Application ID:** `com.roadsos.app`

**Version:** 1.0.0

**Platform:** Cross-platform (Android, iOS, Web)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack Summary](#5-technology-stack-summary)
6. [Software Packages Used](#6-software-packages-used)
7. [External APIs & Services](#7-external-apis--services)
8. [Project Folder Structure](#8-project-folder-structure)
9. [Feature Descriptions](#9-feature-descriptions)
10. [Design Decisions & Rationale](#10-design-decisions--rationale)
11. [Assumptions](#11-assumptions)
12. [Hardware & Software Requirements](#12-hardware--software-requirements)
13. [Testing Approach](#13-testing-approach)
14. [Known Limitations](#14-known-limitations)
15. [Future Enhancements](#15-future-enhancements)

---

## 1. Project Overview

**RoadSOS** is a cross-platform mobile application designed to provide immediate emergency assistance during road accidents. The application automatically detects potential vehicle crashes using accelerometer data, alerts emergency contacts via SMS with GPS coordinates, locates the nearest hospitals, ambulances, police stations, repair shops, towing services, pharmacies, and fuel stations, and provides step-by-step first aid guidance — all in a single, lightweight, offline-capable app.

The app is built as a **hybrid mobile application** using React for the frontend and Capacitor for native device access, allowing deployment on Android, iOS, and the web from a single codebase.

---

## 2. Problem Statement

Road accidents are one of the leading causes of death globally. In many cases, victims do not receive timely medical assistance due to:

- Delayed communication with emergency services
- Inability of injured persons to make phone calls or share their location
- Lack of awareness about the nearest hospital, ambulance, or police station
- Absence of first aid knowledge among bystanders
- Poor or no internet connectivity in rural/highway areas

---

## 3. Proposed Solution

RoadSOS addresses these challenges by providing:

| Feature | Description |
|---|---|
| **One-Tap SOS** | Instantly sends GPS location via SMS to emergency contacts and auto-dials emergency services |
| **Automatic Crash Detection** | Uses accelerometer data (G-force > 2.5G threshold) to detect crashes and triggers SOS after a 15-second countdown |
| **Nearby Services Discovery** | Finds hospitals, ambulances, police, repair shops, towing, pharmacies, and fuel stations within progressive radius (10–100 km) |
| **Interactive Map + List View** | Displays services on an OpenStreetMap-based interactive map with navigation links |
| **Offline Mode** | Caches map tiles and service data locally using IndexedDB (via LocalForage) for use without internet |
| **First Aid Guide** | Provides structured, step-by-step emergency first aid instructions |
| **Emergency Contacts** | Stores trusted contacts who receive automated SMS alerts with GPS links during emergencies |
| **Voice Alerts** | Text-to-speech announcements during SOS and crash detection events |
| **Global Support** | Country-aware emergency numbers (India, US, UK, etc.) via reverse geocoding |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    USER DEVICE                       │
│  ┌─────────────────────────────────────────────┐    │
│  │         React Frontend (Vite + JSX)          │    │
│  │  ┌──────┐ ┌───────┐ ┌────────┐ ┌─────────┐  │    │
│  │  │ Home │ │Nearby │ │FirstAid│ │Contacts │  │    │
│  │  └──┬───┘ └───┬───┘ └────────┘ └─────────┘  │    │
│  │     │         │                               │    │
│  │  ┌──▼─────────▼───────────────────────────┐  │    │
│  │  │          Services Layer                 │  │    │
│  │  │  ┌──────────┐ ┌─────────┐ ┌──────────┐ │  │    │
│  │  │  │ Overpass  │ │Geoapify │ │ Offline  │ │  │    │
│  │  │  │ (OSM API) │ │ Places  │ │ Manager  │ │  │    │
│  │  │  └──────────┘ └─────────┘ └──────────┘ │  │    │
│  │  └────────────────────────────────────────┘  │    │
│  │                                               │    │
│  │  ┌────────────────────────────────────────┐  │    │
│  │  │     Capacitor Native Bridge             │  │    │
│  │  │  GPS │ TTS │ App Lifecycle │ Settings   │  │    │
│  │  └────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │    Local Storage (IndexedDB + localStorage)  │    │
│  │    Map Tiles │ POI Cache │ Contacts │ Coords │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES (APIs)                │
│  ┌──────────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ Overpass API  │ │ Geoapify   │ │  Nominatim    │  │
│  │ (OSM Queries) │ │ (Places +  │ │  (Reverse     │  │
│  │               │ │  Geocode)  │ │   Geocode)    │  │
│  └──────────────┘ └────────────┘ └───────────────┘  │
│  ┌──────────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ OpenRoute    │ │ OSM Tile   │ │ Google Maps   │  │
│  │ Service      │ │ Server     │ │ (Navigation)  │  │
│  └──────────────┘ └────────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack Summary

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 (JSX) |
| **Build Tool** | Vite 8 |
| **Routing** | React Router DOM 7 |
| **Native Runtime** | Capacitor 8 (Android + iOS) |
| **Map Rendering** | Leaflet 1.9 + Leaflet MarkerCluster |
| **Icons** | Lucide React |
| **Offline Storage** | LocalForage (IndexedDB wrapper) |
| **Styling** | Vanilla CSS (custom design system) |
| **Language** | JavaScript (ES Modules) |

---

## 6. Software Packages Used

### 6.1 Production Dependencies

| # | Package | Version | Purpose |
|---|---|---|---|
| 1 | `react` | ^19.2.5 | Core UI library for building component-based user interfaces |
| 2 | `react-dom` | ^19.2.5 | DOM rendering engine for React components |
| 3 | `react-router-dom` | ^7.14.2 | Client-side routing for single-page application navigation (Home, Nearby, FirstAid, Contacts) |
| 4 | `@capacitor/core` | ^8.3.1 | Core runtime for Capacitor — bridges web code to native mobile APIs |
| 5 | `@capacitor/android` | ^8.3.1 | Android platform support for Capacitor — enables building native Android APKs |
| 6 | `@capacitor/cli` | ^8.3.1 | Command-line interface for Capacitor — manages native project synchronization and builds |
| 7 | `@capacitor/geolocation` | ^8.2.0 | Native GPS/location access plugin — provides high-accuracy position data on Android/iOS |
| 8 | `@capacitor/app` | ^8.1.0 | App lifecycle plugin — detects foreground/background state changes to refresh permissions |
| 9 | `@capacitor-community/text-to-speech` | ^8.0.0 | Native text-to-speech plugin — provides voice alerts during SOS and crash detection events |
| 10 | `capacitor-native-settings` | ^8.1.0 | Opens device settings screens (app permissions, location settings) from within the app |
| 11 | `capacitor-voice-recorder` | ^7.0.6 | Voice recording capability for potential future use in emergency audio capture |
| 12 | `leaflet` | ^1.9.4 | Open-source interactive map library — renders OpenStreetMap tiles and custom markers |
| 13 | `leaflet.markercluster` | ^1.5.3 | Leaflet plugin for clustering map markers when many POIs are displayed at lower zoom levels |
| 14 | `localforage` | ^1.10.0 | Offline-first storage library wrapping IndexedDB — caches map tiles and service data for offline use |
| 15 | `lucide-react` | ^1.14.0 | Modern, consistent SVG icon library — replaces emoji with professional icons throughout the UI |

### 6.2 Development Dependencies

| # | Package | Version | Purpose |
|---|---|---|---|
| 1 | `vite` | ^8.0.10 | Next-generation frontend build tool — fast HMR dev server and optimized production builds |
| 2 | `@vitejs/plugin-react` | ^6.0.1 | Vite plugin enabling React JSX/TSX support with Fast Refresh |
| 3 | `@vitejs/plugin-basic-ssl` | ^2.3.0 | Auto-generates self-signed SSL certificates for HTTPS in local development (required for Geolocation APIs in browsers) |
| 4 | `eslint` | ^10.2.1 | JavaScript/JSX linter for code quality and consistency |
| 5 | `@eslint/js` | ^10.0.1 | ESLint's recommended JavaScript rules |
| 6 | `eslint-plugin-react-hooks` | ^7.1.1 | Enforces React Hooks rules (dependency arrays, ordering) |
| 7 | `eslint-plugin-react-refresh` | ^0.5.2 | Validates that React components are compatible with Fast Refresh |
| 8 | `globals` | ^17.5.0 | Provides global variable definitions for ESLint (browser, Node.js) |
| 9 | `@types/react` | ^19.2.14 | TypeScript type definitions for React (used by IDE IntelliSense) |
| 10 | `@types/react-dom` | ^19.2.3 | TypeScript type definitions for React DOM (used by IDE IntelliSense) |

---

## 7. External APIs & Services

| # | Service | URL / Endpoint | Purpose | Authentication |
|---|---|---|---|---|
| 1 | **Overpass API** (OpenStreetMap) | `https://overpass-api.de/api/interpreter` | Primary source for nearby hospitals, ambulances, towing, repair shops — queries raw OSM data directly | None (free, public) |
| 2 | **Overpass Mirror** | `https://overpass.kumi.systems/api/interpreter` | Fallback mirror if primary Overpass server is slow or unavailable | None (free, public) |
| 3 | **Geoapify Places API** | `https://api.geoapify.com/v2/places` | Secondary place search for police, pharmacy, fuel stations — provides structured data with country filtering | API Key required |
| 4 | **Geoapify Reverse Geocode** | `https://api.geoapify.com/v1/geocode/reverse` | Converts GPS coordinates to human-readable address + country code | API Key required |
| 5 | **Nominatim** (OpenStreetMap) | `https://nominatim.openstreetmap.org/reverse` | Reverse geocoding for display in the location pill — returns city, country, and country code | None (free, public) |
| 6 | **OpenRouteService (ORS)** | `https://api.openrouteservice.org/v2/directions/driving-car` | Driving route calculation between user and destination | API Key required |
| 7 | **OpenStreetMap Tile Server** | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Map tile images rendered in the Leaflet map view | None (free, public) |
| 8 | **Google Maps** (deep link) | `https://www.google.com/maps/dir/` | Navigation links — opens Google Maps with driving directions to selected service | None (deep link) |

---

## 8. Project Folder Structure

```
RoadSOS/
├── android/                    # Capacitor Android native project
├── public/                     # Static assets (logo, icons)
├── src/
│   ├── components/
│   │   ├── BottomNav.jsx       # Tab-based bottom navigation bar
│   │   ├── LocationGuard.jsx   # Full-screen permission request overlay
│   │   └── MapView.jsx         # Leaflet map with offline tile support
│   ├── hooks/
│   │   ├── useLocation.js      # Two-phase GPS hook (network → satellite)
│   │   └── useAutoSync.js      # Background auto-download when user moves 30km
│   ├── pages/
│   │   ├── Home.jsx            # Main dashboard: SOS, actions grid, journey mode
│   │   ├── Nearby.jsx          # Service discovery: map/list views with filters
│   │   ├── FirstAid.jsx        # Accordion-style first aid guide
│   │   └── Contacts.jsx        # Emergency contacts CRUD + test SMS
│   ├── services/
│   │   ├── overpass.js          # Overpass API queries (ambulance, towing, etc.)
│   │   ├── geoapify.js          # Geoapify Places + reverse geocode
│   │   ├── ors.js               # OpenRouteService driving directions
│   │   └── offlineManager.js    # Map tile + POI caching via LocalForage
│   ├── utils/
│   │   ├── places.js            # Unified fetch + Haversine distance + type mapping
│   │   └── offlineDb.js         # IndexedDB offline storage operations
│   ├── App.jsx                  # Root component with routes
│   ├── main.jsx                 # Entry point with BrowserRouter
│   ├── config.js                # API keys (Geoapify, ORS)
│   └── index.css                # Complete design system (22KB+ of custom CSS)
├── capacitor.config.json        # Capacitor configuration
├── vite.config.js               # Vite build configuration
├── package.json                 # Dependencies and scripts
└── index.html                   # HTML entry point
```

---

## 9. Feature Descriptions

### 9.1 SOS Emergency Alert

- **Trigger:** One-tap SOS button on the home screen
- **Actions performed:**
  1. Voice announcement: *"SOS Activated. Emergency services will be contacted."*
  2. Fetches current GPS coordinates (two-phase: network → GPS)
  3. Composes an SMS with Google Maps link to all saved emergency contacts
  4. Opens the device's native SMS app pre-filled with the message
  5. Fetches and displays the nearest hospital with a call button
  6. Starts a 60-second countdown, then auto-dials the national emergency number (e.g., 112 for India)
  7. Shows quick-call buttons for Ambulance and Police
- **Cancel:** User can cancel the SOS at any time by tapping *"I'm okay — Cancel SOS"*

### 9.2 Automatic Crash Detection (Journey Mode)

- **Activation:** User toggles "Journey Mode" on the home screen
- **Detection Algorithm:**
  - Monitors simulated accelerometer data every 500ms
  - Flags a "spike" when G-force exceeds **2.5G** threshold
  - Requires **2 consecutive spikes** to confirm a crash (reduces false positives)
- **Response:**
  1. Full-screen overlay: *"Crash Detected!"*
  2. Voice announcement: *"Accident detected. Emergency services will be contacted."*
  3. 15-second countdown with cancel option (*"I'm OK — Cancel"*)
  4. If not cancelled, automatically triggers the full SOS flow

### 9.3 Nearby Emergency Services

- **Categories:** Hospitals, Ambulance, Police, Repair Shops, Towing, Pharmacy, Fuel Stations
- **Data Sources:**
  - **Primary:** Overpass API (OpenStreetMap) for hospitals, ambulance, towing, repair — richer phone data
  - **Fallback:** Geoapify Places API for police, pharmacy, fuel
- **Progressive Radius:** Automatically widens search from 10 → 25 → 50 → 100 km until results are found
- **Views:** Toggle between interactive Map View (Leaflet) and scrollable List View
- **Actions per service:** Call button (if phone available) + Navigate button (Google Maps deep link)
- **Distance:** Haversine formula calculates straight-line distance, sorted nearest-first
- **Filter strip:** Horizontal pill-based filter bar to switch between service categories

### 9.4 Offline Mode

- **Map Tile Caching:** Downloads OSM tiles for zoom levels 12–15 within a 50 km radius using LocalForage (IndexedDB)
- **POI Caching:** Stores fetched service data locally so it's available without internet
- **Custom Tile Layer:** Extended Leaflet TileLayer checks cached tiles before requesting from the network
- **Auto-Sync:** Background process (every 5 minutes) checks if user has moved 30+ km from last download center and silently refreshes cached data
- **Offline Banner:** Shows a warning strip *"Offline Mode Active — showing cached data"* when the device is disconnected

### 9.5 First Aid Guide

- Accordion-style expandable cards covering 7 emergency scenarios:
  1. Scene Safety First
  2. Check Breathing
  3. Stop Bleeding
  4. Suspected Spine Injury
  5. CPR Steps
  6. Trapped in Vehicle
  7. Vehicle Fire
- Quick-dial buttons for emergency numbers: 112, 108, 100, 101, 1033

### 9.6 Emergency Contacts Management

- Add/delete trusted contacts (name + 10-digit phone number)
- Stored in `localStorage` — persists across sessions
- "Message" button pre-fills an SMS to all saved contacts with test SOS message
- These contacts receive automated SMS during actual SOS/crash events

### 9.7 Voice Alerts (Text-to-Speech)

- Uses native `@capacitor-community/text-to-speech` on Android/iOS for reliable voice output
- Falls back to `Web Speech API (speechSynthesis)` on browsers
- Triggered during: SOS activation, crash detection

### 9.8 Location Management

- **Two-Phase GPS Strategy:**
  - Phase 1 (Fast): Network/WiFi/cell tower — low accuracy, 1–3s, works indoors
  - Phase 2 (Refine): GPS satellite — high accuracy, 5–15s, requires outdoor signal
- **Graceful Degradation:** Falls back to last cached coordinates if GPS fails
- **Auto-Retry:** Retries every 30 seconds when GPS signal is lost
- **Reverse Geocoding:** Displays human-readable city/country in the location pill
- **Permission Guard:** Full-screen overlay with step-by-step instructions if location access is denied

---

## 10. Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| **Capacitor over React Native** | Single web codebase that runs natively — simpler build pipeline, full access to web APIs, and native plugins for GPS/TTS |
| **Overpass API as primary data source** | OpenStreetMap's Overpass returns raw OSM data with all phone tag variants — significantly richer phone number coverage than commercial APIs for many regions |
| **Dual data source (Overpass + Geoapify)** | Overpass excels at hospitals/ambulance/repair; Geoapify is better for police/pharmacy/fuel — combining both maximizes coverage |
| **Progressive radius search** | Avoids showing "no results" — automatically widens from 10 to 100 km until services are found |
| **LocalForage for offline** | Wraps IndexedDB with a simple async API — better than localStorage for storing binary map tile blobs |
| **Two-phase GPS** | Network fix first gives instant UI feedback; GPS refines accuracy in the background — app never "hangs" waiting for satellite lock |
| **SMS over push notifications** | SMS works without internet and without any server infrastructure — critical for rural/highway emergencies |
| **Leaflet over Google Maps** | Free, open-source, no API key billing — and offline tile caching is straightforward |

---

## 11. Assumptions

### 11.1 Device & Hardware Assumptions

| # | Assumption |
|---|---|
| 1 | The user's device has a **GPS receiver** (built-in in all modern smartphones) |
| 2 | The device has an **active SIM card** capable of sending SMS messages |
| 3 | The device has a **working internet connection** for the initial loading of map tiles and nearby service data (offline mode works after first download) |
| 4 | The device runs **Android 6.0+** or **iOS 14+** for Capacitor compatibility |
| 5 | The device has a **speaker** for voice alert output |
| 6 | The device has **sufficient storage** (approximately 50–200 MB) for offline map tile caching |

### 11.2 Software & Permission Assumptions

| # | Assumption |
|---|---|
| 1 | The user **grants location permission** (GPS) to the application — required for all core features |
| 2 | The user has a **default SMS app** installed on the device for sending SOS messages |
| 3 | The user has **Google Maps** or a compatible navigation app installed for driving directions |
| 4 | A **modern web browser** (Chrome 80+, Safari 14+, Firefox 78+) is available if running in web mode |
| 5 | The device supports the **Web Speech API** or the native TTS plugin for voice alerts |

### 11.3 Network & API Assumptions

| # | Assumption |
|---|---|
| 1 | The **Overpass API** (OpenStreetMap) is publicly available and free to use without authentication |
| 2 | The **Geoapify API** free tier (3,000 requests/day) is sufficient for the app's usage pattern |
| 3 | The **Nominatim** reverse geocoding service is available and follows their usage policy (1 req/sec, User-Agent header) |
| 4 | **OpenStreetMap tile servers** are publicly available for map rendering |
| 5 | API responses are received within **15 seconds** (Overpass timeout is set to 30 seconds with a 15-second abort signal) |
| 6 | The app will function with **intermittent connectivity** — offline mode handles gaps, and online mode resumes automatically |

### 11.4 Data & Content Assumptions

| # | Assumption |
|---|---|
| 1 | **OpenStreetMap** has reasonably up-to-date data for hospitals, police stations, and other emergency services in the user's geographic area |
| 2 | **Phone numbers** extracted from OSM tags (`phone`, `contact:phone`, `mobile`, etc.) are accurate and callable |
| 3 | **Emergency numbers** are country-specific and pre-configured (India: 112/108/100/101, US: 911, UK: 999) |
| 4 | The **Haversine formula** provides sufficiently accurate distance calculations for the app's purpose (straight-line distance, not road distance) |
| 5 | **Crash detection** uses a simulated accelerometer — in production, real device accelerometer data would be used via native plugins |
| 6 | The **G-force threshold of 2.5G** with **2 consecutive spikes** is a reasonable heuristic for distinguishing real crashes from rough roads or phone drops |

### 11.5 User Behavior Assumptions

| # | Assumption |
|---|---|
| 1 | The user has **pre-saved at least one emergency contact** before a crash event occurs |
| 2 | The user **enables Journey Mode** before starting a drive for crash detection to be active |
| 3 | The user is a **driver or passenger** in a vehicle and will have the app running in the foreground during travel |
| 4 | The user or a bystander can **interact with the phone** within 15 seconds to cancel a false crash detection |
| 5 | Emergency contacts saved by the user have **valid, reachable phone numbers** |

---

## 12. Hardware & Software Requirements

### 12.1 For End Users (Running the App)

| Requirement | Minimum | Recommended |
|---|---|---|
| **OS** | Android 6.0 / iOS 14 | Android 10+ / iOS 16+ |
| **RAM** | 2 GB | 4 GB+ |
| **Storage** | 100 MB free | 500 MB free (for offline maps) |
| **GPS** | Built-in GPS receiver | A-GPS with GLONASS |
| **Internet** | Any (for initial data load) | 4G/LTE or WiFi |
| **Browser** (web mode) | Chrome 80+ | Chrome 100+ |

### 12.2 For Developers (Building the App)

| Requirement | Version |
|---|---|
| **Node.js** | 18.0+ |
| **npm** | 9.0+ |
| **Vite** | 8.0+ |
| **Android Studio** | Hedgehog (2023.1.1)+ |
| **JDK** | 17+ |
| **Xcode** (for iOS) | 15+ |

### 12.3 Build & Run Commands

```bash
# Install dependencies
npm install

# Start development server (HTTPS, exposed to network)
npm run dev

# Build production bundle
npm run build

# Sync with native project
npx cap sync

# Open Android project
npx cap open android
```

---

## 13. Testing Approach

| Test Type | Method |
|---|---|
| **Web Testing** | Vite dev server with HTTPS (`@vitejs/plugin-basic-ssl`) for Geolocation API access in browser |
| **Mobile Testing** | Capacitor Android build → real device via USB debugging |
| **Location Testing** | Chrome DevTools Sensors panel for simulating coordinates; real GPS on device |
| **Crash Detection** | Simulated via random G-force values in the code (production would use real accelerometer) |
| **Offline Testing** | Chrome DevTools → Network tab → "Offline" mode toggle |
| **SMS Testing** | "Message" button on Contacts page sends a test SOS to saved contacts |

---

## 14. Known Limitations

| # | Limitation |
|---|---|
| 1 | Crash detection currently uses **simulated accelerometer data** — real device accelerometer integration is pending |
| 2 | SMS sending relies on the device's **native SMS app** — the message is pre-filled but the user must press "Send" manually |
| 3 | Phone numbers from OpenStreetMap may be **outdated or missing** for some locations |
| 4 | The 10-digit phone validation in Contacts is specific to **Indian mobile numbers** — international formats need support |
| 5 | Offline map caching at 50 km radius across 4 zoom levels may consume **significant storage and data** |
| 6 | No **server-side backend** — all data is stored locally on the device |
| 7 | **Battery consumption** may increase with Journey Mode active (continuous accelerometer polling) |

---

## 15. Future Enhancements

| # | Enhancement | Description |
|---|---|---|
| 1 | **Real Accelerometer Integration** | Use `@capacitor/motion` or device sensors for actual crash detection |
| 2 | **Background Crash Detection** | Keep crash detection running even when the app is minimized |
| 3 | **Automatic SMS Sending** | Use native SMS plugins to send SMS without user confirmation |
| 4 | **Cloud Backend** | Firebase or Supabase for contact sync, crash history, and analytics |
| 5 | **Multi-language Support** | UI and first aid guide in regional languages (Hindi, Tamil, etc.) |
| 6 | **Emergency Audio Recording** | Record ambient audio during SOS for evidence |
| 7 | **Wearable Integration** | Connect with smartwatches for crash detection even when phone is in pocket |
| 8 | **Community Alerts** | Notify nearby RoadSOS users about accidents in the area |
| 9 | **International Phone Validation** | Support international phone number formats beyond 10-digit Indian numbers |

---

> **Document Prepared For:** Project Submission / Competition Evaluation
>
> **Application:** RoadSOS v1.0.0
>
> **Platform:** Android, iOS, Web (Capacitor Hybrid)
