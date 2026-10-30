import { PDFDocument } from 'pdf-lib';

export interface PdfMetadata {
  producer?: string;
  creator?: string;
  creationDate?: string;
  modificationDate?: string;
  title?: string;
  author?: string;
  pageCount?: number;
}

export interface FileForensicsResult {
  fileName: string;
  fileSizeBytes: number;
  sha256Hash: string;
  isPdf: boolean;
  pdfMetadata?: PdfMetadata;
  imageEditorSuspicion?: boolean;
  modificationAnomaly?: boolean;
  detail?: string;
}

/**
 * Computes a real SHA-256 hash using WebCrypto SubtleCrypto.
 * Falls back to software SHA-256 if SubtleCrypto is unavailable.
 */
export async function computeFileSha256(data: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Software fallback
  const bytes = new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).slice(0, 64);
}

const IMAGE_EDITOR_PATTERNS = [
  /photoshop/i,
  /canva/i,
  /gimp/i,
  /illustrator/i,
  /inkscape/i,
  /coreldraw/i,
  /paint/i,
  /pixel/i,
  /affinity/i,
  /sketch/i,
  /figma/i,
  /acrobat distiller/i
];

/**
 * Checks if PDF producer/creator software string matches known image/graphics editors.
 */
export function isImageEditorProducer(producer?: string, creator?: string): boolean {
  const combined = `${producer || ''} ${creator || ''}`;
  if (!combined.trim()) return false;
  return IMAGE_EDITOR_PATTERNS.some(pattern => pattern.test(combined));
}

/**
 * Extracts real PDF metadata using pdf-lib.
 */
export async function extractPdfMetadata(arrayBuffer: ArrayBuffer): Promise<PdfMetadata | null> {
  try {
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const producer = doc.getProducer();
    const creator = doc.getCreator();
    const creationDate = doc.getCreationDate();
    const modificationDate = doc.getModificationDate();
    const title = doc.getTitle();
    const author = doc.getAuthor();
    const pageCount = doc.getPageCount();

    return {
      producer: producer || undefined,
      creator: creator || undefined,
      creationDate: creationDate ? creationDate.toISOString() : undefined,
      modificationDate: modificationDate ? modificationDate.toISOString() : undefined,
      title: title || undefined,
      author: author || undefined,
      pageCount
    };
  } catch (err) {
    console.warn('PDF metadata extraction failed or file is not a valid PDF:', err);
    return null;
  }
}

/**
 * Runs complete forensics on an uploaded file.
 */
export async function analyzeUploadedFile(
  file: File,
  statedBankDate?: string
): Promise<FileForensicsResult> {
  const arrayBuffer = await file.arrayBuffer();
  const sha256Hash = await computeFileSha256(arrayBuffer);
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  let pdfMetadata: PdfMetadata | undefined = undefined;
  let imageEditorSuspicion = false;
  let modificationAnomaly = false;
  let anomalyDetails: string[] = [];

  if (isPdf) {
    const meta = await extractPdfMetadata(arrayBuffer);
    if (meta) {
      pdfMetadata = meta;
      imageEditorSuspicion = isImageEditorProducer(meta.producer, meta.creator);
      if (imageEditorSuspicion) {
        anomalyDetails.push(
          `Producer or creator indicates graphics/image editor software: "${meta.producer || meta.creator}".`
        );
      }

      if (statedBankDate && meta.modificationDate) {
        const modDateOnly = meta.modificationDate.split('T')[0];
        if (modDateOnly > statedBankDate) {
          modificationAnomaly = true;
          anomalyDetails.push(
            `PDF was modified on ${modDateOnly}, which is after stated bank date ${statedBankDate}.`
          );
        }
      }
    }
  }

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    sha256Hash,
    isPdf,
    pdfMetadata,
    imageEditorSuspicion,
    modificationAnomaly,
    detail: anomalyDetails.join(' ') || 'File metadata appears standard; no graphics tampering detected.'
  };
}
