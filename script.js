
"use strict";

/* PHEONIX FC — local browser edition */
const STORAGE_KEY = "pheonix_fc_admin_v5";
const DEFAULT_PASSWORD = "phoenix2026";
const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const money = n => "£" + Number(n || 0).toLocaleString("en-GB");
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

const initialPlayers = [
  ["Alex Morgan","Goalkeeper",85,1],["Daniel Carter","Defender",82,2],
  ["Ryan Wilson","Defender",80,4],["Leo Anderson","Defender",81,3],
  ["James Walker","Defender",79,5],["Noah Thomas","Midfielder",86,6],
  ["Oliver Scott","Midfielder",83,8],["Ethan Brown","Midfielder",90,10],
  ["Lucas Miller","Forward",87,11],["Jack Davis","Forward",91,9],
  ["Mason Taylor","Forward",85,7]
].map(([name,position,rating,number]) => ({
  id:uid(),name,position,rating,number,wage:5000,goals:0,assists:0,
  appearances:0,yellow:0,red:0,injured:false,captain:false
}));

function defaultData(){
  return {
    club:{name:"PHEONIX FC",tagline:"RISE FROM THE ASHES"},
    password:DEFAULT_PASSWORD,players:initialPlayers,
    staff:[{id:uid(),name:"Alex Ferguson",role:"Manager",rating:85,speciality:"Tactics"}],
    fixtures:[],tournaments:[],transactions:[],balance:1000000,
    stats:{wins:0,draws:0,losses:0,goals:0,played:0},
    lineup:initialPlayers.map(p=>p.id),captain:initialPlayers[0].id,
    settings:{stadium:"night"},match:null
  };
}
function loadData(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && saved.players && saved.stats){
      const base=defaultData();
      return {...base,...saved,
        club:{...base.club,...saved.club},
        stats:{...base.stats,...saved.stats},
        settings:{...base.settings,...saved.settings},
        players:Array.isArray(saved.players)?saved.players:base.players,
        staff:Array.isArray(saved.staff)?saved.staff:[],
        fixtures:Array.isArray(saved.fixtures)?saved.fixtures:[],
        tournaments:Array.isArray(saved.tournaments)?saved.tournaments:[],
        transactions:Array.isArray(saved.transactions)?saved.transactions:[],
        lineup:Array.isArray(saved.lineup)?saved.lineup:base.lineup
      };
    }
  }catch(error){console.warn("Saved club data could not be read.",error);}
  return defaultData();
}
let data=loadData();
let owner=false,toastTimer=null,matchTimer=null,matchPaused=false,matchClock=0;
let live=null;

function save(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}
  catch(error){notify("Could not save data. Browser storage may be full.");}
}
function notify(message){
  const el=$("toast");if(!el)return;
  el.textContent=message;el.classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);
}
function page(name){
  if(name==="admin"&&!owner){openLogin();return;}
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  $("page-"+name)?.classList.add("active");
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  $("navigation").classList.remove("open");
  if(name==="stadium")renderStadium();
}
function showAdminTab(name){
  document.querySelectorAll(".admin-section").forEach(s=>s.classList.remove("active"));
  document.querySelectorAll(".admin-tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  $(name)?.classList.add("active");
}
function openLogin(){$("loginModal").classList.remove("hidden");$("ownerPassword").focus();}
function closeLogin(){$("loginModal").classList.add("hidden");$("loginError").textContent="";}
function updateOwnerUI(){
  document.querySelectorAll(".owner-only").forEach(el=>el.classList.toggle("hidden",!owner));
  $("loginButton").classList.toggle("hidden",owner);
  $("logoutButton").classList.toggle("hidden",!owner);
  $("ownerStatus").textContent=owner?"OWNER ACCESS":"SUPPORTER VIEW";
}
function requireOwner(){
  if(!owner){notify("Owner login required.");openLogin();return false;}
  return true;
}
function activePlayers(){return data.players.filter(p=>!p.injured);}
function getPlayer(id){return data.players.find(p=>p.id===id);}
function selectedXI(){return data.lineup.map(getPlayer).filter(p=>p&&!p.injured).slice(0,11);}
function formatName(p){return p?`${p.name} (#${p.number})`:"Unknown player";}

/* Navigation */
document.querySelectorAll("[data-page]").forEach(btn=>btn.addEventListener("click",e=>{
  e.preventDefault();page(btn.dataset.page);
}));
document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>page(btn.dataset.go)));
$("menuToggle").addEventListener("click",()=>$("navigation").classList.toggle("open"));
$("loginButton").addEventListener("click",openLogin);
$("closeLogin").addEventListener("click",closeLogin);
$("loginModal").addEventListener("click",e=>{if(e.target===$("loginModal"))closeLogin();});
$("logoutButton").addEventListener("click",()=>{
  owner=false;updateOwnerUI();page("home");notify("Logged out.");
});
$("loginForm").addEventListener("submit",e=>{
  e.preventDefault();
  if($("ownerPassword").value===data.password){
    owner=true;closeLogin();updateOwnerUI();page("admin");renderAll();notify("Owner access granted.");
  }else{$("loginError").textContent="Incorrect password."; }
});
document.querySelectorAll(".admin-tab").forEach(b=>b.addEventListener("click",()=>showAdminTab(b.dataset.tab)));

