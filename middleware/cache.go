package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

func Cache() func(c *gin.Context) {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		if isStaticAsset(path) {
			c.Header("Cache-Control", "max-age=604800")
		} else {
			c.Header("Cache-Control", "no-cache")
		}
		c.Header("Cache-Version", "b688f2fb5be447c25e5aa3bd063087a83db32a288bf6a4f35f2d8db310e40b14")
		c.Next()
	}
}

func isStaticAsset(path string) bool {
	if path == "/" {
		return false
	}
	staticExtensions := []string{".js", ".css", ".woff", ".woff2", ".ttf", ".eot",
		".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".map", ".webmanifest"}
	for _, ext := range staticExtensions {
		if strings.HasSuffix(path, ext) {
			return true
		}
	}
	return false
}
