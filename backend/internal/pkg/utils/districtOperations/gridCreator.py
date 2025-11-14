import os
import json
import geopandas as gpd
import matplotlib.pyplot as plt
from shapely.geometry import Polygon, MultiPolygon, box


def load_geojson(file_path):
    """Load a GeoJSON file into a GeoDataFrame."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return gpd.GeoDataFrame.from_features(data["features"], crs="EPSG:4326")


def make_grid(boundary_gdf, grid_size=1000):
    """
    Create a square grid (in meters) covering the boundary polygon.
    grid_size: size of grid cell in meters.
    """
    # Reproject to UTM (so grid is in meters, not degrees)
    utm_gdf = boundary_gdf.to_crs(boundary_gdf.estimate_utm_crs())
    bounds = utm_gdf.total_bounds  # [minx, miny, maxx, maxy]

    minx, miny, maxx, maxy = bounds
    grid_cells = []
    x = minx
    while x < maxx:
        y = miny
        while y < maxy:
            grid = box(x, y, x + grid_size, y + grid_size)
            if utm_gdf.intersects(grid).any():
                grid_cells.append(grid)
            y += grid_size
        x += grid_size

    grid_gdf = gpd.GeoDataFrame(geometry=grid_cells, crs=utm_gdf.crs)
    # Clip grids to boundary
    clipped = gpd.overlay(grid_gdf, utm_gdf, how="intersection")
    return clipped.to_crs("EPSG:4326")  # back to WGS84 for visualization


def visualize_with_grid(boundary_gdf, grid_gdf, title="Region with 1km Grid"):
    """Plot the region and its 1km grid."""
    fig, ax = plt.subplots(figsize=(5, 5))
    boundary_gdf.plot(ax=ax, facecolor="none", edgecolor="black", linewidth=2)
    grid_gdf.plot(ax=ax, facecolor="none", edgecolor="red", linewidth=0.5)
    ax.set_title(title, fontsize=14)
    plt.show()


def process_all_districts(input_dir="geojson_boundaries", output_dir="district_grids"):
    """Generate 1km grids for each district and save them as GeoJSON."""
    os.makedirs(output_dir, exist_ok=True)

    for filename in os.listdir(input_dir):
        if filename.endswith(".geojson"):
            path = os.path.join(input_dir, filename)
            try:
                boundary_gdf = load_geojson(path)
                grid_gdf = make_grid(boundary_gdf, grid_size=2000)

                # Save grid
                out_path = os.path.join(output_dir, filename.replace(".geojson", "_grid.geojson"))
                grid_gdf.to_file(out_path, driver="GeoJSON")

                print(f"✅ Processed {filename}, saved {out_path}")

                # Visualize
                visualize_with_grid(boundary_gdf, grid_gdf, title=boundary_gdf.iloc[0].get("name", filename))
            except Exception as e:
                print(f"❌ Failed {filename}: {e}")


if __name__ == "__main__":
    process_all_districts()
