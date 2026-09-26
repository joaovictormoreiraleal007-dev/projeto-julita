
const $ = id => document.getElementById(id);
const portal = $("portal"), formScreen = $("formScreen"), form = $("reportForm");
const locations = $("locations"), residues = $("residues"), metrics = $("metrics");
let reportHtml = "";

const fields = ["actionName","date","city","state","environment","references","start","end","participants","duration","distance",
"objective","methodology","collection","sorting","generalObs","highlight","fishing","cigarettes","sortingInfo","destinationObs","recommendations","conclusion"];

function val(id){ return $(id).value.trim(); }
function num(id){ const n=parseFloat($(id).value); return Number.isFinite(n)?n:null; }
function esc(s=""){ return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function fmt(n,d=2){ return Number(n).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d}); }
function pct(a,b){ return b>0 ? (a/b)*100 : null; }
function showToast(msg){ $("toast").textContent=msg; $("toast").classList.remove("hidden"); setTimeout(()=> $("toast").classList.add("hidden"),2200); }

function addLocation(value=""){
  const row=document.createElement("div");
  row.className="location-row";
  row.innerHTML=`<div><label>Local</label><input class="location-input" value="${esc(value)}" placeholder="Ex.: Praia, parque, praça..."></div>
  <button type="button" class="icon-btn danger remove-location">Excluir</button>`;
  row.querySelector(".remove-location").onclick=()=>{row.remove();};
  locations.appendChild(row);
}
addLocation();

document.querySelectorAll("[data-open-form]").forEach(btn=>btn.onclick=()=>{
  $("formTitle").textContent=`Relatório de limpeza ambiental · ${btn.dataset.openForm}`;
  portal.classList.add("hidden"); formScreen.classList.remove("hidden"); window.scrollTo(0,0);
});
$("backPortal").onclick=()=>{formScreen.classList.add("hidden");portal.classList.remove("hidden");window.scrollTo(0,0)};
$("addLocation").onclick=()=>addLocation();

function addResidue(data={}){
  $("emptyResidues").classList.add("hidden");
  const row=document.createElement("div");
  row.className="residue-row";
  row.innerHTML=`
    <div class="residue-head"><strong>Novo registro</strong><button type="button" class="icon-btn danger remove-residue">Excluir</button></div>
    <div class="residue-grid">
      <div class="field"><label>Nome / descrição *</label><input class="r-name" value="${esc(data.name||"")}" placeholder="Ex.: Garrafa PET"></div>
      <div class="field"><label>Categoria</label><input class="r-category" value="${esc(data.category||"")}" placeholder="Ex.: Plástico"></div>
      <div class="field"><label>Quantidade de itens</label><input class="r-qty" type="number" min="0" step="1" value="${data.qty??""}" placeholder="Ex.: 15"></div>
      <div class="field"><label>Peso (kg)</label><input class="r-weight" type="number" min="0" step="0.001" value="${data.weight??""}" placeholder="Ex.: 1.250"></div>
      <div class="field"><label>Classificação</label><select class="r-class">
        <option value="">Não informado</option><option>Reciclável</option><option>Rejeito</option><option>Orgânico</option><option>Outro</option>
      </select></div>
      <div class="field obs"><label>Destinação</label><input class="r-destination" value="${esc(data.destination||"")}" placeholder="Ex.: triagem, aterro, compostagem..."></div>
      <div class="field full"><label>Observações</label><input class="r-obs" value="${esc(data.obs||"")}" placeholder="Ex.: material danificado, contaminado, reaproveitável..."></div>
    </div>`;
  row.querySelector(".r-class").value=data.class||"";
  row.querySelector(".remove-residue").onclick=()=>{row.remove(); if(!residues.children.length)$("emptyResidues").classList.remove("hidden");updateMetrics();};
  row.querySelectorAll("input,select").forEach(el=>el.addEventListener("input",updateMetrics));
  residues.appendChild(row); updateMetrics();
}
$("addResidue").onclick=()=>addResidue();

