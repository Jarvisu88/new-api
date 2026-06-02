package service

import (
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/console_setting"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupStatusPageTestDB(t *testing.T) {
	t.Helper()
	oldDB := model.DB
	oldLogDB := model.LOG_DB
	oldTimezone := console_setting.GetConsoleSetting().StatusPageTimezone
	oldTitle := console_setting.GetConsoleSetting().StatusPageTitle
	oldDescription := console_setting.GetConsoleSetting().StatusPageDescription
	oldEnabled := console_setting.GetConsoleSetting().StatusPageEnabled
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	model.DB = db
	model.LOG_DB = db
	t.Cleanup(func() {
		model.DB = oldDB
		model.LOG_DB = oldLogDB
		console_setting.GetConsoleSetting().StatusPageTimezone = oldTimezone
		console_setting.GetConsoleSetting().StatusPageTitle = oldTitle
		console_setting.GetConsoleSetting().StatusPageDescription = oldDescription
		console_setting.GetConsoleSetting().StatusPageEnabled = oldEnabled
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
	require.NoError(t, db.AutoMigrate(
		&model.Log{},
		&model.Channel{},
		&model.Ability{},
		&model.StatusPageComponent{},
		&model.StatusPageProbeResult{},
		&model.StatusPageIncident{},
		&model.StatusPageIncidentUpdate{},
	))
	console_setting.GetConsoleSetting().StatusPageTimezone = "UTC"
	console_setting.GetConsoleSetting().StatusPageTitle = "System Status"
	console_setting.GetConsoleSetting().StatusPageDescription = "Availability"
	console_setting.GetConsoleSetting().StatusPageEnabled = true
}

func TestStatusPageUnboundComponentReturnsNoData(t *testing.T) {
	setupStatusPageTestDB(t)
	component := model.StatusPageComponent{Name: "Unbound", Bindings: "{}"}

	days, err := GetComponentDailyUptime(component, 1)
	require.NoError(t, err)
	require.Len(t, days, 1)
	require.Equal(t, model.StatusPageComponentNoData, days[0].Status)
	require.EqualValues(t, 0, days[0].Total)
}

func TestStatusPageBoundComponentWithNoLogsReturnsNoData(t *testing.T) {
	setupStatusPageTestDB(t)
	bindings, err := model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Models: []string{"missing-model"},
	})
	require.NoError(t, err)
	component := model.StatusPageComponent{Name: "Bound", Bindings: bindings}

	days, err := GetComponentDailyUptime(component, 1)
	require.NoError(t, err)
	require.Len(t, days, 1)
	require.Equal(t, model.StatusPageComponentNoData, days[0].Status)
	require.EqualValues(t, 0, days[0].Total)
	require.EqualValues(t, 0, days[0].Success)
}

func TestStatusPageResolveUptimeStatusWithThresholds(t *testing.T) {
	require.Equal(t, model.StatusPageComponentOperational, ResolveUptimeStatus(100, 100))
	require.Equal(t, model.StatusPageComponentDegraded, ResolveUptimeStatus(100, 97))
	require.Equal(t, model.StatusPageComponentPartialOutage, ResolveUptimeStatus(100, 90))
	require.Equal(t, model.StatusPageComponentMajorOutage, ResolveUptimeStatus(100, 70))
	require.Equal(t, model.StatusPageComponentNoData, ResolveUptimeStatus(0, 100))

	thresholds := model.StatusPageComponentThresholds{
		Operational:   99,
		Degraded:      90,
		PartialOutage: 70,
	}
	require.Equal(t, model.StatusPageComponentDegraded, ResolveUptimeStatusWithThresholds(100, 92, thresholds))
	require.Equal(t, model.StatusPageComponentPartialOutage, ResolveUptimeStatusWithThresholds(100, 75, thresholds))
}

func TestStatusPageCreateComponentPreservesDisabled(t *testing.T) {
	setupStatusPageTestDB(t)
	component := model.StatusPageComponent{
		Name:     "Draft",
		Enabled:  false,
		Bindings: "{}",
	}

	require.NoError(t, model.CreateStatusPageComponent(&component))

	stored, err := model.GetStatusPageComponentById(component.Id)
	require.NoError(t, err)
	require.False(t, stored.Enabled)
}

