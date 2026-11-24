/**
 * Générateur d'ennemis
 * Le MJ choisit l'espèce, le style, le nombre et le niveau ; chaque ennemi est une fiche de personnage complète.
 * Règles respectées :
 * - caractéristiques : 20 partout + 250 points, de 10 en 10, 80 au maximum avant les bonus d'espèce
 * - capacités d'espèce du compendium ; un humain ne canalise pas ; un worg n'a pas de mains
 * - armes chiffrées du Tableau, griffes et crocs des espèces ; armure naturelle comptée à moitié sous une armure
 * - santé, régénération et Nexus sont calculés par la fiche, comme pour un personnage
 */
import { CAPACITES_ESPECE, MODIFICATEURS_ESPECE, NOMS_ESPECE } from "./especes.mjs";
import { COMPETENCES_DE_BASE } from "./competences.mjs";
import { CARACTERISTIQUES, modificateur, signe } from "./regles.mjs";

const ID = "rupture2069";

/* -------------------------------------------- */
/*  Espèces                                     */
/* -------------------------------------------- */

const GRIFFES = degats => ({ nom: "Griffes", degats, vigueur: true, type: "contact", typeDegats: "tranchant", naturelle: true, effets: "Deux armes, ambidextrie" });
const CROCS = { nom: "Crocs", degats: 100, vigueur: true, type: "contact", typeDegats: "perforant", naturelle: true, effets: "" };

const PARTICULARITES = {
  fae: { feminin: true, source: "Noüs" },
  humain: { sansMagie: true },
  jorogumo: { feminin: true },
  pantherine: { arme: GRIFFES(30) },
  warabouc: { armure: 3 },
  wendigo: { arme: GRIFFES(50), source: "Sôma" },
  worg: { arme: CROCS, armure: 3, sansMains: true, source: "Psykhée" }
};

/* -------------------------------------------- */
/*  Niveaux                                     */
/* -------------------------------------------- */

/** Rangs de compétence par niveau (échelle 0 à 133) et protection portée */
export const NIVEAUX = {
  debutant: { nom: "Débutant", principal: [14, 20], appui: [10, 13], secondaire: [6, 9], autre: [2, 5], armure: 0 },
  moyen: { nom: "Moyen", principal: [30, 40], appui: [22, 28], secondaire: [15, 21], autre: [6, 12], armure: 1 },
  expert: { nom: "Expert", principal: [64, 76], appui: [48, 60], secondaire: [34, 46], autre: [15, 25], armure: 2 },
  maitre: { nom: "Maître", principal: [104, 118], appui: [82, 98], secondaire: [58, 74], autre: [25, 40], armure: 3 }
};

/** Répartitions possibles, de la plus haute à la plus basse : total 370 = 6 × 20 + 250 */
export const REPARTITIONS = [
  [80, 80, 70, 60, 40, 40],
  [80, 70, 70, 60, 50, 40],
  [80, 70, 60, 60, 50, 50],
  [80, 80, 60, 50, 50, 50],
  [70, 70, 70, 60, 50, 50]
];

/* -------------------------------------------- */
/*  Styles                                      */
/* -------------------------------------------- */

/**
 * caracs : groupes de caractéristiques, de la plus à la moins importante (le reste vient après, au hasard)
 * principales / appui / secondaires / autres : compétences ; "@arme" désigne la compétence de l'arme portée
 * mains : le style demande des mains ; magie : le style demande de canaliser
 */
