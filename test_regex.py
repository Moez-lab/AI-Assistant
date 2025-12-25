import ai_assistant
import re

print("Testing Emotion Mapping...")
inputs = [
    "Hello *giggles* friend.",
    "This is sad (cries).", 
    "I am shy *blushes*.",
    "Wait... thinking (thinking)..."
]

for text in inputs:
    # Simulate speak function logic
    original = text
    
    # Copy paste logic from ai_assistant.py (simplified for test)
    replacements = {
        r'[\(\*]+(laughs|laughter|laughing|chuckles|giggles|rofl|lol)[\)\*]+': ' Hahaha! ',
        r'[\(\*]+(sighs|sighing)[\)\*]+': ' Hhh... ',
        r'[\(\*]+(clears throat|ahem)[\)\*]+': ' Ahem. ',
        r'[\(\*]+(gasps|gasp)[\)\*]+': ' (gasp) ',
        r'[\(\*]+(yawn|yawns)[\)\*]+': ' Yaaawn... ',
        r'[\(\*]+(cries|sobs|sniffles)[\)\*]+': ' Huhu... ',
        r'[\(\*]+(hums|humming)[\)\*]+': ' Hmm hmm hmm. ',
        r'[\(\*]+(screams|shouts)[\)\*]+': ' Ahhh! ',
        r'[\(\*]+(smirk|smirks|smirking)[\)\*]+': ' Heh. ',
        r'[\(\*]+(blushes|shy|acting shy)[\)\*]+': ' Umm... ',
        r'[\(\*]+(pauses|thinking|thinks)[\)\*]+': ' Hmm... ',
        r'[\(\*]+(winks|nods|shrugs|smiles|frowns|looks|points|waves|stares|leans|bounces|beams)[\)\*]+': '', 
    }
    
    processed = text
    for pattern, replacement in replacements.items():
        processed = re.sub(pattern, replacement, processed, flags=re.IGNORECASE)
    
    processed = re.sub(r'(\.\.\.|…)', ' ', processed)
    processed = re.sub(r'\s*[\(\*][^\)\*]+[\)\*]\s*', ' ', processed)
    
    print(f"Original: '{original}' -> Processed: '{processed}'")


print("\nTesting Truncation Cleanup...")
truncated = "Science and Technology for …"
cleaned = re.sub(r'(\.\.\.|…)$', '.', truncated)
cleaned = re.sub(r'(\.\.\.|…)\s', '. ', cleaned)
print(f"Original: '{truncated}' -> Cleaned: '{cleaned}'")
