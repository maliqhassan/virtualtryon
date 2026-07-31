import axios from 'axios';

import { resolveApiBaseUrl } from '@/constants/api-host';

import { attachDeviceIdentity } from './device-identity';

// eslint-disable-next-line import/no-named-as-default-member -- axios.create is the documented API; the rule false-positives on axios's dual export shape.
export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

attachDeviceIdentity(apiClient);
