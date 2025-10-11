// Handles the paper form modal
// Exports: showPaperForm(mode, nodeData, callback)

export function setupPaperForm() {
  const modal = document.getElementById('paperFormModal');
  const form = document.getElementById('paperForm');
  const modalTitle = document.getElementById('modalTitle');
  const closeBtn = modal.querySelector('.modal-close');
  const cancelBtn = modal.querySelector('.btn-cancel');
  const typePaperUrlBtn = document.getElementById('typePaperUrl');
  const typePaperFileBtn = document.getElementById('typePaperFile');
  const typeVideoBtn = document.getElementById('typeVideo');
  const linkLabel = document.getElementById('linkLabel');
  const linkInput = document.getElementById('paperLink');
  const fileInput = document.getElementById('paperFile');
  
  let currentCallback = null;
  let currentMode = 'add'; // 'add' or 'edit'
  let currentType = 'paper-url'; // 'paper-url', 'paper-file', or 'video'

  function updateLinkField() {
    if (currentType === 'paper-url') {
      linkLabel.textContent = 'PDF URL';
      linkInput.placeholder = 'https://example.com/paper.pdf';
      linkInput.style.display = '';
      fileInput.style.display = 'none';
      typePaperUrlBtn.classList.add('active');
      typePaperFileBtn.classList.remove('active');
      typeVideoBtn.classList.remove('active');
    } else if (currentType === 'paper-file') {
      linkLabel.textContent = 'PDF File';
      linkInput.style.display = 'none';
      fileInput.style.display = '';
      typePaperUrlBtn.classList.remove('active');
      typePaperFileBtn.classList.add('active');
      typeVideoBtn.classList.remove('active');
    } else {
      linkLabel.textContent = 'YouTube URL';
      linkInput.placeholder = 'https://youtube.com/watch?v=...';
      linkInput.style.display = '';
      fileInput.style.display = 'none';
      typeVideoBtn.classList.add('active');
      typePaperUrlBtn.classList.remove('active');
      typePaperFileBtn.classList.remove('active');
    }
  }

  function showForm(mode, nodeData = {}, callback) {
    currentCallback = callback;
    currentMode = mode;
    
    // Set modal title
    modalTitle.textContent = mode === 'edit' ? 'Edit Paper' : 'Add Paper';
    
    // Determine type from existing data or default to paper-url
    if (nodeData.type === 'video') {
      currentType = 'video';
    } else if (nodeData.type === 'paper-file') {
      currentType = 'paper-file';
    } else {
      currentType = 'paper-url';
    }
    updateLinkField();
    
    // Populate form fields
    document.getElementById('paperTitle').value = nodeData.title || '';
    document.getElementById('paperNickname').value = nodeData.nickname || '';
    document.getElementById('paperAuthor').value = nodeData.authors || '';
    document.getElementById('paperDOI').value = nodeData.doi || '';
    document.getElementById('paperLink').value = nodeData.link || '';
    document.getElementById('paperNotes').value = nodeData.notes || '';
    
    // Show modal
    modal.classList.remove('hidden');
    document.getElementById('paperTitle').focus();
  }

  // Suggestion dropdown for session assets (if available)
  const suggestionBox = document.createElement('div');
  suggestionBox.style.position = 'absolute';
  suggestionBox.style.background = 'white';
  suggestionBox.style.border = '1px solid #ccc';
  suggestionBox.style.display = 'none';
  suggestionBox.style.zIndex = 2000;
  suggestionBox.style.maxHeight = '200px';
  suggestionBox.style.overflow = 'auto';
  document.body.appendChild(suggestionBox);

  function positionSuggestionBox() {
    const rect = linkInput.getBoundingClientRect();
    suggestionBox.style.left = `${rect.left}px`;
    suggestionBox.style.top = `${rect.bottom + window.scrollY}px`;
    suggestionBox.style.width = `${rect.width}px`;
  }

  linkInput.addEventListener('focus', () => {
    // Attempt to get session assets map from toolbar
    if (typeof window._getSessionAssets === 'function') {
      const assets = window._getSessionAssets(); // returns array of filenames
      if (assets && assets.length) {
        suggestionBox.innerHTML = '';
        assets.forEach(name => {
          const item = document.createElement('div');
          item.textContent = name;
          item.style.padding = '6px 8px';
          item.style.cursor = 'pointer';
          item.addEventListener('click', () => {
            // Use a relative assets/ path; caller should resolve asset map when rendering
            linkInput.value = `assets/${name}`;
            suggestionBox.style.display = 'none';
            linkInput.focus();
          });
          suggestionBox.appendChild(item);
        });
        positionSuggestionBox();
        suggestionBox.style.display = 'block';
      }
    }
  });

  linkInput.addEventListener('blur', () => {
    setTimeout(() => { suggestionBox.style.display = 'none'; }, 150);
  });

  function hideForm() {
    modal.classList.add('hidden');
    form.reset();
    currentCallback = null;
  }

  function handleSubmit(e) {
    e.preventDefault();
    
    const formData = {
      title: document.getElementById('paperTitle').value.trim(),
      nickname: document.getElementById('paperNickname').value.trim(),
      authors: document.getElementById('paperAuthor').value.trim(),
      doi: document.getElementById('paperDOI').value.trim(),
      notes: document.getElementById('paperNotes').value.trim(),
      type: currentType
    };
    
    if (!formData.title) {
      alert('Title is required');
      return;
    }
    
    // Handle link based on type
    if (currentType === 'paper-file') {
      const file = fileInput.files[0];
      if (file) {
        // Register the file as a session asset (async)
        if (typeof window._registerSessionAsset === 'function') {
          // Since _registerSessionAsset is now async, we need to handle it
          window._registerSessionAsset(file).then(assetName => {
            formData.link = `assets/${assetName}`;
            
            if (currentCallback) {
              currentCallback(formData);
            }
            
            hideForm();
          }).catch(err => {
            console.error('Failed to register asset:', err);
            alert('Failed to register PDF file. Please try again.');
          });
          return; // Exit early, callback will be called after asset is registered
        } else {
          alert('Asset registration not available. Please reload the page.');
          return;
        }
      } else {
        formData.link = ''; // No file selected
      }
    } else {
      formData.link = document.getElementById('paperLink').value.trim();
    }
    
    if (currentCallback) {
      currentCallback(formData);
    }
    
    hideForm();
  }

  // Event listeners
  form.addEventListener('submit', handleSubmit);
  closeBtn.addEventListener('click', hideForm);
  cancelBtn.addEventListener('click', hideForm);
  
  // Type switch buttons
  typePaperUrlBtn.addEventListener('click', () => {
    currentType = 'paper-url';
    updateLinkField();
  });
  
  typePaperFileBtn.addEventListener('click', () => {
    currentType = 'paper-file';
    updateLinkField();
  });
  
  typeVideoBtn.addEventListener('click', () => {
    currentType = 'video';
    updateLinkField();
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideForm();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      hideForm();
    }
  });

  // Expose globally
  window._showPaperForm = showForm;
}
