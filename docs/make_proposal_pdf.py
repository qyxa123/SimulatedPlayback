import sys

def esc(s):
    return s.replace('\\', r'\\').replace('(', r'\(').replace(')', r'\)')

def lines_from_md(path):
    with open(path, 'r', encoding='utf-8') as f:
        raw = f.read().splitlines()
    out = []
    for ln in raw:
        if ln.startswith('# '):
            out.append(ln[2:].strip())
        elif ln.startswith('## '):
            out.append(ln[3:].strip())
        else:
            out.append(ln.strip())
    return out

def make_pdf(lines, out_path):
    objs = []
    def add(obj):
        objs.append(obj)
        return len(objs)
    catalog = add(b"<< /Type /Catalog /Pages 2 0 R >>")
    pages = add(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    font = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    content_lines = []
    content_lines.append("BT")
    content_lines.append("/F1 12 Tf")
    y = 760
    for ln in lines:
        if not ln:
            y -= 12
            continue
        if y < 60:
            break
        txt = esc(ln)
        content_lines.append(f"1 0 0 1 40 {y} Tm ({txt}) Tj")
        y -= 14
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode('latin-1', 'ignore')
    content = add(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
    page = add(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>")
    xref = []
    pdf = []
    pdf.append(b"%PDF-1.4\n")
    off = len(pdf[0])
    for i, obj in enumerate([objs[catalog-1], objs[pages-1], objs[page-1], objs[font-1], objs[content-1]], start=1):
        xref.append(off)
        body = (f"{i} 0 obj\n".encode('ascii') + obj + b"\nendobj\n")
        pdf.append(body)
        off += len(body)
    xref_off = off
    pdf.append(b"xref\n0 6\n")
    pdf.append(b"0000000000 65535 f \n")
    for o in xref:
        pdf.append(f"{o:010d} 00000 n \n".encode('ascii'))
    pdf.append(b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n")
    pdf.append(f"{xref_off}".encode('ascii') + b"\n%%EOF\n")
    with open(out_path, 'wb') as f:
        for part in pdf:
            f.write(part)

if __name__ == '__main__':
    md = sys.argv[1] if len(sys.argv) > 1 else 'docs/proposal.md'
    out = sys.argv[2] if len(sys.argv) > 2 else 'docs/proposal.pdf'
    lines = lines_from_md(md)
    make_pdf(lines, out)
