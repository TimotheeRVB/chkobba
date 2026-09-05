# Vos jeux de cartes

Un dossier par jeu :

```
svg/
├── classique/    cartes habituelles, avec les indices dans les coins
│   ├── deniers-1.svg … deniers-10.svg     (carreau)
│   ├── coupes-1.svg  … coupes-10.svg      (cœur)
│   ├── epees-1.svg   … epees-10.svg       (pique)
│   ├── batons-1.svg  … batons-10.svg      (trèfle)
│   └── dos.svg
└── tunisien/     cartes sans les valeurs dans les coins
    └── (mêmes 41 fichiers)
```

Les deux jeux sont déjà déclarés dans `../perso.tsx`.

## Conseils

Dessinez sur une zone de **72 × 104** unités, ou fournissez un `viewBox`
correspondant : les fichiers sont redimensionnés automatiquement, mais un
rapport différent laissera des marges.

Un dossier incomplet fait échouer le démarrage — Metro exige que chaque
fichier importé existe. Mettez la section du jeu en commentaire dans
`perso.tsx` tant qu'il n'est pas prêt.
