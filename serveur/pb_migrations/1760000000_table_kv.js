/// <reference path="../pb_data/types.d.ts" />
// Crée la table « kv » où Golden Boutique enregistre toutes ses données (une ligne par clé).
migrate((app) => {
  try { app.findCollectionByNameOrId("kv"); return; } catch (e) { /* n'existe pas encore */ }
  const kv = new Collection({
    type: "base",
    name: "kv",
    // Accès sans compte PocketBase : les comptes et les droits sont gérés par Golden Boutique.
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: null,
    fields: [
      { type: "text", name: "k", required: true, max: 300 },
      { type: "json", name: "v", maxSize: 50 * 1024 * 1024 },
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_kv_k ON kv (k)"],
  });
  app.save(kv);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("kv")); } catch (e) { /* déjà supprimée */ }
});
