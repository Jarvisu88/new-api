package service

import (
	"errors"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/console_setting"
	"gorm.io/gorm"
)

const (
	statusPageDefaultDays = 90
	statusPageMaxDays     = 90
	statusPageProbeWindow = 24 * time.Hour
)

type statusPageLogCount struct {
	Total   int64 `gorm:"column:total"`
	Success int64 `gorm:"column:success"`
}

type statusPageCurrentStatus struct {
	Status  string
	Source  string
	Total   int64
	Success int64
}

type statusPageModelLogOption struct {
	Model        string `gorm:"column:model"`
	SuccessCount int64  `gorm:"column:success_count"`
	LastUsedAt   int64  `gorm:"column:last_used_at"`
}

type statusPageModelTotalCount struct {
	Model      string `gorm:"column:model"`
	TotalCount int64  `gorm:"column:total_count"`
}

func NormalizeStatusPageDays(days int) int {
	if days <= 0 {
		return statusPageDefaultDays
	}
	if days > statusPageMaxDays {
		return statusPageMaxDays
	}
	return days
}

func BuildStatusPageSummary(days int) (*dto.StatusPageSummaryResponse, error) {
	days = NormalizeStatusPageDays(days)
	components, err := model.GetEnabledStatusPageComponents()
	if err != nil {
		return nil, err
	}
	activeIncidents, err := model.GetActiveStatusPageIncidents()
	if err != nil {
		return nil, err
	}
	recentIncidents, err := model.GetStatusPageSummaryIncidents(10)
	if err != nil {
		return nil, err
	}
	incidentViews, err := BuildStatusPageIncidentViews(recentIncidents)
	if err != nil {
		return nil, err
	}

	componentViews := make([]dto.StatusPageComponentView, 0, len(components))
	for _, component := range components {
		daily, err := GetComponentDailyUptime(component, days)
		if err != nil {
			return nil, err
		}
		current, err := getComponentCurrentStatus(component)
		if err != nil {
			return nil, err
		}
		status := resolveComponentCurrentStatus(current.Status, activeIncidents, component.Id)
		componentViews = append(componentViews, dto.StatusPageComponentView{
			Id:          component.Id,
			Name:        component.Name,
			Description: component.Description,
			Status:      status,
			Source:      current.Source,
			Total:       current.Total,
			Success:     current.Success,
			Uptime90d:   calculatePeriodUptime(daily),
			DailyUptime: daily,
		})
	}

	setting := console_setting.GetConsoleSetting()
	timezone := setting.StatusPageTimezone
	if timezone == "" {
		timezone = "Asia/Shanghai"
	}
	title := setting.StatusPageTitle
	if title == "" {
		title = "系统状态"
	}
	description := setting.StatusPageDescription
	if description == "" {
		description = "服务可用性与事件更新"
	}

	return &dto.StatusPageSummaryResponse{
		Site: dto.StatusPageSiteMeta{
			Enabled:     setting.StatusPageEnabled,
			Title:       title,
			Description: description,
			Timezone:    timezone,
		},
		OverallStatus: ResolveOverallStatusFromActiveIncidents(componentViews, activeIncidents),
		GeneratedAt:   time.Now().Unix(),
		Components:    componentViews,
		Incidents:     incidentViews,
	}, nil
}

func BuildStatusPageIncidentViews(incidents []model.StatusPageIncident) ([]dto.StatusPageIncidentView, error) {
	incidentIds := make([]int, 0, len(incidents))
	for _, incident := range incidents {
		incidentIds = append(incidentIds, incident.Id)
	}
	updates, err := model.GetStatusPageIncidentUpdates(incidentIds)
	if err != nil {
		return nil, err
	}
	updatesByIncident := make(map[int][]dto.StatusPageIncidentUpdate, len(incidentIds))
	for _, update := range updates {
		updatesByIncident[update.IncidentId] = append(updatesByIncident[update.IncidentId], dto.StatusPageIncidentUpdate{
			Id:        update.Id,
			Status:    update.Status,
			Message:   update.Message,
			CreatedAt: update.CreatedAt,
		})
	}
	views := make([]dto.StatusPageIncidentView, 0, len(incidents))
	for _, incident := range incidents {
		componentIds, err := model.ParseStatusPageComponentIds(incident.ComponentIds)
		if err != nil {
			return nil, err
		}
		incidentUpdates := updatesByIncident[incident.Id]
		if incidentUpdates == nil {
			incidentUpdates = []dto.StatusPageIncidentUpdate{}
		}
		views = append(views, dto.StatusPageIncidentView{
			Id:           incident.Id,
			Title:        incident.Title,
			Impact:       incident.Impact,
			Status:       incident.Status,
			StartedAt:    incident.StartedAt,
			ResolvedAt:   incident.ResolvedAt,
			ComponentIds: componentIds,
			Updates:      incidentUpdates,
		})
	}
	return views, nil
}