func TestStatusPageDailyUptimeFiltersBindings(t *testing.T) {
	setupStatusPageTestDB(t)
	now := time.Now().Unix()
	require.NoError(t, model.LOG_DB.Create(&[]model.Log{
		{CreatedAt: now, Type: model.LogTypeConsume, ModelName: "gpt-4o", ChannelId: 1, Group: "default"},
		{CreatedAt: now, Type: model.LogTypeError, ModelName: "gpt-4o", ChannelId: 2, Group: "default"},
		{CreatedAt: now, Type: model.LogTypeConsume, ModelName: "ignored", ChannelId: 3, Group: "ignored"},
	}).Error)

	bindings, err := model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Models: []string{"gpt-4o"},
	})
	require.NoError(t, err)
	days, err := GetComponentDailyUptime(model.StatusPageComponent{Name: "Model", Bindings: bindings}, 1)
	require.NoError(t, err)
	require.EqualValues(t, 2, days[0].Total)
	require.EqualValues(t, 1, days[0].Success)
	require.Equal(t, model.StatusPageComponentMajorOutage, days[0].Status)

	bindings, err = model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		ChannelIds: []int{3},
	})
	require.NoError(t, err)
	days, err = GetComponentDailyUptime(model.StatusPageComponent{Name: "Channel", Bindings: bindings}, 1)
	require.NoError(t, err)
	require.EqualValues(t, 1, days[0].Total)
	require.EqualValues(t, 1, days[0].Success)
	require.Equal(t, model.StatusPageComponentOperational, days[0].Status)

	bindings, err = model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Groups: []string{"default"},
	})
	require.NoError(t, err)
	days, err = GetComponentDailyUptime(model.StatusPageComponent{Name: "Group", Bindings: bindings}, 1)
	require.NoError(t, err)
	require.EqualValues(t, 2, days[0].Total)
	require.EqualValues(t, 1, days[0].Success)
}

func TestStatusPageBindingWithGroupUsesAndSemantics(t *testing.T) {
	setupStatusPageTestDB(t)
	now := time.Now().Unix()
	require.NoError(t, model.LOG_DB.Create(&[]model.Log{
		{CreatedAt: now, Type: model.LogTypeConsume, ModelName: "a", ChannelId: 1, Group: "default"},
		{CreatedAt: now, Type: model.LogTypeError, ModelName: "a", ChannelId: 1, Group: "vip"},
		{CreatedAt: now, Type: model.LogTypeConsume, ModelName: "b", ChannelId: 1, Group: "default"},
	}).Error)
	bindings, err := model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Groups: []string{"default"},
		Models: []string{"a"},
	})
	require.NoError(t, err)

	days, err := GetComponentDailyUptime(model.StatusPageComponent{Name: "default/a", Bindings: bindings}, 1)
	require.NoError(t, err)
	require.EqualValues(t, 1, days[0].Total)
	require.EqualValues(t, 1, days[0].Success)
	require.Equal(t, model.StatusPageComponentOperational, days[0].Status)
}

func TestStatusPageBindingWithoutGroupKeepsLegacyOrSemantics(t *testing.T) {
	setupStatusPageTestDB(t)
	now := time.Now().Unix()
	require.NoError(t, model.LOG_DB.Create(&[]model.Log{
		{CreatedAt: now, Type: model.LogTypeConsume, ModelName: "a", ChannelId: 1, Group: "default"},
		{CreatedAt: now, Type: model.LogTypeConsume, ModelName: "b", ChannelId: 2, Group: "default"},
		{CreatedAt: now, Type: model.LogTypeConsume, ModelName: "c", ChannelId: 3, Group: "default"},
	}).Error)
	bindings, err := model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Models:     []string{"a"},
		ChannelIds: []int{2},
	})
	require.NoError(t, err)

	days, err := GetComponentDailyUptime(model.StatusPageComponent{Name: "legacy", Bindings: bindings}, 1)
	require.NoError(t, err)
	require.EqualValues(t, 2, days[0].Total)
	require.EqualValues(t, 2, days[0].Success)
}

func TestStatusPageCurrentStatusFallsBackToProbeWithoutLogs(t *testing.T) {
	setupStatusPageTestDB(t)
	bindings, err := model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Groups: []string{"default"},
		Models: []string{"a"},
		Probe: model.StatusPageComponentProbe{
			Enabled: true,
			Models:  []string{"a"},
		},
	})
	require.NoError(t, err)
	component := model.StatusPageComponent{Id: 12, Name: "default/a", Bindings: bindings}
	require.NoError(t, model.UpsertStatusPageProbeResult(&model.StatusPageProbeResult{
		ComponentId:  component.Id,
		Group:        "default",
		ModelName:    "a",
		ChannelId:    1,
		Success:      true,
		ResponseTime: 120,
		TestedAt:     time.Now().Unix(),
	}))

	status, err := GetComponentCurrentUptimeStatus(component)
	require.NoError(t, err)
	require.Equal(t, model.StatusPageComponentOperational, status)
}

