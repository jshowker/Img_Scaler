document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const dropzoneContainer = document.getElementById('dropzone-container');
  const fileInput = document.getElementById('file-input');
  const uploadedFilesContainer = document.getElementById('uploaded-files');
  const uploadMoreBtn = document.getElementById('upload-more');
  const clearAllBtn = document.getElementById('clear-all');
  const startProcessBtn = document.getElementById('start-process');
  const processingSection = document.getElementById('processing-section');
  const progressContainer = document.getElementById('progress-container');
  const progressText = document.querySelector('.progress-text');
  const downloadBtn = document.getElementById('Download');
  const x2Toggle = document.getElementById('toggle-x2');
  const x4Toggle = document.getElementById('toggle-x4');
  const minBtn = document.getElementById('min-btn');
  const closeBtn = document.getElementById('close-btn');

  let scaleLevel = 2;
  let files = [];
  let processedImages = [];

  let progressCircle = document.querySelector('.progress-ring-circle');
  let radius = progressCircle.r.baseVal.value;
  let circumference = 2 * Math.PI * radius;
  progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
  progressCircle.style.strokeDashoffset = circumference;

  initEventListeners();

  function initEventListeners() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, highlight, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, unhighlight, false);
    });
    dropzone.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFileSelect);
    uploadMoreBtn.addEventListener('click', () => fileInput.click());
    clearAllBtn.addEventListener('click', clearAllFiles);
    startProcessBtn.addEventListener('click', startProcessing);
    downloadBtn.addEventListener('click', zipFiles);
    x2Toggle.addEventListener('change', () => scaleLevel = 2);
    x4Toggle.addEventListener('change', () => scaleLevel = 4);
    minBtn.onclick = () => window.electronAPI.minimize();
    closeBtn.onclick = () => window.electronAPI.close();
  }

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight() {
    dropzoneContainer.classList.add('highlight');
  }

  function unhighlight() {
    dropzoneContainer.classList.remove('highlight');
  }

  function handleDrop(e) {
    const dt = e.dataTransfer;
    handleFileSelect({ target: { files: dt.files } });
  }

  function handleFileSelect(e) {
    const newFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    if (newFiles.length === 0) {
      alert('Please select only image files (JPEG, JPG, PNG)');
      return;
    }
    files = [...files, ...newFiles];
    renderFileList();
    fileInput.value = '';
  }

  function renderFileList() {
    uploadedFilesContainer.innerHTML = '';
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        fileElement.innerHTML = `
          <div class="file-preview">
            <div class="file-thumbnail">
              <img src="${e.target.result}" alt="${file.name}">
            </div>
            <div class="file-info">
              <div class="file-name">${file.name}</div>
              <div class="file-details">${formatFileSize(file.size)} • ${file.type.split('/')[1].toUpperCase()}</div>
            </div>
          </div>
          <div class="file-status">
            <svg viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7"/>
            </svg>
            <span class="status-complete">Ready</span>
          </div>
          <div class="file-actions">
            <button class="delete-file" data-index="${index}">
              <svg viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        `;
        fileElement.querySelector('.delete-file').addEventListener('click', (event) => {
          event.stopPropagation();
          files.splice(index, 1);
          renderFileList();
        });
        uploadedFilesContainer.appendChild(fileElement);
      };
      reader.readAsDataURL(file);
    });
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function clearAllFiles() {
    files = [];
    uploadedFilesContainer.innerHTML = '';
    processingSection.style.display = 'none';
  }

  function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  }

  function zipFiles() {
    if (processedImages.length === 0) {
      alert('Нет обработанных файлов');
      return;
    }
    const zip = new JSZip();
    processedImages.forEach(file => {
      const binaryData = Uint8Array.from(atob(file.data), c => c.charCodeAt(0));
      zip.file(file.name, binaryData);
    });
    zip.generateAsync({ type: 'blob' }).then(blob => {
      saveAs(blob, 'upscaled_images.zip');
    });
  }

  async function startProcessing() {
    if (files.length === 0) {
      alert('Please upload images first');
      return;
    }

    const fileData = await Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: reader.result
          });
        };
        reader.readAsDataURL(file);
      });
    }));

    processedImages = [];
    processingSection.style.display = 'flex';
    progressContainer.style.display = 'flex';

    for (let i = 0; i < fileData.length; i++) {
      const file = fileData[i];
      const base64 = await window.electronAPI.enhanceImage(file.dataUrl, scaleLevel);

      if (base64) {
        processedImages.push({
          name: file.name.replace(/\.[^/.]+$/, '') + '_enhanced.png',
          data: base64
        });
        const progress = Math.round(((i + 1) / fileData.length) * 100);
        setProgress(progress);
        progressText.textContent = `Processing... ${progress}%`;
      }
    }

    setTimeout(() => {
      progressContainer.style.display = 'none';
      alert('Processing completed!');
    }, 1000);
  }
});
