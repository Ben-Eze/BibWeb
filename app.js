// Minimal distraction-free paper web app using vis-network.
// Features implemented:
// - Add standalone papers
// - Select a paper node and add referenced papers (directed edges)
// - Ensure single instance per paper title (case-insensitive match)
// - Simple floating toolbar off nodes for future expansion
// - LocalStorage persistence, export/import JSON
// - Clean, modular code for easy extension

// ---------- Data stores ----------
const STORAGE_KEY = 'paper-web-data-v1';

let nodes = new vis.DataSet([]);
let edges = new vis.DataSet([]);

function loadFromStorage(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return;
  try{
    const obj = JSON.parse(raw);
    nodes.clear();
    edges.clear();
    if(obj.nodes) nodes.add(obj.nodes);
    if(obj.edges) edges.add(obj.edges);
  }catch(e){
    console.error('Failed to load storage', e);
  }
}

function saveToStorage(){
  const data = {nodes: nodes.get(), edges: edges.get()};
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------- Network setup ----------
const container = document.getElementById('network');
const data = { nodes, edges };
const options = {
  physics: {
    enabled: true,
    stabilization: {iterations: 200},
  },
  nodes: {
    shape: 'box',
    margin: 10,
    widthConstraint: {maximum:200},
    font: {multi: 'html'}
  },
  edges: {
    arrows: {to: {enabled: true, scaleFactor:1}},
    smooth: {enabled:true, type:'cubicBezier'}
  },
  interaction: {hover:true, multiselect:false, navigationButtons:true}
};
const network = new vis.Network(container, data, options);

// ---------- Helpers ----------
function nextId(){
  // generate numeric id not colliding with existing nodes
  let all = nodes.getIds();
  let id = 1;
  while(all.includes(id)) id++;
  return id;
}

function formatLabel(node){
  // label shows title and optional authors (short)
  const authors = node.authors ? `<div style="font-size:12px;color:#444;margin-top:4px">${escapeHtml(node.authors)}</div>` : '';
  return `<div style="font-weight:600">${escapeHtml(node.title)}</div>${authors}`;
}

function escapeHtml(s){ if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

function findNodeByTitle(title){
  if(!title) return null;
  const t = title.trim().toLowerCase();
  if(!t) return null;
  const found = nodes.get().find(n => (n.title||'').trim().toLowerCase() === t);
  return found || null;
}

// ---------- UI actions ----------
const addPaperBtn = document.getElementById('addPaperBtn');
addPaperBtn.addEventListener('click', ()=>{
  const title = prompt('Paper title (required):');
  if(!title || !title.trim()) return;
  const authors = prompt('Authors (optional):') || '';
  addOrGetPaper({title:title.trim(), authors: authors.trim()});
  saveToStorage();
});

function addOrGetPaper({title, authors, notes}){
  const existing = findNodeByTitle(title);
  if(existing){
    // optionally update metadata
    if(authors) existing.authors = authors;
    if(notes) existing.notes = notes;
    nodes.update({...existing, label: formatLabel(existing)});
    return existing;
  }
  const id = nextId();
  const node = {id, title, authors, notes, label: formatLabel({title, authors}), shape:'box'};
  nodes.add(node);
  network.focus(id, {scale:1.2, animation:true});
  return node;
}

// ---------- Node toolbar ----------
const nodeToolbar = document.getElementById('nodeToolbar');
let currentNodeId = null;

network.on('click', params=>{
  if(params.nodes && params.nodes.length === 1){
    const nodeId = params.nodes[0];
    currentNodeId = nodeId;
    showToolbarNearNode(nodeId);
  } else {
    hideToolbar();
    currentNodeId = null;
  }
});

function showToolbarNearNode(nodeId){
  const pos = network.getPositions([nodeId])[nodeId];
  const canvasPos = network.canvasToDOM({x: pos.x, y: pos.y});
  nodeToolbar.style.left = `${canvasPos.x + 16}px`;
  nodeToolbar.style.top = `${canvasPos.y - 10}px`;
  nodeToolbar.classList.remove('hidden');
}

function hideToolbar(){ nodeToolbar.classList.add('hidden'); }

document.addEventListener('click', (e)=>{
  // Hide toolbar when clicking outside network or buttons (handled above separately)
  const isToolbar = nodeToolbar.contains(e.target);
  const isAdd = e.target === addPaperBtn;
  if(!isToolbar && !isAdd){
    // if click inside network, the network's own click handler will set/hide toolbar
    // but clicks elsewhere should hide it
    if(!e.target.closest('#network')) hideToolbar();
  }
});

// toolbar buttons
document.getElementById('addRefBtn').addEventListener('click', ()=>{
  if(!currentNodeId) return;
  const title = prompt('Referenced paper title (required):');
  if(!title || !title.trim()) return;
  const existing = findNodeByTitle(title);
  let target;
  if(existing){
    target = existing;
  } else {
    const authors = prompt('Authors for referenced paper (optional):') || '';
    target = addOrGetPaper({title: title.trim(), authors: authors.trim()});
  }
  // create directed edge from current -> target unless exists
  const existsEdge = edges.get().find(e => e.from === currentNodeId && e.to === target.id);
  if(!existsEdge){
    edges.add({from: currentNodeId, to: target.id});
  } else {
    alert('This reference already exists.');
  }
  saveToStorage();
  hideToolbar();
});

document.getElementById('editBtn').addEventListener('click', ()=>{
  if(!currentNodeId) return;
  const node = nodes.get(currentNodeId);
  const title = prompt('Edit title:', node.title);
  if(!title || !title.trim()) return;
  const authors = prompt('Edit authors:', node.authors || '') || '';
  node.title = title.trim();
  node.authors = authors.trim();
  node.label = formatLabel(node);
  nodes.update(node);
  saveToStorage();
  hideToolbar();
});

document.getElementById('deleteBtn').addEventListener('click', ()=>{
  if(!currentNodeId) return;
  const node = nodes.get(currentNodeId);
  if(!confirm(`Delete "${node.title}"? This removes the node and its edges.`)) return;
  nodes.remove(currentNodeId);
  // edges automatically removed by vis when node removed, but ensure cleanup
  const remEdges = edges.get().filter(e => e.from===currentNodeId || e.to===currentNodeId).map(e=>e.id).filter(Boolean);
  if(remEdges.length) edges.remove(remEdges);
  saveToStorage();
  hideToolbar();
});

// ---------- Export / Import ----------
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const data = {nodes: nodes.get(), edges: edges.get()};
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'paper-web-export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn').addEventListener('click', ()=>{
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (ev)=>{
  const f = ev.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const parsed = JSON.parse(e.target.result);
      if(parsed.nodes) nodes.clear(), nodes.add(parsed.nodes);
      if(parsed.edges) edges.clear(), edges.add(parsed.edges);
      saveToStorage();
    }catch(err){ alert('Invalid JSON'); }
  };
  reader.readAsText(f);
});

// ---------- Startup ----------
loadFromStorage();
// Ensure nodes have label formatted when loaded
nodes.get().forEach(n=>{ if(n.title) nodes.update({...n, label: formatLabel(n)}); });
network.fit();
network.on('afterDrawing', ()=>{});

// expose for dev (optional)
window._paperWeb = {nodes, edges, network, save: saveToStorage, addOrGetPaper};
