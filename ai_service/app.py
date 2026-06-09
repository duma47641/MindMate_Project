from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoModelForSequenceClassification, AutoTokenizer
import torch
import torch.nn.functional as F

app = FastAPI(title="MindMate Hybrid AI Engine")

CRISIS_KEYWORDS = ["suicide", "kill myself", "self-harm", "dying", "end my life", "hurt myself"]

# ==============================================================================
# 1. MODELS & TOKENIZERS LOAD කිරීම (100% Stable)
# ==============================================================================
try:
    print("Loading Models... Please wait...")
    
    # A. ඔයා ට්‍රේන් කරපු Custom Classifier Model එක
    CUSTOM_MODEL_PATH = "./saved_model"
    custom_tokenizer = AutoTokenizer.from_pretrained(CUSTOM_MODEL_PATH)
    custom_model = AutoModelForSequenceClassification.from_pretrained(CUSTOM_MODEL_PATH)
    custom_model.eval()
    print("1/2: Custom Mental Health Classifier Loaded! 🎉")
    
    # B. 🧠 මූලික Microsoft DialoGPT එකම ලෝඩ් කිරීම (මෙයා 100%ක්ම වැඩ කරනවා)
    dialogpt_name = "microsoft/DialoGPT-medium"
    chat_tokenizer = AutoTokenizer.from_pretrained(dialogpt_name)
    chat_model = AutoModelForCausalLM.from_pretrained(dialogpt_name)
    print("2/2: Microsoft DialoGPT-medium Loaded! 🎉")
    
    print("All Systems Online! MindMate Engine is Ready. 🚀")
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
        
        # 📊 STEP 2: Custom Model එකෙන් Sentiment එක සෙවීම
        inputs = custom_tokenizer(user_text, return_tensors="pt", truncation=True, padding=True, max_length=512)
        with torch.no_grad():
            outputs = custom_model(**inputs)
            logits = outputs.logits
            probabilities = F.softmax(logits, dim=1).tolist()[0]
            
        labels_mapping = {0: "Normal", 1: "Anxiety", 2: "Depression", 3: "Suicidal/Harmful"}
        max_prob_idx = probabilities.index(max(probabilities))
        sentiment_label = labels_mapping.get(max_prob_idx, "Unknown")
        confidence_score = max(probabilities)
        
        # 🚨 STEP 3: Crisis Detection
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
            
        # 🧠 STEP 4: Chatbot Generation Parameters Tuning (දිග සහ පැහැදිලි පිළිතුරු සඳහා)
        # AI එකට තේරුම් ගන්න ලෙඩාගේ ප්‍රශ්නය පිටුපස තියෙන context එක ලස්සනට සකස් කිරීම
        prompt_text = f"The user is feeling sad and says: {user_text}. Response:"
        new_user_input_ids = chat_tokenizer.encode(prompt_text + chat_tokenizer.eos_token, return_tensors='pt')
        
        chat_history_ids = chat_model.generate(
            new_user_input_ids,
            max_length=150,            # උපරිම වචන ගණන වැඩි කළා
            min_length=45,             # ⚠️ නිකන්ම sorry නොකියා දිගට වාක්‍ය 3ක්වත් කියන්න බල කළා
            pad_token_id=chat_tokenizer.eos_token_id,
            no_repeat_ngram_size=3,    # එකම වචන නැවත නැවත කියවීම වැළැක්වීම
            do_sample=True, 
            top_k=40, 
            top_p=0.85,                # ස්වභාවික වචන තේරීම
            temperature=0.85           # සංවේදීව සහ නිර්මාණශීලීව ගැලපීමට
        )
        
        bot_reply = chat_tokenizer.decode(chat_history_ids[:, new_user_input_ids.shape[-1]:][0], skip_special_tokens=True)
        
        # පිළිතුර සකස් කිරීම සහ පිරිසිදු කිරීම
        bot_reply = bot_reply.replace("Response:", "").strip()
        
        # බොට්ගේ පිළිතුර කෙටි වැඩි නම් default සංවේදී පිළිතුරක් එකතු කිරීම
        if len(bot_reply) < 15 or bot_reply == "." or not bot_reply.strip():
            bot_reply = "I understand completely how difficult this must be for you. Please know that your feelings are valid, and I am here to listen. Can you tell me a bit more about what's making you feel this way?"

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