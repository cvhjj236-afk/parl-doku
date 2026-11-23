(function(){
  var BASE='https://www.parlament.gv.at/Filter/api/filter/data/';
  document.querySelectorAll('.copy').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();
    var t=b.parentElement.querySelector('code').innerText;
    var d=function(){var o=b.textContent;b.textContent='Kopiert';setTimeout(function(){b.textContent=o},1200)};
    try{navigator.clipboard.writeText(t).then(d,function(){})}catch(x){}});});
  var THEMEN=['Arbeit','Außenpolitik','Bildung','Budget und Finanzen','Europäische Union','Familie und Generationen','Frauen und Gleichbehandlung','Gesundheit und Ernährung','Information und Medien','Inneres und Recht','Innovation, Technologie und Forschung','Klima, Umwelt und Energie','Kultur','Land- und Forstwirtschaft','Landesverteidigung','Parlament und Demokratie','Soziales','Sport','Verkehr und Infrastruktur','Wirtschaft'];
  var GPS=['XX','XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII'];
  function dimPanel(ed,ta,upd){
    var el=ed.previousElementSibling,tb=null;
    while(el){if(el.tagName==='TABLE'){var th=el.querySelector('th');if(th&&/^Dimension/i.test(th.textContent.trim())){tb=el;break}}el=el.previousElementSibling}
    if(!tb)return;
    var dims=[];
    tb.querySelectorAll('tr').forEach(function(tr){
      var td=tr.querySelectorAll('td');if(td.length<3)return;
      var names=[].map.call(td[0].querySelectorAll('code'),function(c){return c.textContent.trim()});
      names.forEach(function(name){
        var opts=[];
        if(name==='THEMEN')opts=THEMEN.map(function(t){return {v:t,l:t}});
        else if(name==='GP_CODE')opts=GPS.map(function(t){return {v:t,l:t}});
        else if(names.length===1){
          [].forEach.call(td[2].querySelectorAll('code'),function(c){
            var v=c.textContent.trim(),t='',n=c.nextSibling;
            while(n&&n.nodeType===3){t+=n.textContent;n=n.nextSibling}
            t=t.replace(/^\s+/,'');
            var lab=/^[,·(]/.test(t)?'':t.split(/[,·(]/)[0].trim();
            if(!opts.some(function(o){return o.v===v}))opts.push({v:v,l:lab?v+' – '+lab:v});
          });
        }
        dims.push({name:name,meaning:td[1].textContent.trim(),opts:opts});
      });
    });
    if(!dims.length)return;
    var panel=document.createElement('div');panel.className='dims';
    panel.innerHTML='<div class="dims-h">Dimensionen (Dropdown wählen; der JSON-Body unten wird mitgeführt)</div>';
    var grid=document.createElement('div');grid.className='dims-g';panel.appendChild(grid);
    var fields={};
    function getObj(){try{var o=JSON.parse(ta.value);return(o&&typeof o==='object'&&!Array.isArray(o))?o:null}catch(e){return null}}
    function setVal(name,vals){
      var o=getObj()||{};
      if(vals.length)o[name]=vals;else delete o[name];
      ta.value=JSON.stringify(o,null,2);upd();
    }
    function toIso(s){var m=/^(\d\d)\.(\d\d)\.(\d{4})$/.exec(s||'');return m?m[3]+'-'+m[2]+'-'+m[1]:''}
    function fromIso(s){var m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(s||'');return m?m[3]+'.'+m[2]+'.'+m[1]:''}
    dims.forEach(function(d){
      var w=document.createElement('label');w.className='dim';
      var cap=document.createElement('span');cap.innerHTML='<code>'+d.name+'</code> '+d.meaning.replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]});
      w.appendChild(cap);
      if(d.name==='DATUM_VON'){
        var a=document.createElement('input'),b=document.createElement('input');a.type=b.type='date';
        var wrap=document.createElement('span');wrap.className='dates';wrap.appendChild(a);wrap.appendChild(document.createTextNode(' bis '));wrap.appendChild(b);w.appendChild(wrap);
        var f=function(){var x=fromIso(a.value),y=fromIso(b.value);setVal(d.name,x&&y?[x,y]:[])};
        a.addEventListener('change',f);b.addEventListener('change',f);
        fields[d.name]={type:'date',a:a,b:b};
      }else if(d.opts.length){
        var s=document.createElement('select');
        s.innerHTML='<option value="">– beliebig –</option>'+d.opts.map(function(o){return '<option></option>'}).join('');
        [].forEach.call(s.options,function(op,i){if(i>0){op.value=d.opts[i-1].v;op.textContent=d.opts[i-1].l}});
        s.addEventListener('change',function(){if(s.value==='__multi')return;setVal(d.name,s.value?[s.value]:[])});
        w.appendChild(s);fields[d.name]={type:'select',el:s};
      }else{
        var t=document.createElement('input');t.type='text';t.placeholder='Wert(e), mit ; getrennt';
        t.addEventListener('input',function(){setVal(d.name,t.value.split(';').map(function(x){return x.trim()}).filter(Boolean))});
        w.appendChild(t);fields[d.name]={type:'text',el:t};
      }
      grid.appendChild(w);
    });
    function refresh(){
      var o=getObj()||{};
      Object.keys(fields).forEach(function(n){
        var f=fields[n],v=o[n]||[];
        if(f.type==='date'){f.a.value=toIso(v[0]);f.b.value=toIso(v[1]);return}
        if(f.type==='text'){if(document.activeElement!==f.el)f.el.value=v.join('; ');return}
        [].slice.call(f.el.options).forEach(function(op){if(op.value==='__multi')f.el.removeChild(op)});
        if(v.length===1&&[].some.call(f.el.options,function(op){return op.value===v[0]}))f.el.value=v[0];
        else if(!v.length)f.el.value='';
        else{var op=document.createElement('option');op.value='__multi';op.textContent='(im JSON: '+v.join('; ')+')';f.el.appendChild(op);f.el.value='__multi'}
      });
    }
    ta.parentNode.insertBefore(panel,ta);
    ta.addEventListener('input',refresh);
    ed.querySelectorAll('.preset').forEach(function(b){b.addEventListener('click',refresh)});
    ta.addEventListener('change',refresh);
    var origUpd=upd;refresh();
    return refresh;
  }
  document.querySelectorAll('.editor').forEach(function(ed){
    var URL_=ed.getAttribute('data-url')||(BASE+(ed.getAttribute('data-ep')||'101')+'?js=eval&showAll=true');var MODE=ed.getAttribute('data-show')||'';var ta=ed.querySelector('textarea'),cu=ed.querySelector('.curlcode'),st=ed.querySelector('.state'),run=ed.querySelector('.run'),res=ed.querySelector('.res');
    function parse(){
      var o;try{o=JSON.parse(ta.value.trim())}catch(e){st.className='state bad';st.textContent='Kein gültiges JSON: '+e.message;return null}
      var bad=[];
      if(o===null||typeof o!=='object'||Array.isArray(o))bad.push('Body muss ein Objekt sein');
      else Object.keys(o).forEach(function(k){if(!Array.isArray(o[k]))bad.push(k+' muss ein Array sein')});
      if(bad.length){st.className='state bad';st.textContent=bad.join('; ');return null}
      st.className='state ok';st.textContent='Gültig: '+Object.keys(o).length+' Dimension(en)';return o;
    }
    function upd(){var o=parse();if(!o){cu.textContent='';return}
      cu.textContent="curl -s -X POST '"+URL_+"' \\\n  -H 'Content-Type: application/json' \\\n  -d '"+JSON.stringify(o).replace(/'/g,"'\\''")+"'";}
    ta.addEventListener('input',upd);
    ed.querySelectorAll('.preset').forEach(function(b){b.addEventListener('click',function(){ta.value=JSON.stringify(JSON.parse(b.getAttribute('data-b')),null,2);upd();});});
    dimPanel(ed,ta,upd);
    function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
    if(run)run.addEventListener('click',function(){
      var o=parse();if(!o)return;
      run.disabled=true;res.innerHTML='<p class="state">Lade …</p>';
      fetch(URL_,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
      .then(function(d){
        if(!d.header){res.innerHTML='<p class="state bad">'+esc(String(d.errorMsg||'Unbekannte Antwort').replace(/<[^>]*>/g,''))+'</p>';return}
        var lab=d.header.map(function(h){return h.label});
        var col=function(n){return lab.indexOf(n)};
        var show=MODE==='count'?[]:MODE==='none'?lab.filter(function(n,i){var v=d.rows.length?d.rows[0][i]:'';return !(v&&typeof v==='object')}):(MODE==='sessions'?['Datum','Sitzung','gp_code','ityp','NBVS']:['Nummer','Nr.','Datum','DOKTYP','Status','Fraktionen','THEMEN','Themen','Stellungnahmen','Unterstützungen','Ressort','Terminart','Gremium','Bereich']).filter(function(n){return col(n)>=0});
        var h='<p class="state ok">'+d.count+' Treffer · lastSync '+esc(d.lastSync||'(nicht geliefert)')+' · '+d.header.length+' Spalten, '+d.rows.length+' Zeilen geladen.'+(MODE==='none'?' Gezeigt: erste 8 Zeilen, alle Spalten.':(MODE==='count'?' Zeilen werden hier nicht angezeigt.':' Gezeigt: erste 8 Zeilen, ohne Titel.'))+'</p>';if(MODE==='count'){res.innerHTML=h;return}h+='<table><tr>'+show.map(function(n){return '<th>'+esc(n)+'</th>'}).join('')+'<th>Link</th></tr>';
        d.rows.slice(0,8).forEach(function(r){h+='<tr>'+show.map(function(n){return '<td>'+esc(r[col(n)])+'</td>'}).join('')+'<td><a href="https://www.parlament.gv.at'+esc(r[['HIS_URL','b','uri','link','Link'].map(col).filter(function(i){return i>=0})[0]])+'" rel="noopener">öffnen</a></td></tr>'});
        res.innerHTML=h+'</table>';
      })
      .catch(function(e){res.innerHTML='<p class="state bad">Abruf fehlgeschlagen: '+esc(e.message)+'</p>'})
      .finally(function(){run.disabled=false});
    });
    upd();
  });

  (function(){
    var main=document.querySelector('main');if(!main)return;
    var base=(document.currentScript&&document.currentScript.src)?document.currentScript.src.replace(/assets\/app\.js.*$/,''):'/';
    var d=document.createElement('details');d.className='yamlbox';
    d.innerHTML='<summary>OpenAPI-Spezifikation <code>openapi.yaml</code> (gesamte Doku, maschinenlesbar)</summary><pre><button class="copy">Kopieren</button><code>Lade …</code></pre><p style="font-size:13px"><a href="'+base+'openapi.yaml" download>openapi.yaml herunterladen</a></p>';
    main.appendChild(d);
    var code=d.querySelector('pre code'),btn=d.querySelector('.copy');
    btn.addEventListener('click',function(e){e.preventDefault();var o=btn.textContent;
      try{navigator.clipboard.writeText(code.textContent).then(function(){btn.textContent='Kopiert';setTimeout(function(){btn.textContent=o},1200)},function(){})}catch(x){}});
    fetch(base+'openapi.yaml',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text()})
      .then(function(t){code.textContent=t}).catch(function(e){code.textContent='Konnte openapi.yaml nicht laden: '+e.message});
  })();

  (function(){
    var box=document.querySelector('.live');if(!box)return;
    var base=(document.currentScript&&document.currentScript.src)?document.currentScript.src.replace(/assets\/app\.js.*$/,''):'/';
    var fmt=function(n){return (n==null?'–':String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.'))};
    fetch(base+'data/stats.json',{cache:'no-cache'}).then(function(r){return r.json()}).then(function(s){
      var slug=box.getAttribute('data-slug'),ds=s.datasets||{},parts=[];
      Object.keys(ds).forEach(function(k){if(ds[k].slug===slug)parts.push(ds[k])});
      var when=(s.generated_at||'').slice(0,10).split('-').reverse().join('.');
      var issues=s.issues||[];
      var h='<b>Live-Kennzahlen</b> (wöchentlich geprüft, zuletzt '+when+'): ';
      if(slug===''){h+=Object.keys(ds).length+' Datensätze, '+(issues.length?issues.length+' Auffälligkeit(en)':'keine Auffälligkeiten')+'. <a href="'+base+'data/changes.md">Änderungsbericht</a>'}
      else if(parts.length){h+=parts.map(function(d){return d.label+': '+fmt(d.count)+(d.capped?' (abgeschnitten)':'')}).join(' · ')}
      else return;
      box.className=issues.length?'live on bad':'live on';
      box.innerHTML=h;
    }).catch(function(){});
  })();
})();
