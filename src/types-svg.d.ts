/**
 * Déclaration des modules SVG.
 *
 * Sans ce fichier, TypeScript ne sait pas ce que renvoie
 * `import Carte from './carte.svg'` et signale une erreur sur chaque import.
 *
 * Volontairement indépendant de react-native-svg : le projet compile même
 * avant que le paquet ne soit installé.
 */

declare module '*.svg' {
  import type { ComponentType } from 'react';

  const Composant: ComponentType<{
    width?: number | string;
    height?: number | string;
    [autre: string]: unknown;
  }>;

  export default Composant;
}
