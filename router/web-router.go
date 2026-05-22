package router

import (
	"embed"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

// ThemeAssets holds the embedded frontend assets for both themes.
type ThemeAssets struct {
	DefaultBuildFS   embed.FS
	DefaultIndexPage []byte
	ClassicBuildFS   embed.FS
	ClassicIndexPage []byte
}

func SetWebRouter(router *gin.Engine, assets ThemeAssets) {
	defaultFS := common.EmbedFolder(assets.DefaultBuildFS, "web/default/dist")
	classicFS := common.EmbedFolder(assets.ClassicBuildFS, "web/classic/dist")

	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(middleware.GlobalWebRateLimit())
	router.Use(middleware.Cache())
	router.NoRoute(func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		if strings.HasPrefix(c.Request.RequestURI, "/v1") || strings.HasPrefix(c.Request.RequestURI, "/api") {
			controller.RelayNotFound(c)
			return
		}

		theme := resolveFrontendTheme(c)
		themeFS := selectFrontendFS(theme, defaultFS, classicFS)
		requestPath := strings.TrimPrefix(c.Request.URL.Path, "/")
		if requestPath != "" && themeFS.Exists("/", requestPath) {
			http.FileServer(themeFS).ServeHTTP(c.Writer, c.Request)
			return
		}

		c.Header("Cache-Control", "no-cache")
		if theme == "classic" {
			c.Data(http.StatusOK, "text/html; charset=utf-8", assets.ClassicIndexPage)
		} else {
			c.Data(http.StatusOK, "text/html; charset=utf-8", assets.DefaultIndexPage)
		}
	})
}

func resolveFrontendTheme(c *gin.Context) string {
	return common.GetTheme()
}

func selectFrontendFS(theme string, defaultFS, classicFS static.ServeFileSystem) static.ServeFileSystem {
	if theme == "classic" {
		return classicFS
	}
	return defaultFS
}
