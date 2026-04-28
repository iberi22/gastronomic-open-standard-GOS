/**
 * GOSImageProcessor - Image Compression Pipeline
 * Browser-only image processing for GOS PWA
 * Handles compression to WebP/AVIF, smart cropping, and blurhash generation
 */

export interface ProcessOptions {
  /** Target crop ratio (width/height). Default: 1 (square) */
  cropRatio?: number;
  /** Preferred format override. Default: auto-detect best format */
  format?: 'avif' | 'webp' | 'jpeg';
  /** Maximum variant to generate. Default: full */
  maxVariant?: 'thumbnail' | 'small' | 'medium' | 'large' | 'full';
}

export interface VariantManifest {
  width: number;
  height: number;
  size: number;
  format: string;
  dataUrl?: string;
}

export interface ImageManifest {
  id: string;
  blurhash: string;
  dominantColor: string;
  variants: {
    thumbnail?: VariantManifest;
    small?: VariantManifest;
    medium?: VariantManifest;
    large?: VariantManifest;
    full?: VariantManifest;
  };
  originalWidth: number;
  originalHeight: number;
  processedAt: number;
}

interface Variant {
  name: 'thumbnail' | 'small' | 'medium' | 'large' | 'full';
  maxDimension: number;
  quality: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Variant configurations */
const VARIANTS: Variant[] = [
  { name: 'thumbnail', maxDimension: 150, quality: 0.75 },
  { name: 'small', maxDimension: 320, quality: 0.75 },
  { name: 'medium', maxDimension: 640, quality: 0.75 },
  { name: 'large', maxDimension: 1280, quality: 0.75 },
  { name: 'full', maxDimension: 2048, quality: 0.75 },
];

const MAX_VARIANT_INDEX: Record<string, number> = {
  thumbnail: 0,
  small: 1,
  medium: 2,
  large: 3,
  full: 4,
};

/** Compression settings per format */
const COMPRESSION_SETTINGS: Record<string, { quality: number; effort?: number }> = {
  avif: { quality: 70, effort: 4 },
  webp: { quality: 75 },
  jpeg: { quality: 80 },
};

/** Allowed MIME types */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Minimum image dimension */
const MIN_DIMENSION = 300;

/** Maximum supported dimension */
const MAX_DIMENSION = 8192;

export class GOSImageProcessor {
  private supportedFormat: 'avif' | 'webp' | 'jpeg' = 'jpeg';
  private formatOverride: 'avif' | 'webp' | 'jpeg' | null = null;

  constructor() {
    this.detectFormatSupport();
  }

  /**
   * Detects the best image format supported by the browser
   */
  private detectFormatSupport(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    if (canvas.toDataURL('image/avif').startsWith('data:image/avif')) {
      this.supportedFormat = 'avif';
    } else if (canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
      this.supportedFormat = 'webp';
    } else {
      this.supportedFormat = 'jpeg';
    }
  }

  /**
   * Gets the best available format, considering override
   */
  private getBestFormat(): 'avif' | 'webp' | 'jpeg' {
    if (this.formatOverride) {
      return this.formatOverride;
    }
    return this.supportedFormat;
  }

