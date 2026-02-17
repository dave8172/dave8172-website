from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import invoices

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(invoices.router, prefix="/api")

@app.get("/")
def root():
    return {"status": "running"}
