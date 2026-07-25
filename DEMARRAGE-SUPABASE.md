# 🚀 Démarrage factur-control v2 — Supabase + Next.js

> Créé le 10/06/2026. Ce fichier guide la création du compte Supabase et le lancement du projet.

---

## Étape 1 — Créer le compte Supabase (5 min)

1. Va sur **https://supabase.com**
2. Clique **"Start your project"** (bouton vert, en haut à droite)
3. Clique **"Continue with GitHub"**
4. Connecte-toi avec le compte **DI-PIAZZA** (ou ton compte GitHub perso si tu préfères)
5. Autorise Supabase à accéder à ton GitHub → clique **"Authorize supabase"**
6. Supabase te demande ton **nom d'organisation** → tape `di-piazza` ou `factur-control`
7. ✅ Compte créé — tu arrives sur le dashboard

---

## Étape 2 — Créer le projet Supabase (3 min)

1. Sur le dashboard, clique **"New project"**
2. Remplis :
   - **Name** : `factur-control`
   - **Database Password** : génère un mot de passe fort → **COPIE-LE**, tu en auras besoin
   - **Region** : `West EU (Ireland)` — le plus proche de la France
   - **Plan** : `Free` pour démarrer (2 projets gratuits, 500 MB BDD)
3. Clique **"Create new project"** → attends ~2 minutes que ça s'installe
4. Une fois prêt, va dans **Settings > API** et note :
   - `Project URL` (ex: `https://xxxx.supabase.co`)
   - `anon public` key
   - `service_role` key (⚠️ garder secrète, jamais dans le frontend)

---

## Étape 3 — Lancer Claude Code pour le nouveau projet

Une fois le projet Supabase créé, ouvre **Ubuntu (WSL)** et tape :

```bash
mkdir -p /mnt/c/Users/STEPHANO/Documents/Projets/factur-control-v2
cd /mnt/c/Users/STEPHANO/Documents/Projets/factur-control-v2
claude
```

Puis colle le **prompt ci-dessous** dans Claude Code.

---

## 📋 Prompt à coller dans Claude Code (v2 — Supabase)

```
Salut ! On repart de zéro sur factur-control avec une nouvelle stack.

## Contexte métier (ne pas réinventer)
Application de contrôle de facturation fournisseurs pour la restauration :
- Ingestion de factures PDF → extraction des lignes articles via LLM
- Référentiel tarifs fournisseurs (Excel/PDF)
- Moteur de rapprochement facture ↔ tarif → alertes sur-facturation
- Multi-tenant (chaque client = ses propres fournisseurs, factures, tarifs)
- Commercialisation prévue → SaaS multi-tenant avec abonnements

## Acquis fonctionnels (à réimplémenter)
- Taxonomie lignes : `article` / `consigne` / `remise_globale` (seul `article` est rapproché)
- Classifieur par mot-clé (CONSIGN/VIDE/EMBALLAGE → consigne ; REMISE + total<0 → remise_globale)
- Déduplication fournisseurs par tenant uniquement
- Identité fournisseur = dénomination officielle + SIRET via API Pappers
- Alertes sur-facturation uniquement (tolérance ~1 centime)
- Colonne de contrôle choisie par fournisseur (libellé ne fait pas foi)

## Nouvelle stack
- **Frontend** : Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Backend** : Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Extraction LLM** : API Anthropic Claude (côté Edge Function ou API Route Next.js)
- **Cible** : PWA (iOS/Android/PC) + possible app React Native Expo plus tard

## Ce que j'ai côté Supabase
- Projet créé : URL = [COLLER ICI L'URL SUPABASE]
- anon key = [COLLER ICI]

## Objectif de cette session
Cadrer l'architecture et créer le squelette du projet :
1. Initialiser le repo Next.js avec Supabase
2. Définir le schéma BDD Supabase (tables : tenants, suppliers, invoices, invoice_lines, tariffs, tariff_lines)
3. Mettre en place l'auth Supabase (multi-tenant avec Row Level Security)
4. Première page : upload d'une facture PDF

Important : je ne suis pas expert et je sature vite → UN SEUL POINT À LA FOIS, messages courts, fais-moi valider chaque étape.

Commençons par le schéma BDD — montre-moi la structure des tables avant de toucher au code.
```

---

## 🏗️ Architecture cible (référence)

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│         Next.js 14 (App Router) + PWA            │
│              TypeScript + Tailwind               │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│                  SUPABASE                        │
│  ┌──────────┐ ┌────────┐ ┌──────────────────┐   │
│  │PostgreSQL│ │  Auth  │ │  Storage (PDFs)  │   │
│  │  + RLS   │ │ (JWT)  │ │                  │   │
│  └──────────┘ └────────┘ └──────────────────┘   │
│  ┌─────────────────────────────────────────┐     │
│  │         Edge Functions                   │     │
│  │  - extract_invoice (Claude API)          │     │
│  │  - reconcile                             │     │
│  │  - pappers_lookup                        │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

## 💡 Avantages vs ancienne stack

| Ancienne (Docker + Python) | Nouvelle (Next.js + Supabase) |
|---------------------------|-------------------------------|
| Setup complexe (Docker)   | Pas de serveur à gérer        |
| PostgreSQL local           | PostgreSQL hébergé + backups  |
| Pas d'auth                 | Auth intégrée (JWT, OAuth)    |
| Un seul tenant             | Multi-tenant natif (RLS)      |
| Desktop only               | iOS + Android + PC (PWA)      |
| Pas de SaaS                | Prêt pour facturation clients |
