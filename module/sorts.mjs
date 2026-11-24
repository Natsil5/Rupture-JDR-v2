/**
 * Ce que donne un sort pour un résultat de jet
 */
import { DIFFICULTES } from "./regles.mjs";
import { lignesBonus } from "./bonus.mjs";

/**
 * texte : effet le plus haut atteint (les paliers laissés vides sont ignorés)
 * minimum : plus petit résultat qui donne quelque chose, 0 si le sort ne décrit aucun palier
 * rate : le résultat n'atteint rien de ce que le sort décrit, donc aucun Nexus n'est engagé
 */
export function issueSort(sort, total) {
  const effets = sort.system?.effets ?? {};
  const decrits = DIFFICULTES.filter(d => String(effets[d.cle] ?? "").trim());
  const seuils = [
    ...decrits.map(d => d.seuil),
    ...lignesBonus(sort).filter(l => Number(l.valeur)).map(l => DIFFICULTES.find(d => d.cle === l.palier)?.seuil ?? 0)
  ];
  const minimum = seuils.length ? Math.min(...seuils) : 0;
  const atteint = decrits.filter(d => total >= d.seuil).pop();
  return { texte: atteint ? effets[atteint.cle] : "", minimum, rate: total < minimum };
}

/** Message affiché quand le résultat n'atteint rien */
export function messageRate(sort, total, minimum) {
  return `${sort.name} : ${total} n'atteint aucun effet (${minimum} au moins).`;
}
