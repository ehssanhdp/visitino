package utils

import (
	"backend/internal/db"
	"backend/internal/pkg/models"
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"math"
	"regexp"
	"sort"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Reorder waypoints based on proximity to the user
func ReorderWaypointsByDistance(distances []float64, waypoints []string, titles []string) ([]string, []string) {
	type wp struct {
		Distance float64
		Waypoint string
		Title    string
	}

	list := []wp{}
	for i := range waypoints {
		list = append(list, wp{
			Distance: distances[i],
			Waypoint: waypoints[i],
			Title:    titles[i],
		})
	}

	// Sort by distance
	sort.Slice(list, func(i, j int) bool {
		return list[i].Distance < list[j].Distance
	})

	optimizedWaypoints := []string{}
	optimizedTitles := []string{}
	for _, w := range list {
		optimizedWaypoints = append(optimizedWaypoints, w.Waypoint)
		optimizedTitles = append(optimizedTitles, w.Title)
	}

	return optimizedWaypoints, optimizedTitles
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func NormalizePhone(phone string) (string, error) {
	fmt.Println("Normalizing phone number:", phone)
	re := regexp.MustCompile(`^((0?9)|(\+?989))\d{9}$`)
	if !re.MatchString(phone) {
		return "", fmt.Errorf("invalid phone number")
	}

	// Remove "0" prefix if present
	phone = strings.TrimPrefix(phone, "0")
	// Ensure it starts with "+98"
	if !strings.HasPrefix(phone, "+98") {
		phone = "+98" + phone
	}
	return phone, nil
}

func CheckUserExists(database *gorm.DB, phonenumber string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user db.User

	result := database.WithContext(ctx).Where("phone_number = ?", phonenumber).First(&user)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, result.Error
	}

	return true, nil
}

func GetUserCredentials(database *gorm.DB, phonenumber string) (int, string, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user db.User

	result := database.WithContext(ctx).Where("phone_number = ?", phonenumber).First(&user)

	if result.Error != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return 0, "", "", fmt.Errorf("database operation timed out")
		}
		return 0, "", "", result.Error
	}

	return int(user.UserID), user.HashedPassword, user.Role, nil
}

func GenerateToken(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		log.Fatalf("Failed to generate token: %v", err)
	}
	return base64.URLEncoding.EncodeToString(bytes)
}

func HaversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000 // Earth radius in meters
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180

	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

// sortByDistance sorts SearchItems by distance from the given point.
func SortByDistance(items []models.SearchItem, lat, lon float64) {
	for i := range items {

		dist := HaversineDistance(lat, lon, items[i].Location.Y, items[i].Location.X)
		items[i].DistanceM = int(dist)
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].DistanceM < items[j].DistanceM
	})
}
