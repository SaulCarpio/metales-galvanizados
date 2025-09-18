"""
Modelo de Machine Learning para predicción de tiempos de entrega en rutas urbanas.
Basado en el flujo del notebook 'ramonfortnite.ipynb'.

Este script:
1. Descarga/construye la red vial de una zona de interés (El Alto, Bolivia).
2. Simula restricciones viales (por ejemplo, feria semanal).
3. Prepara utilidades para cálculo de rutas y tiempos.
4. Genera un dataset pequeño de pares origen-destino (O-D) con tiempos simulados.
5. (Pendiente) Entrenamiento de modelo Random Forest.

Requiere: osmnx, geopandas, shapely, networkx, numpy, pandas, scikit-learn, matplotlib
"""

import osmnx as ox
import geopandas as gpd
import networkx as nx
import numpy as np
import pandas as pd
from shapely.geometry import Point

# 1. Descargar/Construir la red vial (El Alto – zona 16 de Julio)
def load_graph_z16():
    """
    Intenta cargar la red vial de la zona 16 de Julio por nombre de lugar.
    Si falla, usa un bounding box alrededor de la feria.
    """
    try:
        place_name = "Zona 16 de Julio, El Alto, La Paz, Bolivia"
        G = ox.graph_from_place(place_name, network_type="drive", simplify=True)
        return G, place_name
    except Exception:
        # Fallback: bounding box alrededor de la feria
        lat_c, lon_c = -16.500, -68.189
        delta_deg = 0.015
        north, south = lat_c + delta_deg, lat_c - delta_deg
        east, west  = lon_c + delta_deg, lon_c - delta_deg
        G = ox.graph_from_bbox(north=north, south=south, east=east, west=west, network_type="drive", simplify=True)
        return G, f"bbox alrededor ({lat_c}, {lon_c})"

# 2. Simular restricción por feria (jueves)
def graph_with_feria_restrictions(G, feria_center_latlon=(-16.500, -68.189), buffer_m=700):
    """
    Simula la restricción vial por la feria semanal:
    - Crea un buffer circular alrededor del centro de la feria.
    - Elimina aristas cuyo punto medio cae dentro del buffer.
    """
    G_proj = ox.projection.project_graph(G)
    nodes_proj, edges_proj = ox.graph_to_gdfs(G_proj)
    feria_pt_wgs = Point(feria_center_latlon[1], feria_center_latlon[0])
    feria_pt_proj = gpd.GeoSeries([feria_pt_wgs], crs="EPSG:4326").to_crs(nodes_proj.crs).geometry.values[0]
    feria_buf = feria_pt_proj.buffer(buffer_m)

    # Identificar edges a cerrar: midpoint dentro del buffer
    edges_proj = edges_proj.copy()
    edges_proj["midpoint"] = edges_proj.geometry.interpolate(0.5, normalized=True)
    to_remove = edges_proj[edges_proj["midpoint"].within(feria_buf)].copy()
    to_remove = to_remove.reset_index()

    G_feria_proj = G_proj.copy()
    for idx, row in to_remove.iterrows():
        u, v, k = row["u"], row["v"], row["key"]
        if G_feria_proj.has_edge(u, v, k):
            G_feria_proj.remove_edge(u, v, k)

    # Volver a CRS geográfico
    G_feria = ox.projection.project_graph(G_feria_proj, to_crs="EPSG:4326")
    # Asegurar componente gigante
    if G_feria.number_of_edges() > 0:
        G_feria = ox.utils_graph.get_largest_component(G_feria, strongly=False)
    return G_feria, feria_buf

