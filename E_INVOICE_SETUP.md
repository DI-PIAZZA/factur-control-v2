# Setup E-Facturation (Chorus Pro)

## 1. Variables d'environnement

Ajouter à `.env.local` :

```env
# Chorus Pro OAuth
CHORUS_CLIENT_ID=votre_client_id
CHORUS_CLIENT_SECRET=votre_client_secret

# App URL
NEXT_PUBLIC_APP_URL=https://votre-app.vercel.app

# Cron Secret
CRON_SECRET=votre_secret_aleatoire
```

## 2. Migration SQL

Appliquer la migration dans Supabase SQL Editor :

```sql
-- Migration 014_e_invoice.sql
-- Créer la table e_invoice_credentials
-- Ajouter la colonne e_invoice_authorized à suppliers
```

Fichier : `migrations/014_e_invoice.sql`

## 3. Chorus Pro Configuration

1. Créer un compte sur https://chorus-pro.gouv.fr
2. Obtenir les credentials OAuth (Client ID + Secret)
3. Ajouter la Redirect URI : `https://votre-app.vercel.app/api/e-invoice/callback`

## 4. Cron Job (Vercel)

Pour la synchronisation automatique, configurer dans `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-e-invoices",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Ou appeler manuellement :

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://votre-app.vercel.app/api/cron/sync-e-invoices
```

## 5. Flux Utilisateur

1. Utilisateur clique sur "🔗 E-Facturation" dans `/factures`
2. Va à `/factures/autoriser-fournisseurs`
3. Clique "Autoriser" sur un fournisseur
4. Redirection OAuth vers Chorus Pro
5. Retour avec token + fournisseur marqué comme autorisé
6. Les factures se synchronisent automatiquement (via cron)

## Notes

- Flux manuel `/factures/nouvelle` reste intact pour les uploads PDF
- Deux flux coexistent : PDF upload + E-facturation
- Pour septembre 2026, e-facturation devient recommandé
