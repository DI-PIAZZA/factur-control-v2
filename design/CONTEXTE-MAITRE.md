# 🎯 CONTEXTE MAÎTRE — factur-control

> **À coller (ou uploader) au début de chaque nouvelle conversation avec Claude.**
> Ce fichier contient tout ce qu'il faut savoir pour reprendre le projet instantanément.
> Dernière mise à jour : 28/05/2026

---

## 📌 INSTRUCTION POUR CLAUDE

Salut Claude ! Je m'appelle Stéphano. Je développe un SaaS nommé **factur-control**.
Ce document est mon contexte projet complet. Lis-le, puis on continue le travail.
Tu peux me tutoyer et m'appeler "mon pote", on a un ton amical et direct.

---

## 1. C'EST QUOI factur-control ?

Un **SaaS B2B** qui contrôle automatiquement si les **factures fournisseurs** respectent les **conditions tarifaires contractuelles** négociées.

**Workflow produit** :
1. L'utilisateur charge ses tarifs fournisseurs (PDF) → extraction par IA
2. Il charge une facture (PDF) → extraction par IA
3. L'app compare la facture au tarif → détecte les écarts de prix
4. L'app génère un PDF annoté + un mail de demande d'avoir pré-rédigé

**Cible** : PME du BTP, restauration, distribution (qui ont des contrats fournisseurs négociés).

---

## 2. MODÈLE ÉCONOMIQUE

| Plan | Prix HT/mois | Factures/mois |
|---|---|---|
| Starter | 49 € | 100 |
| Pro | 149 € | 500 |
| Business | 349 € | 1500 |

**2 options payantes prévues APRÈS la BETA** :
1. **Gestion des marges** (Net Net + Rentabilité + Marge) → +29 €/mois
2. **Comparatif multi-tarifs par famille d'articles** entre fournisseurs (Boissons, Surgelé, Alcool, Béton...) → +49 €/mois

Coût API observé : ~0,30 USD par extraction de tarif volumineux.

---

## 3. STACK TECHNIQUE

**Backend** : Python 3.12, FastAPI, SQLAlchemy 2.0 async, Alembic, PostgreSQL 16, MinIO/Scaleway S3, JWT
**IA** : API Anthropic (claude-sonnet-4-6) — extraction PDF en streaming
**Frontend** : React 18 + Vite + Tailwind CSS + Tabler Icons + Zustand + React Router v6 + Axios
**SMTP** : Brevo · **Paiement** : Stripe (phase 2) · **Hébergement** : Scaleway/OVH (France)
**Outils dev** : WSL2, Docker Desktop, Claude Code, Git, uv

---

## 4. LOGIQUE MÉTIER (POINT CRITIQUE)

### Structure d'une ligne de tarif (6 zones de prix)
```
TARIF DE BASE              (catalogue fournisseur)
   ↓ - Remise Fournisseur (% + €, cumulés)
TARIF NET SUR FACTURE      ← CONTRÔLÉ par l'app sur la facture (couleur VERTE)
   ↓ - Gratuité Producteur (X achetés / Y gratuits, même produit)
   ↓ - RFA Producteur     (% + €, cumulés)
   ↓ - RFA Fournisseur    (% + €, cumulés)
PRIX DE REVIENT NET NET    ← Calcul de marge (couleur ORANGE)
```

### Calculs
- **Tarif Net Facture** = Tarif Base − [(Base × %remise) + €remise]
- **Net Net** = Net Facture − gratuités − RFA producteur − RFA fournisseur
- **Marge** : Prix Vente HT = Prix Vente TTC / (1 + TVA) ; Marge € = Prix Vente HT − Net Net ; Taux = Marge / Prix Vente HT × 100

### Multi-documents par tarif (3 PDF possibles)
- Tarif catalogue (Tarif Base + Remise Fournisseur)
- Accord Producteur (Gratuités)
- Accord RFA fournisseur (RFA Producteur + RFA Fournisseur)

### Articles hors tarif
Surlignage violet sur la facture, 2 boutons "Ajouter au tarif" (Origine=Manuel) ou "Ignorer". Le mail d'avoir ne couvre QUE les écarts de prix.

### Seuils de rentabilité personnalisables (par secteur)
- Restauration : 60 % / 70 % / 80 % (défaut)
- BTP : 10 % / 20 % / 30 %
- Distribution : 5 % / 15 % / 25 %
- Personnalisé

---

## 5. CHARTE GRAPHIQUE

| Rôle | Hex |
|---|---|
| Fond principal | `#1D4ED8` (bleu électrique) |
| Header bandeau | `#1E40AF` |
| Cartes | blanc |
| Accent signature | `#E85A00` (orange) |
| Vert (Net Facture / conforme) | `#16A34A` |
| Rouge (écart prix) | `#DC2626` |
| Ambre (en cours / gratuité) | `#F59E0B` |
| Violet (hors tarif / RFA prod) | `#7C3AED` |
| Indigo (RFA fournisseur) | `#4338CA` |
| Texte foncé | `#1F2937` |

