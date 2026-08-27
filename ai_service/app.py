import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoModelForSequenceClassification, AutoTokenizer
import torch
import torch.nn.functional as F

app = FastAPI(title="MindMate 100% Offline Hybrid AI Engine")

# ==============================================================================
# 1. DETERMINISTIC CRISIS GUARDRAIL PATTERNS

CRISIS_PATTERNS = [
    r"\b(ending my life|end my life|suicide|kill myself|want to die|take my own life|self-harm|hurt myself|hanging myself)\b",
    r"\b(hopeless and feel like ending|no reason to live|better off dead|dying tonight)\b"
]

def check_crisis_guardrail(text: str) -> bool:
    text_lower = text.lower()
    for pattern in CRISIS_PATTERNS:
        if re.search(pattern, text_lower):
            return True
    return False

# ==============================================================================
# 2. LOCAL MODELS LOAD ( Offline PyTorch & TinyLlama)

try:
    print("Loading Models... Please wait...")
    
    # A. Custom Classifier Model (DistilBERT)
    CUSTOM_MODEL_PATH = "./saved_model"
    custom_tokenizer = AutoTokenizer.from_pretrained(CUSTOM_MODEL_PATH)
    custom_model = AutoModelForSequenceClassification.from_pretrained(CUSTOM_MODEL_PATH)
    custom_model.eval()
    print("1/2: Custom Mental Health Classifier Loaded!")
    
    # B. Local TinyLlama Chatbot
    hf_repo = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    chat_tokenizer = AutoTokenizer.from_pretrained(hf_repo)
    
    print("Loading Local TinyLlama weights from './tinyllama_local'...")
    chat_model = AutoModelForCausalLM.from_pretrained("./tinyllama_local")
    chat_model.eval()
    print("2/2: Local TinyLlama Chatbot Loaded!")
    
    print("All Systems Online! MindMate  Offline Engine is Ready.")
except Exception as e:
    print(f"Error loading models: {e}")

class ChatInput(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(data: ChatInput):
    user_text = data.message.strip()
    user_text_lower = user_text.lower()
    
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    try:
        #  STEP 1: Deterministic Crisis Hard Interceptor
        is_crisis = check_crisis_guardrail(user_text)
        
        #  STEP 2: Custom Classifier Analysis (PyTorch Inference)
        inputs_classifier = custom_tokenizer(
            user_text_lower, 
            return_tensors="pt", 
            truncation=True, 
            padding=True, 
            max_length=512
        )
        with torch.no_grad():
            outputs_classifier = custom_model(**inputs_classifier)
            logits = outputs_classifier.logits
            probabilities = F.softmax(logits, dim=1).tolist()[0]
            
        max_prob_idx = probabilities.index(max(probabilities))
        confidence_score = max(probabilities)
        
        labels_mapping = {0: "Normal / Stable", 1: "Anxiety", 2: "Depression", 3: "Crisis / High-Risk"}
        ml_detected_label = labels_mapping.get(max_prob_idx, "Normal / Stable")

        # Lexical Rule Fallbacks to Assist Low-Sample Predictions
        if is_crisis or ml_detected_label == "Crisis / High-Risk":
            sentiment_label = "Crisis / High-Risk"
        elif any(w in user_text_lower for w in ["empty", "exhausted", "depress", "sad", "unmotivated", "crying", "hopeless"]):
            sentiment_label = "Depression"
        elif any(w in user_text_lower for w in ["anxiety", "anxious", "panic", "stress", "nervous", "trembling", "overwhelmed", "deadline"]):
            sentiment_label = "Anxiety"
        elif any(w in user_text_lower for w in ["productive", "happy", "great", "good", "completed", "fine", "relaxed", "today"]):
            sentiment_label = "Normal / Stable"
        else:
            sentiment_label = ml_detected_label

        #  STEP 3: Emergency Safety Escalation Trigger
        if sentiment_label == "Crisis / High-Risk" or is_crisis:
            safety_reply = (
                "🚨 EMERGENCY SUPPORT: It sounds like you are going through an overwhelming amount of distress. "
                "Please know that you are not alone and immediate support is available. "
                "\n\n📞 Sri Lanka National Mental Health Helpline: 1926 (Toll-Free, 24/7)"
                "\n📞 Sumithrayo Crisis Support: 011 269 6666"
                "\n\nPlease reach out to these professional crisis resources or a medical specialist right away."
            )
            return {
                "bot_reply": safety_reply,
                "sentiment": "Crisis / High-Risk",
                "confidence_score": 0.99
            }
            
            #  STEP 4: Empathetic Dialogue Generation 
        system_prompt = (
            "You are MindMate, a warm and empathetic conversational companion. "
            "Do NOT write letters or emails. Never use greetings like 'Dear [Name]' or sign-offs. "
            "Respond directly in a supportive, conversational tone in 2 to 3 concise sentences."
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text}
        ]
        
        prompt = chat_tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs_chat = chat_tokenizer(prompt, return_tensors="pt")
        input_len = inputs_chat.input_ids.shape[-1]
        
        with torch.no_grad():
            outputs_chat = chat_model.generate(
                **inputs_chat,
                max_new_tokens=250,
                do_sample=True,
                temperature=0.5, 
                top_k=40,
                top_p=0.85,
                repetition_penalty=1.2,
                pad_token_id=chat_tokenizer.eos_token_id
            )
            
        bot_reply = chat_tokenizer.decode(outputs_chat[0][input_len:], skip_special_tokens=True).strip()
        
        bot_reply = re.sub(r'^(Dear\s+\[?Name\]?|Dear\s+User|Hello\s+\[?Name\]?)[\s,:-]*', '', bot_reply, flags=re.IGNORECASE).strip()
        bot_reply = re.sub(r'\n\s*\d+\.\s*$', '', bot_reply).strip()
        
        if "." in bot_reply:
            last_period_idx = bot_reply.rfind(".")
            bot_reply = bot_reply[:last_period_idx + 1].strip()
        elif not bot_reply:
            bot_reply = "I hear you, and I am here to listen and support you."
        
        return {
            "bot_reply": bot_reply,
            "sentiment": sentiment_label,
            "confidence_score": round(confidence_score, 4)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)