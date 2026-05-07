# Digital Health Twin

Digital Health Twin is an interactive health simulation platform developed during **Start Hack**.  
The project combines voice interaction, clinical data analysis, future health projections, and privacy-focused consent management into a single experience.

Instead of relying on static dashboards and disconnected health metrics, the platform allows users to interact conversationally with a digital representation of themselves — a **health twin** capable of explaining current health status, projecting future risks, and simulating how lifestyle or treatment changes may affect long-term outcomes.

---

# Overview

At its core, the application transforms raw patient data into a dynamic clinical simulation environment.

The system normalizes biomarkers such as:
- blood pressure
- cholesterol
- glucose levels
- weight
- other clinical indicators

to generate:
- interpretable risk trajectories
- personalized health insights
- future projections
- interactive simulations

Rather than simply displaying numbers, the twin contextualizes them and explains how combinations of biomarkers contribute to future health evolution.

---

# Main Features

## Voice Health Twin

Users can interact naturally using voice or text.

Example questions:
- “What are my heart risks?”
- “What happens if I continue this lifestyle?”
- “How would losing weight affect my future health?”

The assistant responds using the patient’s health context and generates adaptive visualizations showing:
- projected trajectories
- biomarker trends
- simulation outcomes
- personalized explanations

The experience is designed to feel less like reading a dashboard and more like having a conversation with a future version of yourself.

---

## Clinical Simulation Engine

The platform includes a simulation layer allowing users to explore how lifestyle or treatment changes could affect long-term outcomes.

Examples:
- improving diet
- exercising regularly
- lowering LDL cholesterol
- losing weight

The interface compares:
- current trajectory
- improved trajectory

to help users understand how their decisions influence future health.

---

## Interactive Visualizations

The application dynamically generates:
- risk projections
- biomarker trend charts
- timeline simulations
- scenario comparisons

The visual system adapts depending on the question asked by the user.

---

## Privacy & Web3 Consent Layer

Health data remains under patient control.

Blockchain technology is used only as a:
- consent layer
- access-control mechanism

Medical records are **never stored on-chain**.

The system only records:
- patient wallet
- doctor wallet
- permission status
- access expiration

A dedicated consent portal allows patients to:
- grant temporary access
- revoke access
- control who can access their medical data

---

# Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Claude API
- Web Speech API
- Recharts
- Web3 / Smart Contracts

---

# Project Structure

```txt
digital-twin/
├── app/
│   ├── api/               # Backend API routes
│   ├── voice/             # Main voice simulation interface
│   ├── profile/           # Patient dashboard
│   ├── consent/           # Web3 consent portal
│   └── layout.tsx
├── components/            # Reusable UI components
├── lib/                   # Clinical logic & utilities
├── public/patients/       # Sample patient data
└── types/                 # TypeScript types
```

---

# Getting Started

## Install dependencies

```bash
npm install
```

## Configure environment variables

```bash
cp .env.example .env.local
```

Add your API keys and configuration values to `.env.local`.

---

## Run the development server

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

# Notes

- Chrome or Edge recommended for voice interaction
- Speech recognition requires microphone permissions
- HTTPS is required for production voice support

---

# Vision

The goal of Digital Health Twin is not only to display medical information, but to help users understand how their choices influence their future health — through conversation, simulation, and personalized insight.
