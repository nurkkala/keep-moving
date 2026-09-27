---
label: TODO-20-history-stat
title: "The history summary divides all-time minutes by at most 40 sessions"
state: queued
added: 2026-09-27 11:14:58
priority: 5
---

*Added 2026-09-27 11:14:58.*

The History header reads "N min across M sessions". `N` is all-time minutes from
`fetchKindTotals`, and `M` is `sessions.length`, which `fetchHistory` caps at 40. Past 40
sessions the line pairs two different populations. Count sessions in the same query as the
totals.
