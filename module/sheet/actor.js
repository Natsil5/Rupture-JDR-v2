const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;
const { HandlebarsApplicationMixin } = foundry.applications.api;
import LiberChat from "../chat.js";

/** Gestion de la feuille de personnage */

export default class LiberCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["liber", "actor", "character"],
    position: { width: 700, height:800 },
    form: { submitOnChange: true },
    window: { resizable: true },
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: '.inventory-list' }], // Remplacer '.inventory-list' par votre sélecteur    tabGroups: { sheet: "inventory" },
    actions: {
      edit: LiberCharacterSheet.#onItemEdit,
      delete: LiberCharacterSheet.#onItemDelete,
      rollSave: LiberCharacterSheet.#onItemRollSave,
      rollDamage: LiberCharacterSheet.#onItemRollDamage,
      equip: LiberCharacterSheet.#onItemEquip,
      unequip: LiberCharacterSheet.#onItemUnequip,
    }
  };

  /** @override */
  static PARTS = {
    header: { template: "systems/rupture/templates/actors/character-header.hbs" },
    //main: { template: "systems/rupture/templates/actors/character-sheet.hbs" },
    tabs: { template: "systems/rupture/templates/actors/tab-navigation.hbs" },
    biography: { template: "systems/rupture/templates/actors/character-biography.hbs" },
    stat: { template: "systems/rupture/templates/actors/character-stat.hbs" },
    competence: { template: "systems/rupture/templates/actors/character-competence.hbs" },
    magie: { template: "systems/rupture/templates/actors/character-magie.hbs" },
    inventory: { template: "systems/rupture/templates/actors/character-inventory.hbs" }
  };

  /** Gestion des onglets */
  #getTabs() {
    const tabs = {
      biography: { id: "biography", group: "sheet", icon: "fa-solid fa-book", label:  "Histoire" },
      stat: { id: "stat", group: "sheet", icon: "fa-solid fa-chart-column", label:  "Statistique" },
      comp: { id: "competence", group: "sheet", icon: "fa-solid fa-graduation-cap", label:  "Competence" },
      biography: { id: "biography", group: "sheet", icon: "fa-solid fa-book", label:  "Histoire" },
      magie: { id: "magie", group: "sheet", icon: "fa-solid fa-wand-magic-sparkles", label:  "Magie" },
      inventory: { id: "inventory", group: "sheet", icon: "fa-solid fa-shapes", label: "Inventaire" }
    };
    const activeTab = this.tabGroups.sheet || "biography"; // Si aucune valeur n'est définie, l'onglet "features" est activé par défaut.
    
    for (const v of Object.values(tabs)) {
      v.active = activeTab === v.id;
      v.cssClass = v.active ? "active" : "";
      }
    return tabs;;
  }

  /** Préparation des données */
  async _prepareContext() {
    console.log("Préparation du contexte de la feuille de personnage...");

    let img = this.document.img;
    if (!img || !/\.(jpg|jpeg|png|webp|svg)$/i.test(img)) {
        img = "icons/svg/mystery-man.svg"; // Image par défaut
    }
    return {
      tabs: this.#getTabs(),
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      actor: this.document,
      system: this.document.system,
      source: this.document.toObject(),
      items: this.document.items.toObject(),
      img // On utilise l'image corrigée
    };
    
  }

  _onRender(context, options) {
    super._onRender(context, options);  // Appelez la méthode parente si nécessaire
    console.log(context);
    // Récupérer l'onglet actif spécifique à ce personnage (ou valeur par défaut)
    const activeTab = localStorage.getItem(`activeTab-${this.actor.id}`) || "background"; 
    // Appliquer l'affichage correct
    this._setActiveTab(activeTab);
    // Gérer le clic sur les onglets pour changer de vue
    this.element.querySelectorAll(".sheet-tabs [data-tab]").forEach(tab => {
      tab.addEventListener("click", (event) => {
        const newTab = event.currentTarget.dataset.tab;
        this._setActiveTab(newTab);
      });
    });
  }

  async _preparePartContext(partId, context) {
        const doc = this.document;
        switch (partId) {
            case "biography":
                context.tab = context.tabs.biography;
                context.enrichedBiography = await TextEditor.enrichHTML(this.document.system.biography, { async: true });
                break;
            case "inventory":
                context.tab = context.tabs.inventory;
                context.items = [];
                const itemsRaw = this.document.items;
                for (const item of itemsRaw) {
                    item.enrichedDescription = await TextEditor.enrichHTML(item.system.description, { async: true });
                    context.items.push(item);
                }
                break;
        }
        console.log(context);
        return context;
  }


  /** Gestion des événements au rendu */
    /** @override */
    async _onDrop(event) {
      event.preventDefault();
      console.log("Événement drop détecté :", event);

      const data = TextEditor.getDragEventData(event);
      console.log("Données récupérées :", data);

      if (data.type === "Item") {
          const item = await Item.fromDropData(data);
          console.log("Objet droppé :", item);
          if (item) {
              await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
          }
      }
    }




     /**
    * Roll a save for ability
    * @param {*} ability 
    * @returns 
    */
    async rollSave(ability) {
      const roll = await new Roll("3d6*5").roll();
      const total = roll.total;
      let success = false;
      const abilityValue = this.system.abilities[ability].value;

      if (total <= abilityValue) {
        success = true;
      }

      const abilityName = game.i18n.localize(`INTOTHEODD.Character.FIELDS.${ability}.label`);
      let introText;
      if (success) {
        introText = game.i18n.format("INTOTHEODD.Roll.SaveRoll", { ability: abilityName, value: abilityValue });
      }
      else {
        introText = game.i18n.format("INTOTHEODD.Roll.SaveRoll", { ability: abilityName, value: abilityValue });
      }

      let chatData = {
        rollType: "save",
        abilityValue,
        actingCharName: this.name,
        actingCharImg: this.img,
        introText,
        formula: roll.formula,
        total: total,
        tooltip: await roll.getTooltip(),
        success
      }

      let chat = await new IntoTheOddChat(this)
        .withTemplate("systems/intotheodd/templates/roll-result.hbs")
        .withData(chatData)
        .withRolls([roll])
        .create();

      await chat.display();

      return { roll, total, success };
  }

  /**
   * 
   * @param {*} itemName 
   * @param {*} formula 
   */
  async rollDamage(itemName, formula) {
    const roll = await new Roll(formula).roll();
    const result = roll.total;

    const label = game.i18n.format("INTOTHEODD.Roll.AttackRollDamage", { itemName });

    let chatData = {
      rollType: "damage",
      actingCharName: this.name,
      actingCharImg: this.img,
      introText: label,
      formula: roll.formula,
      total: roll.total,
      tooltip: await roll.getTooltip()
    }

    let chat = await new IntoTheOddChat(this)
      .withTemplate("systems/intotheodd/templates/roll-result.hbs")
      .withData(chatData)
      .withRolls([roll])
      .create();

    await chat.display();

    return { roll, result };
  }




  //#region Actions
    /**
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
     */
    static #onItemEdit(event, target) {
        const itemId = target.getAttribute('data-item-id');
        const item = this.actor.items.get(itemId);
        item.sheet.render(true);
    }

    /**
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
     */
    static async #onItemDelete(event, target) {
        const itemId = target.getAttribute('data-item-id');
        const item = this.actor.items.get(itemId);
        if (item.system.quantity > 1) {
            await item.update({ "system.quantity": item.system.quantity - 1 });
        } else {
            item.delete();
        }
    }

    /**
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
     */
    static async #onItemRollSave(event, target) {
        const ability = target.getAttribute('data-ability');
        const roll = await this.actor.rollSave(ability);
        //console.log('roll', roll);
    }

    /**
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
     */
    static async #onItemRollDamage(event, target) {
        const itemName = target.getAttribute('data-name');
        const formula = target.getAttribute('data-formula');
        const roll = await this.actor.rollDamage(itemName, formula);
        //console.log('roll', roll);
    }

    /**
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
     */
    static async #onShortRest(event, target) {
        await this.actor.system.shortRest();
    }

    /**
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
     */
    static async #onFullRest(event, target) {
        await this.actor.system.fullRest();
    }

    static async #onItemEquip(event, target) {
        const itemId = target.getAttribute('data-item-id');
        const item = this.actor.items.get(itemId);
        await item.update({ "system.equipped": true });
    }

    static async #onItemUnequip(event, target) {
        const itemId = target.getAttribute('data-item-id');
        const item = this.actor.items.get(itemId);
        await item.update({ "system.equipped": false });
    }

    /**
     * Handle changing a Document's image.
     *
     * @this BoilerplateActorSheet
     * @param {PointerEvent} event   The originating click event
     * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
     * @returns {Promise}
     * @private
     */
    static async #onEditImage(event, target) {
        const attr = target.dataset.edit;
        const current = foundry.utils.getProperty(this.document, attr);
        const { img } =
            this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
            {};
        const fp = new FilePicker({
            current,
            type: 'image',
            redirectToRoot: img ? [img] : [],
            callback: (path) => {
                this.document.update({ [attr]: path });
            },
            top: this.position.top + 40,
            left: this.position.left + 10,
        });
        return fp.browse();
    }
    /** @override */
  _setActiveTab(tabId) {
      if (!this.actor) return;

      // Stocker l'onglet actif en utilisant l'ID de l'acteur
      localStorage.setItem(activeTab-${this.actor.id}, tabId);

      // Masquer tous les onglets
      this.element.querySelectorAll(".tab").forEach(tab => {
          tab.style.display = "none";
      });

      // Afficher seulement l'onglet actif
      const activeTab = this.element.querySelector(.tab[data-tab="${tabId}"]);
      if (activeTab) {
          activeTab.style.display = "block";
      }

      // Mettre à jour la classe "active" dans la navigation
      this.element.querySelectorAll(".sheet-tabs [data-tab]").forEach(tab => {
          tab.classList.remove("active");
      });

      const activeTabNav = this.element.querySelector(.sheet-tabs [data-tab="${tabId}"]);
      if (activeTabNav) {
          activeTabNav.classList.add("active");
      }

      const GM = game.user.isGM;
      if (!GM) { // Vérifie si le joueur n'est PAS GM
        document.querySelectorAll('.reponse').forEach(element => {
          element.style.display = "none"; // Corrigé "this" -> "element"
        });
      }
  }
}
