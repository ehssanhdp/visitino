import json
import os
import sys
import io
import geopandas as gpd
from shapely.geometry import Point
from shapely.ops import unary_union

# --- Configure standard IO to safely handle any Unicode ---
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8", errors="replace")
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# --- Arguments from Go ---
region_num = int(sys.argv[1])
data = sys.stdin.read().strip()

# --- Handle empty or invalid input ---
if not data:
    print("[]")
    sys.exit()

try:
    items = json.loads(data)
except json.JSONDecodeError:
    print("[]")
    sys.exit()

# --- Paths ---
BASE_DIR = os.path.dirname(__file__)
BOUNDARIES_DIR = os.path.join(BASE_DIR, "geojson_boundaries")
region_file = os.path.join(BOUNDARIES_DIR, f"district_{region_num}_boundary.geojson")

if not os.path.exists(region_file):
    print("[]")
    sys.exit()

# --- Load region boundary ---
gdf = gpd.read_file(region_file)
region_poly = unary_union(gdf.geometry)

# --- Filter items inside region ---
filtered_items = []
for item in items:
    loc = item.get("location", {})
    lat = loc.get("y", 0)
    lng = loc.get("x", 0)

    if lat == 0 or lng == 0:
        continue

    point = Point(lng, lat)
    if region_poly.contains(point):
        filtered_items.append(item)

# --- Output JSON for Go to read ---
print(json.dumps(filtered_items, ensure_ascii=False))