func GetComponentDailyUptime(component model.StatusPageComponent, days int) ([]dto.StatusPageDailyUptime, error) {
	days = NormalizeStatusPageDays(days)
	bindings, err := model.ParseStatusPageBindings(component.Bindings)
	if err != nil {
		return nil, err
	}
	loc := statusPageLocation()
	today := time.Now().In(loc)
	startOfToday := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, loc)
	result := make([]dto.StatusPageDailyUptime, 0, days)
	for i := days - 1; i >= 0; i-- {
		dayStart := startOfToday.AddDate(0, 0, -i)
		dayEnd := dayStart.AddDate(0, 0, 1)
		count, err := queryStatusPageLogCount(bindings, dayStart.Unix(), dayEnd.Unix())
		if err != nil {
			return nil, err
		}
		uptime := calculateUptime(count.Success, count.Total)
		result = append(result, dto.StatusPageDailyUptime{
			Date:    dayStart.Format("2006-01-02"),
			Status:  ResolveUptimeStatusWithThresholds(count.Total, uptime, bindings.Thresholds),
			Uptime:  uptime,
			Total:   count.Total,
			Success: count.Success,
		})
	}
	return result, nil
}

func GetComponentCurrentUptimeStatus(component model.StatusPageComponent) (string, error) {
	current, err := getComponentCurrentStatus(component)
	if err != nil {
		return "", err
	}
	return current.Status, nil
}

func getComponentCurrentStatus(component model.StatusPageComponent) (statusPageCurrentStatus, error) {
	bindings, err := model.ParseStatusPageBindings(component.Bindings)
	if err != nil {
		return statusPageCurrentStatus{}, err
	}
	if len(bindings.Models) == 0 && len(bindings.ChannelIds) == 0 && len(bindings.Groups) == 0 {
		return statusPageCurrentStatus{Status: model.StatusPageComponentNoData, Source: "no_data"}, nil
	}
	now := time.Now()
	count, err := queryStatusPageLogCount(bindings, now.Add(-24*time.Hour).Unix(), now.Unix())
	if err != nil {
		return statusPageCurrentStatus{}, err
	}
	if count.Total > 0 {
		return statusPageCurrentStatus{
			Status:  ResolveUptimeStatusWithThresholds(count.Total, calculateUptime(count.Success, count.Total), bindings.Thresholds),
			Source:  "logs",
			Total:   count.Total,
			Success: count.Success,
		}, nil
	}
	status, total, success, err := GetComponentProbeStatus(component, bindings)
	if err != nil {
		return statusPageCurrentStatus{}, err
	}
	source := "no_data"
	if total > 0 {
		source = "probe"
	}
	return statusPageCurrentStatus{
		Status:  status,
		Source:  source,
		Total:   total,
		Success: success,
	}, nil
}

func GetComponentProbeStatus(component model.StatusPageComponent, bindings model.StatusPageComponentBindings) (string, int64, int64, error) {
	if component.Id <= 0 ||
		!bindings.Probe.Enabled ||
		len(bindings.Probe.Models) == 0 ||
		len(bindings.Groups) == 0 {
		return model.StatusPageComponentNoData, 0, 0, nil
	}
	results, err := model.GetStatusPageProbeResults(
		component.Id,
		bindings.Groups,
		bindings.Probe.Models,
		time.Now().Add(-statusPageProbeWindow).Unix(),
	)
	if err != nil {
		return "", 0, 0, err
	}
	total := int64(len(results))
	if total == 0 {
		return model.StatusPageComponentNoData, 0, 0, nil
	}
	var success int64
	for _, result := range results {
		if result.Success {
			success++
		}
	}
	uptime := calculateUptime(success, total)
	return ResolveUptimeStatusWithThresholds(total, uptime, bindings.Thresholds), total, success, nil
}

