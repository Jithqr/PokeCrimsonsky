import csv
import requests

SHOWDOWN_BASE = "https://play.pokemonshowdown.com/sprites"
CSV_FILE = "pokemon_all_forms.csv"
OUTPUT_FILE = "missing_sprites.txt"

def check_url(url: str) -> bool:
    try:
        r = requests.head(url, timeout=5, allow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False

def sprite_key(name: str) -> str:
    return name.lower().replace(" ", "").replace("-", "").replace("'", "").replace(".", "")

def main():
    missing = []
    with open(CSV_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)
    print(f"Checking {total} Pokémon sprites...")

    for i, row in enumerate(rows, 1):
        name = row.get("name", "").strip()
        if not name:
            continue

        key = sprite_key(name)
        front_ani  = f"{SHOWDOWN_BASE}/ani/{key}.gif"
        back_ani   = f"{SHOWDOWN_BASE}/ani-back/{key}.gif"
        front_gen5 = f"{SHOWDOWN_BASE}/gen5/{key}.png"

        front_ok = check_url(front_ani) or check_url(front_gen5)
        back_ok  = check_url(back_ani)

        if not front_ok or not back_ok:
            entry = f"{name} (key: {key})"
            if not front_ok:
                entry += " [MISSING FRONT]"
            if not back_ok:
                entry += " [MISSING BACK]"
            missing.append(entry)
            print(f"  [{i}/{total}] MISSING: {entry}")
        else:
            if i % 50 == 0:
                print(f"  [{i}/{total}] OK so far...")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write(f"Missing sprites ({len(missing)} of {total}):\n\n")
        for line in missing:
            out.write(line + "\n")

    print(f"\nDone. {len(missing)} missing sprite(s) written to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
