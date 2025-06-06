# MX-AI

**MX-AI** est un dépôt pour les projets liés à l'IA.

---

## Fonctionnalités

- [x] Connexion à un compte Google (API OAuth2)
- [x] Gestion des mails (Service: Gmail)
- [x] Server backend
- [x] Interface utilisateur
- [ ] Implementation d'un modèle d'IA
  - [ ] Utilisation de `ollama`
    - [ ] Téléchargement des modèles
    - [x] Chargement des modèles
    - [x] Génération de texte
    - [ ] Streaming de texte
    - [ ] Gestion des modèles
    - [x] Gestion des prompts
    - [x] Template de prompts
    - [ ] Compatibilité avec les API
      - [ ] API Gmail
      - [x] API Web Search
      - [ ] API Image Generation
    - [ ] Compatibilité avec les extensions communautaire (marketplace)

---

## Technologies utilisées

- [Electron](https://www.electronjs.org/)
- Packaging avec `electron-builder`

---

## Publication des mises à jour

Cette application utilise GitHub Releases pour les mises à jour automatiques. Une fois une version buildée :

1. Créez une nouvelle release sur GitHub.
2. Ajoutez le fichier `.exe` à la release.
3. Publiez la release.

---

## Patch Notes / Mises à jour

### Version 0.0.1

- Début du développement de l'application.

## License

Ce projet est sous licence Apache 2.0 - voir le fichier [LICENSE.md](LICENSE.md) pour plus de détails.
