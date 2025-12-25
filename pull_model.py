import ollama
import sys
import time

log_file = "download_log.txt"

def log(msg):
    print(msg)
    with open(log_file, "a") as f:
        f.write(msg + "\n")

log("Attempting to pull model 'llama3.2'...")
try:
    # Progress stream
    current_digest = ''
    log("Downloading... This is much smaller (1GB). Should be fast.")
    response = ollama.pull('llama3.2', stream=True)
    
    last_status = ""
    for progress in response:
        status = progress.get('status')
        if status != last_status:
             sys.stdout.write(f"\rStatus: {status}...   ")
             with open(log_file, "a") as f:
                f.write(f"Status: {status}\n")
             last_status = status
             
    log("\nDownload complete!")
except Exception as e:
    log(f"\nError pulling model: {e}")
