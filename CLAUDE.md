# CLAUDE.md — factur-control-v2

Ce fichier est le document de référence pour Claude Code. Lis-le entièrement avant toute action.

---

## Projet

**factur-control** — SaaS B2B de contrôle de facturation fournisseurs.
Cible initiale : restauration et BTP. Objectif : détecter les écarts de prix entre les tarifs négociés et les factures réelles.

**Statut actuel (juillet 2026) : MVP fonctionnel en développement actif.**
Le projet Next.js est initialisé et tourne. Les fonctionnalités de base (auth, fournisseurs, tarifs, factures, extraction IA, rapprochement) sont en place. On est en phase de consolidation et d'ajout de features.

---

## Emplacement du projet

```
C:\Dev\factur-control-v2\
```

Lancer le serveur de dev :
```bash
cd C:\Dev\factur-control-v2
npm run dev
# → http://localhost:3000
```

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 15 App Router + TypeScript |
| Style | Tailwind CSS (config minimale, inline styles pour l'essentiel) |
| Base de données | Supabase (PostgreSQL + RLS + Auth JWT) |
| LLM extraction | API Anthropic Claude (claude-opus-4-5) |
| Identité fournisseur | API gouvernementale française gratuite (remplace Pappers) |
| PDF grands volumes | Python + pypdf (auto-installé si absent) |

**Pas d'Edge Functions pour l'instant** — tout le traitement lourd est dans les API routes Next.js (src/app/api/).

---

## Variables d'environnement (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://sypimnsypjxynwyvmoph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<cle anon>
SUPABASE_SERVICE_ROLE_KEY=<cle service_role>
ANTHROPIC_API_KEY=<cle API Claude>
```

Ne jamais ecrire les cles en dur dans le code. Toujours via process.env.

---

## Architecture des fichiers

```
src/
  app/
    (auth)/
      login/page.tsx              <- Page de connexion
    dashboard/page.tsx            <- Tableau de bord (compteurs fournisseurs + factures)
    fournisseurs/
      page.tsx                    <- Liste des fournisseurs
      nouveau/
        page.tsx                  <- Formulaire ajout fournisseur (recherche SIREN)
        actions.ts                <- Server Actions : searchPappersAction, addFournisseurAction
      [id]/
        page.tsx                  <- Detail fournisseur (liste tarifs + bouton + tarif)
        tarif/
          nouveau/page.tsx        <- Upload tarif PDF ou Excel
    factures/
      page.tsx                    <- Liste des factures
      nouvelle/page.tsx           <- Upload facture PDF
    api/
      extract-tarif/route.ts      <- Extraction lignes tarif via Claude IA
      extract-facture/route.ts    <- Extraction lignes facture via Claude IA
      reconcile/route.ts          <- Rapprochement facture vs tarif
  components/
    Sidebar.tsx                   <- Navigation laterale
  lib/
    supabase/
      client.ts                   <- Client Supabase cote navigateur
      server.ts                   <- Client Supabase cote serveur (cookies)
  middleware.ts                   <- Protection des routes (auth)
migrations/
  001_initial_schema.sql
  002_rls_policies.sql
  003_six_price_zones.sql         <- Colonnes pour les 6 zones tarifaires
design/
  detail-tarif-pc-large.html      <- Mockup reference UI (14 colonnes)
  parametres-*.html               <- Mockups parametres
  RECAP-ECRANS.md                 <- Description des 17 ecrans prevus
```

---

## Base de donnees Supabase

**Project URL :** https://sypimnsypjxynwyvmoph.supabase.co

### Tables principales

| Table | Description |
|---|---|
| tenants | Entreprises clientes (multi-tenant) |
| profiles | Utilisateurs lies a auth.users + tenant_id |
| suppliers | Fournisseurs par tenant (SIRET unique par tenant) |
| price_references | Lignes de tarif de reference |
| invoices | Factures uploadees |
| invoice_lines | Lignes extraites des factures |
| reconciliation_alerts | Ecarts detectes (sur-facturation uniquement) |

### Colonnes importantes sur suppliers
- price_column (text) — nom de la colonne de prix choisie dans le tarif
- invoice_price_column (text) — colonne de prix cote facture

### Multi-tenant
Tout passe par current_tenant_id() (fonction SQL qui lit profiles.tenant_id pour auth.uid()). Les RLS policies sont dans 002_rls_policies.sql.

---

## API routes — comportement actuel

### /api/extract-tarif (POST)
Recoit un fichier tarif (PDF ou Excel), extrait les lignes via Claude IA.

**Logique PDF :**
- 100 pages ou moins -> envoi base64 direct a Claude (meilleure qualite)
- Plus de 100 pages -> extraction texte via Python/pypdf, puis envoi comme texte

**Logique Excel :**
- Conversion via Python (openpyxl ou xlrd) en texte tabule
- Extraction des colonnes prix directement depuis les headers

**Retourne :**
```json
{
  "fournisseur_detecte": "...",
  "coherent": true,
  "colonnes_prix": ["PU NET HT", "Prix Brut HT"],
  "lignes": [{ "ref_article": "...", "label": "...", "unit_price": 0.00, "unit": "..." }]
}
```

### /api/extract-facture (POST)
Idem pour les factures. Retourne les lignes avec line_type (article / consigne / remise_globale).

### /api/reconcile (POST)
Recoit invoice_id, compare invoice_lines vs price_references, insere dans reconciliation_alerts les ecarts superieur a 0,01 euro.

---

## Identite fournisseur — API gouvernementale (GRATUIT, sans cle)

Remplace Pappers. Endpoint :
```
https://recherche-entreprises.api.gouv.fr/search?q=<nom_ou_siren>&limit=8
```

Le mapping est dans src/app/fournisseurs/nouveau/actions.ts -> fonction mapGouvResult().
L'interface PappersResult est conservee pour la compatibilite avec les composants existants.

---

## Logique metier — 6 zones tarifaires (CRITIQUE)

```
TARIF DE BASE
   - Remise Fournisseur     (% + euros)
TARIF NET SUR FACTURE          <- CONTROLE (vert)
   - Gratuite Producteur    (X achetes / Y gratuits)
   - RFA Producteur         (% + euros)
   - RFA Fournisseur        (% + euros)
PRIX DE REVIENT NET NET        <- Exploitation (orange)
```

**MVP BETA — perimetre inclus :**
- Auth, fournisseurs, tarifs, factures
- Extraction IA (PDF + Excel)
- Rapprochement automatique + alertes sur-facturation
- Detection articles hors tarif
- Mail avoir a copier-coller

**Reporte V1 :** Net Net, RFA multi-docs, Stripe, SMTP auto, console admin, section Marges.

---

## Regles metier figees

- **Taxonomie line_type** : article / consigne / remise_globale. Seul article est rapproche.
- **Classifieur** (priorite descendante, insensible casse) :
  1. label contient CONSIGN / VIDE / EMBALLAGE -> consigne
  2. total inferieur a 0 OU label contient REMISE -> remise_globale
  3. sinon -> article
  - consigne prioritaire sur remise_globale (deconsigne = total negatif mais reste consigne)
- **Alerte = sur-facturation uniquement** : delta superieur a 0,01 euro
- **Colonne de controle choisie par fournisseur** (suppliers.price_column)
- **Deduplication fournisseurs** : contrainte UNIQUE (tenant_id, siret)
- **Articles hors tarif** : surlignage violet, boutons "Ajouter au tarif" ou "Ignorer"

---

## Charte graphique

| Role | Hex |
|---|---|
| Fond principal | #1D4ED8 |
| Header | #1E40AF |
| Boutons primaires | #E85A00 |
| Conforme / Net Facture | #16A34A |
| Ecart / erreur | #DC2626 |
| En cours | #F59E0B |
| Hors tarif | #7C3AED |
| RFA Fournisseur | #4338CA |
| Fond cartes | #FFFFFF |
| Texte | #1F2937 |

Icones : Tabler Icons (ti-*) uniquement.
Badges statut (90px fixes) : Conforme vert, X ecarts rouge, En cours jaune, Hors tarif violet.

---

## Donnees de test

- **ROSSI BOISSONS 84** — fournisseur de test principal (tarif Excel valide)
- **S.A.S. CDC** (SIRET 50085606700029, Sorgues 84700) — fournisseur test tarif PDF grand volume
- Les PDFs de test contiennent des donnees commerciales sensibles -> ne jamais committer.

---

## Modele economique

| Plan | Prix HT/mois | Factures/mois |
|---|---|---|
| Starter | 49 euros | 100 |
| Pro | 149 euros | 500 |
| Business | 349 euros | 1 500 |

Options V1 : Gestion des marges (+29 euros/mois), Comparatif multi-tarifs (+49 euros/mois)

---

## Style de collaboration avec Stephano

- Communication en **francais exclusivement**
- Ton amical, tutoiement, appeler l'utilisateur **"mon pote"**
- **Un seul sujet par echange**, messages courts
- **Attendre la validation** avant de passer a l'etape suivante
- Exigeant sur le **design** (couleurs, contrastes, alignements)
- Toujours **expliquer ce que tu vas faire avant de le faire**
- L'utilisateur n'est pas developpeur — vulgariser sans condescendance

---

## Prochaines priorites (par ordre)

1. **Page resultat rapprochement** — afficher les alertes apres controle facture (avec couleurs metier)
2. **Detail tarif** — ecran 14 colonnes (voir mockup design/detail-tarif-pc-large.html)
3. **Selection colonne de controle** — UI pour choisir price_column par fournisseur
4. **Mail avoir** — modale generant le texte a copier-coller
5. **PDF annote** — export facture avec surlignage des ecarts
6. **Stripe** — integration paiement (V1)
