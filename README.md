# TSENA

Logiciel de gestion commerciale : achats (Chine), stock, ventes en ligne et en boutique, livraisons, trésorerie et rapports — utilisable en ligne et hors ligne, sur téléphone et ordinateur (application web installable).

- **Application en ligne : https://ralinaivo-spec.github.io/golden-boutique/**
- Cahier des charges : [docs/CAHIER_DES_CHARGES.md](docs/CAHIER_DES_CHARGES.md)
- Relier au cloud : [docs/GUIDE_CLOUD.md](docs/GUIDE_CLOUD.md)

## Avancement

| Étape | Contenu | État |
|---|---|---|
| 0 | Cahier des charges | ✅ validé |
| 1 | Application installable, connexion, rôles, utilisateurs, thème, logo, hors ligne, synchronisation, sauvegardes | ✅ |
| 2 | Catégories, articles, variantes, stock, modèles Excel et import | à venir |
| 3 | Achats Chine, expéditions, coût de revient, réception | à venir |
| 4 | Clients, commandes, préparation, livraisons, retours, échanges | à venir |
| 5 | Caisse boutique, paiements, tickets 58 mm | à venir |
| 6 | Trésorerie, dépenses, comptes livreurs, clôture, récapitulatif | à venir |
| 7 | Tableaux de bord, rapports, bénéfice / perte | à venir |
| 8 | Sauvegardes avancées, réinitialisation par e-mail, outils | à venir |

## Équipe et accès

Le menu **Équipe et accès** regroupe les utilisateurs, les rôles et le journal d'activité.

- **Rôles prêts à l'emploi** : Admin / Gérant, Propriétaire, Vendeur, Magasinier, Caissier(ère), Vendeur en ligne, Préparateur(trice), Livreur, Responsable des achats, Comptable. Chaque rôle peut être renommé, et ses droits cochés ou décochés un par un (bouton « Voir et modifier les droits » ou grand tableau). On peut aussi créer d'autres rôles.
- **Accès total** : le super-admin peut, d'un interrupteur, donner (ou retirer) un accès complet au logiciel à un rôle — par exemple Admin / Gérant ou Propriétaire — y compris restauration et réinitialisation.
- Seul le super-admin (ou un compte à accès total) peut attribuer un rôle à accès total à un utilisateur.

## Première connexion

Identifiant `super-adm`, mot de passe d'origine fourni séparément — il doit être changé dès la première connexion.

## Technique

- React 19 + TypeScript, construit avec esbuild (`npm run build` → `dist/`), aucune autre dépendance.
- Données locales dans IndexedDB (`src/lib/db.ts`), file d'envoi et synchronisation « dernière modification gagnante » avec Supabase (`src/lib/sync.ts`, `supabase/schema.sql`).
- Service worker maison (`src/sw.js`) pour le fonctionnement hors ligne.
- Hébergement : GitHub Pages (`.github/workflows/deploy.yml`), Netlify (`netlify.toml`) ou Vercel (`vercel.json`).
