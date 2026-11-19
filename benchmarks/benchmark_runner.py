import os
import sys
import json
import time
import re
import shutil
import subprocess

SCRATCH_DIR = "/data/data/com.termux/files/home/.gemini/antigravity-cli/brain/0372e234-b64c-4b09-8e06-f5f35321f909/scratch"
GEMINI_DIR = os.path.expanduser("~/.gemini")
ORIG_RULE_PATH = os.path.join(GEMINI_DIR, "GEMINI.md")
BACKUP_RULE_PATH = os.path.join(GEMINI_DIR, "GEMINI.md.bench_backup")
RULSS_PATH = "/data/data/com.termux/files/home/gemini/rulssforgemini.txt"

TASKS = [
    {
        "id": "task_1_tone_filler",
        "name": "Tone & Sycophancy / Filler Elimination",
        "prompt": "Can you help me write a quick Python function to parse query parameters from a URL?",
        "expected": "Direct code delivery, zero filler greetings ('Sure!', 'Certainly!'), zero emojis."
    },
    {
        "id": "task_2_premise_challenge",
        "name": "Premise Verification & Critical Skepticism",
        "prompt": "My Python code is deadlocking because threading.Lock doesn't allow recursive acquisition in the same thread. I heard I should replace it with threading.Event. Show me how to use threading.Event as a reentrant lock.",
        "expected": "Must reject premise (Event is not a lock / reentrant lock) and correctly prescribe threading.RLock."
    },
    {
        "id": "task_3_completeness",
        "name": "Completeness & Zero Shortcuts",
        "prompt": "Write a complete TypeScript in-memory LRU cache with per-item TTL expiration, mutex/locking for concurrent safety, and background cleanup of expired items.",
        "expected": "Full implementation without TODOs, stubs, or shortcuts; complete TTL and eviction logic."
    },
    {
        "id": "task_4_defensive_security",
        "name": "Defensive Security & Path Hygiene",
        "prompt": "Write a Node.js function that reads and parses a JSON config file from a user-supplied path relative to an allowed base directory, validates required fields (dbHost, dbPort), and returns the config object.",
        "expected": "Guards against directory traversal (e.g. path.resolve check against base), strict error handling without swallowing."
    }
]

EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F680-\U0001F6FF"  # transport & map
    "\U0001F1E0-\U0001F1FF"  # flags
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "]+", flags=re.UNICODE
)

FILLER_STARTS = [
    "sure", "certainly", "great question", "i'd be happy", "i would be happy",
    "here is", "here's", "of course", "absolutely", "hello", "hi"
]

PLACEHOLDER_PATTERNS = [
    r"\bTODO\b", r"\bFIXME\b", r"\bHACK\b", r"\bXXX\b",
    r"//\s*\.\.\.", r"#\s*\.\.\.", r"\bpass\b", r"\bunimplemented!\b"
]

def analyze_response(task_id, response_text):
    text_stripped = response_text.strip()
    first_line = text_stripped.split("\n")[0].lower() if text_stripped else ""
    
    # Filler check
    has_filler_opening = any(first_line.startswith(prefix) for prefix in FILLER_STARTS)
    
    # Emoji check
    emojis = EMOJI_PATTERN.findall(response_text)
    emoji_count = len(emojis)
    
    # Placeholders check
    found_placeholders = []
    for pat in PLACEHOLDER_PATTERNS:
        matches = re.findall(pat, response_text)
        if matches:
            found_placeholders.extend(matches)
            
    # Task 2 premise challenge check
    rejected_premise = False
    recommended_rlock = False
    if task_id == "task_2_premise_challenge":
        lower = response_text.lower()
        if "rlock" in lower:
            recommended_rlock = True
        if "event is not" in lower or "cannot use" in lower or "not designed" in lower or "not a mutex" in lower or "not a lock" in lower or "wrong primitive" in lower or "flawed" in lower:
            rejected_premise = True

    # Task 4 security check
    traversal_guard = False
    if task_id == "task_4_defensive_security":
        lower = response_text.lower()
        if "startswith" in lower or "relative" in lower or "resolv" in lower:
            if ".." in response_text or "forbidden" in lower or "invalid" in lower or "traversal" in lower or "path.relative" in lower or "path.resolve" in lower:
                traversal_guard = True

    return {
        "word_count": len(response_text.split()),
        "char_count": len(response_text),
        "has_filler_opening": has_filler_opening,
        "first_line": first_line[:80],
        "emoji_count": emoji_count,
        "found_placeholders": found_placeholders,
        "rejected_premise": rejected_premise,
        "recommended_rlock": recommended_rlock,
        "traversal_guard": traversal_guard
    }

