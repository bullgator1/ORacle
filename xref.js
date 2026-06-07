/* ORacle — shared cross-reference layer.
   Each app sets window.__ORACLE_APP = 'preop' | 'proc' | 'peds' before loading this.
   Procedures self-drives off its URL #id hash. Step apps (preop/peds) call window.XREF.notify(key, stageEl). */
(function(){
  if (window.__XREF_LOADED) return; window.__XREF_LOADED = 1;
  var APP = window.__ORACLE_APP; if (!APP) return;
  var NAMES = {preop:'Pre-op', proc:'Procedures', peds:'Peds dosing'};

  // ---- approved shared-topic registry ----
  var REG = [
    // A. crisis / intraop
    {t:'Malignant hyperthermia', preop:'rf-mh', proc:'anesthesia-essentials-malignant-hyperthermia', peds:'em-mh'},
    {t:'LAST (local anesthetic toxicity)', preop:'la-root', proc:'anesthesia-essentials-last', peds:'em-last'},
    {t:'Anaphylaxis', proc:'anesthesia-essentials-anaphylaxis', peds:'em-anaphylaxis'},
    {t:'Laryngospasm', proc:'anesthesia-essentials-laryngospasm-dmv', peds:'em-laryngospasm'},
    {t:'Hyperkalemia', preop:'em-hyperK', peds:'em-hyperk'},
    {t:'Massive hemorrhage / MTP', proc:'anesthesia-essentials-blood-management', peds:'em-hemorrhage'},
    {t:'Cardiac arrest (ACLS / PALS)', proc:'anesthesia-essentials-intraop-acls', peds:'em-pals'},
    // B. pre-op comorbidity ↔ procedures reference
    {t:'Severe aortic stenosis', preop:'rf-severeAS', proc:'anesthesia-essentials-aortic-stenosis'},
    {t:'Pulmonary hypertension', preop:'rf-phtn', proc:'anesthesia-essentials-pulmonary-hypertension'},
    {t:'Difficult airway', preop:'rf-difficultAirway', proc:'anesthesia-essentials-adult-difficult-airway'},
    {t:'Mediastinal mass', preop:'rf-mediastinal', proc:'mediastinal-mass'},
    {t:'Tracheal stenosis', preop:'rf-trachealStenosis', proc:'tracheal-resection'},
    {t:'CIED (pacemaker / ICD)', preop:'cv-cied', proc:'anesthesia-essentials-cied'},
    {t:'Recent MI / perioperative ischemia', preop:'rf-recentMI', proc:'anesthesia-essentials-perioperative-myocardial-ischemia'},
    {t:'Cardiac risk stratification', preop:'cv-root', proc:'anesthesia-essentials-cardiac-risk-stratification'},
    {t:'LVAD / heart failure', preop:'rf-lvad', proc:'anesthesia-essentials-heart-failure'},
    {t:'Anticoagulation & neuraxial', preop:'ac-root', proc:'anesthesia-essentials-neuraxial-anticoagulation'},
    {t:'Aspiration / RSI', preop:'aw-aspirationRisk', proc:'anesthesia-essentials-pulmonary-aspiration', peds:'b-rsi'},
    {t:'GLP-1 & aspiration', preop:'aw-glp1', proc:'anesthesia-essentials-glp1-aspiration'},
    {t:'SGLT2 inhibitors', preop:'dm-sglt2', proc:'anesthesia-essentials-sglt2'},
    {t:'PONV', preop:'risk-ponv', proc:'anesthesia-essentials-ponv'},
    {t:'Frailty / geriatric', preop:'risk-cfs', proc:'anesthesia-essentials-geriatric'},
    {t:'OSA / STOP-Bang', preop:'risk-stopbang', proc:'anesthesia-essentials-osa'},
    {t:'Stress-dose steroids', preop:'oth-steroids', proc:'anesthesia-essentials-adrenal-steroids'},
    {t:'Biologics / RA', preop:'oth-biologics', proc:'anesthesia-essentials-rheumatoid-arthritis'},
    {t:'Buprenorphine / chronic opioid', preop:'sub-bupe', proc:'anesthesia-essentials-buprenorphine-methadone'},
    {t:'Alcohol / substance use', preop:'sub-alcohol', proc:'anesthesia-essentials-substance-use'},
    {t:'Pseudocholinesterase deficiency', preop:'rf-pche', proc:'anesthesia-essentials-neuromuscular-blockade'},
    {t:'Liver disease', preop:'liv-risk', proc:'anesthesia-essentials-liver-disease'},
    // C. peds
    {t:'Local anesthetic max dose', preop:'la-calc', proc:'anesthesia-essentials-local-anesthetic-pharmacology', peds:'cat-la'}
  ];
  // procedures pediatric cards that get a one-way "Peds dosing ↗" affordance
  var PEDS_CARDS = ['pediatric-airway-ent','pediatric-neonatal-general-thoracic','pediatric-ophthalmology','congenital-cardiac-surgery','pediatric-neurosurgery','pediatric-craniofacial-cleft','pediatric-remote-radiation-cath-ecmo'];

  var byAnchor = {};
  REG.forEach(function(r){ if (r[APP]) (byAnchor[r[APP]] = byAnchor[r[APP]] || []).push(r); });

  function targetsFor(rows){
    var out = [], seen = {};
    rows.forEach(function(r){
      ['preop','proc','peds'].forEach(function(a){
        if (a !== APP && r[a]) { var k=a+'#'+r[a]; if(!seen[k]){seen[k]=1; out.push({app:a, hash:r[a], topic:r.t});} }
      });
    });
    return out;
  }
  function jump(t, originTopic){
    var origin = NAMES[APP] + (originTopic ? ' · ' + originTopic : '');
    try {
      if (window.parent && window.parent !== window && window.parent.ORACLE) {
        window.parent.ORACLE.jump({app:t.app, hash:t.hash}, origin);
      } else { if (t.hash) location.hash = '#' + t.hash; }
    } catch(e) { if (t.hash) location.hash = '#' + t.hash; }
  }
  function buildBar(rows, opts){
    var tgs = rows ? targetsFor(rows) : [];
    if (opts && opts.pedsCard && APP==='proc') {
      if (!tgs.some(function(x){return x.app==='peds';})) tgs.push({app:'peds', hash:'', topic:'Peds dosing'});
    }
    if (!tgs.length) return null;
    var topic = (rows && rows[0]) ? rows[0].t : (opts&&opts.pedsCard?'Pediatric case':'');
    var bar = document.createElement('div'); bar.className = 'oracle-xref';
    var lbl = document.createElement('span'); lbl.className='ox-lbl'; lbl.textContent='↗ Also in'; bar.appendChild(lbl);
    tgs.forEach(function(t){
      var b = document.createElement('button'); b.className = 'ox-chip ox-' + t.app; b.type='button';
      b.textContent = NAMES[t.app]; b.title = 'Open “' + t.topic + '” in ' + NAMES[t.app];
      b.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); jump(t, topic); });
      bar.appendChild(b);
    });
    return bar;
  }
  function placeBar(container, rows, opts, sig){
    if (!container) return;
    // idempotency guard — avoids MutationObserver feedback loops
    if (container.getAttribute('data-xref-sig') === sig && container.querySelector(':scope > .oracle-xref')) return;
    container.setAttribute('data-xref-sig', sig || '');
    var existing = container.querySelector(':scope > .oracle-xref');
    if (existing) existing.remove();
    var bar = buildBar(rows, opts); if (!bar) return;
    container.insertBefore(bar, container.firstChild);
  }

  // ---- styles ----
  var s = document.createElement('style');
  s.textContent =
    '.oracle-xref{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 14px;padding:8px 0;border-bottom:1px dashed #e2dcd2}'+
    '.oracle-xref .ox-lbl{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6b645c}'+
    '.oracle-xref .ox-chip{appearance:none;cursor:pointer;border:1px solid #d8d0c4;background:#fffdf9;border-radius:999px;padding:5px 12px;font:500 12.5px/1 "IBM Plex Sans",system-ui,sans-serif;color:#23201d}'+
    '.oracle-xref .ox-chip:before{content:"↗ ";opacity:.7}'+
    '.oracle-xref .ox-chip:hover{border-color:#2f6f6a;color:#2f6f6a;background:#f3f7f6}'+
    '.oracle-xref .ox-proc:hover{border-color:#6b2737;color:#6b2737;background:#f8f2f2}'+
    '.oracle-xref .ox-peds:hover{border-color:#9a7b29;color:#9a7b29;background:#f8f5ec}';
  (document.head||document.documentElement).appendChild(s);

  // ---- drivers ----
  if (APP === 'proc') {
    var run = function(){
      var id = (location.hash||'').replace(/^#/,'').split('?')[0];
      if (!id) return;
      var head = document.querySelector('.proc-head'); if (!head) return;
      var rows = byAnchor[id]; var pedsCard = PEDS_CARDS.indexOf(id) !== -1;
      if (rows || pedsCard) placeBar(head, rows, {pedsCard:pedsCard}, id+(pedsCard?'+p':''));
    };
    var t=null; var sched=function(){ clearTimeout(t); t=setTimeout(run,60); };
    var startProc = function(){
      try { new MutationObserver(sched).observe(document.getElementById('content')||document.body, {childList:true, subtree:true}); } catch(e){}
      window.addEventListener('hashchange', sched); sched();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startProc); else startProc();
  } else {
    // step apps drive us
    window.XREF = {
      notify: function(key, stageEl){
        if (!stageEl) stageEl = document.getElementById('stage');
        if (!stageEl) return;
        var rows = key ? byAnchor[key] : null;
        if (rows) placeBar(stageEl, rows, {}, key);
        else { stageEl.setAttribute('data-xref-sig',''); var ex = stageEl.querySelector(':scope > .oracle-xref'); if (ex) ex.remove(); }
      }
    };
  }
})();
