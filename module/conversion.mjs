/**
 * Conversion des personnages créés avant le 3D10
 * - Rien n'est modifié sans l'accord du MJ, et la conversion peut être annulée (les anciennes valeurs sont gardées).
 * - Foundry note sur chaque objet la version du système qui l'a enregistré : seuls ceux d'avant la 2.1.0 sont convertis,
 *   donc un personnage déjà en 3D10 n'est jamais divisé, même si la fenêtre est rouverte.
 * - Caractéristiques, santé, Vigueur, dégâts, Nexus et expérience ne sont jamais touchés.
 */
const ID = "rupture2069";
const PREMIERE_VERSION_3D10 = "2.1.0";

const tiers = valeur => Math.trunc((Number(valeur) || 0) / 3);
const dixieme = valeur => Math.trunc((Number(valeur) || 0) / 10);
const echapper = texte => Handlebars.escapeExpression(texte ?? "");

/** Textes des avantages et désavantages copiés du compendium : [ancien morceau, nouveau morceau] */
const TEXTES = {
  "Endurance d'exception": [["+25 à l", "+8 à l"], ["<strong>+50</strong>", "<strong>+16</strong>"]],
  "Résistance magique": [["+25 aux tests", "+8 aux tests"], ["<strong>+50</strong>", "<strong>+16</strong>"]],
  "Sens accrue": [["+30 en Perception", "+10 en Perception"]],
  "Sens du danger": [["100 de différence", "33 de différence"]],
  "Sommeil léger": [["-20 à la Perception", "-6 à la Perception"], ["au lieu de -100", "au lieu de -33"]],
  "Volonté d'exception": [["+25 à la volonté", "+8 en Concentration"], ["<strong>+50</strong>", "<strong>+16</strong>"]],
  "Armure naturelle (Worg)": [["protection de 30", "protection de 3"]],
  "Résistance (Warabouc)": [["armure naturelle de 30", "armure naturelle de 3"]],
  "Volonté d'Acier": [["+50 en concentration", "+16 en concentration"]],
  "Perception des vibrations": [["de la dizaine de leur perception", "du tiers de leur perception"]],
  "Tisseuse": [["<strong>Endurance scrap</strong>", "<strong>3 × Endurance scrap</strong>"]],
  "Allergie": [[">-40<", ">-13<"], [">-80<", ">-26<"]],
  "Myopie": [[">-50<", ">-16<"]],
  "Réaction lente": [[">-30 en initiative<", ">-10 en initiative<"], [">-50<", ">-16<"]],
  "Sommeil profond": [[">-200<", ">-66<"], [">-40<", ">-13<"]],
  "Vice": [[">-10<", ">-3<"]],
  "Vulnérabilité au chaud": [[">-80<", ">-26<"], [">-30<", ">-10<"]],
  "Vulnérabilité au froid": [[">-80<", ">-26<"], [">-30<", ">-10<"]]
};
const NOUVEAUX_NOMS = { "Volonté d'exception": "Concentration d'exception" };

/** Vrai si l'objet date d'avant le 3D10 (ou si sa conversion a été annulée) */
export function estAncien(doc) {
  const echelle = doc.flags?.[ID]?.echelle;
  if (echelle) return echelle === "3d6";
  const version = doc._stats?.systemVersion;
  return !version || foundry.utils.isNewerVersion(PREMIERE_VERSION_3D10, version);
}

/** Texte converti d'un avantage ou désavantage, ou null s'il n'y a rien à changer */
function texteConverti(nom, texte) {
  const morceaux = TEXTES[nom];
  if (!morceaux || !texte || !morceaux.every(([avant]) => texte.split(avant).length === 2)) return null;
  return morceaux.reduce((t, [avant, apres]) => t.replace(avant, () => apres), texte);
}

/** Tout ce qui porte des objets : acteurs, jetons non liés modifiés, objets du monde */
function porteurs() {
  const liste = game.actors.map(acteur => ({ acteur, nom: acteur.name, items: acteur.items.contents }));
  for (const scene of game.scenes) {
    for (const jeton of scene.tokens) {
      if (jeton.actorLink || !jeton.actor) continue;
      const propres = new Set((jeton.delta?._source?.items ?? []).filter(i => i.type).map(i => i._id));
      if (!propres.size) continue;
      liste.push({
        acteur: jeton.actor,
        nom: `${jeton.name} (jeton, ${scene.name})`,
        items: jeton.actor.items.filter(i => propres.has(i.id))
      });
    }
  }
  if (game.items.size) liste.push({ acteur: null, nom: "Objets du monde", items: game.items.contents });
  return liste;
}

