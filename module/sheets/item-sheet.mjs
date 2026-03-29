/**
 * Feuille d'item pour Rupture 2069
 */
export class Rupture2069ItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["rupture2069", "sheet", "item"],
      width: 560,
      height: 500,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/rupture2069/templates/item";
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /** @override */
  async getData() {
    const context = super.getData();

    const itemData = this.item.toObject(false);

    context.system = itemData.system;
    context.flags = itemData.flags;

    // Ajouter les enrichissements
    context.enrichedDescription = TextEditor.enrichHTML(this.item.system.description, {async: false});

    // Pour les CADs, récupérer les objets sorts complets
    if (this.item.type === 'cad') {
      const sortsComplets = [];
      
      console.log('🔍 CAD getData:', {
        sortsUuids: this.item.system.sorts,
        sortsLength: this.item.system.sorts ? this.item.system.sorts.length : 0
      });
      
      if (this.item.system.sorts) {
        for (let sortUuid of this.item.system.sorts) {
          try {
            const sort = await fromUuid(sortUuid);
            console.log('  🔎 Recherche sort:', sortUuid, '→', sort ? sort.name : 'NOT FOUND');
            if (sort) {
              sortsComplets.push(sort.toObject());
            }
          } catch (err) {
            console.error('  ❌ Erreur récupération sort:', sortUuid, err);
          }
        }
      }
      
      context.sortsComplets = sortsComplets;
      console.log('📦 Total sorts dans context:', sortsComplets.length);
    }

    return context;
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
  activateListeners(html) {
    super.activateListeners(html);

    // Synchroniser le select compétence avec la valeur stockée
    html.find('select[name="system.competenceUtilisee"]').val(this.item.system.competenceUtilisee || '');

    // Tout ce qui suit nécessite que la feuille soit éditable
    if (!this.isEditable) return;

    // Gestionnaires d'événements spécifiques
    
    // Permettre le drop de sorts sur les CADs
    if (this.item.type === 'cad') {
      html.on('drop', this._onDropSort.bind(this));
      
      // Supprimer un sort du CAD
      html.find('.cad-sort-remove').click(async (ev) => {
        ev.preventDefault();
        const sortId = $(ev.currentTarget).data('sort-id');
        const currentSorts = this.item.system.sorts || [];
        const newSorts = currentSorts.filter(id => id !== sortId);
        await this.item.update({'system.sorts': newSorts});
      });
    }
  }

  /**
   * Gérer le drop de sorts sur un CAD
   */
  async _onDropSort(event) {
    event.preventDefault();
    
    try {
      const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
      
      // Vérifier que c'est bien un sort
      if (data.type !== 'Item') return;
      
      const item = await fromUuid(data.uuid);
      if (!item || item.type !== 'sort') {
        ui.notifications.warn("Vous ne pouvez ajouter que des sorts à un CAD.");
        return;
      }
      
      // Ajouter le sort au CAD en stockant son UUID
      const currentSorts = this.item.system.sorts || [];
      if (currentSorts.includes(data.uuid)) {
        ui.notifications.info("Ce sort est déjà dans le CAD.");
        return;
      }
      
      const newSorts = [...currentSorts, data.uuid];
      await this.item.update({'system.sorts': newSorts});
      ui.notifications.info(`${item.name} ajouté au CAD !`);
      
    } catch (err) {
      console.error('Erreur lors du drop:', err);
    }
  }
}