/* Squad */
function renderLineup(){
  const xi=selectedXI();
  const forwards=xi.filter(p=>p.position==="Forward");
  const mids=xi.filter(p=>p.position==="Midfielder");
  const defs=xi.filter(p=>p.position==="Defender");
  const gk=xi.filter(p=>p.position==="Goalkeeper");
  const draw=(list)=>list.map(p=>`<span class="lineup-player">${safe(p.name)}<small>${p.number}${p.captain?" · C":""}</small></span>`).join("");
  $("lineupForwards").innerHTML=draw(forwards);
  $("lineupMidfielders").innerHTML=draw(mids);
  $("lineupDefenders").innerHTML=draw(defs);
  $("lineupGoalkeeper").innerHTML=draw(gk);
  $("lineupNote").textContent=`${xi.length} selected · 4-3-3 target formation`;
}
function renderSquad(){
  $("squadCount").textContent=`${data.players.length} players`;
  $("squadList").innerHTML=data.players.map(p=>`
    <article class="player-card">
      <div class="player-meta"><span>#${p.number} · ${safe(p.position)}</span><span class="rating">${p.rating}</span></div>
      <h3>${safe(p.name)} ${p.captain?"<span class='tag'>C</span>":""}</h3>
      <div class="player-meta"><span>${p.injured?"Injured":"Available"}</span><span>${p.goals||0} goals</span></div>
    </article>`).join("")||"<p class='muted'>No players added yet.</p>";
  renderLineup();
}
function renderAdminSquad(){
  $("adminSquadList").innerHTML=data.players.map(p=>`
    <div class="stack-row">
      <div><b>${safe(p.name)}</b><br><small>#${p.number} · ${safe(p.position)} · Rating ${p.rating} · ${p.injured?"Injured":"Available"}</small></div>
      <div class="row-wrap">
        <button class="mini-button" data-action="captain" data-id="${p.id}">${p.captain?"Captain":"Make captain"}</button>
        <button class="mini-button" data-action="injury" data-id="${p.id}">${p.injured?"Clear injury":"Set injured"}</button>
        <button class="mini-button" data-action="edit-player" data-id="${p.id}">Edit</button>
        <button class="mini-button danger" data-action="delete-player" data-id="${p.id}">Remove</button>
      </div>
    </div>`).join("")||"<p class='muted'>No players in the squad.</p>";
  $("startingXIList").innerHTML=data.players.map(p=>`
    <label class="stack-row"><span>${safe(p.name)} · ${p.position} · ${p.rating}</span>
      <input type="checkbox" data-lineup="${p.id}" ${data.lineup.includes(p.id)?"checked":""} ${p.injured?"disabled":""}>
    </label>`).join("");
}
$("playerForm").addEventListener("submit",e=>{
  e.preventDefault();if(!requireOwner())return;
  const name=$("playerName").value.trim(),number=Number($("playerNumber").value);
  if(data.players.some(p=>p.number===number)){notify("That shirt number is already taken.");return;}
  data.players.push({id:uid(),name,position:$("playerPosition").value,
    rating:clamp(Number($("playerRating").value),1,99),number,
    wage:Math.max(0,Number($("playerWage").value)),goals:0,assists:0,
    appearances:0,yellow:0,red:0,injured:false,captain:false});
  $("playerForm").reset();save();renderAll();notify("Player added.");
});
$("adminSquadList").addEventListener("click",e=>{
  const b=e.target.closest("[data-action]");if(!b||!requireOwner())return;
  const p=getPlayer(b.dataset.id);if(!p)return;
  if(b.dataset.action==="captain"){
    data.players.forEach(x=>x.captain=false);p.captain=true;data.captain=p.id;
  }else if(b.dataset.action==="injury"){p.injured=!p.injured;if(p.injured)data.lineup=data.lineup.filter(id=>id!==p.id);}
  else if(b.dataset.action==="delete-player"){
    if(!confirm(`Remove ${p.name} from the squad?`))return;
    data.players=data.players.filter(x=>x.id!==p.id);data.lineup=data.lineup.filter(id=>id!==p.id);
  }else if(b.dataset.action==="edit-player"){
    const name=prompt("Player name",p.name);if(name===null)return;
    const rating=prompt("Rating (1–99)",p.rating);if(rating===null)return;
    p.name=name.trim()||p.name;p.rating=clamp(Number(rating)||p.rating,1,99);
  }
  save();renderAll();
});
$("startingXIList").addEventListener("change",e=>{
  const id=e.target.dataset.lineup;if(!id||!requireOwner())return;
  if(e.target.checked){
    if(data.lineup.length>=11){e.target.checked=false;notify("A maximum of 11 starters.");return;}
    if(!data.lineup.includes(id))data.lineup.push(id);
  }else data.lineup=data.lineup.filter(x=>x!==id);
  save();renderAll();
});
$("autoLineupButton").addEventListener("click",()=>{
  if(!requireOwner())return;
  const choose=pos=>activePlayers().filter(p=>p.position===pos).sort((a,b)=>b.rating-a.rating);
  const chosen=[...choose("Goalkeeper").slice(0,1),...choose("Defender").slice(0,4),
    ...choose("Midfielder").slice(0,3),...choose("Forward").slice(0,3)];
  data.lineup=chosen.map(p=>p.id);save();renderAll();notify(`Selected ${chosen.length} players.`);
});

