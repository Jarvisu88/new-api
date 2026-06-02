package controller

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
	"gorm.io/gorm"
)

func setupStatusPageControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	initModelListColumnNames(t)
	gin.SetMode(gin.TestMode)

	oldDB := model.DB
	oldLogDB := model.LOG_DB
	oldUsingSQLite := common.UsingSQLite
	oldUsingMySQL := common.UsingMySQL
	oldUsingPostgreSQL := common.UsingPostgreSQL

	common.UsingSQLite = true
	common.UsingMySQL = false
	common.UsingPostgreSQL = false

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	model.DB = db
	model.LOG_DB = db
	require.NoError(t, db.AutoMigrate(
		&model.Log{},
		&model.Channel{},
		&model.Ability{},
		&model.StatusPageComponent{},
		&model.StatusPageProbeResult{},
		&model.StatusPageIncident{},
		&model.StatusPageIncidentUpdate{},
	))

	t.Cleanup(func() {
		model.DB = oldDB
		model.LOG_DB = oldLogDB
		common.UsingSQLite = oldUsingSQLite
		common.UsingMySQL = oldUsingMySQL
		common.UsingPostgreSQL = oldUsingPostgreSQL
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return db
}

func runStatusPageHandler(t *testing.T, method string, target string, body any, handler gin.HandlerFunc) *httptest.ResponseRecorder {
	t.Helper()
	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		data, err := common.Marshal(body)
		require.NoError(t, err)
		reader = bytes.NewReader(data)
	}
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(method, target, reader)
	c.Request.Header.Set("Content-Type", "application/json")
	handler(c)
	return w
}

func TestAdminStatusPageModelOptionsFromLogs(t *testing.T) {
	setupStatusPageControllerTestDB(t)
	now := time.Now().Unix()
	require.NoError(t, model.LOG_DB.Create(&[]model.Log{
		{CreatedAt: now - 30, Type: model.LogTypeConsume, ModelName: "top", ChannelId: 1, Group: "default"},
		{CreatedAt: now - 20, Type: model.LogTypeConsume, ModelName: "top", ChannelId: 1, Group: "default"},
		{CreatedAt: now - 10, Type: model.LogTypeConsume, ModelName: "other", ChannelId: 1, Group: "default"},
	}).Error)

	w := runStatusPageHandler(t, http.MethodGet, "/api/status-page/admin/model-options?group=default&days=90", nil, AdminGetStatusPageModelOptions)

	require.Equal(t, http.StatusOK, w.Code)
	body := w.Body.String()
	require.True(t, gjson.Get(body, "success").Bool())
	require.Equal(t, "logs", gjson.Get(body, "data.source").String())
	require.Equal(t, "top", gjson.Get(body, "data.default_model").String())
	require.EqualValues(t, 2, gjson.Get(body, "data.items.0.success_count").Int())
}

func TestAdminStatusPageModelOptionsFallsBackToAbilities(t *testing.T) {
	setupStatusPageControllerTestDB(t)
	priority := int64(1)
	require.NoError(t, model.DB.Create(&model.Ability{
		Group:     "fallback",
		Model:     "gpt-fallback",
		ChannelId: 9,
		Enabled:   true,
		Priority:  &priority,
	}).Error)

	w := runStatusPageHandler(t, http.MethodGet, "/api/status-page/admin/model-options?group=fallback&days=90", nil, AdminGetStatusPageModelOptions)

	require.Equal(t, http.StatusOK, w.Code)
	body := w.Body.String()
	require.True(t, gjson.Get(body, "success").Bool())
	require.Equal(t, "abilities", gjson.Get(body, "data.source").String())
	require.Equal(t, "gpt-fallback", gjson.Get(body, "data.default_model").String())
	require.True(t, gjson.Get(body, "data.items.0.fallback").Bool())
}

func TestAdminCreateStatusPageComponentNormalizesBindings(t *testing.T) {
	setupStatusPageControllerTestDB(t)
	payload := map[string]any{
		"name":       "default / gpt-test",
		"enabled":    true,
		"sort_order": 0,
		"status":     "no_data",
		"bindings": map[string]any{
			"groups":      []string{"default", "default"},
			"models":      []string{"gpt-test", ""},
			"channel_ids": []int{1, 1, 0},
			"thresholds": map[string]float64{
				"operational":    99,
				"degraded":       90,
				"partial_outage": 70,
			},
			"probe": map[string]any{
				"enabled": true,
				"models":  []string{"gpt-test", "gpt-test", ""},
			},
		},
	}

	w := runStatusPageHandler(t, http.MethodPost, "/api/status-page/admin/components", payload, AdminCreateStatusPageComponent)

	require.Equal(t, http.StatusOK, w.Code)
	require.True(t, gjson.Get(w.Body.String(), "success").Bool())
	stored, err := model.GetStatusPageComponentById(int(gjson.Get(w.Body.String(), "data.id").Int()))
	require.NoError(t, err)
	bindings, err := model.ParseStatusPageBindings(stored.Bindings)
	require.NoError(t, err)
	require.Equal(t, []string{"default"}, bindings.Groups)
	require.Equal(t, []string{"gpt-test"}, bindings.Models)
	require.Equal(t, []int{1}, bindings.ChannelIds)
	require.EqualValues(t, 99, bindings.Thresholds.Operational)
	require.EqualValues(t, 90, bindings.Thresholds.Degraded)
	require.EqualValues(t, 70, bindings.Thresholds.PartialOutage)
	require.True(t, bindings.Probe.Enabled)
	require.Equal(t, []string{"gpt-test"}, bindings.Probe.Models)
}

func TestAdminCreateStatusPageComponentDefaultsThresholds(t *testing.T) {
	setupStatusPageControllerTestDB(t)
	payload := map[string]any{
		"name":    "default / gpt-test",
		"enabled": true,
		"status":  "no_data",
		"bindings": map[string]any{
			"groups": []string{"default"},
			"models": []string{"gpt-test"},
		},
	}

	w := runStatusPageHandler(t, http.MethodPost, "/api/status-page/admin/components", payload, AdminCreateStatusPageComponent)

	require.Equal(t, http.StatusOK, w.Code)
	require.True(t, gjson.Get(w.Body.String(), "success").Bool())
	stored, err := model.GetStatusPageComponentById(int(gjson.Get(w.Body.String(), "data.id").Int()))
	require.NoError(t, err)
	bindings, err := model.ParseStatusPageBindings(stored.Bindings)
	require.NoError(t, err)
	require.EqualValues(t, model.StatusPageDefaultOperationalThreshold, bindings.Thresholds.Operational)
	require.EqualValues(t, model.StatusPageDefaultDegradedThreshold, bindings.Thresholds.Degraded)
	require.EqualValues(t, model.StatusPageDefaultPartialOutageThreshold, bindings.Thresholds.PartialOutage)
	require.False(t, bindings.Probe.Enabled)
	require.Empty(t, bindings.Probe.Models)
}
