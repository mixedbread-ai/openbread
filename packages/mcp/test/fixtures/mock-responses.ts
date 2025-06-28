export const mockVectorStoreSearchResponse = {
  chunks: [
    {
      id: "chunk-1",
      content: "This is a sample chunk",
      score: 0.95,
      metadata: { source: "test-file.txt" },
    },
    {
      id: "chunk-2",
      content: "Another sample chunk",
      score: 0.87,
      metadata: { source: "test-file.txt" },
    },
  ],
  total: 2,
};

export const mockVectorStoreFileSearchResponse = {
  files: [
    {
      id: "file-1",
      name: "test-file.txt",
      score: 0.92,
      chunks: [
        {
          id: "chunk-1",
          content: "File content chunk",
          score: 0.95,
        },
      ],
    },
  ],
  total: 1,
};

export const mockVectorStoreRetrieveResponse = {
  id: "vs-123",
  name: "Test Vector Store",
  description: "A test vector store",
  createdAt: "2024-01-01T00:00:00Z",
  filesCount: 5,
  chunksCount: 150,
};

export const mockVectorStoreListResponse = {
  vectorStores: [
    {
      id: "vs-1",
      name: "Store 1",
      description: "First store",
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "vs-2",
      name: "Store 2",
      description: "Second store",
      createdAt: "2024-01-02T00:00:00Z",
    },
  ],
  total: 2,
  hasMore: false,
};

export const mockVectorStoreCreateResponse = {
  id: "vs-new",
  name: "New Store",
  description: "Newly created store",
  createdAt: "2024-01-01T00:00:00Z",
  filesCount: 0,
  chunksCount: 0,
};

export const mockVectorStoreUploadResponse = {
  id: "file-upload-123",
  name: "uploaded-file.txt",
  size: 1024,
  mimeType: "text/plain",
  uploadedAt: "2024-01-01T00:00:00Z",
};

export const mockVectorStoreFileRetrieveResponse = {
  id: "file-123",
  name: "test-file.txt",
  size: 2048,
  mimeType: "text/plain",
  uploadedAt: "2024-01-01T00:00:00Z",
  chunksCount: 10,
};