/* Staff */
$("staffForm").addEventListener("submit",e=>{
  e.preventDefault();if(!requireOwner())return;
  data.staff.push({id:uid(),name:$("staffName").value.trim(),role:$("staffRole").value,
    rating:clamp(Number($("staffRating").value),1,99),speciality:$("staffSpeciality").value.trim()});
  $("staffForm").reset();save();renderStaff();notify("Staff member added.");
});
function renderStaff(){
  $("staffList").innerHTML=data.staff.map(s=>`
    <div class="stack-row"><div><b>${safe(s.name)}</b><br><small>${safe(s.role)} · Rating ${s.rating} · ${safe(s.speciality)}</small></div>
      <button class="mini-button danger" data-remove-staff="${s.id}">Remove</button></div>`).join("")||"<p class='muted'>No staff members added.</p>";
}
$("staffList").addEventListener("click",e=>{
  const b=e.target.closest("[data-remove-staff]");if(!b||!requireOwner())return;
  data.staff=data.staff.filter(s=>s.id!==b.dataset.removeStaff);save();renderStaff();
});

/* Fixtures */
function addFixture(opponent,venue,date,competition="League"){
  data.fixtures.push({id:uid(),opponent,venue,date,competition,status:"Upcoming",
    homeScore:null,awayScore:null,knockout:false});
}
$("fixtureForm").addEventListener("submit",e=>{
  e.preventDefault();if(!requireOwner())return;
  addFixture($("opponentName").value.trim(),$("fixtureVenue").value,$("fixtureDate").value,$("fixtureCompetition").value.trim()||"League");
  $("fixtureForm").reset();save();renderAll();notify("Fixture added.");
});
$("generateSeasonButton").addEventListener("click",()=>{
  if(!requireOwner())return;
  const names=$("seasonOpponents").value.split(",").map(s=>s.trim()).filter(Boolean);
  if(!names.length){notify("Enter at least one opponent.");return;}
  names.forEach(name=>{addFixture(name,"Home","","League");addFixture(name,"Away","","League");});
  save();renderAll();notify("Home and away season created.");
});
function fixtureLabel(f){
  const home=f.venue==="Home"?data.club.name:f.opponent;
  const away=f.venue==="Home"?f.opponent:data.club.name;
  return `${safe(home)} ${f.status==="Played"?`${f.homeScore} – ${f.awayScore}`:"vs"} ${safe(away)}`;
}
function renderFixtures(){
  const upcoming=data.fixtures.filter(f=>f.status==="Upcoming");
  const html=data.fixtures.map(f=>`
    <div class="stack-row"><div><b>${fixtureLabel(f)}</b><br><small>${safe(f.competition)} · ${safe(f.venue)} · ${safe(f.date||"Date TBC")} · ${f.status}</small></div>
      <span class="tag">${f.status==="Played"?"FT":f.status}</span></div>`).join("")||"<p class='muted'>No fixtures have been added yet.</p>";
  $("fixtureList").innerHTML=html;
  $("adminFixtureList").innerHTML=data.fixtures.map(f=>`
    <div class="stack-row"><div><b>${fixtureLabel(f)}</b><br><small>${safe(f.competition)} · ${safe(f.date||"Date TBC")}</small></div>
      <div class="row-wrap">
        ${f.status==="Upcoming"?`<button class="mini-button" data-select-fixture="${f.id}">Select</button>`:""}
        <button class="mini-button danger" data-delete-fixture="${f.id}">Delete</button>
      </div></div>`).join("")||"<p class='muted'>No fixtures.</p>";
  $("matchFixtureSelect").innerHTML=upcoming.map(f=>`<option value="${f.id}">${safe(f.opponent)} · ${safe(f.venue)} · ${safe(f.date||"TBC")}</option>`).join("")||"<option value=''>No upcoming fixtures</option>";
  if(live?.fixtureId)$("matchFixtureSelect").value=live.fixtureId;
  $("nextFixture").textContent=upcoming[0]?`${upcoming[0].opponent} · ${upcoming[0].venue}`:"No upcoming fixture";
}
$("adminFixtureList").addEventListener("click",e=>{
  const select=e.target.closest("[data-select-fixture]"),del=e.target.closest("[data-delete-fixture]");
  if(select){
    $("matchFixtureSelect").value=select.dataset.selectFixture;
    notify("Fixture selected for matchday.");
  }
  if(del&&requireOwner()){
    if(!confirm("Delete this fixture?"))return;
    data.fixtures=data.fixtures.filter(f=>f.id!==del.dataset.deleteFixture);
    save();renderAll();
  }
});