function getResidues(){
  return [...document.querySelectorAll(".residue-row")].map(row=>({
    name:row.querySelector(".r-name").value.trim(),
    category:row.querySelector(".r-category").value.trim(),
    qty:numEl(row.querySelector(".r-qty")),
    weight:numEl(row.querySelector(".r-weight")),
    class:row.querySelector(".r-class").value,
    destination:row.querySelector(".r-destination").value.trim(),
    obs:row.querySelector(".r-obs").value.trim()
  })).filter(r=>r.name||r.category||r.qty!==null||r.weight!==null||r.class||r.destination||r.obs);
}
function numEl(el){const n=parseFloat(el.value);return Number.isFinite(n)?n:null;}

function calculate(){
  const rs=getResidues();
  const totalWeight=rs.reduce((s,r)=>s+(r.weight||0),0);
  const totalQty=rs.reduce((s,r)=>s+(r.qty||0),0);
  const rec=rs.filter(r=>r.class==="Reciclável"), rej=rs.filter(r=>r.class==="Rejeito");
  const rw=rec.reduce((s,r)=>s+(r.weight||0),0), jw=rej.reduce((s,r)=>s+(r.weight||0),0);
  const rq=rec.reduce((s,r)=>s+(r.qty||0),0), jq=rej.reduce((s,r)=>s+(r.qty||0),0);
  const distance=num("distance"), participants=num("participants");
  return {rs,totalWeight,totalQty,rw,jw,rq,jq,distance,participants,
    recWeightPct:pct(rw,totalWeight),rejWeightPct:pct(jw,totalWeight),
    recQtyPct:pct(rq,totalQty),rejQtyPct:pct(jq,totalQty),
    kgKm:distance>0?totalWeight/distance:null,qtyKm:distance>0?totalQty/distance:null,
    kgPerson:participants>0?totalWeight/participants:null,qtyPerson:participants>0?totalQty/participants:null};
}
function updateMetrics(){
  const c=calculate();
  const cards=[
    ["Peso total",c.totalWeight?fmt(c.totalWeight)+" kg":"Não disponível"],
    ["Itens totais",c.totalQty?fmt(c.totalQty,0):"Não disponível"],
    ["Recicláveis",c.rw?fmt(c.rw)+" kg":(c.rq?fmt(c.rq,0)+" itens":"Não disponível")],
    ["Rejeitos",c.jw?fmt(c.jw)+" kg":(c.jq?fmt(c.jq,0)+" itens":"Não disponível")],
    ["Recicláveis por peso",c.recWeightPct!==null?fmt(c.recWeightPct)+"%":"Não disponível"],
    ["Rejeitos por peso",c.rejWeightPct!==null?fmt(c.rejWeightPct)+"%":"Não disponível"],
    ["Recicláveis por quantidade",c.recQtyPct!==null?fmt(c.recQtyPct)+"%":"Não disponível"],
    ["Rejeitos por quantidade",c.rejQtyPct!==null?fmt(c.rejQtyPct)+"%":"Não disponível"],
    ["Peso / km",c.kgKm!==null?fmt(c.kgKm)+" kg/km":"Não disponível"],
    ["Itens / km",c.qtyKm!==null?fmt(c.qtyKm,1)+" itens/km":"Não disponível"],
    ["Peso / participante",c.kgPerson!==null?fmt(c.kgPerson)+" kg":"Não disponível"],
    ["Itens / participante",c.qtyPerson!==null?fmt(c.qtyPerson,1):"Não disponível"]
  ];
  metrics.innerHTML=cards.map(([a,b])=>`<div class="metric"><small>${a}</small><strong>${b}</strong></div>`).join("");
}
form.addEventListener("input",updateMetrics);
updateMetrics();

