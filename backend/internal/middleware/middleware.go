package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"backend/internal/pkg/models"
	"backend/internal/pkg/utils"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserContextKey contextKey = "user"

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header missing", http.StatusUnauthorized)
			return
		}

		bearerToken := strings.Split(authHeader, " ")
		if len(bearerToken) != 2 {
			http.Error(w, "Invalid token format", http.StatusUnauthorized)
			return
		}

		// First validate token to get claims and check JTI
		token, err := utils.ValidateJWT(bearerToken[1])
		if err != nil {
			if err.Error() == "token has invalid claims: token is expired" {
				http.Error(w, "Token has expired", http.StatusUnauthorized)
				return
			}
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		// Validate all required claims
		_, ok = claims["phone"].(string)
		if !ok {
			http.Error(w, "Invalid phone number in token", http.StatusUnauthorized)
			return
		}

		_, ok = claims["role"].(string)
		if !ok {
			http.Error(w, "Invalid role in token", http.StatusUnauthorized)
			return
		}

		tokenID, ok := claims["jti"].(string)
		if !ok {
			http.Error(w, "Invalid token ID", http.StatusUnauthorized)
			return
		}

		_, ok = claims["user_id"]
		if !ok {
			http.Error(w, "Invalid user ID in token", http.StatusUnauthorized)
			return
		}

		// Check blacklist before proceeding
		isBlacklisted, er := utils.IsTokenBlacklisted(tokenID)
		if er != nil {
			http.Error(w, "Error checking token status", http.StatusInternalServerError)
			return
		}
		if isBlacklisted {
			http.Error(w, "Token has been revoked", http.StatusUnauthorized)
			return
		}

		// Set context and continue
		ctx := context.WithValue(r.Context(), UserContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// Special middleware for refresh route that skips expiry check
func RefreshAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header missing", http.StatusUnauthorized)
			return
		}

		bearerToken := strings.Split(authHeader, " ")
		if len(bearerToken) != 2 {
			http.Error(w, "Invalid token format", http.StatusUnauthorized)
			return
		}

		// Parse without validation
		token, _ := jwt.Parse(bearerToken[1], func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		// Check other claims but skip expiry
		_, ok = claims["phone"].(string)
		if !ok {
			http.Error(w, "Invalid phone number in token", http.StatusUnauthorized)
			return
		}

		_, ok = claims["role"].(string)
		if !ok {
			http.Error(w, "Invalid role in token", http.StatusUnauthorized)
			return
		}

		_, ok = claims["user_id"]
		if !ok {
			http.Error(w, "Invalid user ID in token", http.StatusUnauthorized)
			return
		}

		tokenID, ok := claims["jti"].(string)
		if !ok {
			http.Error(w, "Invalid token ID", http.StatusUnauthorized)
			return
		}

		expired := claims["exp"].(float64)
		if expired >= float64(time.Now().Unix()) {
			http.Error(w, "Token has not expired yet", http.StatusBadRequest)
			return
		}

		JWTRefreshTokenID, ok := claims["refresh_token"].(string)
		if !ok {
			http.Error(w, "Invalid refresh token ID", http.StatusUnauthorized)
			return
		}

		var refreshTokenRequest models.TokenRequest
		if err := json.NewDecoder(r.Body).Decode(&refreshTokenRequest); err != nil {
			http.Error(w, "Invalid request payload", http.StatusBadRequest)
			return
		}

		refreshTokenString := refreshTokenRequest.RefreshToken

		refreshToken, err := utils.ValidateJWT(refreshTokenString)
		if err != nil {
			if err.Error() == "token has invalid claims: token is expired" {
				http.Error(w, "Refresh token has expired please login again", http.StatusUnauthorized)
				return
			}
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
			http.Error(w, "Invalid token ID", http.StatusUnauthorized)
			return
		}

		if refreshTokenID != JWTRefreshTokenID {
			http.Error(w, "Invalid refresh token ID", http.StatusUnauthorized)
			return
		}

		// Check blacklist
		isBlacklisted, er := utils.IsTokenBlacklisted(tokenID)
		isBlacklistedRefresh, erRefresh := utils.IsTokenBlacklisted(refreshTokenID)

		if er != nil {
			http.Error(w, "Error checking token status", http.StatusInternalServerError)
			return
		}
		if isBlacklisted {
			http.Error(w, "Token has been revoked", http.StatusUnauthorized)
			return
		}

		if erRefresh != nil {
			http.Error(w, "Error checking refresh token status", http.StatusInternalServerError)
			return
		}

		if isBlacklistedRefresh {
			http.Error(w, "Refresh token has been revoked", http.StatusUnauthorized)
			return
		}
		utils.BlacklistToken(refreshTokenID, 7*24*time.Hour)

		ctx := context.WithValue(r.Context(), UserContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}
