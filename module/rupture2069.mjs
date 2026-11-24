/**
 * Rupture 2069 - Système de jeu pour Foundry VTT
 * Version 2.2 : règle 3D10 (voir regles.mjs), bonus donnés par les sorts (voir bonus.mjs), Initiative, Nexus en cercles, et pré-remplissage des compétences
 */

import { Rupture2069Actor } from "./documents/actor.mjs";
import { Rupture2069Item } from "./documents/item.mjs";
import { Rupture2069Combat } from "./documents/combat.mjs";
import { Rupture2069ActorSheet } from "./sheets/actor-sheet.mjs";
import { Rupture2069ItemSheet } from "./sheets/item-sheet.mjs";
import { DES, DIFFICULTE_DEFAUT, detailModificateur, modificateurCarac } from "./regles.mjs";
import { activerBoutons } from "./bonus.mjs";
import { activerAnnulation, annuler, enregistrerConversion, ouvrirConversion, proposerConversion } from "./conversion.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  console.log('Rupture 2069 | Initialisation du système v2.3.0');

  // Ajouter namespace global
  game.rupture2069 = {
    Rupture2069Actor,
    Rupture2069Item,
    Rupture2069Combat,
    rollSkillCheck,
    rollInitiative,
    createDefaultCompetences,
    ouvrirConversion,
    annulerConversion: annuler
  };

  // Définir les classes de documents personnalisées
  CONFIG.Actor.documentClass = Rupture2069Actor;
  CONFIG.Item.documentClass = Rupture2069Item;
  CONFIG.Combat.documentClass = Rupture2069Combat;

  // Enregistrer les feuilles de personnage
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("rupture2069", Rupture2069ActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "RUPTURE.Actor.Character"
  });

  // Enregistrer les feuilles d'items
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("rupture2069", Rupture2069ItemSheet, {
    makeDefault: true
  });

  // Enregistrer les helpers Handlebars
  registerHandlebarsHelpers();

  // Conversion des fiches d'avant le 3D10
  enregistrerConversion();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

function registerHandlebarsHelpers() {
  Handlebars.registerHelper('concat', function() {
    return Array.prototype.slice.call(arguments, 0, -1).join('');
  });

  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper('times', function(n, block) {
    let accum = '';
    for(let i = 0; i < n; ++i)
      accum += block.fn(i);
    return accum;
  });

  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper('add', function(a, b) {
    return parseInt(a) + parseInt(b);
  });

  // Helper pour OR logique
  Handlebars.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  });

  // Helper pour afficher les cercles de Nexus
  Handlebars.registerHelper('nexusCircles', function(current, max) {
    let html = '';
    for (let i = 0; i < max; i++) {
      if (i < current) {
        html += '<span class="nexus-circle filled" data-index="' + i + '">●</span>';
      } else {
        html += '<span class="nexus-circle empty" data-index="' + i + '">○</span>';
      }
    }
    return new Handlebars.SafeString(html);
  });
}

/* -------------------------------------------- */
/*  Fonction de jet de dés                      */
/* -------------------------------------------- */

/**
 * Effectue un jet de compétence dans le système Rupture 2069
 * Formule: 3d10 + Caractéristique ÷ 3 + Compétence vs Difficulté
 */
export async function rollSkillCheck({
  actor,
  caracteristique,
  competence = 0,
  difficulte = DIFFICULTE_DEFAUT,
  label = "Test"
} = {}) {
  
  // Récupérer la caractéristique et son modificateur (bonus compris)
  const carac = actor.system.caracteristiques[caracteristique];
  const modCarac = modificateurCarac(carac);
  competence = Number(competence) || 0;

  // Formule du jet: 3d10
  const roll = await new Roll(DES).evaluate();
  const rollTotal = roll.total;

  // Calculer le résultat total
  const total = rollTotal + modCarac + competence;
  const success = total >= difficulte;
  const margin = total - difficulte;

  // Image et nom du personnage
  const actorImg = actor.img || "icons/svg/mystery-man.svg";
  const actorName = actor.name;

  // Créer le message de chat
  const flavor = `
    <div class="rupture2069-roll">
      <div class="roll-header">
        <img src="${actorImg}" alt="${actorName}" title="${actorName}"/>
        <div class="roll-header-info">
          <span class="roll-actor-name">${actorName}</span>
          <h3>${label}</h3>
        </div>
      </div>
      <div class="roll-details">
        <div class="roll-line">
          <span class="roll-label">Jet (${DES}):</span>
          <span class="roll-value">${rollTotal}</span>
        </div>
        <div class="roll-line">
          <span class="roll-label">Caractéristique (${detailModificateur(carac)}):</span>
          <span class="roll-value">${modCarac}</span>
        </div>
        <div class="roll-line">
          <span class="roll-label">Compétence:</span>
          <span class="roll-value">${competence}</span>
        </div>
        <div class="roll-line total">
          <span class="roll-label">Total:</span>
          <span class="roll-value">${total}</span>
        </div>
        <div class="roll-line difficulty">
          <span class="roll-label">Difficulté:</span>
          <span class="roll-value">${difficulte}</span>
        </div>
        <div class="roll-result ${success ? 'success' : 'failure'}">
          ${success ? '✓ Réussite' : '✗ Échec'}
          ${success ? ` (Écart: +${margin})` : ` (Écart: ${margin})`}
        </div>
      </div>
    </div>
  `;

  // Envoyer le message au chat
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: flavor
  });

  return { roll, total, success, margin };
}

