import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, Loader2, Download, LogOut, Crop, 
  Sparkles, RefreshCw, AlertTriangle, CheckCircle2, 
  Image as ImageIcon, ArrowLeft, Ratio 
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Dashboard({ token, username, onLogout }) {
  // Image & Upload state
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [originalFileSize, setOriginalFileSize] = useState(null);

  // Transform configurations
  const [enableCrop, setEnableCrop] = useState(true);
  const [enableResize, setEnableResize] = useState(false);
  const [resizeWidth, setResizeWidth] = useState('');
  const [resizeHeight, setResizeHeight] = useState('');
  const [format, setFormat] = useState('webp');
  const [quality, setQuality] = useState(80);

  // Crop overlay box state (percentage values of display container)
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const dragStart = useRef({ x: 0, y: 0 });
  const initialCropBox = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Processing & Polling state
  const [processing, setProcessing] = useState(false);
  const [jobStatus, setJobStatus] = useState('idle'); // idle, queued, processing, completed, failed
  const [activeVariant, setActiveVariant] = useState(null);
  const [pollIntervalId, setPollIntervalId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);

  // File Upload Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setUploadError('');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    setUploadError('');
    const files = e.target.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const uploadFile = async (file) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed.');
      return;
    }

    setOriginalFileSize(file.size);
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_URL}/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image.');
      }

      // Reset state for new image workspace
      setSelectedImage(data.image);
      setActiveVariant(null);
      setJobStatus('idle');
      setErrorMsg('');
      setCropBox({ x: 0, y: 0, w: 100, h: 100 });
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Draggable & Resizable Cropper Bounding Box Logic
  const handleMouseDown = (e, action, direction = '') => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to the drag parent overlay
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialCropBox.current = { ...cropBox };

    if (action === 'drag') {
      setIsDragging(true);
    } else if (action === 'resize') {
      setIsResizing(true);
      setResizeDirection(direction);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStart.current.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStart.current.y) / rect.height) * 100;

      if (isDragging) {
        let newX = initialCropBox.current.x + deltaX;
        let newY = initialCropBox.current.y + deltaY;

        // Clamp positions to borders
        newX = Math.max(0, Math.min(100 - cropBox.w, newX));
        newY = Math.max(0, Math.min(100 - cropBox.h, newY));

        setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (isResizing) {
        let newX = cropBox.x;
        let newY = cropBox.y;
        let newW = cropBox.w;
        let newH = cropBox.h;

        const init = initialCropBox.current;

        if (resizeDirection.includes('e')) {
          newW = Math.max(5, Math.min(100 - init.x, init.w + deltaX));
        }
        if (resizeDirection.includes('s')) {
          newH = Math.max(5, Math.min(100 - init.y, init.h + deltaY));
        }
        if (resizeDirection.includes('w')) {
          const maxDeltaW = init.x + init.w - 5;
          const actualDeltaX = Math.max(-init.x, Math.min(maxDeltaW, deltaX));
          newX = init.x + actualDeltaX;
          newW = init.w - actualDeltaX;
        }
        if (resizeDirection.includes('n')) {
          const maxDeltaH = init.y + init.h - 5;
          const actualDeltaY = Math.max(-init.y, Math.min(maxDeltaH, deltaY));
          newY = init.y + actualDeltaY;
          newH = init.h - actualDeltaY;
        }

        setCropBox({ x: newX, y: newY, w: newW, h: newH });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection('');
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, resizeDirection, cropBox]);

  // Queue transformation job
  const handleProcessImage = async () => {
    if (!selectedImage) return;

    setErrorMsg('');
    setJobStatus('queued');
    setProcessing(true);
    setActiveVariant(null);

    // Calculate crop variables in pixels relative to natural dimensions
    let cropPayload = null;
    if (enableCrop && imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      cropPayload = {
        left: Math.round((cropBox.x / 100) * naturalWidth),
        top: Math.round((cropBox.y / 100) * naturalHeight),
        width: Math.round((cropBox.w / 100) * naturalWidth),
        height: Math.round((cropBox.h / 100) * naturalHeight),
      };
    }

    let resizePayload = null;
    if (enableResize) {
      resizePayload = {};
      if (resizeWidth) resizePayload.width = parseInt(resizeWidth, 10);
      if (resizeHeight) resizePayload.height = parseInt(resizeHeight, 10);
      if (Object.keys(resizePayload).length === 0) {
        resizePayload = null;
      }
    }

    const payload = {
      crop: cropPayload,
      resize: resizePayload,
      compression: {
        format,
        quality: parseInt(quality, 10),
      }
    };

    try {
      const response = await fetch(`${API_URL}/images/${selectedImage._id}/transform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transformation request failed.');
      }

      startPolling(selectedImage._id, data.variantName);
    } catch (err) {
      setErrorMsg(err.message);
      setJobStatus('failed');
      setProcessing(false);
    }
  };

  // Poll status endpoint
  const startPolling = (imageId, variantName) => {
    if (pollIntervalId) clearInterval(pollIntervalId);

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/images/${imageId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.status === 'processing') {
          setJobStatus('processing');
        }

        const foundVariant = data.variants.find(v => v.transformationType === variantName);
        if (foundVariant) {
          clearInterval(intervalId);
          setActiveVariant(foundVariant);
          setJobStatus('completed');
          setProcessing(false);
        } else if (data.status === 'failed') {
          clearInterval(intervalId);
          setJobStatus('failed');
          setProcessing(false);
          setErrorMsg('Processing failed on the worker process.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    setPollIntervalId(intervalId);
  };

  // Download logic (Blob fetch)
  const handleDownload = async () => {
    if (!activeVariant) return;

    try {
      const response = await fetch(activeVariant.url, {
        method: 'GET',
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image attachment: ${response.statusText}`);
      }

      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = localUrl;

      const extension = blob.type.split('/')[1] || 'png';
      const origName = selectedImage.originalName;
      const cleanOriginalName = origName.substring(0, origName.lastIndexOf('.')) || origName;
      
      link.download = `${cleanOriginalName}_${activeVariant.transformationType}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to save file locally. Please check CORS configuration.');
    }
  };

  const getEstimatedSize = () => {
    if (!originalFileSize) return 'N/A';

    let factor = 1.0;

    if (format === 'webp') {
      factor *= 0.15;
    } else if (format === 'jpeg') {
      factor *= 0.35;
    } else {
      factor *= 0.85;
    }

    const qualityFactor = Math.pow(quality / 100, 2); 
    factor *= qualityFactor;

    if (enableCrop) {
      const cropPercent = (cropBox.w / 100) * (cropBox.h / 100);
      factor *= cropPercent;
    }

    if (enableResize && resizeWidth && imageRef.current) {
      const originalWidth = imageRef.current.naturalWidth;
      const resizeRatio = parseInt(resizeWidth, 10) / originalWidth;
      if (!isNaN(resizeRatio) && resizeRatio < 1) {
        factor *= Math.pow(resizeRatio, 2);
      }
    }

    const estimatedBytes = originalFileSize * factor;
    
    if (estimatedBytes >= 1024 * 1024) {
      return (estimatedBytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
      return (estimatedBytes / 1024).toFixed(0) + ' KB';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header Bar */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-card/30 px-6 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            PixelForge <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent font-medium">Async</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Logged in as: <strong className="text-foreground">{username}</strong>
          </span>
          <button 
            onClick={onLogout} 
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background/50 px-3 text-xs font-medium text-destructive hover:bg-destructive/15 transition-colors cursor-pointer"
          >
            <LogOut className="h-3 w-3" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 flex flex-col p-6 max-w-7xl w-full mx-auto justify-center">
        {!selectedImage ? (
          /* State 1: Upload State */
          <div className="flex flex-col items-center justify-center flex-1 max-w-2xl w-full mx-auto py-12 gap-6">
            {!uploading ? (
              <div 
                className={`flex flex-col items-center justify-center w-full h-[320px] rounded-xl border-2 border-dashed bg-card/20 backdrop-blur-sm transition-all hover:bg-accent/5 hover:border-primary/50 text-center p-8 gap-4 cursor-pointer select-none ${dragOver ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' : 'border-border'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  id="file-input" 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  className="hidden" 
                />
                <label htmlFor="file-input" className="flex flex-col items-center gap-3 cursor-pointer w-full h-full justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-sm group-hover:text-primary transition-colors">
                    <UploadCloud className="h-6 w-6 text-primary animate-bounce" />
                  </div>
                  <h3 className="text-lg font-semibold mt-2">Drag & Drop Image Here</h3>
                  <p className="text-xs text-muted-foreground">or click to browse from your device</p>
                  <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-2xs font-semibold text-secondary-foreground mt-4">
                    Supports JPEG, PNG, and WebP
                  </span>
                </label>
              </div>
            ) : (
              /* Loading Spinner state during upload */
              <div className="flex flex-col items-center justify-center w-full h-[320px] rounded-xl border-2 border-dashed border-primary/20 bg-card/25 text-center p-8 gap-4 shadow-sm animate-pulse">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <h3 className="text-base font-semibold">Streaming Asset to Cloudinary</h3>
                <p className="text-xs text-muted-foreground max-w-[280px]">Direct zero-disk file ingestion bypassing local storage buffers...</p>
              </div>
            )}
            {uploadError && (
              <div className="text-sm bg-destructive/10 border border-destructive/20 text-destructive text-center p-3 rounded-lg font-medium w-full">
                {uploadError}
              </div>
            )}
          </div>
        ) : (
          /* State 2: Active Editing State */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            {/* Left Column: Interactive Cropper Canvas */}
            <div className="lg:col-span-7 flex flex-col border border-border bg-card/30 rounded-xl p-6 backdrop-blur-sm gap-4">
              <div className="flex justify-between items-center pb-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold">Image Workspace</h3>
                </div>
                <button 
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background/50 px-2.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  onClick={() => setSelectedImage(null)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Upload Different Image
                </button>
              </div>

              {/* Viewport wrapper */}
              <div className="flex items-center justify-center bg-black/40 border border-border/50 rounded-lg p-6 relative overflow-hidden select-none min-h-[300px]">
                <div className="relative inline-block max-w-full" ref={containerRef}>
                  <img 
                    ref={imageRef} 
                    src={selectedImage.originalUrl} 
                    alt="Canvas space" 
                    className="max-h-[550px] max-w-full object-contain rounded-md"
                    onLoad={() => {
                      setCropBox({ x: 0, y: 0, w: 100, h: 100 });
                    }}
                  />
                  
                  {enableCrop && (
                    <div 
                      className="absolute border border-dashed border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move z-20"
                      style={{
                        left: `${cropBox.x}%`,
                        top: `${cropBox.y}%`,
                        width: `${cropBox.w}%`,
                        height: `${cropBox.h}%`,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, 'drag')}
                    >
                      {/* Grid Lines */}
                      <div className="absolute top-[33.3%] left-0 w-full h-[1px] bg-primary/25"></div>
                      <div className="absolute top-[66.6%] left-0 w-full h-[1px] bg-primary/25"></div>
                      <div className="absolute left-[33.3%] top-0 h-full w-[1px] bg-primary/25"></div>
                      <div className="absolute left-[66.6%] top-0 h-full w-[1px] bg-primary/25"></div>

                      {/* Resize Corners */}
                      <div className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-white border border-primary z-30 cursor-nwse-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'nw')}></div>
                      <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-white border border-primary z-30 cursor-nesw-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'ne')}></div>
                      <div className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full bg-white border border-primary z-30 cursor-nesw-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'sw')}></div>
                      <div className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-white border border-primary z-30 cursor-nwse-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'se')}></div>

                      {/* Resize Edges */}
                      <div className="absolute -top-1 left-[calc(50%-4px)] h-2.5 w-2 w-2.5 rounded-full bg-white border border-primary z-30 cursor-ns-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'n')}></div>
                      <div className="absolute -bottom-1 left-[calc(50%-4px)] h-2.5 w-2 w-2.5 rounded-full bg-white border border-primary z-30 cursor-ns-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 's')}></div>
                      <div className="absolute top-[calc(50%-4px)] -left-1 h-2.5 w-2 w-2.5 rounded-full bg-white border border-primary z-30 cursor-ew-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'w')}></div>
                      <div className="absolute top-[calc(50%-4px)] -right-1 h-2.5 w-2 w-2.5 rounded-full bg-white border border-primary z-30 cursor-ew-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'e')}></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Configurations Panel */}
            <div className="lg:col-span-5 flex flex-col border border-border bg-card/30 rounded-xl p-6 backdrop-blur-sm gap-6">
              <div>
                <h3 className="text-base font-semibold">Transform Options</h3>
                <p className="text-xs text-muted-foreground mt-1">Configure your image transformation parameters</p>
              </div>

              {errorMsg && (
                <div className="text-sm bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                {/* Crop Switch Card */}
                <div className="flex flex-col border border-border bg-background/50 rounded-lg p-4 gap-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={enableCrop} 
                      onChange={(e) => setEnableCrop(e.target.checked)} 
                      className="rounded border-input text-primary focus:ring-ring h-4 w-4 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Crop Selection Area</span>
                      <span className="text-xs text-muted-foreground">Adjust bounding box to crop original image</span>
                    </div>
                  </label>
                  {enableCrop && (
                    <div className="grid grid-cols-4 gap-2 bg-black/20 p-2 rounded border border-border/30 text-center font-mono text-[10px] text-muted-foreground mt-2">
                      <div>X: {Math.round(cropBox.x)}%</div>
                      <div>Y: {Math.round(cropBox.y)}%</div>
                      <div>W: {Math.round(cropBox.w)}%</div>
                      <div>H: {Math.round(cropBox.h)}%</div>
                    </div>
                  )}
                </div>

                {/* Resize Card */}
                <div className="flex flex-col border border-border bg-background/50 rounded-lg p-4 gap-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={enableResize} 
                      onChange={(e) => setEnableResize(e.target.checked)} 
                      className="rounded border-input text-primary focus:ring-ring h-4 w-4 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Resize Resolution</span>
                      <span className="text-xs text-muted-foreground">Configure custom target dimensions</span>
                    </div>
                  </label>
                  {enableResize && (
                    <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-border/50">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">Width (px)</label>
                        <input 
                          type="number" 
                          placeholder="Auto" 
                          value={resizeWidth}
                          onChange={(e) => setResizeWidth(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">Height (px)</label>
                        <input 
                          type="number" 
                          placeholder="Auto" 
                          value={resizeHeight}
                          onChange={(e) => setResizeHeight(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Format & Quality Settings */}
                <div className="flex flex-col border border-border bg-background/50 rounded-lg p-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Output Format</label>
                    <select 
                      value={format} 
                      onChange={(e) => setFormat(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="webp">WebP (Modern & Compact)</option>
                      <option value="png">PNG (Lossless & High Quality)</option>
                      <option value="jpeg">JPEG (Standard Compressed)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-muted-foreground">Quality Compression</label>
                      <span className="text-xs font-bold text-primary">{quality}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={quality} 
                      onChange={(e) => setQuality(e.target.value)} 
                      className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    {originalFileSize && (
                      <div className="text-2xs text-right text-primary mt-1 font-medium bg-primary/5 px-2 py-1 rounded self-end border border-primary/10">
                        Estimated Output Size: <strong>~{getEstimatedSize()}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Process Action */}
                <button 
                  onClick={handleProcessImage} 
                  disabled={processing}
                  className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full shadow-md hover:shadow-primary/25 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Queuing in RabbitMQ...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Process Image
                    </>
                  )}
                </button>
              </div>

              {/* Status & Results Section */}
              <div className="mt-2 pt-6 border-t border-border/50">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Job Logs & Outputs</h4>
                
                {jobStatus === 'idle' && (
                  <p className="text-xs text-muted-foreground">Adjust settings above and click Process to launch processing queues.</p>
                )}

                {jobStatus === 'queued' && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 text-purple-400 text-xs font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    <span>Enqueued in CloudAMQP Job Buffer...</span>
                  </div>
                )}

                {jobStatus === 'processing' && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                    <span>Processing transforms on Sharp worker thread...</span>
                  </div>
                )}

                {jobStatus === 'failed' && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-xs font-medium">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span>Operation failed. Verify parameters.</span>
                  </div>
                )}

                {jobStatus === 'completed' && activeVariant && (
                  <div className="flex flex-col p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 gap-3">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </div>
                      <span className="text-2xs text-muted-foreground truncate max-w-[200px]" title={activeVariant.transformationType}>
                        Type: {activeVariant.transformationType}
                      </span>
                    </div>
                    
                    <button 
                      onClick={handleDownload} 
                      className="inline-flex items-center justify-center gap-2 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-3 w-full shadow-sm cursor-pointer transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Transformed File
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