func statusPageLocation() *time.Location {
	timezone := console_setting.GetConsoleSetting().StatusPageTimezone
	if timezone == "" {
		timezone = "Asia/Shanghai"
	}
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return time.FixedZone("Asia/Shanghai", 8*3600)
	}
	return loc
}

func queryStatusPageLogCount(bindings model.StatusPageComponentBindings, startTimestamp int64, endTimestamp int64) (statusPageLogCount, error) {
	if len(bindings.Models) == 0 && len(bindings.ChannelIds) == 0 && len(bindings.Groups) == 0 {
		return statusPageLogCount{}, nil
	}
	query := model.LOG_DB.Model(&model.Log{}).
		Where("type IN ?", []int{model.LogTypeConsume, model.LogTypeError}).
		Where("created_at >= ? AND created_at < ?", startTimestamp, endTimestamp)
	query = applyStatusPageBindings(query, bindings)
	var count statusPageLogCount
	err := query.Select("COUNT(*) AS total, COALESCE(SUM(CASE WHEN type = ? THEN 1 ELSE 0 END), 0) AS success", model.LogTypeConsume).Scan(&count).Error
	return count, err
}

func applyStatusPageBindings(query *gorm.DB, bindings model.StatusPageComponentBindings) *gorm.DB {
	if len(bindings.Groups) > 0 {
		groupQuery := buildStatusPageGroupCondition(bindings.Groups)
		if groupQuery != nil {
			query = query.Where(groupQuery)
		}
		if len(bindings.Models) > 0 {
			query = query.Where("model_name IN ?", bindings.Models)
		}
		if len(bindings.ChannelIds) > 0 {
			query = query.Where("channel_id IN ?", bindings.ChannelIds)
		}
		return query
	}

	var bindQuery *gorm.DB
	if len(bindings.Models) > 0 {
		condition := model.LOG_DB.Where("model_name IN ?", bindings.Models)
		bindQuery = appendStatusPageOrCondition(bindQuery, condition)
	}
	if len(bindings.ChannelIds) > 0 {
		condition := model.LOG_DB.Where("channel_id IN ?", bindings.ChannelIds)
		bindQuery = appendStatusPageOrCondition(bindQuery, condition)
	}
	if len(bindings.Groups) > 0 {
		condition := model.LOG_DB.Where(&model.Log{Group: bindings.Groups[0]})
		for _, group := range bindings.Groups[1:] {
			condition = condition.Or(&model.Log{Group: group})
		}
		bindQuery = appendStatusPageOrCondition(bindQuery, condition)
	}
	if bindQuery == nil {
		return query
	}
	return query.Where(bindQuery)
}

func buildStatusPageGroupCondition(groups []string) *gorm.DB {
	if len(groups) == 0 {
		return nil
	}
	condition := model.LOG_DB.Where(&model.Log{Group: groups[0]})
	for _, group := range groups[1:] {
		condition = condition.Or(&model.Log{Group: group})
	}
	return condition
}

func appendStatusPageOrCondition(current *gorm.DB, condition *gorm.DB) *gorm.DB {
	if current == nil {
		return condition
	}
	return current.Or(condition)
}

func calculateUptime(success int64, total int64) float64 {
	if total == 0 {
		return 0
	}
	uptime := float64(success) / float64(total) * 100
	return math.Round(uptime*100) / 100
}

func calculatePeriodUptime(days []dto.StatusPageDailyUptime) float64 {
	var total int64
	var success int64
	for _, day := range days {
		total += day.Total
		success += day.Success
	}
	return calculateUptime(success, total)
}

func ResolveUptimeStatus(total int64, uptime float64) string {
	return ResolveUptimeStatusWithThresholds(total, uptime, model.DefaultStatusPageThresholds())
}

