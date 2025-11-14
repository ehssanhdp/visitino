package utils

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

func InitRedis() error {
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	ctx := context.Background()
	return RedisClient.Ping(ctx).Err()
}

func BlacklistToken(tokenID string, expiration time.Duration) error {
	ctx := context.Background()
	fmt.Println("Blacklisting token:", tokenID)
	return RedisClient.Set(ctx, "blacklist:"+tokenID, "1", expiration).Err()
}

func IsTokenBlacklisted(tokenID string) (bool, error) {
	ctx := context.Background()

	if RedisClient == nil {
		fmt.Println("RedisClient is NIL!") // debug if client is not initialized
		return false, fmt.Errorf("redis client not initialized")
	}

	exists, err := RedisClient.Exists(ctx, "blacklist:"+tokenID).Result()
	return exists == 1, err
}
