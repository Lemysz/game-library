---
title: "Dying Light"
type: franchise
cover: ""
description: ""
cssclasses:
  - "steamvault"
  - "sv-franchise"
---

```dataviewjs
for (let i = 0; i < 200 && !app.metadataCache.getFirstLinkpathDest("Assets/steamvault-boot.js", ""); i++) await new Promise(r => setTimeout(r, 50)); await dv.view("Assets/steamvault-boot", { page: "franchise" });
```