/* Tournament management */
$("tournamentForm").addEventListener("submit",e=>{
  e.preventDefault();if(!requireOwner())return;
  data.tournaments.push({id:uid(),name:$("tournamentName").value.trim(),format:$("tournamentFormat").value,status:"Registered"});
  $("tournamentForm").reset();save();renderTournaments();notify("Tournament created.");
});
function renderTournaments(){
  const html=data.tournaments.map(t=>`
    <div class="stack-row"><div><b>${safe(t.name)}</b><br><small>${safe(t.format)} · ${safe(t.status)}</small></div>
      ${owner?`<button class="mini-button danger" data-delete-tournament="${t.id}">Remove</button>`:""}</div>`).join("")||"<p class='muted'>No tournaments registered.</p>";
  $("tournamentList").innerHTML=html;$("adminTournamentList").innerHTML=html;
}
$("adminTournamentList").addEventListener("click",e=>{
  const b=e.target.closest("[data-delete-tournament]");if(!b||!requireOwner())return;
  data.tournaments=data.tournaments.filter(t=>t.id!==b.dataset.deleteTournament);save();renderTournaments();
});

/* Finance and club */
$("financeForm").addEventListener("submit",e=>{
  e.preventDefault();if(!requireOwner())return;
  const type=$("financeType").value,amount=Math.max(0,Number($("financeAmount").value));
  if(!amount){notify("Enter a valid amount.");return;}
  data.balance+=type==="income"?amount:-amount;
  data.transactions.unshift({id:uid(),type,amount,description:$("financeDescription").value.trim(),date:new Date().toLocaleDateString()});
  $("financeForm").reset();save();renderFinance();renderHome();notify("Transaction saved.");
});
function renderFinance(){
  const spent=data.transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  $("financeBalance").textContent=money(data.balance);$("financeSpent").textContent=money(spent);
  $("transactionList").innerHTML=data.transactions.map(t=>`
    <div class="stack-row"><div><b>${safe(t.description)}</b><br><small>${safe(t.date)} · ${t.type}</small></div>
      <b style="color:${t.type==="income"?"#42bd86":"#ff8585"}">${t.type==="income"?"+":"-"}${money(t.amount)}</b></div>`).join("")||"<p class='muted'>No transactions yet.</p>";
}
$("clubForm").addEventListener("submit",e=>{
  e.preventDefault();if(!requireOwner())return;
  data.club.name=$("clubNameInput").value.trim()||"PHEONIX FC";
  data.club.tagline=$("clubTaglineInput").value.trim()||"RISE FROM THE ASHES";
  document.querySelectorAll(".brand b").forEach(el=>el.textContent=data.club.name);
  document.querySelectorAll(".brand small,footer span").forEach(el=>el.textContent=data.club.tagline);
  save();notify("Club details saved.");
});
$("passwordForm").addEventListener("submit",e=>{
  e.preventDefault();if(!requireOwner())return;
  if($("oldPassword").value!==data.password){notify("Current password is incorrect.");return;}
  data.password=$("newPassword").value;save();$("passwordForm").reset();notify("Demo password changed.");
});
$("exportDataButton").addEventListener("click",()=>{
  if(!requireOwner())return;
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="pheonix-fc-data.json";a.click();URL.revokeObjectURL(url);
});
$("importDataInput").addEventListener("change",async e=>{
  if(!requireOwner())return;
  const file=e.target.files[0];if(!file)return;
  try{
    const imported=JSON.parse(await file.text());
    if(!Array.isArray(imported.players)||!imported.stats)throw new Error("Invalid file");
    if(!confirm("Replace current club data with this backup?"))return;
    data={...defaultData(),...imported};save();renderAll();notify("Club data imported.");
  }catch(error){notify("Import failed. Check the JSON backup file.");}
  e.target.value="";
});
$("resetDataButton").addEventListener("click",()=>{
  if(!requireOwner())return;
  if(!confirm("This permanently resets the club data in this browser. Continue?"))return;
  stopMatch();data=defaultData();save();renderAll();notify("Club data reset.");
});

