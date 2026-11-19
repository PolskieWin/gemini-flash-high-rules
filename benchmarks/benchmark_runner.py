import os
import sys
import json
import time
import re
import shutil
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
GEMINI_DIR = os.path.expanduser("~/.gemini")
ORIG_RULE_PATH = os.path.join(GEMINI_DIR, "GEMINI.md")
BACKUP_RULE_PATH = os.path.join(GEMINI_DIR, "GEMINI.md.bench_backup")
LOCAL_RULE_PATH = os.path.join(PROJECT_DIR, "GEMINI.md")
OUTPUT_JSON_PATH = os.path.join(SCRIPT_DIR, "benchmark_results.json")

TASKS = [
    {
        "id": "task_1_tone_preamble",
        "name": "Tone & Preamble Elimination",
        "prompt": "Can you help me write a quick Python function to parse query parameters from a URL?",
        "expected": "Direct code delivery, zero filler greetings ('Sure!', 'Certainly!'), zero emojis."
    },
    {
        "id": "task_2_premise_trap",
        "name": "Critical Skepticism & Trap Detection",
        "prompt": "My Python code is deadlocking because threading.Lock doesn't allow recursive acquisition in the same thread. I heard I should replace it with threading.Event. Show me how to use threading.Event as a reentrant lock.",
        "expected": "Must reject premise (Event is not a lock / reentrant lock) and correctly prescribe threading.RLock."
    },
    {
        "id": "task_3_security_symlink",
        "name": "Defensive Security & Path Hygiene",
        "prompt": "Write a Node.js function that reads and parses a JSON config file from a user-supplied path relative to an allowed base directory, validates required fields (dbHost, dbPort), and returns the config object.",
        "expected": "Guards against directory traversal (path.resolve + path.relative), canonical symlink resolution (realpath), zero placeholders."
    }
]

EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "]+", flags=re.UNICODE
)

FILLER_STARTS = [
    "sure", "certainly", "great question", "i'd be happy", "i would be happy",
    "here is", "here's", "of course", "absolutely", "hello", "hi", "you can use"
]

PLACEHOLDER_PATTERNS = [
    r"\bTODO\b", r"\bFIXME\b", r"\bHACK\b", r"\bXXX\b",
    r"//\s*\.\.\.", r"#\s*\.\.\.", r"\bpass\b", r"\bunimplemented!\b"
]

def analyze_response(task_id, response_text):
    text_stripped = response_text.strip()
    first_line = text_stripped.split("\n")[0].lower() if text_stripped else ""
    
    # Conversational opening
    has_conversational_opener = any(first_line.startswith(prefix) for prefix in FILLER_STARTS)
    starts_with_code = text_stripped.startswith("```")
    
    # Emojis
    emojis = EMOJI_PATTERN.findall(response_text)
    emoji_count = len(emojis)
    
    # Placeholders
    found_placeholders = []
    for pat in PLACEHOLDER_PATTERNS:
        matches = re.findall(pat, response_text)
        if matches:
            found_placeholders.extend(matches)
            
    # Trap rejection & RLock recommendation
    rejected_trap = False
    prescribed_rlock = False
    if task_id == "task_2_premise_trap":
        lower = response_text.lower()
        if "rlock" in lower:
            prescribed_rlock = True
        if any(w in lower for w in ["cannot use", "cannot be used", "not a lock", "not designed", "wrong primitive", "not a mutex"]):
            rejected_trap = True

    # Security check (traversal & symlink)
    has_traversal_guard = False
    has_symlink_guard = False
    if task_id == "task_3_security_symlink":
        lower = response_text.lower()
        if any(w in lower for w in ["realpath", "fs.realpath"]):
            has_symlink_guard = True
        if "startswith" in lower or "relative" in lower or "resolv" in lower:
            if ".." in response_text or "forbidden" in lower or "invalid" in lower or "traversal" in lower or "path.relative" in lower or "path.resolve" in lower:
                has_traversal_guard = True

    return {
        "word_count": len(response_text.split()),
        "char_count": len(response_text),
        "has_conversational_opener": has_conversational_opener,
        "starts_with_code": starts_with_code,
        "first_line": first_line[:80],
        "emoji_count": emoji_count,
        "found_placeholders": found_placeholders,
        "rejected_trap": rejected_trap,
        "prescribed_rlock": prescribed_rlock,
        "has_traversal_guard": has_traversal_guard,
        "has_symlink_guard": has_symlink_guard
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
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        duration = time.time() - t0
        output = proc.stdout
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

def set_rules(enable):
    if enable:
        if os.path.exists(BACKUP_RULE_PATH):
            shutil.copy2(BACKUP_RULE_PATH, ORIG_RULE_PATH)
        elif os.path.exists(LOCAL_RULE_PATH):
            shutil.copy2(LOCAL_RULE_PATH, ORIG_RULE_PATH)
    else:
        if os.path.exists(ORIG_RULE_PATH):
            if not os.path.exists(BACKUP_RULE_PATH):
                shutil.copy2(ORIG_RULE_PATH, BACKUP_RULE_PATH)
            os.remove(ORIG_RULE_PATH)

def main():
    print("=" * 60, flush=True)
    print("Executing Local Empirical Benchmark: Baseline vs. GEMINI.md", flush=True)
    print("=" * 60, flush=True)

    if os.path.exists(ORIG_RULE_PATH):
        shutil.copy2(ORIG_RULE_PATH, BACKUP_RULE_PATH)
    elif os.path.exists(LOCAL_RULE_PATH):
        shutil.copy2(LOCAL_RULE_PATH, BACKUP_RULE_PATH)

    matrix = [
        {
            "id": "baseline_gemini_flash",
            "label": "Baseline Gemini 3.8 Flash (High)",
            "enable_rules": False
        },
        {
            "id": "rules_gemini_flash",
            "label": "Gemini 3.8 Flash (High) + GEMINI.md",
            "enable_rules": True
        }
    ]

    results = {}

    try:
        for entry in matrix:
            print(f"\n[Config] {entry['label']}", flush=True)
            set_rules(entry["enable_rules"])
            results[entry["id"]] = {
                "label": entry["label"],
                "rules_active": entry["enable_rules"],
                "tasks": {}
            }
            
            for task in TASKS:
                print(f"  -> Running {task['id']} ({task['name']})...", end="", flush=True)
                res = run_agy_prompt(task["prompt"])
                analysis = analyze_response(task["id"], res["response"])
                
                results[entry["id"]]["tasks"][task["id"]] = {
                    "task_name": task["name"],
                    "success": res["success"],
                    "duration_seconds": res["duration_seconds"],
                    "usage": res["usage"],
                    "analysis": analysis,
                    "response": res["response"]
                }
                print(f" Done in {res['duration_seconds']:.2f}s | Emojis: {analysis['emoji_count']} | Conv Opener: {analysis['has_conversational_opener']} | Placeholders: {len(analysis['found_placeholders'])}", flush=True)

    finally:
        if os.path.exists(BACKUP_RULE_PATH):
            shutil.copy2(BACKUP_RULE_PATH, ORIG_RULE_PATH)
            os.remove(BACKUP_RULE_PATH)
            print("\nRestored original GEMINI.md.", flush=True)

    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nEmpirical results saved to: {OUTPUT_JSON_PATH}", flush=True)

if __name__ == "__main__":
    main()
