package routes

import (
	"encoding/base64"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type PreloginBody struct {
	Username string `json:"username" binding:"required,min=3,max=32,regexp=^[a-zA-Z0-9_-]$"`
}

func Prelogin(c *gin.Context) {
	var body PreloginBody
	if !util.BindJSON(c, &body) {
		return
	}

	var user models.User
	if err := util.UserCollection.FindOne(util.Context, bson.M{
		"username": strings.ToLower(body.Username),
	}).Decode(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid username",
		})

		return
	}

	c.JSON(http.StatusOK, gin.H{
		"salt": base64.RawURLEncoding.EncodeToString(user.Salt),
	})
}
