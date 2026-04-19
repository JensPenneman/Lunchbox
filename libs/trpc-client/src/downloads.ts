'use client';

export function downloadAsFile(params: {
  content: string;
  filename: string;
  contentType?: string;
}) {
  const blob = new Blob([params.content], {
    type: params.contentType ?? 'application/octet-stream',
  });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = params.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
