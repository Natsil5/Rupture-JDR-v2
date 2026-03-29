/**
 * Classe Item étendue pour Rupture 2069
 */
export class Rupture2069Item extends Item {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Préparer les données de base
  }

  /** @override */
  prepareDerivedData() {
    const itemData = this;
    const systemData = itemData.system;
    const flags = itemData.flags.rupture2069 || {};

    // Effectuer des calculs spécifiques selon le type d'item
    switch (itemData.type) {
      case 'competence':
        this._prepareCompetenceData(systemData);
        break;
      case 'arme':
        this._prepareArmeData(systemData);
        break;
      case 'sort':
        this._prepareSortData(systemData);
        break;
    }
  }

  /**
   * Prépare les données pour les compétences
   */
  _prepareCompetenceData(systemData) {
    // Les compétences ont des coûts XP différents selon leur type
    const coutBase = {
      'martiale': 2,
      'mystique': 3,
      'echo': 3,
      'physique': 1,
      'sociale': 2,
      'technique': 2,
      'utilitaire': 2
    };

    if (!systemData.coutXP) {
      systemData.coutXP = coutBase[systemData.champ] || 2;
    }
  }

  /**
   * Prépare les données pour les armes
   */
  _prepareArmeData(systemData) {
    // Calculer les dégâts totaux si nécessaire
    if (systemData.degats) {
      systemData.degatsTotal = (systemData.degats.blessure || 0) + (systemData.degats.trauma || 0);
    }
  }

  /**
   * Prépare les données pour les sorts
   */
  _prepareSortData(systemData) {
    // Les sorts n'ont plus de calcul de difficulté automatique
    // La difficulté est choisie lors du jet
  }

  /**
   * Effectue un jet pour utiliser cet item (compétence, arme, etc.)
   */
  async roll() {
    const item = this;

    // Vérifier si l'item appartient à un acteur
    if (!this.actor) {
      ui.notifications.warn("Cet item n'est attaché à aucun personnage.");
      return;
    }

    // Comportement selon le type d'item
    switch (this.type) {
      case 'competence':
        return await this._rollCompetence();
      case 'arme':
        return await this._rollArme();
      case 'sort':
        return await this._rollSort();
      default:
        // Afficher la description dans le chat
        this._displayInChat();
    }
  }

  /**
   * Jet de compétence
   */
  async _rollCompetence() {
    const systemData = this.system;
    const actor = this.actor;

    // Difficulté par défaut : Moyenne (80)
    const difficulte = 80;

    // Effectuer le jet
    return await actor.rollSkill(
      systemData.caracteristique,
      systemData.niveau,
      difficulte,
      `${this.name}${systemData.specialisation ? ' (' + systemData.specialisation + ')' : ''}`
    );
  }

  /**
   * Jet d'attaque avec une arme
   */
  async _rollArme() {
    const systemData = this.system;
    const actor = this.actor;

    // Trouver la compétence configurée sur l'arme
    const competenceUtilisee = systemData.competenceUtilisee;
    
    if (!competenceUtilisee) {
      ui.notifications.warn("Aucune compétence n'est configurée pour cette arme. Éditez l'arme pour en sélectionner une.");
      return;
    }

    // Chercher la compétence sur le personnage
    const competence = actor.items.find(i => 
      i.type === 'competence' && 
      (i.name === competenceUtilisee || 
       `${i.name}${i.system.specialisation ? ' (' + i.system.specialisation + ')' : ''}` === competenceUtilisee)
    );

    if (!competence) {
      ui.notifications.warn(`La compétence "${competenceUtilisee}" n'a pas été trouvée sur ce personnage.`);
      return;
    }

    const niveau = competence.system.niveau || 0;
    const caracteristique = competence.system.caracteristique;

    // Difficulté par défaut : Moyenne (80)
    const difficulte = 80;

    // Effectuer le jet d'attaque
    const result = await actor.rollSkill(caracteristique, niveau, difficulte, `Attaque: ${this.name}`);

    // Si réussite, afficher les dégâts
    if (result.success) {
      // Calculer les dégâts
      let degatsBase = systemData.degats.base || 0;
      
      // Ajouter la Vigueur si l'arme l'utilise
      if (systemData.ajouteVigueur) {
        const vigueur = actor.system.caracteristiques.vigueur.value + 
                       (actor.system.caracteristiques.vigueur.bonus || 0);
        degatsBase += vigueur;
      }

      const degatMessage = `
        <div class="rupture2069-damage">
          <h4>Dégâts de ${this.name}</h4>
          <div>Dégâts totaux: <strong>${degatsBase}</strong></div>
          ${systemData.ajouteVigueur ? '<div><em>(Vigueur incluse)</em></div>' : ''}
        </div>
      `;

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: degatMessage
      });
    }

    return result;
  }

  /**
   * Lancer un sort
   */
  async _rollSort() {
    const systemData = this.system;
    const actor = this.actor;

    // Vérifier si le personnage a assez de Nexus
    if (actor.system.nexus.value < systemData.coutNexus) {
      ui.notifications.warn("Pas assez de points de Nexus !");
      return;
    }

    // Trouver la compétence configurée sur le sort
    const competenceUtilisee = systemData.competenceUtilisee;
    
    if (!competenceUtilisee) {
      ui.notifications.warn("Aucune compétence n'est configurée pour ce sort.");
      return;
    }

    // Chercher la compétence sur le personnage
    const competence = actor.items.find(i => 
      i.type === 'competence' && 
      (i.name.toLowerCase() === competenceUtilisee.toLowerCase() ||
       i.name.toLowerCase().includes(competenceUtilisee.toLowerCase()))
    );

    if (!competence) {
      ui.notifications.warn(`La compétence "${competenceUtilisee}" n'a pas été trouvée sur ce personnage.`);
      return;
    }

    const niveau = competence.system.niveau || 0;
    const caracteristique = competence.system.caracteristique;

    // Lancer directement avec difficulté 80 (Moyenne)
    const difficulte = 80;

    // Effectuer le jet de magie
    const result = await actor.rollSkill(caracteristique, niveau, difficulte, `Sort: ${this.name}`);

    // Si réussite, consommer le Nexus et afficher les effets selon le jet
    if (result.success) {
      actor.update({
        'system.nexus.value': actor.system.nexus.value - systemData.coutNexus
      });

      // Déterminer l'effet selon le résultat du jet
      let effetTexte = "";
      const total = result.total;
      
      if (total >= 440) effetTexte = systemData.effets.divine || "Effet divin";
      else if (total >= 320) effetTexte = systemData.effets.surhumaine || "Effet surhumain";
      else if (total >= 280) effetTexte = systemData.effets.absurde || "Effet absurde";
      else if (total >= 240) effetTexte = systemData.effets.exceptionnelle || "Effet exceptionnel";
      else if (total >= 180) effetTexte = systemData.effets.elite || "Effet elite";
      else if (total >= 140) effetTexte = systemData.effets.tresDifficile || "Effet très difficile";
      else if (total >= 120) effetTexte = systemData.effets.difficile || "Effet difficile";
      else if (total >= 80) effetTexte = systemData.effets.moyenne || "Effet moyen";
      else if (total >= 40) effetTexte = systemData.effets.facile || "Effet facile";
      else if (total >= 20) effetTexte = systemData.effets.routine || "Effet routinier";

      const effetMessage = `
        <div class="rupture2069-spell">
          <h4>${this.name}</h4>
          <div><strong>Source:</strong> ${systemData.source || "Non défini"}</div>
          <div><strong>Rang:</strong> ${systemData.rang || 1}</div>
          <div><strong>Maintien:</strong> ${systemData.maintien === "oui" ? "Oui (bloque " + systemData.coutNexus + " Nexus)" : "Non"}</div>
          <hr style="border-color: rgba(255,255,255,0.3); margin: 5px 0;">
          <div><strong>Résultat du jet:</strong> ${total}</div>
          <div class="effet-sort"><strong>Effet:</strong> ${effetTexte}</div>
          <hr style="border-color: rgba(255,255,255,0.3); margin: 5px 0;">
          <div class="description" style="font-style: italic; margin-top: 5px;">${systemData.description}</div>
        </div>
      `;

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: effetMessage
      });
    }

    return result;
  }

  /**
   * Affiche l'item dans le chat
   */
  _displayInChat() {
    const itemData = this.system;
    
    const content = `
      <div class="rupture2069-item">
        <h3>${this.name}</h3>
        <div class="item-description">${itemData.description || ''}</div>
      </div>
    `;

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content
    });
  }
}