/**
 * Effectue un jet d'initiative
 * Formule: 3d10 + Coordination ÷ 3 + Instinct ÷ 3 + Bonus
 */
export async function rollInitiative(actor) {
  const { coordination, instinct } = actor.system.caracteristiques;
  const bonus = Number(actor.system.initiative.bonus) || 0;
  const modCoordination = modificateurCarac(coordination);
  const modInstinct = modificateurCarac(instinct);

  // Formule du jet: 3d10
  const roll = await new Roll(DES).evaluate();
  const rollTotal = roll.total;

  // Calculer le résultat total
  const total = rollTotal + modCoordination + modInstinct + bonus;

  // Créer le message de chat
  const flavor = `
    <div class="rupture2069-roll">
      <h3>Initiative - ${actor.name}</h3>
      <div class="roll-details">
        <div class="roll-line">
          <span class="roll-label">Jet (${DES}):</span>
          <span class="roll-value">${rollTotal}</span>
        </div>
        <div class="roll-line">
          <span class="roll-label">Coordination (${detailModificateur(coordination)}):</span>
          <span class="roll-value">${modCoordination}</span>
        </div>
        <div class="roll-line">
          <span class="roll-label">Instinct (${detailModificateur(instinct)}):</span>
          <span class="roll-value">${modInstinct}</span>
        </div>
        <div class="roll-line">
          <span class="roll-label">Bonus:</span>
          <span class="roll-value">${bonus}</span>
        </div>
        <div class="roll-line total">
          <span class="roll-label">Total Initiative:</span>
          <span class="roll-value">${total}</span>
        </div>
      </div>
    </div>
  `;

  // Envoyer le message au chat
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: flavor
  });

  return { roll, total };
}

/**
 * Crée les compétences de base pour un nouveau personnage
 */
