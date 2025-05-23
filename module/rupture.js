//import les différentes classes
import {liber} from "./data/config.js";
import LiberCharacterSheet from "./sheet/actor.js";
import LiberCharacterData from "./data/actor.js";
import LiberItemSheet from "./sheet/item.js";
import LiberItemData from "./data/item.js";
import LiberMagicSheet from "./sheet/magie.js";

const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;
const ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;

/** Initialisation du système */
Hooks.once("init", async function () {
  console.log("Initialisation du système Rupture...");
  console.log(liber.ASCII)

  CONFIG.Actor.dataModels = {
    character: LiberCharacterData
  };
  console.log(CONFIG.Actor.dataModels);
  CONFIG.Item.dataModels = {
    item: LiberItemData,
    armor: LiberItemData,
    weapon: LiberItemData,
    magic: LiberItemData
  };

  Actors.unregisterSheet("core", ActorSheetV2);
  Actors.registerSheet("liber", LiberCharacterSheet, { types: ["character"], makeDefault: true });
  Items.unregisterSheet("core", ItemSheetV2);
  Items.registerSheet("liber", LiberItemSheet, {
    types: ["item", "armor", "weapon"],
    makeDefault: true
  });
    Items.registerSheet("liber", LiberMagicSheet, {
    types: ["magic"],
    makeDefault: true
  });
});