/* Match engine */
function createLiveMatch(fixture){
  const xi=selectedXI();
  if(xi.length<11){notify("Select 11 available starters before kickoff.");return false;}
  if(!xi.some(p=>p.position==="Goalkeeper")){notify("Your starting XI needs a goalkeeper.");return false;}
  return {
    fixtureId:fixture.id,opponent:fixture.opponent,venue:fixture.venue,
    homeScore:0,awayScore:0,phase:"first-half",minute:0,extraMinute:0,
    events:[],commentary:[],usedSubs:0,subWindows:0,subWindowOpen:false,
    tactic:"balanced",knockout:!!fixture.knockout,shootout:null,
    scorers:[],assists:[],yellow:[],red:[],corners:0,freeKicks:0,penalties:0,
    startingIds:xi.map(p=>p.id),onPitch:xi.map(p=>p.id),
    homeIsPheonix:fixture.venue==="Home",finished:false
  };
}
function addComment(text,type=""){
  if(!live)return;
  const entry={minute:matchClock,text,type};
  live.events.unshift(entry);live.commentary.unshift(entry);
  live.events=live.events.slice(0,80);live.commentary=live.commentary.slice(0,40);
  renderCommentary();
}
function renderCommentary(){
  const html=live?.commentary.map(e=>`<div class="commentary-line ${e.type==="goal"?"commentary-goal":""}"><b>${e.minute}'</b> ${safe(e.text)}</div>`).join("");
  $("liveCommentary").innerHTML=html||"<p class='muted'>Match commentary will appear here.</p>";
  $("matchEventLog").innerHTML=html||"<p class='muted'>No events yet.</p>";
}
function currentHomeAway(){
  return live.homeIsPheonix
    ?{home:"PHEONIX",away:live.opponent}
    :{home:live.opponent,away:"PHEONIX"};
}
function setScore(home,away){
  if(live.homeIsPheonix){live.homeScore=home;live.awayScore=away;}
  else{live.homeScore=away;live.awayScore=home;}
}
function scoreGoal(team,player,assist){
  if(team==="pheonix"){
    if(live.homeIsPheonix)live.homeScore++;else live.awayScore++;
    if(player){player.goals=(player.goals||0)+1;live.scorers.push(player.id);}
    if(assist){assist.assists=(assist.assists||0)+1;live.assists.push(assist.id);}
    addComment(`GOAL! ${player?.name||"PHEONIX FC"} finds the net${assist?` after a pass from ${assist.name}`:""}!`,"goal");
  }else{
    if(live.homeIsPheonix)live.awayScore++;else live.homeScore++;
    addComment(`GOAL for ${live.opponent}!`,"goal");
  }
  updateScoreboard();
}
function updateScoreboard(){
  $("liveHomeScore").textContent=live?.homeScore??0;
  $("liveAwayScore").textContent=live?.awayScore??0;
  $("liveMatchClock").textContent=live?`${matchClock}'`:"00:00";
  $("liveProgressBar").style.width=`${Math.min(100,matchClock/120*100)}%`;
}
function matchRating(){
  const xi=live.onPitch.map(getPlayer).filter(Boolean);
  const average=xi.length?xi.reduce((s,p)=>s+p.rating,0)/xi.length:65;
  const manager=data.staff.filter(s=>s.role==="Manager").sort((a,b)=>b.rating-a.rating)[0];
  const managerBoost=manager?(manager.rating-70)*.12:0;
  const tacticBoost={balanced:0,attacking:3,defensive:-2,counter:1,possession:1}[live.tactic]||0;
  return average+managerBoost+tacticBoost;
}
function choosePlayer(position){
  const options=live.onPitch.map(getPlayer).filter(p=>p&&(!position||p.position===position));
  return options.sort((a,b)=>b.rating-a.rating)[Math.floor(Math.random()*Math.min(3,options.length))]||options[0]||null;
}
function randomMatchEvent(){
  const strength=matchRating(),roll=Math.random();
  if(roll<.11){
    const p=choosePlayer("Forward")||choosePlayer();
    const a=choosePlayer("Midfielder");
    if(Math.random()<clamp(.30+(strength-75)*.012,.18,.65))scoreGoal("pheonix",p,a);
    else addComment(`${p?.name||"PHEONIX"} shoots, but the goalkeeper makes the save.`);
  }else if(roll<.19){
    const p=choosePlayer("Midfielder")||choosePlayer();
    addComment(`Corner awarded to PHEONIX FC. ${p?.name||"A midfielder"} delivers the ball.`);
    live.corners++;
    if(Math.random()<.19)scoreGoal("pheonix",choosePlayer("Defender")||choosePlayer(),p);
    else addComment("The defence clears the corner.");
  }else if(roll<.27){
    live.freeKicks++;
    const p=choosePlayer("Midfielder")||choosePlayer();
    addComment(`Free kick to PHEONIX FC. ${p?.name||"The taker"} steps up.`);
    if(Math.random()<.16)scoreGoal("pheonix",p);
    else addComment("The free kick misses the target or is saved.");
  }else if(roll<.31){
    live.penalties++;
    addComment("PENALTY! PHEONIX FC have a chance from the spot.");
    const p=choosePlayer("Forward")||choosePlayer();
    if(Math.random()<.76)scoreGoal("pheonix",p);
    else addComment(`${p?.name||"The taker"} misses the penalty!`);
  }else if(roll<.36){
    if(Math.random()<.65){
      const p=choosePlayer();if(p){p.yellow=(p.yellow||0)+1;live.yellow.push(p.id);addComment(`Yellow card for ${p.name}.`);}
    }else addComment("The referee plays advantage after a foul.");
  }else if(roll<.40){
    addComment(`${live.opponent} threaten the PHEONIX goal.`);
    if(Math.random()<.25)scoreGoal("opponent");
    else addComment("The PHEONIX defence stands firm.");
  }else if(roll<.43){
    const p=choosePlayer();
    if(p){addComment(`${p.name} looks uncomfortable. The medical team checks the player.`);}
  }else{
    const lines=["PHEONIX FC keep possession in midfield.","A long pass switches the play.","The crowd roar as PHEONIX press forward.","The defence moves up the pitch.","A promising attack breaks down.","The goalkeeper claims a high ball."];
    addComment(lines[Math.floor(Math.random()*lines.length)]);
  }
}
function setPhase(phase){
  live.phase=phase;
  const labels={"first-half":"FIRST HALF","half-time":"HALF TIME","second-half":"SECOND HALF","extra-first":"EXTRA TIME 1","extra-break":"EXTRA TIME BREAK","extra-second":"EXTRA TIME 2","shootout":"PENALTY SHOOTOUT","full-time":"FULL TIME"};
  $("liveMatchStatus").textContent=labels[phase]||phase.toUpperCase();
  $("matchPhase").textContent=labels[phase]||phase;
}
function tickMatch(){
  if(!live||live.finished||matchPaused)return;
  if(live.phase==="first-half"){
    matchClock++;randomMatchEvent();
    if(matchClock>=45){setPhase("half-time");addComment("Half-time. The players head to the dressing room.");}
  }else if(live.phase==="half-time"){
    setPhase("second-half");addComment("The second half begins.");
  }else if(live.phase==="second-half"){
    matchClock++;randomMatchEvent();
    if(matchClock>=90){
      if(live.knockout&&live.homeScore===live.awayScore){
        setPhase("extra-first");addComment("The match is level. We are going to extra time.");
      }else finishMatch();
    }
  }else if(live.phase==="extra-first"){
    matchClock++;randomMatchEvent();
    if(matchClock>=105){setPhase("extra-break");addComment("End of the first period of extra time.");}
  }else if(live.phase==="extra-break"){
    setPhase("extra-second");addComment("The second period of extra time begins.");
  }else if(live.phase==="extra-second"){
    matchClock++;randomMatchEvent();
    if(matchClock>=120){
      if(live.homeScore===live.awayScore)startShootout();
      else finishMatch();
    }
  }else if(live.phase==="shootout"){
    shootoutKick();
  }
  updateScoreboard();renderStadium();saveMatchSnapshot();
}
function startShootout(){
  setPhase("shootout");
  live.shootout={home:0,away:0,kick:0,homeTaken:0,awayTaken:0,homeMiss:0,awayMiss:0};
  addComment("The match will be decided by a penalty shootout.");
}
function shootoutKick(){
  const s=live.shootout;
  if(s.kick>=10 && s.home!==s.away && Math.abs(s.home-s.away)>(5-Math.floor(s.kick/2)))return finishMatch();
  if(s.kick>=10 && s.kick%2===0 && s.home!==s.away)return finishMatch();
  const homeKick=(s.kick%2===0);
  const scored=Math.random()<.75;
  if(homeKick){
    s.homeTaken++;if(scored)s.home++;else s.homeMiss++;
  }else{
    s.awayTaken++;if(scored)s.away++;else s.awayMiss++;
  }
  addComment(`${homeKick?"PHEONIX FC":"Opponent"} ${scored?"score":"miss"} their shootout penalty.`);
  $("liveMatchClock").textContent=`PEN ${s.home}-${s.away}`;
  s.kick++;
  if(s.kick>=10&&s.home!==s.away){finishMatch();return;}
  if(s.kick>=10&&s.home===s.away&&s.kick%2===0){
    // Sudden death continues until one team scores and the other misses.
    if(s.homeTaken===s.awayTaken && s.home!==s.away)finishMatch();
  }
}
function startMatch(){
  if(!requireOwner())return;
  if(live&&!live.finished){notify("A match is already in progress.");return;}
  const fixture=data.fixtures.find(f=>f.id===$("matchFixtureSelect").value&&f.status==="Upcoming");
  if(!fixture){notify("Select an upcoming fixture in the admin panel.");return;}
  fixture.knockout=$("knockoutMatch").checked;
  live=createLiveMatch(fixture);if(!live)return;
  matchClock=0;matchPaused=false;setPhase("first-half");
  addComment(`Kickoff! PHEONIX FC face ${fixture.opponent}.`);
  $("startMatchButton").disabled=true;$("pauseMatchButton").disabled=false;
  renderStadium();renderSubstitutionControls();
  matchTimer=setInterval(tickMatch,1000);saveMatchSnapshot();
}
function stopMatch(){
  if(matchTimer)clearInterval(matchTimer);matchTimer=null;
  matchPaused=false;
}
function pauseMatch(){
  if(!live||live.finished)return;
  matchPaused=!matchPaused;
  $("pauseMatchButton").textContent=matchPaused?"Resume":"Pause";
  addComment(matchPaused?"Match paused by owner.":"Match resumed.");
}
function finishMatch(){
  if(!live||live.finished)return;
  live.finished=true;stopMatch();setPhase("full-time");
  const f=data.fixtures.find(x=>x.id===live.fixtureId);
  if(f){
    f.status="Played";f.homeScore=live.homeScore;f.awayScore=live.awayScore;
    f.resultNote=live.shootout?`Pens ${live.shootout.home}-${live.shootout.away}`:"";
  }
  data.stats.played++;
  const ourGoals=live.homeIsPheonix?live.homeScore:live.awayScore;
  const theirGoals=live.homeIsPheonix?live.awayScore:live.homeScore;
  data.stats.goals+=ourGoals;
  if(ourGoals>theirGoals)data.stats.wins++;
  else if(ourGoals===theirGoals)data.stats.draws++;
  else data.stats.losses++;
  live.startingIds.forEach(id=>{const p=getPlayer(id);if(p)p.appearances=(p.appearances||0)+1;});
  addComment(`FULL TIME. ${live.homeScore}-${live.awayScore}.`);
  $("startMatchButton").disabled=false;$("pauseMatchButton").disabled=true;
  save();renderAll();renderStadium();
  notify("Match completed and result saved.");
}
function saveMatchSnapshot(){
  // Store only completed match results and fixture data persistently.
  save();
}
$("startMatchButton").addEventListener("click",startMatch);
$("pauseMatchButton").addEventListener("click",pauseMatch);
$("resetMatchButton").addEventListener("click",()=>{
  if(live&&!live.finished){notify("Finish or pause the active match first.");return;}
  live=null;matchClock=0;stopMatch();renderStadium();notify("Match display reset.");
});
$("stadiumModeButton").addEventListener("click",()=>{
  data.settings.stadium=data.settings.stadium==="night"?"day":"night";
  $("stadiumScene").classList.toggle("day",data.settings.stadium==="day");save();
});
function renderStadium(){
  $("stadiumScene").classList.toggle("day",data.settings.stadium==="day");
  $("liveHomeName").textContent=live?(live.homeIsPheonix?data.club.name:live.opponent):data.club.name;
  $("liveAwayName").textContent=live?(live.homeIsPheonix?live.opponent:data.club.name):"OPPONENT";
  $("liveHomeScore").textContent=live?.homeScore??0;$("liveAwayScore").textContent=live?.awayScore??0;
  $("liveMatchClock").textContent=live?`${matchClock}'`:"00:00";
  $("liveMatchStatus").textContent=live?(live.finished?"FULL TIME":live.phase.toUpperCase()):"READY";
  $("liveProgressBar").style.width=`${Math.min(100,matchClock/120*100)}%`;
  if(!live){$("matchMarkers").innerHTML="";$("matchBall").style.left="50%";$("matchBall").style.top="50%";renderCommentary();return;}
  const xi=live.onPitch.map(getPlayer).filter(Boolean);
  $("matchMarkers").innerHTML=xi.map((p,i)=>{
    const x=live.homeIsPheonix?12+(i%4)*9:88-(i%4)*9;
    const y=15+Math.floor(i/4)*28;
    return `<span class="player-marker" style="left:${x}%;top:${y}%">${p.number}</span>`;
  }).join("")+Array.from({length:7},(_,i)=>`<span class="player-marker opponent" style="left:${live.homeIsPheonix?85-(i%3)*8:15+(i%3)*8}%;top:${18+Math.floor(i/3)*28}%">${i+1}</span>`).join("");
  $("matchBall").style.left=`${35+Math.random()*30}%`;
  $("matchBall").style.top=`${25+Math.random()*50}%`;
  renderCommentary();
}

