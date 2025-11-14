package utils

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateJWT(id int, phoneNumber string, role string) (string, string, error) {
	refreshClaims := jwt.MapClaims{
		"phone": phoneNumber,
		"exp":   time.Now().Add(24 * 7 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
		"jti":   GenerateToken(16),
	}

	accessClaims := jwt.MapClaims{
		"user_id":       id,
		"phone":         phoneNumber,
		"role":          role,
		"exp":           time.Now().Add(100 * time.Minute).Unix(),
		"iat":           time.Now().Unix(),
		"jti":           GenerateToken(16),
		"refresh_token": refreshClaims["jti"],
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)

	accessString, err := accessToken.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return "", "", err
	}
	refreshString, err := refreshToken.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return "", "", err
	}

	return accessString, refreshString, nil
}

func ValidateJWT(tokenString string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
}