func TestStatusPageCurrentStatusPrefersLogsOverProbe(t *testing.T) {
	setupStatusPageTestDB(t)
	now := time.Now().Add(-time.Second).Unix()
	bindings, err := model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Groups: []string{"default"},
		Models: []string{"a"},
		Probe: model.StatusPageComponentProbe{
			Enabled: true,
			Models:  []string{"a"},
		},
	})
	require.NoError(t, err)
	component := model.StatusPageComponent{Id: 13, Name: "default/a", Bindings: bindings}
	require.NoError(t, model.LOG_DB.Create(&model.Log{
		CreatedAt: now,
		Type:      model.LogTypeError,
		ModelName: "a",
		ChannelId: 1,
		Group:     "default",
	}).Error)
	require.NoError(t, model.UpsertStatusPageProbeResult(&model.StatusPageProbeResult{
		ComponentId: component.Id,
		Group:       "default",
		ModelName:   "a",
		ChannelId:   1,
		Success:     true,
		TestedAt:    now,
	}))

	status, err := GetComponentCurrentUptimeStatus(component)
	require.NoError(t, err)
	require.Equal(t, model.StatusPageComponentMajorOutage, status)
}

func TestStatusPageModelOptionsFromLogsAndAbilitiesFallback(t *testing.T) {
	setupStatusPageTestDB(t)
	now := time.Now().Unix()
	require.NoError(t, model.LOG_DB.Create(&[]model.Log{
		{CreatedAt: now - 100, Type: model.LogTypeConsume, ModelName: "less-used", ChannelId: 1, Group: "default"},
		{CreatedAt: now - 90, Type: model.LogTypeConsume, ModelName: "top", ChannelId: 1, Group: "default"},
		{CreatedAt: now - 80, Type: model.LogTypeConsume, ModelName: "top", ChannelId: 1, Group: "default"},
		{CreatedAt: now - 70, Type: model.LogTypeError, ModelName: "top", ChannelId: 1, Group: "default"},
		{CreatedAt: now - 60, Type: model.LogTypeConsume, ModelName: "ignored", ChannelId: 1, Group: "vip"},
	}).Error)

	options, err := BuildStatusPageModelOptions("default", 90)
	require.NoError(t, err)
	require.Equal(t, "logs", options.Source)
	require.Equal(t, "top", options.DefaultModel)
	require.Len(t, options.Items, 2)
	require.EqualValues(t, 2, options.Items[0].SuccessCount)
	require.EqualValues(t, 3, options.Items[0].TotalCount)

	priority := int64(1)
	require.NoError(t, model.DB.Create(&model.Ability{
		Group:     "fallback",
		Model:     "z-model",
		ChannelId: 1,
		Enabled:   true,
		Priority:  &priority,
	}).Error)
	fallback, err := BuildStatusPageModelOptions("fallback", 90)
	require.NoError(t, err)
	require.Equal(t, "abilities", fallback.Source)
	require.Equal(t, "z-model", fallback.DefaultModel)
	require.True(t, fallback.Items[0].Fallback)
}

func TestStatusPageIncidentOverridesComponentAndOverall(t *testing.T) {
	active := []model.StatusPageIncident{
		{
			Impact:       model.StatusPageIncidentImpactMajor,
			Status:       model.StatusPageIncidentIdentified,
			ComponentIds: "[7]",
		},
	}
	days := []dto.StatusPageDailyUptime{{
		Status: model.StatusPageComponentOperational,
		Total:  10,
	}}

	status := ResolveComponentCurrentStatus(days, active, 7)
	require.Equal(t, model.StatusPageComponentPartialOutage, status)

	overall := ResolveOverallStatus(
		[]dto.StatusPageComponentView{{Status: model.StatusPageComponentOperational}},
		[]dto.StatusPageIncidentView{{
			Impact: model.StatusPageIncidentImpactCritical,
			Status: model.StatusPageIncidentInvestigating,
		}},
	)
	require.Equal(t, model.StatusPageComponentMajorOutage, overall)
}

