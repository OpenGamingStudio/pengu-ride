# Pengu Ride

Un petit pingouin glisse sur une pente de glace. Évite les rochers, les trous et les phoques, ramasse des poissons (la monnaie de la boutique) et va le plus loin possible. Jouable dans le navigateur, sur mobile (portrait ou paysage) et au clavier. Open source (MIT), par [OpenGamingStudio](https://opengamingstudio.com).

Jouer : https://pengu-ride.opengamingstudio.com

## Commandes

| Action | Doigt | Clavier |
|---|---|---|
| Sauter | toucher | Espace, Haut, W |
| Foncer (plus vite au sol, plonge en l'air) | maintenir | Droite, Bas, D, S |
| Freiner (plane en l'air) | maintenir et glisser vers la gauche | Gauche, A |
| Pause / sons | bouton Pause | Échap ou P / M |

La glace turbo (bande bleue) donne un coup d'accélérateur. Trois zones s'enchaînent tous les 400 m : Banquise, Aurore, Grotte de glace. Le score est la distance en mètres. La boutique propose 8 skins payés en poissons ; tout est enregistré dans le `localStorage` (aucun serveur, aucun compte).

## Développement

```sh
npm ci
npm run dev        # serveur de dev
npm test           # vitest : simulation, équité (robot), sauvegarde, boutique
npm run build      # tsc + build dans dist/
docker build -t pengu-ride . && docker run -p 8080:80 pengu-ride
```

TypeScript, Vite, Tailwind v4, Canvas 2D, Web Audio (sons synthétisés : aucun fichier externe). Police Fredoka auto-hébergée (OFL). Simulation pure dans `src/sim.ts`, réglages dans `src/config.ts`.

Accessibilité et sécurité : voir `ACCESSIBILITY.md` et `SECURITY-AUDIT.md`.

## Licence

MIT.
