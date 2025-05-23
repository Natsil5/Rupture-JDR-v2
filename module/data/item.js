/** Modèle de données pour un objet */
export default class LiberItemData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      type: new foundry.data.fields.StringField({ required: true, initial: "item" }),
      name: new foundry.data.fields.StringField({ required: true, initial: "Nouvel Objet" }),
      quantity: new foundry.data.fields.NumberField({ required: true, min: 0, initial: 1 }),
      poids: new foundry.data.fields.NumberField({ required: true, min: 0, initial: 1 }),
      description: new foundry.data.fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
      items: new foundry.data.fields.ArrayField(new foundry.data.fields.ObjectField({}), { initial: [] }),
      cdt: new foundry.data.fields.NumberField({ required: true, min: 0, initial: 1 }),
      portee: new foundry.data.fields.NumberField({ required: true, min: 0, initial: 1 }),
      mun: new foundry.data.fields.NumberField({ required: true, min: 0, initial: 1 }),
      dmg: new foundry.data.fields.NumberField({ required: true, min: 0, initial: 1 })
    };
  }
}

