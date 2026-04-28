"""Test gemini via subprocess using shell=True."""
import subprocess
import shlex

# Direct call with shell=True works
r = subprocess.run(
    'gemini -p "hello" -y',
    capture_output=True,
    text=True,
    timeout=30,
    shell=True
)
print("RC:", r.returncode)
print("OUT:", r.stdout[:100])
print("ERR:", r.stderr[:100])