func TestStatusPageCurrentStatusUsesRolling24Hours(t *testing.T) {
	setupStatusPageTestDB(t)
	now := time.Now().In(time.UTC)
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	createdAt := startOfToday.Add(-time.Minute).Unix()
	require.NoError(t, model.LOG_DB.Create(&[]model.Log{
		{CreatedAt: createdAt, Type: model.LogTypeConsume, ModelName: "gpt-4o", ChannelId: 1, Group: "default"},
		{CreatedAt: createdAt, Type: model.LogTypeError, ModelName: "gpt-4o", ChannelId: 1, Group: "default"},
	}).Error)
	bindings, err := model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Models: []string{"gpt-4o"},
	})
	require.NoError(t, err)
	component := model.StatusPageComponent{Name: "Model", Bindings: bindings}

	days, err := GetComponentDailyUptime(component, 1)
	require.NoError(t, err)
	require.Equal(t, model.StatusPageComponentNoData, days[0].Status)

	status, err := GetComponentCurrentUptimeStatus(component)
	require.NoError(t, err)
	require.Equal(t, model.StatusPageComponentMajorOutage, status)
}

func TestStatusPageSummaryIncludesOlderActiveIncident(t *testing.T) {
	setupStatusPageTestDB(t)
	now := time.Now().Unix()
	bindings, err := model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Models: []string{"gpt-4o"},
	})
	require.NoError(t, err)
	require.NoError(t, model.CreateStatusPageComponent(&model.StatusPageComponent{
		Name:      "Model",
		Enabled:   true,
		Bindings:  bindings,
		SortOrder: 1,
	}))
	require.NoError(t, model.LOG_DB.Create(&model.Log{
		CreatedAt: now,
		Type:      model.LogTypeConsume,
		ModelName: "gpt-4o",
		ChannelId: 1,
		Group:     "default",
	}).Error)
	active := model.StatusPageIncident{
		Title:     "Long running incident",
		Impact:    model.StatusPageIncidentImpactCritical,
		Status:    model.StatusPageIncidentInvestigating,
		StartedAt: now - 30*24*3600,
	}
	require.NoError(t, model.CreateStatusPageIncident(&active))
	for i := 0; i < 11; i++ {
		require.NoError(t, model.CreateStatusPageIncident(&model.StatusPageIncident{
			Title:     "Resolved incident",
			Impact:    model.StatusPageIncidentImpactMinor,
			Status:    model.StatusPageIncidentResolved,
			StartedAt: now - int64(i+1)*3600,
		}))
	}

	summary, err := BuildStatusPageSummary(1)
	require.NoError(t, err)
	require.Equal(t, model.StatusPageComponentMajorOutage, summary.OverallStatus)
	foundActive := false
	for _, incident := range summary.Incidents {
		if incident.Id == active.Id {
			foundActive = true
			break
		}
	}
	require.True(t, foundActive)
}

func TestStatusPageIncidentViewsUseEmptyUpdatesArray(t *testing.T) {
	setupStatusPageTestDB(t)
	incident := model.StatusPageIncident{
		Title:     "No updates yet",
		Impact:    model.StatusPageIncidentImpactMinor,
		Status:    model.StatusPageIncidentInvestigating,
		StartedAt: time.Now().Unix(),
	}
	require.NoError(t, model.CreateStatusPageIncident(&incident))

	views, err := BuildStatusPageIncidentViews([]model.StatusPageIncident{incident})
	require.NoError(t, err)
	require.Len(t, views, 1)
	require.NotNil(t, views[0].Updates)
	require.Empty(t, views[0].Updates)

	raw, err := common.Marshal(views[0])
	require.NoError(t, err)
	require.Contains(t, string(raw), `"updates":[]`)
}

func TestStatusPageSummaryDoesNotExposeInternalBindings(t *testing.T) {
	setupStatusPageTestDB(t)
	bindings, err := model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Models:     []string{"private-model"},
		ChannelIds: []int{99},
		Groups:     []string{"internal-group"},
	})
	require.NoError(t, err)
	require.NoError(t, model.CreateStatusPageComponent(&model.StatusPageComponent{
		Name:        "Public component",
		Description: "Public description",
		Enabled:     true,
		Bindings:    bindings,
	}))

	summary, err := BuildStatusPageSummary(1)
	require.NoError(t, err)
	raw, err := common.Marshal(summary)
	require.NoError(t, err)
	body := strings.ToLower(string(raw))

	for _, forbidden := range []string{
		"bindings",
		"channel_ids",
		"private-model",
		"internal-group",
		"endpoint",
		"base_url",
		"key",
		"request_id",
	} {
		require.NotContains(t, body, forbidden)
	}
}