export const STYLES = {
  combattant: {
    nom: "combattant", feminin: "combattante", armes: "contact", armure: 1,
    caracs: [["vigueur", "coordination"], ["instinct"]],
    principales: ["@arme", "Esquive"], secondaires: ["Athlétisme", "Endurance", "Perception"], autres: ["Intimidation", "Survie"]
  },
  tireur: {
    nom: "tireur", feminin: "tireuse", armes: "distance", armure: 1, mains: true,
    caracs: [["coordination"], ["instinct"], ["vigueur", "logique"]],
    principales: ["@arme", "Esquive"], secondaires: ["Perception", "Discrétions", "Athlétisme"], autres: ["Survie", "Endurance"]
  },
  eclaireur: {
    nom: "éclaireur", feminin: "éclaireuse", armes: "legere", armure: 0,
    caracs: [["instinct", "coordination"], ["vigueur"]],
    principales: ["Perception", "Discrétions", "Traque"], appui: ["@arme", "Esquive"], secondaires: ["Survie"], autres: ["Athlétisme", "Endurance"]
  },
  voleur: {
    nom: "voleur", feminin: "voleuse", armes: "legere", armure: -1, mains: true,
    caracs: [["coordination"], ["instinct", "empathie"]],
    principales: ["Escamotage", "Discrétions"], appui: ["@arme", "Esquive"], secondaires: ["Baratin", "Perception"], autres: ["Athlétisme", "Marchandage"]
  },
  mage: {
    nom: "mage", feminin: "mage", armes: "legere", armure: -2, magie: true,
    caracs: [["pouvoir"], ["logique", "instinct"], ["coordination"]],
    principales: ["Canalisation", "Concentration"], secondaires: ["Esquive", "@rituel", "Savoir"], autres: ["@arme", "Perception"],
    savoir: ["Magie"], sorts: ["attaque", "bouclier"]
  },
  technicien: {
    nom: "technicien Echo", feminin: "technicienne Echo", armes: "legere", armure: -1, mains: true,
    caracs: [["logique"], ["coordination", "instinct"]],
    principales: ["@echo", "@engrammes"], secondaires: ["Informatique", "Ingénierie", "Esquive", "Concentration"], autres: ["@arme", "Perception"],
    sorts: ["attaque", "bouclier"], cad: true
  },
  artisan: {
    nom: "artisan", feminin: "artisane", armes: "legere", armure: -2, mains: true,
    caracs: [["logique", "coordination"], ["vigueur"]],
    principales: ["Métier", "Ingénierie"], secondaires: ["Marchandage", "Endurance", "Savoir"], autres: ["Informatique", "@arme", "Esquive", "Perception"],
    metier: ["Armurier", "Forgeron", "Mécanicien", "Menuisier", "Tailleur"], savoir: ["Matériaux"], equipement: ["Outils de métier"]
  },
  erudit: {
    nom: "érudit", feminin: "érudite", armes: "legere", armure: -2,
    caracs: [["logique"], ["instinct", "pouvoir", "empathie"]],
    principales: ["Savoir", "Concentration"], secondaires: ["Informatique", "Diplomatie", "Perception"], autres: ["@rituel", "Esquive", "@arme"],
    savoir: ["Histoire", "Magie", "Nature", "Sciences"], equipement: ["Carnets de notes"]
  },
  medecin: {
    nom: "médecin", feminin: "médecin", armes: "legere", armure: -2, mains: true,
    caracs: [["logique", "empathie"], ["coordination"]],
    principales: ["Médecine", "Savoir"], secondaires: ["Perception", "Diplomatie", "Concentration"], autres: ["Survie", "Esquive", "@arme"],
    medecine: ["Chirurgie", "Urgences"], savoir: ["Sciences", "Nature"], equipement: ["Trousse de soins"]
  },
  meneur: {
    nom: "meneur", feminin: "meneuse", armes: "legere", armure: 0,
    caracs: [["pouvoir", "empathie"], ["coordination", "instinct"]],
    principales: ["Commandement", "Intimidation"], appui: ["@arme", "Esquive"], secondaires: ["Diplomatie", "Perception"], autres: ["Baratin", "Endurance"]
  },
  marchand: {
    nom: "marchand", feminin: "marchande", armes: "legere", armure: -2,
    caracs: [["empathie"], ["logique", "instinct"]],
    principales: ["Marchandage", "Baratin"], secondaires: ["Diplomatie", "Perception", "Savoir"], autres: ["Esquive", "@arme", "Conduite"],
    savoir: ["Commerce"]
  }
};

