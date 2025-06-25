import { jest } from "@jest/globals";

export const mockMixedbreadClient = {
  vectorStores: {
    search: jest.fn(),
    fileSearch: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    uploadFile: jest.fn(),
    files: {
      retrieve: jest.fn(),
    },
  },
};

export const createMockMixedbreadClient = () => mockMixedbreadClient;

export const resetAllMocks = () => {
  Object.values(mockMixedbreadClient.vectorStores).forEach((mock) => {
    if (typeof mock === "function" && "mockReset" in mock) {
      (mock as jest.MockedFunction<unknown>).mockReset();
    }
  });
  if ("mockReset" in mockMixedbreadClient.vectorStores.files.retrieve) {
    (
      mockMixedbreadClient.vectorStores.files
        .retrieve as jest.MockedFunction<unknown>
    ).mockReset();
  }
};