/* Substitutions */
function renderSubstitutionControls(){
  if(!live)return;
  $("substitutionCount").textContent=`${live.usedSubs} of 5 substitutions used · ${live.subWindows} of 3 opportunities used`;
  const on=live.onPitch.map(getPlayer).filter(Boolean);
  const off=activePlayers().filter(p=>!live.onPitch.includes(p.id));
  $("subOut").innerHTML=on.map(p=>`<option value="${p.id}">${safe(p.name)} · ${p.position}</option>`).join("");
  $("subIn").innerHTML=off.map(p=>`<option value="${p.id}">${safe(p.name)} · ${p.position}</option>`).join("");
  $("makeSubButton").disabled=live.finished||live.usedSubs>=5||live.subWindows>=3||!on.length||!off.length;
}
$("makeSubButton").addEventListener("click",()=>{
  if(!requireOwner()||!live||live.finished){notify("Start a match before making substitutions.");return;}
  if(live.usedSubs>=5||live.subWindows>=3){notify("Substitution limit reached.");return;}
  const out=getPlayer($("subOut").value),incoming=getPlayer($("subIn").value);
  if(!out||!incoming||!live.onPitch.includes(out.id)||live.onPitch.includes(incoming.id)){notify("Choose a valid player coming off and on.");return;}
  if(live.usedSubs===0||!live.subWindowOpen){live.subWindows++;live.subWindowOpen=true;}
  live.onPitch=live.onPitch.map(id=>id===out.id?incoming.id:id);
  live.usedSubs++;live.subWindowOpen=false;
  addComment(`Substitution: ${incoming.name} replaces ${out.name}.`);
  renderSubstitutionControls();renderStadium();save();
});
$("applyTacticButton").addEventListener("click",()=>{
  if(!requireOwner()||!live||live.finished){notify("Start a match first.");return;}
  live.tactic=$("matchTactic").value;
  addComment(`PHEONIX FC change to ${live.tactic} tactics.`);
  notify("Tactics updated.");
});

