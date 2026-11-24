/**
 * Règles de jet de Rupture 2069, version 3D10
 * Résultat = 3D10 + caractéristique ÷ 3 + compétence (arrondi en dessous)
 * Les caractéristiques, la santé, le Nexus, la régénération et les dégâts ne sont pas concernés.
 */

/** Dés lancés pour tous les jets (le 0 du D10 compte pour 10) */
export const DES = "3d10";

/** Modificateur d'une caractéristique : le tiers, arrondi en dessous (50 donne 16) */
export function modificateur(valeur) {
  return Math.floor((Number(valeur) || 0) / 3);
}

/** Les six caractéristiques */
export const CARACTERISTIQUES = {
  vigueur: "Vigueur",
  coordination: "Coordination",
  logique: "Logique",
  instinct: "Instinct",
  empathie: "Empathie",
  pouvoir: "Pouvoir"
};

const nombre = valeur => Number(valeur) || 0;

/** Caractéristique entière : valeur + bonus saisi + bonus des sorts */
export function totalCarac(carac) {
  return nombre(carac?.value) + nombre(carac?.bonus) + nombre(carac?.bonusSort);
}

/** Bonus ajouté au modificateur seul : bonus saisi + bonus des sorts */
export function bonusModificateur(carac) {
  return nombre(carac?.bonusMod) + nombre(carac?.modSort);
}

/** Modificateur ajouté aux jets : total ÷ 3, puis bonus de modificateur */
export function modificateurCarac(carac) {
  return modificateur(totalCarac(carac)) + bonusModificateur(carac);
}

/** Texte sans accents ni majuscules, pour comparer des noms de compétence */
export function nomSimple(texte) {
  return String(texte ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Une compétence Echo ne sert qu'avec un CAD */
export function estEcho(competence) {
  return /^echo\b/.test(nomSimple(competence));
}

/** Nombre avec son signe : +3, -3 */
export function signe(valeur) {
  return valeur < 0 ? `${valeur}` : `+${valeur}`;
}

/** Détail du modificateur pour le chat : « 60 ÷ 3 » ou « 60 ÷ 3 +3 » */
export function detailModificateur(carac) {
  const bonus = bonusModificateur(carac);
  return `${totalCarac(carac)} ÷ 3${bonus ? ` ${signe(bonus)}` : ""}`;
}

/** Paliers de difficulté, du plus bas au plus haut (anciens paliers ÷ 3) */
export const DIFFICULTES = [
  { cle: "routine",        nom: "Routine",        seuil: 6,   effet: "Effet routinier" },
  { cle: "facile",         nom: "Facile",         seuil: 13,  effet: "Effet facile" },
  { cle: "moyenne",        nom: "Moyenne",        seuil: 26,  effet: "Effet moyen" },
  { cle: "difficile",      nom: "Difficile",      seuil: 40,  effet: "Effet difficile" },
  { cle: "tresDifficile",  nom: "Très difficile", seuil: 46,  effet: "Effet très difficile" },
  { cle: "elite",          nom: "Élite",          seuil: 60,  effet: "Effet elite" },
  { cle: "exceptionnelle", nom: "Exceptionnelle", seuil: 80,  effet: "Effet exceptionnel" },
  { cle: "absurde",        nom: "Absurde",        seuil: 93,  effet: "Effet absurde" },
  { cle: "surhumaine",     nom: "Surhumaine",     seuil: 106, effet: "Effet surhumain" },
  { cle: "divine",         nom: "Divine",         seuil: 146, effet: "Effet divin" }
];

/** Palier le plus haut atteint par un résultat, ou undefined sous Routine */
export function palierAtteint(total) {
  return DIFFICULTES.filter(d => total >= d.seuil).pop();
}