# 3. Utilidades para cálculo de rutas y tiempos simulados
def ensure_edge_speeds(G, fallback_kph=30.0):
    """
    Asegura que cada edge tenga 'speed_kph' y 'travel_time' (seg) basado en length.
    Si no hay velocidad, usa el fallback.
    """
    for u, v, k, data in G.edges(keys=True, data=True):
        length_m = data.get("length", None)
        if length_m is None:
            if "geometry" in data:
                length_m = data["geometry"].length * 111139
            else:
                length_m = 30.0
            data["length"] = length_m

        speed = data.get("speed_kph", None)
        if speed is None:
            maxspeed = data.get("maxspeed", None)
            if isinstance(maxspeed, list) and len(maxspeed) > 0:
                try:
                    speed = float(str(maxspeed[0]).split()[0])
                except:
                    speed = fallback_kph
            elif isinstance(maxspeed, (int, float)):
                speed = float(maxspeed)
            elif isinstance(maxspeed, str):
                import re
                nums = re.findall(r"\d+\.?\d*", maxspeed)
                if nums:
                    speed = float(nums[0])
                else:
                    speed = fallback_kph
            else:
                speed = fallback_kph

        data["speed_kph"] = float(speed)
        speed_mps = data["speed_kph"] * 1000 / 3600
        data["travel_time"] = data["length"] / max(speed_mps, 1e-3)

def shortest_route_stats(G, orig_node, dest_node, weight="length"):
    """
    Calcula la ruta más corta y retorna distancia y tiempo total.
    """
    try:
        path = nx.shortest_path(G, orig_node, dest_node, weight=weight)
        dist = 0.0
        tsec = 0.0
        for i in range(len(path)-1):
            u, v = path[i], path[i+1]
            best_k, best_data = None, None
            best_w = float("inf")
            for k in G[u][v]:
                w = G[u][v][k].get(weight, float("inf"))
                if w < best_w:
                    best_w = w
                    best_k = k
                    best_data = G[u][v][k]
            if best_data is not None:
                dist += best_data.get("length", 0.0)
                tsec += best_data.get("travel_time", 0.0)
        return path, dist, tsec
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None, np.nan, np.nan

def pick_random_nodes(G, center=None, max_nodes=200, radius_m=1200):
    """
    Escoge nodos aleatorios dentro de un radio del centro (o del centroid si no se da).
    """
    nodes_gdf, _ = ox.graph_to_gdfs(G)
    nodes_gdf = nodes_gdf.to_crs(ox.projection.get_utm_crs(nodes_gdf.unary_union.centroid.y,
                                                           nodes_gdf.unary_union.centroid.x))
    if center is None:
        center = nodes_gdf.unary_union.centroid
    else:
        center = gpd.GeoSeries([Point(center[1], center[0])], crs="EPSG:4326").to_crs(nodes_gdf.crs).geometry.values[0]
    nodes_gdf["dist_center"] = nodes_gdf.geometry.distance(center)
    sub = nodes_gdf[nodes_gdf["dist_center"] <= radius_m]
    if len(sub) < 10:
        sub = nodes_gdf  # fallback sin filtro
    choices = sub.sample(min(max_nodes, len(sub)), random_state=42).index.tolist()
    return choices

# 4. Generar dataset pequeño (O-Ds) y tiempos simulados
def simulate_dataset(G_normal, G_feria, n_pairs=60, feria_center_latlon=(-16.500, -68.189)):
    """
    Genera un dataset de pares O-D con tiempos simulados para entrenamiento ML.
    """
    od_nodes = pick_random_nodes(G_normal, center=feria_center_latlon, max_nodes=150, radius_m=1500)
    if len(od_nodes) < 2:
        raise RuntimeError("No hay suficientes nodos para formar pares O-D.")

    rows = []
    attempts = 0
    while len(rows) < n_pairs and attempts < n_pairs*10:
        attempts += 1
        o, d = np.random.choice(od_nodes, 2, replace=False)

        # Ruta sin feria
        p_norm, dist_norm_m, t_norm_sec = shortest_route_stats(G_normal, o, d, weight="length")
        if p_norm is None or not np.isfinite(dist_norm_m):
            continue

        # Aleatoriamente jueves o no
        is_thursday = np.random.choice([0,1])
        feria_active = bool(is_thursday)
        G_used = G_feria if feria_active else G_normal
        p_used, dist_used_m, t_used_sec = shortest_route_stats(G_used, o, d, weight="length")
        if p_used is None or not np.isfinite(dist_used_m):
            continue

        base_time = t_used_sec
        feria_factor = 1.0 + (0.2 + 0.4*np.random.rand()) if feria_active else 1.0 + (0.0 + 0.1*np.random.rand())
        noise_factor = np.random.normal(loc=1.0, scale=0.05)
        time_real_sec = base_time * feria_factor * max(noise_factor, 0.8)

        rows.append({
            "orig": o,
            "dest": d,
            "dist_m": float(dist_used_m),
            "base_time_sec": float(base_time),
            "time_real_sec": float(time_real_sec),
            "is_thursday": int(is_thursday),
            "feria_active": int(feria_active)
        })
    df = pd.DataFrame(rows)
    return df

