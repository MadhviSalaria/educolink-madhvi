import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoCloudUploadOutline,
  IoDocumentTextOutline,
  IoChevronForward,
  IoFolderOpenOutline,
  IoRefreshOutline,
  IoOpenOutline,
  IoCheckmarkCircleOutline,
  IoWarningOutline
} from 'react-icons/io5';
import { FloatingParticles, GradientMesh, IllustrationBook3D } from '../components/SVGBackgrounds/SVGBackgrounds';
import { listUploadedFiles, uploadFile } from '../services/api';

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function NotesHub() {
  const [dragging, setDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const fileInputRef = useRef(null);

  const totalStorage = useMemo(
    () => files.reduce((sum, file) => sum + Number(file.size || 0), 0),
    [files],
  );

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 2200);
  };

  const refreshFiles = async () => {
    setLoadingFiles(true);
    try {
      const uploaded = await listUploadedFiles();
      setFiles(uploaded);
    } catch (error) {
      showMessage(error.message || 'Could not load files', 'error');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    refreshFiles();
  }, []);

  const handleUpload = async (selectedFiles) => {
    const fileList = Array.from(selectedFiles || []).filter(Boolean);
    if (!fileList.length) {
      return;
    }

    setIsUploading(true);
    try {
      for (const file of fileList) {
        // Upload one-by-one to keep progress and failure handling simple.
        await uploadFile(file);
      }
      showMessage(`${fileList.length} file(s) uploaded successfully`);
      await refreshFiles();
    } catch (error) {
      showMessage(error.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragging(false);
    await handleUpload(event.dataTransfer?.files);
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="module-page">
      <FloatingParticles />
      <GradientMesh colors={['#00685a', '#00897b', '#93f4e0']} />
      
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, rgba(0,104,90,0.7), rgba(0,137,123,0.5), rgba(147,244,224,0.4))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-illustration" style={{ position: 'absolute', top: '-40px', right: '40px', opacity: 0.12, width: '300px', height: '300px' }}>
          <IllustrationBook3D />
        </div>
        <div className="module-hero-content">
          <h1>Notes Hub</h1>
          <p>Real file uploads from your PC. Drag, drop, upload, and open notes instantly.</p>
        </div>
      </motion.div>

      <motion.div className="feature-grid" initial="hidden" animate="show">
        <motion.div className="feature-card" variants={item} style={{ gridColumn: 'span 2' }}>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-notes)', color: '#00685a' }}>
              <IoCloudUploadOutline />
            </div>
            <div>
              <div className="feature-card-title">Upload Notes From This PC</div>
              <div className="feature-card-subtitle">No mock data. Real files saved on server storage.</div>
            </div>
          </div>
          <div
            className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <IoCloudUploadOutline className="upload-dropzone-icon" />
            <h3>Drop Your File Here</h3>
            <p>PDF, DOCX, TXT, PPT, XLS and more (max 25 MB)</p>
            <div className="feature-card-action">
              <button className="btn-primary" onClick={handleBrowse} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Choose File From PC'}
              </button>
              <button className="btn-secondary" onClick={refreshFiles} disabled={loadingFiles}>
                <IoRefreshOutline /> Refresh
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="*/*"
              className="upload-hidden-input"
              onChange={(e) => handleUpload(e.target.files)}
            />
            </div>

          {message && (
            <div className={`upload-message ${messageType === 'error' ? 'error' : 'success'}`}>
              {messageType === 'error' ? <IoWarningOutline /> : <IoCheckmarkCircleOutline />} {message}
            </div>
          )}
        </motion.div>

        <motion.div className="feature-card" variants={item} style={{ gridColumn: 'span 2' }}>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-notes)', color: '#00685a' }}>
              <IoFolderOpenOutline />
            </div>
            <div>
              <div className="feature-card-title">Uploaded Files</div>
              <div className="feature-card-subtitle">
                {files.length} files • {formatBytes(totalStorage)} total storage
              </div>
            </div>
          </div>

          <div className="uploaded-file-list">
            {loadingFiles && <div className="uploaded-empty">Loading files...</div>}

            {!loadingFiles && files.length === 0 && (
              <div className="uploaded-empty">No files uploaded yet. Use the upload area above.</div>
            )}

            {!loadingFiles && files.map((file) => (
              <div key={file.name} className="uploaded-file-item">
                <div className="uploaded-file-main">
                  <IoDocumentTextOutline />
                  <div>
                    <div className="uploaded-file-name">{file.name}</div>
                    <div className="uploaded-file-meta">{formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleString()}</div>
                  </div>
                </div>
                <a className="btn-secondary" href={file.url} target="_blank" rel="noreferrer">
                  <IoOpenOutline /> Open
                </a>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
