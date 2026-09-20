// usaipa.org registry app v2 (final): hierarchy lock, votes, Grafana-style panels
const LEVELS = ["City or Town", "County", "State", "National"];
const LEVEL_RANK = {"City or Town":0, "County":1, "State":2, "National":3};
const LS_CTX = "ipa_registry_ctx_v2";
const LS_VOTE = "ipa_registry_votes_v2";

function loadRegistry(){
  try { return JSON.parse(localStorage.getItem(LS_CTX)) || []; } catch(e){ return []; }
}
function saveRegistry(a){ localStorage.setItem(LS_CTX, JSON.stringify(a)); }
function slug(s){ return (s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function esc(s){ const d=document.createElement("div"); d.textContent=s||""; return d.innerHTML; }
function fmtDate(ts){ return new Date(ts).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}); }

function lowerLevelOf(lvl){ return LEVELS[LEVELS.indexOf(lvl)-1] || null; }

function findCtx(level, place){
  const reg = loadRegistry();
  return reg.find(c => c.level===level && c.place.toLowerCase()===String(place).toLowerCase());
}

/* gate: higher level allowed only when every lower level under it is registered AND agreeing */
function gateCheck(lvl, place, parent){
  const rank = LEVEL_RANK[lvl];
  if(rank===0) return {ok:true, missing:[], disagreed:[], need:null};
  const lowerLvl = lowerLevelOf(lvl);
  const reg = loadRegistry();
  // lower contexts are those whose parent equals the place being registered (towns under the county,
  // counties under the state). National is special: needs all 50 states agreed.
  let lowers = lvl==="National" ? reg.filter(c=>c.level===lowerLvl)
      : reg.filter(c => c.level===lowerLvl && (c.parent||"").toLowerCase()===String(place||"").toLowerCase());
  if(lvl==="National"){
    const states = reg.filter(c=>c.level==="State");
    if(states.length<50) return {ok:false, missing:[(50-states.length)+" state contexts not yet registered"], disagreed:[], need:"State"};
    const disagreeing = states.filter(c=>!c.agreed);
    if(disagreeing.length) return {ok:false, missing:[], disagreed:disagreeing.map(c=>c.place), need:"State"};
    return {ok:true, missing:[], disagreed:[], need:"State"};
  }
  if(lowers.length===0)
    return {ok:false, missing:["no registered "+lowerLvl+" under "+(parent||place)], disagreed:[], need:lowerLvl};
  const bad = lowers.filter(c=>!c.agreed);
  if(bad.length) return {ok:false, missing:[], disagreed:bad.map(c=>c.place), need:lowerLvl};
  return {ok:true, missing:[], disagreed:[], need:lowerLvl};
}

function submitContext(lvl, place, parent, text, sigs, email){
  const g = gateCheck(lvl, place, parent);
  if(!g.ok){
    const why = g.missing.length
      ? "LOCKED. Missing lower level: " + g.missing.join("; ")
      : "LOCKED. These lower levels have not agreed yet: " + g.disagreed.join(", ") + ".";
    return {ok:false, msg:why + " Every lower level must be registered and agree before a " + lvl + " context can be filed."};
  }
  const reg = loadRegistry();
  reg.push({level:lvl, place:place, parent:parent, text:text, sigs:Number(sigs)||0,
            email:email, on:Date.now(), agreed:rank0(lvl), votes:[]});
  saveRegistry(reg);
  return {ok:true, msg:"Registered: " + place + " (" + lvl + ")."};
}
function rank0(lvl){ return LEVEL_RANK[lvl]===0; }

function recordAgreement(level, place){
  const reg = loadRegistry();
  const c = reg.find(x=>x.level===level && x.place.toLowerCase()===place.toLowerCase());
  if(!c) return {ok:false, msg:"No registered context for " + place + " at " + level + " level."};
  c.agreed = true; c.agreedOn = Date.now();
  saveRegistry(reg);
  return {ok:true, msg:place + " agrees to send elected representatives upward. Recorded."};
}

function addVote(level, place, what, how){
  const reg = loadRegistry();
  const c = reg.find(x=>x.level===level && x.place.toLowerCase()===place.toLowerCase());
  if(!c) return {ok:false, msg:"No registered context for " + place + ". Register it first."};
  c.votes = c.votes || [];
  c.votes.push({what:what, how:how, on:Date.now()});
  saveRegistry(reg);
  return {ok:true, msg:"Vote recorded for " + place + ": " + what + " (" + how + ")."};
}

/* Grafana-style panels */
function statPanel(label, value, color){
  return '<div class="gf-panel"><div class="gf-label">' + esc(label) +
         '</div><div class="gf-value" style="color:' + (color||"#9A3C22") + '">' + esc(value) + '</div></div>';
}
function coveragePct(){
  const reg = loadRegistry();
  const counties = new Set(reg.filter(c=>c.level==="County").map(c=>slug(c.place)));
  if(!counties.size) return 0;
  let covered = 0;
  counties.forEach(k=>{
    if(reg.some(c=>c.level==="City or Town" && slug(c.parent)===k)) covered++;
  });
  return Math.round(100*covered/counties.size);
}
