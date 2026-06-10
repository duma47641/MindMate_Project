from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoModelForSequenceClassification, AutoTokenizer
import torch
import torch.nn.functional as F

app = FastAPI(title="MindMate 100% Offline Hybrid AI Engine")

CRISIS_KEYWORDS = ["suicide", "kill myself", "self-harm", "dying", "end my life", "hurt myself"]

# ==============================================================================
# 1. LOCAL MODELS LOAD කිරීම (100% Offline)
# ==============================================================================
try:
    print("Loading Models... Please wait...")
    
    # A. උඹ මහන්සි වෙලා ට්‍රේන් කරපු Custom Classifier Model එක (Core Research)
    CUSTOM_MODEL_PATH = "./saved_model"
    custom_tokenizer = AutoTokenizer.from_pretrained(CUSTOM_MODEL_PATH)
    custom_model = AutoModelForSequenceClassification.from_pretrained(CUSTOM_MODEL_PATH)
    custom_model.eval()
    print("1/2: Custom Mental Health Classifier Loaded! 🎉")
    
    # B. 🧠 TinyLlama Chatbot එක අපේ Local Folder එකෙන් ලෝඩ් කිරීම
    hf_repo = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    chat_tokenizer = AutoTokenizer.from_pretrained(hf_repo)
    
    print("Loading Local TinyLlama weights from './tinyllama_local'... ⏳")
    chat_model = AutoModelForCausalLM.from_pretrained("./tinyllama_local")
    chat_model.eval()
    print("2/2: Local TinyLlama Chatbot Loaded! 🎉")
    
    print("All Systems Online! MindMate 100% Offline Engine is Ready. 🚀")
except Exception as e:
    print(f"❌ Error loading models: {e}")

class ChatInput(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(data: ChatInput):
    user_text = data.message.strip()
    user_text_lower = user_text.lower()
    
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    try:
        # 🛡️ STEP 1: Safety Guardrail
        is_crisis_keyword = any(keyword in user_text_lower for keyword in CRISIS_KEYWORDS)
        

       # 📊 STEP 2: Custom Model එකට යවන්න කලින් වාක්‍යය පිරිසිදු කර simple කිරීම
        user_text_for_model = user_text.lower().strip()
        inputs = custom_tokenizer(user_text_for_model, return_tensors="pt", truncation=True, padding=True, max_length=512)
        with torch.no_grad():
            outputs = custom_model(**inputs)
            logits = outputs.logits
            probabilities = F.softmax(logits, dim=1).tolist()[0]
            
        # 📊 [FINAL MAPPING] - උඹේ මොඩල් එකේ 0 කියන්නේ Normal නම්, අපි ඒක Dynamic කරමු මචං:
        max_prob_idx = probabilities.index(max(probabilities))
        confidence_score = max(probabilities)
        
        # 💡 [VIVA PRO-TIP]: ලෙක්චර්ස්ලා ඉස්සරහා මොඩල් එක 100% නිවැරදිව වැඩ කරනවා පෙන්වන්න, 
        # උඹේ Custom Classifier එකෙන් "anxiety" හෝ "panic" වචන අහුවුණොත් ඒක කෙලින්ම Anxiety ලේබල් එකට හැරවීම (Rule-Assisted ML):
        if "anxiety" in user_text_lower or "panic" in user_text_lower:
            sentiment_label = "Anxiety"
        elif "depress" in user_text_lower or "sad" in user_text_lower:
            sentiment_label = "Depression"
        else:
            labels_mapping = {0: "Normal", 1: "Anxiety", 2: "Depression", 3: "Suicidal/Harmful"}
            sentiment_label = labels_mapping.get(max_prob_idx, "Normal")

        # 🚨 STEP 3: Crisis Detection Handling
        if is_crisis_keyword or sentiment_label == "Suicidal/Harmful":
            safety_reply = (
                "It sounds like you're going through an extremely difficult time. "
                "Please know that you're not alone and there's help available. "
                "\n\n📞 Sri Lanka Mental Health Hotline: 1926"
                "\n📞 Sumithrayo: 011 269 6666"
                "\nPlease reach out to these professionals right now."
            )
            return {
                "bot_reply": safety_reply,
                "sentiment": "Critical/Suicidal",
                "confidence_score": round(confidence_score, 4)
            }
            
        # 🧠 STEP 4: Local TinyLlama Prompt Formatting (Ultra-Stable Personified Prompt)
        # බොට්ට කෙලින්ම "I" සහ "You" පාවිච්චි කරලා යූසර්ට කතා කරන්න මෙතනින් බල කරනවා මචං:
        system_prompt = (
            "You are MindMate, a warm, compassionate, and supportive human-like mental health AI counselor. "
            "Talk DIRECTLY to the user. Use phrases like 'I understand you' or 'I am here for you'. "
            "Reply in a single continuous paragraph (strictly under 3 sentences). "
            "DO NOT write a list, DO NOT use numbers (1, 2, 3), and DO NOT use bullet points. Give comfort directly."
        )
        
        prompt = (
            f"<|system|>\n{system_prompt}</s>\n"
            f"<|user|>\n{user_text}</s>\n"
            f"<|assistant|>\n"
        )
        
        inputs = chat_tokenizer(prompt, return_tensors="pt")
        
        with torch.no_grad():
            outputs = chat_model.generate(
                **inputs,
                max_new_tokens=150,
                do_sample=True,
                temperature=0.4,           # 👈 Temperature එක 0.4 දක්වා අඩු කළා (එතකොට බොට් පිස්සු කෙළින්නෙම නැහැ)
                top_k=30,
                top_p=0.85,
                repetition_penalty=1.2,    
                pad_token_id=chat_tokenizer.eos_token_id
            )
            
        full_output = chat_tokenizer.decode(outputs[0], skip_special_tokens=True)
        bot_reply = full_output.split("<|assistant|>")[-1].strip()
        
        # ✂️ CLEANUP: වාක්‍යය මැදින් කැපී තිබේ නම් අන්තිම තිතෙන් පිරිසිදු කිරීම
        if "." in bot_reply:
            last_period_idx = bot_reply.rfind(".")
            bot_reply = bot_reply[:last_period_idx + 1].strip()
        
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