function textSection(title,text){
  return text?`<h2>${title}</h2><p>${esc(text).replace(/\n/g,"<br>")}</p>`:"";
}
function generateReport(){
  if(!form.reportValidity()){showToast("Preencha os campos obrigatórios.");return;}
  const c=calculate(), rs=c.rs, locationsList=[...document.querySelectorAll(".location-input")].map(x=>x.value.trim()).filter(Boolean);
  const date=val("date")?new Date(val("date")+"T12:00:00").toLocaleDateString("pt-BR"):"";
  const meta=[
    ["Ação",val("actionName")],["Data",date],["Município/UF",`${val("city")}${val("state")?", "+val("state").toUpperCase():""}`],
    ["Local(is)",locationsList.join("; ")],["Ambiente",val("environment")],["Pontos de referência",val("references")],
    ["Horário",val("start")||val("end")?`${val("start")||"não informado"}${val("end")?" às "+val("end"):""}`:""],
    ["Participantes",val("participants")],["Duração",val("duration")],["Extensão",c.distance!==null?fmt(c.distance)+" km":""]
  ].filter(x=>x[1]);
  let html=`<h1>RELATÓRIO TÉCNICO AMBIENTAL</h1><div class="subtitle">${esc(val("actionName"))}</div>
  <h2>1. Identificação da ação</h2><div class="report-meta">${meta.map(x=>`<div><b>${esc(x[0])}:</b> ${esc(String(x[1]))}</div>`).join("")}</div>`;
  html+=textSection("2. Objetivo",val("objective"));
  html+=textSection("3. Metodologia",val("methodology"));
  if(val("collection")||val("sorting")||val("generalObs")){
    html+=`<h2>Metodologia complementar</h2>`+textSection("Coleta",val("collection"))+textSection("Triagem e classificação",val("sorting"))+textSection("Observações gerais",val("generalObs"));
  }
  if(rs.length){
    html+=`<h2>4. Cadastro dos resíduos</h2><table><thead><tr><th>Resíduo</th><th>Categoria</th><th>Itens</th><th>Peso (kg)</th><th>Classificação</th><th>Destinação</th></tr></thead><tbody>`;
    rs.forEach(r=>html+=`<tr><td>${esc(r.name)}</td><td>${esc(r.category)}</td><td>${r.qty!==null?fmt(r.qty,0):""}</td><td>${r.weight!==null?fmt(r.weight,3):""}</td><td>${esc(r.class)}</td><td>${esc(r.destination)}</td></tr>`);
    html+=`</tbody></table>`;
  }
  const hasIndicators=c.totalWeight>0||c.totalQty>0||c.rw>0||c.jw>0;
  if(hasIndicators){
    html+=`<h2>5. Resultados gerais e indicadores</h2><table><thead><tr><th>Indicador</th><th>Resultado</th></tr></thead><tbody>`;
    const rows=[
      ["Peso total",c.totalWeight>0?fmt(c.totalWeight)+" kg":null],["Quantidade total",c.totalQty>0?fmt(c.totalQty,0)+" itens":null],
      ["Peso reciclável",c.rw>0?fmt(c.rw)+" kg":null],["Peso de rejeitos",c.jw>0?fmt(c.jw)+" kg":null],
      ["Quantidade reciclável",c.rq>0?fmt(c.rq,0)+" itens":null],["Quantidade de rejeitos",c.jq>0?fmt(c.jq,0)+" itens":null],
      ["Recicláveis por peso",c.recWeightPct!==null?fmt(c.recWeightPct)+"%":null],["Rejeitos por peso",c.rejWeightPct!==null?fmt(c.rejWeightPct)+"%":null],
      ["Recicláveis por quantidade",c.recQtyPct!==null?fmt(c.recQtyPct)+"%":null],["Rejeitos por quantidade",c.rejQtyPct!==null?fmt(c.rejQtyPct)+"%":null],
      ["Peso por km",c.kgKm!==null?fmt(c.kgKm)+" kg/km":null],["Itens por km",c.qtyKm!==null?fmt(c.qtyKm,1)+" itens/km":null],
      ["Peso por participante",c.kgPerson!==null?fmt(c.kgPerson)+" kg":null],["Itens por participante",c.qtyPerson!==null?fmt(c.qtyPerson,1)+" itens":null]
    ];
    rows.filter(r=>r[1]!==null).forEach(r=>html+=`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`);
    html+=`</tbody></table>`;
  }
  const cats={}; rs.forEach(r=>{const k=r.category||"Não informado";cats[k]=(cats[k]||0)+(r.qty||0)});
  if(Object.keys(cats).length){
    html+=`<h2>6. Composição dos resíduos por quantidade</h2><table><thead><tr><th>Categoria</th><th>Quantidade de itens</th><th>Percentual</th></tr></thead><tbody>`;
    Object.entries(cats).forEach(([k,v])=>html+=`<tr><td>${esc(k)}</td><td>${fmt(v,0)}</td><td>${c.totalQty?fmt(v/c.totalQty*100)+"%":"Não calculado"}</td></tr>`);
    html+=`</tbody></table>`;
  }
  html+=textSection("7. Outros materiais encontrados",val("highlight"));
  html+=textSection("8. Materiais específicos ou de destaque",val("fishing"));
  if(num("cigarettes")!==null) html+=`<h2>9. Bitucas de cigarro</h2><p>${fmt(num("cigarettes"),0)} bitucas, guimbas ou filtros informados no formulário.</p>`;
  html+=textSection("10. Informações adicionais sobre a triagem",val("sortingInfo"));
  const recs=rs.filter(r=>r.class==="Reciclável"&&r.weight!==null).sort((a,b)=>b.weight-a.weight);
  const rejs=rs.filter(r=>r.class==="Rejeito"&&r.weight!==null).sort((a,b)=>b.weight-a.weight);
  if(recs.length) html+=`<h2>11. Análise dos resíduos recicláveis por peso</h2><table><thead><tr><th>Material</th><th>Peso</th><th>Percentual dos recicláveis</th></tr></thead><tbody>${recs.map(r=>`<tr><td>${esc(r.name)}</td><td>${fmt(r.weight)} kg</td><td>${c.rw?fmt(r.weight/c.rw*100)+"%":"Não calculado"}</td></tr>`).join("")}</tbody></table>`;
  if(rejs.length) html+=`<h2>12. Análise dos rejeitos por peso</h2><table><thead><tr><th>Material</th><th>Peso</th><th>Percentual dos rejeitos</th></tr></thead><tbody>${rejs.map(r=>`<tr><td>${esc(r.name)}</td><td>${fmt(r.weight)} kg</td><td>${c.jw?fmt(r.weight/c.jw*100)+"%":"Não calculado"}</td></tr>`).join("")}</tbody></table>`;
  const dest={};rs.filter(r=>r.destination).forEach(r=>dest[r.destination]=(dest[r.destination]||0)+(r.weight||0));
  if(Object.keys(dest).length) html+=`<h2>13. Destinação dos resíduos</h2><table><thead><tr><th>Destinação</th><th>Peso informado (kg)</th></tr></thead><tbody>${Object.entries(dest).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v?fmt(v):"Não informado"}</td></tr>`).join("")}</tbody></table>`;
  let analysis=[];
  if(c.totalWeight>0) analysis.push(`A ação registrou ${fmt(c.totalWeight)} kg de resíduos no conjunto dos registros informados.`);
  if(c.totalQty>0) analysis.push(`Foram contabilizados ${fmt(c.totalQty,0)} itens.`);
  if(c.recWeightPct!==null) analysis.push(`${fmt(c.recWeightPct)}% do peso informado foi classificado como reciclável e ${fmt(c.rejWeightPct)}% como rejeito.`);
  if(c.distance>0&&c.totalWeight>0) analysis.push(`A densidade calculada foi de ${fmt(c.kgKm)} kg por quilômetro atendido.`);
  if(val("highlight")) analysis.push(`Foram registrados como destaque: ${val("highlight")}.`);
  if(val("fishing")) analysis.push(`Foram registradas informações relacionadas à pesca: ${val("fishing")}.`);
  if(analysis.length) html+=`<h2>14. Análise técnica ambiental</h2><div class="analysis">${analysis.map(x=>`<p>${esc(x)}</p>`).join("")}</div>`;
  if(val("recommendations")) html+=textSection("15. Recomendações técnicas",val("recommendations"));
  if(val("destinationObs")) html+=textSection("Observações sobre a destinação",val("destinationObs"));
  if(val("conclusion")) html+=textSection("16. Conclusão",val("conclusion"));
  reportHtml=html;
  $("reportPaper").innerHTML=html;
  $("reportModal").classList.remove("hidden"); $("reportModal").setAttribute("aria-hidden","false");
}
form.addEventListener("submit",e=>{e.preventDefault();generateReport()});
$("editReport").onclick=()=>{$("reportModal").classList.add("hidden");$("reportModal").setAttribute("aria-hidden","true")};
$("printReport").onclick=()=>window.print();
$("newReport").onclick=()=>{if(confirm("Iniciar um novo relatório? Os dados atuais serão apagados.")){form.reset();locations.innerHTML="";addLocation();residues.innerHTML="";$("emptyResidues").classList.remove("hidden");updateMetrics();$("reportModal").classList.add("hidden");window.scrollTo(0,0);}};
$("clearForm").onclick=()=>{if(confirm("Limpar todos os dados do formulário?")){$("newReport").click()}};

async function downloadPDF(){
  if(!window.jspdf){showToast("A biblioteca de PDF não carregou. Use Imprimir / PDF.");return}
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:"mm",format:"a4"});
  const plain=document.createElement("div");plain.innerHTML=reportHtml;
  const title=plain.querySelector("h1")?.textContent||"Relatório Técnico Ambiental";
  doc.setFont("helvetica","bold");doc.setFontSize(16);doc.text(title,105,15,{align:"center"});
  doc.setFont("helvetica","normal");doc.setFontSize(9);
  let y=22;
  [...plain.children].forEach(el=>{
    if(el.tagName==="H1") return;
    if(el.tagName==="H2"){if(y>275){doc.addPage();y=15}doc.setFont("helvetica","bold");doc.setFontSize(12);doc.text(el.textContent,14,y);y+=7;doc.setFont("helvetica","normal");}
    else if(el.tagName==="P"||el.tagName==="DIV"){const t=el.textContent.trim();if(t){const lines=doc.splitTextToSize(t,182);if(y+lines.length*4.5>285){doc.addPage();y=15}doc.setFontSize(9);doc.text(lines,14,y);y+=lines.length*4.5+4;}}
    else if(el.tagName==="TABLE"&&doc.autoTable){const head=[...el.querySelectorAll("thead th")].map(x=>x.textContent);const body=[...el.querySelectorAll("tbody tr")].map(tr=>[...tr.children].map(td=>td.textContent));if(y>260){doc.addPage();y=15}doc.autoTable({startY:y,head:[head],body:body,margin:{left:14,right:14},styles:{fontSize:7},headStyles:{fillColor:[45,105,166]}});y=doc.lastAutoTable.finalY+7;}
    else if(el.tagName==="UL"){const lines=doc.splitTextToSize(el.textContent,182);if(y+lines.length*4.5>285){doc.addPage();y=15}doc.text(lines,14,y);y+=lines.length*4.5+4;}
  });
  doc.save(`${(val("actionName")||"relatorio-ambiental").toLowerCase().replace(/[^a-z0-9]+/gi,"-")}.pdf`);
}
$("downloadPdf").onclick=downloadPDF;
