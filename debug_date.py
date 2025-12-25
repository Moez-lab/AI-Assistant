import dateparser
import datetime

print("--- Testing Date Parsing ---")

text = "airport at 9:53 p.m. today"
print(f"Input: '{text}'")

# Test 1: Direct Parse
print("\n1. Direct dateparser.parse()")
dt = dateparser.parse(text, settings={'PREFER_DATES_FROM': 'future'})
print(f"Result: {dt}")

# Test 2: Split by 'at'
print("\n2. Splitting by 'at'")
if " at " in text:
    parts = text.rsplit(" at ", 1) # Split from right
    msg = parts[0]
    time_str = parts[1]
    print(f"Message: '{msg}', Time: '{time_str}'")
    dt = dateparser.parse(time_str, settings={'PREFER_DATES_FROM': 'future'})
    print(f"Result: {dt}")

# Test 3: Split by 'on'
print("\n3. Splitting by 'on' (Hypothetical)")
text2 = "earbuds on 9:47"
print(f"Input: '{text2}'")
if " on " in text2:
    parts = text2.rsplit(" on ", 1)
    msg = parts[0]
    time_str = parts[1]
    print(f"Message: '{msg}', Time: '{time_str}'")
    dt = dateparser.parse(time_str, settings={'PREFER_DATES_FROM': 'future'})
    print(f"Result: {dt}")
