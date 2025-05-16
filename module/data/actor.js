import {MORAL} from "./constants.js"; // Import de la constante METIERS

/** Modèle de données pour un personnage */
export default class LiberCharacterData extends foundry.abstract.DataModel {
  static defineSchema() {
  const fields = foundry.data.fields;

  return {
    type: new fields.StringField({ required: true, initial: "character" }),
    name: new fields.StringField({ required: true, initial: "Nouvel Acteur" }),
    level: new fields.NumberField({ required: true, min: 1, max: 100, initial: 1 }),
    health: new fields.NumberField({ required: true, min: 0, initial: 10 }),
    moral: new fields.StringField({
      required: true,
      initial: MORAL.NONE, // Valeur par défaut
      choices: {
        [MORAL.GOOD2]: game.i18n.localize("Liber.Character.Moral.Good2"),
        [MORAL.GOOD1]: game.i18n.localize("Liber.Character.Moral.Good1"),
        [MORAL.NONE]: game.i18n.localize("Liber.Character.Moral.None"),
        [MORAL.BAD1]: game.i18n.localize("Liber.Character.Moral.Bad1"),
        [MORAL.BAD2]: game.i18n.localize("Liber.Character.Moral.Bad2")
      }
    })
  };
}

  /** @override */
    static LOCALIZATION_PREFIXES = ["liber.Character"];
}

