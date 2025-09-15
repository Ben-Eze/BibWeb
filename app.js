// Modular startup for refactored project
import { setupNetwork } from './network.js';
import { setupDocumentToolbar } from './toolbar.js';
import { loadFromStorage, saveToStorage } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
  const { network, nodes, edges } = setupNetwork();
  loadFromStorage(nodes, edges);
  // Ensure labels are empty so overlays display the title/author instead of canvas labels
  if (nodes && typeof nodes.get === 'function') {
    const all = nodes.get();
    if (all && all.length) nodes.update(all.map(n => ({ id: n.id, label: '' })));
  }
  setupDocumentToolbar(network, nodes, edges);
  network.fit();
});