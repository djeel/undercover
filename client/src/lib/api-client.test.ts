import { describe, expect, test, vi } from 'vitest'

import { ApiError, createApiClient } from './api-client'

describe('createApiClient', () => {
  test('reports an explicit configuration error without issuing a request when the API URL is empty', async () => {
    const fetcher = vi.fn()
    const api = createApiClient({ baseUrl: '', getAccessToken: async () => null, fetcher })

    await expect(api.createGame({ language: 'en' })).rejects.toEqual(
      new ApiError('network', 'Online play is unavailable because the game server is not configured.'),
    )
    expect(fetcher).not.toHaveBeenCalled()
  })
})
