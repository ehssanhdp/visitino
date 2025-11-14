package apis

import (
	"backend/internal/pkg/models"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

func CallNeshanTSP(waypoints []string, roundTrip, sourceIsAnyPoint, lastIsAnyPoint bool) (*models.TSPResponse, error) {
	wpParam := strings.Join(waypoints, "|")

	u, _ := url.Parse(os.Getenv("NeshanTSPAPIURL"))
	q := u.Query()
	q.Set("waypoints", wpParam)
	q.Set("roundTrip", fmt.Sprintf("%t", roundTrip))
	q.Set("sourceIsAnyPoint", fmt.Sprintf("%t", sourceIsAnyPoint))
	q.Set("lastIsAnyPoint", fmt.Sprintf("%t", lastIsAnyPoint))
	u.RawQuery = q.Encode()

	client := &http.Client{Timeout: 10 * time.Second}
	req, _ := http.NewRequest("GET", u.String(), nil)
	req.Header.Set("Api-Key", os.Getenv("TSPAPI"))

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("tsp API error: %d %s", resp.StatusCode, string(bodyBytes))
	}

	var tr models.TSPResponse
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return nil, err
	}
	return &tr, nil
}

func CallNeshanSearch(keywords string, lat float64, lng float64) (*models.SearchResponse, error) {

	u, _ := url.Parse(os.Getenv("NeshanSearchAPIURL"))
	q := u.Query()
	q.Set("lat", fmt.Sprintf("%f", lat))
	q.Set("lng", fmt.Sprintf("%f", lng))
	q.Set("term", keywords)
	u.RawQuery = q.Encode()
	client := &http.Client{Timeout: 10 * time.Second}
	req, _ := http.NewRequest("GET", u.String(), nil)
	req.Header.Set("Api-Key", os.Getenv("SEARCHAPI"))

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("search API error: %d %s", resp.StatusCode, string(bodyBytes))
	}

	var sr models.SearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&sr); err != nil {
		return nil, err
	}
	return &sr, nil
}

// func CalculateDistances(userLat, userLng float64, waypoints []string) ([]models.StoreDistance, error) {
// 	fmt.Println("calculating distance")
// 	origins := fmt.Sprintf("%f,%f", userLat, userLng)
// 	destinations := strings.Join(waypoints, "|")

// 	u, _ := url.Parse(os.Getenv("NeshanDistanceMatrix"))
// 	q := u.Query()
// 	q.Set("origins", origins)
// 	q.Set("destinations", destinations)
// 	q.Set("type", "car")
// 	u.RawQuery = q.Encode()

// 	client := &http.Client{Timeout: 10 * time.Second}
// 	req, _ := http.NewRequest("GET", u.String(), nil)
// 	req.Header.Set("Api-Key", os.Getenv("NeshanAPIKey"))

// 	resp, err := client.Do(req)
// 	if err != nil {
// 		return nil, err
// 	}
// 	defer resp.Body.Close()

// 	if resp.StatusCode != http.StatusOK {
// 		bodyBytes, _ := io.ReadAll(resp.Body)
// 		return nil, fmt.Errorf("distance matrix API error: %d %s", resp.StatusCode, string(bodyBytes))
// 	}

// 	var distResp struct {
// 		Rows []struct {
// 			Elements []struct {
// 				Status   string `json:"status"`
// 				Duration struct {
// 					Value int    `json:"value"`
// 					Text  string `json:"text"`
// 				} `json:"duration"`
// 				Distance struct {
// 					Value int    `json:"value"`
// 					Text  string `json:"text"`
// 				} `json:"distance"`
// 			} `json:"elements"`
// 		} `json:"rows"`
// 	}
// 	if err := json.NewDecoder(resp.Body).Decode(&distResp); err != nil {
// 		fmt.Println("Error decoding distance matrix API response:", err)
// 		return nil, err
// 	}

// 	// Extract distances and durations
// 	var results []models.StoreDistance
// 	for _, row := range distResp.Rows {
// 		for _, element := range row.Elements {
// 			if element.Status == "OK" || element.Status == "Ok" {
// 				results = append(results, models.StoreDistance{
// 					DurationSec:  element.Duration.Value,
// 					DurationText: element.Duration.Text,
// 					DistanceM:    element.Distance.Value,
// 					DistanceText: element.Distance.Text,
// 				})
// 			} else {
// 				// Push failures to the end by assigning a very large distance
// 				results = append(results, models.StoreDistance{
// 					DurationSec:  1e9,
// 					DurationText: "نامشخص",
// 					DistanceM:    1e9,
// 					DistanceText: "نامشخص",
// 				})
// 			}
// 		}
// 	}
// 	return results, nil
// }
