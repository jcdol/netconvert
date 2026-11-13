# NetConvert

Calculateurs gratuits pour l'administration systèmes, réseaux, cloud et cybersécurité : IPv4/CIDR, VLSM, IPv6, MAC, ports, chmod, RAID, cron, débit, SLA, JSON → YAML, Base64, empreintes, mots de passe, CVSS 3.1, en-têtes HTTP, HMAC, UUID…

Tous les calculs sont faits dans le navigateur : aucune donnée n'est envoyée.

## Structure

```
public/
  index.html        → l'application (une seule page)
  _headers          → en-têtes de sécurité HTTP
functions/api/
  config.js         → GET/PUT de la configuration du site (Workers KV)
  login.js          → connexion administrateur (code vérifié côté serveur)
```

## Hébergement

Cloudflare Pages (offre gratuite) relié à ce dépôt GitHub.

| Réglage | Valeur |
|---|---|
| Framework | Aucun |
| Commande de build | *(vide)* |
| Dossier de sortie | `public` |
| Liaison KV | `NC_KV` |
| Secret | `ADMIN_CODE` |

## Auteur

© 2026 JDM
