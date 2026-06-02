package dto

type StatusPageSiteMeta struct {
	Enabled     bool   `json:"enabled"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Timezone    string `json:"timezone"`
}

type StatusPageSummaryResponse struct {
	Site          StatusPageSiteMeta        `json:"site"`
	OverallStatus string                    `json:"overall_status"`
	GeneratedAt   int64                     `json:"generated_at"`
	Components    []StatusPageComponentView `json:"components"`
	Incidents     []StatusPageIncidentView  `json:"incidents"`
}

type StatusPageComponentView struct {
	Id          int                     `json:"id"`
	Name        string                  `json:"name"`
	Description string                  `json:"description"`
	Status      string                  `json:"status"`
	Source      string                  `json:"source,omitempty"`
	Total       int64                   `json:"total,omitempty"`
	Success     int64                   `json:"success,omitempty"`
	Uptime90d   float64                 `json:"uptime_90d"`
	DailyUptime []StatusPageDailyUptime `json:"daily_uptime"`
}

type StatusPageDailyUptime struct {
	Date    string  `json:"date"`
	Status  string  `json:"status"`
	Uptime  float64 `json:"uptime"`
	Total   int64   `json:"total"`
	Success int64   `json:"success"`
}

type StatusPageIncidentView struct {
	Id           int                        `json:"id"`
	Title        string                     `json:"title"`
	Impact       string                     `json:"impact"`
	Status       string                     `json:"status"`
	StartedAt    int64                      `json:"started_at"`
	ResolvedAt   int64                      `json:"resolved_at"`
	ComponentIds []int                      `json:"component_ids"`
	Updates      []StatusPageIncidentUpdate `json:"updates"`
}

type StatusPageIncidentUpdate struct {
	Id        int    `json:"id"`
	Status    string `json:"status"`
	Message   string `json:"message"`
	CreatedAt int64  `json:"created_at"`
}

type StatusPageModelOptionsResponse struct {
	Group        string                  `json:"group"`
	Days         int                     `json:"days"`
	Source       string                  `json:"source"`
	Items        []StatusPageModelOption `json:"items"`
	DefaultModel string                  `json:"default_model"`
}

type StatusPageModelOption struct {
	Model        string `json:"model"`
	SuccessCount int64  `json:"success_count"`
	TotalCount   int64  `json:"total_count"`
	LastUsedAt   int64  `json:"last_used_at"`
	Fallback     bool   `json:"fallback"`
}