**Couleurs sémantiques métier** : Vert = Net Facture (contrôle) · Orange = Net Net (exploitation) · Bleu = Rentabilité/Marge
**Icônes** : Tabler Icons. **Police** : système (-apple-system...). **Refusé** : N2F (parasitisme), Material Design (trop neutre), violet/blanc (convergence IA).

---

## 6. ÉTAT D'AVANCEMENT

### ✅ FAIT
- **Sprint 1** (commit 70408ab) : Setup Docker, Auth, 9 modèles, super-admin (admin@factur-control.fr / Factur2026!)
- **Sprint 2** (commit c12a744) : Extraction tarif IA — testé sur ROSSI 84 (134 lignes, confiance high, 0,30 USD)
- **Design complet** : 12 écrans (Login, Dashboard, Résultat contrôle, Liste factures, Liste fournisseurs, Détail tarif standard + PC large, Modale avoir, Onboarding x3, Paramètres : Profil/Société/Sécurité/Mail-Signature/Notifications/Abonnement/Rentabilité)
- Brief design (.md + .html), Planning BETA, Mémo reprise, Prompt Sprint 3

### ⏳ À FAIRE — BETA (cible 19 juillet 2026)
- **Sprint 3** : Extraction factures IA (6-10h) ← PROCHAINE ÉTAPE
- **Sprint 4** : Algorithme comparaison facture vs tarif (15-25h) — CRITIQUE
- **Sprint 5** : Annotations PDF + mail d'avoir (8-12h)
- **Sprint 6** : Front React Setup + Auth + Dashboard (12-16h)
- **Sprint 7** : Front Fournisseurs + Tarifs (14-18h)
- **Sprint 8** : Front Factures + Contrôle (14-18h)
- **Sprint 9** : Responsive + Polish (8-12h)
- **Sprint 10** : Tests réels (10-15h)
- **Sprint 11** : Déploiement BETA (8-12h)

### 🔵 APRÈS BETA — V1 (cible mi-novembre 2026)
Corrections retours testeurs, Module Marges, Module Comparatif, Stripe, Console admin, SMTP perso/auto

### ⚠️ Périmètre BETA minimaliste
INCLUS : Auth, gestion fournisseurs/tarifs/factures, contrôle automatique, détection écarts + hors tarif, PDF annoté, mail d'avoir à copier-coller.
REPORTÉ V1 : Net Net, RFA multi-docs, Stripe, SMTP auto, console admin, section Marges.
⚠️ MAIS : prévoir DÈS le Sprint 4 les colonnes BDD pour les 6 zones tarifaires + table famille_articles (migration douloureuse sinon).

---

## 7. INFOS PRATIQUES

- **GitHub** : `DI-PIAZZA` · dépôt privé `https://github.com/DI-PIAZZA/factur-control.git`
- **Session Claude Code** : `claude --resume 143527ff-72de-4439-8f50-1e4024030d9d`
- **Dossier projet PC bureau** : `C:\Users\STEPHANO\Documents\Projets\factur-control`
- **Docs Dropbox** : `Dropbox > CREATION APPLICATION > Controle Factures > DESIGN CLAUDE`
- **Fournisseurs de test** : ROSSI 84 (Béton/Matériaux), POINT P AVIGNON, SAMSE, MATÉRIAUX DU SUD
- **Société** : DI PIAZZA SARL, Avignon (84). Identifiant : SIREN (9 chiffres, pas SIRET — moins d'erreurs)
- ⚠️ Le PDF de test ROSSI 84 contient des données commerciales sensibles, ne jamais le commit

---

## 8. RYTHME & PRÉFÉRENCES DE TRAVAIL

- Rythme : 3-4h/jour minimum, essaie de travailler plus pour raccourcir les délais
- Procède pas à pas, valide chaque étape
- Préfère messages courts et clairs, ton amical
- Communique en français exclusivement
- Travailleur méthodique, exigeant sur le design (couleurs, contrastes, alignements)
- Reste sur Claude (pas de migration vers une autre IA)

---

## 9. COMMENT M'AIDER AU MIEUX

- Quand je démarre une session, demande-moi sur quoi je veux travailler et combien de temps j'ai
- Pour le code : guide-moi étape par étape, propose des prompts prêts à coller dans Claude Code
- Pour le design : génère des mockups HTML que je peux ouvrir dans le navigateur
- Sauvegarde les livrables importants en fichiers que je range dans Dropbox
- Rappelle-moi les prochaines priorités à la fin de chaque session

---

*Fin du contexte maître. On peut commencer à travailler !*
