"""Membuat js/data.js dari file Excel di folder data/.
Jalankan dari folder utama proyek:  python tools/build_data.py
Butuh: pip install pandas openpyxl
"""
import json, re, sys
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = next((ROOT / "data").glob("*.xlsx"), None)
if SRC is None:
    sys.exit("Tidak ada file .xlsx di folder data/")

df = pd.read_excel(SRC, dtype=str).fillna("")

def clean(v):
    v = re.sub(r"\s+", " ", str(v)).strip()
    return "" if v in ("-", "–", "—", "nan") else v

rows = []
for _, r in df.iterrows():
    kata = re.sub(r"\s+", " ", str(r.iloc[1])).strip()
    if kata:
        rows.append([kata, clean(r.iloc[2]), clean(r.iloc[3]), clean(r.iloc[4]), clean(r.iloc[5])])

payload = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
payload = payload.replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
(ROOT / "js" / "data.js").write_text("window.KAMUS_DATA=" + payload + ";\n", encoding="utf-8")
print(f"OK: {len(rows)} baris ditulis ke js/data.js")
