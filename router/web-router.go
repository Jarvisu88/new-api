package router

import (
	"embed"
	"net"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/setting/console_setting"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

// ThemeAssets holds the embedded classic frontend assets.
type ThemeAssets struct {
	ClassicBuildFS   embed.FS
	ClassicIndexPage []byte
}

func isStatusPageHost(host string) bool {
	setting := console_setting.GetConsoleSetting()
	if !setting.StatusPageEnabled || setting.StatusPageDomain == "" {
		return false
	}
	requestHost := stripHostPort(host)
	statusHost := stripHostPort(setting.StatusPageDomain)
	return requestHost != "" && strings.EqualFold(requestHost, statusHost)
}

func stripHostPort(host string) string {
	host = strings.TrimSpace(host)
	if host == "" {
		return ""
	}
	if h, _, err := net.SplitHostPort(host); err == nil {
		return strings.Trim(h, "[]")
	}
	if strings.HasPrefix(host, "[") && strings.Contains(host, "]") {
		host = strings.Trim(host, "[]")
	}
	return host
}

func SetWebRouter(router *gin.Engine, assets ThemeAssets) {
	classicFS := common.EmbedFolder(assets.ClassicBuildFS, "web/classic/dist")

	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(middleware.GlobalWebRateLimit())
	router.Use(middleware.Cache())
	router.Use(static.Serve("/", classicFS))
	router.NoRoute(func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		if strings.HasPrefix(c.Request.RequestURI, "/v1") || strings.HasPrefix(c.Request.RequestURI, "/api") || strings.HasPrefix(c.Request.RequestURI, "/assets") {
			controller.RelayNotFound(c)
			return
		}
		if isStatusPageHost(c.Request.Host) {
			c.Header("Cache-Control", "no-cache")
			c.Data(http.StatusOK, "text/html; charset=utf-8", assets.ClassicIndexPage)
			return
		}
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", assets.ClassicIndexPage)
	})
}
