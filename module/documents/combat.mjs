/**
 * Extension de la classe Combat pour Rupture 2069
 */
export class Rupture2069Combat extends Combat {
  
  /** @override */
  async rollInitiative(ids, {formula=null, updateTurn=true, messageOptions={}}={}) {
    
    // Récupérer les combattants
    ids = typeof ids === "string" ? [ids] : ids;
    const combatantUpdates = [];
    
    for (let id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant?.actor) continue;

      // Utiliser la méthode personnalisée de l'acteur
      const roll = await combatant.actor.getInitiativeRoll(combatant, formula);
      await roll.evaluate();

      // Mettre à jour le combattant
      combatantUpdates.push({
        _id: id,
        initiative: roll.total
      });

      // Créer le message dans le chat
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({
          actor: combatant.actor,
          token: combatant.token,
          alias: combatant.name
        }),
        flavor: `Initiative - ${combatant.name}`,
        rollMode: messageOptions.rollMode || game.settings.get("core", "rollMode")
      });
    }

    // Appliquer les mises à jour
    if (combatantUpdates.length) {
      await this.updateEmbeddedDocuments("Combatant", combatantUpdates);
    }

    // Mettre à jour le tour si nécessaire
    if (updateTurn && combatantUpdates.length) {
      await this.update({turn: 0});
    }

    return this;
  }
}