/** Compétences tirées en plus, au hasard */
const COMPLEMENTS = ["Athlétisme", "Endurance", "Natation", "Discrétions", "Survie", "Traque", "Intimidation", "Baratin", "Dressage", "Commandement", "Conduite", "Equitation"];
/** Compétences qui demandent des mains */
const AVEC_MAINS = ["Arme", "Escamotage", "Conduite", "Pilotage", "Equitation", "Canotage", "Médecine", "Métier", "Ingénierie", "Informatique"];
const MAGIQUES = ["Canalisation", "Rituel (Noüs)", "Rituel (Psykhée)", "Rituel (Sôma)"];
const SOURCES = { "Noüs": "nous", "Psykhée": "psykhee", "Sôma": "soma" };

/* -------------------------------------------- */
/*  Équipement                                  */
/* -------------------------------------------- */

const feu = (nom, famille, degats, pratique, max, magasin, cdt, poids, munition, effets = "") => ({
  nom, famille, degats, vigueur: false, type: "distance", typeDegats: "perforant", portee: { pratique, max }, magasin,
  cadenceTir: Math.max(...cdt.split("/").map(n => Number(n) || 0)), poids, munition, effets: [`Cadence ${cdt}`, effets].filter(Boolean).join(", ")
});

/** Armes dont le Tableau donne les dégâts */
const EPEE = { nom: "Épée longue", famille: "Épée", degats: 50, vigueur: true, type: "contact", typeDegats: "tranchant", poids: 1.5, effets: "Garde" };
const COUTEAU = { nom: "Couteau de combat", famille: "Couteau", degats: 20, vigueur: true, type: "contact", typeDegats: "tranchant", poids: 0.3, effets: "Furtif" };
const PISTOLETS = [
  feu("Glock 17 gen 5", "Pistolet", 70, 60, 100, 17, "1/-/-", 0.7, "9×19 mm Parabellum"),
  feu("Beretta M9A1", "Pistolet", 70, 60, 100, 15, "1/3/-", 0.9, "9×19 mm Parabellum"),
  feu("MR73 (revolver)", "Pistolet", 70, 100, 200, 6, "1/-/-", 1.2, ".357 Magnum"),
  feu("FN Five-seveN", "Pistolet", 70, 75, 200, 20, "1/3/-", 0.7, "5,7×28 mm FN")
];
const FUSILS = [
  feu("HK 416 F standard", "Fusil d'assaut", 100, 400, 3200, 30, "1/3/10", 4.5, "5,56×45 mm"),
  feu("FAMAS F1", "Fusil d'assaut", 100, 400, 3200, 30, "1/3/10", 6.7, "5,56×45 mm", "Tir fiable"),
  feu("FAMAS G2", "Fusil d'assaut", 100, 400, 3200, 30, "1/3/10", 3.7, "5,56×45 mm"),
  feu("AK-47", "Fusil d'assaut", 100, 400, 1000, 30, "1/3/10", 3.9, "7,62×39 mm"),
  feu("HK G36", "Fusil d'assaut", 100, 400, 800, 30, "1/2/10", 3.6, "5,56×45 mm")
];

/** Les sources ne donnent pas de liste d'armures : protections génériques, même indice partout */
const PROTECTIONS = [null, "Protection légère", "Protection moyenne", "Protection lourde", "Protection intégrale"];

/** Table de sorcellerie du Tableau, un niveau par palier de difficulté */
const SORCELLERIE = {
  attaque: { nom: "Sorcellerie : attaque", mot: "dégâts", valeurs: [20, 50, 100, 200, 500, 1000, 2000] },
  bouclier: { nom: "Sorcellerie : bouclier", mot: "de bouclier", valeurs: [40, 100, 200, 400, 1000, 2000, 4000] }
};
const PALIERS_SORCELLERIE = ["difficile", "tresDifficile", "elite", "exceptionnelle", "absurde", "surhumaine", "divine"];
const SAVOIR_REQUIS = [0, 0, 0, 16, 33, 50, 66];

/* -------------------------------------------- */
/*  Compatibilités                              */
/* -------------------------------------------- */

/** Raison pour laquelle une espèce ne peut pas avoir un style, ou null */
export function incompatibilite(race, style) {
  const p = PARTICULARITES[race];
  const s = STYLES[style];
  if (!p || !s) return null;
  if (s.magie && p.sansMagie) return `${NOMS_ESPECE[race]} : ne canalise pas sans pacte`;
  if (s.mains && p.sansMains) return `${NOMS_ESPECE[race]} : n'a pas de mains`;
  return null;
}

