from __future__ import annotations

import asyncio

from openai import OpenAI
from app.config import settings
from app.schemas import InvoiceExtraction
from app.services.pdf_parser import PreparedDocument

# Let the SDK read OPENAI_API_KEY from the environment instead of
# threading the secret through application code.
client = OpenAI()

INSTRUCTIONS = """
You extract structured data from invoices, receipts, and similar financial documents.

Return only the fixed schema provided by the application.

Rules:
- Use empty strings for missing scalar fields.
- Use an empty list for missing line items.
- Set document_type to exactly one of: invoice, receipt, other.
- Set processing_mode to exactly the mode supplied in the prompt.
- summary is the only place for unstructured information. Keep it concise and factual.
- Do not invent missing values. If the document is unclear, leave the field blank.
- Preserve visible currency symbols or codes in total-related fields when available.
- category should be a short business-spend label such as Travel, Meals, Utilities, Software, Office Supplies, or Other.
- For line items, extract individual rows only when they are clearly visible.
"""


async def analyze_invoice(document: PreparedDocument) -> InvoiceExtraction:
    response = await asyncio.to_thread(
        client.responses.parse,
        model=settings.OPENAI_MODEL,
        instructions=INSTRUCTIONS,
        input=_build_input(document),
        text_format=InvoiceExtraction,
        max_output_tokens=1500,
        store=False,
    )

    if response.output_parsed is None:
        raise ValueError("The model did not return a structured extraction result.")

    return response.output_parsed


def _build_input(document: PreparedDocument) -> list[dict]:
    base_prompt = (
        f"Filename: {document.filename}\n"
        f"Processing mode: {document.processing_mode}\n"
        "Extract the document into the fixed schema."
    )

    if document.processing_mode == "embedded_text":
        return [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            f"{base_prompt}\n"
                            "The following text was extracted directly from the PDF:\n\n"
                            f"{document.extracted_text}"
                        ),
                    }
                ],
            }
        ]

    content = [
        {
            "type": "input_text",
            "text": (
                f"{base_prompt}\n"
                "This file appears to be image-based or scanned. "
                "Use the page images to read the document and extract the schema."
            ),
        }
    ]

    for image_url in document.page_images:
        content.append(
            {
                "type": "input_image",
                "image_url": image_url,
                "detail": "auto",
            }
        )

    return [{"role": "user", "content": content}]
