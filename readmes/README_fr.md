<div align="center">
  <img src="../frontend/public/logos/logo_blue.svg" alt="openteams" width="100">
</div>

<div align="center">
  <img src="../frontend/public/openteams-brand-logo.png" alt="openteams" width="200" style="margin-top: 10px; margin-bottom: 10px;">

  <h5>Planifier, construire et livrer — avec une équipe d'agents IA plutôt qu'un seul</h5>

  <p>
    openteams est une application de bureau IA open source et local-first qui aide les développeurs indépendants à planifier, construire et livrer plus vite avec une équipe IA qu'ils contrôlent.
  </p>

  <p>
    <a href="https://www.npmjs.com/package/openteams-web"><img alt="npm" src="https://img.shields.io/npm/v/openteams-web?style=flat-square" /></a>
    <a href="https://github.com/openteams-lab/openteams/actions/workflows/pre-release.yml"><img alt="Build" src="https://github.com/openteams-lab/openteams/actions/workflows/pre-release.yml/badge.svg" /></a>
    <a href="../LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" /></a>
    <a href="https://discord.gg/MbgNFJeWDc"><img alt="Discord" src="https://img.shields.io/badge/Discord-Join%20Chat-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
    <a href="images/openteams-wechat-community.png"><img alt="WeChat" src="https://img.shields.io/badge/WeChat-Join%20Group-07C160?style=flat-square&logo=wechat&logoColor=white" /></a>
    <a href="images/openteams-feishu-community.png"><img alt="Feishu/Lark" src="https://img.shields.io/badge/Feishu%2FLark-Join%20Group-3370FF?style=flat-square" /></a>
    <a href="https://doc.openteams-lab.com/getting-started"><img alt="Platforms" src="https://img.shields.io/badge/Platforms-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Web-2EA44F?style=flat-square" /></a>
  </p>

  <p>
    <a href="#démarrage-rapide">Démarrage rapide</a> |
    <a href="https://doc.openteams-lab.com">Documentation</a> 
  </p>

  <p align="center">
    <a href="../README.md">English</a> |
    <a href="./README_zh-Hans.md">简体中文</a> |
    <a href="./README_zh-Hant.md">繁體中文</a> |
    <a href="./README_ja.md">日本語</a> |
    <a href="./README_ko.md">한국어</a> |
    <a href="./README_fr.md">Français</a> |
    <a href="./README_es.md">Español</a>
  </p>
</div>

---
<div align="center">
  <video src="https://github.com/user-attachments/assets/f918d5c7-68ff-4a8b-b2b4-f4f0ab31c17d" controls width="100%">
    <a href="https://github.com/user-attachments/assets/f918d5c7-68ff-4a8b-b2b4-f4f0ab31c17d">Voir la vidéo produit</a>
  </video>
</div>

## Attendez — qu'est-ce qu'openteams, exactement ?

Vous utilisez peut-être déjà Claude Code, Codex, Gemini CLI ou un autre agent de code. Chacun sait planifier, coder, relire et tester. Mais dès qu'une tâche implique plusieurs agents, **vous devenez leur relais** : vous transportez le contexte entre les terminaux, réconciliez les changements qui se chevauchent, vérifiez ce qui est vraiment terminé et décidez qui prend la suite.

openteams ajoute la couche de coordination qui manque autour de ces agents : **un espace de travail commun, un déroulement visible pour les tâches complexes et des décisions de projet qui restent entre les mains du développeur.**

| openteams **est** | openteams **n'est pas** |
| --- | --- |
| un workspace local-first qui relie les agents de code que vous utilisez déjà | un nouveau modèle ou un remplacement de Claude Code, Codex ou Gemini CLI |
| une session partagée où les agents peuvent échanger, se transmettre le travail et conserver le même contexte | une série de chats séparés que vous devez encore coordonner vous-même |
| un workflow que vous pouvez suivre, relire, interrompre et relancer étape par étape | un gros prompt qui reste opaque jusqu'à la fin |
| des issues gérées par le développeur, des worktrees isolés et des statistiques de build | une feuille de route décidée par les agents ou un simple compteur de tokens |

**Concrètement, l'installation vous donne :** un chat direct pour les échanges rapides, un mode Plan pour l'exécution planifiée, des modèles de workflow d'équipe prêts à l'emploi, des issues gérées par le développeur et reliées aux sessions, des Git worktrees optionnels pour isoler les tâches simultanées, et des statistiques de build qui mettent les résultats en regard des tokens consommés et du coût.

