+++
title = "Article de démonstration"
date = 2026-11-16
description = "Une page brouillon qui contient un exemple de chaque élément pris en charge, pour vérifier la mise en forme."
draft = true

[extra]
toc = true
+++

Cette page est un **brouillon** : elle n’est publiée que par `zola build --drafts` ou `zola serve --drafts`. Elle sert à vérifier la mise en forme de chaque élément qu’un article peut contenir. Le texte courant garde une largeur de ligne confortable, autour de soixante-dix caractères, pour que l’œil retrouve facilement le début de la ligne suivante.

## Un tableau

Un tableau Markdown ordinaire. Sur un écran étroit, il défile horizontalement au lieu d’élargir la page.

| Grandeur | Symbole | Unité SI | Ordre de grandeur |
|:---------|:-------:|---------:|:------------------|
| Longueur | *l* | mètre (m) | de 10⁻³⁵ m (longueur de Planck) à 10²⁶ m (univers observable) |
| Masse | *m* | kilogramme (kg) | de 10⁻³⁰ kg (électron) à 10⁵³ kg (univers observable) |
| Temps | *t* | seconde (s) | de 10⁻⁴⁴ s (temps de Planck) à 10¹⁷ s (âge de l’univers) |

## Une figure

{{ <figure src="/articles/hello/diagram.svg" alt="Trois boîtes, A, B et C, reliées de gauche à droite par deux flèches." caption="Figure 1. Une chaîne de trois étapes, A → B → C. La légende accepte le *Markdown*." width={320} height={120} /> }}

## Du code

Un bloc de code, avec sa langue :

```python
def moyenne(valeurs):
    """Moyenne arithmétique d'une liste non vide."""
    return sum(valeurs) / len(valeurs)

print(moyenne([2, 4, 9]))  # 5.0
```

Et du `code en ligne` dans une phrase.

## Une note de bas de page

La vitesse de la lumière dans le vide vaut exactement 299 792 458 m/s[^metre]. Les notes sont regroupées en bas de l’article, avec un lien de retour.

[^metre]: Exactement, parce que depuis 1983 c’est le mètre qui est défini à partir d’elle : c’est la distance parcourue par la lumière dans le vide en 1/299 792 458 de seconde.

## Un encadré

{% <note title="À retenir"> %}
Un encadré met en valeur une définition, une précision ou une mise en garde. Son contenu est du **Markdown** ordinaire, sur autant de paragraphes que nécessaire.

Comme celui-ci.
{% </note> %}

### Un sous-titre

Les titres `##` et `###` alimentent le sommaire quand `toc = true`.
