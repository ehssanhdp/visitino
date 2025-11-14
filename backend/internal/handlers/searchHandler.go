package handler

import (
	"backend/internal/db"
	"backend/internal/middleware"
	"backend/internal/pkg/apis"
	"backend/internal/pkg/models"
	"backend/internal/pkg/utils"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/twpayne/go-geom"
)

// -------------------- Handlers --------------------

type CoveredCoordinate struct {
	RefLat float64
	RefLng float64
	Plat   float64
	Plng   float64
}

// 1) Search handler
func SearchShops(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.SearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Split keywords by comma
	keywords := strings.Split(req.Keywords, "،")
	regionNum, err := strconv.Atoi(req.Selectedregion)
	if err != nil {
		http.Error(w, "Invalid region number: "+err.Error(), http.StatusBadRequest)
		return
	}
	userLat := req.UserLocation.Lat
	userLng := req.UserLocation.Lng

	var combined models.SearchResponse

	if len(keywords) > 3 {
		http.Error(w, "Maximum 3 keywords allowed", http.StatusBadRequest)
		return
	}

	for _, kw := range keywords {
		kw = strings.TrimSpace(kw)
		if kw == "" {
			continue
		}
		processedPoly := [][]CoveredCoordinate{}
		continue_region_process := true
		for continue_region_process {
			polyJSON, _ := json.Marshal(processedPoly)
			cmd := exec.Command("python", "../backend/internal/pkg/utils/districtOperations/region_processor.py", fmt.Sprintf("%d", regionNum))
			stdin, _ := cmd.StdinPipe()
			go func() {
				defer stdin.Close()
				_, _ = stdin.Write(polyJSON)

			}()

			out, err := cmd.CombinedOutput()
			fmt.Println(string(out))

			if err != nil {
				http.Error(w, "Region processing error: "+err.Error(), http.StatusInternalServerError)
				return
			}
			output := strings.TrimSpace(string(out))

			re := regexp.MustCompile(`[-+]?\d*\.\d+|\d+`)
			matches := re.FindAllString(output, -1)
			if len(matches) < 2 {
				http.Error(w, "Invalid output from region processor", http.StatusInternalServerError)
				return
			}
			lat := matches[len(matches)-2]
			lng := matches[len(matches)-1]
			latFloat, _ := strconv.ParseFloat(lat, 64)
			lngFloat, _ := strconv.ParseFloat(lng, 64)
			if latFloat != 0 && lngFloat != 0 {
				res, err := apis.CallNeshanSearch(kw, latFloat, lngFloat)
				if err != nil {
					fmt.Println("Search API error:", err)
					http.Error(w, "Search API error: "+err.Error(), http.StatusInternalServerError)
					return
				}

				utils.SortByDistance(res.Items, latFloat, lngFloat)

				processedPoly = append(processedPoly, []CoveredCoordinate{{RefLat: latFloat, RefLng: lngFloat, Plat: res.Items[len(res.Items)-2].Location.Y, Plng: res.Items[len(res.Items)-2].Location.X}})
				combined.Items = append(combined.Items, res.Items...)
				combined.Count += res.Count
			} else {
				continue_region_process = false
			}

		}
	}

	if len(combined.Items) > 0 {
		// Remove duplicates (based on coordinates)
		unique := make([]models.SearchItem, 0, len(combined.Items))
		seen := make(map[string]bool)

		for _, it := range combined.Items {
			// Key could also be it.ID or it.Title if available
			key := fmt.Sprintf("%f,%f", it.Location.X, it.Location.Y)
			if !seen[key] {
				seen[key] = true
				unique = append(unique, it)
			}
		}

		combined.Items = unique
		combined.Count = len(unique)
	}

	itemsJSON, err := json.Marshal(combined.Items)
	if err != nil {
		http.Error(w, "JSON marshal error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	cmd := exec.Command("python", "../backend/internal/pkg/utils/districtOperations/region_checker.py", fmt.Sprintf("%d", regionNum))
	cmd.Stdin = bytes.NewReader(itemsJSON)

	out, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Println("Python error:", err)
		http.Error(w, "Region processing error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	// Python returns filtered items JSON
	filteredJSON := strings.TrimSpace(string(out))

	// Replace combined.Items with filtered ones
	var filteredItems []models.SearchItem
	if err := json.Unmarshal([]byte(filteredJSON), &filteredItems); err != nil {
		http.Error(w, "Unmarshal error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	combined.Items = filteredItems
	combined.Count = len(filteredItems)

	for idx, it := range combined.Items {
		dist := int(utils.HaversineDistance(userLat, userLng, it.Location.Y, it.Location.X))
		combined.Items[idx].DistanceM = dist
	}

	// Sort items by distance (closest first)
	sort.Slice(combined.Items, func(i, j int) bool {
		return combined.Items[i].DistanceM < combined.Items[j].DistanceM
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(combined)
}

// 2) Optimize route handler (user location inside JSON body)
func OptimizeRoute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.OptimizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Prepare waypoints from Stores
	waypoints := []string{}
	for _, store := range req.Stores {
		waypoints = append(waypoints, fmt.Sprintf("%f,%f", store.Lat, store.Lng))
	}

	// Call the Neshan TSP API with the optimized waypoints
	tspResp, err := apis.CallNeshanTSP(waypoints, true, false, true)
	if err != nil {
		http.Error(w, "TSP API error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Map TSP index back to original titles and attach full store info (with distance/time)
	for i, point := range tspResp.Points {
		if point.Index >= 0 && point.Index < len(req.Stores) {
			tspResp.Points[i].Name = req.Stores[point.Index].Title
			tspResp.Points[i].Neighbourhood = req.Stores[point.Index].Neighbourhood
			tspResp.Points[i].Address = req.Stores[point.Index].Address
			tspResp.Points[i].LastVisit = req.Stores[point.Index].LastVisit
			tspResp.Points[i].DistanceM = req.Stores[point.Index].DistanceM
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tspResp)
}

func MarkVisited(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.MarkVisitedRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}
	fmt.Println(req)

	claims, ok := r.Context().Value(middleware.UserContextKey).(jwt.MapClaims)
	if !ok {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}
	userIDFloat, _ := claims["user_id"].(float64)
	userID := int(userIDFloat)

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userPoint := geom.NewPointFlat(geom.XY, []float64{req.UserLocation.Lng, req.UserLocation.Lat}).SetSRID(4326)
	visitedPoint := geom.NewPointFlat(geom.XY, []float64{req.VisitedLocation.Lng, req.VisitedLocation.Lat}).SetSRID(4326)
	fmt.Println(userPoint)
	record := db.Visited{
		VisitorID:       uint(userID),
		UserLocation:    db.EWKBGeomPoint(*userPoint),
		VisitedLocation: db.EWKBGeomPoint(*visitedPoint),
	}

	if err := db.Database.WithContext(ctx).Create(&record).Error; err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Visited marked successfully!"})
}
