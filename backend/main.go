package main

import (
	"backend/internal/db"
	"backend/internal/pkg/utils"
	"backend/internal/router"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")

	}

	DBPassword := os.Getenv("DBPassword")
	DBUser := os.Getenv("DBUser")
	DBName := os.Getenv("DBName")
	DBHost := os.Getenv("DBHost")
	DBPort := os.Getenv("DBPort")

	db.InitDatabase(DBPassword, DBUser, DBName, DBHost, DBPort)

	sqlDB, err := db.Database.DB()
	if err != nil {
		log.Fatal("failed to get sql.DB from gorm DB:", err)
	}
	defer sqlDB.Close()

	if err := utils.InitRedis(); err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}

	r := router.Router()

	port := "0.0.0.0:8080"
	fmt.Printf("Server starting on %s...\n", port)
	log.Fatal(http.ListenAndServe(port, r))
}
