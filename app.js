// Modular startup for refactored project
import { setupNetwork } from './network.js';
import { setupDocumentToolbar } from './toolbar.js';
import { loadFromStorage, saveToStorage } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
	const { network, nodes, edges } = setupNetwork();
	loadFromStorage(nodes, edges);
	setupDocumentToolbar(network, nodes, edges);
	network.fit();
});