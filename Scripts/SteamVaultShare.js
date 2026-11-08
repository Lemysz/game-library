// ==========================================================================
// Game Library — Cartão para compartilhar (jogo e perfil)
// Desenha uma imagem JPEG (1080 px de largura, Post 4:5 ou Story 9:16) no próprio
// aparelho, sem serviço externo. As imagens entram no canvas a partir dos
// BYTES (arquivo do vault ou requestUrl do Obsidian), nunca de um <img>
// de outra origem — assim o canvas não fica "contaminado" e a exportação
// funciona no celular e no desktop.
//
// Acesso: customJS.SteamVaultShare
// ==========================================================================

class SteamVaultShare {

	constructor() {
		this.formats = { post: { w: 1080, h: 1350, label: "Post 4:5" }, story: { w: 1080, h: 1920, label: "Story 9:16" } };
		this.folder = "Assets/Compartilhar";
	}

	get C() { return customJS.SteamVaultCore; }
	get U() { return customJS.SteamVaultUI; }

	// ------------------------------------------------------------ janela
	async open(ctx, kind = "game", path = "") {
		const { U, V, model } = ctx;
		const g = kind === "game" ? model.gamesByPath.get(path) : null;
		if (kind === "game" && !g) return V.toast("Jogo não encontrado", { tone: "error" });
		const col = kind === "collection" ? model.collections.find(c => c.path === path) : null;
		if (kind === "collection" && !col) return V.toast("Coleção não encontrada", { tone: "error" });
		let format = "post";
		try { format = U._store("shareFormat") === "story" ? "story" : "post"; } catch (_) {}
		const body = `<div class="sv-share">
			<div class="sv-segmented sv-share-formats" role="radiogroup" aria-label="Formato">${Object.entries(this.formats).map(([k, f]) => `<button type="button" data-share-format="${k}" class="${k === format ? "is-active" : ""}">${U.esc(f.label)}</button>`).join("")}</div>
			<div class="sv-share-stage" data-share-stage><div class="sv-share-loading">${U.icon("image")}<span>Montando o cartão…</span></div></div>
		</div>`;
		const actions = `${U.btn("Fechar", { kind: "ghost", attrs: "data-close" })}<span class="sv-share-extra" data-share-extra></span>${U.btn("Salvar", { icon: "download", kind: "primary", title: "Salvar no vault (Assets/Compartilhar)", attrs: "data-share-save disabled" })}`;
		const m = V.modal({ title: kind === "game" ? "Compartilhar cartão" : col ? "Compartilhar coleção" : kind === "stats" ? "Compartilhar resumo" : "Compartilhar perfil", sub: kind === "game" ? g.title : col ? col.title : kind === "stats" ? `Estatísticas · ${window.__svStatsShare?.label || "Tudo"}` : "Resumo da sua Game Library", body, actions, size: "md", cls: "sv-share-modal" });
		let blob = null, url = "", seq = 0;
		const stage = m.el.querySelector("[data-share-stage]");
		const saveBtn = m.el.querySelector("[data-share-save]");
		const extra = m.el.querySelector("[data-share-extra]");
		const draw = async () => {
			const my = ++seq;
			saveBtn.disabled = true;
			stage.classList.add("is-busy");
			try {
				const canvas = kind === "game" ? await this.gameCard(ctx, g, format) : col ? await this.collectionCard(ctx, col, format) : kind === "stats" ? await this.statsCard(ctx, format) : await this.profileCard(ctx, format);
				const b = await new Promise((res, rej) => canvas.toBlob(x => x ? res(x) : rej(new Error("toBlob")), "image/jpeg", 0.92));
				if (my !== seq || !m.el.isConnected) return;
				if (url) URL.revokeObjectURL(url);
				blob = b; url = URL.createObjectURL(b);
				stage.innerHTML = `<img class="sv-share-img is-${format}" src="${url}" alt="Prévia do cartão">`;
				saveBtn.disabled = false;
				extra.innerHTML = this._extraButtons(U, blob);
			} catch (err) {
				console.error("Game Library: cartão", err);
				stage.innerHTML = `<div class="sv-share-loading">${U.icon("alert")}<span>Não foi possível montar o cartão.</span></div>`;
			} finally { stage.classList.remove("is-busy"); }
		};
		m.el.querySelectorAll("[data-share-format]").forEach(b => b.addEventListener("click", () => {
			if (b.dataset.shareFormat === format) return;
			format = b.dataset.shareFormat;
			try { U._store("shareFormat", format); } catch (_) {}
			m.el.querySelectorAll("[data-share-format]").forEach(x => x.classList.toggle("is-active", x === b));
			draw();
		}));
		saveBtn.addEventListener("click", async () => {
			if (!blob) return;
			saveBtn.disabled = true;
			try {
				const name = `${kind === "game" ? g.title : col ? col.title : kind === "stats" ? `Resumo ${window.__svStatsShare?.label || ""}`.trim() : "Perfil"} ${format === "story" ? "story" : "post"} ${customJS.SteamVaultCore.today()}`;
				const p = await this.saveToVault(blob, name);
				V.toast(`Cartão salvo em ${p}`, { tone: "ok", icon: "check" });
				extra.innerHTML = `${this._extraButtons(U, blob)}${U.btn("Abrir", { icon: "external", kind: "ghost", title: "Abrir a imagem salva", attrs: `data-share-open="${U.attr(p)}"` })}`;
			} catch (err) {
				console.error("Game Library: salvar cartão", err);
				V.toast("Não foi possível salvar o cartão", { tone: "error" });
			} finally { saveBtn.disabled = false; }
		});
		m.el.addEventListener("click", async e => {
			const t = e.target.closest("[data-share-native], [data-share-copy], [data-share-open]");
			if (!t || !blob) return;
			if (t.hasAttribute("data-share-open")) { m.close(); app.workspace.openLinkText(t.dataset.shareOpen, "", false); return; }
			if (t.hasAttribute("data-share-native")) {
				try { await navigator.share({ files: [new File([blob], "game-library.jpg", { type: "image/jpeg" })], title: "Game Library" }); }
				catch (err) { if (err?.name !== "AbortError") V.toast("Este aparelho não permitiu compartilhar daqui — use Salvar no vault", { tone: "warn" }); }
			} else {
				try { const png = await this._toPng(blob); await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]); V.toast("Imagem copiada", { tone: "ok", icon: "check" }); }
				catch (_) { V.toast("Não foi possível copiar — use Salvar no vault", { tone: "warn" }); }
			}
		});
		const obs = new MutationObserver(() => { if (!m.el.isConnected) { obs.disconnect(); if (url) URL.revokeObjectURL(url); } });
		obs.observe(document.body, { childList: true, subtree: false });
		draw();
	}

	// compartilhar nativo / copiar só aparecem onde o aparelho oferece
	_extraButtons(U, blob) {
		let canShare = false;
		try { canShare = !!navigator.canShare?.({ files: [new File([blob], "x.jpg", { type: "image/jpeg" })] }); } catch (_) {}
		const canCopy = typeof ClipboardItem === "function" && !!navigator.clipboard?.write;
		return `${canShare ? U.btn("Compartilhar", { icon: "share", kind: "ghost", title: "Compartilhar", attrs: "data-share-native" }) : ""}${canCopy ? U.btn("Copiar", { icon: "copy", kind: "ghost", title: "Copiar imagem", attrs: "data-share-copy" }) : ""}`;
	}

	// a área de transferência só aceita PNG: converte o JPEG só para copiar
	async _toPng(blob) {
		const bmp = await createImageBitmap(blob);
		const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
		c.getContext("2d").drawImage(bmp, 0, 0);
		return await new Promise((res, rej) => c.toBlob(x => x ? res(x) : rej(new Error("png")), "image/png"));
	}

	async saveToVault(blob, baseName) {
		const C = this.C;
		const a = app.vault.adapter;
		if (!(await a.exists(this.folder))) { try { await app.vault.createFolder(this.folder); } catch (_) {} }
		const name = C.safeFileName(baseName, "Cartão");
		let path = `${this.folder}/${name}.jpg`, i = 2;
		while (app.vault.getAbstractFileByPath(path)) path = `${this.folder}/${name} (${i++}).jpg`;
		await app.vault.createBinary(path, await blob.arrayBuffer());
		return path;
	}

	// ---------------------------------------------------------- imagens
	// bytes → ImageBitmap. Ordem: arquivo do vault (pelo caminho bruto ou
	// pelo endereço já resolvido) → requestUrl (http) → fetch. Falhou: null
	// (o cartão desenha um fundo no lugar, nunca quebra).
	async _image(src, raw = "") {
		const tryBytes = async buf => { if (!buf || !buf.byteLength) return null; return await createImageBitmap(new Blob([buf])); };
		try {
			const r = String(raw || "").trim();
			if (r && !/^(https?:|data:|app:|capacitor:|blob:)/i.test(r)) {
				const clean = r.replace(/^\.?\//, "").replace(/^\[\[|\]\]$/g, "");
				const f = app.vault.getAbstractFileByPath(clean) || app.metadataCache.getFirstLinkpathDest?.(clean, "");
				if (f) return await tryBytes(await app.vault.readBinary(f));
			}
			const s = String(src || r || "");
			if (!s) return null;
			if (/^https?:/i.test(s)) {
				// 3.24.2: só servidores públicos, só imagem, no máximo 15 MB
				const url = customJS.SteamVaultCore.publicUrl(s);
				if (!url) return null;
				const res = await Promise.race([requestUrl({ url, throw: false }), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 20000))]);
				const type = String(res?.headers?.["content-type"] || res?.headers?.["Content-Type"] || "");
				if (type && !/^image\//i.test(type)) return null;
				if (res.status >= 200 && res.status < 300 && res.arrayBuffer?.byteLength <= 15 * 1024 * 1024) return await tryBytes(res.arrayBuffer);
				return null;
			}
			const f = this._fileFromResource(s);
			if (f) return await tryBytes(await app.vault.readBinary(f));
			// fora do vault: só endereços do próprio aparelho (nunca a rede)
			if (!/^(app:|capacitor:|blob:|data:image\/)/i.test(s)) return null;
			const res = await fetch(s);
			return res.ok ? await tryBytes(await res.arrayBuffer()) : null;
		} catch (_) { return null; }
	}

	// endereço resolvido (app://…, capacitor://…) → arquivo do vault
	_fileFromResource(src) {
		const strip = u => String(u).split("?")[0];
		if (!this._resMap || this._resMapAt < Date.now() - 30000) {
			this._resMap = new Map(); this._resMapAt = Date.now();
			for (const f of app.vault.getFiles?.() || []) if (/^(png|jpe?g|webp|gif|avif|bmp)$/i.test(f.extension)) { try { this._resMap.set(strip(app.vault.getResourcePath(f)), f); } catch (_) {} }
		}
		return this._resMap.get(strip(src)) || null;
	}

	_rawChain(p, chain) {
		for (const k of chain) if (this.C.resolveImage(p?.[k])) return String(p[k]);
		return "";
	}

	// cor de destaque: média dos pixels mais saturados da arte
	_accent(img, fallbackHue) {
		const def = `hsl(${fallbackHue ?? 210} 70% 60%)`;
		if (!img) return def;
		try {
			const c = new OffscreenCanvas(24, 24), x = c.getContext("2d");
			x.drawImage(img, 0, 0, 24, 24);
			const d = x.getImageData(0, 0, 24, 24).data;
			let r = 0, gr = 0, b = 0, n = 0;
			for (let i = 0; i < d.length; i += 4) {
				const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
				if (mx - mn < 40 || mx < 60) continue;
				r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++;
			}
			if (!n) return def;
			const k = v => Math.min(255, Math.round((v / n) * 1.15 + 20));
			return `rgb(${k(r)}, ${k(gr)}, ${k(b)})`;
		} catch (_) { return def; }
	}

	// ---------------------------------------------------------- desenho
	_canvas(format) {
		const f = this.formats[format] || this.formats.post;
		const c = document.createElement("canvas");
		c.width = f.w; c.height = f.h;
		const x = c.getContext("2d");
		customJS.SteamVaultI18n?.wrapCanvas(x);
		x.textBaseline = "alphabetic";
		return { c, x, W: f.w, H: f.h };
	}

	_fonts() {
		const cs = getComputedStyle(document.querySelector(".sv-app") || document.body);
		const pick = (v, d) => (v && v.trim()) || d;
		return {
			display: pick(cs.getPropertyValue("--sv-font-display"), '"Inter", "Segoe UI", Roboto, sans-serif'),
			ui: pick(cs.getPropertyValue("--sv-font-ui"), '"Inter", "Segoe UI", Roboto, sans-serif')
		};
	}

	_rr(x, X, Y, w, h, r) {
		x.beginPath();
		if (x.roundRect) x.roundRect(X, Y, w, h, r);
		else { x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
	}

	// desenha a imagem preenchendo a caixa (como object-fit: cover)
	_cover(x, img, X, Y, w, h, fx = 50, fy = 50, zoom = 1) {
		const s = Math.max(w / img.width, h / img.height) * zoom;
		const dw = img.width * s, dh = img.height * s;
		x.drawImage(img, X + (w - dw) * (fx / 100), Y + (h - dh) * (fy / 100), dw, dh);
	}

	_lines(x, text, maxW, maxLines) {
		const words = String(text || "").split(/\s+/).filter(Boolean);
		const out = []; let cur = "";
		for (const w of words) {
			const t = cur ? `${cur} ${w}` : w;
			if (x.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); cur = w; }
		}
		if (cur) out.push(cur);
		if (out.length > maxLines) {
			const keep = out.slice(0, maxLines);
			let last = keep[maxLines - 1];
			while (last.length > 1 && x.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
			keep[maxLines - 1] = `${last.trimEnd()}…`;
			return keep;
		}
		// palavra única maior que a linha: corta com reticências
		return out.map(l => { if (x.measureText(l).width <= maxW) return l; let t = l; while (t.length > 1 && x.measureText(`${t}…`).width > maxW) t = t.slice(0, -1); return `${t}…`; });
	}

	_brand(x, F, X, Y, accent) {
		this._rr(x, X, Y - 30, 36, 36, 10); x.fillStyle = accent; x.fill();
		// controle (o mesmo desenho do ícone da Game Library)
		try {
			const s = 0.6;
			x.save(); x.translate(X + 18 - 24 * s, Y - 12 - 28 * s); x.scale(s, s);
			x.fillStyle = "rgba(8, 12, 18, 0.85)";
			x.fill(new Path2D("M15 14h18c5.6 0 10 4 10.9 9.5l1.7 10.6c.6 4.1-2.5 7.9-6.7 7.9-2.5 0-4.7-1.4-5.8-3.6L31.4 35H16.6l-1.7 3.4C13.8 40.6 11.6 42 9.1 42c-4.2 0-7.3-3.8-6.7-7.9l1.7-10.6C5 18 9.4 14 15 14z"));
			x.fillStyle = accent;
			x.fill(new Path2D("M12.5 21h3v3.5H19v3h-3.5V31h-3v-3.5H9v-3h3.5z"));
			for (const [cx, cy] of [[34, 22.2], [37.8, 26], [34, 29.8], [30.2, 26]]) { x.beginPath(); x.arc(cx, cy, 2.1, 0, Math.PI * 2); x.fill(); }
			x.restore();
		} catch (_) { x.restore?.(); }
		x.textAlign = "left"; x.fillStyle = "rgba(255, 255, 255, 0.9)"; x.font = `800 26px ${F.display}`;
		if ("letterSpacing" in x) x.letterSpacing = "4px";
		x.fillText("GAME LIBRARY", X + 52, Y - 3);
		if ("letterSpacing" in x) x.letterSpacing = "0px";
	}

	_footer(x, F, W, H, left) {
		x.font = `600 26px ${F.ui}`; x.fillStyle = "rgba(255, 255, 255, 0.55)";
		x.textAlign = "left"; x.fillText(left, 64, H - 56);
		x.textAlign = "right"; x.fillText(this.U.fmtDate(customJS.SteamVaultCore.today()), W - 64, H - 56);
		x.textAlign = "left";
	}

	_tile(x, F, X, Y, w, h, label, value, opts = {}) {
		this._rr(x, X, Y, w, h, 28);
		x.fillStyle = "rgba(255, 255, 255, 0.08)"; x.fill();
		x.strokeStyle = "rgba(255, 255, 255, 0.12)"; x.lineWidth = 2; x.stroke();
		x.fillStyle = "rgba(255, 255, 255, 0.6)"; x.font = `700 22px ${F.ui}`;
		if ("letterSpacing" in x) x.letterSpacing = "2px";
		x.fillText(label.toUpperCase(), X + 28, Y + 46);
		if ("letterSpacing" in x) x.letterSpacing = "0px";
		x.fillStyle = opts.color || "#fff";
		let size = opts.size || 60;
		x.font = `800 ${size}px ${F.display}`;
		while (size > 30 && x.measureText(value).width > w - 56 - (opts.reserve || 0)) { size -= 4; x.font = `800 ${size}px ${F.display}`; }
		x.fillText(value, X + 28, Y + h - 34);
	}

	_ring(x, cx, cy, r, pct, color) {
		x.lineWidth = 12; x.lineCap = "round";
		x.strokeStyle = "rgba(255, 255, 255, 0.14)"; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
		if (pct > 0) { x.strokeStyle = color; x.beginPath(); x.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, pct / 100)); x.stroke(); }
	}

	_stars(x, F, X, Y, rating, size = 46) {
		x.font = `400 ${size}px ${F.ui}`;
		for (let i = 0; i < 5; i++) { x.fillStyle = i < Math.round(rating) ? "#f5c451" : "rgba(255, 255, 255, 0.22)"; x.fillText("★", X + i * (size + 4), Y); }
	}

	_pill(x, F, X, Y, text, color) {
		x.font = `700 26px ${F.ui}`;
		const w = x.measureText(text).width + 44;
		this._rr(x, X, Y, w, 50, 25);
		x.fillStyle = "rgba(255, 255, 255, 0.1)"; x.fill();
		x.beginPath(); x.arc(X + 22, Y + 25, 7, 0, Math.PI * 2); x.fillStyle = color; x.fill();
		x.fillStyle = "#fff"; x.fillText(text, X + 36, Y + 34);
		return w;
	}

	_tone(tone) { return ({ blue: "#1a9fff", green: "#7fcf63", amber: "#eeb14a", red: "#ef6a60" })[tone] || "#8597aa"; }

	// ------------------------------------------------------- cartão: jogo
	async gameCard(ctx, g, format = "post") {
		const { U, C } = ctx;
		const { c, x, W, H } = this._canvas(format);
		const F = this._fonts();
		try { await document.fonts?.ready; } catch (_) {}
		const p = g.page || {};
		const bgRaw = this._rawChain(p, ["background", "featured"]);
		const coverRaw = this._rawChain(p, ["cover", "coverFicha"]);
		const [bg, cover] = await Promise.all([this._image(g.images.background, bgRaw), this._image(g.images.cover, coverRaw)]);
		const art = bg || cover;
		const accent = this._accent(art, g.hue);

		// fundo
		x.fillStyle = "#0a0e14"; x.fillRect(0, 0, W, H);
		if (art) {
			x.save();
			if (!bg) { x.filter = "blur(36px) saturate(1.3)"; x.globalAlpha = 0.75; this._cover(x, art, -60, -60, W + 120, H * 0.75 + 120); }
			else this._cover(x, art, 0, 0, W, H * 0.72, g.framing?.x ?? 50, g.framing?.y ?? 50, (g.framing?.zoom || 100) / 100);
			x.restore();
		} else {
			const gr = x.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, H * 0.8);
			gr.addColorStop(0, `hsla(${g.hue} 60% 45% / 0.6)`); gr.addColorStop(1, "transparent");
			x.fillStyle = gr; x.fillRect(0, 0, W, H);
		}
		const fade = x.createLinearGradient(0, H * 0.25, 0, H * 0.78);
		fade.addColorStop(0, "rgba(10, 14, 20, 0)"); fade.addColorStop(1, "rgba(10, 14, 20, 1)");
		x.fillStyle = fade; x.fillRect(0, 0, W, H);
		const top = x.createLinearGradient(0, 0, 0, 220);
		top.addColorStop(0, "rgba(10, 14, 20, 0.6)"); top.addColorStop(1, "rgba(10, 14, 20, 0)");
		x.fillStyle = top; x.fillRect(0, 0, W, 220);

		this._brand(x, F, 64, 100, accent);

		// blocos de baixo para cima: rodapé → números → capa e título
		const footY = H - 56;
		const tileH = 200, tilesY = footY - 64 - tileH;
		const coverW = format === "story" ? 340 : 300, coverH = coverW * 1.5;
		const blockY = tilesY - 56 - coverH;

		// minha análise: selo e um trecho da opinião num painel de vidro escuro,
		// no espaço acima da capa (legível sobre qualquer arte)
		if (g.review || g.recommend === true || g.recommend === false) {
			const hasRec = g.recommend === true || g.recommend === false;
			const top = format === "story" ? 230 : 168, limit = blockY - 44, pad = 32;
			const size = format === "story" ? 40 : 32, lh = size * 1.4;
			x.font = `italic 500 ${size}px ${F.ui}`;
			const room = limit - top - pad * 2 - (hasRec ? 74 : 0);
			const lines = g.review ? this._lines(x, `“${g.review}”`, W - 128 - pad * 2, Math.max(0, Math.min(format === "story" ? 7 : 4, Math.floor(room / lh)))) : [];
			const h = pad * 2 + (hasRec ? 50 : 0) + (hasRec && lines.length ? 24 : 0) + lines.length * lh - (lines.length ? lh - size * 1.1 : 0);
			if (hasRec || lines.length) {
				x.save();
				this._rr(x, 64, top, W - 128, h, 28);
				x.fillStyle = "rgba(8, 12, 18, 0.62)"; x.fill();
				x.strokeStyle = "rgba(255, 255, 255, 0.08)"; x.lineWidth = 2; x.stroke();
				x.restore();
				let y = top + pad;
				if (hasRec) { this._pill(x, F, 64 + pad, y, g.recommend ? "RECOMENDO" : "NÃO RECOMENDO", g.recommend ? "#7fcf63" : "#ef5b5b"); y += 50 + (lines.length ? 24 : 0); }
				x.font = `italic 500 ${size}px ${F.ui}`; x.fillStyle = "rgba(255, 255, 255, 0.94)";
				lines.forEach((l, i) => x.fillText(l, 64 + pad, y + size * 0.9 + i * lh));
			}
		}

		// capa
		x.save();
		x.shadowColor = "rgba(0, 0, 0, 0.6)"; x.shadowBlur = 48; x.shadowOffsetY = 24;
		this._rr(x, 64, blockY, coverW, coverH, 24); x.fillStyle = "#1a2230"; x.fill();
		x.restore();
		x.save(); this._rr(x, 64, blockY, coverW, coverH, 24); x.clip();
		if (cover) this._cover(x, cover, 64, blockY, coverW, coverH);
		else {
			const gr = x.createLinearGradient(64, blockY, 64 + coverW, blockY + coverH);
			gr.addColorStop(0, `hsl(${g.hue} 35% 26%)`); gr.addColorStop(1, `hsl(${g.hue + 30} 30% 10%)`);
			x.fillStyle = gr; x.fillRect(64, blockY, coverW, coverH);
			x.fillStyle = "#fff"; x.font = `800 40px ${F.display}`;
			this._lines(x, g.title, coverW - 48, 4).forEach((l, i, a) => x.fillText(l, 88, blockY + coverH - 40 - (a.length - 1 - i) * 46));
		}
		x.restore();

		// título e dados
		const tx = 64 + coverW + 44, tw = W - tx - 64;
		const meta = [g.platform, g.releaseYear, g.developer].filter(Boolean).join(" · ");
		const pills = 50 + 22;
		let size = 76; x.font = `800 ${size}px ${F.display}`;
		let lines = this._lines(x, g.title, tw, 3);
		while (size > 48 && lines.length * size * 1.05 + 44 + pills > coverH) { size -= 6; x.font = `800 ${size}px ${F.display}`; lines = this._lines(x, g.title, tw, 3); }
		const textH = lines.length * size * 1.05 + (meta ? 50 : 0) + pills;
		let ty = blockY + coverH - textH + size * 0.85;
		x.fillStyle = "#fff";
		for (const l of lines) { x.fillText(l, tx, ty); ty += size * 1.05; }
		if (meta) {
			x.font = `600 30px ${F.ui}`; x.fillStyle = "rgba(255, 255, 255, 0.7)";
			x.fillText(this._lines(x, meta, tw, 1)[0], tx, ty + 4); ty += 50;
		}
		let px = tx;
		const statusLabel = g.notPlayed && g.status === "Backlog" ? "Não jogado" : C.statusLabel(g.status);
		px += this._pill(x, F, px, ty - 18, statusLabel, this._tone(C.statusDefs[g.status]?.tone)) + 14;
		if (g.provider && g.provider !== "unset" && px < W - 220) this._pill(x, F, px, ty - 18, g.providerLabel, accent);

		// números
		const gap = 24, tw3 = (W - 128 - gap * 2) / 3;
		this._tile(x, F, 64, tilesY, tw3, tileH, "Tempo", g.playtime.hours ? U.fmtHours(g.playtime.hours) : "—");
		const a = g.ach;
		const X2 = 64 + tw3 + gap;
		if (a.state === "known" && a.total) {
			this._tile(x, F, X2, tilesY, tw3, tileH, "Conquistas", `${a.unlocked}/${a.total}`, { reserve: 0, color: a.perfect ? "#f5c451" : "#fff" });
			this._ring(x, X2 + tw3 - 52, tilesY + 50, 22, a.pct, a.perfect ? "#f5c451" : accent);
		} else if (a.state === "pct") {
			this._tile(x, F, X2, tilesY, tw3, tileH, "Conquistas", U.fmtPct(a.pctRound));
			this._ring(x, X2 + tw3 - 52, tilesY + 50, 22, a.pct, accent);
		} else this._tile(x, F, X2, tilesY, tw3, tileH, "Conquistas", "—");
		const X3 = 64 + (tw3 + gap) * 2;
		if (g.rating > 0) {
			this._tile(x, F, X3, tilesY, tw3, tileH, "Nota", "");
			this._stars(x, F, X3 + 26, tilesY + tileH - 40, g.rating, Math.min(46, (tw3 - 70) / 5.4));
		} else if (g.status === "Completed" && g.completionDate) {
			this._tile(x, F, X3, tilesY, tw3, tileH, "Zerado em", U.fmtDate(g.completionDate), { size: 44 });
		} else this._tile(x, F, X3, tilesY, tw3, tileH, "Status", statusLabel, { size: 44 });

		this._footer(x, F, W, H, this._who(ctx));
		return c;
	}

	// cartão da coleção: capa (ou arte dos jogos) desfocada ao fundo, tipo,
	// nome, descrição, números e uma grade com as capas da coleção
	async collectionCard(ctx, col, format = "post") {
		const { U, C, B } = ctx;
		const { c, x, W, H } = this._canvas(format);
		const F = this._fonts();
		try { await document.fonts?.ready; } catch (_) {}
		const story = format === "story";
		const s = C.groupStats(col.games);
		const id = B?.collectionIdent ? B.collectionIdent(ctx, col) : { color: col.accent || "#4f8df7", kind: "Coleção" };
		const max = story ? 12 : 9;
		const list = col.games.slice(0, max);
		const covers = await Promise.all(list.map(g => this._image(g.images.cover, this._rawChain(g.page || {}, ["cover", "coverFicha"]))));
		const bgSrc = col.cover || col.games.map(g => g.images.background || g.images.featured).find(Boolean) || "";
		const bg = bgSrc ? await this._image(bgSrc) : (covers.find(Boolean) || null);
		const accent = /^#[0-9a-f]{6}$/i.test(id.color) ? id.color : this._accent(covers.find(Boolean) || bg, C.hashHue(col.title));

		x.fillStyle = "#0a0e14"; x.fillRect(0, 0, W, H);
		if (bg) { x.save(); x.filter = "blur(36px) saturate(1.3)"; x.globalAlpha = 0.6; this._cover(x, bg, -60, -60, W + 120, H * 0.62); x.restore(); }
		const fade = x.createLinearGradient(0, 0, 0, H);
		fade.addColorStop(0, "rgba(10, 14, 20, 0.35)"); fade.addColorStop(0.42, "rgba(10, 14, 20, 0.92)"); fade.addColorStop(1, "rgba(10, 14, 20, 1)");
		x.fillStyle = fade; x.fillRect(0, 0, W, H);
		this._brand(x, F, 64, 100, accent);

		let y = story ? 250 : 190;
		this._pill(x, F, 64, y, id.kind.toUpperCase(), accent);
		y += story ? 156 : 132;
		x.fillStyle = "#fff"; x.font = `800 ${story ? 86 : 72}px ${F.display}`;
		const tl = this._lines(x, col.title, W - 128, 2);
		tl.forEach((l, i) => x.fillText(l, 64, y + i * (story ? 92 : 78)));
		y += tl.length * (story ? 92 : 78) + 6;
		if (col.description) {
			x.font = `500 ${story ? 34 : 30}px ${F.ui}`; x.fillStyle = "rgba(255, 255, 255, 0.72)";
			this._lines(x, col.description, W - 128, 2).forEach((l, i) => x.fillText(l, 64, y + i * (story ? 44 : 40)));
			y += (Math.min(2, this._lines(x, col.description, W - 128, 2).length)) * (story ? 44 : 40) + 10;
		}
		y += story ? 40 : 26;
		const gap = 20, tw = (W - 128 - gap * 3) / 4, th = story ? 170 : 140;
		[["Jogos", U.fmtNum(s.count)], ["Horas", s.hours ? U.fmtHours(s.hours) : "—"], ["Zerados", `${s.completionPct}%`, s.completionPct === 100 ? "#7fcf63" : null], ["Conquistas", s.achPct !== null ? `${s.achPct}%` : "—", s.achPct === 100 ? "#f5c451" : null]]
			.forEach(([l, v, col2], i) => this._tile(x, F, 64 + i * (tw + gap), y, tw, th, l, v, { size: story ? 52 : 44, color: col2 || "#fff" }));
		y += th + (story ? 56 : 40);

		// grade de capas (até 3 por linha no Post, 4 no Story)
		const cols = story ? 4 : 3, cg = 20;
		const areaBottom = H - 120;
		const cw = (W - 128 - cg * (cols - 1)) / cols;
		let ch = cw * 1.5;
		const rows = Math.ceil(list.length / cols);
		const avail = areaBottom - y;
		if (rows * ch + (rows - 1) * cg > avail) ch = Math.max(120, (avail - (rows - 1) * cg) / Math.max(1, rows));
		const cw2 = Math.min(cw, ch / 1.5);
		list.forEach((g, i) => {
			const r = Math.floor(i / cols), k = i % cols;
			const X = 64 + k * (cw + cg) + (cw - cw2) / 2, Y = y + r * (ch + cg);
			if (Y + ch > areaBottom + 4) return;
			x.save(); this._rr(x, X, Y, cw2, ch, 16); x.clip();
			if (covers[i]) this._cover(x, covers[i], X, Y, cw2, ch);
			else { const gr = x.createLinearGradient(X, Y, X + cw2, Y + ch); gr.addColorStop(0, `hsl(${g.hue} 35% 26%)`); gr.addColorStop(1, `hsl(${g.hue + 30} 30% 10%)`); x.fillStyle = gr; x.fillRect(X, Y, cw2, ch); x.fillStyle = "#fff"; x.font = `800 24px ${F.display}`; this._lines(x, g.title, cw2 - 24, 3).forEach((l, kk, a) => x.fillText(l, X + 12, Y + ch - 18 - (a.length - 1 - kk) * 28)); }
			x.restore();
			if (g.status === "Completed") { x.fillStyle = "#7fcf63"; x.beginPath(); x.arc(X + cw2 - 22, Y + 22, 12, 0, Math.PI * 2); x.fill(); }
		});
		if (col.games.length > max) { x.font = `700 28px ${F.ui}`; x.fillStyle = "rgba(255, 255, 255, 0.7)"; x.fillText(`+ ${col.games.length - max} jogos`, 64, areaBottom + 10); }

		this._footer(x, F, W, H, this._who(ctx));
		return c;
	}

	_who(ctx) {
		const s = ctx.S?.getConfig?.() || {};
		return s.name ? `${s.name} · minha Game Library` : "minha Game Library";
	}

	// ----------------------------------------------------- cartão: perfil
	// resumo das Estatísticas no período escolhido na página
	async statsCard(ctx, format = "post") {
		const { U, model } = ctx;
		const { c, x, W, H } = this._canvas(format);
		const F = this._fonts();
		try { await document.fonts?.ready; } catch (_) {}
		const sh = window.__svStatsShare || { label: "Tudo", range: { all: true, label: "desde o início" }, W: { hours: model.stats.hours, sessions: 0, completed: model.stats.completed, ach: model.stats.achUnlocked, games: model.games.length }, top: [] };
		const story = format === "story";
		// um período sem sessões não mostra os mais jogados de todos os tempos
		const top = sh.top.length || !sh.range?.all ? sh.top : [...model.games].filter(g => g.playtime.hours > 0).sort((a, b) => b.playtime.hours - a.playtime.hours).slice(0, 3).map(g => ({ g, h: g.playtime.hours }));
		const covers = await Promise.all(top.map(t => this._image(t.g.images.cover, this._rawChain(t.g.page || {}, ["cover", "coverFicha"]))));
		const bgs = await Promise.all(top.slice(0, 1).map(t => this._image(t.g.images.background || t.g.images.featured, this._rawChain(t.g.page || {}, ["background", "featured"]))));
		const accent = this._accent(covers.find(Boolean), 210);
		x.fillStyle = "#0a0e14"; x.fillRect(0, 0, W, H);
		if (bgs[0]) { x.save(); x.filter = "blur(40px) saturate(1.2)"; x.globalAlpha = 0.55; this._cover(x, bgs[0], -80, -80, W + 160, H * 0.6 + 160); x.restore(); }
		const fade = x.createLinearGradient(0, 0, 0, H * 0.7); fade.addColorStop(0, "rgba(10, 14, 20, 0.35)"); fade.addColorStop(1, "rgba(10, 14, 20, 1)");
		x.fillStyle = fade; x.fillRect(0, 0, W, H);
		this._brand(x, F, 64, 100, accent);
		let y = story ? 260 : 200;
		this._pill(x, F, 64, y, (sh.range?.all ? "TODA A BIBLIOTECA" : sh.label.toUpperCase()), accent);
		y += story ? 150 : 128;
		x.fillStyle = "#fff"; x.font = `800 ${story ? 84 : 72}px ${F.display}`;
		x.fillText("Minhas estatísticas", 64, y);
		y += story ? 56 : 48;
		x.font = `600 ${story ? 34 : 30}px ${F.ui}`; x.fillStyle = "rgba(255, 255, 255, 0.7)";
		x.fillText(sh.range?.all ? "Desde o início do vault" : sh.range.label[0].toUpperCase() + sh.range.label.slice(1), 64, y);
		y += story ? 60 : 44;
		const w = sh.W;
		const tiles = [["Horas", U.fmtHours(w.hours)], [sh.range?.all ? "Jogos" : "Sessões", U.fmtNum(sh.range?.all ? w.games : w.sessions)], ["Zerados", U.fmtNum(w.completed)], ["Conquistas", U.fmtNum(w.ach)]];
		const gap = 20, tw = (W - 128 - gap) / 2, th = story ? 190 : 160;
		tiles.forEach(([l, v], i) => this._tile(x, F, 64 + (i % 2) * (tw + gap), y + Math.floor(i / 2) * (th + gap), tw, th, l, v, { size: story ? 64 : 56 }));
		y += th * 2 + gap + (story ? 80 : 56);
		if (top.length) {
			x.fillStyle = "#fff"; x.font = `800 ${story ? 44 : 38}px ${F.display}`;
			x.fillText("Mais jogados", 64, y); y += story ? 34 : 26;
			const cw = story ? 250 : 200, chh = cw * 1.5, cg = Math.min(48, (W - 128 - cw * 3) / 2);
			if (y + chh + 60 < H - 100) top.forEach((t, i) => {
				const X = 64 + i * (cw + cg);
				x.save(); this._rr(x, X, y, cw, chh, 18); x.clip();
				if (covers[i]) this._cover(x, covers[i], X, y, cw, chh);
				else { x.fillStyle = `hsl(${t.g.hue} 35% 22%)`; x.fillRect(X, y, cw, chh); x.fillStyle = "#fff"; x.font = `800 30px ${F.display}`; this._lines(x, t.g.title, cw - 32, 4).forEach((l, k) => x.fillText(l, X + 16, y + 50 + k * 36)); }
				x.restore();
				x.fillStyle = "rgba(255, 255, 255, 0.85)"; x.font = `700 ${story ? 32 : 28}px ${F.ui}`;
				x.fillText(U.fmtHours(t.h), X, y + chh + (story ? 46 : 40));
			});
		}
		this._footer(x, F, W, H, "minha Game Library");
		return c;
	}

	async profileCard(ctx, format = "post") {
		const { U, C, model, S } = ctx;
		const { c, x, W, H } = this._canvas(format);
		const F = this._fonts();
		try { await document.fonts?.ready; } catch (_) {}
		const st = C.libraryStats(model);
		const cfg = S?.getConfig?.() || {};
		const top = [...model.games].filter(g => g.playtime.hours > 0).sort((a, b) => b.playtime.hours - a.playtime.hours).slice(0, 4);
		const covers = await Promise.all(top.map(g => this._image(g.images.cover, this._rawChain(g.page || {}, ["cover", "coverFicha"]))));
		// 3.26.0: nome e avatar do Perfil do jogador (com a Steam como reserva)
		const PF = customJS.SteamVaultProfile;
		const pname = PF ? PF.displayName(ctx) : cfg.name;
		const asrc = PF ? PF.avatarSrc(ctx, model) : cfg.avatar;
		const avatar = asrc ? await this._image(asrc) : null;
		const accent = this._accent(covers.find(Boolean) || avatar, 210);

		// fundo: as capas mais jogadas, desfocadas, sob um degradê
		x.fillStyle = "#0a0e14"; x.fillRect(0, 0, W, H);
		const imgs = covers.filter(Boolean);
		if (imgs.length) {
			x.save(); x.filter = "blur(40px) saturate(1.3)"; x.globalAlpha = 0.55;
			const cw = W / imgs.length;
			imgs.forEach((im, i) => this._cover(x, im, i * cw - 40, -40, cw + 80, H * 0.6));
			x.restore();
		}
		const glow = x.createRadialGradient(W / 2, H * 0.18, 0, W / 2, H * 0.18, W * 0.8);
		glow.addColorStop(0, "rgba(10, 14, 20, 0.15)"); glow.addColorStop(1, "rgba(10, 14, 20, 0.95)");
		x.fillStyle = glow; x.fillRect(0, 0, W, H);
		const fade = x.createLinearGradient(0, H * 0.3, 0, H * 0.62);
		fade.addColorStop(0, "rgba(10, 14, 20, 0)"); fade.addColorStop(1, "rgba(10, 14, 20, 1)");
		x.fillStyle = fade; x.fillRect(0, H * 0.3, W, H * 0.7);

		this._brand(x, F, 64, 100, accent);
		const story = format === "story";

		// layout pelo espaço disponível: mede os blocos, encolhe as capas se
		// faltar altura (Post) ou distribui a sobra entre os blocos (Story)
		const ar = story ? 130 : 96, nameSize = story ? 80 : 64, subSize = story ? 34 : 30;
		const gap = 22, tw = (W - 128 - gap * 2) / 3, th = story ? 210 : 160;
		const n = top.length, cg = 24;
		let cw = Math.min(story ? 230 : 190, n ? (W - 128 - cg * (n - 1)) / n : 0), ch = cw * 1.5;
		const headH = story ? 58 : 50, labelH = 50;
		const hA = ar * 2 + 12, hB = nameSize + 16 + subSize, hC = th * 2 + gap;
		const hD = () => (n ? headH + ch + labelH : 0);
		const areaTop = 140, areaBottom = H - 56 - 52;
		const avail = areaBottom - areaTop;
		const blocks = n ? 4 : 3;
		let sp = story ? 80 : 44;
		let total = hA + hB + hC + hD() + sp * (blocks - 1);
		if (total > avail && n) { ch = Math.max(150, ch - (total - avail)); cw = ch / 1.5; total = hA + hB + hC + hD() + sp * (blocks - 1); }
		if (total < avail) { sp = Math.min(story ? 130 : 70, sp + (avail - total) / (blocks + 1)); total = hA + hB + hC + hD() + sp * (blocks - 1); }
		let y = areaTop + Math.max(0, (avail - total) / 2);

		// avatar e nome
		x.save(); x.beginPath(); x.arc(W / 2, y + 6 + ar, ar, 0, Math.PI * 2); x.closePath();
		x.shadowColor = "rgba(0, 0, 0, 0.6)"; x.shadowBlur = 40; x.fillStyle = "#1a2230"; x.fill(); x.restore();
		x.save(); x.beginPath(); x.arc(W / 2, y + 6 + ar, ar, 0, Math.PI * 2); x.clip();
		if (avatar) this._cover(x, avatar, W / 2 - ar, y + 6, ar * 2, ar * 2);
		else { x.fillStyle = accent; x.globalAlpha = 0.5; x.fillRect(W / 2 - ar, y + 6, ar * 2, ar * 2); }
		x.restore();
		x.lineWidth = 6; x.strokeStyle = accent; x.beginPath(); x.arc(W / 2, y + 6 + ar, ar + 6, 0, Math.PI * 2); x.stroke();
		y += hA + sp;
		x.textAlign = "center"; x.fillStyle = "#fff"; x.font = `800 ${nameSize}px ${F.display}`;
		x.fillText(this._lines(x, pname || "Minha Game Library", W - 160, 1)[0], W / 2, y + nameSize * 0.8);
		x.font = `600 ${subSize}px ${F.ui}`; x.fillStyle = "rgba(255, 255, 255, 0.65)";
		x.fillText(`Biblioteca de jogos · ${new Date().getFullYear()}`, W / 2, y + nameSize + 16 + subSize * 0.8);
		x.textAlign = "left";
		y += hB + sp;

		// números (3 × 2)
		const cells = [
			["Jogos", U.fmtNum(st.games)], ["Horas", st.hours ? U.fmtHours(st.hours) : "—"], ["Conquistas", U.fmtNum(st.achUnlocked)],
			["Zerados", U.fmtNum(st.completed)], ["Com 100%", U.fmtNum(st.perfect), st.perfect ? "#f5c451" : null], ["Nota média", st.avgRating ? `${String(st.avgRating).replace(".", ",")}★` : "—"]
		];
		cells.forEach(([l, v, col], i) => this._tile(x, F, 64 + (i % 3) * (tw + gap), y + Math.floor(i / 3) * (th + gap), tw, th, l, v, { size: story ? 64 : 54, color: col || "#fff" }));
		y += hC + sp;

		// mais jogados
		if (n) {
			x.font = `800 ${story ? 40 : 34}px ${F.display}`; x.fillStyle = "#fff";
			x.fillText("Mais jogados", 64, y + (story ? 40 : 34)); y += headH;
			top.forEach((g, i) => {
				const X = 64 + i * (cw + cg);
				x.save(); this._rr(x, X, y, cw, ch, 18); x.clip();
				if (covers[i]) this._cover(x, covers[i], X, y, cw, ch);
				else { const gr = x.createLinearGradient(X, y, X + cw, y + ch); gr.addColorStop(0, `hsl(${g.hue} 35% 26%)`); gr.addColorStop(1, `hsl(${g.hue + 30} 30% 10%)`); x.fillStyle = gr; x.fillRect(X, y, cw, ch); x.fillStyle = "#fff"; x.font = `800 26px ${F.display}`; this._lines(x, g.title, cw - 28, 3).forEach((l, k, a) => x.fillText(l, X + 14, y + ch - 20 - (a.length - 1 - k) * 30)); }
				x.restore();
				x.font = `700 ${story ? 30 : 26}px ${F.ui}`; x.fillStyle = "rgba(255, 255, 255, 0.8)";
				x.fillText(U.fmtHours(g.playtime.hours), X, y + ch + 36);
			});
		}

		this._footer(x, F, W, H, this._who(ctx));
		return c;
	}
}
