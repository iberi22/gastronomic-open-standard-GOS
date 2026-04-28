"""Test gemini invocation from Python subprocess."""
import subprocess

result = subprocess.run(
    ["cmd", "/c", "gemini", "-p", "Say hello", "-y"],
    capture_output=True,
    text=True,
    timeout=60
)
print("RC:", result.returncode)
print("OUT:", result.stdout[:200])
print("ERR:", result.stderr[:200] if result.stderr else "")