if __name__ == "__main__":
    # Ejemplo de uso (comentado para no ejecutar al importar)
    # 1. Cargar grafos
    G_normal, area_ref = load_graph_z16()
    print("Grafo cargado para:", area_ref)
    G_normal = ox.utils_graph.get_largest_component(G_normal, strongly=False)
    G_feria, feria_buffer_proj = graph_with_feria_restrictions(G_normal)

    # 2. Asegurar velocidades/tiempos
    ensure_edge_speeds(G_normal, fallback_kph=30.0)
    ensure_edge_speeds(G_feria, fallback_kph=30.0)

    # 3. Generar dataset pequeño
    df = simulate_dataset(G_normal, G_feria, n_pairs=80)
    print("Dataset generado:", df.shape)
    print(df.head())




    """
REFERENCIA DEL NOTEBOOK ORIGINAL (ramonfortnite.ipynb)
------------------------------------------------------

# 0) Instalación de librerías (Colab)
!pip -q install osmnx==1.9.2 geopandas==0.14.4 shapely==2.0.4 pyproj==3.6.1 rtree==1.3.0 scikit-learn==1.4.2 networkx==3.2.1

# 1) Imports y utilidades
import warnings, random, math, sys, time
import os, numpy as np, pandas as pd, geopandas as gpd, networkx as nx, matplotlib.pyplot as plt
import osmnx as ox
from shapely.geometry import Point, Polygon, box
from shapely.ops import substring
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.ensemble import RandomForestRegressor
from sklearn.neighbors import KNeighborsRegressor

# 2) Descargar/Construir la red vial (El Alto – zona 16 de Julio)
def load_graph_z16(): ...
G_normal, area_ref = load_graph_z16()
G_normal = ox.utils_graph.get_largest_component(G_normal, strongly=False)

# 3) Simular restricción por la feria (jueves todo el día)
def graph_with_feria_restrictions(G, feria_center_latlon, buffer_m): ...
G_feria, feria_buffer_proj = graph_with_feria_restrictions(G_normal)

# 4) Utilidades para cálculo de rutas y tiempos simulados
def ensure_edge_speeds(G, fallback_kph): ...
def shortest_route_stats(G, orig_node, dest_node, weight): ...
def pick_random_nodes(G, center, max_nodes, radius_m): ...
ensure_edge_speeds(G_normal, fallback_kph=30.0)
ensure_edge_speeds(G_feria, fallback_kph=30.0)

# 5) Generar dataset pequeño (O-Ds) y tiempos "reales" simulados
def simulate_dataset(G_normal, G_feria, n_pairs, feria_center_latlon): ...
df = simulate_dataset(G_normal, G_feria, n_pairs=80)

# 6) Entrenamiento ML: Random Forest vs KNN
features = ["dist_m", "base_time_sec", "is_thursday"]
target = "time_real_sec"
X = df[features].values
y = df[target].values
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)
rf = RandomForestRegressor(...)
knn = KNeighborsRegressor(...)
rf.fit(X_train, y_train)
knn.fit(X_train, y_train)
# Evaluación y comparación

# 7) Simular una petición de ruta (usuario) y comparar predicciones
def simulate_single_request(G_normal, G_feria, center_latlon): ...
# Predicción con ambos modelos

# 8) Graficar la ruta en el grafo (normal vs jueves)
def plot_routes(G_normal, G_feria, p_norm, p_fer, feria_center_latlon, feria_buf_proj): ...
# Visualización

# 9) Resumen final
# - Comparativa de modelos (MAE/RMSE)
# - Predicción para solicitud de ruta puntual
# - Interpretación rápida

------------------------------------------------------
Este resumen sirve como guía para futuras implementaciones y para mantener la trazabilidad del flujo original del notebook.
Puedes consultar este bloque para saber cómo continuar con el entrenamiento y despliegue del modelo ML.
"""
# ...aquí sigue el código Python real para tu modelo ML...