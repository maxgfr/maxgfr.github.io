+++
title = "skycmd : ce qui a réussi, ce qui a échoué, et comment construire de tout petits modèles de décision sur un seul portable"
date = 2026-11-21
description = "Vingt petits modèles entraînés de zéro sur un seul ordinateur portable, quinze jugés sur une barre fixée avant l’entraînement : cinq réussites, dix échecs publiés quand même. Le projet, ses deux rapports techniques et les deux fichiers utilisables dès aujourd’hui."

[extra]
toc = true
+++

skycmd est un projet de recherche mené depuis mon propre ordinateur portable : entraîner de zéro les plus petits *modèles de décision* utiles, les faire tourner dans un navigateur, et juger chacun sur une barre écrite avant son entraînement. Les expériences se sont terminées le 20 novembre 2026. Deux rapports techniques racontent désormais toute l’histoire, l’un sur ce qui a réussi et ce qui a échoué, l’autre sur la façon dont les modèles sont construits. Cet article est une visite guidée des deux, avec les quatre leçons que je retiendrais et les deux fichiers prêts à l’emploi.

## Ce qu’est skycmd

Un modèle de décision n’écrit pas de texte. Il lit un *état* (une image de jeu, un texte court, une requête accompagnée d’une liste d’outils, les dernières secondes d’un enregistrement audio) et une ou plusieurs *questions typées*, et en une seule passe avant il renvoie une probabilité pour chaque option permise. Il existe trois types de questions : `choice` choisit une option parmi plusieurs options nommées, `score` choisit un niveau parmi plusieurs niveaux ordonnés, et `noul` est un oui ou non probabiliste. Les probabilités sont censées être *calibrées*, c’est-à-dire qu’on peut les prendre au pied de la lettre : parmi les réponses qu’un modèle calibré donne à 0,9, environ neuf sur dix sont justes.

Chaque modèle a été entraîné de zéro, en Rust, sur un seul ordinateur portable Apple M5 doté de 16 Go de mémoire, la machine sur laquelle je travaille. Les fichiers sont petits : de 142 912 octets à 3 692 288 octets pour la dernière famille, la plupart sous le mégaoctet. La première réponse à la question « jusqu’où peut-on descendre ? » a été s3-pico : 445 345 paramètres *ternaires* (chaque poids vaut −1, 0 ou +1) dans un fichier de 251 104 octets, qui joue à quatre jeux de pilotage au niveau d’un oracle exact. Chaque démo tourne en WebAssembly, dans le navigateur, à partir du fichier même sur lequel ses chiffres ont été mesurés : ce que vous essayez est exactement ce qui a été testé.

## Comment chaque modèle a été jugé

Avant l’entraînement d’un modèle, un fichier du dépôt, son *préenregistrement*, fixait les données, le budget d’entraînement, le test sur lequel il serait lu et son *critère de réussite* : un ensemble de conditions qui doivent toutes être remplies. Trois règles gardaient ce critère honnête.

- **Le test n’est lu qu’une fois.** À partir de s5, la cinquième génération de modèles, les outils d’évaluation refusent d’ouvrir un jeu de test tant qu’une empreinte listée ou un fichier témoin ne les y autorise pas.
- **Toute modification est un amendement daté**, enregistré dans le dépôt avant le calcul qu’il concerne.
- **Un échec est publié comme un résultat**, avec son fichier, une fiche de modèle qui commence par l’échec, et une démo.

Sur les 20 modèles publiés (de 143 Ko à 20,7 Mo), 15 ont été jugés sur un critère fixé avant l’entraînement. **Cinq ont réussi et dix ont échoué.** Deux des cinq réussites sont des *seconds regards* : des systèmes conçus après la lecture d’un test, que les rapports désignent comme tels à chaque fois qu’ils apparaissent. Neuf autres versions se sont arrêtées sans produire de modèle, dont sept à un contrôle que leur préenregistrement avait prévu.

