// Rôles et matrice des droits : l'admin coche ce que chaque rôle peut faire,
// le super-admin peut en plus donner un « accès total » à un rôle (Admin, Propriétaire…).
import { Fragment, useState } from 'react';
import { audit, isSuperAdmin, useCurrentUser, type Role, type User } from '../lib/auth';
import { remove, save, useTable } from '../lib/db';
import { DEFAULT_ROLES, PERMISSIONS, SUPER_ONLY, SUPERADMIN_ROLE } from '../lib/permissions';
import { Badge, Button, Confirm, IconButton, Modal, PageHead, SelectField, TextField, Toggle, toast } from '../ui/kit';
import { Icon } from '../ui/icons';

const GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))];
const labelOf = (key: string) => PERMISSIONS.find((p) => p.key === key)?.label ?? key;
const isFull = (r: Role) => r.id === SUPERADMIN_ROLE || !!r.fullAccess;

export function RolesPage() {
  const roles = useTable<Role>('roles');
  const users = useTable<User>('users');
  const me = useCurrentUser()!;
  const superAdmin = isSuperAdmin(me);
  const [editing, setEditing] = useState<Role | 'new' | null>(null);
  const [rights, setRights] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const [fullFor, setFullFor] = useState<{ role: Role; on: boolean } | null>(null);
  const order = DEFAULT_ROLES.map((r) => r.id);
  const ordered = [...roles].sort((a, b) => {
    const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.createdAt.localeCompare(b.createdAt);
  });

  /** Ce droit peut-il être coché / décoché par moi pour ce rôle ? */
  const editable = (r: Role, key?: string) => !r.locked && !r.fullAccess && (!key || !SUPER_ONLY.includes(key) || superAdmin);

  async function setPerms(role: Role, permissions: string[], what: string) {
    if (role.id === me.roleId && role.permissions.includes('users.manage') && !permissions.includes('users.manage') && !superAdmin) {
      toast('Vous ne pouvez pas retirer « Créer les utilisateurs et donner les accès » à votre propre rôle : vous perdriez l’accès à cette page.', 'error');
      return false;
    }
    // Seul le super-admin peut accorder ou retirer les droits réservés.
    if (!superAdmin) {
      permissions = [...permissions.filter((k) => !SUPER_ONLY.includes(k)), ...role.permissions.filter((k) => SUPER_ONLY.includes(k))];
    }
    await save('roles', { id: role.id, permissions: [...new Set(permissions)] });
    await audit('Droits modifiés', `${role.name} : ${what}`, 'roles', role.id);
    return true;
  }

  async function toggle(role: Role, key: string, on: boolean) {
    const permissions = on ? [...role.permissions, key] : role.permissions.filter((k) => k !== key);
    await setPerms(role, permissions, `${on ? 'peut' : 'ne peut plus'} « ${labelOf(key)} »`);
  }

  async function setFullAccess(role: Role, on: boolean) {
    await save('roles', { id: role.id, fullAccess: on });
    await audit('Accès total', `${role.name} : ${on ? 'accès total au logiciel accordé' : 'accès total retiré (retour aux droits cochés)'}`, 'roles', role.id);
    toast(on ? `« ${role.name} » a maintenant un accès total` : `Accès total retiré à « ${role.name} »`);
  }

  return (
    <>
      <PageHead title="Rôles et accès"
        subtitle="Chaque employé reçoit les droits de son rôle. Cochez ce que chaque rôle a le droit de faire : les changements s'appliquent immédiatement à tous les comptes du rôle."
        actions={<Button icon="plus" onClick={() => setEditing('new')}>Créer un rôle</Button>} />

      {superAdmin ? (
        <div className="notice"><Icon name="shield" /><span><strong>Accès total</strong> — en tant que super-admin, vous pouvez donner à un rôle (par exemple <em>Admin / Gérant</em> ou <em>Propriétaire</em>) un accès complet au logiciel, y compris la restauration et la réinitialisation. Vous pouvez le retirer à tout moment.</span></div>
      ) : (
        <div className="notice"><Icon name="shield" /><span>L'accès total et le droit « Restaurer, réinitialiser, réparer » ne peuvent être donnés que par le super-admin.</span></div>
      )}

      <div className="grid-2">
        {ordered.map((r) => {
          const count = users.filter((u) => u.roleId === r.id).length;
          const full = isFull(r);
          return (
            <div key={r.id} className="card stack-s">
              <div className="row-between" style={{ minHeight: 44 }}>
                <h3>{r.name}</h3>
                <div className="row" style={{ gap: 0 }}>
                  {!r.locked && <IconButton icon="edit" label="Renommer" onClick={() => setEditing(r)} />}
                  {!r.system && <IconButton icon="trash" label="Supprimer" onClick={() => count ? toast(`Ce rôle a encore ${count} utilisateur(s). Changez-leur de rôle d'abord.`, 'error') : setDeleting(r)} />}
                </div>
              </div>
              <p className="small muted">{r.description}</p>
              <div className="row" style={{ gap: 6 }}>
                <Badge>{count} utilisateur{count > 1 ? 's' : ''}</Badge>
                {full ? <Badge tone="ok">Accès total</Badge> : <Badge tone="brand">{r.permissions.filter((k) => PERMISSIONS.some((p) => p.key === k)).length} / {PERMISSIONS.length} droits</Badge>}
                {r.locked && <Badge tone="warn">Verrouillé</Badge>}
              </div>
              {superAdmin && !r.locked && (
                <Toggle checked={!!r.fullAccess} onChange={(on) => setFullFor({ role: r, on })} label="Accès total au logiciel" />
              )}
              {!r.locked && <Button variant="ghost" icon="shield" onClick={() => setRights(r)}>Voir et modifier les droits</Button>}
            </div>
          );
        })}
      </div>

      <div className="card card-flush">
        <div className="table-wrap" style={{ maxHeight: '70vh' }}>
          <table className="table perm-table">
            <thead>
              <tr>
                <th>Droit</th>
                {ordered.map((r) => <th key={r.id}>{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g) => (
                <Fragment key={g}>
                  <tr className="perm-group"><td colSpan={ordered.length + 1}>{g}</td></tr>
                  {PERMISSIONS.filter((p) => p.group === g).map((p) => (
                    <tr key={p.key}>
                      <td>{p.label}{SUPER_ONLY.includes(p.key) && <span className="small muted"> (super-admin)</span>}</td>
                      {ordered.map((r) => (
                        <td key={r.id}>
                          <input type="checkbox" className="perm-check" checked={isFull(r) || r.permissions.includes(p.key)} disabled={!editable(r, p.key)}
                            aria-label={`${r.name} — ${p.label}`}
                            onChange={(e) => toggle(r, p.key, e.target.checked)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="small muted">Un rôle avec « Accès total » a tous les droits, y compris ceux ajoutés par les prochaines mises à jour. Pour l'ajuster case par case, retirez d'abord l'accès total.</p>

      {editing && <RoleForm role={editing === 'new' ? null : editing} roles={roles} superAdmin={superAdmin} onClose={() => setEditing(null)} />}
      {rights && <RightsEditor role={roles.find((r) => r.id === rights.id) ?? rights} superAdmin={superAdmin} editable={editable} onSave={setPerms} onClose={() => setRights(null)} />}
      {fullFor && <Confirm title={fullFor.on ? 'Donner un accès total' : "Retirer l'accès total"} confirmLabel={fullFor.on ? "Donner l'accès total" : "Retirer l'accès total"} danger={fullFor.on}
        message={fullFor.on
          ? <p>Tous les comptes du rôle <strong>{fullFor.role.name}</strong> ({users.filter((u) => u.roleId === fullFor.role.id).length}) pourront tout faire dans le logiciel : utilisateurs, droits, sauvegardes, restauration et réinitialisation.</p>
          : <p>Le rôle <strong>{fullFor.role.name}</strong> reviendra aux droits cochés dans le tableau.</p>}
        onClose={() => setFullFor(null)}
        onConfirm={() => setFullAccess(fullFor.role, fullFor.on)} />}
      {deleting && <Confirm title="Supprimer le rôle" danger confirmLabel="Supprimer"
        message={<p>Le rôle <strong>{deleting.name}</strong> sera supprimé.</p>}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await remove('roles', deleting.id); await audit('Rôle supprimé', deleting.name, 'roles', deleting.id); toast('Rôle supprimé'); }} />}
    </>
  );
}

/** Fenêtre de modification des droits d'un seul rôle (pratique sur téléphone). */
function RightsEditor({ role, superAdmin, editable, onSave, onClose }: {
  role: Role; superAdmin: boolean;
  editable: (r: Role, key?: string) => boolean;
  onSave: (r: Role, perms: string[], what: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const full = isFull(role);
  const [perms, setPerms] = useState<string[]>(role.permissions);
  const [busy, setBusy] = useState(false);
  const def = DEFAULT_ROLES.find((d) => d.id === role.id);
  const set = (key: string, on: boolean) => setPerms((p) => on ? [...new Set([...p, key])] : p.filter((k) => k !== key));
  const setGroup = (g: string, on: boolean) => PERMISSIONS.filter((p) => p.group === g && editable(role, p.key)).forEach((p) => set(p.key, on));

  return (
    <Modal wide title={`Droits — ${role.name}`} onClose={onClose}
      footer={full ? <Button onClick={onClose}>Fermer</Button> : <>
        {def && <Button variant="quiet" icon="refresh" onClick={() => setPerms(def.permissions.filter((k) => superAdmin || !SUPER_ONLY.includes(k) || role.permissions.includes(k)))}>Droits d'origine</Button>}
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button busy={busy} onClick={async () => {
          setBusy(true);
          const added = perms.filter((k) => !role.permissions.includes(k)).length;
          const removed = role.permissions.filter((k) => !perms.includes(k)).length;
          const ok = await onSave(role, perms, `${added} droit(s) ajouté(s), ${removed} retiré(s)`);
          setBusy(false);
          if (ok) { toast('Droits enregistrés'); onClose(); }
        }}>Enregistrer</Button>
      </>}>
      <div className="stack">
        {full ? (
          <div className="notice notice-ok"><Icon name="check" /><span>Ce rôle a un <strong>accès total</strong> : il peut tout faire.{superAdmin ? " Retirez l'accès total sur la fiche du rôle pour choisir les droits un par un." : ''}</span></div>
        ) : <p className="small muted">{role.description}</p>}
        {GROUPS.map((g) => (
          <div key={g} className="stack-s">
            <div className="row-between">
              <h3>{g}</h3>
              {!full && <div className="row" style={{ gap: 4 }}>
                <Button variant="quiet" onClick={() => setGroup(g, true)}>Tout</Button>
                <Button variant="quiet" onClick={() => setGroup(g, false)}>Rien</Button>
              </div>}
            </div>
            {PERMISSIONS.filter((p) => p.group === g).map((p) => (
              <label key={p.key} className="row" style={{ gap: 10, flexWrap: 'nowrap', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" className="perm-check" checked={full || perms.includes(p.key)} disabled={!editable(role, p.key)} onChange={(e) => set(p.key, e.target.checked)} />
                <span>{p.label}{SUPER_ONLY.includes(p.key) && <span className="small muted"> (super-admin)</span>}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function RoleForm({ role, roles, superAdmin, onClose }: { role: Role | null; roles: Role[]; superAdmin: boolean; onClose: () => void }) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [copyFrom, setCopyFrom] = useState('role-seller');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={role ? 'Modifier le rôle' : 'Nouveau rôle'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button busy={busy} disabled={!name.trim()} onClick={async () => {
          if (roles.some((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase() && r.id !== role?.id)) { toast('Un rôle porte déjà ce nom.', 'error'); return; }
          setBusy(true);
          if (role) {
            await save('roles', { id: role.id, name: name.trim(), description: description.trim() });
            await audit('Rôle modifié', name.trim(), 'roles', role.id);
          } else {
            const base = roles.find((r) => r.id === copyFrom);
            const basePerms = base ? (isFull(base) ? PERMISSIONS.map((p) => p.key) : base.permissions) : [];
            const [r] = await save('roles', {
              name: name.trim(), description: description.trim(),
              permissions: basePerms.filter((k) => superAdmin || !SUPER_ONLY.includes(k)),
              permsCatalog: PERMISSIONS.map((p) => p.key),
            });
            await audit('Rôle créé', name.trim(), 'roles', r.id);
          }
          toast('Rôle enregistré');
          onClose();
        }}>Enregistrer</Button></>}>
      <div className="stack">
        <TextField label="Nom du rôle" value={name} onChange={setName} autoFocus placeholder="Exemple : Responsable boutique" />
        <TextField label="Description" value={description} onChange={setDescription} hint="Ce que fait ce poste dans l'entreprise." />
        {!role && <SelectField label="Partir des droits de" value={copyFrom} onChange={setCopyFrom}
          options={[{ value: '', label: 'Aucun droit' }, ...roles.filter((r) => r.id !== SUPERADMIN_ROLE).map((r) => ({ value: r.id, label: r.name }))]}
          hint="Vous pourrez ensuite ajuster chaque droit." />}
      </div>
    </Modal>
  );
}
