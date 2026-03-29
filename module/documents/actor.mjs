/**
 * Classe Actor étendue pour Rupture 2069
 */
export class Rupture2069Actor extends Actor {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Les données de base sont préparées avant les items
  }

  /** @override */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.rupture2069 || {};

    // Effectuer les calculs spécifiques selon le type d'acteur
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prépare les données dérivées pour les personnages
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    const systemData = actorData.system;

    // Calculer la Santé selon la race, la Vigueur et le multiplicateur
    this._calculateSante(systemData);

    // Calculer le Nexus selon le Pouvoir + avantages + talents
    this._calculateNexus(systemData);

    // Calculer la Régénération selon la Vigueur
    this._calculateRegeneration(systemData);
  }

  /**
   * Calcule la Santé selon le tableau de référence + multiplicateur
   */
  _calculateSante(systemData) {
    const vigueur = systemData.caracteristiques.vigueur.value + 
                    (systemData.caracteristiques.vigueur.bonus || 0);
    const race = systemData.race || 'humain';
    const multiplicateur = systemData.sante.multiplicateur || 0;

    // Tableau de référence pour la Santé de base
    const santeTable = {
      'humain': {
        20: 25, 30: 40, 40: 55, 50: 70, 60: 85,
        70: 100, 80: 115, 90: 130, 100: 145
      },
      'fae': {
        20: 25, 30: 40, 40: 55, 50: 70, 60: 85,
        70: 100, 80: 115, 90: 130, 100: 145
      },
      'wendigo': {
        20: 50, 30: 80, 40: 110, 50: 140, 60: 170,
        70: 200, 80: 230, 90: 260, 100: 290
      },
      'worg': {
        20: 50, 30: 80, 40: 110, 50: 140, 60: 170,
        70: 200, 80: 230, 90: 260, 100: 290
      }
    };

    // Trouver la valeur de santé de base
    let santeBase = 40; // Valeur par défaut
    const raceTable = santeTable[race] || santeTable['humain'];

    // Trouver la tranche de Vigueur la plus proche
    const vigueurKeys = Object.keys(raceTable).map(k => parseInt(k)).sort((a, b) => a - b);
    for (let key of vigueurKeys) {
      if (vigueur >= key) {
        santeBase = raceTable[key];
      } else {
        break;
      }
    }

    // Stocker la santé de base
    systemData.sante.base = santeBase;

    // Appliquer le multiplicateur : base × (1 + multiplicateur × 0.1)
    // Limiter le multiplicateur à 10 maximum
    const multCapped = Math.min(multiplicateur, 10);
    const santeMax = Math.floor(santeBase * (1 + multCapped * 0.1));

    systemData.sante.max = santeMax;
    
    // S'assurer que la santé actuelle ne dépasse pas le maximum
    if (systemData.sante.value > santeMax) {
      systemData.sante.value = santeMax;
    }
  }

  /**
   * Calcule le Nexus selon le Pouvoir + bonus des avantages et talents
   */
  _calculateNexus(systemData) {
    const pouvoir = systemData.caracteristiques.pouvoir.value + 
                    (systemData.caracteristiques.pouvoir.bonus || 0);

    // Nexus de base selon le Pouvoir
    let nexusBase = 1; // Valeur par défaut

    if (pouvoir >= 20 && pouvoir <= 40) {
      nexusBase = 1;
    } else if (pouvoir >= 50 && pouvoir <= 70) {
      nexusBase = 2;
    } else if (pouvoir >= 80) {
      nexusBase = 3;
    }

    // Compter les bonus de Nexus des avantages et talents
    let bonusNexus = 0;
    for (let item of this.items) {
      if ((item.type === 'avantage' || item.type === 'talent') && item.system.bonusNexus) {
        bonusNexus += item.system.bonusNexus;
      }
    }

    // Total plafonné à 5
    const nexusTotal = Math.min(nexusBase + bonusNexus, 5);

    systemData.nexus.base = nexusBase;
    systemData.nexus.max = nexusTotal;

    // S'assurer que le Nexus actuel ne dépasse pas le maximum
    if (systemData.nexus.value > nexusTotal) {
      systemData.nexus.value = nexusTotal;
    }
  }

  /**
   * Calcule la Régénération selon la Vigueur
   */
  _calculateRegeneration(systemData) {
    const vigueur = systemData.caracteristiques.vigueur.value +
                    (systemData.caracteristiques.vigueur.bonus || 0);
    const race = systemData.race || 'humain';

    let regeneration = 10; // Valeur par défaut

    if (vigueur <= 30) {
      regeneration = 10;
    } else if (vigueur >= 40 && vigueur <= 60) {
      regeneration = 20;
    } else if (vigueur >= 70 && vigueur <= 90) {
      regeneration = 30;
    } else if (vigueur >= 100) {
      regeneration = 40;
    }

    // Bonus racial de +50 pour Wendigo et Panthérine
    if (race === 'wendigo' || race === 'pantherine') {
      regeneration += 50;
    }

    systemData.regeneration = regeneration;
  }

  /**
   * Prépare les données pour les PNJ
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;
    // Les PNJ peuvent avoir une logique simplifiée
  }

  /**
   * Effectue un jet de compétence
   */
  async rollSkill(caracteristique, competenceNiveau = 0, difficulte = 80, label = "Test") {
    const { rollSkillCheck } = game.rupture2069;
    
    return await rollSkillCheck({
      actor: this,
      caracteristique,
      competence: competenceNiveau,
      difficulte,
      label
    });
  }

  /**
   * Effectue un jet d'initiative
   */
  async rollInitiative() {
    const { rollInitiative } = game.rupture2069;
    return await rollInitiative(this);
  }

  /**
   * Override pour l'initiative dans le combat tracker
   */
  async getInitiativeRoll(combatant, formula) {
    const coordination = this.system.caracteristiques.coordination.value + 
                        (this.system.caracteristiques.coordination.bonus || 0);
    const instinct = this.system.caracteristiques.instinct.value + 
                     (this.system.caracteristiques.instinct.bonus || 0);
    const bonus = this.system.initiative?.bonus || 0;

    // Créer la formule personnalisée
    const rollFormula = `(3d6) * 5 + ${coordination} + ${instinct} + ${bonus}`;
    
    return new Roll(rollFormula, this.getRollData());
  }
}
