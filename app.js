// Modular startup for refactored project
import { setupNetwork } from './network.js';
import { setupDocumentToolbar } from './toolbar.js';
import { loadFromStorage, saveToStorage } from './storage.js';
import { setupPaperForm } from './paperForm.js';
import './errorNotifications.js'; // Enable error notifications

document.addEventListener('DOMContentLoaded', () => {
  const { network, nodes, edges, NOTES_MODE } = setupNetwork();
  loadFromStorage(nodes, edges, network);
  // Ensure labels are empty so overlays display the title/author instead of canvas labels
  if (nodes && typeof nodes.get === 'function') {
    const all = nodes.get();
    if (all && all.length) nodes.update(all.map(n => ({ id: n.id, label: '' })));
  }
  setupPaperForm();
  setupDocumentToolbar(network, nodes, edges);
  // Make NOTES_MODE available globally for nodeOverlays
  window._NOTES_MODE = NOTES_MODE;
  network.fit();
});