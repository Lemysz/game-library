---
title: Favoritos
type: collection
description: Os jogos favoritos, sem critério além do coração.
accent: "#e35d8a"
cover: ""
games: 
  - "[[Dying Light]]"
  - "[[Resident Evil 2]]"
  - "[[Resident Evil 4]]"
cssclasses: 
  - "steamvault"
  - "sv-collection"
---

```dataviewjs
for (let i = 0; i < 200 && !app.metadataCache.getFirstLinkpathDest("Assets/steamvault-boot.js", ""); i++) await new Promise(r => setTimeout(r, 50)); await dv.view("Assets/steamvault-boot", { page: "collection" });
```
