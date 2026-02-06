import fitz  # PyMuPDF


def extract_layout(path: str):
    doc = fitz.open(path)
    pages = []

    for page in doc:
        blocks = page.get_text("dict")["blocks"]
        elements = []
        for b in blocks:
            if b["type"] == 0:  # text
                for line in b["lines"]:
                    for span in line["spans"]:
                        elements.append(
                            {
                                "type": "text",
                                "text": span["text"],
                                "font": span["font"],
                                "size": span["size"],
                                "color": span["color"],
                                "bbox": span["bbox"],  # [x0, y0, x1, y1]
                            },
                        )
            elif b["type"] == 1:  # image block
                elements.append(
                    {
                        "type": "image",
                        "bbox": b["bbox"],
                    },
                )
        pages.append(
            {
                "width": page.rect.width,
                "height": page.rect.height,
                "elements": elements,
            },
        )
    return pages
