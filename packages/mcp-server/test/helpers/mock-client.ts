import { jest } from "@jest/globals";

interface MockMixedbreadClient {
  vectorStores: {
    search: ReturnType<typeof jest.fn>;
    fileSearch: ReturnType<typeof jest.fn>;
    retrieve: ReturnType<typeof jest.fn>;
    list: ReturnType<typeof jest.fn>;
    create: ReturnType<typeof jest.fn>;
    delete: ReturnType<typeof jest.fn>;
    uploadFile: ReturnType<typeof jest.fn>;
    files: {
      create: ReturnType<typeof jest.fn>;
      retrieve: ReturnType<typeof jest.fn>;
      list: ReturnType<typeof jest.fn>;
      delete: ReturnType<typeof jest.fn>;
    };
  };
  files: {
    create: ReturnType<typeof jest.fn>;
    retrieve: ReturnType<typeof jest.fn>;
    list: ReturnType<typeof jest.fn>;
    delete: ReturnType<typeof jest.fn>;
  };
  embeddings: {
    create: ReturnType<typeof jest.fn>;
  };
}

/**
 * Create a mock Mixedbread SDK client with common methods
 */
export function createMockMixedbreadClient(): MockMixedbreadClient {
  return {
    vectorStores: {
      search: jest.fn(),
      fileSearch: jest.fn(),
      retrieve: jest.fn(),
      list: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      uploadFile: jest.fn(),
      files: {
        create: jest.fn(),
        retrieve: jest.fn(),
        list: jest.fn(),
        delete: jest.fn(),
      },
    },
    files: {
      create: jest.fn(),
      retrieve: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
    },
    embeddings: {
      create: jest.fn(),
    },
  };
}

export const mockMixedbreadClient: MockMixedbreadClient =
  createMockMixedbreadClient();

export const resetAllMocks = () => {
  // Reset vector store mocks
  const vectorStoreMocks = [
    mockMixedbreadClient.vectorStores.search,
    mockMixedbreadClient.vectorStores.fileSearch,
    mockMixedbreadClient.vectorStores.retrieve,
    mockMixedbreadClient.vectorStores.list,
    mockMixedbreadClient.vectorStores.create,
    mockMixedbreadClient.vectorStores.delete,
    mockMixedbreadClient.vectorStores.uploadFile,
  ];

  vectorStoreMocks.forEach((mock) => mock.mockReset());

  // Reset nested file mocks
  const vectorStoreFileMocks = [
    mockMixedbreadClient.vectorStores.files.create,
    mockMixedbreadClient.vectorStores.files.retrieve,
    mockMixedbreadClient.vectorStores.files.list,
    mockMixedbreadClient.vectorStores.files.delete,
  ];

  vectorStoreFileMocks.forEach((mock) => mock.mockReset());

  // Reset top-level file mocks
  const fileMocks = [
    mockMixedbreadClient.files.create,
    mockMixedbreadClient.files.retrieve,
    mockMixedbreadClient.files.list,
    mockMixedbreadClient.files.delete,
  ];

  fileMocks.forEach((mock) => mock.mockReset());

  // Reset embeddings mocks
  mockMixedbreadClient.embeddings.create.mockReset();
};
