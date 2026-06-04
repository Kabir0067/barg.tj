import re
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def clean_ai_response(text):
    """
    Тоза кардани ҷавоби ИИ аз аломатҳои нолозим:
    - Markdown (**bold**, *italic*, ## headers, - lists, ``code``)
    - Мекунем ки ба мисли забони одамӣ, оддӣ ва фаҳмо бошад
    """
    text = re.sub(r'\*{1,3}', '', text)     # Remove * ** ***
    text = re.sub(r'#{1,6}\s*', '', text)   # Remove ## headers
    text = re.sub(r'`{1,3}', '', text)      # Remove ` ``` code
    text = re.sub(r'^[-•]\s', '', text, flags=re.MULTILINE)  # Remove bullet points
    text = re.sub(r'^\d+\.\s', '', text, flags=re.MULTILINE)  # Remove numbered lists
    text = re.sub(r'\n{3,}', '\n\n', text)  # Remove excess newlines
    return text.strip()


def ask_ai(system_prompt, user_message, temperature=0.7):
    """
    Алоқа бо моделҳои ИИ бо се зинаи амниятӣ (Fallback):
    1. Gemini
    2. Groq (Llama 3.3)
    3. OpenRouter (Llama 3 / Gemini Free)
    """
    
    # Ба system prompt илова мекунем ки markdown истифода накунад
    no_markdown_rule = (
        "\n\nМУҲИМ: Ба ҳеч ваҷҳ аломатҳои markdown истифода НАКУН! "
        "Яъне ситораҳо (*), решёткаҳо (#), тире (-), бэктикҳо (`) ва рақамгузории "
        "автоматикӣ (1. 2. 3.) ҲАРОМ аст. "
        "Чун мизоҷон мардуми оддии деҳа ҳастанд ва ин аломатҳо онҳоро гаранг мекунад. "
        "Мисли одами зинда ва дӯст суҳбат кун."
    )
    system_prompt += no_markdown_rule
    
    # -----------------------------------------------
    # ТАРЗИ 1: Gemini Developer API
    # -----------------------------------------------
    gemini_key = getattr(settings, 'GEMINI_API_KEY', None)
    if gemini_key:
        logger.info("Кӯшиш бо Gemini API...")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_message}]
                }
            ],
            "generationConfig": {
                "temperature": temperature
            }
        }
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            if response.status_code == 200:
                res_data = response.json()
                text = res_data['candidates'][0]['content']['parts'][0]['text']
                logger.info("Ҷавоб аз Gemini гирифта шуд!")
                return clean_ai_response(text)
            else:
                logger.warning(f"Gemini API бо хатогии {response.status_code} ҷавоб дод: {response.text}")
        except Exception as e:
            logger.error(f"Хатогии пайвастшавӣ ба Gemini: {e}")

    # -----------------------------------------------
    # ТАРЗИ 2: Groq API
    # -----------------------------------------------
    groq_key = getattr(settings, 'GROQ_API_KEY', None)
    if groq_key:
        logger.info("Кӯшиш бо Groq API...")
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": temperature
        }
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            if response.status_code == 200:
                res_data = response.json()
                text = res_data['choices'][0]['message']['content']
                logger.info("Ҷавоб аз Groq (Llama 3.3) гирифта шуд!")
                return clean_ai_response(text)
            else:
                logger.warning(f"Groq API бо хатогии {response.status_code} ҷавоб дод: {response.text}")
        except Exception as e:
            logger.error(f"Хатогии пайвастшавӣ ба Groq: {e}")

    # -----------------------------------------------
    # ТАРЗИ 3: OpenRouter
    # -----------------------------------------------
    openrouter_key = getattr(settings, 'OPENROUTER_API_KEY', None)
    if openrouter_key:
        logger.info("Кӯшиш бо OpenRouter API...")
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://barg.tj",
            "X-Title": "Barg.tj Building Store"
        }
        payload = {
            "model": "meta-llama/llama-3.3-70b-instruct:free",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": temperature
        }
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            if response.status_code == 200:
                res_data = response.json()
                text = res_data['choices'][0]['message']['content']
                logger.info("Ҷавоб аз OpenRouter гирифта шуд!")
                return clean_ai_response(text)
            else:
                logger.warning(f"OpenRouter API бо хатогии {response.status_code} ҷавоб дод: {response.text}")
        except Exception as e:
            logger.error(f"Хатогии пайвастшавӣ ба OpenRouter: {e}")

    # -----------------------------------------------
    # ХАТТИ ОХИР
    # -----------------------------------------------
    logger.critical("Ҳамаи провайдерҳои ИИ дастнорас ҳастанд!")
    return (
        "Бубахшед, муваққатан системаи ёрирасони мо кор намекунад. "
        "Лутфан каме дертар кӯшиш кунед ё бо рақами телефони мо тамос гиред."
    )