{{ <figure src="/articles/skycmd/gates.svg" alt="Un tableau de bord des 15 modèles soumis à un critère, une ligne chacun, où une condition de son critère est tracée face à sa barre. Cinq lignes sont des réussites, des cercles bleus à droite de la barre : s6-nano, s6-micro v2 (un second regard), s6-secrets-pico, s6-ear2-nano et s6-route (un second regard). Dix lignes sont des échecs, des losanges orange à gauche de la barre : s6-micro-v1, s4-micro, s6-secrets-verify-pico, s6-ear-nano, s6-ear3-nano, s6-cast-pico, s6-cast2-pico, s6-route-nano, s6-route7-nano et s6-sleep3-nano." caption="Figure 1. Chaque critère, tel qu’il a été lu : une condition du critère de chaque modèle face à sa barre (le trait vertical). Chaque ligne a sa propre échelle, et la droite est meilleure sur toutes les lignes. Un disque plein est une réussite, un losange un échec, un anneau un second regard. Libellés en anglais, repris de la figure 1 du [rapport technique](https://maxgfr.github.io/skycmd/paper/#_4-2-the-gates)." width={672} height={650} /> }}

## Les deux rapports techniques

Tous deux sont datés du 21 novembre 2026, archivés sur Zenodo avec un DOI, et rédigés de sorte que chaque chiffre renvoie à sa preuve dans le dépôt. Ni l’un ni l’autre n’a été relu par des pairs. Ils sont en anglais.

### Pre-registered gates for small models trained on one laptop: what passed, what failed, and what the readings show

*En français : des critères préenregistrés pour de petits modèles entraînés sur un seul portable, ce qui a réussi, ce qui a échoué et ce que montrent les lectures.* Ce premier rapport contient le protocole et chaque critère tel qu’il a été lu. Il couvre les 20 modèles, les 15 critères avec leurs mesures et leurs réserves côte à côte, les expériences arrêtées avant de produire un modèle, et quatre leçons qui traversent les différentes séries de travaux. Il se termine par une liste de douze règles pour préenregistrer une expérience sur un petit modèle, chacune accompagnée de la lecture qui l’a inspirée.

