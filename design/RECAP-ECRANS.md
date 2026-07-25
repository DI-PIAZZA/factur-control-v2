# 📋 Récapitulatif des écrans conçus — factur-control

> Inventaire complet de tous les écrans/mockups réalisés
> Date de génération : 28/05/2026
> Total : 12 écrans clés + variantes

---

## 🗂️ Vue d'ensemble

| # | Écran | Desktop | Tablette | Mobile | Fichier HTML |
|---|---|---|---|---|---|
| 0 | Login (split-screen sombre) | ✅ | — | — | — |
| 1 | Dashboard accueil | ✅ | ✅ | ✅ | — |
| 2 | Résultat contrôle (PDF annoté + écarts + hors tarif) | ✅ | — | ✅ | — |
| 3 | Liste factures (tableau/cartes) | ✅ | ✅ | ✅ | — |
| 4 | Liste fournisseurs (cartes pliables) | ✅ | — | ✅ | — |
| 5 | Détail tarif (standard 5 colonnes + panneau latéral) | ✅ | — | ✅ | — |
| 5b | **Détail tarif PC large (14 colonnes)** | ✅ | — | — | ✅ `factur-control-detail-tarif-pc-large.html` |
| 6 | Modale demande d'avoir (mail IA pré-rédigé) | ✅ | — | ✅ | — |
| 7a | Onboarding bienvenue (vidéo) | ✅ | — | — | — |
| 7b | Onboarding visite (3 étapes) | ✅ | — | — | — |
| 7c | Onboarding félicitations | ✅ | — | — | — |
| 8 | Paramètres > Rentabilité (seuils marge) | ✅ | — | — | — |
| 9 | **Paramètres > Profil + Société** | ✅ | — | — | ✅ `factur-control-parametres-profil.html` |
| 10 | **Paramètres > Sécurité** | ✅ | — | — | ✅ `factur-control-parametres-securite.html` |
| 11 | **Paramètres > Mail & Signature** | ✅ | — | — | ✅ `factur-control-parametres-mail-signature.html` |
| 12 | **Paramètres > Notifications** | ✅ | — | — | ✅ `factur-control-parametres-notifications.html` |
| 13 | **Paramètres > Abonnement** | ✅ | — | — | ✅ `factur-control-parametres-abonnement.html` |

**Total : 17 écrans/variantes conçus**
**6 fichiers HTML disponibles** (les autres écrans sont décrits dans le brief design)

---

## 0️⃣ ÉCRAN LOGIN

**Style** : Split-screen 60/40, mode sombre
**Fond principal** : `#0F172A` (bleu nuit)

### Composants
- **Côté gauche** (60%) : formulaire
  - Logo FC + nom "factur-control"
  - Titre "Connexion à votre compte"
  - Champ E-mail
  - Champ Mot de passe (avec œil afficher/masquer)
  - Checkbox "Se souvenir de moi"
  - Bouton "Se connecter" (orange `#E85A00`)
  - Lien "Mot de passe oublié ?"
  - Lien "Créer un compte"
- **Côté droit** (40%) : visuel
  - Icône `ti-shield-check` énorme
  - Texte d'accroche : "Contrôlez vos factures fournisseurs en toute simplicité"
  - 3 features : Détection automatique · Mail d'avoir IA · Gain de temps

### Ton
Sobre, B2B, vouvoiement

---

## 1️⃣ DASHBOARD ACCUEIL

**Style** : Fond bleu `#1D4ED8`, cartes blanches

### Composants
- **Header** : Logo FC + nom + quota factures + avatar utilisateur
- **Titre** : "Bonjour [Prénom]" + ligne séparatrice orange
- **2 zones d'action côte à côte** :
  - 📄 **Carte gauche** : Nouveau fournisseur / tarif
    - Icône orange `ti-file-text`
    - Titre "Charger un tarif"
    - Description courte
    - **Bouton orange "Téléverser un tarif"**
  - 🧾 **Carte droite** : Contrôler une facture
    - Icône bleue `ti-receipt`
    - Titre "Contrôler une facture"
    - Description courte
    - **Bouton orange "Contrôler une facture"**
  → Les 2 boutons sont **identiques visuellement** (orange plein, même style)
