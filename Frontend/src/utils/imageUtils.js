import { API_BASE_URL } from "@/services/api";

/**
 * Standardizes profile picture URL handling.
 * Handles absolute S3 URLs, relative development paths, and legacy Cloudinary defaults.
 * 
 * @param {string} path - The profile picture path or URL from the API.
 * @returns {string|null} - The formatted URL or null if no valid image is found.
 */
export const getProfileImageUrl = (path) => {
    if (!path) return null;

    // If it's already an absolute URL (S3, etc.)
    if (path.startsWith("http")) {
        return path;
    }

    // If it's a relative path, prepend API_BASE_URL
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
};
