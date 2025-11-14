import os
import requests
import time

# --- CONFIG ---
relation_ids = {
    1: 6728830,   # District 1
    2: 6728896,   # District 2
    3: 6728897,
    4: 6728863,
    5: 6729507,
    6: 6729037,
    7: 6729036,
    8: 6729035,
    9: 6729508,
    10: 6729501,
    11: 6729111,
    12: 6729112,
    13: 6729034,
    14: 6729033,
    15: 6729032,
    16: 6729110,
    17: 6729502,
    18: 6729503,
    19: 6729109,
    20: 6729031,
    21: 6729505,
    22: 6729506,
}

output_dir = "./district_boundaries"
os.makedirs(output_dir, exist_ok=True)

# Overpass endpoint
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

for district, rel_id in relation_ids.items():
    query = f"""
    [out:json];
    relation({rel_id});
    out geom;
    """
    try:
        print(f"⬇️ Downloading District {district} (relation {rel_id}) ...")
        r = requests.post(OVERPASS_URL, data={"data": query}, timeout=60)
        r.raise_for_status()
        
        out_file = os.path.join(output_dir, f"district_{district}_boundary.json")
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(r.text)
        
        print(f"✅ Saved {out_file}")
        time.sleep(5)  # avoid overwhelming Overpass server
    except Exception as e:
        print(f"❌ Failed for District {district}: {e}")

