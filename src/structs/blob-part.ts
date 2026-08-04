export function ToBlobPart(data: Uint8Array | string): BlobPart {
  return typeof data === "string" ? data : (data as unknown as BlobPart);
}
