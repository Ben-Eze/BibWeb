// Modular startup for refactored project
import { setupNetwork } from './network.js';
import { setupDocumentToolbar } from './toolbar.js';
import { loadFromStorage, saveToStorage } from './storage.js';
import { setupPaperForm } from './paperForm.js';
import './errorNotifications.js'; // Enable error notifications

// Global flag to indicate modules loaded successfully
window.setupNetwork = setupNetwork;

document.addEventListener('DOMContentLoaded', async () => {
  const { network, nodes, edges, NOTES_MODE } = setupNetwork();
  setupPaperForm();
  await setupDocumentToolbar(network, nodes, edges); // Setup toolbar BEFORE loading storage (now async for IndexedDB)
  loadFromStorage(nodes, edges, network);
  // Ensure labels are empty so overlays display the title/author instead of canvas labels
  if (nodes && typeof nodes.get === 'function') {
    const all = nodes.get();
    if (all && all.length) nodes.update(all.map(n => ({ id: n.id, label: '' })));
  }
  // Make NOTES_MODE available globally for nodeOverlays
  window._NOTES_MODE = NOTES_MODE;
  network.fit();
});