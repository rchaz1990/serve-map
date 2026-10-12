import sharp from 'sharp'

// Server-side sanitising of an uploaded verification image (the browser's re-encoding can be
// bypassed by uploading straight to the signed URL). Decodes the image, applies EXIF orientation,
// re-encodes it and writes pixels only: no EXIF, XMP, ICC, IPTC, comments, text chunks or
// trailing data survive. Anything that cannot be decoded within the limits is refused.

export const MAX_SIDE = 3000
export const MAX_INPUT_PIXELS = MAX_SIDE * MAX_SIDE // refuses decompression bombs before decoding

export type SanitizeResult =
  | { ok: true; bytes: Buffer }
  | { ok: false; reason: 'unreadable' | 'unsupported' }

export async function sanitizeImage(input: Uint8Array, target: 'image/jpeg' | 'image/png'): Promise<SanitizeResult> {
  const buf = Buffer.from(input)
  let meta: sharp.Metadata
  try {
    meta = await sharp(buf, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' }).metadata()
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  if (meta.format !== 'jpeg' && meta.format !== 'png') return { ok: false, reason: 'unsupported' }
  if ((meta.pages ?? 1) > 1) return { ok: false, reason: 'unsupported' }
  if (!meta.width || !meta.height || meta.width > MAX_SIDE || meta.height > MAX_SIDE) return { ok: false, reason: 'unsupported' }

  let out: Buffer
  try {
    const pipeline = sharp(buf, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
      .rotate() // apply EXIF orientation to the pixels (EXIF itself is not written)
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    // No withMetadata / keepMetadata / keepIccProfile: sharp writes no metadata by default.
    out = target === 'image/png'
      ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
      : await pipeline.jpeg({ quality: 90 }).toBuffer()
  } catch {
    return { ok: false, reason: 'unreadable' }
  }

  // Fail closed if anything other than pixels made it into the output.
  try {
    const check = await sharp(out).metadata()
    if (check.exif || check.icc || check.xmp || check.iptc || (check.comments && check.comments.length)) {
      return { ok: false, reason: 'unreadable' }
    }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  return { ok: true, bytes: out }
}
