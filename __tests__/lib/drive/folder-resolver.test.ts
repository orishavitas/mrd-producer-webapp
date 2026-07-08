import { jest } from '@jest/globals';

const mockFilesGet = jest.fn();
const mockFilesList = jest.fn();
const mockFilesCreate = jest.fn();

jest.mock('@/lib/drive/drive-client', () => ({
  getDriveClient: () => ({
    files: { get: mockFilesGet, list: mockFilesList, create: mockFilesCreate },
  }),
}));

import { resolveProjectFolder, MASTER_FOLDERS } from '@/lib/drive/folder-resolver';

describe('resolveProjectFolder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the cached folder id if it still exists', async () => {
    mockFilesGet.mockResolvedValue({ data: { id: 'cached-folder-id', trashed: false } });
    const id = await resolveProjectFolder('one-pager', 'Widget', 'cached-folder-id');
    expect(id).toBe('cached-folder-id');
    expect(mockFilesList).not.toHaveBeenCalled();
  });

  it('falls back to search when cached id is trashed', async () => {
    mockFilesGet.mockResolvedValue({ data: { id: 'cached-folder-id', trashed: true } });
    mockFilesList.mockResolvedValue({ data: { files: [{ id: 'found-folder-id', name: 'Widget' }] } });
    const id = await resolveProjectFolder('one-pager', 'Widget', 'cached-folder-id');
    expect(id).toBe('found-folder-id');
    expect(mockFilesList).toHaveBeenCalledWith(
      expect.objectContaining({
        q: expect.stringContaining(MASTER_FOLDERS['one-pager']),
      })
    );
  });

  it('falls back to search when there is no cached id', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [{ id: 'found-folder-id', name: 'Widget' }] } });
    const id = await resolveProjectFolder('prd', 'Widget', null);
    expect(id).toBe('found-folder-id');
    expect(mockFilesGet).not.toHaveBeenCalled();
  });

  it('creates a new folder when search finds nothing', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });
    mockFilesCreate.mockResolvedValue({ data: { id: 'new-folder-id' } });
    const id = await resolveProjectFolder('prd', 'New Product', null);
    expect(id).toBe('new-folder-id');
    expect(mockFilesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          name: 'New Product',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [MASTER_FOLDERS.prd],
        }),
      })
    );
  });
});
