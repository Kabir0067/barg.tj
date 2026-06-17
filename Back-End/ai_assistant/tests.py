import os
from PIL import Image

def make_high_res_square_logo(input_path, output_path):
    """
    Делает логотип крупным, близким и ультра-четким.
    Увеличивает высоту до 600px и делает идеальный квадрат 600х600 (Retina/8K качество).
    """
    if not os.path.exists(input_path):
        print(f"Хатогӣ: Акс дар ин адрес ёфт нашуд: {input_path}")
        return

    # 1. Открываем оригинал (600х249)
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size

    # 2. Увеличиваем картинку так, чтобы высота стала 600px (пропорционально)
    # Это поднимет разрешение и уберет размытость при приближении
    target_height = 600
    scale_factor = target_height / height
    new_width = int(width * scale_factor)
    
    # Используем лучший алгоритм изменения размера (LANCZOS)
    high_res_img = img.resize((new_width, target_height), Image.Resampling.LANCZOS)

    # 3. Теперь вырезаем идеальный квадрат 600x600 строго по центру
    left = (new_width - target_height) // 2
    top = 0
    right = left + target_height
    bottom = target_height

    final_img = high_res_img.crop((left, top, right, bottom))
    
    # 4. Сохраняем файл с максимальными настройками качества PNG
    final_img.save(output_path, "PNG", compress_level=0, optimize=True)
    print(f"Супер! Создан ультра-четкий квадратный логотип 600x600: {output_path}")

# --- НАСТРОЙКА ПУТЕЙ ---
АДРЕСИ_АКСИ_МАН = r"C:\Users\Kabir\Desktop\Barg.tj\Front-End\public\logo.png" 
АДРЕСИ_АКСИ_НАВ = r"C:\Users\Kabir\Desktop\Barg.tj\Front-End\public\logo_249x249.png"

# Передаем два аргумента: откуда взять и куда сохранить
make_high_res_square_logo(АДРЕСИ_АКСИ_МАН, АДРЕСИ_АКСИ_НАВ)
