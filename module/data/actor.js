import {SEX,COMPETENCES} from "./constants.js"; // Import de la constante METIERS

/** Modèle de données pour un personnage */
export default class LiberCharacterData extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      type: new fields.StringField({ required: true, initial: "character" }),
      name: new fields.StringField({ required: true, initial: "Nouvel Acteur" }),
      espece: new fields.StringField({ required: true, initial: "" }),
      xp: new fields.NumberField({ required: true, min: 1, initial: 1 }),
      age: new fields.NumberField({ required: true, min: 1, initial: 1 }),
      sex: new fields.StringField({
        required: true,
        initial: SEX.MALE, // Valeur par défaut
        choices: {
          [SEX.MALE]: game.i18n.localize("Rupture.Character.Sex.Male"),
          [SEX.FEMALE]: game.i18n.localize("Rupture.Character.Sex.Female"),
        }
      }),
      biography: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
      avantage: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: false }),
      desavantage: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: false }),
      vig: new fields.NumberField({ required: true, min: 20, max: 100, initial: 20 }),
      coo: new fields.NumberField({ required: true, min: 20, max: 100, initial: 20 }),
      log: new fields.NumberField({ required: true, min: 20, max: 100, initial: 20 }),
      ins: new fields.NumberField({ required: true, min: 20, max: 100, initial: 20 }),
      emp: new fields.NumberField({ required: true, min: 20, max: 100, initial: 20 }),
      pou: new fields.NumberField({ required: true, min: 20, max: 100, initial: 20 }),
      barriere: new fields.NumberField({ required: true, min: 0, max: 100, initial: 0 }),
      magieencour: new fields.NumberField({ required: true, min: 0, max: 100, initial: 0 }),
      magiemax: new fields.NumberField({ required: true, min: 0, max: 100, initial: 0 }),
      health: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      healthmax: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      acc: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      accmax: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      regeneration: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      inherence: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      armor: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      armormax: new fields.NumberField({ required: true, min: 0, initial: 0 }),      
      bouclier: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      boucliermax: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      prot: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      protmax: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      prots: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      protsmax: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      competences: new fields.SchemaField(
                Object.fromEntries(
                    Object.keys(COMPETENCES).map(key => [
                        key,
                        new fields.NumberField({ required: true, min: -20, max: 20, initial: 0, label: COMPETENCES[key] })
                    ])
                )
            )

    };
  }
  /** @override */
    static LOCALIZATION_PREFIXES = ["liber.Character"];
}


