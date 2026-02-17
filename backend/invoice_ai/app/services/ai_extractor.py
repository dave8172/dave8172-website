from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

PROMPT = """
Extract structured invoice data as JSON:

{
  "vendor": "",
  "date": "",
  "total": "",
  "tax": "",
  "category": "",
  "insights": ""
}

Invoice text:
"""

async def analyze_invoice(text: str):
    response = client.responses.create(
        model="gpt-5-mini",
        input=PROMPT + text
    )

    return {
        "analysis": response.output_text
    }
