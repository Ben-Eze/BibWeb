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

// Layout options
const layouts = {
  physics: {
    physics: {
      enabled: true,
      stabilization: {iterations: 200},
      repulsion: {
        nodeDistance: 220,
        springLength: 220,
        springConstant: 0.02,
      }
    },
    layout: {},
    nodes: {
      shape: 'box',
      margin: 10,
      widthConstraint: {maximum:220},
      font: {multi: 'html'}
    },
    edges: {
      arrows: {to: {enabled: true, scaleFactor:1}},
      smooth: {enabled:true, type:'cubicBezier'}
    },
    interaction: {hover:true, multiselect:false, navigationButtons:true}
  },
  hierarchicalUD: {
    physics: false,
    layout: {
      hierarchical: {
        direction: 'UD',
        sortMethod: 'directed',
        nodeSpacing: 120,
        levelSeparation: 120,
        treeSpacing: 100,
        blockShifting: false,
        edgeMinimization: false,
      }
    },
    nodes: {
      shape: 'box',
      margin: 10,
      widthConstraint: {maximum:220},
      font: {multi: 'html'}
    },
    edges: {
      arrows: {to: {enabled: true, scaleFactor:1}},
      smooth: {enabled:true, type:'cubicBezier'}
    },
    interaction: {hover:true, multiselect:false, navigationButtons:true}
  },
  hierarchicalLR: {
    physics: false,
    layout: {
      hierarchical: {
        direction: 'LR',
        sortMethod: 'directed',
        nodeSpacing: 120,
        levelSeparation: 120,
        treeSpacing: 100,
        blockShifting: false,
        edgeMinimization: false,
      }
    },
    nodes: {
      shape: 'box',
      margin: 10,
      widthConstraint: {maximum:220},
      font: {multi: 'html'}
    },
    edges: {
      arrows: {to: {enabled: true, scaleFactor:1}},
      smooth: {enabled:true, type:'cubicBezier'}
    },
    interaction: {hover:true, multiselect:false, navigationButtons:true}
  }
};

let currentLayout = 'hierarchicalUD';
const network = new vis.Network(container, data, layouts[currentLayout]);

// Add layout switcher button
let layoutSwitcher = document.getElementById('layoutSwitcher');
if (!layoutSwitcher) {
  layoutSwitcher = document.createElement('div');
  layoutSwitcher.id = 'layoutSwitcher';
  layoutSwitcher.style.margin = '10px 0';
  layoutSwitcher.innerHTML = `
    <button id="switchPhysics">Physics</button>
    <button id="switchHierUD">Hierarchical UD</button>
    <button id="switchHierLR">Hierarchical LR</button>
  `;
  document.getElementById('topbar').prepend(layoutSwitcher);
}

document.getElementById('switchPhysics').onclick = function() {
  currentLayout = 'physics';
  // Remove hierarchical layout forcibly
  network.setOptions({layout: {hierarchical: false}});
  network.setOptions({layout: {}});
  network.setOptions(layouts.physics);
  network.stabilize();
};
document.getElementById('switchHierUD').onclick = function() {
  currentLayout = 'hierarchicalUD';
  network.setOptions(layouts.hierarchicalUD);
};
document.getElementById('switchHierLR').onclick = function() {
  currentLayout = 'hierarchicalLR';
  network.setOptions(layouts.hierarchicalLR);
};

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
  const authors = node.authors ? `\n${escapeHtml(node.authors)}` : '';
  return `${escapeHtml(node.title)}${authors}`;
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

function stripHtmlTags(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '');
}

function addOrGetPaper({title, authors, notes}){
  title = stripHtmlTags(title);
  authors = stripHtmlTags(authors);
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

// ---------- Node & Edge toolbar ----------
const nodeToolbar = document.getElementById('nodeToolbar');
let currentNodeId = null;
let currentEdgeId = null;

// Create edge toolbar
let edgeToolbar = document.getElementById('edgeToolbar');
if (!edgeToolbar) {
  edgeToolbar = document.createElement('div');
  edgeToolbar.id = 'edgeToolbar';
  edgeToolbar.className = 'hidden';
  edgeToolbar.style.position = 'absolute';
  edgeToolbar.style.zIndex = 10;
  edgeToolbar.innerHTML = `
    <button id="labelEdgeBtn" title="Label edge">Label</button>
    <button id="deleteEdgeBtn" title="Delete edge">Delete</button>
  `;
  document.body.appendChild(edgeToolbar);
}

network.on('click', params => {
  if (params.nodes && params.nodes.length === 1) {
    const nodeId = params.nodes[0];
    currentNodeId = nodeId;
    currentEdgeId = null;
    showToolbarNearNode(nodeId);
    hideEdgeToolbar();
  } else if (params.edges && params.edges.length === 1) {
    const edgeId = params.edges[0];
    currentEdgeId = edgeId;
    currentNodeId = null;
    showToolbarNearEdge(edgeId);
    hideToolbar();
  } else {
    hideToolbar();
    hideEdgeToolbar();
    currentNodeId = null;
    currentEdgeId = null;
  }
});

function showToolbarNearNode(nodeId) {
  const pos = network.getPositions([nodeId])[nodeId];
  const canvasPos = network.canvasToDOM({ x: pos.x, y: pos.y });
  nodeToolbar.style.left = `${canvasPos.x + 16}px`;
  nodeToolbar.style.top = `${canvasPos.y - 10}px`;
  nodeToolbar.classList.remove('hidden');
}

function showToolbarNearEdge(edgeId) {
  const edge = edges.get(edgeId);
  if (!edge) return;
  // Get positions of from and to nodes, place toolbar at midpoint
  const fromPos = network.getPositions([edge.from])[edge.from];
  const toPos = network.getPositions([edge.to])[edge.to];
  const midX = (fromPos.x + toPos.x) / 2;
  const midY = (fromPos.y + toPos.y) / 2;
  const canvasPos = network.canvasToDOM({ x: midX, y: midY });
  edgeToolbar.style.left = `${canvasPos.x + 16}px`;
  edgeToolbar.style.top = `${canvasPos.y - 10}px`;
  edgeToolbar.classList.remove('hidden');
}

function hideToolbar() { nodeToolbar.classList.add('hidden'); }
function hideEdgeToolbar() { edgeToolbar.classList.add('hidden'); }

document.addEventListener('click', (e) => {
  // Hide toolbars when clicking outside network or buttons
  const isNodeToolbar = nodeToolbar.contains(e.target);
  const isEdgeToolbar = edgeToolbar.contains(e.target);
  const isAdd = e.target === addPaperBtn;
  if (!isNodeToolbar && !isEdgeToolbar && !isAdd) {
    if (!e.target.closest('#network')) {
      hideToolbar();
      hideEdgeToolbar();
    }
  }
});

// Edge toolbar actions
document.getElementById('labelEdgeBtn').addEventListener('click', () => {
  if (!currentEdgeId) return;
  const label = prompt('Edge label:');
  edges.update({ id: currentEdgeId, label: label || '' });
  hideEdgeToolbar();
});
document.getElementById('deleteEdgeBtn').addEventListener('click', () => {
  if (!currentEdgeId) return;
  if (confirm('Delete this edge?')) {
    edges.remove(currentEdgeId);
    hideEdgeToolbar();
    saveToStorage();
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
