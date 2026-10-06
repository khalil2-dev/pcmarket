// Spring Boot backend (see pcmarket-backend/src/main/resources/application.properties)
//   server.port=8080
//   server.servlet.context-path=/backend
export const API_URL = 'http://localhost:8008/backend';

// Uploaded images are served by WebConfig at /backend/images/<file>
export const IMAGES_URL = `${API_URL}/images`;

// Same limits as ImageStorage.java / application.properties
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;       // 2 MB per image
export const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;     // 20 MB per request
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

export function imageUrl(file: string | null | undefined): string {
  return file ? `${IMAGES_URL}/${file}` : '';
}
