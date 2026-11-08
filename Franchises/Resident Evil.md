---
title: Resident Evil
type: franchise
cover: ""
description: ""
cssclasses:
  - steamvault
  - sv-franchise
accent: "#c0392b"
icon: skull
---

```dataviewjs
for (let i = 0; i < 200 && !app.metadataCache.getFirstLinkpathDest("Assets/steamvault-boot.js", ""); i++) await new Promise(r => setTimeout(r, 50)); await dv.view("Assets/steamvault-boot", { page: "franchise" });
```
