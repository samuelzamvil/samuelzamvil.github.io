---
layout: aol
title: "Keyword Directory"
description: "Every AOL Keyword recognised by this site, and where each one goes."
permalink: /keywords/
---

Type any of these into the **Keyword** box up in the toolbar and press Go. Or just click one.

<div class="table-scroll" markdown="0">
<table class="kw-table">
<thead><tr><th>Keyword</th><th>Goes to</th></tr></thead>
<tbody>
{% for k in site.data.keywords %}
<tr>
  <td>
    {% if k.url %}<a href="{{ k.url | relative_url }}">{{ k.keyword }}</a>
    {% else %}<a href="#" data-keyword="{{ k.keyword }}">{{ k.keyword }}</a>{% endif %}
  </td>
  <td>{{ k.blurb }}</td>
</tr>
{% endfor %}
</tbody>
</table>
</div>

## What is a Keyword?

On America Online, Keywords were shortcuts. Rather than clicking down through Channels, you typed a word into the box, hit Go, and landed straight on the thing you wanted. Every magazine ad in the mid-90s ended with one.

There is no reason a static blog needs a keyword system. That is not really the point.

> Keywords that aren't in this table will get you a very authentic error dialog. A few of the entries above don't navigate anywhere at all &mdash; they do something else instead. You'll know them when you find them.

<p class="signature">Keyword directory last updated December 1995. Please allow 4&ndash;6 weeks for new keywords to propagate.</p>
