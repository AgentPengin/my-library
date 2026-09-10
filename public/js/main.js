/**
 * ALEXANDRIA ARCHIVE - CLIENT-SIDE SCRIPT
 * Xử lý tương tác UI, modal và filter client-side trước khi ghép backend hoàn chỉnh
 */

document.addEventListener('DOMContentLoaded', () => {
  // Modal handlers
  const modalOverlay = document.getElementById('shelfModal');
  const openModalBtns = document.querySelectorAll('.js-open-shelf-modal');
  const closeModalBtns = document.querySelectorAll('.js-close-modal');

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const mediaId = btn.getAttribute('data-media-id');
      const mediaTitle = btn.getAttribute('data-media-title');
      
      const modalTitleEl = document.getElementById('modalMediaTitle');
      const modalInputId = document.getElementById('modalMediaId');
      
      if (modalTitleEl && mediaTitle) modalTitleEl.textContent = mediaTitle;
      if (modalInputId && mediaId) modalInputId.value = mediaId;
      
      if (modalOverlay) modalOverlay.classList.add('active');
    });
  });

  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modalOverlay) modalOverlay.classList.remove('active');
    });
  });

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    });
  }

  // Filter tabs for items on shelves / home
  window.filterMedia = function(type, buttonEl) {
    const tabs = document.querySelectorAll('.segmented-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (buttonEl) buttonEl.classList.add('active');

    const items = document.querySelectorAll('.book-item');
    items.forEach(item => {
      const mediaType = item.getAttribute('data-type');
      if (type === 'ALL' || mediaType === type) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  };
});
