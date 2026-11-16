+++
title = "Demo article"
date = 2026-11-16
description = "A draft page holding one example of every supported element, to check the styling."
draft = true

[extra]
toc = true
+++

This page is a **draft**: only `zola build --drafts` or `zola serve --drafts` publishes it. It is there to check the styling of every element an article can hold. Running text keeps a comfortable line length, around seventy characters, so the eye finds the start of the next line easily.

## A table

An ordinary Markdown table. On a narrow screen it scrolls sideways instead of widening the page.

| Quantity | Symbol | SI unit | Range |
|:---------|:------:|--------:|:------|
| Length | *l* | metre (m) | from 10⁻³⁵ m (Planck length) to 10²⁶ m (observable universe) |
| Mass | *m* | kilogram (kg) | from 10⁻³⁰ kg (electron) to 10⁵³ kg (observable universe) |
| Time | *t* | second (s) | from 10⁻⁴⁴ s (Planck time) to 10¹⁷ s (age of the universe) |

## A figure

{{ <figure src="/articles/hello/diagram.svg" alt="Three boxes, A, B and C, joined left to right by two arrows." caption="Figure 1. A chain of three steps, A → B → C. The caption takes *Markdown*." width={320} height={120} /> }}

## Some code

A code block, with its language:

```python
def mean(values):
    """Arithmetic mean of a non-empty list."""
    return sum(values) / len(values)

print(mean([2, 4, 9]))  # 5.0
```

And some `inline code` in a sentence.

## A footnote

The speed of light in vacuum is exactly 299,792,458 m/s[^metre]. Footnotes gather at the bottom of the article, each with a link back.

[^metre]: Exactly, because since 1983 the metre has been defined from it: the distance light travels in vacuum in 1/299,792,458 of a second.

## A callout

{% <note title="Key point"> %}
A callout sets apart a definition, a detail or a caveat. Its body is ordinary **Markdown**, over as many paragraphs as needed.

Like this one.
{% </note> %}

### A subheading

The `##` and `###` headings feed the table of contents when `toc = true`.
