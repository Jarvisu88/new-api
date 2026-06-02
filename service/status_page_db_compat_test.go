package service

import (
	"os"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/console_setting"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type statusPageDBCompatTable struct {
	name  string
	model interface{}
}

var statusPageDBCompatTables = []statusPageDBCompatTable{
	{name: "users", model: &model.User{}},
	{name: "channels", model: &model.Channel{}},
	{name: "abilities", model: &model.Ability{}},
	{name: "logs", model: &model.Log{}},
	{name: "status_page_components", model: &model.StatusPageComponent{}},
	{name: "status_page_probe_results", model: &model.StatusPageProbeResult{}},
	{name: "status_page_incidents", model: &model.StatusPageIncident{}},
	{name: "status_page_incident_updates", model: &model.StatusPageIncidentUpdate{}},
}

var statusPageDBCompatModels = []interface{}{
	statusPageDBCompatTables[0].model,
	statusPageDBCompatTables[1].model,
	statusPageDBCompatTables[2].model,
	statusPageDBCompatTables[3].model,
	statusPageDBCompatTables[4].model,
	statusPageDBCompatTables[5].model,
	statusPageDBCompatTables[6].model,
	statusPageDBCompatTables[7].model,
}

func openStatusPageExternalDB(t *testing.T, dialect string, dsn string) (*gorm.DB, *bool) {
	t.Helper()

	oldDB := model.DB
	oldLogDB := model.LOG_DB
	oldRedisEnabled := common.RedisEnabled
	oldUsingSQLite := common.UsingSQLite
	oldUsingMySQL := common.UsingMySQL
	oldUsingPostgreSQL := common.UsingPostgreSQL
	oldTimezone := console_setting.GetConsoleSetting().StatusPageTimezone
	oldTitle := console_setting.GetConsoleSetting().StatusPageTitle
	oldDescription := console_setting.GetConsoleSetting().StatusPageDescription
	oldEnabled := console_setting.GetConsoleSetting().StatusPageEnabled

	common.RedisEnabled = false
	common.UsingSQLite = false
	common.UsingMySQL = dialect == "mysql"
	common.UsingPostgreSQL = dialect == "postgres"

	managedTables := new(bool)
	var db *gorm.DB
	t.Cleanup(func() {
		if db != nil {
			if *managedTables {
				_ = db.Migrator().DropTable(
					&model.StatusPageIncidentUpdate{},
					&model.StatusPageIncident{},
					&model.StatusPageProbeResult{},
					&model.StatusPageComponent{},
					&model.Log{},
					&model.Ability{},
					&model.Channel{},
					&model.User{},
				)
			}
			sqlDB, err := db.DB()
			if err == nil {
				_ = sqlDB.Close()
			}
		}
		model.DB = oldDB
		model.LOG_DB = oldLogDB
		common.RedisEnabled = oldRedisEnabled
		common.UsingSQLite = oldUsingSQLite
		common.UsingMySQL = oldUsingMySQL
		common.UsingPostgreSQL = oldUsingPostgreSQL
		console_setting.GetConsoleSetting().StatusPageTimezone = oldTimezone
		console_setting.GetConsoleSetting().StatusPageTitle = oldTitle
		console_setting.GetConsoleSetting().StatusPageDescription = oldDescription
		console_setting.GetConsoleSetting().StatusPageEnabled = oldEnabled
	})

	var err error
	switch dialect {
	case "mysql":
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	case "postgres":
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	default:
		t.Fatalf("unsupported dialect %q", dialect)
	}
	require.NoErrorf(t, err, "failed to open %s db", dialect)

	model.DB = db
	model.LOG_DB = db
	console_setting.GetConsoleSetting().StatusPageTimezone = "UTC"
	console_setting.GetConsoleSetting().StatusPageTitle = "System Status"
	console_setting.GetConsoleSetting().StatusPageDescription = "Availability"
	console_setting.GetConsoleSetting().StatusPageEnabled = true

	existingTables := make([]string, 0)
	for _, table := range statusPageDBCompatTables {
		if db.Migrator().HasTable(table.model) {
			existingTables = append(existingTables, table.name)
		}
	}
	if len(existingTables) > 0 {
		t.Skipf("refusing to run %s status page compatibility test against external database because test tables already exist: %v", dialect, existingTables)
	}

	return db, managedTables
}

