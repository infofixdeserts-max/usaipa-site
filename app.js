// usaipa.org app layer: localStorage data + level gating
const LEVELS = ["town","county","state","national"];
const LS_CTX = "ipa_contexts_v1", LS_VOTES = "ipa_votes_v1";
const store = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch(e){ return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};
function contexts(){ return store.get(LS_CTX, []); }
function saveContext(c){ const a = contexts(); a.push(c); store.set(LS_CTX, a); }
function votes(){ return store.get(LS_VOTES, []); }
function saveVote(v){ const a = votes(); a.push(v); store.set(LS_VOTES, a); }
function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
// find contexts matching place+level
function findCtx(place, level){ return contexts().filter(c => c.place.toLowerCase() === place.toLowerCase() && c.level === level); }
// gating: a higher-level context can only be created if ALL lower levels exist and all agree
function gateCheck(placeChain){
  // placeChain = [{level, place, exists, agreed}]
  const lower = placeChain.slice(0, -1);
  const missing = lower.filter(l => !l.exists);
  const disagreed = lower.filter(l => l.exists && !l.agreed);
  return { ok: missing.length===0 && disagreed.length===0, missing, disagreed };
}
function el(id){ return document.getElementById(id); }
function esc(s){ const d=document.createElement("div"); d.textContent=s; return d.innerHTML; }
function fmtDate(ts){ return new Date(ts).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}); }