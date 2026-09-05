/**
 * Configuration de Metro.
 *
 * Active la prise en charge des fichiers SVG quand le transformateur est
 * installé : un `import Carte from './carte.svg'` renvoie alors un composant
 * React acceptant width et height, au lieu d'un chemin de fichier.
 *
 * Pour l'activer :
 *   npx expo install react-native-svg
 *   npm install --save-dev react-native-svg-transformer
 *   eas build --platform android --profile test   (module natif : recompilation)
 *
 * Tant que ces paquets sont absents, ce fichier ne fait rien et
 * l'application fonctionne normalement avec les habillages dessinés.
 */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

try {
  const transformateur = require.resolve('react-native-svg-transformer');

  config.transformer.babelTransformerPath = transformateur;
  config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
  config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];
} catch {
  // Transformateur absent : les SVG restent inutilisables, rien d'autre ne change.
}

module.exports = config;
