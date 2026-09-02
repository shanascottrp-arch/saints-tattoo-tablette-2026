const KEY="saintsTattooTablette";
const DEFAULT={
 users:[
  {id:1,name:"Admin",username:"admin",password:"admin",role:"admin",grade:"Patron",active:true},
  {id:2,name:"Alex Morgan",username:"alex",password:"1234",role:"employee",grade:"Employé",active:true}
 ],
 prices:{Petit:500,Moyen:800,Grand:1200}, salaryQuota:5000, salaryByGrade:{Patron:4800,Manager:3900,"Employé":3000}, bank:5000,
 transactions:[],services:[],sales:[],salaryPayments:[],weeklyArchives:[],lastWeeklyArchiveKey:null,nextId:10
};
let state=load(), currentUser=null, page="home", selectedTattoo=null;
archiveWeekIfNeeded();

function load(){
 try{
  const x=JSON.parse(localStorage.getItem(KEY));
  if(!x)return structuredClone(DEFAULT);
  const s={...structuredClone(DEFAULT),...x};
  s.users=(s.users||[]).map(u=>({...u,grade:u.grade||((u.role==="admin")?"Patron":"Employé")}));
  // Migration de sécurité : garantir les comptes de démonstration si une ancienne version les a perdus.
  if(!s.users.some(u=>u.username==="admin")) s.users.unshift({id:1,name:"Admin",username:"admin",password:"admin",role:"admin",grade:"Patron",active:true});
  if(!s.users.some(u=>u.username==="alex")) s.users.push({id:2,name:"Alex Morgan",username:"alex",password:"1234",role:"employee",grade:"Employé",active:true});
  s.prices={...DEFAULT.prices,...(s.prices||{})};
  s.salaryQuota=Number(s.salaryQuota||5000);
  s.salaryByGrade={...DEFAULT.salaryByGrade,...(s.salaryByGrade||{})};
  s.transactions=s.transactions||[];s.services=s.services||[];s.sales=s.sales||[];s.salaryPayments=s.salaryPayments||[];s.weeklyArchives=s.weeklyArchives||[];s.lastWeeklyArchiveKey=s.lastWeeklyArchiveKey||null;
  return s;
 }catch(e){return structuredClone(DEFAULT)}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function weekKey(d=new Date()){const x=new Date(d);x.setHours(0,0,0,0);const n=(x.getDay()+6)%7;x.setDate(x.getDate()-n);return x.toISOString().slice(0,10)}
function weekRange(key){const start=new Date(key+"T00:00:00");const end=new Date(start);end.setDate(end.getDate()+7);return {start,end}}
function archiveWeekIfNeeded(){
 const now=new Date(), key=weekKey(now);
 if(state.lastWeeklyArchiveKey===key)return false;
 const prev=new Date(now);prev.setDate(prev.getDate()-(now.getDay()||7));prev.setHours(0,0,0,0);
 const prevKey=weekKey(prev);
 if(!state.lastWeeklyArchiveKey){state.lastWeeklyArchiveKey=key;save();return false}
 if(state.lastWeeklyArchiveKey!==key){
  const {start,end}=weekRange(state.lastWeeklyArchiveKey);
  const ss=state.sales.filter(x=>{const d=new Date(x.createdAt);return d>=start&&d<end});
  const tt=state.transactions.filter(x=>{const d=new Date(x.createdAt);return d>=start&&d<end});
  const services=state.services.filter(x=>{const d=new Date(x.start);return d>=start&&d<end});
  state.weeklyArchives.push({id:state.nextId++,week:state.lastWeeklyArchiveKey,createdAt:now.toISOString(),sales:ss.length,salesAmount:ss.reduce((a,x)=>a+x.amount,0),income:tt.filter(x=>x.type==='income').reduce((a,x)=>a+x.amount,0),expenses:tt.filter(x=>x.type==='expense').reduce((a,x)=>a+x.amount,0),services:services.length,hours:services.reduce((a,x)=>a+Math.max(0,(new Date(x.end||x.start)-new Date(x.start))/36e5),0)});
  state.lastWeeklyArchiveKey=key;save();return true;
 }
 return false;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function money(v){return new Intl.NumberFormat("fr-FR",{maximumFractionDigits:2}).format(Number(v)||0)+" $"}
function dt(v){return new Date(v).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}
function fh(h){let m=Math.max(0,Math.floor((Number(h)||0)*60));return String(Math.floor(m/60)).padStart(2,"0")+"h"+String(m%60).padStart(2,"0")}
function startOf(p){const d=new Date();d.setHours(0,0,0,0);if(p==="week"){const n=(d.getDay()+6)%7;d.setDate(d.getDate()-n)}if(p==="month")d.setDate(1);return d}
function inPeriod(d,p){return new Date(d)>=startOf(p)}
function sales(p="month"){return state.sales.filter(x=>inPeriod(x.createdAt,p))}
function income(p="month"){return sales(p).reduce((a,x)=>a+x.amount,0)+state.transactions.filter(x=>x.type==="income"&&inPeriod(x.createdAt,p)).reduce((a,x)=>a+x.amount,0)}
function expenses(p="month"){return state.transactions.filter(x=>x.type==="expense"&&inPeriod(x.createdAt,p)).reduce((a,x)=>a+x.amount,0)}
function hours(uid,p="month"){return state.services.filter(x=>x.userId===uid&&inPeriod(x.start,p)).reduce((a,x)=>a+Math.max(0,(new Date(x.end||Date.now())-new Date(x.start))/36e5),0)}
function activeService(uid){return state.services.find(x=>x.userId===uid&&!x.end)}
function monthlySales(uid){return sales("month").filter(x=>x.userId===uid).reduce((a,x)=>a+x.amount,0)}
function salary(uid){const u=state.users.find(x=>x.id===uid);if(!u)return 0;return monthlySales(uid)>=state.salaryQuota?Number(state.salaryByGrade[u.grade]||0):0}
function salaryProgress(uid){return Math.min(100,Math.round(monthlySales(uid)/state.salaryQuota*100))}
function paidSalary(uid){return state.salaryPayments.filter(x=>x.userId===uid&&inPeriod(x.date,"month")).reduce((a,x)=>a+x.amount,0)}
function toast(text){const x=document.createElement("div");x.className="toast";x.textContent=text;document.body.appendChild(x);setTimeout(()=>x.remove(),1800)}
function header(title,sub){return `<div class="page-head"><div><div class="eyebrow">SAINTS TATTOO</div><h2>${title}</h2><p>${sub}</p></div><div class="clock">${new Date().toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</div></div>`}

function loginView(){return `<main class="login"><div class="login-card"><div class="logo">🖋️</div><div class="brand-big">SAINTS TATTOO</div><div class="brand-sub">TABLETTE DE GESTION</div><form id="loginForm" onsubmit="return doLogin(event)"><label>Identifiant<input id="username" autocomplete="username" required></label><label>Mot de passe<input id="password" type="password" autocomplete="current-password" required></label><button class="btn primary wide" type="submit">Se connecter</button><div id="loginError" class="error"></div></form><div class="demo">Test : <b>admin / admin</b> · <b>alex / 1234</b></div></div></main>`}
function nav(id,icon,label){return `<button type="button" class="${page===id?"active":""}" data-page="${id}">${icon}<span>${label}</span></button>`}
function shell(){return `<div class="shell"><aside class="sidebar"><div class="side-brand"><div class="logo small">🖋️</div><div><b>SAINTS TATTOO</b><small>TABLETTE</small></div></div><div class="nav-title">ESPACE</div><nav>${nav("home","⌂","Accueil")}${nav("service","◷","Service")}${nav("tattoo","✒","Tatouage")}${nav("history","▤","Historique")}</nav>${currentUser.role==="admin"?`<div class="nav-title">ADMINISTRATION</div><nav>${nav("dashboard","▥","Tableau de bord")}${nav("accounting","€","Comptabilité")}${nav("payroll","₽","Salaires")}${nav("employees","♙","Employés")}${nav("settings","⚙","Paramètres")}</nav>`:""}<div class="side-bottom"><div class="user-chip"><span class="avatar">${esc(currentUser.name[0])}</span><div><b>${esc(currentUser.name)}</b><small>${currentUser.role==="admin"?"Administrateur":"Tatoueur"}</small></div></div><button type="button" class="logout" data-action="logout">↪ Déconnexion</button></div></aside><main class="content">${view()}</main></div>`}

function home(){const s=activeService(currentUser.id),mine=sales().filter(x=>x.userId===currentUser.id).reduce((a,x)=>a+x.amount,0),recent=state.sales.filter(x=>x.userId===currentUser.id).slice(-5).reverse();return `${header("Bonjour "+esc(currentUser.name),"Votre espace de gestion Saints Tattoo.")}<div class="hero-grid"><section class="card hero"><span class="eyebrow">ESPACE PERSONNEL</span><h3>Une tablette simple.<br>Une gestion maîtrisée.</h3><p>Service, prestations et résultats réunis au même endroit.</p><div class="actions"><button class="btn primary" data-page="tattoo">✒ Nouvelle prestation</button><button class="btn" data-page="service">◷ Mon service</button></div></section><section class="card service-widget"><div class="row"><h3>Service</h3><span class="badge ${s?"green":"red"}">${s?"EN SERVICE":"HORS SERVICE"}</span></div><div class="big-time">${s?fh((Date.now()-new Date(s.start))/36e5):"--h--"}</div><small>${s?"Depuis "+dt(s.start):"Aucun service en cours"}</small><button type="button" class="btn ${s?"danger":"success"}" data-action="service">${s?"Fin de service":"Prendre son service"}</button></section></div><div class="cards4"><div class="card stat"><small>CA aujourd'hui</small><b>${money(income("day"))}</b></div><div class="card stat"><small>CA ce mois</small><b>${money(income("month"))}</b></div><div class="card stat"><small>Mes ventes</small><b>${money(mine)}</b></div><div class="card stat"><small>Mes heures</small><b>${fh(hours(currentUser.id))}</b></div></div><section class="card"><div class="row"><h3>Dernières prestations</h3><button class="btn small" data-page="history">Voir tout</button></div>${recent.length?`<div class="list">${recent.map(x=>`<div class="list-row"><div><b>${esc(x.type)}</b><small>${dt(x.createdAt)}</small></div><strong class="plus">+${money(x.amount)}</strong></div>`).join("")}`:`<div class="empty">Aucune prestation.</div>`}</section>`}
function servicePage(){const s=activeService(currentUser.id),list=state.services.filter(x=>x.userId===currentUser.id).slice().reverse();return `${header("Service","Enregistrez vos heures automatiquement.")}<section class="card service-panel"><span class="badge ${s?"green":"red"}">${s?"EN SERVICE":"HORS SERVICE"}</span><div class="big-time">${s?fh((Date.now()-new Date(s.start))/36e5):"--h--"}</div><small>${s?"Début : "+dt(s.start):"Aucun service en cours"}</small><br><button type="button" class="btn ${s?"danger":"success"}" data-action="service">${s?"Fin de service":"Prendre son service"}</button></section><section class="card"><div class="row"><h3>Mes services récents</h3><span class="badge">Ce mois : ${fh(hours(currentUser.id))}</span></div><div class="table-wrap"><table><thead><tr><th>Début</th><th>Fin</th><th>Durée</th></tr></thead><tbody>${list.map(x=>`<tr><td>${dt(x.start)}</td><td>${x.end?dt(x.end):'<span class="badge green">En cours</span>'}</td><td>${fh((new Date(x.end||Date.now())-new Date(x.start))/36e5)}</td></tr>`).join("")||'<tr><td colspan="3" class="empty">Aucun service.</td></tr>'}</tbody></table></div></section>`}
function tattooPage(){const s=activeService(currentUser.id);const items=[["Petit","machine-petit.svg","Petit format"],["Moyen","machine-moyen.svg","Format moyen"],["Grand","machine-grand.svg","Grand format"],["Personnalisé","machine-personnalise.svg","Montant libre"]];return `${header("Tatouage","Choisissez une taille, puis validez le paiement.")}${!s?'<div class="notice">⚠ Vous devez être en service pour enregistrer une prestation.</div>':""}<section class="card"><div class="row"><h3>Nouvelle prestation</h3><span class="badge">Paiement direct</span></div><div class="tattoo-grid">${items.map(([k,img,sub])=>`<button type="button" class="tattoo-option ${selectedTattoo===k?"selected":""}" data-tattoo="${k}" ${s?"":"disabled"}><img src="assets/${img}" alt="Machine à tatouer"><span>${k}</span><b>${k==="Personnalisé"?"Montant libre":money(state.prices[k])}</b><small>${sub}</small></button>`).join("")}</div>${selectedTattoo?`<div class="payment-box"><div><small>PRESTATION</small><b>${esc(selectedTattoo)}</b></div><div><small>MONTANT</small><b>${selectedTattoo==="Personnalisé"?"Montant libre":money(state.prices[selectedTattoo])}</b></div><button type="button" class="btn primary" data-action="sale">Valider ${selectedTattoo==="Personnalisé"?"le paiement":money(state.prices[selectedTattoo])}</button></div>`:""}</section>`}
function historyPage(){const all=currentUser.role==="admin",ss=state.sales.filter(x=>all||x.userId===currentUser.id).slice().reverse(),sv=state.services.filter(x=>all||x.userId===currentUser.id).slice().reverse(),wa=state.weeklyArchives.slice().reverse();return `${header("Historique","Prestations et services enregistrés.")}<div class="tabs"><button type="button" class="tab active" data-tab="sales">Prestations (${ss.length})</button><button type="button" class="tab" data-tab="services">Services (${sv.length})</button><button type="button" class="tab" data-tab="archives">Archives (${wa.length})</button></div><section class="card tab-panel" id="tabSales"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Tatoueur</th><th>Taille</th><th>Montant</th></tr></thead><tbody>${ss.map(x=>{const u=state.users.find(a=>a.id===x.userId);return `<tr><td>${dt(x.createdAt)}</td><td>${esc(u?.name)}</td><td>${esc(x.type)}</td><td class="plus">+${money(x.amount)}</td></tr>`}).join("")||'<tr><td colspan="4" class="empty">Aucune prestation.</td></tr>'}</tbody></table></div></section><section class="card tab-panel hidden" id="tabServices"><div class="table-wrap"><table><thead><tr><th>Début</th><th>Fin</th><th>Tatoueur</th><th>Durée</th></tr></thead><tbody>${sv.map(x=>{const u=state.users.find(a=>a.id===x.userId);return `<tr><td>${dt(x.start)}</td><td>${x.end?dt(x.end):'<span class="badge green">En cours</span>'}</td><td>${esc(u?.name)}</td><td>${fh((new Date(x.end||Date.now())-new Date(x.start))/36e5)}</td></tr>`}).join("")||'<tr><td colspan="4" class="empty">Aucun service.</td></tr>'}</tbody></table></div></section>`}
function dashboard(){const emps=state.users.filter(x=>x.role==="employee"),ca=income("month"),dep=expenses("month"),rows=emps.map(u=>({u,ca:sales().filter(x=>x.userId===u.id).reduce((a,x)=>a+x.amount,0),h:hours(u.id)})).sort((a,b)=>b.ca-a.ca),max=Math.max(1,...rows.map(x=>x.ca));const days=[];for(let i=6;i>=0;i--){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push({d,c:state.sales.filter(x=>new Date(x.createdAt).toDateString()===d.toDateString()).reduce((a,x)=>a+x.amount,0)})}return `${header("Tableau de bord","La vision complète de Saints Tattoo.")}<div class="cards4"><div class="card stat"><small>Chiffre d'affaires</small><b>${money(ca)}</b></div><div class="card stat"><small>Dépenses</small><b class="negative">${money(dep)}</b></div><div class="card stat"><small>Bénéfice</small><b>${money(ca-dep)}</b></div><div class="card stat"><small>Solde bancaire</small><b>${money(state.bank)}</b></div></div><div class="two-col"><section class="card"><h3>CA des 7 derniers jours</h3><div class="bars">${days.map(x=>`<div class="bar-col"><small>${x.c?money(x.c):"—"}</small><i style="height:${Math.max(6,Math.round(x.c/max*100))}%"></i><label>${x.d.toLocaleDateString("fr-FR",{weekday:"short"}).slice(0,3)}</label></div>`).join("")}</div></section><section class="card"><div class="row"><h3>Classement</h3><span class="badge">Mois</span></div><div class="ranking">${rows.map((x,i)=>`<div class="rank"><b>${i+1}</b><div><strong>${esc(x.u.name)}</strong><div class="track"><i style="width:${Math.round(x.ca/max*100)}%"></i></div></div><span>${money(x.ca)}</span></div>`).join("")||'<div class="empty">Aucun tatoueur.</div>'}</div></section></div><section class="card"><h3>Activité des tatoueurs</h3><div class="table-wrap"><table><thead><tr><th>Tatoueur</th><th>CA</th><th>Prestations</th><th>Heures</th><th>CA / heure</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.u.name)}</b></td><td>${money(x.ca)}</td><td>${sales().filter(s=>s.userId===x.u.id).length}</td><td>${fh(x.h)}</td><td>${x.h?money(x.ca/x.h):"—"}</td></tr>`).join("")}</tbody></table></div></section>`}
function accounting(){const tr=state.transactions.slice().reverse();return `${header("Comptabilité","Recettes, dépenses et mouvements.")}<div class="cards3"><div class="card stat"><small>Recettes</small><b class="positive">${money(income())}</b></div><div class="card stat"><small>Dépenses</small><b class="negative">${money(expenses())}</b></div><div class="card stat"><small>Solde</small><b>${money(state.bank)}</b></div></div><div class="actions"><button type="button" class="btn success" data-action="income">+ Ajouter une recette</button><button type="button" class="btn danger" data-action="expense">− Ajouter une dépense</button></div><section class="card"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Catégorie</th><th>Description</th><th>Montant</th></tr></thead><tbody>${tr.map(t=>`<tr><td>${dt(t.createdAt)}</td><td><span class="badge ${t.type==="income"?"green":"red"}">${t.type==="income"?"Recette":"Dépense"}</span></td><td>${esc(t.category)}</td><td>${esc(t.description)}</td><td class="${t.type==="income"?"plus":"negative"}">${t.type==="income"?"+":"−"}${money(t.amount)}</td></tr>`).join("")||'<tr><td colspan="5" class="empty">Aucune transaction.</td></tr>'}</tbody></table></div></section>`}
function payroll(){const es=state.users.filter(x=>["Patron","Manager","Employé"].includes(x.grade)),est=es.reduce((a,u)=>a+salary(u.id),0),paid=es.reduce((a,u)=>a+paidSalary(u.id),0);return `${header("Salaires","La paye dépend uniquement des ventes mensuelles, pas des heures.")}<div class="cards3"><div class="card stat"><small>Quota mensuel</small><b>${money(state.salaryQuota)}</b></div><div class="card stat"><small>Payés</small><b class="positive">${money(paid)}</b></div><div class="card stat"><small>À payer</small><b class="negative">${money(Math.max(0,est-paid))}</b></div></div><section class="card"><div class="table-wrap"><table><thead><tr><th>Tatoueur</th><th>Grade</th><th>Ventes du mois</th><th>Objectif</th><th>Paye</th><th>Statut</th><th></th></tr></thead><tbody>${es.map(u=>{const ca=monthlySales(u.id),e=salary(u.id),p=paidSalary(u.id),r=Math.max(0,e-p),prog=salaryProgress(u.id),atteint=ca>=state.salaryQuota;return `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.grade)}</td><td>${money(ca)}</td><td><div class="track"><i style="width:${prog}%"></i></div><small>${prog}% · ${money(state.salaryQuota)}</small></td><td>${money(e)}</td><td><span class="badge ${atteint?"green":"red"}">${atteint?"Quota atteint":"Quota non atteint"}</span></td><td>${r?`<button type="button" class="btn small" data-pay="${u.id}">Payer</button>`:(e>0?'<span class="badge green">Soldé</span>':'<span class="badge">En attente</span>')}</td></tr>`}).join("")||'<tr><td colspan="7" class="empty">Aucun tatoueur.</td></tr>'}</tbody></table></div></section>`}
function employees(){const es=state.users.filter(x=>x.role==="employee");return `${header("Employés","Comptes, présence et performances.")}<div class="actions"><button type="button" class="btn primary" data-action="addEmployee">+ Créer un employé</button></div><section class="card"><div class="table-wrap"><table><thead><tr><th>Employé</th><th>Grade</th><th>Statut</th><th>Heures</th><th>CA du mois</th><th>Objectif</th><th>Actions</th></tr></thead><tbody>${es.map(u=>{const ca=monthlySales(u.id),prog=salaryProgress(u.id);return `<tr><td><b>${esc(u.name)}</b><small>${esc(u.username)}</small></td><td>${esc(u.grade)}</td><td><span class="badge ${u.active?"green":"red"}">${u.active?"Actif":"Désactivé"}</span></td><td>${fh(hours(u.id))}</td><td>${money(ca)}</td><td><div class="track"><i style="width:${prog}%"></i></div><small>${prog}%</small></td><td><button type="button" class="btn small" data-grade="${u.id}">Grade</button> <button type="button" class="btn small" data-toggle="${u.id}">${u.active?"Désactiver":"Activer"}</button></td></tr>`}).join("")||'<tr><td colspan="7" class="empty">Aucun employé.</td></tr>'}</tbody></table></div></section>`}
function settings(){return `${header("Paramètres","Réglages et sauvegarde de la tablette.")}<div class="two-col"><section class="card"><h3>Prix des tatouages</h3><div class="form-grid"><label>Petit<input id="pPetit" type="number" min="0" value="${state.prices.Petit}"></label><label>Moyen<input id="pMoyen" type="number" min="0" value="${state.prices.Moyen}"></label><label>Grand<input id="pGrand" type="number" min="0" value="${state.prices.Grand}"></label></div><button type="button" class="btn primary" data-action="savePrices">Enregistrer les prix</button></section><section class="card"><h3>Solde bancaire</h3><input id="bank" type="number" min="0" step=".01" value="${state.bank}"><button type="button" class="btn" data-action="saveBank">Enregistrer</button></section></div><section class="card"><h3>Sauvegarde</h3><p class="muted">Conservez une copie des données.</p><div class="actions"><button type="button" class="btn primary" data-action="export">Exporter</button><button type="button" class="btn" data-action="import">Importer</button><input id="file" type="file" accept=".json" hidden></div></section><section class="card danger-zone"><h3>Zone sensible</h3><p class="muted">Efface les données locales.</p><button type="button" class="btn danger" data-action="reset">Réinitialiser</button></section>`}
function view(){switch(page){case"home":return home();case"service":return servicePage();case"tattoo":return tattooPage();case"history":return historyPage();case"dashboard":return dashboard();case"accounting":return accounting();case"payroll":return payroll();case"employees":return employees();case"settings":return settings();default:return home()}}
function doLogin(e){
 e.preventDefault();
 const username=(document.getElementById("username")?.value||"").trim().toLowerCase();
 const password=document.getElementById("password")?.value||"";
 const u=state.users.find(x=>String(x.username).trim().toLowerCase()===username&&String(x.password)===password&&x.active!==false);
 if(!u){const er=document.getElementById("loginError");if(er)er.textContent="Identifiant ou mot de passe incorrect.";return false}
 currentUser=u;page="home";selectedTattoo=null;render();return false;
}
function render(){document.getElementById("app").innerHTML=currentUser?shell():loginView()}

document.addEventListener("click",e=>{
 const pg=e.target.closest("[data-page]");
 if(pg){page=pg.dataset.page;selectedTattoo=null;render();return}
 const tb=e.target.closest("[data-tab]");
 if(tb){document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));tb.classList.add("active");document.getElementById("tabSales")?.classList.toggle("hidden",tb.dataset.tab!=="sales");document.getElementById("tabServices")?.classList.toggle("hidden",tb.dataset.tab!=="services");return}
 const t=e.target.closest("[data-tattoo]");
 if(t){if(t.disabled)return;selectedTattoo=t.dataset.tattoo;render();return}
 const act=e.target.closest("[data-action]")?.dataset.action;
 if(act==="logout"){currentUser=null;selectedTattoo=null;render();return}
 if(act==="service"){
  const s=activeService(currentUser.id);
  if(s){s.end=new Date().toISOString();toast("Fin de service enregistrée.")}else{state.services.push({id:state.nextId++,userId:currentUser.id,start:new Date().toISOString(),end:null});toast("Service commencé.")}
  save();render();return
 }
 if(act==="sale"){
  if(!activeService(currentUser.id)){alert("Vous devez être en service.");return}
  let amount=selectedTattoo==="Personnalisé"?Number(prompt("Montant du tatouage en $","0")):Number(state.prices[selectedTattoo]||0);
  if(amount<=0){alert("Montant invalide.");return}
  const d=new Date().toISOString();
  state.sales.push({id:state.nextId++,userId:currentUser.id,type:selectedTattoo,amount,createdAt:d});
  state.transactions.push({id:state.nextId++,type:"income",category:"Tatouage",description:`Tatouage ${selectedTattoo} — ${currentUser.name}`,amount,createdAt:d});
  state.bank+=amount;selectedTattoo=null;save();toast("Paiement enregistré.");render();return
 }
 if(act==="income"){
  const desc=prompt("Description de la recette");const amount=Number(prompt("Montant en $","0"));
  if(desc&&amount>0){const d=new Date().toISOString();state.transactions.push({id:state.nextId++,type:"income",category:"Autre recette",description:desc,amount,createdAt:d});state.bank+=amount;save();render();toast("Recette ajoutée.")}return
 }
 if(act==="expense"){
  const cats=["Fournitures","Salaires","Événement","Autre dépense"];const n=Number(prompt("Catégorie :\n1. Fournitures\n2. Salaires\n3. Événement\n4. Autre dépense","1"));const cat=cats[n-1],desc=prompt("Description"),amount=Number(prompt("Montant en $","0"));
  if(cat&&desc&&amount>0){state.transactions.push({id:state.nextId++,type:"expense",category:cat,description:desc,amount,createdAt:new Date().toISOString()});state.bank-=amount;save();render();toast("Dépense ajoutée.")}return
 }
 if(act==="addEmployee"){
  const name=prompt("Nom complet"),username=prompt("Identifiant"),password=prompt("Mot de passe"),grade=prompt("Grade : Patron, Manager ou Employé","Employé");
  if(!name||!username||!password)return;
  const grades=["Patron","Manager","Employé"];
  if(!grades.includes(grade)){alert("Grade invalide.");return}
  if(state.users.some(x=>x.username===username)){alert("Cet identifiant existe déjà.");return}
  state.users.push({id:state.nextId++,name,username,password,role:"employee",grade,active:true});save();render();toast("Employé créé.");return
 }
 if(act==="savePrices"){state.prices={Petit:Number(document.getElementById("pPetit").value||0),Moyen:Number(document.getElementById("pMoyen").value||0),Grand:Number(document.getElementById("pGrand").value||0)};save();render();toast("Prix enregistrés.");return}
 if(act==="saveBank"){state.bank=Number(document.getElementById("bank").value||0);save();render();toast("Solde enregistré.");return}
 if(act==="export"){const a=document.createElement("a");const u=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.href=u;a.download="saints-tattoo-sauvegarde.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500);return}
 if(act==="import"){document.getElementById("file")?.click();return}
 if(act==="reset"){if(confirm("Effacer toutes les données locales ?")){localStorage.removeItem(KEY);location.reload()}return}
 const pay=e.target.closest("[data-pay]");
 if(pay){const u=state.users.find(x=>x.id===Number(pay.dataset.pay)),due=Math.max(0,salary(u.id)-paidSalary(u.id)),amount=Number(prompt(`Salaire à payer à ${u.name} — maximum ${money(due)}`,due.toFixed(2)));if(amount>0&&amount<=due&&amount<=state.bank){const d=new Date().toISOString();state.salaryPayments.push({id:state.nextId++,userId:u.id,amount,date:d});state.transactions.push({id:state.nextId++,type:"expense",category:"Salaires",description:`Salaire — ${u.name}`,amount,createdAt:d});state.bank-=amount;save();render();toast("Salaire payé.")}else if(amount>0&&amount>state.bank)alert("Solde bancaire insuffisant.");else if(amount)alert("Montant invalide.");return}
 const grade=e.target.closest("[data-grade]");
 if(grade){const u=state.users.find(x=>x.id===Number(grade.dataset.grade)),v=prompt(`Grade de ${u.name} : Patron, Manager ou Employé`,u.grade);if(["Patron","Manager","Employé"].includes(v)){u.grade=v;save();render();toast("Grade mis à jour.")}else if(v!==null)alert("Grade invalide.");return}
 const tog=e.target.closest("[data-toggle]");
 if(tog){const u=state.users.find(x=>x.id===Number(tog.dataset.toggle));if(u){u.active=!u.active;save();render();toast(u.active?"Compte activé.":"Compte désactivé.")}return}
});
document.addEventListener("change",e=>{
 if(e.target.id==="file"&&e.target.files[0]){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.users||!d.sales||!d.transactions)throw 0;localStorage.setItem(KEY,JSON.stringify(d));location.reload()}catch{alert("Sauvegarde invalide.")}};r.readAsText(e.target.files[0])}
});
setInterval(()=>{if(archiveWeekIfNeeded()&&currentUser)render();else if(currentUser)render()},60000);
render();