func ResolveUptimeStatusWithThresholds(total int64, uptime float64, thresholds model.StatusPageComponentThresholds) string {
	thresholds = model.NormalizeStatusPageThresholds(thresholds)
	if total == 0 {
		return model.StatusPageComponentNoData
	}
	if uptime >= thresholds.Operational {
		return model.StatusPageComponentOperational
	}
	if uptime >= thresholds.Degraded {
		return model.StatusPageComponentDegraded
	}
	if uptime >= thresholds.PartialOutage {
		return model.StatusPageComponentPartialOutage
	}
	return model.StatusPageComponentMajorOutage
}

func BuildStatusPageModelOptions(group string, days int) (*dto.StatusPageModelOptionsResponse, error) {
	group = strings.TrimSpace(group)
	if group == "" {
		return nil, errors.New("分组不能为空")
	}
	days = NormalizeStatusPageDays(days)
	start := time.Now().AddDate(0, 0, -days).Unix()

	var logRows []statusPageModelLogOption
	err := model.LOG_DB.Model(&model.Log{}).
		Where(&model.Log{Group: group}).
		Where("type = ?", model.LogTypeConsume).
		Where("model_name <> ''").
		Where("created_at >= ?", start).
		Select("model_name AS model, COUNT(*) AS success_count, MAX(created_at) AS last_used_at").
		Group("model_name").
		Order("success_count DESC, last_used_at DESC, model_name ASC").
		Scan(&logRows).Error
	if err != nil {
		return nil, err
	}

	if len(logRows) > 0 {
		modelNames := make([]string, 0, len(logRows))
		for _, row := range logRows {
			modelNames = append(modelNames, row.Model)
		}
		totalCounts, err := getStatusPageModelTotalCounts(group, modelNames, start)
		if err != nil {
			return nil, err
		}
		items := make([]dto.StatusPageModelOption, 0, len(logRows))
		for _, row := range logRows {
			items = append(items, dto.StatusPageModelOption{
				Model:        row.Model,
				SuccessCount: row.SuccessCount,
				TotalCount:   totalCounts[row.Model],
				LastUsedAt:   row.LastUsedAt,
				Fallback:     false,
			})
		}
		return &dto.StatusPageModelOptionsResponse{
			Group:        group,
			Days:         days,
			Source:       "logs",
			Items:        items,
			DefaultModel: items[0].Model,
		}, nil
	}

	models := model.GetGroupEnabledModels(group)
	sort.Strings(models)
	items := make([]dto.StatusPageModelOption, 0, len(models))
	for _, modelName := range models {
		modelName = strings.TrimSpace(modelName)
		if modelName == "" {
			continue
		}
		items = append(items, dto.StatusPageModelOption{
			Model:    modelName,
			Fallback: true,
		})
	}
	defaultModel := ""
	if len(items) > 0 {
		defaultModel = items[0].Model
	}
	return &dto.StatusPageModelOptionsResponse{
		Group:        group,
		Days:         days,
		Source:       "abilities",
		Items:        items,
		DefaultModel: defaultModel,
	}, nil
}

func getStatusPageModelTotalCounts(group string, modelNames []string, start int64) (map[string]int64, error) {
	counts := make(map[string]int64, len(modelNames))
	if len(modelNames) == 0 {
		return counts, nil
	}
	var rows []statusPageModelTotalCount
	err := model.LOG_DB.Model(&model.Log{}).
		Where(&model.Log{Group: group}).
		Where("type IN ?", []int{model.LogTypeConsume, model.LogTypeError}).
		Where("model_name IN ?", modelNames).
		Where("created_at >= ?", start).
		Select("model_name AS model, COUNT(*) AS total_count").
		Group("model_name").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		counts[row.Model] = row.TotalCount
	}
	return counts, nil
}

func HasRecentStatusPageSuccessfulLog(group string, modelName string, since int64) (bool, error) {
	group = strings.TrimSpace(group)
	modelName = strings.TrimSpace(modelName)
	if group == "" || modelName == "" {
		return false, nil
	}
	var count int64
	err := model.LOG_DB.Model(&model.Log{}).
		Where(&model.Log{Group: group, ModelName: modelName, Type: model.LogTypeConsume}).
		Where("created_at >= ?", since).
		Count(&count).Error
	return count > 0, err
}

