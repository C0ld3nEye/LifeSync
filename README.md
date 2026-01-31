# LifeSync v1.0.0 🏠

LifeSync est une application de gestion de foyer intelligente, conçue pour synchroniser la vie de famille : courses, repas, tâches ménagères, budget et santé.

## 🚀 Fonctionnalités Clés

*   **🛒 Courses Intelligentes** : Liste de courses partagée, tri automatique par rayons, et suggestion de recettes basées sur les restes.
*   **📅 Planification de Repas (IA)** : Génération de menus hebdomadaires par IA (Gemini) en tenant compte de l'inventaire, des goûts et de l'agenda.
*   **🧹 Tâches & Points** : Gamification des corvées avec un système de points et de récompenses.
*   **💰 Budget Partagé** : Suivi des dépenses communes et calcul automatique des régularisations.
*   **🏥 Santé & Animaux** : Rappels de médicaments et suivi vétérinaire.
*   **🤖 Assistant IA** : Suggestions proactives et chat avec le foyer.

## 🛠️ Installation & Démarrage (Local)

### Prérequis
*   Node.js 18+
*   Compte Firebase (avec Firestore activé)
*   Clé API Google Gemini

### 1. Configuration
Créez un fichier `.env.local` à la racine :

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=votre_clé
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# IA
NEXT_PUBLIC_GEMINI_API_KEY=votre_clé_gemini

# Notifications (Telegram)
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=votre_token_bot
```

### 2. Installation
```bash
npm install
```

### 3. Lancement Développement
```bash
npm run dev
# Accès sur http://localhost:3000
```

## 🌍 Déploiement & Production (Freebox / VM)

L'application est optimisée pour tourner sur un serveur Node.js (ex: VM Freebox) via **PM2**.

### 1. Build
Avant de lancer en prod, compilez l'application :
```bash
npm run build
```

### 2. Lancement avec PM2 (Recommandé)
Un fichier `ecosystem.config.js` (ou équivalent) est recommandé, ou lancez directement :

```bash
# Lancer l'App Web (Port 3000)
pm2 start npm --name "lifesync-web" -- start

# Lancer le Scheduler (Tâches de fond)
pm2 start scripts/scheduler.js --name "lifesync-scheduler"
```

### 3. Le Scheduler (`scripts/scheduler.js`)
Ce script est CRITIQUE. Il tourne en fond pour :
*   Envoyer les rappels Telegram (Rendez-vous, Médicaments).
*   Générer les défis quotidiens le matin.
*   Vérifier les échéances de budget.

**Monitoring du Scheduler :**
Il envoie un "Heartbeat" toutes les minutes dans Firestore (`system/scheduler`). S'il plante, les logs sont aussi envoyés dans Firestore.

## ⚠️ Dépannage Courant

### "Mes courses ne se cochent pas"
Vérifiez votre connexion internet. L'application utilise les updates optimistes, mais a besoin du réseau pour confirmer.

### "L'IA ne génère pas de repas"
*   Vérifiez que votre clé `NEXT_PUBLIC_GEMINI_API_KEY` est valide.
*   Les modèles Gemini peuvent être saturés (Erreur 429/503). L'app réessaie automatiquement, mais attendez 1 minute si ça persiste.

### "Le Scheduler ne notifie pas"
*   Vérifiez que le processus tourne : `pm2 status`.
*   Regardez les logs : `pm2 logs lifesync-scheduler`.
*   Assurez-vous que le `service-account.json` (si utilisé) est bien présent pour les droits admin Firebase.

## 📦 Structure du Projet (v1.0)

*   `src/app` : Pages (Next.js App Router).
*   `src/components` : Composants UI réutilisables.
*   `src/hooks` : Logique métier (useShopping, useChores...).
*   `src/lib` : Utilitaires (Gemini, Firebase, Dates).
*   `scripts/` : Scripts backend (Scheduler).

---
*LifeSync v1.0.0 - Développé avec ❤️ par Loric & Gemini.*