func runStatusPageDBCompatibilityTest(t *testing.T, db *gorm.DB, managedTables *bool) {
	t.Helper()

	*managedTables = true
	require.NoError(t, db.AutoMigrate(statusPageDBCompatModels...))

	now := time.Now().Add(-time.Minute).Unix()
	bindings, err := model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Groups: []string{"default"},
		Models: []string{"gpt-test"},
		Probe: model.StatusPageComponentProbe{
			Enabled: true,
			Models:  []string{"gpt-test"},
		},
	})
	require.NoError(t, err)
	component := model.StatusPageComponent{
		Name:        "Default GPT Test",
		Description: "Default group gpt-test health",
		Enabled:     true,
		Bindings:    bindings,
		SortOrder:   1,
	}
	require.NoError(t, model.CreateStatusPageComponent(&component))

	require.NoError(t, model.LOG_DB.Create(&[]model.Log{
		{
			CreatedAt: now,
			Type:      model.LogTypeConsume,
			ModelName: "gpt-test",
			ChannelId: 1,
			Group:     "default",
		},
		{
			CreatedAt: now,
			Type:      model.LogTypeError,
			ModelName: "gpt-test",
			ChannelId: 2,
			Group:     "default",
		},
	}).Error)

	summary, err := BuildStatusPageSummary(1)
	require.NoError(t, err)
	require.Len(t, summary.Components, 1)
	require.Equal(t, component.Id, summary.Components[0].Id)
	require.Equal(t, "Default GPT Test", summary.Components[0].Name)
	require.EqualValues(t, 2, summary.Components[0].Total)
	require.EqualValues(t, 1, summary.Components[0].Success)

	options, err := BuildStatusPageModelOptions("default", 90)
	require.NoError(t, err)
	require.Equal(t, "logs", options.Source)
	require.Equal(t, "gpt-test", options.DefaultModel)
	require.Len(t, options.Items, 1)
	require.Equal(t, "gpt-test", options.Items[0].Model)
	require.EqualValues(t, 2, options.Items[0].TotalCount)
	require.EqualValues(t, 1, options.Items[0].SuccessCount)

	require.NoError(t, model.UpsertStatusPageProbeResult(&model.StatusPageProbeResult{
		ComponentId:  component.Id,
		Group:        "default",
		ModelName:    "gpt-test",
		ChannelId:    1,
		Success:      true,
		Message:      "ok",
		ResponseTime: 120,
		TestedAt:     now,
	}))
	require.NoError(t, model.UpsertStatusPageProbeResult(&model.StatusPageProbeResult{
		ComponentId:  component.Id,
		Group:        "default",
		ModelName:    "gpt-test",
		ChannelId:    1,
		Success:      false,
		Message:      "failed",
		ResponseTime: 300,
		TestedAt:     now + 1,
	}))
	var probeResults []model.StatusPageProbeResult
	require.NoError(t, model.DB.Find(&probeResults).Error)
	require.Len(t, probeResults, 1)
	require.Equal(t, component.Id, probeResults[0].ComponentId)
	require.Equal(t, "default", probeResults[0].Group)
	require.Equal(t, "gpt-test", probeResults[0].ModelName)
	require.Equal(t, 1, probeResults[0].ChannelId)
	require.False(t, probeResults[0].Success)
	require.Equal(t, "failed", probeResults[0].Message)
	require.EqualValues(t, 300, probeResults[0].ResponseTime)

	require.NoError(t, model.DB.Create(&[]model.Channel{
		{
			Id:     1,
			Type:   1,
			Key:    "enabled-key",
			Status: common.ChannelStatusEnabled,
			Name:   "enabled-channel",
			Group:  "default",
		},
		{
			Id:     2,
			Type:   1,
			Key:    "disabled-key",
			Status: common.ChannelStatusManuallyDisabled,
			Name:   "disabled-channel",
			Group:  "default",
		},
	}).Error)
	highPriority := int64(10)
	lowPriority := int64(1)
	require.NoError(t, model.DB.Create(&[]model.Ability{
		{
			Group:     "default",
			Model:     "gpt-test",
			ChannelId: 2,
			Enabled:   true,
			Priority:  &highPriority,
		},
		{
			Group:     "default",
			Model:     "gpt-test",
			ChannelId: 1,
			Enabled:   true,
			Priority:  &lowPriority,
		},
		{
			Group:     "default",
			Model:     "gpt-test",
			ChannelId: 3,
			Enabled:   false,
			Priority:  &highPriority,
		},
	}).Error)

	channels, err := model.GetStatusPageProbeChannels("default", "gpt-test", 3)
	require.NoError(t, err)
	require.Len(t, channels, 1)
	require.Equal(t, 1, channels[0].Id)
	require.Equal(t, "enabled-channel", channels[0].Name)
	require.Equal(t, common.ChannelStatusEnabled, channels[0].Status)
}

func TestStatusPageDBCompatibilityMySQL(t *testing.T) {
	dsn := os.Getenv("TEST_MYSQL_DSN")
	if dsn == "" {
		t.Skip("set TEST_MYSQL_DSN to run mysql status page compatibility test")
	}

	db, managedTables := openStatusPageExternalDB(t, "mysql", dsn)
	runStatusPageDBCompatibilityTest(t, db, managedTables)
}

func TestStatusPageDBCompatibilityPostgres(t *testing.T) {
	dsn := os.Getenv("TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("set TEST_POSTGRES_DSN to run postgres status page compatibility test")
	}

	db, managedTables := openStatusPageExternalDB(t, "postgres", dsn)
	runStatusPageDBCompatibilityTest(t, db, managedTables)
}