export async function createDefaultCompetences(actor) {
  const competences = [
    // Compétences Martiales
    { name: "Arme", champ: "martiale", caracteristique: "coordination", coutXP: 2, specialisation: "" },
    { name: "Armes naturelles", champ: "martiale", caracteristique: "coordination", coutXP: 2 },
    { name: "Esquive", champ: "martiale", caracteristique: "coordination", coutXP: 2 },
    
    // Compétences Mystiques
    { name: "Canalisation", champ: "mystique", caracteristique: "pouvoir", coutXP: 3 },
    { name: "Rituel (Noüs)", champ: "mystique", caracteristique: "pouvoir", coutXP: 3 },
    { name: "Rituel (Psykhée)", champ: "mystique", caracteristique: "pouvoir", coutXP: 3 },
    { name: "Rituel (Sôma)", champ: "mystique", caracteristique: "pouvoir", coutXP: 3 },
    
    // Compétences Echos
    { name: "Echo (Noüs)", champ: "echo", caracteristique: "logique", coutXP: 3 },
    { name: "Echo (Psykhée)", champ: "echo", caracteristique: "logique", coutXP: 3 },
    { name: "Echo (Sôma)", champ: "echo", caracteristique: "logique", coutXP: 3 },
    { name: "Engrammes (Noüs)", champ: "echo", caracteristique: "logique", coutXP: 3 },
    { name: "Engrammes (Psykhée)", champ: "echo", caracteristique: "logique", coutXP: 3 },
    { name: "Engrammes (Sôma)", champ: "echo", caracteristique: "logique", coutXP: 3 },
    
    // Compétences Physiques
    { name: "Athlétisme", champ: "physique", caracteristique: "vigueur", coutXP: 1 },
    { name: "Discrétions", champ: "physique", caracteristique: "coordination", coutXP: 2 },
    { name: "Endurance", champ: "physique", caracteristique: "vigueur", coutXP: 1 },
    { name: "Natation", champ: "physique", caracteristique: "vigueur", coutXP: 1 },
    
    // Compétences Sociales
    { name: "Baratin", champ: "sociale", caracteristique: "empathie", coutXP: 2 },
    { name: "Commandement", champ: "sociale", caracteristique: "pouvoir", coutXP: 2 },
    { name: "Diplomatie", champ: "sociale", caracteristique: "empathie", coutXP: 2 },
    { name: "Dressage", champ: "sociale", caracteristique: "empathie", coutXP: 2 },
    { name: "Intimidation", champ: "sociale", caracteristique: "vigueur", coutXP: 2 },
    { name: "Marchandage", champ: "sociale", caracteristique: "empathie", coutXP: 2 },
    { name: "Représentation", champ: "sociale", caracteristique: "coordination", coutXP: 2 },
    { name: "Séduction", champ: "sociale", caracteristique: "pouvoir", coutXP: 2 },
    
    // Compétences Techniques
    { name: "Informatique", champ: "technique", caracteristique: "logique", coutXP: 3 },
    { name: "Ingénierie", champ: "technique", caracteristique: "logique", coutXP: 3 },
    { name: "Médecine", champ: "technique", caracteristique: "logique", coutXP: 3, specialisation: "" },
    { name: "Métier", champ: "technique", caracteristique: "logique", coutXP: 2, specialisation: "" },
    { name: "Savoir", champ: "technique", caracteristique: "logique", coutXP: 2, specialisation: "" },
    { name: "Survie", champ: "technique", caracteristique: "logique", coutXP: 3 },
    { name: "Traque", champ: "technique", caracteristique: "instinct", coutXP: 2 },
    
    // Compétences Utilitaire
    { name: "Concentration", champ: "utilitaire", caracteristique: "pouvoir", coutXP: 2 },
    { name: "Canotage", champ: "utilitaire", caracteristique: "vigueur", coutXP: 2 },
    { name: "Conduite", champ: "utilitaire", caracteristique: "coordination", coutXP: 2 },
    { name: "Equitation", champ: "utilitaire", caracteristique: "vigueur", coutXP: 2 },
    { name: "Escamotage", champ: "utilitaire", caracteristique: "coordination", coutXP: 2 },
    { name: "Navigation", champ: "utilitaire", caracteristique: "logique", coutXP: 2 },
    { name: "Perception", champ: "utilitaire", caracteristique: "instinct", coutXP: 2 },
    { name: "Pilotage", champ: "utilitaire", caracteristique: "coordination", coutXP: 2 }
  ];

  const createdCompetences = [];
  for (let comp of competences) {
    const itemData = {
      name: comp.name,
      type: "competence",
      system: {
        caracteristique: comp.caracteristique,
        champ: comp.champ,
        coutXP: comp.coutXP,
        niveau: 0,
        specialisation: comp.specialisation || ""
      }
    };
    
    const item = await Item.create(itemData, {parent: actor});
    createdCompetences.push(item);
  }

  return createdCompetences;
}

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  console.log('Rupture 2069 | Système prêt');

  // Proposer au MJ de convertir les fiches d'avant le 3D10
  await proposerConversion();
});

/* -------------------------------------------- */
/*  Combat Hooks pour l'initiative             */
/* -------------------------------------------- */

/**
 * Remplace la formule d'initiative par défaut
 */
Hooks.on("preCreateCombatant", (combatant, data, options, userId) => {
  // Ne rien faire, on laisse Foundry créer le combattant normalement
});

/**
 * Quand on lance l'initiative pour un combattant
 */
Hooks.on("combatStart", async (combat, updateData) => {
  console.log("Combat started!");
});

/**
 * Override de la méthode rollInitiative pour les combats
 */
CONFIG.Combat.initiative = {
  formula: `${DES} + @caracteristiques.coordination.modificateur + @caracteristiques.instinct.modificateur + @initiative.bonus`,
  decimals: 0
};

/* -------------------------------------------- */
/*  Boutons des bonus de sorts dans le chat     */
/* -------------------------------------------- */

Hooks.once("setup", () => {
  // Le hook a changé de nom en version 13
  const hook = (game.release?.generation ?? 12) >= 13 ? "renderChatMessageHTML" : "renderChatMessage";
  Hooks.on(hook, (message, html) => {
    activerBoutons(message, html);
    activerAnnulation(message, html);
  });
});

/* -------------------------------------------- */
/*  Hook pour initialiser la race à vide        */
/* -------------------------------------------- */

Hooks.on("preCreateActor", (actor, data, options, userId) => {
  if (actor.type === "character" && !data.system?.race) {
    actor.updateSource({ "system.race": "" });
  }
});

/* -------------------------------------------- */
/*  Hook pour créer les compétences de base     */
/* -------------------------------------------- */

Hooks.on("createActor", async (actor, options, userId) => {
  // Vérifier que c'est un personnage et qu'il n'a pas déjà de compétences
  if (actor.type === "character" && actor.items.size === 0 && game.user.id === userId) {
    ui.notifications.info("Création des compétences de base...");
    await createDefaultCompetences(actor);
    ui.notifications.success("41 compétences de base créées !");
  }
});
