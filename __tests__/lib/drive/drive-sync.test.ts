import { jest } from '@jest/globals';

const mockResolveProjectFolder = jest.fn();
jest.mock('@/lib/drive/folder-resolver', () => ({
  resolveProjectFolder: (...args: unknown[]) => mockResolveProjectFolder(...args),
  MASTER_FOLDERS: { 'one-pager': 'mp-op', prd: 'mp-prd' },
}));

const mockFilesList = jest.fn();
const mockFilesCreate = jest.fn();
const mockFilesUpdate = jest.fn();
const mockFilesGet = jest.fn();
jest.mock('@/lib/drive/drive-client', () => ({
  getDriveClient: () => ({
    files: { list: mockFilesList, create: mockFilesCreate, update: mockFilesUpdate, get: mockFilesGet },
  }),
}));

import { saveDocumentToDrive } from '@/lib/drive/drive-sync';

const baseEnvelope = {
  id: 'doc-1',
  toolType: 'one-pager' as const,
  productName: 'Widget',
  version: '0.2',
  status: 'draft' as const,
  contentJson: { foo: 'bar' },
  driveFolderId: null,
};

describe('saveDocumentToDrive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveProjectFolder.mockResolvedValue('resolved-folder-id');
    mockFilesList.mockResolvedValue({ data: { files: [] } }); // no existing changelog
    mockFilesCreate.mockResolvedValue({ data: { id: 'new-file-id' } });
  });

  it('resolves the folder and uploads a versioned docx export without overwriting', async () => {
    const result = await saveDocumentToDrive(
      baseEnvelope,
      { docx: Buffer.from('docx-bytes') },
      'Initial save',
      'ori@compulocks.com'
    );
    expect(result.ok).toBe(true);
    expect(result.driveFolderId).toBe('resolved-folder-id');
    const docxCall = mockFilesCreate.mock.calls.find((c) =>
      (c[0].requestBody.name as string).endsWith('.docx')
    );
    expect(docxCall).toBeDefined();
    expect(docxCall![0].requestBody.name).toContain('Widget');
    expect(docxCall![0].requestBody.name).toContain('v0.2');
  });

  it('overwrites the existing JSON clone in place instead of creating a new one', async () => {
    mockFilesList.mockImplementation(({ q }: { q: string }) => {
      if (q.includes('.json')) {
        return Promise.resolve({ data: { files: [{ id: 'existing-json-id', name: 'Widget.json' }] } });
      }
      return Promise.resolve({ data: { files: [] } });
    });
    await saveDocumentToDrive(baseEnvelope, {}, 'Update', 'ori@compulocks.com');
    expect(mockFilesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 'existing-json-id' })
    );
    const jsonCreateCall = mockFilesCreate.mock.calls.find((c) =>
      (c[0].requestBody.name as string).endsWith('.json')
    );
    expect(jsonCreateCall).toBeUndefined();
  });

  it('appends to an existing changelog rather than replacing it', async () => {
    mockFilesList.mockImplementation(({ q }: { q: string }) => {
      if (q.includes('Changelog')) {
        return Promise.resolve({ data: { files: [{ id: 'changelog-id', name: 'Widget - Changelog.md' }] } });
      }
      return Promise.resolve({ data: { files: [] } });
    });
    mockFilesGet.mockResolvedValue({ data: '## v0.1 — existing entry\n' });
    await saveDocumentToDrive(baseEnvelope, {}, 'Second save', 'ori@compulocks.com');
    expect(mockFilesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'changelog-id',
        media: expect.objectContaining({
          body: expect.stringContaining('existing entry'),
        }),
      })
    );
  });

  it('returns ok: false with an error message when a Drive call throws, without throwing itself', async () => {
    mockResolveProjectFolder.mockRejectedValue(new Error('Drive unreachable'));
    const result = await saveDocumentToDrive(baseEnvelope, {}, 'Save', 'ori@compulocks.com');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Drive unreachable');
  });
});
