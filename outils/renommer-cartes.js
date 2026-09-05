/**
 * Renomme un jeu de cartes vers la nomenclature du projet.
 *
 *   2C.svg  →  batons-2.svg
 *   AD.svg  →  deniers-1.svg
 *   QH.svg  →  coupes-8.svg
 *   KS.svg  →  epees-10.svg
 *
 * Par prudence, le script n'écrit rien tant qu'on ne le lui demande pas :
 *
 *   node outils/renommer-cartes.js src/ui/jeux/svg/classique
 *   node outils/renommer-cartes.js src/ui/jeux/svg/classique --appliquer
 *
 * Les 8, 9 et 10 d'un jeu de 52 cartes ne servent pas à la chkobba : ils sont
 * signalés et laissés en place.
 */

const fs = require('fs');
const path = require('path');

/** Les initiales anglaises vers les couleurs du moteur. */
const COULEURS = {
  C: 'batons', // clubs — trèfles
  D: 'deniers', // diamonds — carreaux
  H: 'coupes', // hearts — cœurs
  S: 'epees', // spades — piques
};

/**
 * Les valeurs, dans la hiérarchie de cette variante.
 *
 * Attention : le Valet vaut 9 et la Dame 8. C'est l'inverse de la
 * correspondance habituelle, et c'est voulu — dans cette chkobba, le valet
 * est plus fort que la dame.
 */
const VALEURS = {
  A: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  Q: 8, // dame
  J: 9, // valet
  K: 10, // roi
};

const dossier = process.argv[2];
const appliquer = process.argv.includes('--appliquer');

if (!dossier) {
  console.error('Usage : node outils/renommer-cartes.js <dossier> [--appliquer]');
  process.exit(1);
}
if (!fs.existsSync(dossier)) {
  console.error(`Dossier introuvable : ${dossier}`);
  process.exit(1);
}

const fichiers = fs.readdirSync(dossier).filter((f) => /\.svg$/i.test(f));

const renommages = [];
const ignores = [];
const conflits = [];

for (const fichier of fichiers) {
  const base = path.basename(fichier, path.extname(fichier)).toUpperCase();

  // Une valeur (un ou deux caractères) suivie d'une couleur.
  const correspondance = base.match(/^(10|[A2-9JQK])([CDHS])$/);
  if (!correspondance) {
    ignores.push(`${fichier} — nom non reconnu`);
    continue;
  }

  const [, valeurBrute, couleurBrute] = correspondance;
  const valeur = VALEURS[valeurBrute];

  if (valeur === undefined) {
    ignores.push(`${fichier} — carte absente du jeu de 40`);
    continue;
  }

  const cible = `${COULEURS[couleurBrute]}-${valeur}.svg`;

  if (cible === fichier) continue;
  if (fs.existsSync(path.join(dossier, cible))) {
    conflits.push(`${fichier} → ${cible} — la cible existe déjà`);
    continue;
  }

  renommages.push([fichier, cible]);
}

console.log(`\n  ${dossier}\n`);

for (const [source, cible] of renommages) {
  console.log(`  ${source.padEnd(12)} →  ${cible}`);
}

if (ignores.length > 0) {
  console.log(`\n  Laissés en place (${ignores.length}) :`);
  for (const ligne of ignores) console.log(`    ${ligne}`);
}

if (conflits.length > 0) {
  console.log(`\n  Conflits (${conflits.length}) — rien ne sera écrit :`);
  for (const ligne of conflits) console.log(`    ${ligne}`);
}

if (!appliquer) {
  console.log(`\n  ${renommages.length} fichier(s) à renommer. Essai à blanc.`);
  console.log('  Relancez avec --appliquer pour écrire.\n');
  process.exit(0);
}

if (conflits.length > 0) {
  console.error('\n  Résolvez les conflits avant d\'appliquer.\n');
  process.exit(1);
}

for (const [source, cible] of renommages) {
  fs.renameSync(path.join(dossier, source), path.join(dossier, cible));
}

console.log(`\n  ${renommages.length} fichier(s) renommé(s).`);

/* --- Contrôle final : les 40 cartes sont-elles là ? --- */

const manquantes = [];
for (const couleur of Object.values(COULEURS)) {
  for (let valeur = 1; valeur <= 10; valeur++) {
    if (!fs.existsSync(path.join(dossier, `${couleur}-${valeur}.svg`))) {
      manquantes.push(`${couleur}-${valeur}.svg`);
    }
  }
}

if (manquantes.length > 0) {
  console.log(`\n  Il manque ${manquantes.length} carte(s) :`);
  for (const nom of manquantes) console.log(`    ${nom}`);
  console.log('  Metro échouera au démarrage tant qu\'elles manquent.');
} else {
  console.log('  Les 40 cartes sont présentes.');
}

if (!fs.existsSync(path.join(dossier, 'dos.svg'))) {
  console.log('\n  Pas de dos.svg : retirez la ligne « dos: … » dans perso.tsx.');
}

console.log('');