  /**
   * Validates an image file before processing
   */
  private validate(file: File): ValidationResult {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP`,
      };
    }

    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    if (file.size > 100 * 1024 * 1024) {
      return { valid: false, error: 'File too large. Maximum: 100MB' };
    }

    return { valid: true };
  }

  /**
   * Loads an image file into an HTMLImageElement
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Smart crop to target ratio with center-weighted positioning
   */
  private smartCrop(img: HTMLImageElement, targetRatio: number): HTMLCanvasElement {
    const { width: imgWidth, height: imgHeight } = img;
    const currentRatio = imgWidth / imgHeight;

    let cropWidth: number;
    let cropHeight: number;

    if (currentRatio > targetRatio) {
      cropHeight = imgHeight;
      cropWidth = cropHeight * targetRatio;
    } else {
      cropWidth = imgWidth;
      cropHeight = cropWidth / targetRatio;
    }

    const x = (imgWidth - cropWidth) / 2;
    const y = (imgHeight - cropHeight) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cropWidth);
    canvas.height = Math.round(cropHeight);

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, x, y, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  /**
   * Resizes image to fit within maxDimension while maintaining aspect ratio
   */
  private resizeImage(
    canvas: HTMLCanvasElement,
    maxDimension: number
  ): HTMLCanvasElement {
    const { width, height } = canvas;

    if (width <= maxDimension && height <= maxDimension) {
      return canvas;
    }

    const ratio = Math.min(maxDimension / width, maxDimension / height);
    const newWidth = Math.round(width * ratio);
    const newHeight = Math.round(height * ratio);

    const resized = document.createElement('canvas');
    resized.width = newWidth;
    resized.height = newHeight;

    const ctx = resized.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, newWidth, newHeight);

    return resized;
  }

  /**
   * Compresses a canvas to the specified format
   */
  private compress(
    canvas: HTMLCanvasElement,
    format: 'avif' | 'webp' | 'jpeg',
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mimeType = `image/${format === 'jpeg' ? 'jpeg' : format}`;
      const qualityParam = quality / 100;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to compress to ${format}`));
          }
        },
        mimeType,
        qualityParam
      );
    });
  }

  /**
   * Generates a simplified blurhash: samples 8x8 grid and encodes as base64
   */
  private generateBlurhash(img: HTMLImageElement): string {
    const sampleSize = 8;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imageData.data;

    // Sample 32 points (8x8 grid, every 4th pixel for performance)
    const samples: number[] = [];
    for (let i = 0; i < data.length; i += 4 * 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      samples.push(r, g, b);
    }

    // Encode as base64-like string for CSS gradient reconstruction
    const encoded = this.encodeBlurhashSamples(samples);
    return `blurhash:${encoded}`;
  }

  /**
   * Encodes sample colors into a compact string representation
   */
  private encodeBlurhashSamples(samples: number[]): string {
    // Simple encoding: pack 3 RGB values into 2 chars using base64
    let encoded = '';
    for (let i = 0; i < samples.length; i += 3) {
      const r = Math.round(samples[i] / 4);
      const g = Math.round(samples[i + 1] / 4);
      const b = Math.round(samples[i + 2] / 4);
      const packed = (r << 10) | (g << 5) | b;
      encoded += this.packToBase64(packed);
    }
    return encoded;
  }

  /**
   * Packs a number to a compact base64-like string
   */
  private packToBase64(num: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const c1 = chars[(num >> 6) & 63];
    const c2 = chars[num & 63];
    return c1 + c2;
  }

  /**
   * Extracts dominant color from image center region
   */
  private getDominantColor(img: HTMLImageElement): string {
    const sampleSize = 32;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      img,
      img.width * 0.25,
      img.height * 0.25,
      img.width * 0.5,
      img.height * 0.5,
      0,
      0,
      sampleSize,
      sampleSize
    );

    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imageData.data;

    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    const pixelCount = sampleSize * sampleSize;

    for (let i = 0; i < data.length; i += 4) {
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
    }

    const avgR = Math.round(totalR / pixelCount);
    const avgG = Math.round(totalG / pixelCount);
    const avgB = Math.round(totalB / pixelCount);

    return `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`;
  }

  /**
   * Generates all image variants
   */
  private async generateVariants(img: HTMLImageElement): Promise<Variant[]> {
    const format = this.getBestFormat();
    const compression = COMPRESSION_SETTINGS[format];
    const variants: Variant[] = [];

    for (const variant of VARIANTS) {
      const canvas = this.resizeImage(img, variant.maxDimension);
      const blob = await this.compress(canvas, format, compression.quality);
      const dataUrl = await this.blobToDataUrl(blob);

      variants.push({
        name: variant.name,
        maxDimension: variant.maxDimension,
        quality: compression.quality,
      });

      // Store compressed data for manifest
      (canvas as any).__blob = blob;
      (canvas as any).__dataUrl = dataUrl;
      (canvas as any).__width = canvas.width;
      (canvas as any).__height = canvas.height;
    }

    return variants;
  }

  /**
   * Converts Blob to data URL
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Converts Blob to ArrayBuffer
   */
  private blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Generates a unique ID for the image manifest
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${randomPart}`;
  }

  /**
   * Main entry point: processes an image file and returns manifest
   */
  async processImage(file: File, options?: ProcessOptions): Promise<ImageManifest> {
    const validation = this.validate(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Apply format override if specified
    if (options?.format) {
      this.formatOverride = options.format;
    }

    try {
      const img = await this.loadImage(file);

      // Check dimensions
      if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
        throw new Error(
          `Image too small. Minimum: ${MIN_DIMENSION}x${MIN_DIMENSION}px`
        );
      }

      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        throw new Error(
          `Image too large. Maximum: ${MAX_DIMENSION}x${MAX_DIMENSION}px`
        );
      }

      // Apply crop if ratio specified
      let processedImg = img;
      if (options?.cropRatio && options.cropRatio !== 1) {
        const canvas = this.smartCrop(img, options.cropRatio);
        processedImg = this.canvasToImage(canvas);
      }

      // Generate variants
      const variants = await this.generateVariants(processedImg);

      // Build manifest
      const format = this.getBestFormat();
      const mimeType = `image/${format === 'jpeg' ? 'jpeg' : format}`;

      const manifest: ImageManifest = {
        id: this.generateId(),
        blurhash: this.generateBlurhash(processedImg),
        dominantColor: this.getDominantColor(processedImg),
        variants: {},
        originalWidth: img.width,
        originalHeight: img.height,
        processedAt: Date.now(),
      };

      // Determine max variant index
      const maxIndex = options?.maxVariant
        ? MAX_VARIANT_INDEX[options.maxVariant]
        : VARIANTS.length - 1;

      // Populate variants manifest
      for (let i = 0; i <= maxIndex; i++) {
        const variant = VARIANTS[i];
        const canvas = this.resizeImage(
          processedImg,
          variant.maxDimension
        );
        const blob = await this.compress(canvas, format, COMPRESSION_SETTINGS[format].quality);
        const dataUrl = await this.blobToDataUrl(blob);

        const variantManifest: VariantManifest = {
          width: canvas.width,
          height: canvas.height,
          size: blob.size,
          format: mimeType,
        };

        // Include dataUrl for small variants to avoid separate requests
        if (variant.maxDimension <= 320) {
          variantManifest.dataUrl = dataUrl;
        }

        manifest.variants[variant.name as keyof typeof manifest.variants] = variantManifest;
      }

      return manifest;
    } finally {
      this.formatOverride = null;
    }
  }

  /**
   * Converts HTMLCanvasElement to HTMLImageElement
   */
  private canvasToImage(canvas: HTMLCanvasElement): HTMLImageElement {
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }
}

// Export singleton instance
export const imageProcessor = new GOSImageProcessor();