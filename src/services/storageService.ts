import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from 'firebase/storage';
import { storage } from '../config/firebase';

class StorageService {
  // Upload file to Firebase Storage
  async uploadFile(
    file: File,
    path: string
  ): Promise<{ url: string; path: string; originalName: string }> {
    try {
      // Create a storage reference
      const timestamp = Date.now();
      // Encode filename to handle Korean and other Unicode characters
      const safeFileName = encodeURIComponent(file.name);
      const fileName = `${timestamp}_${safeFileName}`;
      const storageRef = ref(storage, `${path}/${fileName}`);
      
      // Upload the file with metadata including original name
      const metadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name
        }
      };
      const snapshot = await uploadBytes(storageRef, file, metadata);
      
      // Get the download URL
      const url = await getDownloadURL(snapshot.ref);
      
      return {
        url,
        path: snapshot.ref.fullPath,
        originalName: file.name
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Upload chat attachment
  async uploadChatAttachment(
    file: File,
    workspaceId: string,
    channelId: string
  ): Promise<{ url: string; path: string; originalName: string }> {
    const basePath = `workspaces/${workspaceId}/channels/${channelId}`;
    const subPath = file.type.startsWith('image/') ? 'images' : 'attachments';
    const fullPath = `${basePath}/${subPath}`;
    
    return this.uploadFile(file, fullPath);
  }

  // Upload multiple files
  async uploadMultipleFiles(
    files: File[],
    workspaceId: string,
    channelId: string
  ): Promise<Array<{ url: string; path: string; originalName: string; file: File }>> {
    const uploadPromises = files.map(file => 
      this.uploadChatAttachment(file, workspaceId, channelId)
        .then(result => ({ ...result, file }))
    );
    
    return Promise.all(uploadPromises);
  }

  // Delete file from storage
  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Generate thumbnail URL for images
  getThumbnailUrl(originalUrl: string): string {
    // Firebase Storage doesn't automatically generate thumbnails
    // This would require Cloud Functions or a third-party service
    // For now, return the original URL
    return originalUrl;
  }

  // Get file metadata
  async getFileMetadata(url: string): Promise<{
    size?: number;
    contentType?: string;
    created?: Date;
  }> {
    // This would require additional Firebase Storage API calls
    // For now, return basic metadata
    return {
      created: new Date()
    };
  }
}

const storageService = new StorageService();
export default storageService;