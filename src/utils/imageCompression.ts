/**
 * Compress an image file to reduce file size while maintaining quality
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  outputType: 'image/webp',
};

/**
 * Load an image from a File object
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Only resize if the image is larger than max dimensions
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;

    if (width > height) {
      width = Math.min(width, maxWidth);
      height = Math.round(width / aspectRatio);
    } else {
      height = Math.min(height, maxHeight);
      width = Math.round(height * aspectRatio);
    }

    // Ensure we don't exceed either dimension
    if (width > maxWidth) {
      width = maxWidth;
      height = Math.round(width / aspectRatio);
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
    }
  }

  return { width, height };
}

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise<File> - The compressed image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Skip compression for GIFs to preserve animation
  if (file.type === 'image/gif') {
    console.log('Skipping compression for GIF');
    return file;
  }

  // Skip if file is already small (under 200KB)
  if (file.size < 200 * 1024) {
    console.log('File already small, skipping compression');
    return file;
  }

  try {
    const img = await loadImage(file);
    
    const { width, height } = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      opts.maxWidth!,
      opts.maxHeight!
    );

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Use high-quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        opts.outputType,
        opts.quality
      );
    });

    // Determine file extension based on output type
    const extension = opts.outputType === 'image/webp' ? 'webp' : 'jpg';
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const newFileName = `${originalName}.${extension}`;

    // Create new File object
    const compressedFile = new File([blob], newFileName, {
      type: opts.outputType!,
      lastModified: Date.now(),
    });

    const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    console.log(
      `Compressed: ${file.name} (${formatBytes(file.size)}) → ${newFileName} (${formatBytes(compressedFile.size)}) - ${compressionRatio}% reduction`
    );

    // If compressed file is larger, return original
    if (compressedFile.size >= file.size) {
      console.log('Compressed file is larger, using original');
      return file;
    }

    return compressedFile;
  } catch (error) {
    console.error('Compression failed, using original file:', error);
    return file;
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Compress multiple image files
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}
