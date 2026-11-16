# Audit de sécurité (revue manuelle, V1)

- Site statique : aucun serveur applicatif, aucune requête réseau (`connect-src 'none'`), aucune ressource externe.
- CSP stricte (balise meta et en-tête nginx) : `default-src 'none'`, scripts et styles `'self'` seulement, aucun style ni script en ligne.
- En-têtes : HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer, Permissions-Policy fermée, COOP same-origin.
- Aucun `innerHTML` : le DOM est construit avec `textContent`/`createElement` ; les données du `localStorage` sont validées (`parseSave`) et retombent sur les valeurs par défaut si elles sont abîmées.
- Aucun secret, aucune donnée personnelle. `npm audit` : 0 vulnérabilité.
- Dépendances de build uniquement (Vite, Tailwind, Vitest, TypeScript) ; image finale = nginx + fichiers statiques.