/* -------------------------------------------- */
/*  Génération d'un ennemi (sans Foundry)       */
/* -------------------------------------------- */

const outils = hasard => {
  const entre = (a, b) => a + Math.floor(hasard() * (b - a + 1));
  const choix = liste => liste[Math.floor(hasard() * liste.length)];
  const melange = liste => {
    const l = [...liste];
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(hasard() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    return l;
  };
  return { entre, choix, melange, chance: p => hasard() < p };
};

/** Caractéristiques : une répartition du total permis, selon l'ordre d'importance du style, puis les bonus d'espèce */
function tirerCaracs(race, style, o) {
  const cles = Object.keys(CARACTERISTIQUES);
  const voulues = style.caracs.flatMap(groupe => o.melange(groupe));
  const ordre = [...voulues, ...o.melange(cles.filter(c => !voulues.includes(c)))];
  const valeurs = o.choix(REPARTITIONS);
  const mods = MODIFICATEURS_ESPECE[race] ?? {};
  return Object.fromEntries(cles.map(c => [c, valeurs[ordre.indexOf(c)] + (mods[c] ?? 0)]));
}

function tirerArmes(race, style, niveau, o) {
  const naturelle = PARTICULARITES[race].arme;
  if (PARTICULARITES[race].sansMains) return [naturelle];
  switch (style.armes) {
    case "contact":
      if (naturelle && o.chance(0.75)) return [naturelle];
      return [o.chance(0.75) ? EPEE : COUTEAU];
    case "distance":
      return [o.chance(niveau === "debutant" ? 0.3 : 0.7) ? o.choix(FUSILS) : o.choix(PISTOLETS), COUTEAU];
    default:
      if (naturelle) return [naturelle];
      return [o.chance(0.5) ? COUTEAU : o.choix(PISTOLETS)];
  }
}

/** Protection portée : 0 si elle n'apporte rien de plus que l'armure naturelle */
function tirerProtection(race, style, niveau, o) {
  const p = PARTICULARITES[race];
  if (p.sansMains) return 0;
  const ip = Math.min(4, Math.max(0, NIVEAUX[niveau].armure + style.armure - (o.chance(0.3) ? 1 : 0)));
  const naturelle = p.armure ?? 0;
  return ip + Math.floor(naturelle / 2) > naturelle ? ip : 0;
}

/** Indice de protection final, armures superposées comprises */
export function ipTotal(race, portee) {
  const naturelle = PARTICULARITES[race].armure ?? 0;
  return portee ? portee + Math.floor(naturelle / 2) : naturelle;
}

function itemArme(arme) {
  const competence = arme.naturelle ? "Armes naturelles" : `Arme (${arme.famille})`;
  return {
    name: arme.nom, type: "arme",
    system: {
      degats: { base: arme.degats }, ajouteVigueur: arme.vigueur, typeArme: arme.type, typeDegats: arme.typeDegats,
      portee: arme.portee ?? { pratique: 0, max: 0 }, magasin: arme.magasin ?? 0, cadenceTir: arme.cadenceTir ?? 0,
      poids: arme.poids ?? 0, munition: arme.munition ?? "", effets: arme.effets ?? "", competenceUtilisee: competence
    }
  };
}

/** Sort de la table : un palier trop haut pour le Savoir (Magie) du lanceur donne le dernier niveau permis */
function itemSort(type, source, competence, savoir) {
  const s = SORCELLERIE[type];
  const permis = SAVOIR_REQUIS.filter(requis => savoir >= requis).length;
  const effets = {};
  PALIERS_SORCELLERIE.forEach((palier, i) => {
    const niveau = Math.min(i + 1, permis);
    effets[palier] = `Niveau ${niveau} : ${s.valeurs[niveau - 1].toLocaleString("fr-FR")} ${s.mot}`;
  });
  return { name: s.nom, type: "sort", system: { source, rang: 1, action: 1, coutNexus: 0, maintien: "non", competenceUtilisee: competence, effets } };
}

/**
 * Données complètes d'un ennemi
 * capacites : Map nom -> données d'objet des capacités d'espèce
 */
export function genererEnnemi({ race, style: cleStyle, niveau, capacites = new Map() }, hasard = Math.random) {
  const raison = incompatibilite(race, cleStyle);
  if (raison) throw new Error(raison);
  const o = outils(hasard);
  const style = STYLES[cleStyle];
  const p = PARTICULARITES[race];
  const n = NIVEAUX[niveau];

  const caracs = tirerCaracs(race, style, o);
  const armes = tirerArmes(race, style, niveau, o);
  const portee = tirerProtection(race, style, niveau, o);
  const source = p.source ?? o.choix(Object.keys(SOURCES));

  // Compétences
  const noms = { "@arme": armes[0].naturelle ? "Armes naturelles" : "Arme", "@echo": `Echo (${source})`, "@engrammes": `Engrammes (${source})`, "@rituel": `Rituel (${source})` };
  const permise = nom => !(p.sansMains && AVEC_MAINS.includes(nom)) && !(p.sansMagie && MAGIQUES.includes(nom));
  const rangs = new Map();
  const donner = (liste, [min, max]) => {
    for (const cle of liste) {
      const nom = noms[cle] ?? cle;
      if (permise(nom) && !rangs.has(nom)) rangs.set(nom, o.entre(min, max));
    }
  };
  donner(style.principales, n.principal);
  donner(style.appui ?? [], n.appui);
  donner(style.secondaires, n.secondaire);
  donner(style.autres, n.autre);
  donner(["@arme", "Esquive", "Perception"], n.autre);
  donner(o.melange(COMPLEMENTS).filter(nom => permise(nom) && !rangs.has(nom)).slice(0, 3), n.autre);

  const specialites = {
    "Arme": armes[0].naturelle ? "" : armes[0].famille,
    "Métier": style.metier ? o.choix(style.metier) : "",
    "Savoir": style.savoir ? o.choix(style.savoir) : "",
    "Médecine": style.medecine ? o.choix(style.medecine) : ""
  };
  const items = COMPETENCES_DE_BASE.map(c => ({
    name: c.name, type: "competence",
    system: { caracteristique: c.caracteristique, champ: c.champ, coutXP: c.coutXP, niveau: rangs.get(c.name) ?? 0, specialisation: (rangs.get(c.name) && specialites[c.name]) || c.specialisation || "" }
  }));
  // Une deuxième arme d'une autre famille a sa propre compétence
  for (const arme of armes.slice(1)) {
    if (arme.naturelle || arme.famille === specialites["Arme"]) continue;
    const modele = COMPETENCES_DE_BASE.find(c => c.name === "Arme");
    items.push({ name: "Arme", type: "competence", system: { caracteristique: modele.caracteristique, champ: modele.champ, coutXP: modele.coutXP, niveau: o.entre(...n.autre), specialisation: arme.famille } });
  }

  // Objets
  items.push(...armes.map(itemArme));
  if (portee) {
    items.push({ name: PROTECTIONS[portee], type: "armure", system: { protection: { energie: portee, chaleur: portee, froid: portee, trauma: portee }, emplacement: "torse" } });
  }
  if (style.sorts) items.push(...style.sorts.map(type => itemSort(type, p.source || style.cad ? source : "", style.cad ? `echo (${source.toLowerCase()})` : "canalisation", specialites["Savoir"] === "Magie" ? (rangs.get("Savoir") ?? 0) : 0)));
  if (style.cad) items.push({ name: `CAD (${source})`, type: "cad", system: { typeNexus: SOURCES[source] } });
  items.push(...(style.equipement ?? []).map(nom => ({ name: nom, type: "equipement", system: { quantite: 1 } })));
  for (const nom of CAPACITES_ESPECE[race] ?? []) if (capacites.has(nom)) items.push(structuredClone(capacites.get(nom)));

  const feminin = !!p.feminin;
  const etiquette = `${NOMS_ESPECE[race]} ${feminin ? style.feminin : style.nom}`;
  return {
    name: etiquette, type: "character",
    system: {
      race, sexe: feminin || o.chance(0.5) ? "F" : "M", archetype: feminin ? style.feminin : style.nom,
      caracteristiques: Object.fromEntries(Object.entries(caracs).map(([c, value]) => [c, { value }])),
      description: `Ennemi généré : ${etiquette}, niveau ${n.nom.toLowerCase()}.`
    },
    items,
    prototypeToken: { name: etiquette, disposition: -1, actorLink: false },
    flags: { [ID]: { ennemi: { race, style: cleStyle, niveau } } },
    // Résumé pour le MJ, retiré avant la création
    resume: {
      attaque: modificateur(caracs.coordination) + (rangs.get(noms["@arme"]) ?? 0),
      defense: modificateur(caracs.coordination) + (rangs.get("Esquive") ?? 0),
      initiative: modificateur(caracs.coordination) + modificateur(caracs.instinct),
      arme: armes[0].nom, degats: armes[0].degats + (armes[0].vigueur ? caracs.vigueur : 0), ip: ipTotal(race, portee)
    }
  };
}

/** Groupe d'ennemis : espèce ou style au hasard si demandé, toujours compatibles */
export function genererGroupe({ race = "hasard", style = "varie", nombre = 1, niveau = "moyen", capacites }, hasard = Math.random) {
  const o = outils(hasard);
  const races = race === "hasard" ? Object.keys(NOMS_ESPECE) : [race];
  const styles = style === "varie" ? Object.keys(STYLES) : [style];
  const couples = races.flatMap(r => styles.filter(s => !incompatibilite(r, s)).map(s => [r, s]));
  if (!couples.length) throw new Error(incompatibilite(races[0], styles[0]));
  const groupe = [];
  for (let i = 0; i < nombre; i++) {
    const r = o.choix([...new Set(couples.map(c => c[0]))]);
    const s = o.choix(couples.filter(c => c[0] === r).map(c => c[1]));
    groupe.push(genererEnnemi({ race: r, style: s, niveau, capacites }, hasard));
  }
  // Numéroter les ennemis qui portent le même nom
  const total = {};
  for (const e of groupe) total[e.name] = (total[e.name] ?? 0) + 1;
  const compte = {};
  for (const e of groupe) {
    if (total[e.name] < 2) continue;
    compte[e.name] = (compte[e.name] ?? 0) + 1;
    e.name = e.prototypeToken.name = `${e.name} ${compte[e.name]}`;
  }
  return groupe;
}

/* -------------------------------------------- */
/*  Foundry                                     */
/* -------------------------------------------- */

/** Capacités d'espèce du compendium, prêtes à être copiées */
async function chargerCapacites() {
  const pack = game.packs.get(`${ID}.capacites-raciales`);
  const docs = pack ? await pack.getDocuments() : [];
  return new Map(docs.map(doc => {
    const d = doc.toObject();
    const effects = (d.effects ?? []).map(({ _id, _stats, ...effet }) => effet);
    return [d.name, { name: d.name, type: d.type, img: d.img, system: d.system, effects }];
  }));
}

/** Crée les ennemis dans un dossier et envoie le résumé au MJ */
export async function creerEnnemis(options) {
  const groupe = genererGroupe({ ...options, capacites: await chargerCapacites() });
  const resumes = groupe.map(e => e.resume);
  const { race = "hasard", style = "varie", niveau = "moyen" } = options;
  const titre = `${groupe.length} × ${race === "hasard" ? "Espèces mêlées" : NOMS_ESPECE[race]}, ${style === "varie" ? "styles variés" : STYLES[style].nom} (${NIVEAUX[niveau].nom.toLowerCase()})`;
  const dossier = await Folder.create({ name: `Ennemis : ${titre}`, type: "Actor" });
  const acteurs = await Actor.createDocuments(groupe.map(({ resume, ...donnees }) => ({ ...donnees, folder: dossier.id })));

  // Santé et Nexus pleins, sorts rangés dans le CAD
  await Actor.updateDocuments(acteurs.map(a => ({ _id: a.id, system: { sante: { value: a.system.sante.max }, nexus: { value: a.system.nexus.max } } })));
  for (const a of acteurs) {
    const cad = a.items.find(i => i.type === "cad");
    if (cad) await cad.update({ "system.sorts": a.items.filter(i => i.type === "sort").map(s => s.uuid) });
  }

  const lignes = acteurs.map((a, i) => {
    const r = resumes[i];
    return `<tr><td>@UUID[${a.uuid}]{${a.name}}</td><td>${a.system.sante.max}</td><td>${signe(r.initiative)}</td><td>${signe(r.attaque)}</td><td>${signe(r.defense)}</td><td>${r.degats}</td><td>${r.ip}</td></tr>`;
  }).join("");
  await ChatMessage.create({
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="rupture2069-ennemis"><h4>${titre}</h4><table><thead><tr><th>Ennemi</th><th>PV</th><th>Init</th><th>Att.</th><th>Déf.</th><th>Dég.</th><th>IP</th></tr></thead><tbody>${lignes}</tbody></table></div>`
  });
  return acteurs;
}

/** Fenêtre du générateur, réservée au MJ */
export async function ouvrirGenerateur() {
  if (!game.user.isGM) return;
  const option = (valeur, nom, choisi) => `<option value="${valeur}"${choisi ? " selected" : ""}>${nom}</option>`;
  const majuscule = nom => nom.charAt(0).toUpperCase() + nom.slice(1);
  const content = `
    <div class="rupture2069-generateur">
      <label>Espèce <select name="race">${option("hasard", "Au hasard", true)}${Object.entries(NOMS_ESPECE).map(([k, nom]) => option(k, nom)).join("")}</select></label>
      <label>Style <select name="style">${option("varie", "Varié", true)}${Object.entries(STYLES).map(([k, s]) => option(k, majuscule(s.nom))).join("")}</select></label>
      <label>Nombre <input type="number" name="nombre" value="3" min="1" max="30" step="1"></label>
      <label>Niveau <select name="niveau">${Object.entries(NIVEAUX).map(([k, n]) => option(k, n.nom, k === "moyen")).join("")}</select></label>
      <p class="notes">Les fiches sont créées dans un dossier, avec un résumé dans le chat.</p>
    </div>`;
  const choix = await foundry.applications.api.DialogV2.wait({
    window: { title: "Générer des ennemis", icon: "fa-solid fa-skull" },
    position: { width: 400 },
    content,
    rejectClose: false,
    // Griser les styles impossibles pour l'espèce choisie
    render: () => {
      const boite = [...document.querySelectorAll(".rupture2069-generateur")].pop();
      const race = boite?.querySelector("[name=race]");
      const style = boite?.querySelector("[name=style]");
      if (!race || !style) return;
      race.addEventListener("change", () => {
        for (const opt of style.options) {
          const raison = incompatibilite(race.value, opt.value);
          opt.disabled = !!raison;
          opt.title = raison ?? "";
        }
        if (style.selectedOptions[0]?.disabled) style.value = "varie";
      });
    },
    buttons: [
      {
        action: "generer", label: "Générer", icon: "fa-solid fa-dice-d10", default: true,
        callback: (event, button) => {
          const lire = nom => button.form.querySelector(`[name=${nom}]`).value;
          return { race: lire("race"), style: lire("style"), niveau: lire("niveau"), nombre: Math.min(30, Math.max(1, Math.floor(Number(lire("nombre")) || 1))) };
        }
      },
      { action: "annuler", label: "Annuler", icon: "fa-solid fa-xmark" }
    ]
  });
  if (!choix?.race) return;
  try {
    const acteurs = await creerEnnemis(choix);
    ui.notifications.info(`${acteurs.length} ennemi(s) créé(s).`);
    return acteurs;
  } catch (erreur) {
    ui.notifications.error(`Génération impossible : ${erreur.message}`);
    throw erreur;
  }
}

/** Bouton dans l'onglet des acteurs */
export function ajouterBouton(html) {
  if (!game.user.isGM) return;
  const racine = html instanceof HTMLElement ? html : html[0];
  const actions = racine?.querySelector(".header-actions");
  if (!actions || actions.querySelector(".rupture2069-generer")) return;
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "rupture2069-generer";
  bouton.innerHTML = '<i class="fa-solid fa-skull" inert></i> <span>Générer des ennemis</span>';
  bouton.addEventListener("click", () => ouvrirGenerateur());
  actions.append(bouton);
}
