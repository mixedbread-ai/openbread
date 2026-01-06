import type Mixedbread from "@mixedbread/sdk";
import { getStoreFiles } from "./store";

export interface FileSyncMetadata {
  file_path: string;
  file_hash: string;
  git_commit?: string;
  git_branch?: string;
  uploaded_at: string;
  synced: boolean;
}

export type SyncedFileEntry = {
  fileId: string;
  metadata: FileSyncMetadata;
  externalId?: string;
};

export type SyncedFileByPath = Map<string, SyncedFileEntry>;

/**
 * Get all synced files from store
 */
export async function getSyncedFiles(
  client: Mixedbread,
  storeIdentifier: string
): Promise<SyncedFileByPath> {
  const syncedFiles: SyncedFileByPath = new Map();

  try {
    const storeFiles = await getStoreFiles(client, storeIdentifier);

    for (const file of storeFiles) {
      // Check if file has sync metadata
      const metadata = file.metadata as FileSyncMetadata;
      if (metadata && metadata.synced === true && metadata.file_path) {
        syncedFiles.set(metadata.file_path, {
          fileId: file.id,
          metadata,
          externalId: file.external_id,
        });
      }
    }

    return syncedFiles;
  } catch (error) {
    throw new Error(`Failed to get synced files: ${error}`);
  }
}

/**
 * Build file sync metadata
 */
export function buildFileSyncMetadata(
  filePath: string,
  fileHash: string,
  gitInfo?: { commit: string; branch: string }
): FileSyncMetadata {
  const metadata: FileSyncMetadata = {
    file_path: filePath,
    file_hash: fileHash,
    uploaded_at: new Date().toISOString(),
    synced: true,
  };

  if (gitInfo) {
    metadata.git_commit = gitInfo.commit;
    metadata.git_branch = gitInfo.branch;
  }

  return metadata;
}
