import os
import json
from shapely.geometry import Polygon, MultiPolygon, LineString
from shapely.ops import unary_union, polygonize


def json_to_geojson(json_file):
    """Convert Overpass JSON (relation with multiple outer ways) to GeoJSON Polygon."""
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    for el in data["elements"]:
        if el["type"] == "relation" and "members" in el:
            outer_lines = []

            for member in el["members"]:
                if member["type"] == "way" and member.get("role") == "outer" and "geometry" in member:
                    coords = [(pt["lon"], pt["lat"]) for pt in member["geometry"]]
                    if len(coords) > 1:
                        outer_lines.append(LineString(coords))

            if not outer_lines:
                raise ValueError(f"No outer polygons found in {json_file}")

            # Merge all boundary fragments into polygons
            merged = unary_union(outer_lines)
            polygons = list(polygonize(merged))

            # Handle MultiPolygon
            geom = MultiPolygon(polygons) if len(polygons) > 1 else polygons[0]

            return {
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "geometry": geom.__geo_interface__,
                    "properties": {
                        "id": el["id"],
                        "name": el["tags"].get("name", "unknown")
                    }
                }]
            }

    raise ValueError(f"No relation with geometry found in {json_file}")

def process_all_districts(input_dir="district_boundaries", output_dir="geojson_boundaries"):
    """Convert all Overpass JSON files in a directory to GeoJSON."""
    os.makedirs(output_dir, exist_ok=True)

    for filename in os.listdir(input_dir):
        if filename.endswith(".json"):
            input_path = os.path.join(input_dir, filename)
            output_path = os.path.join(output_dir, filename.replace(".json", ".geojson"))

            try:
                geojson_data = json_to_geojson(input_path)
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(geojson_data, f, ensure_ascii=False, indent=2)
                print(f"✅ Converted {filename} → {output_path}")
            except Exception as e:
                print(f"❌ Failed to convert {filename}: {e}")


if __name__ == "__main__":
    process_all_districts()