```text
vos agents de code            openteams

Claude Code ─┐               ┌─ contexte partagé
Codex ───────┼──────────────►├─ workflow visible ── revue ── fusion
Gemini CLI ──┘               ├─ worktrees isolés
                             └─ issues + statistiques de build
```

## Pourquoi openteams

Faire écrire du code à des agents n'est plus le plus difficile. Le vrai travail consiste à garder l'ensemble sous contrôle : conserver le contexte, savoir où en est chaque tâche, éviter que des travaux parallèles se marchent dessus, choisir la suite et connaître le coût réel.

openteams rassemble les agents et leurs échanges dans une même session. Pour les tâches complexes, le mode Workflow montre les étapes et leurs dépendances, ce qui permet de relire ou de relancer uniquement la partie nécessaire. Lorsque plusieurs sessions travaillent en parallèle, chacune peut disposer de son propre Git worktree ; les changements restent séparés jusqu'à ce que vous décidiez de les fusionner ou de les abandonner.

La direction du projet reste entre les mains du développeur. Les issues contiennent le travail que vous avez choisi et renvoient vers les sessions où les agents l'exécutent. Les agents font le travail, mais ne changent pas le plan à votre place. Une fois le travail terminé, les statistiques de build rapprochent les résultats de la consommation de tokens et du coût.

openteams ne cherche pas à ajouter davantage d'agents. Il sert à savoir, à tout moment, ce qui est en cours de construction, où se trouvent les changements, quelle est la prochaine étape et combien le résultat a coûté.

## Démarrage rapide
### Installation
#### npx

```bash
npx openteams-web
```

#### Application desktop

Téléchargez la dernière version pour votre plateforme depuis GitHub Releases.

