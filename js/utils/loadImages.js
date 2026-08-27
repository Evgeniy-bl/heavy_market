export class ImageUploader {
  constructor({
    gridId,
    inputId,
    addMoreId = null,
    maxFiles = 8,
    minSlots = 6,
    basePath = '../'
  }) {
    this.grid = document.getElementById(gridId);
    this.input = document.getElementById(inputId);
    this.addMoreBtn = addMoreId ? document.getElementById(addMoreId) : null;
    this.maxFiles = maxFiles;
    this.minSlots = minSlots;
    this.basePath = basePath;
    this.files = [];
    this.existing = [];
    this.objectUrls = [];
    this.root = this.grid?.closest('.image-uploader') || this.grid;
    this.errorEl = document.querySelector('[data-error-for="images"]');

    if (!this.grid || !this.input) {
      throw new Error('ImageUploader: grid and input elements are required');
    }

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      this.grid.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    });

    this.grid.addEventListener('dragover', () => {
      this.grid.classList.add('image-uploader__grid--active');
    });

    this.grid.addEventListener('dragleave', () => {
      this.grid.classList.remove('image-uploader__grid--active');
    });

    this.grid.addEventListener('drop', (event) => {
      this.grid.classList.remove('image-uploader__grid--active');
      this.addFiles([...(event.dataTransfer?.files || [])]);
    });

    this.grid.addEventListener('click', (event) => {
      const removeNew = event.target.closest('[data-remove-image]');
      const removeExisting = event.target.closest('[data-remove-existing]');
      const emptySlot = event.target.closest('[data-add-slot]');

      if (removeNew) {
        event.preventDefault();
        this.removeFile(Number(removeNew.dataset.removeImage));
        return;
      }

      if (removeExisting) {
        event.preventDefault();
        this.removeExisting(Number(removeExisting.dataset.removeExisting));
        return;
      }

      if (emptySlot) {
        event.preventDefault();
        this.openPicker();
      }
    });

    this.addMoreBtn?.addEventListener('click', () => this.openPicker());

    this.input.addEventListener('change', () => {
      this.addFiles([...(this.input.files || [])]);
      this.input.value = '';
    });
  }

  openPicker() {
    if (this.totalCount() >= this.maxFiles) return;
    this.input.click();
  }

  setExistingImages(paths = []) {
    this.existing = paths.filter(Boolean).map(String).slice(0, this.maxFiles);
    this.render();
  }

  getExistingImages() {
    return [...this.existing];
  }

  totalCount() {
    return this.existing.length + this.files.length;
  }

  addFiles(fileList) {
    const imageFiles = fileList.filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) return;

    const availableSlots = this.maxFiles - this.totalCount();
    const filesToAdd = imageFiles.slice(0, Math.max(0, availableSlots));
    filesToAdd.forEach((file) => this.files.push(file));
    this.clearError();
    this.render();
  }

  removeFile(index) {
    if (index < 0 || index >= this.files.length) return;
    this.files.splice(index, 1);
    this.render();
  }

  removeExisting(index) {
    if (index < 0 || index >= this.existing.length) return;
    this.existing.splice(index, 1);
    this.render();
  }

  assetUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('../') || path.startsWith('/')) {
      return path;
    }
    return `${this.basePath}${path}`;
  }

  slotCount() {
    if (this.totalCount() >= this.maxFiles) return this.maxFiles;
    return Math.min(this.maxFiles, Math.max(this.minSlots, this.totalCount() + 1));
  }

  render() {
    this.revokeObjectUrls();

    const parts = [];

    this.existing.forEach((path, index) => {
      parts.push(`
        <article class="image-uploader__slot image-uploader__slot--filled">
          <img class="image-uploader__preview" src="${this.assetUrl(path)}" alt="">
          <button class="image-uploader__remove" type="button" data-remove-existing="${index}" aria-label="Удалить">×</button>
        </article>
      `);
    });

    this.files.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      this.objectUrls.push(url);
      parts.push(`
        <article class="image-uploader__slot image-uploader__slot--filled">
          <img class="image-uploader__preview" src="${url}" alt="${file.name}">
          <button class="image-uploader__remove" type="button" data-remove-image="${index}" aria-label="Удалить">×</button>
        </article>
      `);
    });

    const emptyNeeded = this.slotCount() - parts.length;
    for (let i = 0; i < emptyNeeded; i += 1) {
      parts.push(`
        <button
          type="button"
          class="image-uploader__slot image-uploader__slot--empty"
          data-add-slot
          aria-label="Добавить фото"
        ><span class="image-uploader__plus" aria-hidden="true">+</span></button>
      `);
    }

    this.grid.innerHTML = parts.join('');

    if (this.addMoreBtn) {
      this.addMoreBtn.hidden = this.totalCount() >= this.maxFiles;
    }
  }

  getSelectedFiles() {
    return [...this.files];
  }

  hasImages() {
    return this.totalCount() > 0;
  }

  setError(message) {
    if (this.errorEl) this.errorEl.textContent = message || '';
    this.root?.classList.toggle('image-uploader--invalid', Boolean(message));
  }

  clearError() {
    this.setError('');
  }

  clear() {
    this.files = [];
    this.existing = [];
    this.input.value = '';
    this.render();
  }

  revokeObjectUrls() {
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls = [];
  }
}

export default ImageUploader;
