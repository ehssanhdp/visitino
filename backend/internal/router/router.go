package router

import (
	handler "backend/internal/handlers"

	"github.com/gorilla/mux"
)

func Router() *mux.Router {
	r := mux.NewRouter()

	r.HandleFunc("/register", handler.UserRegister).Methods("POST")
	r.HandleFunc("/login", handler.Login).Methods("POST")
	r.HandleFunc("/logout", handler.Logout).Methods("POST")
	r.HandleFunc("/refresh", handler.Refresh).Methods("POST")
	r.HandleFunc("/protected", handler.Protected).Methods("POST")

	r.HandleFunc("/search-shops", handler.SearchShops).Methods("POST")
	r.HandleFunc("/optimize-routes", handler.OptimizeRoute).Methods("POST")
	r.HandleFunc("/mark-visited", handler.MarkVisited).Methods("POST")

	return r
}
