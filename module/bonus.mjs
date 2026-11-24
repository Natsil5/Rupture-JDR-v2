/**
 * Bonus donnés par les sorts, aux caractéristiques ou à leurs modificateurs
 * - Caractéristique : compte partout où la caractéristique compte (jets, santé, Nexus, dégâts...)
 * - Modificateur : compte seulement dans les jets
 * Le bonus est un effet actif posé sur la cible : on l'enlève depuis l'onglet Effets ou depuis le chat.
 */
import { CARACTERISTIQUES, DIFFICULTES, DIFFICULTE_DEFAUT, signe } from "./regles.mjs";

export const TYPES_BONUS = {
  carac: { nom: "Caractéristique", champ: "bonusSort" },
  mod: { nom: "Modificateur", champ: "modSort" }
};

const REGEX_CLE = /^system\.caracteristiques\.(\w+)\.(bonusSort|modSort)$/;

/** Choix proposés sur la fiche d'un sort */
export function optionsBonus() {
  return {
    types: Object.entries(TYPES_BONUS).map(([cle, t]) => ({ cle, nom: t.nom })),
    caracs: Object.entries(CARACTERISTIQUES).map(([cle, nom]) => ({ cle, nom })),
    // Un sort n'a d'effet qu'à partir de la difficulté par défaut
    paliers: DIFFICULTES.filter(d => d.seuil >= DIFFICULTE_DEFAUT).map(d => ({ cle: d.cle, nom: `${d.nom} (${d.seuil})` }))
  };
}

/** Lignes de bonus d'un sort, toujours sous forme de liste */
export function lignesBonus(sort) {
  return Object.values(sort?.system?.bonus ?? {});
}

/** Bonus obtenus pour un résultat : pour une même caractéristique, le palier le plus haut atteint remplace les autres */
export function bonusObtenus(sort, total) {
  const obtenus = new Map();
  for (const ligne of lignesBonus(sort)) {
    const valeur = Number(ligne.valeur) || 0;
    const seuil = DIFFICULTES.find(d => d.cle === ligne.palier)?.seuil ?? DIFFICULTE_DEFAUT;
    if (!valeur || total < seuil || !TYPES_BONUS[ligne.type] || !CARACTERISTIQUES[ligne.carac]) continue;
    const cle = `system.caracteristiques.${ligne.carac}.${TYPES_BONUS[ligne.type].champ}`;
    const deja = obtenus.get(cle);
    if (deja && seuil < deja.seuil) continue;
    obtenus.set(cle, { cle, seuil, valeur: deja && deja.seuil === seuil ? deja.valeur + valeur : valeur });
  }
  return [...obtenus.values()];
}

/** Texte d'un bonus : « Vigueur +10 » ou « Modificateur de Vigueur +3 » */
export function libelleBonus(cle, valeur) {
  const m = REGEX_CLE.exec(cle);
  if (!m) return null;
  const nom = CARACTERISTIQUES[m[1]] ?? m[1];
  const quoi = m[2] === "modSort" ? `Modificateur ${/^[AEIOU]/.test(nom) ? "d'" : "de "}${nom}` : nom;
  return `${quoi} ${signe(Number(valeur) || 0)}`;
}

/** Changements d'un effet actif, quelle que soit la version de Foundry */
export function changementsEffet(effet) {
  return Array.from(effet.system?.changes ?? effet.changes ?? []);
}

/** Cibles du joueur, ou à défaut le lanceur */
function choisirCibles(lanceur) {
  const acteurs = Array.from(game.user.targets ?? []).map(jeton => jeton.actor).filter(Boolean);
  if (!acteurs.length) acteurs.push(lanceur);
  return acteurs.map(a => ({ uuid: a.uuid, nom: a.name }));
}