[![Download for Windows](https://img.shields.io/badge/Download-Windows-0078D6?style=for-the-badge&logo=windows)](https://github.com/openteams-lab/openteams/releases/latest)
[![Download for Linux](https://img.shields.io/badge/Download-Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/openteams-lab/openteams/releases/latest)

### Configurer les fournisseurs

**openteams** inclut un agent openteams CLI intégré. Configurez vos fournisseurs de modèles dans l'application via `menu->setting->provider config->add provider`.

⚙️ [Configuration des fournisseurs](https://doc.openteams-lab.com/advanced-usage/custom-provider)

Vous pouvez aussi connecter des agents de code pris en charge :

| Agent | Exemple d'installation |
| --- | --- |
| Claude Code | `npm i -g @anthropic-ai/claude-code` |
| Gemini CLI | `npm i -g @google/gemini-cli` |
| Codex | `npm i -g @openai/codex` |
| Qwen Code | `npm i -g @qwen-code/qwen-code` |
| OpenCode | `npm i -g opencode-ai` |

📚 [Autres guides d'installation d'agents](https://doc.openteams-lab.com/getting-started)

### Démarrer en 30 secondes
**Prérequis : configurez un fournisseur de service API ou installez n'importe quel Code Agent pris en charge.**

*étape 1.* Créez une session de chat de groupe. Ajoutez un ou plusieurs membres, puis assignez à chacun un modèle et un rôle.

*étape 2.* En mode Free Chat, utilisez `@` pour envoyer un message ou assigner une tâche à un membre.

*étape 3.* Passez en mode Workflow. Discutez des exigences avec le lead agent, affinez la solution et générez un plan d'exécution.

*étape 4.* Lancez l'exécution et relisez le résultat de chaque noeud de tâche lorsqu'il se termine.

## Modes de travail

**openteams** prend en charge deux modes de collaboration, car toutes les tâches n'exigent pas le même niveau de structure. Pensez-y comme aux modes **Plan et Build de Claude Code**, mais pour des équipes multi-agents : choisissez la collaboration libre lorsque vous voulez que les agents explorent et discutent ouvertement, et les workflows structurés lorsque vous avez besoin d'une exécution fiable et prévisible.

### Free Chat

En mode chat libre, vous utilisez `@` pour envoyer une tâche à n'importe quel agent, et les agents peuvent se transmettre librement des messages. La collaboration est régie par un protocole d'équipe que vous définissez : qui fait quoi, comment les relais se passent et quelles normes suivre.

**free chat mode** convient aux petites corrections, aux revues rapides et aux discussions exploratoires pour lesquelles un workflow complet serait excessif.

![](images/free_chat.png)

### Workflow

Le mode Workflow est conçu pour les tâches complexes qui doivent être décomposées en sous-tâches, avec une progression observable et une exécution contrôlable à chaque étape.

Un lead agent pilote la phase de planification : clarification des exigences, conception de l'approche, définition du plan d'exécution et affectation des tâches aux bons agents. Le résultat est un workflow visible avec étapes, dépendances, revues, relances et points d'acceptation.

![](images/openteams-workflow.png)

Au lieu de laisser les agents s'enchaîner de façon lâche, **openteams** transforme le travail en graphe d'exécution avec état.

**Remarque : le mode Workflow consomme plus de tokens. Assurez-vous que votre solde de tokens est suffisant.**

## Mises à jour majeures
- **2026.05.20 (v0.4.4)**
  - Version beta du mode Workflow
- **2026.05.07 (v0.3.22)**
  - Possibilité d'enregistrer en un clic les membres d'une session de chat de groupe comme équipe prédéfinie
- **2026.04.14 (v0.3.15)**
  - Visualiseur des changements de fichiers du workspace
- **2026.04.06 (v0.3.12)**
  - Activation du mode UI sombre
  - Correction des problèmes de concurrence d'openteams-cli
- **2026.04.02 (v0.3.10)**
  - Mise en place de la mise à jour de version dans l'application
  - Le site de documentation est désormais en ligne

## Feuille de route

openteams est en développement actif. Voici la direction que nous prenons :

- [ ] **Travailleurs IA experts** — Lancer davantage de travailleurs IA dotés de connaissances métier spécialisées, capables de résoudre des problèmes experts.
- [ ] **Équipes IA à haut rendement** — Composer des équipes de travailleurs IA experts efficaces, capables de personnaliser des workflows de production pour des besoins métier précis et de transformer les exigences en livrables de bout en bout.
- [ ] **Intégrer davantage d'agents** — Intégrer davantage d'agents couramment utilisés, comme Kilo code, hermes-agent, openclaw, etc.

***Vision : transformer la consommation de tokens en productivité réelle.***

Vous avez une demande de fonctionnalité ou souhaitez contribuer à l'orientation du projet ? [Ouvrez une discussion](https://github.com/openteams-lab/openteams/discussions).

## Communauté

- [GitHub Issues](https://github.com/openteams-lab/openteams/issues) : bugs et demandes de fonctionnalités
- [GitHub Discussions](https://github.com/openteams-lab/openteams/discussions) : idées produit et questions
- [Discord](https://discord.gg/openteams) : chat communautaire
- [Linux.do](https://linux.do) : lien ami ; merci pour le soutien aux échanges de la communauté
- Groupes communautaires :

<p>
  <a href="images/openteams-wechat-community.png"><img alt="QR code du groupe communautaire WeChat openteams" src="images/openteams-wechat-community.png" width="260"></a>
  <a href="images/openteams-feishu-community.png"><img alt="QR code du groupe communautaire Feishu/Lark openteams" src="images/openteams-feishu-community.png" width="260"></a>
</p>

## Fonctionnalités clés

| Fonctionnalité | Ce que cela signifie |
| --- | --- |
| Employés IA et équipes IA | Transformez les tokens en productivité réelle. Chaque employé IA ou équipe possède une expertise de domaine qui transforme les modèles généralistes en spécialistes prêts à livrer du travail, pas seulement à générer du texte. |
| Workspace multi-agent | Faites entrer plusieurs agents IA dans une même session partagée au lieu de jongler entre des fenêtres séparées. |
| Contexte partagé | Les agents travaillent à partir de la même conversation et du même contexte projet. |
| Free Chat | Utilisez `@` pour une collaboration directe et légère avec les agents. |
| Mode Workflow | Convertissez les tâches complexes en étapes structurées, dépendances, revues, relances et acceptation. |
| Exécution visible | Voyez ce que fait chaque agent et où le travail est bloqué. |
| Revue et relance | Relisez une étape, relancez la bonne tâche et évitez de redémarrer tout le projet. |
| Gestion des issues | Enregistrez et priorisez les éléments de travail contrôlés par le développeur, synchronisez les issues GitHub et créez ou reliez des sessions d'exécution. |
| Workspaces isolés | Exécutez les tâches de chaque session dans un Git worktree distinct, puis relisez, fusionnez ou abandonnez chaque résultat sans affecter les autres travaux. |
| Statistiques de build | Comparez les bugs corrigés et les fonctionnalités livrées avec la consommation de tokens et les coûts par session et par modèle. |
| Artefacts et traces | Conservez les logs, diffs, transcriptions et artefacts générés attachés au travail. |
| Exécution locale dans le workspace | Les agents travaillent sur votre workspace configuré, avec les enregistrements d'exécution conservés sous `.openteams/`. |

## À qui cela s'adresse

openteams s'adresse à :

- des développeurs qui utilisent plusieurs agents de code et en ont assez de jongler entre eux
- des leads techniques qui ont besoin que les exécutions d'agents soient relisibles et reproductibles

Ce n'est pas seulement un endroit pour rassembler plus d'agents. C'est une façon de transformer des agents en véritable équipe de travail.

## Stack technique

| Couche | Technologie |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Rust |
| Desktop | Tauri |
| Database | SQLx-managed relational schema |
| Workflow UI | React Flow |

## Développement local

### Prérequis

- **Rust** >= 1.75
- **Node.js** >= 18
- **pnpm** >= 8

### macOS, Linux et Windows

```bash
# Clone the repository
git clone https://github.com/openteams-lab/openteams.git
cd openteams
pnpm i
npm run dev
# build
pnpm --filter frontend build
pnpm desktop:build
```

### Compiler `openteams-cli` localement

Utilisez les commandes suivantes si vous devez compiler le binaire local `openteams-cli` au lieu d'utiliser la version intégrée ou publiée.
Les artefacts de build seront placés dans le répertoire binaries.

```bash
# From the repository root
bun run ./scripts/build-openteams-cli.ts
```

## Contribution

Les contributions sont les bienvenues. Voici comment commencer :

1. **Trouver une issue** — Consultez les [Good First Issues](https://github.com/openteams-lab/openteams/labels/good%20first%20issue) pour des tâches accessibles aux débutants, ou parcourez les issues ouvertes.
2. **Discuter avant de construire** — Avant d'ouvrir une grosse pull request, ouvrez une issue ou une discussion afin d'aligner la direction.
3. **Respecter le style de code** — Exécutez ce qui suit avant de soumettre :

```bash
pnpm run format
pnpm run check
pnpm run lint
```

4. **Soumettre une PR** — Décrivez ce que vous avez changé et pourquoi. Liez l'issue associée le cas échéant.

Consultez [CONTRIBUTING.md](../CONTRIBUTING.md) pour le guide complet.

## Licence

openteams est publié sous Apache License 2.0. Concrètement, vous pouvez :

- l'utiliser gratuitement pour des projets personnels, éducatifs, internes ou commerciaux ;
- copier, modifier et réutiliser le code source comme base de votre travail ;
- distribuer la version originale ou modifiée, sous forme de code source ou de logiciel compilé ;
- l'intégrer à un produit propriétaire et vendre ce produit sans ouvrir le reste de votre code source.

Si vous redistribuez openteams ou une version modifiée, joignez une copie de la licence, conservez les mentions de copyright et d'attribution pertinentes, et indiquez clairement les fichiers modifiés.

Trois autres points sont à connaître :

- **Marque :** Vous pouvez utiliser le code, mais vous ne pouvez pas vous présenter comme le projet officiel openteams ni utiliser son nom ou ses marques comme votre propre marque.
- **Brevets :** Les contributeurs vous autorisent à utiliser les brevets nécessairement liés à leur code, afin qu'ils ne puissent pas s'en servir pour vous empêcher d'utiliser openteams. En échange, si vous engagez une action affirmant qu'openteams enfreint votre brevet, vous perdez cette protection. Seule l'autorisation liée aux brevets prend fin, pas votre droit ordinaire d'utiliser le code. Les utilisateurs qui n'engagent pas de procédure en matière de brevets ne sont normalement pas concernés.
- **Risques :** Le logiciel est fourni gratuitement en l'état. Vous devez décider vous-même s'il répond à vos besoins et assumer les risques liés à son utilisation ; le projet ne fournit aucune garantie ni indemnisation.

Consultez [LICENSE](../LICENSE) pour les conditions juridiques complètes.
