# Golden Boutique

Logiciel de gestion : achats en Chine, arrivages, stock, ventes à Madagascar, fournisseurs et douane, finances et tâches de l'équipe. Tout le logiciel tient dans un seul fichier : `index.html`.

- **En ligne** (une fois GitHub Pages activé) : https://ralinaivo-spec.github.io/Golden-Boutique/
- **Serveur de la boutique (recommandé)** : le dossier [`serveur/`](serveur/) contient `Demarrer-Boutique.command`. Double-cliquez dessus sur le Mac : le logiciel s'ouvre sur http://localhost:8090 et les téléphones des employés se connectent avec le lien de **Paramètres › Réseau** (même Wi-Fi). Toutes les données et tous les comptes sont partagés. Mode d'emploi : [`serveur/LISEZ-MOI.txt`](serveur/LISEZ-MOI.txt).
- **Sans serveur** : ouvrir `index.html` directement fonctionne en **mode local** : chaque navigateur garde ses propres comptes et données, rien n'est partagé avec les autres appareils.

## Équipe et accès

Le menu **Équipe et accès** contient **Employés** et **Rôles et permissions**.

- **Rôles par poste**, tous modifiables : Administrateur, Propriétaire, Gérant(e) de boutique, Responsable des achats, Agent de recherche de produits, Responsable des fournisseurs, Responsable logistique, Comptable, Vendeur, Vendeur en ligne, Caissier(ère), Magasinier, Livreur. Chaque rôle peut être renommé, supprimé ou réglé rubrique par rubrique (Aucun accès / Voir / Modifier), dans la matrice ou avec le bouton **Permissions**. On peut aussi créer de nouveaux rôles.
- **Accès total** : le super-administrateur peut, d'une case à cocher sur la fiche d'un rôle (par exemple **Propriétaire**), lui donner un accès complet au logiciel (toutes les rubriques, les employés, les rôles et les permissions), et le retirer à tout moment.
- Seul le super-administrateur peut attribuer un rôle à accès total à un employé. Un compte à accès total ne peut pas modifier le super-administrateur.
- **Mots de passe** : le super-administrateur peut à tout moment choisir le mot de passe de n'importe quel compte (bouton clé dans Employés, ou « Modifier le mot de passe » dans la fiche d'un employé), avec option « Générer » et, si souhaité, obligation pour l'employé de choisir son propre mot de passe à la prochaine connexion. Les autres gestionnaires peuvent seulement réinitialiser avec un mot de passe temporaire.
- Pour une personne en particulier, des accès peuvent être ajoutés ou retirés en plus de ceux de son rôle (Employés › Modifier).

## Sauvegarde

Les données restent dans le navigateur de chaque appareil. Faites régulièrement une sauvegarde depuis **Paramètres** (fichier `.json`) et gardez-la en lieu sûr.
