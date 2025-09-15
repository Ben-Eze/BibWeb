// Handles vis-network setup, node/edge creation, and event handling
// Exports: setupNetwork()
import { setupNodeToolbar } from './nodeToolbar.js';
import { setupEdgeToolbar } from './edgeToolbar.js';

const SELECTED_WIDTH = 400;
const SELECTED_HEIGHT = 120;
const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 30; // vis-network default
const DEFAULT_LENGTH = 400;
const SELECTED_LENGTH = 600;

export function setupNetwork() {
  const nodes = new vis.DataSet([]);
  const edges = new vis.DataSet([]);
  const data = { nodes, edges };
  const container = document.getElementById('network');

  const options = {
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
        widthConstraint: {minimum: DEFAULT_WIDTH, maximum: DEFAULT_WIDTH},
        heightConstraint: {minimum: DEFAULT_HEIGHT},
        font: {multi: 'html'}
      },
      edges: {
        arrows: {to: {enabled: true, scaleFactor:1}},
        smooth: {enabled:true, type:'cubicBezier'}
      },
      interaction: {hover:true, multiselect:false, navigationButtons:true}
    };
    const network = new vis.Network(container, data, options);
    let lastSelectedNodes = [];
    network.on('selectNode', function(params) {
      lastSelectedNodes = params.nodes.slice();
      params.nodes.forEach(nodeId => {
        nodes.update({
      id: nodeId,
      widthConstraint: {minimum: SELECTED_WIDTH, maximum: SELECTED_WIDTH},
      heightConstraint: {minimum: SELECTED_HEIGHT},
      font: {size: 16}
        });
        // Update connected edges to be longer
        edges.get().forEach(edge => {
          if (edge.from === nodeId || edge.to === nodeId) {
            edges.update({id: edge.id, length: SELECTED_LENGTH});
          }
        });
      });
    });
    network.on('deselectNode', function(params) {
      lastSelectedNodes.forEach(nodeId => {
        nodes.update({
        id: nodeId,
        widthConstraint: {minimum: DEFAULT_WIDTH, maximum: DEFAULT_WIDTH},
        heightConstraint: {minimum: DEFAULT_HEIGHT},
        font: {size: 16}
        });
        // Restore connected edges to default length
        edges.get().forEach(edge => {
          if (edge.from === nodeId || edge.to === nodeId) {
            edges.update({id: edge.id, length: DEFAULT_LENGTH});
          }
        });
      });
      lastSelectedNodes = [];
    });
  
  function addOrGetPaper({title, authors, notes}){
    // Remove HTML tags
    const stripHtmlTags = str => (!str ? '' : str.replace(/<[^>]*>/g, ''));
    title = stripHtmlTags(title);
    authors = stripHtmlTags(authors);
    // Find node by title
    const findNodeByTitle = title => {
      if(!title) return null;
      const t = title.trim().toLowerCase();
      if(!t) return null;
      const found = nodes.get().find(n => (n.title||'').trim().toLowerCase() === t);
      return found || null;
    };
    const existing = findNodeByTitle(title);
    if(existing){
      // optionally update metadata
      if(authors) existing.authors = authors;
      if(notes) existing.notes = notes;
      const escapeHtml = s => (!s ? '' : s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'));
      const formatLabel = node => {
        const authors = node.authors ? `\n${escapeHtml(node.authors)}` : '';
        return `${escapeHtml(node.title)}${authors}`;
      };
      nodes.update({...existing, label: formatLabel(existing)});
      return existing;
    }
    // Generate next id
    const nextId = () => {
      let all = nodes.getIds();
      let id = 1;
      while(all.includes(id)) id++;
      return id;
    };
    const escapeHtml = s => (!s ? '' : s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'));
    const formatLabel = node => {
      const authors = node.authors ? `\n${escapeHtml(node.authors)}` : '';
      return `${escapeHtml(node.title)}${authors}`;
    };
    const id = nextId();
    const node = {id, title, authors, notes, label: formatLabel({title, authors}), shape:'box'};
    nodes.add(node);
    network.focus(id, {scale:1.2, animation:true});
    return node;
  }

  function saveToStorage(){
    const data = {nodes: nodes.get(), edges: edges.get()};
    localStorage.setItem('paper-web-data-v1', JSON.stringify(data));
  }

  // Expose for toolbar.js
  window._addOrGetPaper = addOrGetPaper;
  window._saveToStorage = saveToStorage;

  setupNodeToolbar(network, nodes, edges);
  setupEdgeToolbar(network, nodes, edges);

  return { network, nodes, edges };
}
