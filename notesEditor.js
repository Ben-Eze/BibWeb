// Notes editor using Toast UI Editor with markdown support
export class NotesEditor {
  constructor() {
    this.editors = new Map(); // nodeId -> editor instance
    this.isToastUIAvailable = typeof toastui !== 'undefined';
    this.autoSaveTimeouts = new Map(); // nodeId -> timeout
  }

  // Fix double-escaped backslashes in LaTeX formulas
  // Toast UI Editor in WYSIWYG mode escapes backslashes, so we need to unescape them
  fixLatexBackslashes(content) {
    if (!content) return content;
    
  // Fix backslashes within inline math $...$ (do not consume newlines)
  content = content.replace(/\$([^$\n]+?)\$/g, (match, formula) => {
      // Replace \\ with single \ within the formula
      const fixed = formula.replace(/\\\\/g, '\\');
      return `$${fixed}$`;
    });
    
  // Fix backslashes within display math $$...$$ (multiline-safe)
  content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      // Replace \\ with single \ within the formula
      const fixed = formula.replace(/\\/g, '\\');
      return `$$${fixed}$$`;
    });
    
    return content;
  }

  unescapeMarkdownText(text) {
    if (!text) return text;
    return text.replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, '$1');
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

  // Toolbar row above editor: preview toggle + math button
    const mathToolbar = document.createElement('div');
    mathToolbar.className = 'fullscreen-editor__math-toolbar';
  mathToolbar.style.display = 'flex';
  mathToolbar.style.justifyContent = 'space-between';
  mathToolbar.style.alignItems = 'center';
    
  // Preview toggle
  const previewToggle = document.createElement('button');
  previewToggle.className = 'math-insert-button';
  previewToggle.innerHTML = '👁️ Preview';
  previewToggle.title = 'Toggle preview of rendered notes';
    
  const toolbarLeft = document.createElement('div');
  const toolbarRight = document.createElement('div');
  toolbarLeft.appendChild(previewToggle);
  mathToolbar.appendChild(toolbarLeft);
  mathToolbar.appendChild(toolbarRight);

  // Preview container (re-uses notes view styling/renderer)
  const previewEl = document.createElement('div');
  previewEl.className = 'notes-view';
  previewEl.style.display = 'none'; // hidden by default

  editorSection.appendChild(mathToolbar);
  editorSection.appendChild(editorEl);
  editorSection.appendChild(previewEl);
    content.appendChild(viewer);
    content.appendChild(editorSection);

    container.appendChild(header);
    container.appendChild(content);

    // Event handlers
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exitFullscreenEditor(nodeId);
    });

    // Preview toggle handler
    previewToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const editor = this.editors.get(nodeId);
      if (!editor) return;
      const isPreviewVisible = previewEl.style.display !== 'none';
      if (isPreviewVisible) {
        // Switch to editor
        previewEl.style.display = 'none';
        editorEl.style.display = '';
        // Show math button again in editor mode
        previewToggle.innerHTML = '👁️ Preview';
      } else {
        // Switch to preview
        // Get markdown and fix LaTeX escapes, then render
        let md = editor.getMarkdown();
        md = this.fixLatexBackslashes(md);
        const html = this.markdownToHtml(md);
        previewEl.innerHTML = html;
        previewEl.style.display = '';
        editorEl.style.display = 'none';
        // Hide math insert button in preview mode
        previewToggle.innerHTML = '✏️ Edit';
      }
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

        // Set up auto-save
        this.setupAutoSave(nodeId, editor);

        // Live-update preview if visible
        editor.on('change', () => {
          const previewEl = editorEl.parentElement && editorEl.parentElement.querySelector('.notes-view');
          if (previewEl && previewEl.style.display !== 'none') {
            let md = editor.getMarkdown();
            md = this.fixLatexBackslashes(md);
            previewEl.innerHTML = this.markdownToHtml(md);
          }
        });
        
      } catch (error) {
        console.error('Toast UI Editor failed to initialize:', error);
        this.createFallbackTextarea(editorEl, initialContent, nodeId);
      }
    } else {
      this.createFallbackTextarea(editorEl, initialContent, nodeId);
    }
  }

  testKaTeX() {
    if (typeof katex !== 'undefined') {
      try {
        const testFormula = 'E = mc^2';
        katex.renderToString(testFormula, { displayMode: false });
      } catch (e) {
        console.error('KaTeX test failed:', e);
      }
    } else {
      console.error('KaTeX is not available! Check if the script is loaded correctly.');
    }
  }

  insertMathFormula(nodeId) {
    const editor = this.editors.get(nodeId);
    
    if (editor) {
      // Prompt user for formula
      const formula = prompt('Enter LaTeX math formula:', 'E = mc^2');
      
      if (formula) {
        const mathText = `$${formula}$`;
        
        try {
          // Use the simpler insertText method that should work
          editor.insertText(mathText);
          editor.focus();
        } catch (err) {
          console.error('Error inserting math:', err);
          
          // Fallback: try to access the markdown editor directly
          try {
            // Get markdown content, add formula, and set it back
            const currentContent = editor.getMarkdown();
            const newContent = currentContent + mathText;
            editor.setMarkdown(newContent);
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
      let content = editor ? editor.getMarkdown() : '';
      // Fix escaped backslashes in LaTeX formulas
      content = this.fixLatexBackslashes(content);
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
      let content = editor.getMarkdown();
      // Fix escaped backslashes in LaTeX formulas
      content = this.fixLatexBackslashes(content);
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
        
        // Live-update preview if visible
        editor.on('change', () => {
          const previewEl = editorEl.parentElement && editorEl.parentElement.querySelector('.notes-view');
          if (previewEl && previewEl.style.display !== 'none') {
            let md = editor.getMarkdown();
            md = this.fixLatexBackslashes(md);
            previewEl.innerHTML = this.markdownToHtml(md);
          }
        });
        
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
      // Fix escaped backslashes in LaTeX formulas
      content = this.fixLatexBackslashes(content);
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
        const rawText = headerMatch[2];
        const text = this.unescapeMarkdownText(rawText);
        const marginTop = level === 1 ? '1.5em' : level === 2 ? '1.2em' : '1em';
        const marginBottom = level === 1 ? '0.7em' : level === 2 ? '0.6em' : '0.5em';
        
        processedLines.push(`<h${level} style="margin: ${marginTop} 0 ${marginBottom} 0;">${text}</h${level}>`);
      } else if (bulletMatch) {
        // Close any open paragraph
        if (currentParagraph) {
          const paragraphText = this.unescapeMarkdownText(currentParagraph.trim());
          processedLines.push(`<p style="margin: 0.5em 0;">${paragraphText}</p>`);
          currentParagraph = '';
        }
        
        if (!inList || listType !== 'ul') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ul style="margin: 0.5em 0; padding-left: 2em;">');
          inList = true;
          listType = 'ul';
        }
        const bulletText = this.unescapeMarkdownText(bulletMatch[1]);
        processedLines.push(`<li style="margin: 0.2em 0;">${bulletText}</li>`);
      } else if (numberMatch) {
        // Close any open paragraph
        if (currentParagraph) {
          const paragraphText = this.unescapeMarkdownText(currentParagraph.trim());
          processedLines.push(`<p style="margin: 0.5em 0;">${paragraphText}</p>`);
          currentParagraph = '';
        }
        
        if (!inList || listType !== 'ol') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ol style="margin: 0.5em 0; padding-left: 2em;">');
          inList = true;
          listType = 'ol';
        }
        const numberText = this.unescapeMarkdownText(numberMatch[1]);
        processedLines.push(`<li style="margin: 0.2em 0;">${numberText}</li>`);
      } else if (line === '') {
        // Empty line - end current paragraph if exists
        if (currentParagraph) {
          const paragraphText = this.unescapeMarkdownText(currentParagraph.trim());
          processedLines.push(`<p style="margin: 0.5em 0;">${paragraphText}</p>`);
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
          const paragraphText = this.unescapeMarkdownText(currentParagraph.trim());
          processedLines.push(`<p style="margin: 0.5em 0;">${paragraphText}</p>`);
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
        // Preserve single newlines within a paragraph as <br>
        currentParagraph += (currentParagraph ? '<br>' : '') + line;
      }
    }

    // Close any remaining paragraph or list
    if (currentParagraph) {
      const paragraphText = this.unescapeMarkdownText(currentParagraph.trim());
      processedLines.push(`<p style="margin: 0.5em 0;">${paragraphText}</p>`);
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

    // Check if this is a session asset link (assets/<filename>)
    let actualLink = node.link;
    if (node.link.startsWith('assets/')) {
      const filename = node.link.substring(7); // Remove 'assets/' prefix
      if (typeof window._getSessionAssetBlob === 'function') {
        const blob = window._getSessionAssetBlob(filename);
        if (blob) {
          // Create a Blob URL for this session asset
          actualLink = URL.createObjectURL(blob);
        }
      }
    }

    if (node.type === 'video' && this.isYouTubeUrl(actualLink)) {
      const videoId = this.extractYouTubeId(actualLink);
      if (videoId) {
        return `<iframe 
          src="https://www.youtube.com/embed/${videoId}" 
          width="100%" 
          height="100%" 
          frameborder="0" 
          allowfullscreen>
        </iframe>`;
      }
    } else if ((node.type === 'paper-url' || node.type === 'paper-file' || node.type === 'paper') && this.isPdfUrl(actualLink)) {
      return `<iframe 
        src="${this.escapeHtml(actualLink)}#toolbar=1&navpanes=0&scrollbar=1" 
        width="100%" 
        height="100%" 
        frameborder="0">
      </iframe>`;
    }
    
    // Fallback for other links
    return `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">
      <a href="${this.escapeHtml(actualLink)}" target="_blank" rel="noopener noreferrer" style="color: #007acc; text-decoration: none;">
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
    return /\.pdf(\?.*)?$/i.test(url) || url.includes('pdf') || url.startsWith('blob:');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