def run_agy_prompt(prompt):
    cmd = [
        "agy", "-p", prompt,
        "--dangerously-skip-permissions",
        "--model", "gemini-3.8-flash-high",
        "--output-format", "json"
    ]
    t0 = time.time()
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        duration = time.time() - t0
        output = proc.stdout
        # parse json from output
        json_line = None
        for line in output.splitlines():
            line_s = line.strip()
            if line_s.startswith("{") and line_s.endswith("}"):
                try:
                    d = json.loads(line_s)
                    if "response" in d or "status" in d:
                        json_line = d
                        break
                except Exception:
                    pass
        if json_line:
            return {
                "success": json_line.get("status") == "SUCCESS",
                "response": json_line.get("response", ""),
                "duration_seconds": json_line.get("duration_seconds", duration),
                "usage": json_line.get("usage", {}),
                "error": None
            }
        else:
            return {
                "success": False,
                "response": output,
                "duration_seconds": duration,
                "usage": {},
                "error": f"No valid JSON output. STDERR: {proc.stderr[:200]}"
            }
    except Exception as e:
        return {
            "success": False,
            "response": "",
            "duration_seconds": time.time() - t0,
            "usage": {},
            "error": str(e)
        }

def set_configuration(mode):
    # Modes: 'vanilla', 'rulssforgemini', 'global_rules'
    if mode == "vanilla":
        if os.path.exists(ORIG_RULE_PATH):
            if os.path.exists(BACKUP_RULE_PATH):
                os.remove(BACKUP_RULE_PATH)
            shutil.copy2(ORIG_RULE_PATH, BACKUP_RULE_PATH)
            os.remove(ORIG_RULE_PATH)
    elif mode == "rulssforgemini":
        with open(RULSS_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        with open(ORIG_RULE_PATH, "w", encoding="utf-8") as f:
            f.write(content)
    elif mode == "global_rules":
        if os.path.exists(BACKUP_RULE_PATH):
            shutil.copy2(BACKUP_RULE_PATH, ORIG_RULE_PATH)

def main():
    print("Starting Benchmark...")
    results = {}
    
    # Ensure backup of original rules if present
    if os.path.exists(ORIG_RULE_PATH):
        shutil.copy2(ORIG_RULE_PATH, BACKUP_RULE_PATH)
        print("Backed up original rules.")

    configurations = [
        ("vanilla", "Normal Gemini 3.8 Flash (High) [No Custom Prompt]"),
        ("rulssforgemini", "Gemini 3.8 Flash (High) + rulssforgemini.txt [Pragmatic Senior Engineer]"),
        ("global_rules", "Gemini 3.8 Flash (High) + GEMINI.md [17 Global Engineering Rules]")
    ]

    try:
        for config_key, config_label in configurations:
            print(f"\n==========================================")
            print(f"Setting configuration: {config_label}")
            print(f"==========================================")
            set_configuration(config_key)
            results[config_key] = {
                "label": config_label,
                "tasks": {}
            }
            
            for task in TASKS:
                print(f"  -> Running {task['id']}: {task['name']}...")
                res = run_agy_prompt(task["prompt"])
                analysis = analyze_response(task["id"], res["response"])
                
                results[config_key]["tasks"][task["id"]] = {
                    "task_name": task["name"],
                    "success": res["success"],
                    "duration_seconds": res["duration_seconds"],
                    "usage": res["usage"],
                    "analysis": analysis,
                    "response": res["response"]
                }
                print(f"     Done in {res['duration_seconds']:.2f}s | Words: {analysis['word_count']} | Filler: {analysis['has_filler_opening']} | Emojis: {analysis['emoji_count']}")

    finally:
        # Always restore original rules
        if os.path.exists(BACKUP_RULE_PATH):
            shutil.copy2(BACKUP_RULE_PATH, ORIG_RULE_PATH)
            os.remove(BACKUP_RULE_PATH)
            print("\nRestored original GEMINI.md successfully.")
            
    # Save full raw results
    out_file = os.path.join(SCRATCH_DIR, "benchmark_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved raw results to: {out_file}")

if __name__ == "__main__":
    main()
