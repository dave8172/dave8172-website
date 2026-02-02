# backend/converter.py
import pandas as pd
import pytesseract
from pdf2image import convert_from_path

def pdf_to_excel(pdf_file_path: str, output_excel_path: str):
    images = convert_from_path(pdf_file_path)
    all_text = []

    for page_number, image in enumerate(images):
        text = pytesseract.image_to_string(image)
        # For simplicity, split lines and put in Excel
        lines = text.split("\n")
        page_data = {"Page": [], "Text": []}
        for line in lines:
            if line.strip():
                page_data["Page"].append(page_number + 1)
                page_data["Text"].append(line.strip())
        df = pd.DataFrame(page_data)
        all_text.append(df)

    final_df = pd.concat(all_text, ignore_index=True)
    final_df.to_excel(output_excel_path, index=False)
    return output_excel_path