func ResolveComponentCurrentStatus(days []dto.StatusPageDailyUptime, activeIncidents []model.StatusPageIncident, componentId int) string {
	if len(days) == 0 {
		return resolveComponentCurrentStatus(model.StatusPageComponentNoData, activeIncidents, componentId)
	}
	return resolveComponentCurrentStatus(days[len(days)-1].Status, activeIncidents, componentId)
}

func resolveComponentCurrentStatus(baseStatus string, activeIncidents []model.StatusPageIncident, componentId int) string {
	incidentStatus := incidentStatusForComponent(activeIncidents, componentId)
	if incidentStatus != "" {
		return incidentStatus
	}
	return baseStatus
}

func incidentStatusForComponent(activeIncidents []model.StatusPageIncident, componentId int) string {
	result := ""
	resultRank := -1
	for _, incident := range activeIncidents {
		componentIds, err := model.ParseStatusPageComponentIds(incident.ComponentIds)
		if err != nil {
			continue
		}
		applies := len(componentIds) == 0
		if !applies {
			for _, id := range componentIds {
				if id == componentId {
					applies = true
					break
				}
			}
		}
		if !applies {
			continue
		}
		status := statusForIncidentImpact(incident.Impact)
		rank := componentStatusRank(status)
		if rank > resultRank {
			result = status
			resultRank = rank
		}
	}
	return result
}

func ResolveOverallStatus(components []dto.StatusPageComponentView, incidents []dto.StatusPageIncidentView) string {
	states := make([]statusPageIncidentState, 0, len(incidents))
	for _, incident := range incidents {
		states = append(states, statusPageIncidentState{
			Impact: incident.Impact,
			Status: incident.Status,
		})
	}
	return resolveOverallStatus(components, states)
}

func ResolveOverallStatusFromActiveIncidents(components []dto.StatusPageComponentView, incidents []model.StatusPageIncident) string {
	states := make([]statusPageIncidentState, 0, len(incidents))
	for _, incident := range incidents {
		states = append(states, statusPageIncidentState{
			Impact: incident.Impact,
			Status: incident.Status,
		})
	}
	return resolveOverallStatus(components, states)
}

type statusPageIncidentState struct {
	Impact string
	Status string
}

func resolveOverallStatus(components []dto.StatusPageComponentView, incidents []statusPageIncidentState) string {
	activeIncidentStatus := ""
	activeIncidentRank := -1
	for _, incident := range incidents {
		if incident.Status == model.StatusPageIncidentResolved {
			continue
		}
		status := statusForIncidentImpact(incident.Impact)
		rank := componentStatusRank(status)
		if rank > activeIncidentRank {
			activeIncidentStatus = status
			activeIncidentRank = rank
		}
	}
	if activeIncidentStatus != "" {
		return activeIncidentStatus
	}
	if len(components) == 0 {
		return model.StatusPageComponentNoData
	}
	allNoData := true
	worst := model.StatusPageComponentOperational
	worstRank := componentStatusRank(worst)
	for _, component := range components {
		if component.Status != model.StatusPageComponentNoData {
			allNoData = false
		}
		rank := componentStatusRank(component.Status)
		if rank > worstRank {
			worst = component.Status
			worstRank = rank
		}
	}
	if allNoData {
		return model.StatusPageComponentNoData
	}
	return worst
}

func statusForIncidentImpact(impact string) string {
	switch impact {
	case model.StatusPageIncidentImpactCritical:
		return model.StatusPageComponentMajorOutage
	case model.StatusPageIncidentImpactMajor:
		return model.StatusPageComponentPartialOutage
	case model.StatusPageIncidentImpactMinor:
		return model.StatusPageComponentDegraded
	default:
		return model.StatusPageComponentOperational
	}
}

func componentStatusRank(status string) int {
	switch status {
	case model.StatusPageComponentMajorOutage:
		return 4
	case model.StatusPageComponentPartialOutage:
		return 3
	case model.StatusPageComponentDegraded:
		return 2
	case model.StatusPageComponentOperational:
		return 1
	default:
		return 0
	}
}