/** Changements possibles pour un porteur, rangés par catégorie */
export function recenser(porteur) {
  const lot = { ...porteur, competences: [], bonus: [], textes: [], armures: [], initiative: null };
  for (const item of porteur.items) {
    if (!estAncien(item)) continue;
    const s = item.system;
    if (item.type === "competence" && Number(s.niveau)) {
      lot.competences.push({ item, avant: { system: { niveau: s.niveau } }, apres: { system: { niveau: tiers(s.niveau) } } });
    } else if (item.type === "bouclier" && Number(s.bonusParade)) {
      lot.bonus.push({ item, avant: { system: { bonusParade: s.bonusParade } }, apres: { system: { bonusParade: tiers(s.bonusParade) } } });
    } else if (item.type === "armure") {
      const avant = {};
      const apres = {};
      for (const [cle, valeur] of Object.entries(s.protection ?? {})) {
        if (Number(valeur) < 10) continue;
        avant[cle] = valeur;
        apres[cle] = dixieme(valeur);
      }
      if (Object.keys(avant).length) lot.armures.push({ item, avant: { system: { protection: avant } }, apres: { system: { protection: apres } } });
    } else if (item.type === "avantage" || item.type === "desavantage") {
      const texte = texteConverti(item.name, s.description);
      if (texte) {
        const nom = NOUVEAUX_NOMS[item.name] ?? item.name;
        lot.textes.push({ item, avant: { name: item.name, system: { description: s.description } }, apres: { name: nom, system: { description: texte } } });
      }
    }
  }
  // Le bonus d'initiative n'est converti que pour un acteur qui a encore d'anciennes compétences
  const acteur = porteur.acteur;
  const initiative = Number(acteur?._source?.system?.initiative?.bonus) || 0;
  if (initiative && lot.competences.length && acteur.flags?.[ID]?.echelle !== "3d10") lot.initiative = initiative;
  return lot;
}

const aConvertir = lot => lot.competences.length + lot.bonus.length + lot.textes.length + lot.armures.length > 0;

/** Lots à convertir dans ce monde */
export function lotsAConvertir() {
  return porteurs().map(recenser).filter(aConvertir);
}

/** Convertit les lots choisis. Les anciennes valeurs sont gardées sur chaque objet pour pouvoir annuler. */
export async function convertir(lots, { bonus = true, textes = true, armures = false } = {}) {
  const total = { personnages: 0, competences: 0, bonus: 0, textes: 0, armures: 0 };
  for (const lot of lots) {
    const choisis = [...lot.competences, ...(bonus ? lot.bonus : []), ...(textes ? lot.textes : []), ...(armures ? lot.armures : [])];
    const maj = choisis.map(c => ({ _id: c.item.id, ...c.apres, flags: { [ID]: { avant3D10: c.avant, echelle: "3d10" } } }));
    if (maj.length) {
      if (lot.acteur) await lot.acteur.updateEmbeddedDocuments("Item", maj);
      else await Item.updateDocuments(maj);
    }
    if (lot.acteur && bonus && lot.initiative) {
      await lot.acteur.update({
        system: { initiative: { bonus: tiers(lot.initiative) } },
        flags: { [ID]: { avant3D10: { system: { initiative: { bonus: lot.initiative } } }, echelle: "3d10" } }
      });
      total.bonus++;
    }
    if (lot.acteur && maj.length) total.personnages++;
    total.competences += lot.competences.length;
    if (bonus) total.bonus += lot.bonus.length;
    if (textes) total.textes += lot.textes.length;
    if (armures) total.armures += lot.armures.length;
  }
  return total;
}

/** Remet les anciennes valeurs partout où une conversion a été faite */
export async function annuler() {
  let n = 0;
  const retour = doc => ({ ...doc.flags[ID].avant3D10, flags: { [ID]: { avant3D10: null, echelle: "3d6" } } });
  const aRemettre = doc => !!doc.flags?.[ID]?.avant3D10;
  for (const porteur of porteurs()) {
    const maj = porteur.items.filter(aRemettre).map(i => ({ _id: i.id, ...retour(i) }));
    if (maj.length) {
      if (porteur.acteur) await porteur.acteur.updateEmbeddedDocuments("Item", maj);
      else await Item.updateDocuments(maj);
      n += maj.length;
    }
    if (porteur.acteur && aRemettre(porteur.acteur)) {
      await porteur.acteur.update(retour(porteur.acteur));
      n++;
    }
  }
  return n;
}

