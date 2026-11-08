// Desempenho com biblioteca grande (3.47.0): acrescenta N jogos sintéticos
// (padrão 1000, com sessões, plataformas, gêneros e status variados) ao vault
// de teste e mede o tempo de cada tela. Não roda no GitHub (tempo varia por
// máquina); use para comparar antes e depois de uma mudança.
//   node perf.js [N] [m|d]   m = celular com CPU 4x mais lenta (padrão), d = computador
const { start } = require("./server");
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("playwright-core")); }
const N=Number(process.argv[2]||1000), MODE=process.argv[3]||"m";
(async()=>{const {server,url}=await start();const b=await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const vp=MODE==="d"?{width:1400,height:900}:{width:410,height:887};
const ctx=await b.newContext({viewport:vp,isMobile:MODE!=="d",hasTouch:MODE!=="d",reducedMotion:"reduce"});const p=await ctx.newPage();
const errs=[];p.on("pageerror",e=>errs.push(e.message));
if(MODE!=="d"){const cdp=await ctx.newCDPSession(p);await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});}
await p.route("**/data.js",async route=>{const r=await route.fetch();let body=await r.text();
 body+=`;(function(){const base=__PAGES.find(x=>x.fm&&x.fm.type==="game");const plats=["PC","PS2","PSP","PS1","SNES","N64","GBA","NDS","3DS","GameCube","Switch","PS4"];const st=["Backlog","Playing","Completed","Paused","Dropped","Wishlist"];const gen=["Ação","Aventura","RPG","Plataforma","Horror","Sandbox","Puzzle","Estratégia","Corrida","Luta"];
 let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};const d=(y)=>y+"-"+String(1+Math.floor(rnd()*12)).padStart(2,"0")+"-"+String(1+Math.floor(rnd()*28)).padStart(2,"0");
 for(let i=0;i<${N};i++){const pl=plats[i%plats.length];const s=st[Math.floor(rnd()*st.length)];const path="Games/"+pl+"/Jogo sintético "+i+".md";
 const sessions=[];const ns=Math.floor(rnd()*12);for(let k=0;k<ns;k++)sessions.push({date:d(2023+Math.floor(rnd()*4)),hours:Math.round(rnd()*40)/10,note:"sessão "+k});
 const fm=Object.assign({},base.fm,{title:"Jogo sintético "+i,platform:pl,status:s,genre:[gen[i%gen.length],gen[(i*3)%gen.length]],subgenre:[],rating:Math.round(rnd()*10)/2,hoursPlayed:Math.round(rnd()*800)/10,sessions,playthroughs:[],dlc:[],screenshots:[],soundtrack:[],notes:[],
  dateAdded:d(2022+Math.floor(rnd()*5)),startDate:s!=="Backlog"&&s!=="Wishlist"?d(2023):"",completionDate:s==="Completed"?d(2024+Math.floor(rnd()*3)):"",steamAppId:"",cover:"",background:"",featured:"",logo:"",favorite:rnd()<0.05,upNext:null,franchise:"",tier:"",price:Math.round(rnd()*200)});
 __PAGES.push({fm,path,page:base.page});__FILES.push(path);}})();`;
 route.fulfill({response:r,body,headers:{...r.headers(),"content-type":"application/javascript"}});});
const t0=Date.now();await p.goto(url+"?p=Dashboard/Home.md");await p.waitForFunction(()=>window.__ready,null,{timeout:180000});const boot=Date.now()-t0;
console.log(`${N} jogos · ${MODE==="d"?"computador":"celular (CPU 4x mais lenta)"} · ${await p.evaluate(()=>customJS.SteamVaultCore.model?.games?.length||__PAGES.filter(x=>x.fm?.type==="game").length)} no índice`);
console.log("abrir o vault (até a Início pronta):",boot,"ms");
const time=async(label,fn)=>{const ms=await p.evaluate(async src=>{const f=eval(src);const t=performance.now();await f();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return Math.round(performance.now()-t)},fn);console.log(label.padEnd(36),ms,"ms");return ms;};
const res={};
for(const [l,path] of [["Início","Dashboard/Home.md"],["Biblioteca","Dashboard/Biblioteca.md"],["Estatísticas","Dashboard/Estatísticas.md"],["Plataformas","Dashboard/Plataformas.md"],["Gêneros","Dashboard/Gêneros.md"],["Conquistas","Dashboard/Conquistas.md"],["Coleções","Dashboard/Coleções.md"],["Perfil","Dashboard/Perfil.md"],["Ficha (Celeste)","Games/PC/Celeste.md"],["Plataforma PC","Platforms/PC.md"]]){
 res[l]=await time(l,`async()=>{go(${JSON.stringify(path)});await new Promise(r=>setTimeout(r,0));}`);}
await p.evaluate(()=>go("Dashboard/Estatísticas.md"));await p.waitForTimeout(300);
for(const t of ["time","taste","ach","money","years","compare"]) res["Estatísticas › "+t]=await time("Estatísticas › "+t,`async()=>{document.querySelector('[data-st-tab="${t}"]').click();}`);
await p.evaluate(()=>go("Dashboard/Biblioteca.md"));await p.waitForTimeout(300);
res["Biblioteca: busca"]=await time("Biblioteca: digitar busca",`async()=>{const i=document.querySelector('.sv-page input[type=search]');i.value="sintético 99";i.dispatchEvent(new Event("input",{bubbles:true}));await new Promise(r=>setTimeout(r,400));}`);
res["Biblioteca: 2ª busca"]=await time("Biblioteca: 2ª busca (já montada)",`async()=>{const i=document.querySelector('.sv-page input[type=search]');i.value="sintético 5";i.dispatchEvent(new Event("input",{bubbles:true}));await new Promise(r=>setTimeout(r,400));}`);
res["Biblioteca: limpar"]=await time("Biblioteca: apagar a busca",`async()=>{const i=document.querySelector('.sv-page input[type=search]');i.value="";i.dispatchEvent(new Event("input",{bubbles:true}));await new Promise(r=>setTimeout(r,400));}`);
res["modelo"]=await time("recalcular o índice (invalidate+model)",`async()=>{const C=customJS.SteamVaultCore;C.invalidate();C.buildModel?C.buildModel(window.dv||{}):0;}`);
console.log("cards na Biblioteca:",await p.evaluate(()=>document.querySelectorAll(".sv-card, .sv-libcard, [data-game-card]").length));
console.log("erros:",errs.length?errs.slice(0,3):"nenhum");
await b.close();server.close();})();
