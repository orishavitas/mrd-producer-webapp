import { jest } from '@jest/globals';

const mockFile = {
  exists: jest.fn(),
  download: jest.fn(),
  save: jest.fn(),
  getMetadata: jest.fn(),
};
const mockBucket = {
  file: jest.fn(() => mockFile),
  getFiles: jest.fn(),
};
const mockStorage = {
  bucket: jest.fn(() => mockBucket),
};

jest.mock('@/lib/gcs/gcs-client', () => ({
  getStorageClient: () => mockStorage,
}));

process.env.GCS_BUCKET_NAME = 'test-bucket';

import {
  getDocumentEnvelope,
  createDocumentEnvelope,
  saveDocumentEnvelope,
  GenerationConflictError,
} from '@/lib/gcs/documents';

describe('getDocumentEnvelope', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when file does not exist', async () => {
    mockFile.exists.mockResolvedValue([false]);
    const result = await getDocumentEnvelope('one-pager', 'abc-123');
    expect(result).toBeNull();
    expect(mockBucket.file).toHaveBeenCalledWith('one-pager/abc-123.json');
  });

  it('parses and returns the envelope when file exists', async () => {
    const envelope = {
      id: 'abc-123',
      toolType: 'one-pager',
      productName: 'Widget',
      userId: 'u@x.com',
      creatorName: null,
      creatorEmail: null,
      status: 'draft',
      version: '0.1',
      contentJson: { foo: 'bar' },
      versionHistory: [],
      driveFolderId: null,
      deletedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    mockFile.exists.mockResolvedValue([true]);
    mockFile.download.mockResolvedValue([Buffer.from(JSON.stringify(envelope))]);
    const result = await getDocumentEnvelope('one-pager', 'abc-123');
    expect(result).toEqual(envelope);
  });
});

describe('createDocumentEnvelope', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new envelope with version 0.1 and saves it to GCS', async () => {
    mockFile.save.mockResolvedValue(undefined);
    const result = await createDocumentEnvelope({
      toolType: 'one-pager',
      productName: 'Widget',
      userId: 'u@x.com',
      contentJson: { foo: 'bar' },
    });
    expect(result.version).toBe('0.1');
    expect(result.status).toBe('draft');
    expect(result.productName).toBe('Widget');
    expect(typeof result.id).toBe('string');
    expect(mockFile.save).toHaveBeenCalled();
  });
});

describe('saveDocumentEnvelope', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes with ifGenerationMatch precondition using cached metageneration', async () => {
    mockFile.getMetadata.mockResolvedValue([{ generation: '42' }]);
    mockFile.save.mockResolvedValue(undefined);
    const envelope = {
      id: 'abc-123', toolType: 'one-pager' as const, productName: 'Widget',
      userId: 'u@x.com', creatorName: null, creatorEmail: null,
      status: 'draft' as const, version: '0.2', contentJson: {}, versionHistory: [],
      driveFolderId: null, deletedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await saveDocumentEnvelope(envelope);
    expect(mockFile.save).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ preconditionOpts: expect.objectContaining({ ifGenerationMatch: 42 }) })
    );
  });

  it('throws GenerationConflictError on a 412 precondition failure', async () => {
    mockFile.getMetadata.mockResolvedValue([{ generation: '42' }]);
    const preconditionError = Object.assign(new Error('failed precondition'), { code: 412 });
    mockFile.save.mockRejectedValue(preconditionError);
    const envelope = {
      id: 'abc-123', toolType: 'one-pager' as const, productName: 'Widget',
      userId: 'u@x.com', creatorName: null, creatorEmail: null,
      status: 'draft' as const, version: '0.2', contentJson: {}, versionHistory: [],
      driveFolderId: null, deletedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await expect(saveDocumentEnvelope(envelope)).rejects.toThrow(GenerationConflictError);
  });
});
