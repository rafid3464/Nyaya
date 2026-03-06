"""
Nyaya Legal AI - FastAPI Inference Server v2.0
"""

import os
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoConfig, pipeline as hf_pipeline

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
MAX_NEW_TOKENS = 512
PORT = 8001

SYSTEM_PROMPT = """You are NyayaAI, an expert AI legal assistant specialized exclusively in Indian law.

CRIMINAL LAW (BNS 2023):
- Section 303: Theft | Section 304: Snatching (non-bailable) | Section 316: Criminal Breach of Trust
- Section 317: Receiving Stolen Property | Section 318: Cheating | Section 329: Criminal Trespass
- Section 351: Criminal Intimidation | Section 75: Sexual Harassment | Section 85: Cruelty by Husband
- Section 106: Death by Negligence | Section 281: Rash Driving | Section 292: Public Nuisance

BNSS 2023: Section 35 (Arrest), Section 36 (Grounds), Section 47 (Bail), Section 173 (FIR - mandatory per Lalita Kumari), Section 175 (Magistrate can order FIR)
BSA 2023: Section 23 (Coerced confession inadmissible), Section 63 (Electronic evidence)

CYBER: IT Act Section 66/66C/66D/66E/67 | cybercrime.gov.in | Helpline 1930
CONSUMER: Consumer Protection Act 2019 | edaakhil.nic.in | Helpline 1800-11-4000
PROPERTY: Indian Contract Act 1872 | Transfer of Property Act 1882 | RERA 2016
FAMILY: Hindu Marriage Act 1955 | DV Act 2005 | POSH Act 2013 | Women Helpline 181
MOTOR: MV Act 1988 | BAC 30mg/100ml | MACT | Hit-run: Rs.2L death, Rs.50K injury
LABOUR: Payment of Wages 1936 | Industrial Disputes 1947 | EPF 1952

PORTALS: ceir.sancharsaathi.gov.in | rtionline.gov.in | nalsa.gov.in (15100) | ecourts.gov.in | cms.rbi.org.in

RESPONSE FORMAT:
1. Relevant Indian Laws (BNS 2023) - List sections, penalties
2. Immediate Legal & Technical Steps - Step A, B, C with portals, helplines, timelines
3. Summary Table: | Action | Purpose | Legal Basis | (min 5 rows)
End with disclaimer."""

app = FastAPI(title="Nyaya Legal AI Server", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

pipe = None


class AskRequest(BaseModel):
    question: str
    context: str = ""


class AskResponse(BaseModel):
    answer: str


def load_model():
    global pipe
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[INFO] Device: {device}")

    print(f"[INFO] Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)

    print(f"[INFO] Loading model...")
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
    )
    if device == "cuda":
        model = model.to("cuda:0")
    model.eval()

    print(f"[INFO] Creating pipeline...")
    pipe = hf_pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
    )
    print("[INFO] Model loaded and ready!")


def generate_response(question: str, context: str = "") -> str:
    user_text = question
    if context and context.strip():
        user_text += "\\n\\nDocument Context:\\n" + context[:6000]

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_text},
    ]

    outputs = pipe(messages, max_new_tokens=MAX_NEW_TOKENS, temperature=0.7, top_p=0.9, do_sample=True, repetition_penalty=1.15)
    return outputs[0]["generated_text"][-1]["content"].strip()


@app.on_event("startup")
async def startup_event():
    print("\\n" + "=" * 60)
    print("  Nyaya Legal AI Server v2.0")
    print("=" * 60 + "\\n")
    load_model()


@app.post("/ask", response_model=AskResponse)
async def ask_legal_question(request: AskRequest):
    if not request.question.strip():
        return AskResponse(answer="Please provide a legal question.")
    try:
        answer = generate_response(request.question, request.context)
        return AskResponse(answer=answer or "Could not generate. Please rephrase.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        return AskResponse(answer=f"Error: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "ok", "model": BASE_MODEL, "device": "cuda" if torch.cuda.is_available() else "cpu"}


if __name__ == "__main__":
    import uvicorn
    print(f"Starting on http://localhost:{PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
