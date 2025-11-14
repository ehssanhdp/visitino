import os
import sys
import json
import math
import random
from shapely.geometry import shape, Point, Polygon
from shapely.ops import unary_union
import geopandas as gpd
import matplotlib.pyplot as plt
from shapely.geometry import MultiPolygon


# Path to your GeoJSON boundaries directory
BASE_DIR = os.path.dirname(__file__)
BOUNDARIES_DIR = os.path.join(BASE_DIR, "geojson_boundaries")

def load_region_polygon(region_num):
    """Load the region polygon from its GeoJSON file."""
    file_path = os.path.join(BOUNDARIES_DIR, f"district_{region_num}_boundary.geojson")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Boundary file not found for region {region_num}")
    else:
        print(file_path)

    gdf = gpd.read_file(file_path)
    # In case of multiple polygons (MultiPolygon), unify them
    region_poly = unary_union(gdf.geometry)
    return region_poly


def compute_distance(lat1, lng1, lat2, lng2):
    """Compute approximate distance (in km) between two lat/lng points."""
    R = 6371  # Earth radius (km)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def find_random_point_inside(polygon, max_attempts=1000):
    """Find a random point inside a polygon."""
    minx, miny, maxx, maxy = polygon.bounds
    for _ in range(max_attempts):
        p = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
        if polygon.contains(p):
            return p.y, p.x  # lat, lng
    return 0, 0

def create_circle_polygon(center_lat, center_lng, radius_km, num_points=32):
    """Create a circular polygon (approximation) around a point."""
    coords = []
    for i in range(num_points):
        angle = 2 * math.pi * i / num_points
        dlat = (radius_km / 111) * math.cos(angle)
        dlng = (radius_km / (111 * math.cos(math.radians(center_lat)))) * math.sin(angle)
        coords.append((center_lng + dlng, center_lat + dlat))
    return Polygon(coords)


def find_center(polygon):
    """Return the centroid (lat, lng) of a polygon."""
    centroid = polygon.centroid
    return centroid.y, centroid.x


def find_random_point_inside(polygon, max_attempts=1000):
    """Generate a random point inside a polygon."""
    minx, miny, maxx, maxy = polygon.bounds
    for _ in range(max_attempts):
        p = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
        if polygon.contains(p):
            return p.y, p.x  # lat, lng
    return 0, 0


def process_region(region_num, covered_list):
    """
    region_num: int
    covered_list: list of dicts [{RefLat, RefLng, Plat, Plng}]
    """
    try:
        region_poly = load_region_polygon(region_num)
    except FileNotFoundError:
        print("file not found")
        return 0, 0

    if len(covered_list) > 0 and isinstance(covered_list[0], list):
        covered_list = [i for sublist in covered_list for i in sublist]

    # region_file = os.path.join(BOUNDARIES_DIR, f"district_{region_num}_boundary.geojson")

    # Case 1: No covered areas yet
    if len(covered_list) == 0:
        center = find_center(region_poly)
        # visualize_region(region_file, covered_list, center)
        return center

    # Case 2: Subtract all covered areas
    for item in covered_list:
        ref_lat = item["RefLat"]
        ref_lng = item["RefLng"]
        p_lat = item["Plat"]
        p_lng = item["Plng"]
        radius = compute_distance(ref_lat, ref_lng, p_lat, p_lng)
        circle_poly = create_circle_polygon(ref_lat, ref_lng, radius)
        region_poly = region_poly.difference(circle_poly)

    # Case 3: Return new random point inside remaining area
    threshold_area = 8.1e-5
    if isinstance(region_poly, MultiPolygon):
        largest_piece = max(region_poly.geoms, key=lambda p: p.area)
    else:
        largest_piece = region_poly



    if largest_piece.area > threshold_area:
        print("area:", largest_piece.area)
        print("threshold:", threshold_area)
        centroid = find_random_point_inside(largest_piece)
        # point = (centroid[0], centroid[1]) 
        # visualize_region(region_file, covered_list, new_point=point, region_poly=region_poly, largest_piece=largest_piece, largest_piece_area=largest_piece.area)
        return centroid[0], centroid[1]
    else:
        return 0, 0



def visualize_region(region_file, covered_list, new_point=None, region_poly=None, largest_piece=None, largest_piece_area=0):
    """Visualize region, covered circles, and optionally highlight the largest piece."""
    gdf = gpd.read_file(region_file)
    base_region = gdf.geometry.iloc[0]

    fig, ax = plt.subplots(figsize=(8, 8))
    gdf.plot(ax=ax, color="none", edgecolor="black", linewidth=1.5)

    # Draw remaining region outline if provided
    if region_poly is not None:
        gpd.GeoSeries([region_poly]).plot(ax=ax, color="none", edgecolor="gray", linestyle="--", linewidth=1)

    # Draw covered circles
    for item in covered_list:
        ref_lat = item["RefLat"]
        ref_lng = item["RefLng"]
        plat = item["Plat"]
        plng = item["Plng"]
        radius = ((ref_lat - plat) ** 2 + (ref_lng - plng) ** 2) ** 0.5
        circle = Point(ref_lng, ref_lat).buffer(radius)
        gpd.GeoSeries([circle]).plot(ax=ax, color="red", alpha=0.3)

    # Highlight largest piece (red outline)
    if largest_piece is not None:
        gpd.GeoSeries([largest_piece]).plot(ax=ax, color="none", edgecolor="red", linewidth=2, label="Largest Piece")

    # Mark the selected new point
    if new_point:
        x, y = new_point[1], new_point[0]  # lng, lat
        plt.scatter(x, y, color="green", marker="x", s=100, label="Selected Point")

    plt.title("Region Visualization with Largest Remaining Area")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.text(
    0.05, 0.95,                # x, y (in relative coordinates 0–1)
    f"#{largest_piece_area}",          # text
    transform=plt.gca().transAxes,  # use axis coordinates
    fontsize=14,
    color='red',
    fontweight='bold',
    va='top'
)
    plt.legend()
    plt.show()

# Allow direct call from Go using exec.Command
if __name__ == "__main__":
    data = sys.stdin.read()
    region_num = int(sys.argv[1])
    covered_list = json.loads(data)
    lat, lng = process_region(region_num, covered_list)
    print(lat, lng)
