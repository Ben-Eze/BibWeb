// Handles localStorage, import/export logic
// Exports: loadFromStorage(nodes, edges), saveToStorage(nodes, edges)
const STORAGE_KEY = 'paper-web-data-v1';

export function loadFromStorage(nodes, edges){
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

export function saveToStorage(nodes, edges){
  const data = {nodes: nodes.get(), edges: edges.get()};
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
