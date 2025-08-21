// Configuration
const API_URL = 'http://localhost:4000';
let authToken = localStorage.getItem('token');

// DOM Elements
const elements = {
    authForm: document.getElementById('auth-form'),
    authStatus: document.getElementById('auth-status'),
    loginBtn: document.getElementById('login-btn'),
    registerBtn: document.getElementById('register-btn'),
    uploadSection: document.getElementById('upload-section'),
    uploadZone: document.getElementById('upload-zone'),
    fileInput: document.getElementById('file-input'),
    uploadProgress: document.getElementById('upload-progress'),
    uploadStatus: document.getElementById('upload-status'),
    shareSection: document.getElementById('share-section'),
    shareLinks: document.getElementById('share-links'),
    generateLinkBtn: document.getElementById('generate-link-btn'),
    downloadSection: document.getElementById('download-section'),
    downloadBtn: document.getElementById('download-btn'),
    downloadStatus: document.getElementById('download-status'),
    filesSection: document.getElementById('files-section'),
    fileList: document.getElementById('file-list')
};

// Auth Functions
async function login(email, password) {
    try {
        console.log('Attempting login...', `${API_URL}/api/auth/login`);
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('token', authToken);
            showStatus('Logged in successfully!', 'success');
            showAuthenticatedUI();
        } else {
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showStatus(error.message, 'error');
    }
}

async function register(email, password) {
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            showStatus('Registration successful! Please login.', 'success');
        } else {
            throw new Error(data.error || 'Registration failed');
        }
    } catch (error) {
        showStatus(error.message, 'error');
    }
}

// File Upload Functions
async function uploadFiles(files) {
    const formData = new FormData();
    let totalSize = 0;
    const fileList = [];
    
    // Process files and calculate total size
    for (let file of files) {
        formData.append('files', file, file.webkitRelativePath || file.name);
        totalSize += file.size;
        fileList.push({
            name: file.webkitRelativePath || file.name,
            size: file.size
        });
    }

    // Display initial upload information
    showUploadInfo(fileList, totalSize);

    try {
        const response = await fetch(`${API_URL}/api/folder/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        const reader = response.body.getReader();
        let progress = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = new TextDecoder().decode(value);
            const updates = text.split('\n').filter(Boolean).map(JSON.parse);

            updates.forEach(update => {
                if (update.type === 'progress') {
                    updateProgress(update.progress);
                } else if (update.type === 'complete') {
                    showStatus('Upload complete!', 'success');
                    updateFileList();
                }
            });
        }
    } catch (error) {
        showStatus('Upload failed: ' + error.message, 'error');
    }
}

// Share Functions
async function generateShareLink(folderId, password, expiryHours) {
    try {
        const response = await fetch(`${API_URL}/api/folder/${folderId}/share-link`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password, expiryHours })
        });

        const data = await response.json();
        if (response.ok) {
            addShareLink(data.link);
        } else {
            throw new Error(data.error || 'Failed to generate share link');
        }
    } catch (error) {
        showStatus(error.message, 'error');
    }
}

// Download Functions
async function downloadFolder(linkId, password) {
    try {
        const response = await fetch(`${API_URL}/api/share-link/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ linkId, password })
        });

        const data = await response.json();
        if (response.ok) {
            window.location.href = `${API_URL}/api/folder/${data.folderId}/download`;
        } else {
            throw new Error(data.error || 'Download failed');
        }
    } catch (error) {
        showStatus(error.message, 'error');
    }
}

// UI Helper Functions
function showStatus(message, type, details = null) {
    const statusDiv = document.createElement('div');
    statusDiv.className = `status ${type}`;
    
    if (details) {
        statusDiv.innerHTML = `
            <p>${message}</p>
            <pre class="error-details">${JSON.stringify(details, null, 2)}</pre>
        `;
    } else {
        statusDiv.textContent = message;
    }
    
    const container = document.querySelector('.container');
    const existingStatus = container.querySelector('.status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    container.insertBefore(statusDiv, container.querySelector('.section'));
    if (type === 'error') {
        console.error('Error details:', { message, details });
    }
}

function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function showUploadInfo(fileList, totalSize) {
    const fileListHTML = fileList.map(file => `
        <div class="file-item">
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatSize(file.size)}</span>
        </div>
    `).join('');

    elements.uploadStatus.innerHTML = `
        <div class="upload-info">
            <h3>Upload Details:</h3>
            <p>Total Size: ${formatSize(totalSize)}</p>
            <p>Files: ${fileList.length}</p>
            <div class="file-list">${fileListHTML}</div>
        </div>
    `;
}

function updateProgress(percent) {
    elements.uploadProgress.querySelector('.progress').style.width = `${percent}%`;
    elements.uploadProgress.setAttribute('data-progress', `${percent}%`);
}

function showAuthenticatedUI() {
    elements.authForm.classList.add('hidden');
    elements.uploadSection.classList.remove('hidden');
    elements.shareSection.classList.remove('hidden');
    elements.downloadSection.classList.remove('hidden');
    elements.filesSection.classList.remove('hidden');
    updateFileList();
}

function addShareLink(link) {
    const linkDiv = document.createElement('div');
    linkDiv.className = 'share-link';
    linkDiv.innerHTML = `
        <span>${link}</span>
        <button onclick="navigator.clipboard.writeText('${link}')">Copy</button>
    `;
    elements.shareLinks.appendChild(linkDiv);
}

async function updateFileList() {
    try {
        const response = await fetch(`${API_URL}/api/transfers`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        elements.fileList.innerHTML = data.map(file => `
            <div class="file-item">
                <span>${file.name}</span>
                <span>${new Date(file.timestamp).toLocaleString()}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to update file list:', error);
    }
}

// Event Listeners
elements.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await login(email, password);
});

elements.registerBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await register(email, password);
});

elements.uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadFiles(e.dataTransfer.files);
});

elements.uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
});

elements.fileInput.addEventListener('change', (e) => {
    uploadFiles(e.target.files);
});

elements.generateLinkBtn.addEventListener('click', () => {
    const folderId = elements.fileList.querySelector('.file-item')?.dataset.id;
    const password = document.getElementById('share-password').value;
    const expiryHours = parseInt(document.getElementById('share-expiry').value);
    if (folderId) {
        generateShareLink(folderId, password, expiryHours);
    }
});

elements.downloadBtn.addEventListener('click', () => {
    const link = document.getElementById('download-link').value;
    const password = document.getElementById('download-password').value;
    const linkId = link.split('/').pop();
    downloadFolder(linkId, password);
});

// Initialize
if (authToken) {
    showAuthenticatedUI();
}