[Lire en ligne](https://maxgfr.github.io/skycmd/paper/) · [PDF](https://maxgfr.github.io/skycmd/paper/skycmd-technical-report.pdf) · DOI [10.5281/zenodo.24418316](https://doi.org/10.5281/zenodo.24418316)

### Looped ternary encoders for typed decisions: a recipe from laptop to browser

*En français : des encodeurs ternaires en boucle pour des décisions typées, une recette du portable au navigateur.* Ce second rapport est le compagnon consacré à la méthode : comment construire un modèle de décision de 251 104 octets, l’entraîner sur un seul portable et faire tourner le même fichier dans un navigateur. Le modèle encode une seule fois la question et ses options puis les met en cache, donne un seul jeton à chaque valeur mesurée (9 jetons au lieu de 16 pour une image de Flappy), fait tourner en boucle des blocs partagés avec une sortie possible après chaque passe, et stocke ses poids ternaires sur 2 bits. Les mêmes blocs donnent un détecteur de fin de tour de parole de 631 936 octets et un routeur d’outils, et un tableau indique ce que chaque choix de conception a apporté et quels choix n’ont jamais été mesurés.

[Lire en ligne](https://maxgfr.github.io/skycmd/paper/methods/) · [PDF](https://maxgfr.github.io/skycmd/paper/skycmd-methods.pdf) · DOI [10.5281/zenodo.24420816](https://doi.org/10.5281/zenodo.24420816)

## Quatre leçons

Aucune n’a été un test préenregistré. Ce sont des tendances observées dans des lectures déjà publiées, tirées de peu de séries de travaux et le plus souvent d’une seule graine aléatoire d’entraînement : à prendre comme des conseils plutôt que comme des lois.

**1. Confronter un critère à des références triviales avant de le figer.** La barre de s6-nano, le modèle qui répond à des questions typées en texte libre, était la classe majoritaire : 0,398. Il l’a franchie avec 0,4805. Mais un « modèle » qui répond à chaque question par sa réponse la plus fréquente à l’entraînement obtient 0,4815 : la barre était trop basse pour signifier grand-chose. Dans la série sur le routage d’outils, au contraire, une barre fixée à BM25 (un score classique de recherche par mots-clés, qui ne demande aucun entraînement) a été ajoutée avant l’entraînement, et elle a démasqué un routeur qui ne faisait que l’égaler.

**2. Vérifier les sorties anticipées en faisant tourner le modèle dans sa boucle.** Un modèle en boucle peut s’arrêter après n’importe quelle passe dès qu’il est assez sûr de lui, ce qui fait gagner du temps. Des seuils ajustés sur des questions mises de côté ont fait s’écraser un modèle dans chaque partie de Flappy, sur cinq graines. Des seuils issus de la prédiction conforme (une méthode qui borne le taux d’erreur de chaque décision, ici avec α = 0,02) ont fait passer les vetos de sécurité d’un autre modèle dans un jeu de 23 à 1 016. Quand la réponse du modèle modifie son entrée suivante, il faut choisir les sorties en faisant tourner la boucle.

**3. Masquer ou renommer l’entrée.** Le routeur qui a réussi, s6-route, choisit la bonne option sur 0,8868 des requêtes inédites portant sur des outils jamais vus à l’entraînement. Quand chaque outil est renommé `tool_<k>`, il tombe à 0,2497, alors que BM25 garde 0,8138. Un diagnostic a fait remonter cette chute aux données de sa partie entraînée : dans chaque liste d’entraînement dont les outils avaient été renommés, le bon outil était le seul dont le modèle enseignant avait réécrit la description, et le routeur a appris à choisir cette description.

**4. Relire chaque réussite sur des données construites autrement.** Trois des cinq réussites portent une limite mesurée de cette façon. s6-route passe de 0,8868 à 0,5530 sur une nouvelle famille d’outils, où BM25 obtient 0,5675. Le détecteur de fin de tour s6-ear2-nano tombe d’une AUC de 0,9600 (la probabilité qu’un tour fini obtienne un score plus élevé qu’un tour inachevé : 1 est parfait, 0,5 est le hasard) sur les extraits de test de son modèle enseignant à 0,7299 sur de vraies conversations. Le détecteur de secrets s6-secrets-pico, à 0,9990 sur son banc d’essai synthétique, signale 59,8 % de 719 vrais fichiers qui ne contiennent aucun secret, avec une probabilité de 0,9 ou plus.

## Ce que chaque choix a apporté

Le rapport sur la méthode se termine par un tableau de ce que chaque choix de conception a apporté, là où il a été mesuré. Une sélection :

| choix | ce qu’il a apporté | preuve |
|:------|:-------------------|:-------|
| Entraîner directement les poids ternaires plutôt qu’arrondir un modèle en virgule flottante | L’arrondi coûtait de 6 à 11 points de précision en validation (de 0,470 à 0,406, et de 0,542 à 0,432) ; consacrer 30 % du budget à les entraîner directement a donné 0,482 et 0,556 | deux tailles de modèle, un entraînement chacune |
| Traiter les 2 bits comme un format de stockage | Les noyaux de calcul en virgule flottante prenaient 3,99 µs par produit matriciel, les noyaux ternaires compactés 12,23 µs | une forme de matrice, un processeur |
| Choisir les seuils de sortie en jouant | s3-pico a passé 200 tuyaux de Flappy sur 200 avec 1,44 passe sur 4 en moyenne ; avec des seuils ajustés sur des questions, s2-nano s’écrasait à chaque partie | deux modèles, cinq graines |
| Fixer à l’avance le nombre de tours de DAgger | Le tour 1 est tombé à 5,4 tuyaux avec 30 écrasements ; les tours 2 et 3 ont atteint 200 sur 200 sans aucun | un modèle, un entraînement |
| Distiller un modèle enseignant plutôt qu’entraîner sur des étiquettes brutes | Précision en validation de 0,8715 contre 0,8437 | un essai pilote, validation seulement |
| Tester le navigateur contre le moteur natif avec les mêmes sorties | Probabilités à moins de 9,5 × 10⁻⁷ près sur 200 questions sur 200 | un modèle, 200 questions |

DAgger, dans la quatrième ligne, est une boucle d’entraînement où le modèle joue, un oracle étiquette les états que le modèle a réellement atteints, et le modèle est réentraîné sur ces états.

Le même tableau liste ce qui n’a jamais été mesuré : un bloc en boucle face à une pile de blocs distincts de même taille, l’abandon aléatoire de passes de boucle (*loop dropout*) face à son absence, l’apprentissage progressif des valeurs numériques face à son absence, et un jeton par valeur face à un jeton par chiffre, pour la précision. Ces limites valent pour tout ce qui précède. Chaque recette n’a été entraînée qu’une fois, sur une seule graine, donc rien ne dit de combien un résultat varierait avec un nouvel entraînement. Tout a tourné sur une seule machine, souvent partagée avec d’autres travaux. Et les deux rapports sont des rapports techniques, pas des articles relus par des pairs : leur valeur repose sur le protocole et sur des preuves publiques, pas sur une relecture.

## Ce que vous pouvez utiliser dès aujourd’hui

La plupart des fichiers sont des résultats ou des démos. Deux peuvent entrer dans un vrai projet, chacun avec un filet de sécurité, et la page [Use it for real](https://maxgfr.github.io/skycmd/use/) (en anglais) donne le code.

- **s6-ear2-nano** indique à un agent vocal quand la personne a fini de parler. C’est un fichier de 631 936 octets, juste sur 0,8993 des 31 527 extraits de test de Smart Turn v3.2, le modèle ouvert dont il a appris (qui obtient 0,9260), à raison de 2,39 ms par décision en WebAssembly. Sur de vraies conversations, à son seuil prudent, il ne reconnaît que 0,5253 des vraies fins de tour : **une minuterie de repli est donc indispensable** (2 500 ms de silence dans la démo).
- **s6-route** choisit un outil dans une liste écrite à l’exécution, ou répond « aucun de ces outils » ou « demander à l’utilisateur ». Sur 945 requêtes inédites portant sur des outils jamais vus à l’entraînement, il obtient 0,8868, contre 0,8169 pour BM25, avec des probabilités mieux calibrées (erreur de calibration de 0,0162, contre 0,0779). À utiliser **quand les noms d’outils sont distinctifs** et que les outils sont de types familiers ; quand les noms sont génériques ou numérotés, ou que les outils forment une nouvelle famille, prenez BM25.
- **s6-secrets-verify-pico** tourne dans [secretgate](https://github.com/maxgfr/secretgate), un outil qui masque les secrets dans ce qu’un agent de programmation lit et écrit, comme **expérience à activer soi-même**. Il a **échoué** à son critère : il devait battre le meilleur détecteur à base de règles de 0,15 de F1 par ligne (un score qui équilibre les secrets trouvés et les fausses alertes) et a atteint +0,123. secretgate le propose désactivé par défaut, et il ne peut qu’ajouter des masquages à ce que trouvent les règles.

## Liens

- Le site du projet, avec les résultats, les pages des modèles, les démos et les articles : [maxgfr.github.io/skycmd](https://maxgfr.github.io/skycmd/)
- Le code, les préenregistrements et les fichiers de résultats : [github.com/maxgfr/skycmd](https://github.com/maxgfr/skycmd)
- Chaque modèle, son Space et les jeux de données : [la collection skycmd sur Hugging Face](https://huggingface.co/collections/maxgfr/skycmd-6b001dd30a7cb5724995b603)
- Toutes les démos dans un seul Space : [huggingface.co/spaces/maxgfr/skycmd](https://huggingface.co/spaces/maxgfr/skycmd)
