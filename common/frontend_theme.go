package common

import (
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

const FrontendThemeCookieName = "frontend_theme"
const FrontendThemeCookieMaxAge = 60 * 60 * 24 * 365
const FrontendThemeSessionKey = "frontend_theme"

func NormalizeFrontendTheme(theme string) string {
	theme = strings.ToLower(strings.TrimSpace(theme))
	if theme == "default" || theme == "classic" {
		return theme
	}
	return ""
}

func SetFrontendThemeCookie(c *gin.Context, theme string) {
	theme = NormalizeFrontendTheme(theme)
	if theme == "" {
		return
	}
	c.SetCookie(FrontendThemeCookieName, theme, FrontendThemeCookieMaxAge, "/", "", false, false)
}

var classicToDefaultMap = map[string]string{
	"/console":              "/dashboard",
	"/console/personal":     "/profile",
	"/console/channel":      "/channels",
	"/console/token":        "/keys",
	"/console/log":          "/usage-logs",
	"/console/setting":      "/system-settings",
	"/console/topup":        "/wallet",
	"/console/redemption":   "/redemption-codes",
	"/console/user":         "/users",
	"/console/midjourney":   "/usage-logs",
	"/console/task":         "/usage-logs",
	"/console/models":       "/models",
	"/console/deployment":   "/models/deployments",
	"/console/subscription": "/subscriptions",
	"/console/playground":   "/playground",
	"/console/chat":         "/playground",
}

var defaultToClassicMap = map[string]string{
	"/dashboard":        "/console",
	"/profile":          "/console/personal",
	"/channels":         "/console/channel",
	"/keys":             "/console/token",
	"/models":           "/console/models",
	"/usage-logs":       "/console/log",
	"/system-settings":  "/console/setting",
	"/playground":       "/console/playground",
	"/wallet":           "/console/topup",
	"/subscriptions":    "/console/subscription",
	"/redemption-codes": "/console/redemption",
	"/users":            "/console/user",
	"/availability":     "/console",
}

var classicToDefaultPrefixes = []struct{ prefix, replacement string }{
	{"/console/chat/",     "/playground/"},
	{"/console/setting/",  "/system-settings/"},
	{"/console/log/",      "/usage-logs/"},
	{"/console/channel/",  "/channels/"},
	{"/console/token/",    "/keys/"},
	{"/console/models/",   "/models/"},
	{"/console/topup/",    "/wallet/"},
}

var defaultToClassicPrefixes = []struct{ prefix, replacement string }{
	{"/dashboard/",        "/console/"},
	{"/system-settings/",  "/console/setting/"},
	{"/usage-logs/",       "/console/log/"},
	{"/channels/",         "/console/channel/"},
	{"/keys/",             "/console/token/"},
	{"/models/",           "/console/models/"},
}

func normalizeMapPath(path string) string {
	if path == "" {
		return "/"
	}
	unescapedPath, err := url.PathUnescape(path)
	if err == nil && unescapedPath != "" {
		path = unescapedPath
	}
	path = strings.TrimSuffix(path, "/")
	if path == "" {
		path = "/"
	}
	return path
}

func MapFrontendPath(theme string, path string) string {
	normalizedPath := normalizeMapPath(path)

	if theme == "classic" {
		if mapped, ok := defaultToClassicMap[normalizedPath]; ok {
			return mapped
		}
		for _, p := range defaultToClassicPrefixes {
			if strings.HasPrefix(normalizedPath, p.prefix) {
				return p.replacement + normalizedPath[len(p.prefix):]
			}
		}
	}

	if theme == "default" {
		if mapped, ok := classicToDefaultMap[normalizedPath]; ok {
			return mapped
		}
		for _, p := range classicToDefaultPrefixes {
			if strings.HasPrefix(normalizedPath, p.prefix) {
				return p.replacement + normalizedPath[len(p.prefix):]
			}
		}
	}

	return ""
}

func GetThemeAwarePath(c *gin.Context, classicPath string) string {
	theme := GetTheme()
	themeCookie, err := c.Cookie(FrontendThemeCookieName)
	if err == nil {
		normalized := NormalizeFrontendTheme(themeCookie)
		if normalized != "" {
			theme = normalized
		}
	}
	if theme == "default" {
		path := classicPath
		query := ""
		if idx := strings.Index(classicPath, "?"); idx != -1 {
			path = classicPath[:idx]
			query = classicPath[idx:]
		}
		mapped := MapFrontendPath("default", path)
		if mapped != "" {
			return mapped + query
		}
	}
	return classicPath
}
