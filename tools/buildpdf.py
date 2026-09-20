#!/usr/bin/env python3
"""Assemble a directory of page JPEGs into a PDF, embedding them as DCTDecode
streams so they stay JPEG-compressed (CoreGraphics would re-encode to Flate,
which is far larger for this artwork).

Usage: buildpdf.py <jpegDir> <out.pdf> <pageWidthPt> <pageHeightPt>
"""
import sys, os, struct, glob


def jpeg_size(path):
    """Read width/height from the JPEG SOF marker."""
    with open(path, 'rb') as f:
        d = f.read()
    i = 2
    while i < len(d):
        if d[i] != 0xFF:
            i += 1
            continue
        marker = d[i + 1]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                      0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            h, w = struct.unpack('>HH', d[i + 5:i + 9])
            return w, h
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        seglen = struct.unpack('>H', d[i + 2:i + 4])[0]
        i += 2 + seglen
    raise ValueError(f'no SOF marker in {path}')


def main():
    jdir, out = sys.argv[1], sys.argv[2]
    pw, ph = float(sys.argv[3]), float(sys.argv[4])
    pages = sorted(glob.glob(os.path.join(jdir, '*.jpg')))
    if not pages:
        sys.exit('no jpegs found')

    objs = {}          # number -> bytes
    n_pages = len(pages)
    # 1 catalog, 2 pages tree, then 3 objects per page
    page_ids = [3 + i * 3 for i in range(n_pages)]

    objs[1] = b'<< /Type /Catalog /Pages 2 0 R >>'
    kids = b' '.join(b'%d 0 R' % p for p in page_ids)
    objs[2] = b'<< /Type /Pages /Kids [' + kids + b'] /Count %d >>' % n_pages

    for i, jp in enumerate(pages):
        pid = page_ids[i]
        cid, iid = pid + 1, pid + 2
        w, h = jpeg_size(jp)
        data = open(jp, 'rb').read()

        objs[pid] = (
            b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] '
            b'/Resources << /XObject << /Im0 %d 0 R >> >> /Contents %d 0 R >>'
            % (pw, ph, iid, cid))

        content = b'q %.2f 0 0 %.2f 0 0 cm /Im0 Do Q' % (pw, ph)
        objs[cid] = (b'<< /Length %d >>\nstream\n' % len(content)
                     + content + b'\nendstream')

        objs[iid] = (
            b'<< /Type /XObject /Subtype /Image /Width %d /Height %d '
            b'/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode '
            b'/Length %d >>\nstream\n' % (w, h, len(data))
            + data + b'\nendstream')

    buf = bytearray(b'%PDF-1.7\n%\xe2\xe3\xcf\xd3\n')
    offsets = {}
    for num in sorted(objs):
        offsets[num] = len(buf)
        buf += b'%d 0 obj\n' % num + objs[num] + b'\nendobj\n'

    xref_pos = len(buf)
    maxobj = max(objs) + 1
    buf += b'xref\n0 %d\n' % maxobj
    buf += b'0000000000 65535 f \n'
    for num in range(1, maxobj):
        if num in offsets:
            buf += b'%010d 00000 n \n' % offsets[num]
        else:
            buf += b'0000000000 65535 f \n'
    buf += (b'trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n'
            % (maxobj, xref_pos))

    open(out, 'wb').write(bytes(buf))
    print(f'{out}: {n_pages} pages, {len(buf)/1048576:.2f} MB')


if __name__ == '__main__':
    main()
