import pdfplumber
import io

async def extract_text(file):
    content = await file.read()

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        text = "\n".join(
            page.extract_text() or ""
            for page in pdf.pages
        )

    return text
