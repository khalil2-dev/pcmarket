// =========================================================
// API CONFIGURATION
// =========================================================

// Spring Boot backend deployed on Render
// Local: http://localhost:8080/backend
// Production: https://pcmarket-yq2x.onrender.com/backend
export const API_URL = 'https://pcmarket-yq2x.onrender.com/backend';

// =========================================================
// IMAGES
// =========================================================

// Uploaded images are served by Spring Boot at:
// /backend/images/<filename>
export const IMAGES_URL = `${API_URL}/images`;

// =========================================================
// UPLOAD LIMITS
// =========================================================

// Maximum size for one image: 2 MB
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

// Maximum total upload size per request: 20 MB
export const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

// Allowed image formats
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png'
];

// =========================================================
// IMAGE URL HELPER
// =========================================================

export function imageUrl(file: string | null | undefined): string {
  return file ? `${IMAGES_URL}/${file}` : '';
}