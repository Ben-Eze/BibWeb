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

    // Math button below editor
    const mathToolbar = document.createElement('div');
    mathToolbar.className = 'fullscreen-editor__math-toolbar';
    
    const mathButton = document.createElement('button');
    mathButton.className = 'math-insert-button';
    mathButton.innerHTML = '∑ Equation';
    mathButton.title = 'Insert LaTeX math formula';
    
    mathToolbar.appendChild(mathButton);

    editorSection.appendChild(editorEl);
    editorSection.appendChild(mathToolbar);
    content.appendChild(viewer);
    content.appendChild(editorSection);

    container.appendChild(header);
    container.appendChild(content);

    // Event handlers
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exitFullscreenEditor(nodeId);
    });

    // Math button handler
    mathButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.insertMathFormula(nodeId);
    });

    // Test KaTeX availability on page load
    this.testKaTeX();

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
            ['ul', 'ol'],
            ['link', 'image'],
            ['code', 'codeblock']
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

        // Debug: Log available methods
        console.log('Editor methods:', Object.getOwnPropertyNames(editor));
        console.log('Editor prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(editor)));

        // Set up math button functionality
        this.setupMathButton(editor);

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

  setupMathButton(editor) {
    console.log('setupMathButton called', editor);
    
    // Since we're adding the math button outside the Toast UI toolbar,
    // we don't need to modify the toolbar here anymore
    console.log('Math button is already added to the custom toolbar above the editor');
  }

  testKaTeX() {
    console.log('Testing KaTeX availability...');
    if (typeof katex !== 'undefined') {
      console.log('KaTeX is available, version:', katex.version || 'unknown');
      try {
        const testFormula = 'E = mc^2';
        const rendered = katex.renderToString(testFormula, { displayMode: false });
        console.log('KaTeX test successful, rendered:', rendered);
      } catch (e) {
        console.error('KaTeX test failed:', e);
      }
    } else {
      console.error('KaTeX is not available! Check if the script is loaded correctly.');
    }
  }

  insertMathFormula(nodeId) {
    console.log('insertMathFormula called for nodeId:', nodeId);
    const editor = this.editors.get(nodeId);
    console.log('Editor found:', !!editor);
    
    if (editor) {
      // Prompt user for formula
      const formula = prompt('Enter LaTeX math formula:', 'E = mc^2');
      console.log('User entered formula:', formula);
      
      if (formula) {
        const mathText = `$${formula}$`;
        console.log('Inserting math text:', mathText);
        
        try {
          // Use the simpler insertText method that should work
          editor.insertText(mathText);
          console.log('Inserted text successfully');
          editor.focus();
        } catch (err) {
          console.error('Error inserting math:', err);
          
          // Fallback: try to access the markdown editor directly
          try {
            // Get markdown content, add formula, and set it back
            const currentContent = editor.getMarkdown();
            const newContent = currentContent + mathText;
            editor.setMarkdown(newContent);
            console.log('Fallback: Added to end of content');
          } catch (fallbackErr) {
            console.error('Fallback insertion failed:', fallbackErr);
            
            // Last resort: direct DOM manipulation
            try {
              const editorElement = document.querySelector('.fullscreen-editor .toastui-editor');
              if (editorElement) {
                // Try to find any textarea or contenteditable element
                const textInput = editorElement.querySelector('textarea, [contenteditable="true"]');
                if (textInput) {
                  if (textInput.tagName === 'TEXTAREA') {
                    textInput.value += mathText;
                  } else {
                    textInput.innerHTML += mathText;
                  }
                  console.log('DOM manipulation successful');
                } else {
                  console.error('Could not find text input element');
                }
              }
            } catch (domErr) {
              console.error('DOM manipulation failed:', domErr);
              alert(`Could not insert formula. Please manually type: ${mathText}`);
            }
          }
        }
      }
    } else {
      console.error('No editor found for nodeId:', nodeId);
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
            ['ul', 'ol'],
            ['link', 'image'],
            ['code', 'codeblock']
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
        
        // Set up math button functionality
        this.setupMathButton(editor);
        
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
    let html = markdown;
    
    // Handle LaTeX math (inline and display) - must come first to avoid conflicts
    if (typeof katex !== 'undefined') {
      // Display math ($$...$$)
      html = html.replace(/\$\$([\s\S]*?)\$\$/gm, (match, formula) => {
        try {
          return katex.renderToString(formula.trim(), { displayMode: true });
        } catch (e) {
          return `<span style="color: red;">Math Error: ${formula}</span>`;
        }
      });
      
      // Inline math ($...$)
      html = html.replace(/\$([^$\n]+?)\$/g, (match, formula) => {
        try {
          return katex.renderToString(formula.trim(), { displayMode: false });
        } catch (e) {
          return `<span style="color: red;">Math Error: ${formula}</span>`;
        }
      });
    }
    
    // Process formatting (but keep line breaks as-is for now)
    html = html
      // Bold and italic (handle nested formatting)
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Code blocks (handle multi-line)
      .replace(/```[\s\S]*?```/gim, (match) => {
        const content = match.replace(/```/g, '').trim();
        return `<pre style="background: #f4f4f4; padding: 1em; border-radius: 4px; overflow-x: auto; margin: 1em 0;"><code>${content}</code></pre>`;
      })
      // Inline code
      .replace(/`(.*?)`/gim, '<code style="background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace;">$1</code>')
      // Images (must come before links)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 0.5em 0;">')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" style="color: #007acc; text-decoration: none;">$1</a>');

    // Handle lists and paragraphs properly using original line structure (before formatting)
    const lines = html.split('\n');
    let processedLines = [];
    let inList = false;
    let listType = '';
    let currentParagraph = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for markdown headers first (before any processing)
      const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
      
      // Check for bullet points
      const bulletMatch = line.match(/^[\-\*\+]\s+(.*)$/);
      const numberMatch = line.match(/^\d+\.\s+(.*)$/);
      
      if (headerMatch) {
        // Header found - close paragraph and list, add header
        if (currentParagraph) {
          processedLines.push(`<p style="margin: 0.5em 0;">${currentParagraph.trim()}</p>`);
          currentParagraph = '';
        }
        if (inList) {
          processedLines.push(`</${listType}>`);
          inList = false;
          listType = '';
        }
        
        // Convert markdown header to HTML
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        const marginTop = level === 1 ? '1.5em' : level === 2 ? '1.2em' : '1em';
        const marginBottom = level === 1 ? '0.7em' : level === 2 ? '0.6em' : '0.5em';
        
        processedLines.push(`<h${level} style="margin: ${marginTop} 0 ${marginBottom} 0;">${text}</h${level}>`);
      } else if (bulletMatch) {
        // Close any open paragraph
        if (currentParagraph) {
          processedLines.push(`<p style="margin: 0.5em 0;">${currentParagraph.trim()}</p>`);
          currentParagraph = '';
        }
        
        if (!inList || listType !== 'ul') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ul style="margin: 0.5em 0; padding-left: 2em;">');
          inList = true;
          listType = 'ul';
        }
        processedLines.push(`<li style="margin: 0.2em 0;">${bulletMatch[1]}</li>`);
      } else if (numberMatch) {
        // Close any open paragraph
        if (currentParagraph) {
          processedLines.push(`<p style="margin: 0.5em 0;">${currentParagraph.trim()}</p>`);
          currentParagraph = '';
        }
        
        if (!inList || listType !== 'ol') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ol style="margin: 0.5em 0; padding-left: 2em;">');
          inList = true;
          listType = 'ol';
        }
        processedLines.push(`<li style="margin: 0.2em 0;">${numberMatch[1]}</li>`);
      } else if (line === '') {
        // Empty line - end current paragraph if exists
        if (currentParagraph) {
          processedLines.push(`<p style="margin: 0.5em 0;">${currentParagraph.trim()}</p>`);
          currentParagraph = '';
        }
        // Close any open list
        if (inList) {
          processedLines.push(`</${listType}>`);
          inList = false;
          listType = '';
        }
      } else if (line.match(/^```/) || line.includes('```')) {
        // Code block - close paragraph and list, add code block as-is
        if (currentParagraph) {
          processedLines.push(`<p style="margin: 0.5em 0;">${currentParagraph.trim()}</p>`);
          currentParagraph = '';
        }
        if (inList) {
          processedLines.push(`</${listType}>`);
          inList = false;
          listType = '';
        }
        processedLines.push(line);
      } else {
        // Regular text line
        if (inList) {
          processedLines.push(`</${listType}>`);
          inList = false;
          listType = '';
        }
        
        // Add to current paragraph
        if (currentParagraph) {
          currentParagraph += ' ' + line;
        } else {
          currentParagraph = line;
        }
      }
    }
    
    // Close any remaining paragraph or list
    if (currentParagraph) {
      processedLines.push(`<p style="margin: 0.5em 0;">${currentParagraph.trim()}</p>`);
    }
    if (inList) {
      processedLines.push(`</${listType}>`);
    }
    
    html = processedLines.join('');

    // Now apply other formatting to the structured HTML
    html = html
      // Bold and italic (handle nested formatting)
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Code blocks (handle multi-line)
      .replace(/```[\s\S]*?```/gim, (match) => {
        const content = match.replace(/```/g, '').trim();
        return `<pre style="background: #f4f4f4; padding: 1em; border-radius: 4px; overflow-x: auto; margin: 1em 0;"><code>${content}</code></pre>`;
      })
      // Inline code
      .replace(/`(.*?)`/gim, '<code style="background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace;">$1</code>')
      // Images (must come before links)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 0.5em 0;">')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" style="color: #007acc; text-decoration: none;">$1</a>');
    
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