/* Statistics and home */
function renderStats(){
  $("statWins").textContent=data.stats.wins;$("statDraws").textContent=data.stats.draws;
  $("statLosses").textContent=data.stats.losses;$("statGoals").textContent=data.stats.goals;
  $("playerStatistics").innerHTML=[...data.players].sort((a,b)=>(b.goals||0)-(a.goals||0)).map(p=>`
    <div class="stack-row"><div><b>${safe(p.name)}</b><br><small>${safe(p.position)} · ${p.appearances||0} appearances</small></div>
      <b>${p.goals||0} goals · ${p.assists||0} assists</b></div>`).join("")||"<p class='muted'>No player stats yet.</p>";
}
function renderHome(){
  $("homePlayers").textContent=data.players.length;
  $("homeMatches").textContent=data.stats.played;
  $("homeWinRate").textContent=data.stats.played?Math.round(data.stats.wins/data.stats.played*100)+"%":"0%";
  $("homeBalance").textContent=money(data.balance);
  $("mascotMessage").textContent=data.staff.find(s=>s.role==="Manager")?
    `Manager ${data.staff.find(s=>s.role==="Manager").name} leads the team. The phoenix is ready to rise.`:
    "The phoenix is ready to rise. Appoint a manager in the admin panel.";
}
function renderAll(){
  updateOwnerUI();renderSquad();renderAdminSquad();renderStaff();
  renderFixtures();renderTournaments();renderFinance();renderStats();renderHome();
  renderStadium();renderSubstitutionControls();
  $("clubNameInput").value=data.club.name;$("clubTaglineInput").value=data.club.tagline;
}

/* Initialisation */
updateOwnerUI();
renderAll();
if(data.match&&data.match.finished===false){
  // A page refresh does not resume a live match; avoid a phantom active match.
  data.match=null;save();
}
$("matchFixtureSelect").addEventListener("change",()=>{
  const f=data.fixtures.find(x=>x.id===$("matchFixtureSelect").value);
  if(f){$("knockoutMatch").checked=!!f.knockout;}
});