/** Prépare le bloc à ajouter au message de chat d'un sort réussi, ou null si le sort ne donne pas de bonus */
export function preparerBonus(sort, lanceur, total) {
  const obtenus = bonusObtenus(sort, total);
  if (!obtenus.length) return null;
  const duree = Math.max(0, Math.floor(Number(sort.system.dureeBonus) || 0));
  const donnees = {
    sort: sort.uuid || "",
    cle: sort.uuid || sort.name,
    nom: sort.name,
    img: sort.img,
    duree,
    changements: obtenus.map(b => ({ cle: b.cle, valeur: b.valeur })),
    cibles: choisirCibles(lanceur)
  };
  const html = `
    <div class="rupture2069-bonus">
      <div><strong>Bonus:</strong> ${obtenus.map(b => libelleBonus(b.cle, b.valeur)).join(", ")}</div>
      <div><strong>Durée:</strong> ${duree ? `${duree} tour${duree > 1 ? "s" : ""}` : "jusqu'à ce qu'on l'enlève"}</div>
      <div><strong>Pour:</strong> ${donnees.cibles.map(c => c.nom).join(", ")}</div>
      <div class="bonus-boutons">
        <button type="button" data-bonus="appliquer">Appliquer</button>
        <button type="button" data-bonus="retirer">Enlever</button>
      </div>
    </div>
  `;
  return { html, flags: { rupture2069: { bonus: donnees } } };
}

/** Retire d'un acteur le bonus venant d'un sort */
async function enleverDe(acteur, cle) {
  if (!cle) return 0;
  const ids = acteur.effects.filter(e => e.flags?.rupture2069?.bonusSort === cle).map(e => e.id);
  if (ids.length) await acteur.deleteEmbeddedDocuments("ActiveEffect", ids);
  return ids.length;
}

/** Applique le bonus d'un message aux cibles. Le même sort relancé remplace son ancien bonus, il ne se cumule pas avec lui-même. */
export async function appliquerBonus(message) {
  const bonus = message?.flags?.rupture2069?.bonus;
  if (!bonus) return;
  const refuses = [];
  for (const { uuid, nom } of bonus.cibles) {
    const acteur = await fromUuid(uuid);
    if (!acteur?.isOwner) {
      refuses.push(nom);
      continue;
    }
    await enleverDe(acteur, bonus.cle);
    const effet = {
      name: bonus.nom,
      img: bonus.img,
      changes: bonus.changements.map(c => ({ key: c.cle, mode: 2, value: String(c.valeur) })),
      flags: { rupture2069: { bonusSort: bonus.cle, duree: bonus.duree } }
    };
    if (bonus.sort) effet.origin = bonus.sort;
    // Hors combat, Foundry ferait tomber le bonus au premier tour : la durée ne se décompte qu'en combat
    if (bonus.duree && game.combat?.started) effet.duration = { rounds: bonus.duree };
    await acteur.createEmbeddedDocuments("ActiveEffect", [effet]);
  }
  if (refuses.length) ui.notifications.warn(`Bonus à appliquer par le MJ (bouton dans le chat) : ${refuses.join(", ")}`);
}

/** Enlève le bonus d'un message à ses cibles */
export async function enleverBonus(message) {
  const bonus = message?.flags?.rupture2069?.bonus;
  if (!bonus) return;
  let n = 0;
  for (const { uuid } of bonus.cibles) {
    const acteur = await fromUuid(uuid);
    if (acteur?.isOwner) n += await enleverDe(acteur, bonus.cle);
  }
  ui.notifications.info(n ? `${bonus.nom} : bonus enlevé.` : `${bonus.nom} : aucun bonus à enlever.`);
}

/** Active les boutons du message de chat ; ils sont cachés à ceux qui ne possèdent aucune des cibles */
export function activerBoutons(message, html) {
  const racine = html instanceof HTMLElement ? html : html[0];
  const bonus = message.flags?.rupture2069?.bonus;
  const bloc = racine?.querySelector(".rupture2069-bonus .bonus-boutons");
  if (!bonus || !bloc) return;
  if (!bonus.cibles.some(c => fromUuidSync(c.uuid)?.isOwner)) {
    bloc.remove();
    return;
  }
  bloc.querySelector("[data-bonus=appliquer]")?.addEventListener("click", () => appliquerBonus(message));
  bloc.querySelector("[data-bonus=retirer]")?.addEventListener("click", () => enleverBonus(message));
}
