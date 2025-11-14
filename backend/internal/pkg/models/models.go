package models

type SearchRequest struct {
	Keywords       string `json:"keywords"`
	Selectedregion string `json:"selectedregion"`
	UserLocation   struct {
		Lat float64 `json:"lat"`
		Lng float64 `json:"lng"`
	} `json:"userLocation"`
}

type OptimizeRequest struct {
	User struct {
		Lat float64 `json:"lat"`
		Lng float64 `json:"lng"`
	} `json:"user"`
	Stores []Store `json:"stores"`
}

type Store struct {
	Title         string  `json:"title"`
	Lat           float64 `json:"lat"`
	Lng           float64 `json:"lng"`
	Neighbourhood string  `json:"neighbourhood"`
	Address       string  `json:"address"`
	LastVisit     string  `json:"lastVisit"`
	DistanceM     int     `json:"distanceM,omitempty"`
}

// --- Neshan Search API response ---
type SearchItem struct {
	Title         string `json:"title"`
	Address       string `json:"address"`
	Neighbourhood string `json:"neighbourhood"`
	Region        string `json:"region"`
	Type          string `json:"type"`
	Category      string `json:"category"`
	Location      struct {
		X float64 `json:"x"`
		Y float64 `json:"y"`
	} `json:"location"`
	DistanceM int `json:"distanceM,omitempty"`
}

type SearchResponse struct {
	Count int          `json:"count"`
	Items []SearchItem `json:"items"`
}

// --- Neshan TSP API response ---
type TSPPoint struct {
	Name          string     `json:"name"`
	Location      [2]float64 `json:"location"`
	Index         int        `json:"index"`
	Neighbourhood string     `json:"neighbourhood"`
	Address       string     `json:"address"`
	LastVisit     string     `json:"lastVisit"`
	DistanceM     int        `json:"distanceM,omitempty"`
}

type TSPResponse struct {
	Points []TSPPoint `json:"points"`
}

// type StoreDistance struct {
// 	DurationSec  int
// 	DurationText string
// 	DistanceM    int
// 	DistanceText string
// }

type MarkVisitedRequest struct {
	VisitedLocation struct {
		Lat float64 `json:"lat"`
		Lng float64 `json:"lng"`
	} `json:"visitedLocation"`
	UserLocation struct {
		Lat float64 `json:"lat"`
		Lng float64 `json:"lng"`
	} `json:"userLocation"`
}

type RegisterRequest struct {
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	PhoneNumber string `json:"phone"`
	Password    string `json:"password"`
	Role        string `json:"role"`
}

type LoginRequest struct {
	PhoneNumber string `json:"phone"`
	Password    string `json:"password"`
}

type TokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}
