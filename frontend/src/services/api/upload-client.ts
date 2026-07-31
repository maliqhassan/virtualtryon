import axios from 'axios';

import { resolveApiBaseUrl } from '@/constants/api-host';

import { attachDeviceIdentity } from './device-identity';

/**
 * Separate from `apiClient` on purpose: that instance defaults to
 * `Content-Type: application/json`, which is wrong for multipart uploads —
 * the correct header (with its boundary) must be auto-generated per-request
 * by the platform when it sees a `FormData` body, not fixed in advance.
 * Uploads also warrant a longer timeout than typical JSON requests.
 */
// eslint-disable-next-line import/no-named-as-default-member -- axios.create is the documented API; the rule false-positives on axios's dual export shape.
export const uploadClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 60_000,
});

attachDeviceIdentity(uploadClient);
