(function(){
  var BASE='https://www.parlament.gv.at/Filter/api/filter/data/';
  document.querySelectorAll('.copy').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();
    var t=b.parentElement.querySelector('code').innerText;
    var d=function(){var o=b.textContent;b.textContent='Kopiert';setTimeout(function(){b.textContent=o},1200)};
    try{navigator.clipboard.writeText(t).then(d,function(){})}catch(x){}});});
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
        var show=MODE==='none'?[]:(MODE==='sessions'?['Datum','Sitzung','gp_code','ityp','NBVS']:['Nummer','Nr.','Datum','DOKTYP','Status','Fraktionen','THEMEN','Themen','Stellungnahmen','Unterstützungen','Ressort']).filter(function(n){return col(n)>=0});
        var h='<p class="state ok">'+d.count+' Treffer · lastSync '+esc(d.lastSync||'(nicht geliefert)')+' · '+d.header.length+' Spalten, '+d.rows.length+' Zeilen geladen.'+(MODE==='none'?' Personendaten werden hier bewusst nicht angezeigt.':' Gezeigt: erste 8 Zeilen, ohne Titel.')+'</p>';if(MODE==='none'){res.innerHTML=h;return}h+='<table><tr>'+show.map(function(n){return '<th>'+esc(n)+'</th>'}).join('')+'<th>Link</th></tr>';
        d.rows.slice(0,8).forEach(function(r){h+='<tr>'+show.map(function(n){return '<td>'+esc(r[col(n)])+'</td>'}).join('')+'<td><a href="https://www.parlament.gv.at'+esc(r[['HIS_URL','b','uri','link'].map(col).filter(function(i){return i>=0})[0]])+'" rel="noopener">öffnen</a></td></tr>'});
        res.innerHTML=h+'</table>';
      })
      .catch(function(e){res.innerHTML='<p class="state bad">Abruf fehlgeschlagen: '+esc(e.message)+'</p>'})
      .finally(function(){run.disabled=false});
    });
    upd();
  });
})();
