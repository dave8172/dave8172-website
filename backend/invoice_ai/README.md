# DocTool Backend

FastAPI backend for structured invoice and receipt processing.

This service accepts PDFs and images, extracts embedded text when available, falls back to vision-based OCR for scanned documents, and returns a fixed Pydantic-enforced schema.

## Features

- Upload invoices, receipts, and scanned financial documents
- Embedded-text extraction for digital PDFs
- OCR-style vision fallback for scanned PDFs and images
- Fixed structured output with line items and summary
- Simple processing counter endpoint

## Project Structure

```text
invoice_ai/
├── app/
│   ├── routes/
│   ├── services/
│   ├── config.py
│   ├── main.py
│   └── schemas.py
├── .env.example
├── requirements.txt
└── README.md
```

## Local Run

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

On Windows PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

## Environment Variables

Create `.env` from `.env.example` and set:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## API Endpoints

- `GET /` health check
- `POST /api/upload-invoice` upload a PDF or image document
- `GET /api/processing-stats` get successful processing count

## Deploying To A VPS

Minimal Ubuntu flow:

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx
git clone https://github.com/dave8172/doctool.git
cd doctool
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For production, run it behind `systemd` and `nginx`.

Example `systemd` service:

```ini
[Unit]
Description=DocTool Backend
After=network.target

[Service]
User=root
WorkingDirectory=/opt/doctool
Environment="PYTHONUNBUFFERED=1"
ExecStart=/opt/doctool/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Notes

- Do not commit `.env`
- Do not commit `venv`
- Runtime processing stats are stored locally in `data/`
