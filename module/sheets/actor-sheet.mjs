/**
 * Feuille de personnage pour Rupture 2069
 */
export class Rupture2069ActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["rupture2069", "sheet", "actor"],
      template: "systems/rupture2069/templates/actor/actor-character-sheet.hbs",
      width: 850,
      height: 900,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "caracteristiques" }],
      scrollY: [".sheet-body"]
    });
  }

  /** @override */
  get template() {
    return `systems/rupture2069/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /** @override */
  async _render(force = false, options = {}) {
    const scrollEl = this.element?.find('.sheet-body')[0];
    const scrollTop = scrollEl?.scrollTop ?? 0;
    await super._render(force, options);
    const newScrollEl = this.element?.find('.sheet-body')[0];
    if (newScrollEl && scrollTop > 0) newScrollEl.scrollTop = scrollTop;
  }

  /** @override */
  async getData() {
    const context = super.getData();

    const actorData = this.actor.toObject(false);

    context.system = actorData.system;
    context.flags = actorData.flags;

    // Ajouter les options de configuration
    context.config = CONFIG.RUPTURE2069;

    // Préparer les items par type
    this._prepareItems(context);

    // Préparer les caractéristiques pour l'affichage
    this._prepareCaracteristiques(context);

    return context;
  }

  /**
   * Organise les items par catégorie
   */
  _prepareItems(context) {
    const competences = [];
    const armes = [];
    const armures = [];
    const boucliers = [];
    const equipements = [];
    const sorts = [];
    const talents = [];
    const avantages = [];
    const desavantages = [];
    const cads = [];
    const generateurs = [];

    // Itérer sur les items
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      
      // Ajouter à la catégorie appropriée
      switch (i.type) {
        case 'competence':
          competences.push(i);
          break;
        case 'arme':
          armes.push(i);
          break;
        case 'armure':
          armures.push(i);
          break;
        case 'bouclier':
          boucliers.push(i);
          break;
        case 'equipement':
          equipements.push(i);
          break;
        case 'sort':
          sorts.push(i);
          break;
        case 'talent':
          talents.push(i);
          break;
        case 'avantage':
          avantages.push(i);
          break;
        case 'desavantage':
          desavantages.push(i);
          break;
        case 'cad':
          cads.push(i);
          break;
        case 'generateur':
          generateurs.push(i);
          break;
      }
    }

    // Organiser les compétences par champ
    const competencesParChamp = {
      martiale: competences.filter(c => c.system.champ === 'martiale'),
      mystique: competences.filter(c => c.system.champ === 'mystique'),
      echo: competences.filter(c => c.system.champ === 'echo'),
      physique: competences.filter(c => c.system.champ === 'physique'),
      sociale: competences.filter(c => c.system.champ === 'sociale'),
      technique: competences.filter(c => c.system.champ === 'technique'),
      utilitaire: competences.filter(c => c.system.champ === 'utilitaire')
    };

    context.competences = competences;
    context.competencesParChamp = competencesParChamp;
    context.armes = armes;
    context.armures = armures;
    context.boucliers = boucliers;
    context.equipements = equipements;
    context.sorts = sorts;
    context.talents = talents;
    context.avantages = avantages;
    context.desavantages = desavantages;
    context.cads = cads;
    context.generateurs = generateurs;

    // Résoudre les sorts de chaque CAD depuis n'importe quelle source (Items Directory, Compendiums, etc.)
    for (let cad of cads) {
      cad.sortsResolus = [];
      if (cad.system.sorts && Array.isArray(cad.system.sorts)) {
        console.log('🔧 Résolution sorts pour CAD:', cad.name, 'UUIDs:', cad.system.sorts);
        for (let uuid of cad.system.sorts) {
          try {
            // Utiliser fromUuidSync pour récupérer le sort depuis n'importe où
            const sort = fromUuidSync(uuid);
            
            if (sort && sort.type === 'sort') {
              console.log('  ✅ Sort trouvé:', sort.name);
              cad.sortsResolus.push({
                _id: sort._id || sort.id,
                uuid: sort.uuid || uuid,
                name: sort.name,
                img: sort.img,
                system: sort.system
              });
            } else {
              console.warn('  ❌ Sort non trouvé ou mauvais type:', uuid);
            }
          } catch(error) {
            console.error('  ❌ Erreur résolution sort:', uuid, error);
          }
        }
      }
    }
    
    console.log('🔍 Sorts disponibles (onglet Magie):', sorts.length);
    console.log('📋 CADs avec sorts résolus:', cads.map(c => ({
      name: c.name,
      nbSorts: c.sortsResolus.length,
      sorts: c.sortsResolus.map(s => s.name)
    })));
  }

  /**
   * Prépare l'affichage des caractéristiques
   */
  _prepareCaracteristiques(context) {
    const caracteristiques = context.system.caracteristiques;
    
    context.caracteristiquesArray = [
      { key: 'vigueur', label: 'VIG', ...caracteristiques.vigueur },
      { key: 'coordination', label: 'COO', ...caracteristiques.coordination },
      { key: 'logique', label: 'LOG', ...caracteristiques.logique },
      { key: 'instinct', label: 'INS', ...caracteristiques.instinct },
      { key: 'empathie', label: 'EMP', ...caracteristiques.empathie },
      { key: 'pouvoir', label: 'POU', ...caracteristiques.pouvoir }
    ];
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Tout ce qui suit nécessite que la feuille soit éditable
    if (!this.isEditable) return;

    // Ajouter un item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Éditer un item
    html.find('.item-edit').click(ev => {
      ev.preventDefault();
      ev.stopPropagation();
      
      // Essayer de récupérer l'ID depuis le bouton lui-même ou depuis le parent
      let itemId = $(ev.currentTarget).data("item-id");
      if (!itemId) {
        const li = $(ev.currentTarget).closest(".item, .cad-sous-generateur, .sort-list-item");
        itemId = li.data("item-id") || li.data("itemId");
      }
      
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet.render(true);
      } else {
        console.error("Item not found:", itemId);
      }
    });

    // Supprimer un item
    html.find('.item-delete').click(async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      
      // Essayer de récupérer l'ID depuis le bouton lui-même ou depuis le parent
      let itemId = $(ev.currentTarget).data("item-id");
      if (!itemId) {
        const li = $(ev.currentTarget).closest(".item, .cad-sous-generateur, .sort-list-item");
        itemId = li.data("item-id") || li.data("itemId");
      }
      
      const item = this.actor.items.get(itemId);
      if (item) {
        await item.delete();
        this.render(false);
      }
    });

    // Lancer un jet (compétence, arme, sort)
    html.find('.item-roll').click(async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const li = $(ev.currentTarget).closest(".item");
      const itemId = li.data("item-id") || li.data("itemId");
      const item = this.actor.items.get(itemId);
      
      if (!item) return;
      
      // Si c'est un sort, utiliser le système de lancement avec Nexus du personnage
      if (item.type === 'sort') {
        await this._lancerSortDepuisMagie(item);
      } else if (item.roll) {
        // Autres items (armes, compétences, etc.)
        item.roll();
      }
    });

    // Jet de caractéristique
    html.find('.caracteristique-roll').click(ev => {
      const caracteristique = $(ev.currentTarget).data('caracteristique');
      this._onCaracteristiqueRoll(caracteristique);
    });

    // Jet d'initiative
    html.find('.initiative-roll').click(async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await this.actor.rollInitiative();
    });

    // Gestion des cercles de Nexus
    html.find('.nexus-circle').click(ev => {
      ev.preventDefault();
      const index = parseInt($(ev.currentTarget).data('index'));
      const currentValue = this.actor.system.nexus.value;
      
      // Si on clique sur un cercle plein, on le vide (et tous ceux après)
      // Si on clique sur un cercle vide, on le remplit (et tous ceux avant)
      let newValue;
      if (index < currentValue) {
        newValue = index;
      } else {
        newValue = index + 1;
      }
      
      this.actor.update({'system.nexus.value': newValue});
    });

    // Gestion des points de Nexus des générateurs et CADs
    html.find('.nexus-point-interactive').click(async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const element = $(ev.currentTarget);
      const itemId = element.data('item-id');
      const pointKey = element.data('point');
      
      console.log('🔵 Clic sur point Nexus:', { itemId, pointKey });
      
      const item = this.actor.items.get(itemId);
      if (!item) {
        console.error('❌ Item non trouvé:', itemId);
        return;
      }
      
      // Vérifier que la structure existe
      if (!item.system[pointKey]) {
        console.error('❌ Structure invalide. Supprimez et recréez cet item:', item.name);
        ui.notifications.error(`${item.name} utilise l'ancienne structure. Supprimez-le et recréez-le.`);
        return;
      }
      
      console.log('✅ Item trouvé:', item.name, item.system[pointKey]);
      
      const currentUsed = item.system[pointKey].used;
      
      await item.update({
        [`system.${pointKey}.used`]: !currentUsed
      });
      
      console.log('✅ Mis à jour:', pointKey, 'used:', !currentUsed);
    });

    // Gestion de la sélection de générateur pour les CADs
    html.find('.cad-generateur-select').change(async (ev) => {
      const cadId = $(ev.currentTarget).data('cad-id');
      const generateurId = $(ev.currentTarget).val();
      
      const cad = this.actor.items.get(cadId);
      if (!cad) return;
      
      if (generateurId === '') {
        // Déconnexion
        await cad.update({
          'system.brancheAuGenerateur': false,
          'system.generateurId': '',
          'system.typeGenerateur': ''
        });
        ui.notifications.info(`${cad.name} déconnecté.`);
      } else {
        // Connexion à un générateur
        const generateur = this.actor.items.get(generateurId);
        if (!generateur) return;
        
        // Détecter le type du générateur
        let typeGenerateur = 'soma';
        if (generateur.system.nexus1.actif) typeGenerateur = generateur.system.nexus1.type;
        else if (generateur.system.nexus2.actif) typeGenerateur = generateur.system.nexus2.type;
        else if (generateur.system.nexus3.actif) typeGenerateur = generateur.system.nexus3.type;
        
        await cad.update({
          'system.brancheAuGenerateur': true,
          'system.generateurId': generateurId,
          'system.typeGenerateur': typeGenerateur
        });
        
        ui.notifications.info(`${cad.name} connecté à ${generateur.name} (${typeGenerateur}) !`);
      }
    });

    // Lancer un sort depuis un CAD
    html.find('.sort-roll, .sort-roll-small').click(async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      
      const sortId = $(ev.currentTarget).data('sort-id');
      const cadId = $(ev.currentTarget).data('cad-id');
      
      const cad = this.actor.items.get(cadId);
      if (!cad) {
        ui.notifications.error("CAD introuvable.");
        return;
      }
      
      // Chercher le sort dans les sorts résolus du CAD
      let sort = null;
      if (cad.sortsResolus) {
        sort = cad.sortsResolus.find(s => s._id === sortId);
      }
      
      // Si pas trouvé dans sortsResolus, essayer de le récupérer par UUID depuis le CAD
      if (!sort && cad.system.sorts) {
        for (let uuid of cad.system.sorts) {
          const s = fromUuidSync(uuid);
          if (s && (s._id === sortId || s.id === sortId)) {
            sort = s;
            break;
          }
        }
      }
      
      if (!sort) {
        ui.notifications.error("Sort introuvable.");
        console.error('Sort non trouvé, sortId:', sortId, 'CAD sorts:', cad.system.sorts);
        return;
      }
      
      await this._lancerSort(sort, cad);
    });

    // Gestion des modificateurs (rollable)
    html.find('.rollable').click(this._onRoll.bind(this));

    // Gestion des effets actifs
    html.find('.effect-toggle').click(async (ev) => {
      ev.preventDefault();
      const effectId = $(ev.currentTarget).closest('.effect-item').data('effect-id');
      const effect = this.actor.effects.get(effectId);
      
      if (effect) {
        await effect.update({ disabled: !effect.disabled });
        ui.notifications.info(`Effet ${effect.disabled ? 'désactivé' : 'activé'}: ${effect.name}`);
      }
    });

    html.find('.effect-delete').click(async (ev) => {
      ev.preventDefault();
      const effectId = $(ev.currentTarget).closest('.effect-item').data('effect-id');
      const effect = this.actor.effects.get(effectId);
      
      if (effect) {
        await effect.delete();
        ui.notifications.info(`Effet supprimé: ${effect.name}`);
      }
    });

    // Synchroniser le select race avec la valeur réelle stockée
    html.find('select[name="system.race"]').val(this.actor.system.race ?? '');

    // Gestion du changement d'espèce
    html.find('select[name="system.race"]').change(async (ev) => {
      const newRace = $(ev.currentTarget).val();
      await this._onRaceChange(newRace);
    });
  }

  /**
   * Gérer la création d'un nouvel item
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    
    const itemData = {
      name: `Nouveau ${type}`,
      type: type,
      system: {}
    };

    // Données spécifiques selon le type
    if (type === 'competence') {
      itemData.name = 'Nouvelle Compétence';
      itemData.system = {
        niveau: 0,
        caracteristique: 'vigueur',
        champ: 'utilitaire'
      };
    }

    return await Item.create(itemData, {parent: this.actor});
  }

  /**
   * Jet de caractéristique
   */
  async _onCaracteristiqueRoll(caracteristique) {
    // Demander la difficulté
    const difficulte = await this._askForDifficulty();
    if (difficulte === null) return;

    // Labels des caractéristiques
    const labels = {
      vigueur: 'Vigueur',
      coordination: 'Coordination',
      logique: 'Logique',
      instinct: 'Instinct',
      empathie: 'Empathie',
      pouvoir: 'Pouvoir'
    };

    // Effectuer le jet
    await this.actor.rollSkill(caracteristique, 0, difficulte, `Test de ${labels[caracteristique]}`);
  }

  /**
   * Demande la difficulté
   */
  async _askForDifficulty() {
    return new Promise((resolve) => {
      new Dialog({
        title: "Difficulté du test",
        content: `
          <form>
            <div class="form-group">
              <label>Choisissez la difficulté:</label>
              <select id="difficulty" name="difficulty">
                <option value="20">Routine (20)</option>
                <option value="40">Facile (40)</option>
                <option value="80" selected>Moyenne (80)</option>
                <option value="120">Difficile (120)</option>
                <option value="140">Très Difficile (140)</option>
                <option value="180">Elite (180)</option>
                <option value="240">Exceptionnelle (240)</option>
                <option value="280">Absurde (280)</option>
                <option value="320">Surhumaine (320)</option>
                <option value="440">Divine (440)</option>
              </select>
            </div>
          </form>
        `,
        buttons: {
          roll: {
            label: "Lancer",
            callback: (html) => {
              const difficulty = parseInt(html.find('[name="difficulty"]').val());
              resolve(difficulty);
            }
          },
          cancel: {
            label: "Annuler",
            callback: () => resolve(null)
          }
        },
        default: "roll"
      }).render(true);
    });
  }

  /**
   * Gérer les jets génériques
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Gérer les jets d'items
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }
  }

  /**
   * Lance un sort depuis un CAD avec gestion automatique des points de Nexus
   */
  async _lancerSort(sort, cad) {
    console.log('🎯 Lancement du sort:', sort.name, 'depuis CAD:', cad.name);
    
    const coutNexus = sort.system.coutNexus || 1;
    console.log('💰 Coût du sort:', coutNexus, 'point(s)');
    
    // Déterminer le type de Nexus requis (celui du CAD)
    const typeRequis = cad.system.typeNexus;
    
    if (!typeRequis) {
      ui.notifications.error("Le CAD n'a pas de type de Nexus défini !");
      return;
    }
    
    console.log('🎨 Type de Nexus requis:', typeRequis);
    
    // Étape 1 : Compter les points disponibles du CAD (tous du même type)
    let pointsCAD = [];
    for (let i = 1; i <= 2; i++) {
      const key = `nexus${i}`;
      if (cad.system[key]?.actif && !cad.system[key]?.used) {
        pointsCAD.push({ key, type: typeRequis });
      }
    }
    
    // Étape 2 : Si connecté à un générateur, compter ses points (du bon type uniquement)
    let pointsGenerateur = [];
    let generateur = null;
    
    if (cad.system.brancheAuGenerateur && cad.system.generateurId) {
      generateur = this.actor.items.get(cad.system.generateurId);
      if (generateur) {
        for (let i = 1; i <= 3; i++) {
          const key = `nexus${i}`;
          if (generateur.system[key]?.actif && 
              !generateur.system[key]?.used &&
              generateur.system[key]?.type === typeRequis) {
            pointsGenerateur.push({ key, type: generateur.system[key].type });
          }
        }
      }
    }
    
    const totalPoints = pointsCAD.length + pointsGenerateur.length;
    console.log(`📊 Points ${typeRequis} disponibles - CAD:`, pointsCAD.length, 'Générateur:', pointsGenerateur.length, 'Total:', totalPoints);
    
    // Vérifier si on a assez de points du bon type
    if (totalPoints < coutNexus) {
      ui.notifications.error(`Pas assez de points de Nexus ${typeRequis} ! (${totalPoints}/${coutNexus} disponibles)`);
      return;
    }
    
    // Étape 3 : Sélectionner les points à utiliser (CAD d'abord, puis générateur)
    let pointsAUtiliser = [];
    let sourceNom = '';
    
    // Prendre d'abord les points du CAD
    for (let i = 0; i < Math.min(coutNexus, pointsCAD.length); i++) {
      pointsAUtiliser.push({ source: cad, ...pointsCAD[i] });
    }
    
    // Si pas assez, prendre du générateur
    const manquant = coutNexus - pointsAUtiliser.length;
    if (manquant > 0 && generateur) {
      for (let i = 0; i < Math.min(manquant, pointsGenerateur.length); i++) {
        pointsAUtiliser.push({ source: generateur, ...pointsGenerateur[i] });
      }
    }
    
    // Construire la description de la source
    const nbCAD = pointsAUtiliser.filter(p => p.source === cad).length;
    const nbGen = pointsAUtiliser.filter(p => p.source === generateur).length;
    
    if (nbCAD > 0 && nbGen > 0) {
      sourceNom = `${cad.name} (${nbCAD}) + ${generateur.name} (${nbGen})`;
    } else if (nbCAD > 0) {
      sourceNom = cad.name;
    } else {
      sourceNom = generateur.name;
    }
    
    console.log('✅ Utilisation:', sourceNom);
    console.log('🔋 Points sélectionnés:', pointsAUtiliser.map(p => `${p.source.name}.${p.key} (${p.type})`));
    
    // Consommer les points
    for (let point of pointsAUtiliser) {
      await point.source.update({
        [`system.${point.key}.used`]: true
      });
    }
    
    // Créer le message de chat
    const typeLabel = typeRequis === 'soma' ? 'Sôma' : typeRequis === 'psykhee' ? 'Psykhée' : 'Noüs';
    
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<strong>${sort.name}</strong> (Rang ${sort.system.rang})`,
      content: `
        <div class="rupture2069 chat-card">
          <div class="card-header">
            <img src="${sort.img}" width="36" height="36"/>
            <h3>${sort.name}</h3>
          </div>
          <div class="card-content">
            <p><strong>Source:</strong> ${sourceNom}</p>
            <p><strong>Coût:</strong> ${coutNexus} ${typeLabel}</p>
            <p><strong>Action:</strong> ${sort.system.action}</p>
            <p><strong>Maintien:</strong> ${sort.system.maintien === 'oui' ? 'Oui ⏳' : 'Non ⚡'}</p>
            ${sort.system.description ? `<hr/><p>${sort.system.description}</p>` : ''}
          </div>
        </div>
      `
    };
    
    await ChatMessage.create(messageData);
    
    // Si le sort n'est pas maintenu, recharger immédiatement les points
    if (sort.system.maintien !== 'oui') {
      console.log('⚡ Sort instantané - Recharge automatique des points de Nexus');
      
      // Attendre 500ms pour l'effet visuel
      setTimeout(async () => {
        for (let point of pointsAUtiliser) {
          await point.source.update({
            [`system.${point.key}.used`]: false
          });
        }
        ui.notifications.info(`${coutNexus} point(s) de Nexus rechargé(s) automatiquement (sort instantané)`);
      }, 500);
    } else {
      console.log('⏳ Sort maintenu - Les points restent consommés');
      ui.notifications.warn(`${coutNexus} point(s) de Nexus consommé(s) (sort maintenu). Cliquez sur les points pour les recharger manuellement.`);
    }
  }

  /**
   * Lance un sort depuis l'onglet Magie avec les points de Nexus du personnage
   */
  async _lancerSortDepuisMagie(sort) {
    console.log('🎯 Lancement du sort depuis Magie:', sort.name);
    
    const coutNexus = sort.system.coutNexus || 1;
    const nexusActuel = this.actor.system.nexus.value;
    
    // Vérifier si le personnage a assez de points
    if (nexusActuel < coutNexus) {
      ui.notifications.error(`Pas assez de points de Nexus ! (${nexusActuel}/${coutNexus} requis)`);
      return;
    }
    
    console.log(`✅ Nexus disponibles: ${nexusActuel}/${this.actor.system.nexus.max}`);
    
    // Consommer les points de Nexus
    const nouveauNexus = nexusActuel - coutNexus;
    await this.actor.update({
      'system.nexus.value': nouveauNexus
    });
    
    console.log(`💫 ${coutNexus} point(s) consommé(s) - Reste: ${nouveauNexus}`);
    
    // Créer le message de chat
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<strong>${sort.name}</strong> (Rang ${sort.system.rang})`,
      content: `
        <div class="rupture2069 chat-card">
          <div class="card-header">
            <img src="${sort.img}" width="36" height="36"/>
            <h3>${sort.name}</h3>
          </div>
          <div class="card-content">
            <p><strong>Lanceur:</strong> ${this.actor.name}</p>
            <p><strong>Nexus utilisé:</strong> ${coutNexus} point(s)</p>
            <p><strong>Action:</strong> ${sort.system.action}</p>
            <p><strong>Maintien:</strong> ${sort.system.maintien === 'oui' ? 'Oui ⏳' : 'Non ⚡'}</p>
            ${sort.system.description ? `<hr/><p>${sort.system.description}</p>` : ''}
          </div>
        </div>
      `
    };
    
    await ChatMessage.create(messageData);
    
    // Si le sort n'est pas maintenu, recharger immédiatement les points
    if (sort.system.maintien !== 'oui') {
      console.log('⚡ Sort instantané - Recharge automatique du Nexus');
      
      // Attendre 500ms pour l'effet visuel
      setTimeout(async () => {
        const nexusRecharge = Math.min(nouveauNexus + coutNexus, this.actor.system.nexus.max);
        await this.actor.update({
          'system.nexus.value': nexusRecharge
        });
        ui.notifications.info(`${coutNexus} point(s) de Nexus rechargé(s) automatiquement (sort instantané)`);
        console.log(`✨ Nexus rechargé: ${nexusRecharge}/${this.actor.system.nexus.max}`);
      }, 500);
    } else {
      console.log('⏳ Sort maintenu - Les points restent consommés');
      ui.notifications.warn(`${coutNexus} point(s) de Nexus consommé(s) (sort maintenu).`);
    }
  }

  /**
   * Gérer le changement d'espèce avec application automatique des modificateurs
   */
  async _onRaceChange(newRace) {
    const oldRace = this.actor.system.race;
    console.log('🎭 Changement d\'espèce:', oldRace, '→', newRace);

    // Configuration des modificateurs raciaux
    const raceModifiers = {
      'fae': {
        pouvoir: 10,
        empathie: 10,
        vigueur: -10
      },
      'humain': {},
      'jorogumo': {
        pouvoir: 10,
        coordination: 10,
        empathie: -10
      },
      'pantherine': {
        pouvoir: 10,
        coordination: 10,
        empathie: -10
      },
      'warabouc': {
        logique: 10,
        pouvoir: 10,
        coordination: -10
      },
      'wendigo': {
        vigueur: 10,
        pouvoir: 10,
        coordination: -10
      },
      'worg': {
        vigueur: 10,
        pouvoir: 10,
        empathie: -10
      }
    };

    // Noms des capacités raciales
    const raceAbilities = {
      'fae': ['Beauté surnaturelle', 'Assaut onirique', 'Empathie faë', 'Télépathie'],
      'humain': ['Sans magie', 'Inhérence partagée', 'Habile'],
      'jorogumo': ['Beauté fascinante', 'Tisseuse', 'Perception des vibrations'],
      'pantherine': ['Régénération accrue (Panthérine)', 'Griffes (Panthérine)', 'Vision nocturne (Panthérine)', 'Mystique (Panthérine)'],
      'warabouc': ['Résistance (Warabouc)', 'Mystique (Warabouc)', 'Volonté d\'Acier'],
      'wendigo': ['Régénération accrue (Wendigo)', 'Griffes (Wendigo)', 'Immunité au froid', 'Traque', 'Vision nocturne (Wendigo)', 'Vulnérabilité à la chaleur'],
      'worg': ['Armure naturelle (Worg)', 'Sens aiguisés', 'Crocs', 'Quadrupède', 'Vision nocturne (Worg)']
    };

    const updates = {};

    // --- 1. Supprimer l'ancienne race ---
    if (oldRace && oldRace !== newRace) {
      // Annuler les modificateurs de caractéristiques de l'ancienne race
      const oldMods = raceModifiers[oldRace] || {};
      for (let [carac, modifier] of Object.entries(oldMods)) {
        const currentValue = this.actor.system.caracteristiques[carac].value;
        updates[`system.caracteristiques.${carac}.value`] = currentValue - modifier;
        console.log(`  ↩️ ${carac}: ${currentValue} → ${currentValue - modifier} (annulation ${oldRace})`);
      }

      // Supprimer les capacités raciales de l'ancienne race
      const oldAbilities = raceAbilities[oldRace] || [];
      const itemsToDelete = this.actor.items
        .filter(i => oldAbilities.includes(i.name))
        .map(i => i.id);
      if (itemsToDelete.length > 0) {
        await this.actor.deleteEmbeddedDocuments('Item', itemsToDelete);
        console.log(`  🗑️ ${itemsToDelete.length} capacité(s) de ${oldRace} supprimée(s)`);
      }
    }

    // --- 2. Appliquer les modificateurs de la nouvelle race ---
    if (newRace) {
      const newMods = raceModifiers[newRace] || {};
      for (let [carac, modifier] of Object.entries(newMods)) {
        const base = updates[`system.caracteristiques.${carac}.value`]
          ?? this.actor.system.caracteristiques[carac].value;
        updates[`system.caracteristiques.${carac}.value`] = base + modifier;
        console.log(`  📊 ${carac} +${modifier} (${newRace})`);
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.actor.update(updates);
    }

    // --- 3. Ajouter les capacités de la nouvelle race ---
    if (newRace) {
      const pack = game.packs.get('rupture2069.capacites-raciales');
      if (!pack) {
        ui.notifications.warn('Compendium Capacités Raciales introuvable.');
        return;
      }

      await pack.getDocuments();

      const abilities = raceAbilities[newRace] || [];
      let addedCount = 0;
      for (let abilityName of abilities) {
        const ability = pack.index.find(i => i.name === abilityName);
        if (ability) {
          const existing = this.actor.items.find(i => i.name === abilityName);
          if (!existing) {
            const item = await pack.getDocument(ability._id);
            await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
            addedCount++;
            console.log(`  ✅ Capacité ajoutée: ${abilityName}`);
          }
        } else {
          console.warn(`  ❌ Capacité introuvable: ${abilityName}`);
        }
      }

      if (addedCount > 0) {
        ui.notifications.success(`${addedCount} capacité(s) raciale(s) ajoutée(s) !`);
      }
    }

    console.log('✅ Changement d\'espèce terminé !');
  }
}
