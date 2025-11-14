package db

import (
	"database/sql/driver"
	"encoding/hex"
	"fmt"
	"log"
	"time"

	"github.com/twpayne/go-geom"
	"github.com/twpayne/go-geom/encoding/ewkb"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var Database *gorm.DB

type User struct {
	UserID         uint      `gorm:"primaryKey"`
	FirstName      string    `gorm:"size:50;not null"`
	LastName       string    `gorm:"size:50;not null"`
	PhoneNumber    string    `gorm:"size:20;unique;not null"`
	HashedPassword string    `gorm:"size:60;not null"`
	Role           string    `gorm:"type:varchar(20);not null;default:visitor;check:role IN ('visitor','admin','moderator')"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime"`
	Visits         []Visited `gorm:"foreignKey:VisitorID;constraint:OnDelete:CASCADE"`
}

// Visited model with POINT
type Visited struct {
	ID              uint          `gorm:"primaryKey"`
	VisitorID       uint          `gorm:"not null"`
	UserLocation    EWKBGeomPoint `gorm:"type:geometry(POINT,4326);not null"`
	VisitedLocation EWKBGeomPoint `gorm:"type:geometry(POINT,4326);not null"`
	VisitTime       time.Time     `gorm:"autoCreateTime"`
}

type EWKBGeomPoint geom.Point

func (g *EWKBGeomPoint) Scan(input interface{}) error {
	var data []byte
	switch v := input.(type) {
	case []byte:
		data = v
	case string:
		// PostGIS sometimes returns hex string (EWKB)
		decoded, err := hex.DecodeString(v)
		if err != nil {
			return fmt.Errorf("EWKBGeomPoint.Scan: hex decode failed: %w", err)
		}
		data = decoded
	default:
		return fmt.Errorf("EWKBGeomPoint.Scan: unsupported type %T", v)
	}

	gt, err := ewkb.Unmarshal(data)
	if err != nil {
		return fmt.Errorf("EWKBGeomPoint.Scan: unmarshal failed: %w", err)
	}

	point, ok := gt.(*geom.Point)
	if !ok {
		return fmt.Errorf("EWKBGeomPoint.Scan: expected *geom.Point, got %T", gt)
	}

	*g = EWKBGeomPoint(*point)
	return nil
}

func (g EWKBGeomPoint) Value() (driver.Value, error) {
	b := geom.Point(g)
	bp := &b
	ewkbPt := ewkb.Point{Point: bp.SetSRID(4326)}
	return ewkbPt.Value()
}

func InitDatabase(DBPassword, DBUser, DBName, DBHost, DBPort string) {

	dsn := fmt.Sprintf(
		"user=%s password=%s dbname=%s host=%s port=%s sslmode=disable TimeZone=UTC",
		DBUser, DBPassword, DBName, DBHost, DBPort,
	)

	var err error
	Database, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	err = Database.AutoMigrate(
		&User{},
		&Visited{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database connection established successfully")
}

func CloseDatabase(DBUser, DBPassword, DBName, DBHost, DBPort string) {
	dsn := fmt.Sprintf(
		"user=%s password=%s dbname=%s host=%s port=%s sslmode=disable TimeZone=UTC",
		DBUser, DBPassword, DBName, DBHost, DBPort,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("failed to get database instance: %v", err)
	}

	if err := sqlDB.Close(); err != nil {
		log.Fatalf("failed to close database connection: %v", err)
	}

	log.Println("Database connection closed successfully")
}
