// Droits d'accès : chaque rôle est une liste de droits. L'admin peut ajuster la matrice,
// le super-admin peut en plus donner un « accès total » à un rôle (ex. Admin, Propriétaire).

export interface PermissionDef { key: string; label: string; group: string }

export const PERMISSIONS: PermissionDef[] = [
  { group: 'Général', key: 'dashboard.view', label: 'Voir le tableau de bord' },
  { group: 'Général', key: 'costs.view', label: "Voir les prix d'achat, marges et bénéfices" },
  { group: 'Articles et stock', key: 'catalog.view', label: 'Consulter les articles et le stock' },
  { group: 'Articles et stock', key: 'catalog.edit', label: 'Créer et modifier les articles, catégories et prix' },
  { group: 'Articles et stock', key: 'stock.adjust', label: 'Ajuster le stock et faire les inventaires' },
  { group: 'Achats', key: 'purchases.manage', label: 'Gérer les achats en Chine et les arrivages' },
  { group: 'Achats', key: 'purchases.receive', label: 'Réceptionner la marchandise' },
  { group: 'Ventes', key: 'orders.create', label: 'Créer les commandes clients' },
  { group: 'Ventes', key: 'orders.prepare', label: 'Préparer les commandes' },
  { group: 'Ventes', key: 'pos.sell', label: 'Vendre en boutique (caisse)' },
  { group: 'Ventes', key: 'returns.manage', label: 'Enregistrer retours et échanges' },
  { group: 'Livraison', key: 'orders.dispatch', label: 'Assigner les commandes aux livreurs' },
  { group: 'Livraison', key: 'deliveries.manage', label: 'Enregistrer le retour des livreurs (livré, refusé, choix rendus, argent rapporté)' },
  { group: 'Livraison', key: 'couriers.view', label: 'Consulter le compte des livreurs (frais gagnés, argent à rendre)' },
  { group: 'Livraison', key: 'couriers.manage', label: 'Créer et modifier les fiches livreurs' },
  { group: 'Argent', key: 'treasury.view', label: 'Voir la trésorerie et les soldes' },
  { group: 'Argent', key: 'expenses.manage', label: 'Saisir les dépenses et autres revenus' },
  { group: 'Argent', key: 'couriers.settle', label: 'Faire les règlements des livreurs' },
  { group: 'Argent', key: 'closing.do', label: 'Faire la clôture de journée' },
  { group: 'Rapports', key: 'reports.view', label: 'Voir les rapports complets' },
  { group: 'Administration', key: 'users.manage', label: 'Créer les utilisateurs et donner les accès' },
  { group: 'Administration', key: 'settings.company', label: 'Modifier la société (nom, logo, couleur)' },
  { group: 'Administration', key: 'audit.view', label: "Consulter le journal d'activité" },
  { group: 'Administration', key: 'backup.manage', label: 'Faire et télécharger des sauvegardes' },
  { group: 'Administration', key: 'system.admin', label: 'Restaurer, réinitialiser, réparer (super-admin)' },
];

const ALL = PERMISSIONS.map((p) => p.key);
const not = (...ex: string[]) => ALL.filter((k) => !ex.includes(k));

export interface RoleSeed { id: string; name: string; description: string; permissions: string[]; locked?: boolean; system?: boolean; fullAccess?: boolean }

/** Rôles de départ (identifiants fixes pour être identiques sur tous les appareils). Tous restent modifiables. */
export const DEFAULT_ROLES: RoleSeed[] = [
  { id: 'role-superadmin', name: 'Super-admin', description: 'Compte technique de secours : mots de passe, restauration, réinitialisation.', permissions: ALL, locked: true, system: true, fullAccess: true },
  { id: 'role-admin', name: 'Admin / Gérant', description: "Gère toute l'activité, les utilisateurs et leurs accès.", permissions: not('system.admin'), system: true },
  { id: 'role-owner', name: 'Propriétaire', description: 'Consulte les tableaux de bord et les rapports. Le super-admin peut lui donner un accès total.', permissions: ['dashboard.view', 'costs.view', 'catalog.view', 'treasury.view', 'reports.view', 'audit.view'], system: true },
  { id: 'role-seller', name: 'Vendeur', description: 'Répond aux clients, crée les commandes, prépare, vend en boutique et gère les livraisons des livreurs.', permissions: ['dashboard.view', 'catalog.view', 'orders.create', 'orders.prepare', 'orders.dispatch', 'deliveries.manage', 'couriers.view', 'pos.sell', 'returns.manage'], system: true },
  { id: 'role-stock', name: 'Magasinier', description: 'Réceptionne la marchandise et fait les inventaires.', permissions: ['dashboard.view', 'catalog.view', 'purchases.receive', 'stock.adjust'], system: true },
  { id: 'role-cashier', name: 'Caissier(ère)', description: 'Encaisse les ventes en boutique, enregistre les retours et fait la clôture de caisse.', permissions: ['dashboard.view', 'catalog.view', 'pos.sell', 'returns.manage', 'closing.do'] },
  { id: 'role-online', name: 'Vendeur en ligne', description: 'Répond aux clients sur les réseaux, crée les commandes et les confie aux livreurs.', permissions: ['dashboard.view', 'catalog.view', 'orders.create', 'orders.dispatch', 'couriers.view'] },
  { id: 'role-picker', name: 'Préparateur(trice)', description: 'Prépare et emballe les commandes à livrer.', permissions: ['dashboard.view', 'catalog.view', 'orders.prepare'] },
  { id: 'role-courier', name: 'Livreur', description: 'Consulte les commandes à livrer et son compte (frais gagnés, argent à rendre).', permissions: ['dashboard.view', 'couriers.view'] },
  { id: 'role-buyer', name: 'Responsable des achats', description: 'Gère les achats en Chine, les arrivages, les articles et les prix.', permissions: ['dashboard.view', 'costs.view', 'catalog.view', 'catalog.edit', 'purchases.manage', 'purchases.receive', 'stock.adjust'] },
  { id: 'role-accountant', name: 'Comptable', description: 'Suit la trésorerie, les dépenses, les règlements des livreurs et les rapports.', permissions: ['dashboard.view', 'costs.view', 'catalog.view', 'treasury.view', 'expenses.manage', 'couriers.view', 'couriers.settle', 'closing.do', 'reports.view', 'audit.view'] },
];

export const SUPERADMIN_ROLE = 'role-superadmin';
export const ADMIN_ROLE = 'role-admin';
/** Droits que seul le super-admin peut accorder. */
export const SUPER_ONLY = ['system.admin'];
