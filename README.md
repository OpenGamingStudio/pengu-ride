# Pengu Ride

Un petit pingouin lancé à la fronde (un seul lancer par partie) glisse sur la glace, rebondit sur les phoques et les icebergs, ramasse des poissons et s'habille à la boutique. Jeu web open source d'[OpenGamingStudio](https://opengamingstudio.com), jouable dans le navigateur, d'abord au doigt en portrait (mais aussi en paysage et au clavier).

Jouer : https://pengu-ride.opengamingstudio.com

## Comment jouer

- **Fronde** : pose le doigt n'importe où, tire vers le bas puis lâche (angle et puissance). Des points montrent le trajet. Clavier : Espace lance, puis Espace rebondit.
- **Rebonds** : sur un phoque (trampoline) ou un iceberg (tremplin), un cercle se resserre. Touche l'écran juste avant l'impact pour un **rebond parfait** (plus haut, plus loin). Un appui trop tôt verrouille les suivants 0,4 s : inutile de spammer. Il n'y a **aucune relance** : seuls les rebonds sur les cibles et les améliorations font gagner de la distance. Les parties démarrent courtes (10-20 s), chaque achat se sent tout de suite. La piste est générée au hasard à chaque partie.
- **Poissons** : 1 pièce chacun, 5 pour les dorés. Ils servent de monnaie.
- **Boutique** : améliorations (puissance du lancer, patins givrés, rebonds, aimant à poissons, poissons ×, 8 niveaux chacune) et cosmétiques (bonnets, écharpes, lunettes).
- Très peu de dangers : seules quelques flaques ralentissent. Une partie dure 30 à 60 secondes.
- Records, poissons, achats et réglages sont gardés dans le `localStorage` du navigateur (rien n'est envoyé nulle part).

## Développement

```bash
npm install
npm run dev        # serveur local
npm test           # tests (vitest) : physique, piste, sauvegarde, boutique
npm run build      # tsc + build Vite (dist/)
```

Vite, TypeScript, Tailwind v4, canvas 2D. Aucun dégradé, police Fredoka auto-hébergée (SIL OFL, `src/fonts/OFL.txt`), aucun CDN, aucune requête réseau. `src/sim.ts` (physique) et `src/world.ts` (piste) sont purs et testés ; `src/draw.ts` dessine tout en aplats.

Déploiement : `Dockerfile` (build Node puis nginx, port 80, en-têtes de sécurité dans `security-headers.inc`).

## Licence

MIT. Voir `LICENSE`.
