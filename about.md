---
layout: aol
title: "About Me"
description: "Senior Systems Engineer, SysAdmin at heart, PowerShell and Python most days."
permalink: /about/
---

## Who is running this thing

My current title is Senior Systems Engineer, but I see myself as a SysAdmin with a heavy focus on developing scripts, tools, and software to streamline and automate whatever comes across my desk. My role is a mixture of Mac and Windows, but I predominantly work with PowerShell and Python, and I'll dabble here and there writing in C# and shell scripting.

## What ends up here

No central focus, on purpose. If I spent a weekend working something out and the answer wasn't sitting in the documentation, it has a decent chance of ending up here. So far that has meant deployment tooling, storage encryption, and getting Python to behave on a managed Mac.

The posts tend to follow the same shape: here is the problem, here is why the obvious approach didn't work, here is the thing that did, and here is the code so you don't have to derive it yourself.

## The stack behind the blog

Static Markdown, built by Jekyll, hosted on GitHub Pages. The theme is hand-written CSS doing its best impression of the America Online client from 1995. There is no tracking, no analytics, no cookie banner, and nothing to accept.

> **Fun fact:** for about five years this site had no layout at all. None of the pages carried Jekyll front matter, so Jekyll copied the Markdown through untouched and the theme in `_config.yml` never applied to anything. That got fixed at the same time as the typos.

## Elsewhere

* GitHub &mdash; [@{{ site['footer-links'].github }}](https://github.com/{{ site['footer-links'].github }})
* LinkedIn &mdash; [{{ site['footer-links'].linkedin }}](https://www.linkedin.com/in/{{ site['footer-links'].linkedin }})

Want to say something? [Sign the guestbook]({{ '/guestbook/' | relative_url }}).

<p class="signature">This page has been visited <strong>0000001</strong> times since December 1995.</p>
