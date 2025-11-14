package handler

import (
	"backend/internal/db"
	"backend/internal/middleware"
	"backend/internal/pkg/models"
	"backend/internal/pkg/utils"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

func UserRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	fmt.Println("register")

	var req models.RegisterRequest
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	phonenumber, err := utils.NormalizePhone(req.PhoneNumber)
	if err != nil {
		http.Error(w, "Phone number format invalid", http.StatusNotAcceptable)
		return
	}
	fmt.Println("ok")
	exists, err := utils.CheckUserExists(db.Database, phonenumber)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "کاربری با این شماره ثبت شده است", http.StatusConflict)
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "Password hashing error", http.StatusInternalServerError)
		return
	}

	user := db.User{FirstName: req.FirstName, LastName: req.LastName, PhoneNumber: phonenumber, HashedPassword: hashedPassword, Role: req.Role}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	err = gorm.G[db.User](db.Database).Create(ctx, &user)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			http.Error(w, "Database operation timed out", http.StatusServiceUnavailable)
			return
		}
		http.Error(w, "Database insert error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully!"})
}

func Login(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Login attempt")
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginRequest
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	phonenumber, err := utils.NormalizePhone(req.PhoneNumber)
	if err != nil {
		http.Error(w, "Phone number format invalid", http.StatusNotAcceptable)
		return
	}

	// Check if user already exists
	exists, err := utils.CheckUserExists(db.Database, phonenumber)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	userID, hashedPassword, userType, err := utils.GetUserCredentials(db.Database, phonenumber)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// Check if the entered password matches the stored hash
	if !utils.CheckPasswordHash(req.Password, hashedPassword) {
		http.Error(w, "Invalid password", http.StatusUnauthorized)
		return
	}

	// After password validation
	accessToken, refreshToken, err := utils.GenerateJWT(userID, phonenumber, userType)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

func Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Get claims from context (already validated by middleware)
	claims, ok := r.Context().Value(middleware.UserContextKey).(jwt.MapClaims)
	if !ok {
		http.Error(w, "Invalid token claims", http.StatusUnauthorized)
		return
	}

	tokenID, ok := claims["jti"].(string)
	if !ok {
		http.Error(w, "Invalid token ID", http.StatusUnauthorized)
		return
	}

	refreshTokenCookie, err := r.Cookie("refresh_token")
	if err != nil {
		http.Error(w, "Refresh token missing", http.StatusUnauthorized)
		return
	}

	refreshTokenString := refreshTokenCookie.Value
	refreshToken, err := utils.ValidateJWT(refreshTokenString)
	if err != nil {
		http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
		return
	}

	refreshClaims, ok := refreshToken.Claims.(jwt.MapClaims)
	if !ok {
		http.Error(w, "Invalid refresh token claims", http.StatusUnauthorized)
		return
	}
	refreshTokenID, ok := refreshClaims["jti"].(string)
	if !ok {
		http.Error(w, "Invalid refresh token ID", http.StatusUnauthorized)
		return
	}

	// Blacklist the token
	err = utils.BlacklistToken(tokenID, 15*time.Minute)
	erRefresh := utils.BlacklistToken(refreshTokenID, 7*24*time.Hour)
	if err != nil {
		http.Error(w, "Error blacklisting token", http.StatusInternalServerError)
		return
	}
	if erRefresh != nil {
		http.Error(w, "Error blacklisting refresh token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Logout successful!",
	})
}

func Protected(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Get user claims from context
	claims, ok := r.Context().Value(middleware.UserContextKey).(jwt.MapClaims)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	phoneNumber, phoneOk := claims["phone"].(string)
	role, roleOk := claims["role"].(string)

	if !phoneOk || !roleOk {
		http.Error(w, "Invalid token data", http.StatusForbidden)
		return
	}

	// Respond with user details
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Protected route accessed",
		"phone":   phoneNumber,
		"role":    role,
	})
}

func Refresh(w http.ResponseWriter, r *http.Request) {
	fmt.Println("refresh attempt")
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Get claims from context (already validated by middleware)
	claims, ok := r.Context().Value(middleware.UserContextKey).(jwt.MapClaims)
	if !ok {
		http.Error(w, "Invalid token claims", http.StatusUnauthorized)
		return
	}
	phonenumber, ok := claims["phone"].(string)
	if !ok {
		http.Error(w, "Invalid phone number in token", http.StatusUnauthorized)
		return
	}

	userType, ok := claims["role"].(string)
	if !ok {
		http.Error(w, "Invalid role in token", http.StatusUnauthorized)
		return
	}

	userID, ok := claims["user_id"].(float64) // JWT stores numeric values as float64
	if !ok {
		http.Error(w, "Invalid user ID in token", http.StatusUnauthorized)
		return
	}

	accessToken, refreshToken, err := utils.GenerateJWT(int(userID), phonenumber, userType)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}
