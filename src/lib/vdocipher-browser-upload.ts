const REQUIRED_UPLOAD_FIELDS = [
  'policy',
  'key',
  'x-amz-signature',
  'x-amz-algorithm',
  'x-amz-date',
  'x-amz-credential',
] as const;

type VdoCipherUploadField = (typeof REQUIRED_UPLOAD_FIELDS)[number];

export type VdoCipherBrowserClientPayload = {
  uploadLink?: unknown;
} & Partial<Record<VdoCipherUploadField, unknown>>;

function requireStringField(
  clientPayload: VdoCipherBrowserClientPayload,
  field: 'uploadLink' | VdoCipherUploadField
) {
  const value = clientPayload[field];

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`VdoCipher upload response missing ${field}`);
  }

  return value;
}

export async function uploadFileToVdoCipher(options: {
  file: File;
  clientPayload: VdoCipherBrowserClientPayload;
}) {
  const uploadLink = requireStringField(options.clientPayload, 'uploadLink');
  const formData = new FormData();

  for (const field of REQUIRED_UPLOAD_FIELDS) {
    formData.append(field, requireStringField(options.clientPayload, field));
  }

  formData.append('success_action_status', '201');
  formData.append('success_action_redirect', '');
  formData.append('file', options.file);

  return fetch(uploadLink, {
    method: 'POST',
    body: formData,
  });
}