- **Section "Activité récente"** : 2-5 dernières actions avec icônes contextuelles

### Mobile
2 zones empilées verticalement (1 colonne)

---

## 2️⃣ RÉSULTAT DE CONTRÔLE

**Style** : Fond bleu, layout dense

### Layout desktop
- **Bandeau supérieur** : titre facture + boutons "PDF annoté" + "Relancer"
- **5 KPI alignés** :
  - Écarts prix (rouge)
  - Hors tarif (violet)
  - Sur-facturation €
  - Lignes contrôlées
  - Conformes
- **2 colonnes 50/50** :
  - **Gauche** : PDF de la facture avec annotations
    - Surlignage rouge + pastille numérotée (1, 2, 3...) → Écart prix
    - Surlignage violet + pastille lettrée (A, B...) → Hors tarif
  - **Droite** : Liste des écarts + Articles hors tarif

### Articles hors tarif
- 2 boutons par article :
  - ✅ **"Ajouter au tarif"** (vert plein) → intègre avec Origine=Manuel
  - ❌ **"Ignorer"** (blanc outlined)

### CTA principal
- Gros bouton orange : **"Générer la demande d'avoir"**
- Sous-texte : "L'avoir portera uniquement sur les X écarts de prix (XX,XX € au total)"

### Mobile
Transformation en onglets : "PDF facture" / "Écarts (5)"
Bouton CTA toujours visible en bas

---

## 3️⃣ LISTE DES FACTURES

### Composants
- **KPI en haut** : Total / Conformes / Avec écarts / Sur-facturation €
- **Filtres** :
  - Recherche
  - Statut
  - Période (raccourcis : 7j / 30j / 3 mois / Année)
  - Tri
- **Tableau desktop** (7 colonnes) :
  - N° · Fournisseur (tri par défaut A→Z) · Date · Montant · Statut (badge) · Écart · Chevron
- **Toggle** : Tableau ↔ Cartes
- **Mobile** : cartes empilées avec bordure gauche colorée
- **Export** : Excel / CSV / PDF

### Badges de statut (largeur uniforme 90px)
- 🟢 "Conforme" (vert `#16A34A`)
- 🔴 "X écarts" (rouge `#DC2626`)
- 🟡 "En cours" (ambre `#F59E0B`)
- 🟣 "Hors tarif" (violet `#7C3AED`)

---

## 4️⃣ LISTE FOURNISSEURS

### Composants
- **Header** : "Mes fournisseurs" + "X fournisseurs · X tarifs actifs" + bouton "+ Ajouter un fournisseur"
- **Recherche** intégrée
- **Cartes fournisseur pliables** :
  - Icône `ti-building-warehouse` + nom du fournisseur
  - **E-mail + téléphone empilés verticalement** (e-mail au-dessus)
  - Date de chargement du tarif (à droite, sous le badge statut)
  - Badge **"Tarif actif"** (vert) ou **"Contact manquant"** (ambre + bordure pointillée orange)
  - Bouton crayon ✏️ (édition contacts)
  - Bouton "Voir le tarif"
  - Chevron pour déplier l'historique des anciens tarifs

---

## 5️⃣ DÉTAIL D'UN TARIF (STANDARD)

### Header
- Titre : "Tarif [année] — [Fournisseur]" + badge "Actif"
- Méta : nombre de lignes, nombre de documents source, période de validité
- Boutons : "Documents (3)" + "Colonnes" + "Exporter"

### Zone "Documents du tarif" (multi-PDF par tarif)
3 cartes côte à côte :
- 🔵 **Tarif catalogue** (PDF de base)
- 🟡 **Accord Producteur** (gratuités)
- 🟣 **Accord RFA fournisseur** (RFA)
+ Bouton dashed "Ajouter un document complémentaire"

