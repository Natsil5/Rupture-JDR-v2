/**
 * Rupture 2069 - Système de jeu pour Foundry VTT
 * Version 2.0 avec Initiative, Nexus en cercles, et pré-remplissage des compétences
 */

import { Rupture2069Actor } from "./documents/actor.mjs";
import { Rupture2069Item } from "./documents/item.mjs";
import { Rupture2069Combat } from "./documents/combat.mjs";
import { Rupture2069ActorSheet } from "./sheets/actor-sheet.mjs";
import { Rupture2069ItemSheet } from "./sheets/item-sheet.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  console.log('Rupture 2069 | Initialisation du système v2.0');

  // Ajouter namespace global
  game.rupture2069 = {
    Rupture2069Actor,
    Rupture2069Item,
    Rupture2069Combat,
    rollSkillCheck,
    rollInitiative,
    createDefaultCompetences
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
 * Formule: 3d6×5 + Caractéristique + Compétence vs Difficulté
 */
export async function rollSkillCheck({
  actor,
  caracteristique,
  competence = 0,
  difficulte = 80,
  label = "Test"
} = {}) {
  
  // Récupérer la valeur de la caractéristique
  const caracValue = actor.system.caracteristiques[caracteristique]?.value || 0;
  const caracBonus = actor.system.caracteristiques[caracteristique]?.bonus || 0;
  const totalCarac = caracValue + caracBonus;

  // Formule du jet: 3d6×5
  const roll = await new Roll("(3d6) * 5").evaluate();
  const rollTotal = roll.total;

  // Calculer le résultat total
  const total = rollTotal + totalCarac + competence;
  const success = total >= difficulte;
  const margin = total - difficulte;

  // Créer le message de chat
  const flavor = `
    <div class="rupture2069-roll">
      <h3>${label}</h3>
      <div class="roll-details">
        <div class="roll-line">
          <span class="roll-label">Jet (3d6×5):</span>
          <span class="roll-value">${rollTotal}</span>
        </div>
        <div class="roll-line">
          <span class="roll-label">Caractéristique:</span>
          <span class="roll-value">${totalCarac}</span>
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
          ${success ? ` (Marge: +${margin})` : ` (Marge: ${margin})`}
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
 * Formule: 3d6×5 + Coordination + Instinct + Bonus
 */
export async function rollInitiative(actor) {
  const coordination = actor.system.caracteristiques.coordination.value + 
                      (actor.system.caracteristiques.coordination.bonus || 0);
  const instinct = actor.system.caracteristiques.instinct.value + 
                   (actor.system.caracteristiques.instinct.bonus || 0);
  const bonus = actor.system.initiative.bonus || 0;

  // Formule du jet: 3d6×5
  const roll = await new Roll("(3d6) * 5").evaluate();
  const rollTotal = roll.total;

  // Calculer le résultat total
  const total = rollTotal + coordination + instinct + bonus;

  // Créer le message de chat
  const flavor = `
    <div class="rupture2069-roll">
      <h3>Initiative - ${actor.name}</h3>
      <div class="roll-details">
        <div class="roll-line">
          <span class="roll-label">Jet (3d6×5):</span>
          <span class="roll-value">${rollTotal}</span>
        </div>
        <div class="roll-line">
          <span class="roll-label">Coordination:</span>
          <span class="roll-value">${coordination}</span>
        </div>
        <div class="roll-line">
          <span class="roll-label">Instinct:</span>
          <span class="roll-value">${instinct}</span>
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
  formula: "3d6 * 5 + @caracteristiques.coordination.value + @caracteristiques.instinct.value + @initiative.bonus",
  decimals: 0
};

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
