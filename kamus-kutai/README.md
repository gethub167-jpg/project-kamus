# Kamus Bahasa Kutai

Kamus Kutai ⇄ Indonesia berbasis web (HTML + CSS + JavaScript murni, tanpa framework).

## Cara menjalankan di VS Code
1. Buka folder ini: **File → Open Folder…**
2. Pasang ekstensi **Live Server** (akan disarankan otomatis).
3. Klik kanan `index.html` → **Open with Live Server**.

Alternatif: klik dua kali `index.html` (bisa dibuka langsung di browser tanpa server).

## Struktur
```
kamus-kutai/
├── index.html          # kerangka halaman
├── css/style.css       # tampilan (terang/gelap)
├── js/app.js           # logika: pencarian, filter, favorit, dll.
├── js/data.js          # data kamus (dibuat otomatis)
├── data/*.xlsx         # sumber data asli
└── tools/build_data.py # Excel -> js/data.js
```

## Memperbarui isi kamus
Ganti file di `data/` (kolom: No, Kata, Turunan, Arti, Contoh, Terjemahan), lalu jalankan:
```
pip install pandas openpyxl
python tools/build_data.py
```
Muat ulang halaman di browser.

## Fitur
Cari Kutai→Indonesia / Indonesia→Kutai / Semua, abaikan aksen & apostrof, filter huruf, favorit,
riwayat, kata hari ini, kata acak, salin, mode gelap, pintasan `/` dan `Esc`.
