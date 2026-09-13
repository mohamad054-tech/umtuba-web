from pathlib import Path

p = Path("/etc/nginx/sites-available/umtuba-production")
text = p.read_text()
marker = (
    "    if ($host = www.umtuba.com) {\n"
    "        return 301 https://umtuba.com$request_uri;\n"
    "    }\n"
)
if marker in text:
    print("ALREADY_PATCHED")
else:
    needle = "    server_tokens off;\n"
    if needle not in text:
        raise SystemExit("NEEDLE_MISSING")
    p.write_text(text.replace(needle, needle + "\n" + marker, 1))
    print("PATCHED")