### Catégories pliables (5 par défaut)
- Béton (`#FAECE7` / orange)
- Ferraillage (`#DBEAFE` / bleu)
- Granulats (`#FEF3C7` / ambre)
- Liants (`#EAF3DE` / vert)
- Services (`#F3F4F6` / gris)

### Tableau standard (5 colonnes)
| Réf. | Désignation | Unité | Net facture 🟢 | Sources |

→ Au clic sur une ligne : ouverture du **panneau latéral détaillé** (340-380px)

### Panneau latéral (clic sur ligne)
Sections empilées verticalement :
1. Tarif de base (gris)
2. Remise fournisseur (rouge)
3. **Net Facture** 🟢 (mise en valeur, calculé)
4. Gratuité Producteur (ambre)
5. RFA Producteur (violet)
6. RFA Fournisseur (indigo)
7. **Prix de Revient Net Net** 🟠 (mise en valeur, calcul détaillé visible)
8. **Rentabilité** 🔵 :
   - Unité de Vente (dropdown)
   - Taux TVA (dropdown : 20%, 10%, 5,5%, 2,1%)
   - Prix Vente TTC (saisie)
   - Prix HT calculé
   - Dont TVA
   - **Marge € + Taux Marge** (avec couleurs selon seuils personnalisés)

### Footer
- Bouton orange "Modifier"
- Bouton rouge "Supprimer"

---

## 5️⃣b DÉTAIL TARIF — VERSION PC LARGE (≥ 1280px)

**📁 Fichier : `factur-control-detail-tarif-pc-large.html`**

### Tableau 14 colonnes complètes
Avec 3 zones colorées de mise en valeur :

| Colonne | Couleur |
|---|---|
| Réf. · Désignation · Unité · Tarif base | Neutre |
| **Remise fourn.** (% + €) | 🔴 Rouge pâle |
| **Net facture** 🟢 | 🟢 Vert (séparateur droit épais) |
| **Gratuité** (Acheter+Gratuit) | 🟡 Ambre |
| **RFA Prod.** (% + €) | 🟣 Violet |
| **RFA Fourn.** (% + €) | 🔵 Indigo (séparateur droit orange) |
| **Net Net** 🟠 | 🟠 Orange |
| Sources | Neutre |

Mode "Affichage personnalisé" : bouton "Colonnes" pour choisir les colonnes visibles.

---

## 6️⃣ MODALE DEMANDE D'AVOIR

**Style** : Modale 760px centrée avec arrière-plan assombri

### Composants
- **Header** : titre "Demande d'avoir — [Fournisseur]" + sous-titre méta
- **Bandeau IA** : icône ✨ + "Mail généré par l'IA" + bouton "Régénérer"
- **Champs** :
  - **De** (read-only, depuis profil utilisateur)
  - **À** (pré-rempli depuis fiche fournisseur)
  - **Copie (Cc)** vide
  - **Objet** pré-rempli
  - **Corps du mail** avec éditeur enrichi (gras, italique, listes...)
  - **Tableau récapitulatif** des écarts intégré dans le corps
- **Pièces jointes** (cochées par défaut) :
  - 📄 Facture annotée PDF
  - 📄 Tarif contractuel PDF
- **Footer** : 3 boutons :
  - "Annuler"
  - "Enregistrer brouillon"
  - **"Envoyer la demande"** (orange)

### Mobile
Modale plein écran, sans champ "De" ni "Cc"

---

## 7️⃣ ONBOARDING (3 ÉCRANS)

