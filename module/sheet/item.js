const ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/** Gestion de la feuille d'objet */
export default class LiberItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["liber", "item"],
    position: { width: 400, height: 300 },
    form: { submitOnChange: true },
    window: { resizable: true }
  };

  /** @override */
  static PARTS = {
    header: { template: "systems/rupture/templates/item/item-header.hbs" },
    main: { template: "systems/rupture/templates/item/item-sheet.hbs" },
  };

  _onRender(context, options) {
    console.log("Context rendu :", context);
  }


  /** Préparation des données */
  async _prepareContext() {
    return {
      item: this.item,
      system: this.item.system
    };
  }

  _prepareItemData(itemData) {
    const data = itemData.system;
    console.log(data)
  }

}