/** Fenêtre de conversion, réservée au MJ */
export async function ouvrirConversion({ demande = true } = {}) {
  if (!game.user.isGM) return;
  const lots = lotsAConvertir();
  if (!lots.length) {
    if (demande) ui.notifications.info("Rien à convertir : toutes les fiches sont déjà en 3D10.");
    return;
  }
  const somme = cle => lots.reduce((n, lot) => n + lot[cle].length, 0);
  const nbBonus = somme("bonus") + lots.filter(lot => lot.initiative).length;
  const lignes = lots.map((lot, i) => {
    const plusHaute = lot.competences.reduce((m, c) => (!m || Number(c.avant.system.niveau) > Number(m.avant.system.niveau) ? c : m), null);
    const exemple = plusHaute ? `${echapper(plusHaute.item.name)} ${plusHaute.avant.system.niveau} → ${plusHaute.apres.system.niveau}` : "";
    return `<tr><td><input type="checkbox" name="lot" value="${i}" checked></td><td>${echapper(lot.nom)}</td><td>${lot.competences.length}</td><td>${exemple}</td></tr>`;
  }).join("");
  const option = (nom, n, texte, coche) => n ? `<label><input type="checkbox" name="${nom}"${coche ? " checked" : ""}> ${texte} (${n})</label>` : "";
  const exemplesIP = [...new Set(lots.flatMap(lot => lot.armures.flatMap(c => Object.values(c.avant.system.protection))))]
    .sort((a, b) => a - b).slice(0, 5).map(v => `${v} → ${dixieme(v)}`).join(", ");
  const content = `
    <div class="rupture2069-conversion">
      <p>Ces fiches datent de l'ancienne version (3D6). Leurs compétences sont trois fois trop hautes pour le 3D10.</p>
      <table><thead><tr><th></th><th>Fiche</th><th>Compétences</th><th>Exemple</th></tr></thead><tbody>${lignes}</tbody></table>
      <p><strong>Sur les fiches cochées :</strong></p>
      <label><input type="checkbox" checked disabled> Compétences ÷ 3 (${somme("competences")})</label>
      ${option("bonus", nbBonus, "Bonus d'initiative et de parade ÷ 3", true)}
      ${option("textes", somme("textes"), "Chiffres dans le texte des avantages et désavantages", true)}
      ${option("armures", somme("armures"), `Protections d'armure ÷ 10 : ${exemplesIP}`, false)}
      <p class="notes">Caractéristiques, santé, dégâts, Nexus et expérience ne changent pas. La conversion peut être annulée.</p>
    </div>`;
  const choix = await foundry.applications.api.DialogV2.wait({
    window: { title: "Rupture : passer les fiches en 3D10" },
    position: { width: 580 },
    content,
    rejectClose: false,
    buttons: [
      {
        action: "convertir", label: "Convertir", icon: "fa-solid fa-check",
        callback: (event, button) => ({
          lots: [...button.form.querySelectorAll("input[name=lot]:checked")].map(e => lots[Number(e.value)]),
          bonus: !!button.form.querySelector("input[name=bonus]")?.checked,
          textes: !!button.form.querySelector("input[name=textes]")?.checked,
          armures: !!button.form.querySelector("input[name=armures]")?.checked
        })
      },
      { action: "tard", label: "Plus tard", icon: "fa-solid fa-clock", default: true },
      { action: "jamais", label: "Ne plus demander", icon: "fa-solid fa-ban" }
    ]
  });
  if (choix === "jamais") {
    await game.settings.set(ID, "conversionIgnoree", true);
    return;
  }
  if (!choix?.lots?.length) return;

  const total = await convertir(choix.lots, choix);
  await ChatMessage.create({
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    flags: { [ID]: { conversion: true } },
    content: `
      <div class="rupture2069-bonus">
        <div><strong>Conversion 3D10 :</strong> ${total.personnages} personnage(s), ${total.competences} compétence(s)${total.bonus ? `, ${total.bonus} bonus` : ""}${total.textes ? `, ${total.textes} texte(s)` : ""}${total.armures ? `, ${total.armures} armure(s)` : ""}.</div>
        <div class="bonus-boutons"><button type="button" data-conversion="annuler">Annuler la conversion</button></div>
      </div>`
  });
}

/** Bouton « Annuler la conversion » du message de chat */
export function activerAnnulation(message, html) {
  if (!message.flags?.[ID]?.conversion) return;
  const racine = html instanceof HTMLElement ? html : html[0];
  const bouton = racine?.querySelector("[data-conversion=annuler]");
  if (!bouton) return;
  if (!game.user.isGM) return bouton.remove();
  bouton.addEventListener("click", async () => {
    bouton.disabled = true;
    const n = await annuler();
    ui.notifications.info(`Conversion annulée : ${n} élément(s) remis à leur ancienne valeur.`);
    bouton.disabled = false;
  });
}

/** Réglages : à appeler dans le hook init */
export function enregistrerConversion() {
  game.settings.register(ID, "conversionIgnoree", { scope: "world", config: false, type: Boolean, default: false });
  game.settings.registerMenu(ID, "conversion3D10", {
    name: "Anciennes fiches (3D6)",
    label: "Passer les fiches en 3D10",
    hint: "Convertit les personnages créés avant la version 2.1.0. Rien n'est changé sans confirmation.",
    icon: "fa-solid fa-dice-d10",
    restricted: true,
    type: class extends foundry.applications.api.ApplicationV2 {
      async render() {
        await ouvrirConversion();
        return this;
      }
    }
  });
}

/** Proposition au chargement du monde : à appeler dans le hook ready */
export async function proposerConversion() {
  const responsable = game.users.activeGM ? game.users.activeGM.isSelf : game.user.isGM;
  if (!responsable || game.settings.get(ID, "conversionIgnoree")) return;
  // Une armure laissée telle quelle ne suffit pas à redemander à chaque chargement
  if (!lotsAConvertir().some(lot => lot.competences.length)) return;
  await ouvrirConversion({ demande: false });
}
