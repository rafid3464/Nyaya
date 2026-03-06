"""
Nyaya Legal AI - LoRA Fine-Tuning Script
Fine-tunes microsoft/phi-3-mini-4k-instruct on Indian legal Q&A dataset
using PEFT LoRA for parameter-efficient training.

Usage:
    python train_model.py
"""

import json
import os
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForSeq2Seq,
)
from peft import LoraConfig, get_peft_model, TaskType
from datasets import Dataset

# -- Configuration --
BASE_MODEL = "microsoft/phi-3-mini-4k-instruct"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(SCRIPT_DIR, "dataset", "legal_dataset.json")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "trained_model")
MAX_LENGTH = 2048
EPOCHS = 3
BATCH_SIZE = 1
LEARNING_RATE = 2e-4
LORA_RANK = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05

SYSTEM_PROMPT = "\n".join([
    "You are Nyaya, an AI legal assistant specialized in Indian law.",
    "",
    "Always answer using this format:",
    "",
    "1. Relevant Indian Laws",
    "2. Legal Explanation",
    "3. Immediate Legal Steps",
    "4. Technical or Safety Steps",
    "5. Summary Table",
    "",
    "Provide detailed, structured, and helpful legal guidance."
])

SYS_OPEN = "<" + "|system|" + ">"
SYS_CLOSE = "<" + "|end|" + ">"
USR_OPEN = "<" + "|user|" + ">"
ASST_OPEN = "<" + "|assistant|" + ">"


def format_prompt(instruction, output=None):
    """Format a single training example into the chat template."""
    parts = [
        SYS_OPEN, "\n", SYSTEM_PROMPT, SYS_CLOSE, "\n",
        USR_OPEN, "\n", instruction, SYS_CLOSE, "\n",
        ASST_OPEN, "\n",
    ]
    if output:
        parts.append(output)
        parts.append(SYS_CLOSE)
        parts.append("\n")
    return "".join(parts)


def tokenize_example(example, tokenizer):
    """Tokenize a single formatted example."""
    full_text = format_prompt(example["instruction"], example["output"])
    tokenized = tokenizer(
        full_text,
        truncation=True,
        max_length=MAX_LENGTH,
        padding="max_length",
        return_tensors=None,
    )
    tokenized["labels"] = tokenized["input_ids"].copy()
    return tokenized


def main():
    print("=" * 60)
    print("  Nyaya Legal AI - Model Training")
    print("=" * 60)

    # Detect device
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n[INFO] Device: {device}")
    if device == "cuda":
        print(f"[INFO] GPU: {torch.cuda.get_device_name(0)}")
        print(f"[INFO] VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")
    else:
        print("[WARN] No GPU detected. Training on CPU will be slow.")
        print("[WARN] For faster training, use a CUDA-compatible GPU.\n")

    # Load dataset
    print(f"[INFO] Loading dataset from: {DATASET_PATH}")
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
    print(f"[INFO] Loaded {len(raw_data)} training examples")

    # Load tokenizer
    print(f"\n[INFO] Loading tokenizer: {BASE_MODEL}")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.pad_token_id = tokenizer.eos_token_id

    # Load base model
    print(f"[INFO] Loading base model: {BASE_MODEL}")
    print("[INFO] This may take a few minutes on first run (downloading ~7GB)...")
    from transformers import AutoConfig
    config = AutoConfig.from_pretrained(BASE_MODEL, trust_remote_code=True)
    # Fix phi-3 rope_scaling compatibility with newer transformers
    if hasattr(config, 'rope_scaling') and config.rope_scaling:
        config.rope_scaling = None
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        config=config,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        trust_remote_code=True,
        device_map="auto" if device == "cuda" else None,
        attn_implementation="eager",
    )

    # Configure LoRA
    print(f"\n[INFO] Configuring LoRA (rank={LORA_RANK}, alpha={LORA_ALPHA})")
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=LORA_RANK,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Prepare dataset
    print("\n[INFO] Tokenizing dataset...")
    dataset = Dataset.from_list(raw_data)
    tokenized_dataset = dataset.map(
        lambda ex: tokenize_example(ex, tokenizer),
        remove_columns=dataset.column_names,
    )

    # Data collator
    data_collator = DataCollatorForSeq2Seq(
        tokenizer=tokenizer,
        padding=True,
        return_tensors="pt",
    )

    # Training arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=4,
        learning_rate=LEARNING_RATE,
        weight_decay=0.01,
        warmup_steps=10,
        logging_steps=5,
        save_strategy="epoch",
        fp16=(device == "cuda"),
        report_to="none",
        remove_unused_columns=False,
        dataloader_pin_memory=False,
    )

    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )

    # Train
    print("\n" + "=" * 60)
    print("  Starting LoRA Fine-Tuning...")
    print("=" * 60 + "\n")
    trainer.train()

    # Save
    print(f"\n[INFO] Saving trained LoRA adapter to: {OUTPUT_DIR}")
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    print("\n" + "=" * 60)
    print("  Training Complete!")
    print(f"  Model saved to: {OUTPUT_DIR}")
    print("  Run 'python inference_server.py' to start the API server.")
    print("=" * 60)


if __name__ == "__main__":
    main()
