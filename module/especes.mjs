/**
 * Espèces : noms, modificateurs de caractéristiques et capacités
 */
export const NOMS_ESPECE = {
  fae: "Faë",
  humain: "Humain",
  jorogumo: "Jorogumo",
  pantherine: "Panthérine",
  warabouc: "Warabouc",
  wendigo: "Wendigo",
  worg: "Worg"
};

/** Modificateurs de caractéristiques */
export const MODIFICATEURS_ESPECE = {
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

/** Noms des capacités dans le compendium Capacités Raciales */
export const CAPACITES_ESPECE = {
  'fae': ['Beauté surnaturelle', 'Assaut onirique', 'Empathie faë', 'Télépathie'],
  'humain': ['Sans magie', 'Inhérence partagée', 'Habile'],
  'jorogumo': ['Beauté fascinante', 'Tisseuse', 'Perception des vibrations'],
  'pantherine': ['Régénération accrue (Panthérine)', 'Griffes (Panthérine)', 'Vision nocturne (Panthérine)', 'Mystique (Panthérine)'],
  'warabouc': ['Résistance (Warabouc)', 'Mystique (Warabouc)', 'Volonté d\'Acier'],
  'wendigo': ['Régénération accrue (Wendigo)', 'Griffes (Wendigo)', 'Immunité au froid', 'Traque', 'Vision nocturne (Wendigo)', 'Vulnérabilité à la chaleur'],
  'worg': ['Armure naturelle (Worg)', 'Sens aiguisés', 'Crocs', 'Quadrupède', 'Vision nocturne (Worg)']
};
