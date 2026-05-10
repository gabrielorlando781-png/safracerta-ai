# SafraCerta.ai Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete agricultural management system with voice-first recording and AI pest detection.

**Architecture:** Single Page Application (SPA) with a Node.js/Express backend. Uses rule-based NLP for text/voice parsing and TensorFlow.js for on-device computer vision.

**Tech Stack:** Vanilla JS, HTML, CSS, Node.js, Express, TensorFlow.js.

---

### Task 1: Backend Infrastructure
- Create `server.js` with Express.
- Implement file-based JSON storage for activities, plots, and financials.
- Set up API routes for dashboard, activity logging, and history.

### Task 2: Frontend Design System
- Create `public/css/styles.css` with a premium, rural-modern aesthetic.
- Implement mobile-first responsive layout with big touch targets.
- Design voice interaction modal and navigation system.

### Task 3: NLP & Input Engine
- Create `public/js/nlp.js` with Portuguese grammar rules.
- Implement value extraction, category matching, and plot detection.
- Integrate Web Speech API for voice-to-text.

### Task 4: MIP (Pest Detection) Engine
- Create `public/js/mip.js` with TensorFlow.js integration.
- Load MobileNet for feature extraction.
- Implement logic to map vision results to specific Brazilian pests (Pulgão, Vaquinha, Percevejo).

### Task 5: Integration & Offline Mode
- Implement `public/js/app.js` to coordinate views and data flow.
- Add LocalStorage caching for offline recording.
- Implement auto-sync logic when connection returns.
