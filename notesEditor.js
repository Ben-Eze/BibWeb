// Notes editor using Toast UI Editor with markdown support
export class NotesEditor {
  constructor() {
    this.editors = new Map(); // nodeId -> editor instance
    this.isToastUIAvailable = typeof toastui !== 'undefined';
    this.autoSaveTimeouts = new Map(); // nodeId -> timeout
  }

  // Create fullscreen editor mode
  createFullscreenEditor(nodeId, nodeData) {
    const container = document.createElement('div');
    container.className = 'fullscreen-editor';
    container.dataset.nodeId = nodeId;

    // Header with title, authors, and close button
    const header = document.createElement('div');
    header.className = 'fullscreen-editor__header';

    const titleSection = document.createElement('div');
    titleSection.className = 'fullscreen-editor__title-section';

    const title = document.createElement('h1');
    title.className = 'fullscreen-editor__title';
    title.textContent = nodeData.title || 'Untitled Document';

    const authors = document.createElement('div');
    authors.className = 'fullscreen-editor__authors';
    authors.textContent = nodeData.authors || '';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'fullscreen-editor__close';
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Close editor';

    const saveIndicator = document.createElement('div');
    saveIndicator.className = 'fullscreen-editor__save-indicator';
    saveIndicator.innerHTML = '✓';
    saveIndicator.title = 'Auto-saved';
    closeBtn.appendChild(saveIndicator);

    titleSection.appendChild(title);
    titleSection.appendChild(authors);
    header.appendChild(titleSection);
    header.appendChild(closeBtn);

    // Main content area with split screen
    const content = document.createElement('div');
    content.className = 'fullscreen-editor__content';

    // Viewer section
    const viewer = document.createElement('div');
    viewer.className = 'fullscreen-editor__viewer';
    
    if (nodeData.link) {
      // Use the same viewer content logic as the regular overlay
      const viewerContent = this.createViewerContent(nodeData);
      viewer.innerHTML = viewerContent;
    } else {
      viewer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">No document to preview</div>';
    }

    // Editor section
    const editorSection = document.createElement('div');
    editorSection.className = 'fullscreen-editor__editor';

    const editorEl = document.createElement('div');
    editorEl.className = 'notes-editor';

    editorSection.appendChild(editorEl);
    content.appendChild(viewer);
    content.appendChild(editorSection);

    container.appendChild(header);
    container.appendChild(content);

    // Event handlers
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exitFullscreenEditor(nodeId);
    });

    // Keyboard shortcuts
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        this.exitFullscreenEditor(nodeId);
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    // Store handler for cleanup
    container.setAttribute('data-keydown-handler', 'true');
    container._keydownHandler = handleKeydown;

    // Initialize editor
    this.initializeEditor(nodeId, editorEl, nodeData.notes || '');

    return container;
  }

  initializeEditor(nodeId, editorEl, initialContent) {
    if (this.isToastUIAvailable && typeof toastui.Editor !== 'undefined') {
      try {
        editorEl.innerHTML = '';
        
        const editor = new toastui.Editor({
          el: editorEl,
          height: '100%',
          width: '100%',
          initialEditType: 'wysiwyg',
          previewStyle: 'tab',
          hideModeSwitch: true,
          usageStatistics: false,
          autofocus: true,
          placeholder: 'Write your notes here...',
          initialValue: initialContent || '',
          toolbarItems: [
            ['heading', 'bold', 'italic'],
            ['hr', 'quote'],
            ['ul', 'ol'],
            ['link', 'image'],
            ['code']
          ],
          hooks: {
            addImageBlobHook: (blob, callback) => {
              const reader = new FileReader();
              reader.onload = () => {
                callback(reader.result, 'pasted image');
              };
              reader.readAsDataURL(blob);
            }
          }
        });
        
        editor.changeMode('wysiwyg', true);
        this.editors.set(nodeId, editor);

        // Set up auto-save
        this.setupAutoSave(nodeId, editor);
        
      } catch (error) {
        console.error('Toast UI Editor failed to initialize:', error);
        this.createFallbackTextarea(editorEl, initialContent, nodeId);
      }
    } else {
      this.createFallbackTextarea(editorEl, initialContent, nodeId);
    }
  }

  setupAutoSave(nodeId, editor) {
    const autoSave = () => {
      const content = editor ? editor.getMarkdown() : '';
      this.updateNodeNotes(nodeId, content);
      
      // Show save indicator
      const indicator = document.querySelector('.fullscreen-editor__save-indicator');
      if (indicator) {
        indicator.classList.add('show');
        setTimeout(() => {
          indicator.classList.remove('show');
        }, 1500); // Show for 1.5 seconds
      }
    };

    // Auto-save on content change with debouncing
    editor.on('change', () => {
      // Clear existing timeout
      if (this.autoSaveTimeouts.has(nodeId)) {
        clearTimeout(this.autoSaveTimeouts.get(nodeId));
      }
      
      // Set new timeout for auto-save
      const timeout = setTimeout(autoSave, 1000); // Save after 1 second of inactivity
      this.autoSaveTimeouts.set(nodeId, timeout);
    });

    // Auto-save on blur (when clicking away)
    editor.on('blur', autoSave);
  }

  enterFullscreenEditor(nodeId, nodeData) {
    // Hide document toolbar
    const toolbar = document.getElementById('documentToolbar');
    if (toolbar) {
      toolbar.classList.add('hidden');
    }

    // Add body class to hide network interaction
    document.body.classList.add('fullscreen-editor-active');

    // Create and append fullscreen editor
    const editor = this.createFullscreenEditor(nodeId, nodeData);
    document.body.appendChild(editor);

    return editor;
  }

  exitFullscreenEditor(nodeId) {
    // Clean up auto-save timeout
    if (this.autoSaveTimeouts.has(nodeId)) {
      clearTimeout(this.autoSaveTimeouts.get(nodeId));
      this.autoSaveTimeouts.delete(nodeId);
    }

    // Final save before exit
    const editor = this.editors.get(nodeId);
    if (editor) {
      const content = editor.getMarkdown();
      this.updateNodeNotes(nodeId, content);
      editor.destroy();
      this.editors.delete(nodeId);
    }

    // Remove fullscreen editor and cleanup keyboard handler
    const editorEl = document.querySelector('.fullscreen-editor');
    if (editorEl) {
      if (editorEl._keydownHandler) {
        document.removeEventListener('keydown', editorEl._keydownHandler);
      }
      editorEl.remove();
    }

    // Show document toolbar
    const toolbar = document.getElementById('documentToolbar');
    if (toolbar) {
      toolbar.classList.remove('hidden');
    }

    // Remove body class to restore network interaction
    document.body.classList.remove('fullscreen-editor-active');
  }

  createNotesContainer(nodeId, initialContent = '', mode = 'preview') {
    const container = document.createElement('div');
    container.className = `notes-container ${mode}-mode`;
    container.dataset.nodeId = nodeId;
    
    // Create view and edit containers
    const viewContainer = document.createElement('div');
    viewContainer.className = 'notes-view';
    viewContainer.style.pointerEvents = 'auto';
    
    const editContainer = document.createElement('div');
    editContainer.className = 'notes-edit hidden';
    editContainer.style.pointerEvents = 'auto';
    
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'notes-edit-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = mode === 'preview' ? 'Edit notes (opens editor)' : 'Edit notes';
    editBtn.style.pointerEvents = 'auto';
    
    // Editor element
    const editorEl = document.createElement('div');
    editorEl.className = 'notes-editor';
    
    // Control buttons for editor
  const controlsEl = document.createElement('div');
  controlsEl.className = 'notes-controls';
    
  const saveBtn = document.createElement('button');
  saveBtn.className = 'notes-save-btn';
  saveBtn.innerHTML = '💾';
  saveBtn.title = 'Save notes';
    
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'notes-cancel-btn';
  cancelBtn.innerHTML = '❌';
  cancelBtn.title = 'Cancel editing';
    
  controlsEl.appendChild(saveBtn);
  controlsEl.appendChild(cancelBtn);
    
    editContainer.appendChild(editorEl);
    editContainer.appendChild(controlsEl);
    
    container.appendChild(viewContainer);
    container.appendChild(editContainer);
    container.appendChild(editBtn);
    
    // Set initial content
    this.updateNotesView(viewContainer, initialContent, mode);
    
    // Event handlers
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mode === 'preview') {
        // Switch to notes mode
        this.switchToNotesMode(nodeId);
      } else {
        // Already in notes mode, start editing
        this.startEditing(nodeId, container, initialContent);
      }
    });
    
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.saveNotes(nodeId, container);
    });
    
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cancelEditing(nodeId, container);
    });
    
    return container;
  }

  updateNotesView(viewContainer, content, mode = 'preview') {
    if (!content || content.trim() === '') {
      const placeholder = 'Click ✏️ to add notes';
      viewContainer.innerHTML = `<div class="notes-placeholder">${placeholder}</div>`;
      return;
    }
    
    // Simple markdown to HTML conversion for display
    const html = this.markdownToHtml(content);
    viewContainer.innerHTML = html;
  }

  switchToNotesMode(nodeId) {
    // This will trigger the fullscreen editor mode
    if (window._switchToNotesMode) {
      window._switchToNotesMode(nodeId);
    }
  }

  switchToPreviewMode(nodeId) {
    // This will be called to switch back to preview mode
    if (window._switchToPreviewMode) {
      window._switchToPreviewMode(nodeId);
    }
  }

  startEditing(nodeId, container, currentContent) {
    const viewContainer = container.querySelector('.notes-view');
    const editContainer = container.querySelector('.notes-edit');
    const editBtn = container.querySelector('.notes-edit-btn');
    const editorEl = container.querySelector('.notes-editor');
    
    // Hide view, show editor
    viewContainer.classList.add('hidden');
    editContainer.classList.remove('hidden');
    editBtn.classList.add('hidden');
    
    // Initialize Toast UI Editor if available
    if (this.isToastUIAvailable && typeof toastui.Editor !== 'undefined') {
      try {
        // Clear the editor element first
        editorEl.innerHTML = '';
        
        const editor = new toastui.Editor({
          el: editorEl,
          height: '100%',
          width: '100%',
          initialEditType: 'wysiwyg',
          previewStyle: 'tab',
          hideModeSwitch: true,
          usageStatistics: false,
          autofocus: true,
          placeholder: 'Write your notes here...',
          initialValue: currentContent || '',
          toolbarItems: [
            ['heading', 'bold', 'italic'],
            ['hr', 'quote'],
            ['ul', 'ol'],
            ['link', 'image'],
            ['code']
          ],
          hooks: {
            addImageBlobHook: (blob, callback) => {
              const reader = new FileReader();
              reader.onload = () => {
                callback(reader.result, 'pasted image');
              };
              reader.readAsDataURL(blob);
            }
          }
        });
        
        // Force WYSIWYG mode; CSS already hides mode switch & markdown UI
        editor.changeMode('wysiwyg', true);
        
        this.editors.set(nodeId, editor);
      } catch (error) {
        console.error('Toast UI Editor failed to initialize:', error);
        this.createFallbackTextarea(editorEl, currentContent);
      }
    } else {
      this.createFallbackTextarea(editorEl, currentContent);
    }
  }

  createFallbackTextarea(editorEl, currentContent, nodeId) {
    const textarea = document.createElement('textarea');
    textarea.className = 'notes-textarea';
    textarea.placeholder = 'Write your notes in markdown...';
    textarea.value = currentContent || '';
    editorEl.innerHTML = '';
    editorEl.appendChild(textarea);

    // Set up auto-save for textarea
    const autoSave = () => {
      this.updateNodeNotes(nodeId, textarea.value);
      
      // Show save indicator
      const indicator = document.querySelector('.fullscreen-editor__save-indicator');
      if (indicator) {
        indicator.classList.add('show');
        setTimeout(() => {
          indicator.classList.remove('show');
        }, 1500);
      }
    };

    let autoSaveTimeout;
    textarea.addEventListener('input', () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
      autoSaveTimeout = setTimeout(autoSave, 1000);
    });

    textarea.addEventListener('blur', autoSave);
  }

  saveNotes(nodeId, container) {
    const editor = this.editors.get(nodeId);
    let content = '';
    
    if (editor) {
      content = editor.getMarkdown();
      editor.destroy();
      this.editors.delete(nodeId);
    } else {
      // Fallback textarea
      const textarea = container.querySelector('.notes-textarea');
      if (textarea) {
        content = textarea.value;
      }
    }
    
    // Update the node data
    this.updateNodeNotes(nodeId, content);
    
    // Check if we're in landscape notes mode - if so, just exit edit mode but stay in notes mode
    const overlay = document.querySelector(`[data-node-id="${nodeId}"]`).closest('.node-overlay');
    if (overlay && overlay.classList.contains('notes-mode')) {
      // Just exit edit mode, stay in notes mode
      this.exitEditMode(container, content);
    } else {
      // Return to view mode and switch back to preview mode
      this.exitEditMode(container, content);
      this.switchToPreviewMode(nodeId);
    }
  }

  cancelEditing(nodeId, container) {
    const editor = this.editors.get(nodeId);
    
    if (editor) {
      editor.destroy();
      this.editors.delete(nodeId);
    }
    
    // Get current content from node data
    const currentContent = this.getNodeNotes(nodeId);
    
    // Check if we're in landscape notes mode
    const overlay = document.querySelector(`[data-node-id="${nodeId}"]`).closest('.node-overlay');
    if (overlay && overlay.classList.contains('notes-mode')) {
      // Just exit edit mode, stay in notes mode
      this.exitEditMode(container, currentContent);
    } else {
      this.exitEditMode(container, currentContent);
      this.switchToPreviewMode(nodeId);
    }
  }

  exitEditMode(container, content) {
    const viewContainer = container.querySelector('.notes-view');
    const editContainer = container.querySelector('.notes-edit');
    const editBtn = container.querySelector('.notes-edit-btn');
    const editorEl = container.querySelector('.notes-editor');
    
    // Clear editor element
    editorEl.innerHTML = '';
    
    // Update view with new content
    this.updateNotesView(viewContainer, content);
    
    // Show view, hide editor
    viewContainer.classList.remove('hidden');
    editContainer.classList.add('hidden');
    editBtn.classList.remove('hidden');
  }

  updateNodeNotes(nodeId, content) {
    // This will be called from the overlay system to update the actual node data
    if (window._updateNodeNotes) {
      window._updateNodeNotes(nodeId, content);
    }
  }

  getNodeNotes(nodeId) {
    // This will be called to get current notes from node data
    if (window._getNodeNotes) {
      return window._getNodeNotes(nodeId);
    }
    return '';
  }

  // Simple markdown to HTML converter (basic implementation)
  markdownToHtml(markdown) {
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      // Code
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      // Images (must come before links)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
      // Line breaks
      .replace(/\n/gim, '<br>');
    
    // Handle bullet points
    html = html.replace(/^[\-\*\+] (.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
    
    // Handle numbered lists
    html = html.replace(/^\d+\. (.*)$/gim, '<li>$1</li>');
    
    return html;
  }

  // Clean up editor instances
  cleanup(nodeId) {
    if (this.autoSaveTimeouts.has(nodeId)) {
      clearTimeout(this.autoSaveTimeouts.get(nodeId));
      this.autoSaveTimeouts.delete(nodeId);
    }
    
    const editor = this.editors.get(nodeId);
    if (editor) {
      editor.destroy();
      this.editors.delete(nodeId);
    }
  }

  // Clean up all editors
  cleanupAll() {
    this.autoSaveTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.autoSaveTimeouts.clear();
    
    this.editors.forEach((editor) => editor.destroy());
    this.editors.clear();
  }

  updateNodeNotes(nodeId, content) {
    // This will be called from the overlay system to update the actual node data
    if (window._updateNodeNotes) {
      window._updateNodeNotes(nodeId, content);
    }
  }

  getNodeNotes(nodeId) {
    // This will be called to get current notes from node data
    if (window._getNodeNotes) {
      return window._getNodeNotes(nodeId);
    }
    return '';
  }

  createViewerContent(node) {
    if (!node.link) {
      return '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">No document link</div>';
    }

    if (node.type === 'video' && this.isYouTubeUrl(node.link)) {
      const videoId = this.extractYouTubeId(node.link);
      if (videoId) {
        return `<iframe 
          src="https://www.youtube.com/embed/${videoId}" 
          width="100%" 
          height="100%" 
          frameborder="0" 
          allowfullscreen>
        </iframe>`;
      }
    } else if (node.type === 'paper' && this.isPdfUrl(node.link)) {
      return `<iframe 
        src="${this.escapeHtml(node.link)}#toolbar=0&navpanes=0&scrollbar=0&view=FitH" 
        width="100%" 
        height="100%" 
        frameborder="0">
      </iframe>`;
    }
    
    // Fallback for other links
    return `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">
      <a href="${this.escapeHtml(node.link)}" target="_blank" rel="noopener noreferrer" style="color: #007acc; text-decoration: none;">
        Open Document: ${this.escapeHtml(node.title || node.link)}
      </a>
    </div>`;
  }

  isYouTubeUrl(url) {
    return /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(url);
  }

  extractYouTubeId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  }

  isPdfUrl(url) {
    return /\.pdf(\?.*)?$/i.test(url) || url.includes('pdf');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