### 7a — Modale de bienvenue
- Header bleu avec icône 🎉 et "Bienvenue [prénom] !"
- **Lecteur vidéo 16:9** (30s d'explication produit)
- **3 mini-cartes du workflow** : Chargez → Contrôlez → Réclamez
- 2 boutons :
  - "Commencer la visite guidée" (orange)
  - "Explorer par moi-même" (blanc)

### 7b — Visite guidée (3 étapes)
**Mécanique** : voile noir + spotlight orange + bulle d'aide

**Bulle d'aide** :
- Badge "ÉTAPE X SUR 3"
- Barre de progression (3 traits)
- Titre + texte
- Boutons "Précédent / Passer / Suivant"

**Les 3 étapes** :
1. "Commencez par charger un tarif" → pointe la carte gauche du dashboard
2. "Puis contrôlez une facture" → pointe la carte droite
3. "Suivez votre activité ici" → pointe la section Activité récente

→ Bouton final "Terminer" (vert au lieu d'orange)

### 7c — Modale de félicitations
- Bandeau vert dégradé avec icône 🎉 et confettis
- Titre : "Vous êtes prêt !"
- Texte : "Vous savez maintenant l'essentiel"
- Encart "💡 Astuce" : rappel pour relancer la visite
- 2 boutons :
  - "Charger mon premier tarif" (orange)
  - "Je le ferai plus tard" (texte gris)

---

## 8️⃣ PARAMÈTRES > RENTABILITÉ

### Préréglages (4 boutons)
- 🍳 **Restauration** (60% / 70% / 80%) — par défaut sélectionné
- 🏗️ **BTP / Bâtiment** (10% / 20% / 30%)
- 🛒 **Distribution** (5% / 15% / 25%)
- ⚙️ **Personnalisé**

### Composants
- **Barre de prévisualisation** colorée (rouge / ambre / vert / vert foncé) selon les seuils
- **3 champs de saisie** : Seuil Faible / Moyen / Bon (en %)
- **Aperçu en bas** : exemple concret avec les articles réels
- **Section TVA par défaut** : 20% / 10% / 5,5% / 2,1%

---

## 9️⃣ PARAMÈTRES > PROFIL + SOCIÉTÉ

**📁 Fichier : `factur-control-parametres-profil.html`**

### Profil personnel
**Layout 2 colonnes** :
- **Gauche** : Avatar 88px en cercle orange + bouton "Changer"
- **Droite** : 6 champs en grille 2×3
  - Prénom * / Nom *
  - E-mail * (avec badge vert "E-mail vérifié")
  - Téléphone
  - Fonction (libre : "Gérant", "Comptable"...)
  - Langue (Français par défaut)

**Info utile** : "Compte créé le 15 mars 2026" en haut à droite

### Société
**Bouton magique** en haut à droite : **"🔄 Récupérer via SIREN"**
→ Appelle l'API INSEE/SIRENE pour pré-remplir automatiquement

**Champs structurés** :
- Raison sociale * (sur toute la largeur)
- **SIREN ** (9 chiffres, validation auto ✓)
- N° TVA Intracom.
- Forme juridique (SARL, SAS, SASU, EURL, SA, Auto-entrepreneur)
- Secteur (BTP, Restauration, Distribution, Autre)
- Adresse complète (rue + code postal + ville + pays)

**Encart vert d'info** en bas : explique la récupération automatique SIREN via INSEE

---

## 🔟 PARAMÈTRES > SÉCURITÉ

**📁 Fichier : `factur-control-parametres-securite.html`**

### Zone 1 — Modifier le mot de passe
- **Mot de passe actuel** (avec œil afficher/masquer)
- **Nouveau mot de passe** (avec indicateur de force vert "Mot de passe robuste")
- **Confirmation** du nouveau mot de passe
- **Encart règles** : 12 caractères min, majuscule + minuscule + chiffre + caractère spécial

### Zone 2 — Sessions actives
3 appareils listés en exemple :
- 🔵 **PC Windows · Chrome 124** (Session actuelle, fond bleu pâle, bordure bleue)
- 📱 iPhone 15 · Safari (Avignon) — bouton "Déconnecter"
- 💻 PC Firefox (Paris) — bouton "Déconnecter"

**Infos par session** : appareil, navigateur, ville, IP, dernière activité

**Bouton global** en bas : "Déconnecter tous les autres appareils"

> **Note** : Pas de 2FA — choix simplifié pour la cible PME

---

## 1️⃣1️⃣ PARAMÈTRES > MAIL & SIGNATURE

**📁 Fichier : `factur-control-parametres-mail-signature.html`**

### Zone 1 — Envoi des mails
**2 cartes radio côte à côte** :
- 🟢 **Service factur-control (Brevo)** — sélectionnée par défaut, bordure bleue
- 🟡 **Mon SMTP personnel** — grisée avec badge "BIENTÔT" (V1)

**Message rassurant** : "Pour la BETA, tous les mails sont envoyés via notre infrastructure Brevo."

### Zone 2 — Éditeur de signature riche
**Barre d'outils complète** (15 boutons) :
- 🅱️ Gras / 🇮 Italique / Souligné
- 🎨 Couleur / 📐 Taille
- • Liste / 1. Liste numérotée
- 🔗 Lien / 🖼️ Image / 🏢 **Logo société** (bouton spécifique)
- ↶ Annuler / ↷ Refaire

**Bouton "Régénérer depuis mon profil"** en haut à droite

**Signature auto-générée** (exemple) :
```
Stéphano Di Piazza
Gérant
DI PIAZZA SARL
📍 42 Avenue des Pins, 84000 Avignon
📞 06 12 34 56 78 · ✉️ stephano.dipiazza@example.fr
─────────────
SIREN : 123 456 789 · TVA Intracom : FR12345678901
```

### Zone 3 — Aperçu d'un mail d'avoir
Mockup réaliste de ce que recevra le fournisseur (objet, corps, signature)

---

## 1️⃣2️⃣ PARAMÈTRES > NOTIFICATIONS

**📁 Fichier : `factur-control-parametres-notifications.html`**

**Structure** : 3 groupes thématiques, chaque ligne = 1 notification avec **2 toggles** (E-mail / In-app)

### Groupe 1 — Activité de contrôle (4 notifications)
| Notification | E-mail défaut | In-app défaut |
|---|---|---|
| 🟢 Tarif extrait avec succès | ❌ | ✅ |
| 🔵 Facture contrôlée | ✅ | ✅ |
| 🔴 **Écart détecté** | ✅ | ✅ |
| 🟣 Articles hors tarif détectés | ❌ | ✅ |

### Groupe 2 — Rapports périodiques (2 notifications)
| Notification | E-mail | In-app |
|---|---|---|
| 📅 Rapport hebdomadaire (lundi matin) | ✅ | ❌ |
| 📅 Rapport mensuel (1er du mois) | ✅ | ❌ |

### Groupe 3 — Compte & abonnement (4 notifications)
| Notification | E-mail | In-app |
|---|---|---|
| 🟡 Quota bientôt atteint (80%, 95%) | ✅ | ✅ |
| 🔴 **Quota dépassé** 🔒 | ✅ 🔒 | ✅ 🔒 |
| 🔵 Renouvellement d'abonnement (J-7) | ✅ | ✅ |
| 🔴 **Échec de paiement** 🔒 | ✅ 🔒 | ✅ 🔒 |

**🔒 Verrouillées** (impossible à désactiver) : quota dépassé + échec paiement

---

## 1️⃣3️⃣ PARAMÈTRES > ABONNEMENT

**📁 Fichier : `factur-control-parametres-abonnement.html`**

### Zone 1 — Plan actuel (carte bleue premium)
**Effet visuel "premium"** :
- Fond dégradé bleu (`#1D4ED8` → `#1E40AF`)
- Cercles décoratifs en arrière-plan (orange + blanc)

**Infos affichées** :
- **Pro** en gros (32px) + badge vert "✓ ACTIF"
- **4 features incluses** (coches vertes) : 500 factures, fournisseurs illimités, mail d'avoir auto, support prioritaire
- **Prix mis en valeur à droite** : 149 € HT/mois
- **Prochaine échéance** : 15 juin 2026

**3 boutons d'action** :
- 🟠 "Changer de plan" (orange = action principale)
- ⚪ "Mode de paiement" (transparent)
- 🔴 "Annuler l'abonnement" (texte rouge clair)

### Zone 2 — Usage du mois
**3 KPI en haut** :
| KPI | Valeur | Sub-info |
|---|---|---|
| Factures contrôlées | 87 / 500 | ↗ +12% vs mois dernier |
| Tarifs téléversés | 23 | 11 fournisseurs actifs |
| **Écarts détectés** 💰 | **€ 2 847 HT** | "Récupérables via avoir" |

→ Le 3ème KPI est **stratégique** : il rappelle la **valeur générée par factur-control**

**Barre de quota visuelle** : vert (0-80%) → ambre (80-95%) → rouge (95-100%)

### Zone 3 — Historique de facturation
**Tableau des 3 dernières factures factur-control** (N° / Description / Montant / Statut / Action PDF)
**Lien "Voir toutes mes factures →"**
**Bouton "Tout télécharger"** (ZIP)

---

## 🎨 CHARTE GRAPHIQUE GLOBALE

### Palette principale
| Rôle | Hex |
|---|---|
| Fond principal | `#1D4ED8` (bleu électrique) |
| Header bandeau | `#1E40AF` |
| Cartes contenu | blanc |
| Accent signature | `#E85A00` (orange) |
| Texte foncé | `#1F2937` |
| Texte secondaire | `#6B7280` |
| Bordures | `#E5E7EB` |

### Couleurs sémantiques
| Notion | Couleur principale | Couleur pâle |
|---|---|---|
| 🟢 Conforme / Net Facture | `#16A34A` | `#EAF3DE` |
| 🔴 Erreur / Écart | `#DC2626` | `#FCEBEB` |
| 🟡 En cours / Gratuité | `#F59E0B` | `#FEF3C7` |
| 🟣 Hors tarif / RFA Prod | `#7C3AED` | `#EDE9FE` |
| 🔵 RFA Fournisseur | `#4338CA` | `#EEF2FF` |
| 🟠 Net Net (orange) | `#E85A00` | `#FAECE7` |
| 🔵 Marge / Rentabilité | `#1D4ED8` | `#EFF6FF` |

### Code couleur métier
- **Vert** = Net Facture (contrôle)
- **Orange** = Net Net (exploitation/coût d'exploitation)
- **Bleu** = Rentabilité / Marge

---

## 📦 LISTE DES FICHIERS HTML DISPONIBLES

Tous dans `Dropbox > CREATION APPLICATION > Controle Factures > DESIGN CLAUDE`

| Fichier | Écran |
|---|---|
| `factur-control-detail-tarif-pc-large.html` | Détail tarif version PC large (14 colonnes) |
| `factur-control-parametres-profil.html` | Paramètres > Profil + Société |
| `factur-control-parametres-securite.html` | Paramètres > Sécurité |
| `factur-control-parametres-mail-signature.html` | Paramètres > Mail & Signature |
| `factur-control-parametres-notifications.html` | Paramètres > Notifications |
| `factur-control-parametres-abonnement.html` | Paramètres > Abonnement |

→ **6 fichiers HTML interactifs** ouvrables directement dans un navigateur

---

## 📚 DOCUMENTATION DISPONIBLE

| Fichier | Contenu |
|---|---|
| `CONTEXTE-MAITRE-factur-control.md` | Tout le contexte du projet (à uploader en début de conversation) |
| `brief-design-factur-control.md` | Brief design complet (9 sections) |
| `brief-design-factur-control.html` | Brief design version visuelle navigable |
| `CDC_technique_MVP.md` | Cahier des charges technique |
| `PLANNING-BETA-factur-control.md` | Planning sprint par sprint |
| `MEMO-reprise-bureau.md` | Actions à faire le matin au bureau |
| `PROMPT-CLAUDE-CODE-Sprint-3.md` | Prompt prêt à coller dans Claude Code |
| `KIT-PROSPECTION-BETA-factur-control.md` | Stratégie de recrutement des 5 bêta-testeurs |
| `RECAP-ECRANS-factur-control.md` | **Ce document — récap de tous les écrans** |

---

*Document généré le 28/05/2026 — factur-control v1.0*
*Récapitulatif complet des 17 écrans/variantes conçus pendant les sessions de design*
