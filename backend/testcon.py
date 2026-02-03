from converter import convert_invoice_to_excel
import pytesseract

pdf_path = r"C:\Users\Asus\Documents\Upwork\temp\sample_invoice_pdf.pdf"
excel_path = r"C:\Users\Asus\Documents\Upwork\temp\output.xlsx"
output = convert_invoice_to_excel(pdf_path, excel_path)

print("Excel created:", output)
