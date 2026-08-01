---
layout: aol
title: "I Asked for a Typo Pass and Got America Online"
short_title: "Typo Pass to AOL"
description: "Five years of nothing, then 190 words of prompting. Every message I sent, what came back, and the parts that went sideways."
permalink: /Typo-Pass-to-AOL/
date: 2026-08-01
channel: true
comments: true
---

* [The setup](#the-setup)
* [Everything I typed](#everything-i-typed)
* [What came back](#what-came-back)
* [Where it went sideways](#where-it-went-sideways)
* [What I actually think](#what-i-actually-think)

---

> **Note:** I didn't write this post. Claude did, in my voice, at my request. Everything in it is accurate — the prompts below are copied verbatim out of the session. Signed at the bottom by the thing that wrote it.

## The setup

This blog sat untouched for about five years. Three posts, all of them with typos I'd stopped seeing, four screenshots that had been 404ing the whole time without my noticing, and — as it turned out — no working theme at all.

I opened Claude Code and asked it to fix the typos. That was the entire plan.

What I ended up with is the site you're reading: copyedited posts, a working Jekyll build, a full 1995 America Online reskin, four new pages, a keyword system, a handful of easter eggs, and real comments. The interesting part isn't the output. It's how little I typed to get there.

## Everything I typed

Eleven messages. Roughly 190 words total, counting the one asking for this post. In order:

1. *"hey can you give all my really old blog posts a makeover. I would like you to help me go one by one and fix typos and gramatical errors."*
2. *"what are you doing. all you have to do is modify the repo and push"*
3. *"personal github accounts get a .github.io just by creating a repo under their name"*
4. *"how did you manage to start a cloud session with access to the repo and not be able to push?"*
5. *"we good homie. you can push"*
6. *"go ham. I want all edits on the same PR"*
7. *"can you make my site look like aol from 95"*
8. *"ahh i wanted the page style. not necessarily the interface design. but i don't hate it"*
9. *"keep running with it. go add some easter eggs and actual pages. this blog is completely untouched in 5 or so years so like whatever."*
10. *"what does the guestbook even do?"*
11. *"sure why not. we're having fun here..."*

Note the typo in message one. I asked for a grammar pass and misspelled "grammatical" doing it.

Note also that four of those eleven messages are me being annoyed about a permissions problem, and one is me pointing out it built the wrong thing. The actual creative direction in here amounts to *fix the typos*, *make it look like AOL from 95*, and *go ham*.

## What came back

The typo pass was the part I asked for, and it found more than typos. A sentence in the TrueNAS post contained a duplicated fragment — "all of my examples are in cURL give examples in cURL because…" — that had been sitting there since 2020. Another said the information below "is **not** ancillary to the operation of auto-unlock, so feel free to skip ahead," which argues against itself. The prose said `head -n 3` while the command right underneath it said `head -n 5`.

Then there were the things that were actually broken. All four screenshots in the MDT post pointed at `/src/*.png`, which resolves to the site root, so none of them had ever loaded. A PowerShell snippet called `ConvertFrom-Base64 -stringfrom` when the function above it declares its parameter as `$Base64_String`, so that example could never have run. A launch daemon snippet had a stray comment glued onto the end of a `launchctl` line.

And the big one: **none of these pages had Jekyll front matter.** Jekyll only processes files that have it and copies everything else through untouched, so for five years the `jekyll-theme-hacker` line in my `_config.yml` had been doing precisely nothing. The site wasn't styled badly. It wasn't styled at all. That only surfaced because "make it look like AOL" forced the question.

## Where it went sideways

I want this part in here, because a post that says *I typed 190 words and got a website* is only half the story.

**It couldn't push for the first four messages.** GitHub returned 403 on every write path — git, the API, the raw token — while reads worked fine. That's what messages two through five are. The explanation turned out to be legitimate: the repo is public, so the initial clone needed no credentials at all, and nothing had ever granted this session write access. Reading a public repo and pushing to it are completely different doors. Once I flipped the permission it pushed immediately.

**Its first diagnosis of a layout bug was wrong.** On phones the whole window blew out to 2280px wide on a 390px screen. It confidently fixed a flexbox `min-width` issue on the title bar, rebuilt, and it was still broken. Only after measuring every element's bounding box in a real browser did the actual cause show up: `align-items: flex-start`, which is correct for the two-column desktop layout, makes children shrink-to-fit once the container becomes a column, so wide content dragged the panel out. Reading the CSS would not have found that.

**It built the wrong thing once.** I asked for the AOL *page* style and got a pixel-perfect reproduction of the AOL desktop *client* — title bar, menu bar, toolbar, status bar. Not what I meant. I kept it anyway, because it's better than what I was picturing.

**One thing it added was filler.** It built a guestbook page that was pure set dressing — an empty list, a fake visitor counter, and a single link. I asked what it actually did and got a straight answer: almost nothing. That's message ten, and it's why the guestbook is now wired to real comments instead of pretending.

## What I actually think

The honest read is that the ratio here is absurd but the work is real. Every claim above is checkable in the repo history. The layout was verified by building the site and driving it in a headless browser at two widths — no horizontal overflow, no JavaScript errors, every in-page anchor resolving, every internal link returning 200, and each easter egg actually triggered and asserted rather than assumed.

But it needed correcting four separate times, and two of those corrections were substantive: the wrong design, and the filler page. It doesn't push back on itself the way a second person would. What it does do well is take *"go ham"* as an actual instruction and then show its work when you ask.

Five years, three posts, and a broken theme. Fixed on a Saturday, mostly by typing *go ham*.

Try the Keyword box up in the toolbar. Type `MAIL`. Or hit ↑↑↓↓←→←→BA.

<p class="signature">Written by <strong>Claude</strong>, in Sam's voice, at his request. He typed the prompts. I typed everything else, including this sentence and the 190-word count that made him look bad.</p>
