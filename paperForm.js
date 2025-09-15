// Handles the paper form modal
// Exports: showPaperForm(mode, nodeData, callback)

export function setupPaperForm() {
  const modal = document.getElementById('paperFormModal');
  const form = document.getElementById('paperForm');
  const modalTitle = document.getElementById('modalTitle');
  const closeBtn = modal.querySelector('.modal-close');
  const cancelBtn = modal.querySelector('.btn-cancel');
  
  let currentCallback = null;
  let currentMode = 'add'; // 'add' or 'edit'

  function showForm(mode, nodeData = {}, callback) {
    currentCallback = callback;
    currentMode = mode;
    
    // Set modal title
    modalTitle.textContent = mode === 'edit' ? 'Edit Paper' : 'Add Paper';
    
    // Populate form fields
    document.getElementById('paperTitle').value = nodeData.title || '';
    document.getElementById('paperNickname').value = nodeData.nickname || '';
    document.getElementById('paperAuthor').value = nodeData.authors || '';
    document.getElementById('paperDOI').value = nodeData.doi || '';
    document.getElementById('paperLink').value = nodeData.link || '';
    
    // Show modal
    modal.classList.remove('hidden');
    document.getElementById('paperTitle').focus();
  }

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
      link: document.getElementById('paperLink').value.trim()
    };
    
    if (!formData.title) {
      alert('Title is required');
      return;
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
