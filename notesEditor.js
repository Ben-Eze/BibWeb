// Notes editor using Toast UI Editor with markdown support
export class NotesEditor {
  constructor() {
    this.editors = new Map(); // nodeId -> editor instance
    this.isToastUIAvailable = typeof toastui !== 'undefined';
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
      const placeholder = mode === 'preview' ? 'No notes' : 'Click ✏️ to add notes';
      viewContainer.innerHTML = `<div class="notes-placeholder">${placeholder}</div>`;
      return;
    }
    
    // Simple markdown to HTML conversion for display
    const html = this.markdownToHtml(content);
    viewContainer.innerHTML = html;
  }

  switchToNotesMode(nodeId) {
    // This will be called to switch the overlay to notes editing mode
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
      const editor = new toastui.Editor({
        el: editorEl,
        height: '150px',
        initialEditType: 'markdown',
        previewStyle: 'tab',
        initialValue: currentContent || '',
        toolbarItems: [
          ['heading', 'bold', 'italic'],
          ['hr', 'quote'],
          ['ul', 'ol', 'task'],
          ['table', 'image', 'link'],
          ['code', 'codeblock']
        ],
        hooks: {
          addImageBlobHook: (blob, callback) => {
            // Handle image paste from clipboard
            const reader = new FileReader();
            reader.onload = () => {
              callback(reader.result, 'pasted image');
            };
            reader.readAsDataURL(blob);
          }
        },
        plugins: [
          // Add LaTeX plugin if available
          ...(typeof toastui.Editor.plugin !== 'undefined' && toastui.Editor.plugin.latex ? [toastui.Editor.plugin.latex] : [])
        ]
      });
      
      this.editors.set(nodeId, editor);
    } else {
      // Fallback to textarea
      editorEl.innerHTML = `<textarea class="notes-textarea" placeholder="Write your notes in markdown...">${currentContent || ''}</textarea>`;
    }
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
    const editor = this.editors.get(nodeId);
    if (editor) {
      editor.destroy();
      this.editors.delete(nodeId);
    }
  }

  // Clean up all editors
  cleanupAll() {
    this.editors.forEach((editor, nodeId) => {
      editor.destroy();
    });
    this.editors.clear();
  }
}
