---
label: TODO-20-history-stat
title: "The history summary divides all-time minutes by at most 40 sessions"
state: done
added: 2026-09-27 11:14:58
closed: 2026-09-27 12:22:56
priority: 5
---

*Added 2026-09-27 11:14:58 · done 2026-09-27 12:22:56.*

The History header reads "N min across M sessions". `N` is all-time minutes from
`fetchKindTotals`, and `M` was `sessions.length`, which `fetchHistory` caps at 40. Past 40
sessions the line paired two different populations. Count sessions in the same query as the
totals.

#### Built 2026-09-27

`M` now comes from `fetchSessionCount`, a head-only count of `sessions`, loaded alongside the totals. A separate request stood in for the "same query" the ticket asked for, since `kind_totals` is a view and a count needs no migration.
