import { jest } from "@jest/globals";

interface MockMixedbreadClient {
  stores: {
    search: ReturnType<typeof jest.fn>;
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
    stores: {
      search: jest.fn(),
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
  // Reset store mocks
  const storeMocks = [
    mockMixedbreadClient.stores.search,
    mockMixedbreadClient.stores.retrieve,
    mockMixedbreadClient.stores.list,
    mockMixedbreadClient.stores.create,
    mockMixedbreadClient.stores.delete,
    mockMixedbreadClient.stores.uploadFile,
  ];

  storeMocks.forEach((mock) => mock.mockReset());

  // Reset nested file mocks
  const storeFileMocks = [
    mockMixedbreadClient.stores.files.create,
    mockMixedbreadClient.stores.files.retrieve,
    mockMixedbreadClient.stores.files.list,
    mockMixedbreadClient.stores.files.delete,
  ];

  storeFileMocks.forEach((mock) => mock.mockReset());

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
