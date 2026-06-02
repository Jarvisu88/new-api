package model

import (
	"errors"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	StatusPageComponentOperational   = "operational"
	StatusPageComponentDegraded      = "degraded"
	StatusPageComponentPartialOutage = "partial_outage"
	StatusPageComponentMajorOutage   = "major_outage"
	StatusPageComponentNoData        = "no_data"
)

const (
	StatusPageDefaultOperationalThreshold   = 99.5
	StatusPageDefaultDegradedThreshold      = 95.0
	StatusPageDefaultPartialOutageThreshold = 80.0
)

const (
	StatusPageIncidentInvestigating = "investigating"
	StatusPageIncidentIdentified    = "identified"
	StatusPageIncidentMonitoring    = "monitoring"
	StatusPageIncidentResolved      = "resolved"
)

const (
	StatusPageIncidentImpactNone     = "none"
	StatusPageIncidentImpactMinor    = "minor"
	StatusPageIncidentImpactMajor    = "major"
	StatusPageIncidentImpactCritical = "critical"
)

type StatusPageComponent struct {
	Id          int    `json:"id"`
	Name        string `json:"name" gorm:"type:varchar(128);index"`
	Description string `json:"description" gorm:"type:text"`
	Status      string `json:"status" gorm:"type:varchar(32);index"`
	Enabled     bool   `json:"enabled" gorm:"default:true;index"`
	SortOrder   int    `json:"sort_order" gorm:"default:0;index"`
	Bindings    string `json:"bindings" gorm:"type:text"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt   int64  `json:"updated_at" gorm:"bigint"`
}

type StatusPageComponentBindings struct {
	Models     []string                      `json:"models"`
	ChannelIds []int                         `json:"channel_ids"`
	Groups     []string                      `json:"groups"`
	Thresholds StatusPageComponentThresholds `json:"thresholds"`
	Probe      StatusPageComponentProbe      `json:"probe"`
}

type StatusPageComponentThresholds struct {
	Operational   float64 `json:"operational"`
	Degraded      float64 `json:"degraded"`
	PartialOutage float64 `json:"partial_outage"`
}

type StatusPageComponentProbe struct {
	Enabled bool     `json:"enabled"`
	Models  []string `json:"models"`
}

type StatusPageProbeResult struct {
	Id           int    `json:"id"`
	ComponentId  int    `json:"component_id" gorm:"index:idx_status_probe_component_model_group,priority:1"`
	Group        string `json:"group" gorm:"type:varchar(64);index:idx_status_probe_component_model_group,priority:2"`
	ModelName    string `json:"model_name" gorm:"type:varchar(255);index:idx_status_probe_component_model_group,priority:3"`
	ChannelId    int    `json:"channel_id" gorm:"index"`
	Success      bool   `json:"success" gorm:"index"`
	Message      string `json:"message" gorm:"type:text"`
	ResponseTime int    `json:"response_time"`
	TestedAt     int64  `json:"tested_at" gorm:"bigint;index"`
}

type StatusPageIncident struct {
	Id           int    `json:"id"`
	Title        string `json:"title" gorm:"type:varchar(200);index"`
	Impact       string `json:"impact" gorm:"type:varchar(32);index"`
	Status       string `json:"status" gorm:"type:varchar(32);index"`
	ComponentIds string `json:"component_ids" gorm:"type:text"`
	StartedAt    int64  `json:"started_at" gorm:"bigint;index"`
	ResolvedAt   int64  `json:"resolved_at" gorm:"bigint;index"`
	CreatedAt    int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt    int64  `json:"updated_at" gorm:"bigint"`
}

type StatusPageIncidentUpdate struct {
	Id         int    `json:"id"`
	IncidentId int    `json:"incident_id" gorm:"index"`
	Status     string `json:"status" gorm:"type:varchar(32);index"`
	Message    string `json:"message" gorm:"type:text"`
	CreatedAt  int64  `json:"created_at" gorm:"bigint;index"`
}

func normalizeStatusPageBindings(bindings *StatusPageComponentBindings) {
	if bindings == nil {
		return
	}
	bindings.Models = uniqueNonEmptyStrings(bindings.Models)
	bindings.Groups = uniqueNonEmptyStrings(bindings.Groups)
	bindings.ChannelIds = uniquePositiveInts(bindings.ChannelIds)
	bindings.Thresholds = NormalizeStatusPageThresholds(bindings.Thresholds)
	bindings.Probe.Models = uniqueNonEmptyStrings(bindings.Probe.Models)
}

func DefaultStatusPageThresholds() StatusPageComponentThresholds {
	return StatusPageComponentThresholds{
		Operational:   StatusPageDefaultOperationalThreshold,
		Degraded:      StatusPageDefaultDegradedThreshold,
		PartialOutage: StatusPageDefaultPartialOutageThreshold,
	}
}

func NormalizeStatusPageThresholds(thresholds StatusPageComponentThresholds) StatusPageComponentThresholds {
	defaults := DefaultStatusPageThresholds()
	if thresholds.Operational == 0 && thresholds.Degraded == 0 && thresholds.PartialOutage == 0 {
		return defaults
	}
	if thresholds.Operational > 100 ||
		thresholds.Operational <= 0 ||
		thresholds.Degraded <= 0 ||
		thresholds.PartialOutage < 0 ||
		thresholds.Operational <= thresholds.Degraded ||
		thresholds.Degraded <= thresholds.PartialOutage {
		return defaults
	}
	return thresholds
}

func uniqueNonEmptyStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func uniquePositiveInts(values []int) []int {
	seen := make(map[int]struct{}, len(values))
	result := make([]int, 0, len(values))
	for _, value := range values {
		if value <= 0 {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func ParseStatusPageBindings(raw string) (StatusPageComponentBindings, error) {
	if strings.TrimSpace(raw) == "" {
		return StatusPageComponentBindings{}, nil
	}
	var bindings StatusPageComponentBindings
	if err := common.UnmarshalJsonStr(raw, &bindings); err != nil {
		return StatusPageComponentBindings{}, err
	}
	normalizeStatusPageBindings(&bindings)
	return bindings, nil
}

func EncodeStatusPageBindings(bindings StatusPageComponentBindings) (string, error) {
	normalizeStatusPageBindings(&bindings)
	b, err := common.Marshal(bindings)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func ParseStatusPageComponentIds(raw string) ([]int, error) {
	if strings.TrimSpace(raw) == "" {
		return []int{}, nil
	}
	var ids []int
	if err := common.UnmarshalJsonStr(raw, &ids); err != nil {
		return nil, err
	}
	return uniquePositiveInts(ids), nil
}

func EncodeStatusPageComponentIds(ids []int) (string, error) {
	ids = uniquePositiveInts(ids)
	b, err := common.Marshal(ids)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func IsValidStatusPageComponentStatus(status string) bool {
	switch status {
	case StatusPageComponentOperational,
		StatusPageComponentDegraded,
		StatusPageComponentPartialOutage,
		StatusPageComponentMajorOutage,
		StatusPageComponentNoData:
		return true
	default:
		return false
	}
}

func IsValidStatusPageIncidentStatus(status string) bool {
	switch status {
	case StatusPageIncidentInvestigating,
		StatusPageIncidentIdentified,
		StatusPageIncidentMonitoring,
		StatusPageIncidentResolved:
		return true
	default:
		return false
	}
}

func IsValidStatusPageIncidentImpact(impact string) bool {
	switch impact {
	case StatusPageIncidentImpactNone,
		StatusPageIncidentImpactMinor,
		StatusPageIncidentImpactMajor,
		StatusPageIncidentImpactCritical:
		return true
	default:
		return false
	}
}

func (component *StatusPageComponent) normalizeForSave() error {
	component.Name = strings.TrimSpace(component.Name)
	component.Description = strings.TrimSpace(component.Description)
	if component.Name == "" {
		return errors.New("组件名称不能为空")
	}
	if len(component.Name) > 128 {
		return errors.New("组件名称不能超过128字符")
	}
	if component.Status == "" {
		component.Status = StatusPageComponentNoData
	}
	if !IsValidStatusPageComponentStatus(component.Status) {
		return errors.New("组件状态不合法")
	}
	if _, err := ParseStatusPageBindings(component.Bindings); err != nil {
		return errors.New("组件绑定配置格式错误")
	}
	return nil
}

func (incident *StatusPageIncident) normalizeForSave() error {
	incident.Title = strings.TrimSpace(incident.Title)
	if incident.Title == "" {
		return errors.New("事件标题不能为空")
	}
	if len(incident.Title) > 200 {
		return errors.New("事件标题不能超过200字符")
	}
	if incident.Impact == "" {
		incident.Impact = StatusPageIncidentImpactMinor
	}
	if !IsValidStatusPageIncidentImpact(incident.Impact) {
		return errors.New("事件影响级别不合法")
	}
	if incident.Status == "" {
		incident.Status = StatusPageIncidentInvestigating
	}
	if !IsValidStatusPageIncidentStatus(incident.Status) {
		return errors.New("事件状态不合法")
	}
	if _, err := ParseStatusPageComponentIds(incident.ComponentIds); err != nil {
		return errors.New("事件组件配置格式错误")
	}
	now := common.GetTimestamp()
	if incident.StartedAt == 0 {
		incident.StartedAt = now
	}
	if incident.Status == StatusPageIncidentResolved && incident.ResolvedAt == 0 {
		incident.ResolvedAt = now
	}
	if incident.Status != StatusPageIncidentResolved {
		incident.ResolvedAt = 0
	}
	return nil
}

func (update *StatusPageIncidentUpdate) normalizeForSave() error {
	update.Message = strings.TrimSpace(update.Message)
	if update.IncidentId <= 0 {
		return errors.New("缺少事件 ID")
	}
	if update.Message == "" {
		return errors.New("事件更新内容不能为空")
	}
	if !IsValidStatusPageIncidentStatus(update.Status) {
		return errors.New("事件更新状态不合法")
	}
	return nil
}

func GetEnabledStatusPageComponents() ([]StatusPageComponent, error) {
	var components []StatusPageComponent
	err := DB.Where("enabled = ?", true).Order("sort_order asc, id asc").Find(&components).Error
	return components, err
}

func GetAllStatusPageComponents() ([]StatusPageComponent, error) {
	var components []StatusPageComponent
	err := DB.Order("sort_order asc, id asc").Find(&components).Error
	return components, err
}

func GetStatusPageComponentById(id int) (*StatusPageComponent, error) {
	var component StatusPageComponent
	if err := DB.First(&component, id).Error; err != nil {
		return nil, err
	}
	return &component, nil
}

func CreateStatusPageComponent(component *StatusPageComponent) error {
	if err := component.normalizeForSave(); err != nil {
		return err
	}
	now := common.GetTimestamp()
	component.CreatedAt = now
	component.UpdatedAt = now
	if component.Bindings == "" {
		component.Bindings = "{}"
	}
	enabled := component.Enabled
	if err := DB.Select(
		"Name",
		"Description",
		"Status",
		"Enabled",
		"SortOrder",
		"Bindings",
		"CreatedAt",
		"UpdatedAt",
	).Create(component).Error; err != nil {
		return err
	}
	if !enabled {
		return DB.Model(&StatusPageComponent{}).Where("id = ?", component.Id).Update("enabled", false).Error
	}
	return nil
}

func UpdateStatusPageComponent(component *StatusPageComponent) error {
	if component.Id == 0 {
		return errors.New("缺少组件 ID")
	}
	if err := component.normalizeForSave(); err != nil {
		return err
	}
	component.UpdatedAt = common.GetTimestamp()
	return DB.Model(&StatusPageComponent{}).Where("id = ?", component.Id).Updates(map[string]interface{}{
		"name":        component.Name,
		"description": component.Description,
		"status":      component.Status,
		"enabled":     component.Enabled,
		"sort_order":  component.SortOrder,
		"bindings":    component.Bindings,
		"updated_at":  component.UpdatedAt,
	}).Error
}

func DeleteStatusPageComponent(id int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("component_id = ?", id).Delete(&StatusPageProbeResult{}).Error; err != nil {
			return err
		}
		return tx.Delete(&StatusPageComponent{}, id).Error
	})
}

func ReorderStatusPageComponents(ids []int) error {
	ids = uniquePositiveInts(ids)
	return DB.Transaction(func(tx *gorm.DB) error {
		for idx, id := range ids {
			if err := tx.Model(&StatusPageComponent{}).Where("id = ?", id).Updates(map[string]interface{}{
				"sort_order": idx + 1,
				"updated_at": common.GetTimestamp(),
			}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func GetStatusPageIncidents(statusFilter string, startIdx int, num int) ([]StatusPageIncident, int64, error) {
	var incidents []StatusPageIncident
	query := DB.Model(&StatusPageIncident{})
	switch statusFilter {
	case "active":
		query = query.Where("status <> ?", StatusPageIncidentResolved)
	case "resolved":
		query = query.Where("status = ?", StatusPageIncidentResolved)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := query.Order("started_at desc, id desc").Limit(num).Offset(startIdx).Find(&incidents).Error; err != nil {
		return nil, 0, err
	}
	return incidents, total, nil
}

func GetStatusPageIncidentById(id int) (*StatusPageIncident, error) {
	var incident StatusPageIncident
	if err := DB.First(&incident, id).Error; err != nil {
		return nil, err
	}
	return &incident, nil
}

func GetActiveStatusPageIncidents() ([]StatusPageIncident, error) {
	var incidents []StatusPageIncident
	err := DB.Where("status <> ?", StatusPageIncidentResolved).Order("started_at desc, id desc").Find(&incidents).Error
	return incidents, err
}

func GetRecentStatusPageIncidents(limit int) ([]StatusPageIncident, error) {
	if limit <= 0 {
		limit = 10
	}
	var incidents []StatusPageIncident
	err := DB.Order("started_at desc, id desc").Limit(limit).Find(&incidents).Error
	return incidents, err
}

func GetStatusPageSummaryIncidents(limit int) ([]StatusPageIncident, error) {
	if limit <= 0 {
		limit = 10
	}
	activeIncidents, err := GetActiveStatusPageIncidents()
	if err != nil {
		return nil, err
	}
	remaining := limit - len(activeIncidents)
	if remaining < 0 {
		remaining = 0
	}
	resolvedIncidents := make([]StatusPageIncident, 0)
	if remaining > 0 {
		resolvedIncidents, _, err = GetStatusPageIncidents("resolved", 0, remaining)
		if err != nil {
			return nil, err
		}
	}
	incidents := append(activeIncidents, resolvedIncidents...)
	sort.SliceStable(incidents, func(i, j int) bool {
		if incidents[i].StartedAt == incidents[j].StartedAt {
			return incidents[i].Id > incidents[j].Id
		}
		return incidents[i].StartedAt > incidents[j].StartedAt
	})
	return incidents, nil
}

func CreateStatusPageIncident(incident *StatusPageIncident) error {
	if err := incident.normalizeForSave(); err != nil {
		return err
	}
	now := common.GetTimestamp()
	incident.CreatedAt = now
	incident.UpdatedAt = now
	if incident.ComponentIds == "" {
		incident.ComponentIds = "[]"
	}
	return DB.Create(incident).Error
}

func UpdateStatusPageIncident(incident *StatusPageIncident) error {
	if incident.Id == 0 {
		return errors.New("缺少事件 ID")
	}
	if err := incident.normalizeForSave(); err != nil {
		return err
	}
	incident.UpdatedAt = common.GetTimestamp()
	return DB.Model(&StatusPageIncident{}).Where("id = ?", incident.Id).Updates(map[string]interface{}{
		"title":         incident.Title,
		"impact":        incident.Impact,
		"status":        incident.Status,
		"component_ids": incident.ComponentIds,
		"started_at":    incident.StartedAt,
		"resolved_at":   incident.ResolvedAt,
		"updated_at":    incident.UpdatedAt,
	}).Error
}

func DeleteStatusPageIncident(id int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("incident_id = ?", id).Delete(&StatusPageIncidentUpdate{}).Error; err != nil {
			return err
		}
		return tx.Delete(&StatusPageIncident{}, id).Error
	})
}

func ResolveStatusPageIncident(id int) error {
	now := common.GetTimestamp()
	return DB.Model(&StatusPageIncident{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      StatusPageIncidentResolved,
		"resolved_at": now,
		"updated_at":  now,
	}).Error
}

func CreateStatusPageIncidentUpdate(update *StatusPageIncidentUpdate) error {
	if err := update.normalizeForSave(); err != nil {
		return err
	}
	if update.CreatedAt == 0 {
		update.CreatedAt = common.GetTimestamp()
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(update).Error; err != nil {
			return err
		}
		values := map[string]interface{}{
			"status":     update.Status,
			"updated_at": update.CreatedAt,
		}
		if update.Status == StatusPageIncidentResolved {
			values["resolved_at"] = update.CreatedAt
		} else {
			values["resolved_at"] = int64(0)
		}
		return tx.Model(&StatusPageIncident{}).Where("id = ?", update.IncidentId).Updates(values).Error
	})
}

func GetStatusPageIncidentUpdates(incidentIds []int) ([]StatusPageIncidentUpdate, error) {
	incidentIds = uniquePositiveInts(incidentIds)
	if len(incidentIds) == 0 {
		return []StatusPageIncidentUpdate{}, nil
	}
	var updates []StatusPageIncidentUpdate
	err := DB.Where("incident_id IN ?", incidentIds).Order("created_at desc, id desc").Find(&updates).Error
	return updates, err
}

func UpsertStatusPageProbeResult(result *StatusPageProbeResult) error {
	result.Group = strings.TrimSpace(result.Group)
	result.ModelName = strings.TrimSpace(result.ModelName)
	result.Message = strings.TrimSpace(result.Message)
	if result.ComponentId <= 0 || result.Group == "" || result.ModelName == "" || result.ChannelId <= 0 {
		return errors.New("探测结果缺少必要字段")
	}
	if result.TestedAt == 0 {
		result.TestedAt = common.GetTimestamp()
	}
	var existing StatusPageProbeResult
	err := DB.Where(&StatusPageProbeResult{
		ComponentId: result.ComponentId,
		Group:       result.Group,
		ModelName:   result.ModelName,
		ChannelId:   result.ChannelId,
	}).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return DB.Create(result).Error
	}
	if err != nil {
		return err
	}
	result.Id = existing.Id
	return DB.Model(&StatusPageProbeResult{}).Where("id = ?", existing.Id).Updates(map[string]interface{}{
		"success":       result.Success,
		"message":       result.Message,
		"response_time": result.ResponseTime,
		"tested_at":     result.TestedAt,
	}).Error
}

func GetStatusPageProbeResults(componentId int, groups []string, models []string, since int64) ([]StatusPageProbeResult, error) {
	groups = uniqueNonEmptyStrings(groups)
	models = uniqueNonEmptyStrings(models)
	if componentId <= 0 || len(groups) == 0 || len(models) == 0 {
		return []StatusPageProbeResult{}, nil
	}
	var results []StatusPageProbeResult
	groupQuery := DB.Where(&StatusPageProbeResult{Group: groups[0]})
	for _, group := range groups[1:] {
		groupQuery = groupQuery.Or(&StatusPageProbeResult{Group: group})
	}
	err := DB.Where("component_id = ?", componentId).
		Where(groupQuery).
		Where("model_name IN ?", models).
		Where("tested_at >= ?", since).
		Find(&results).Error
	return results, err
}
