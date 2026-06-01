package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

func TestUpdateOptionMapForcesThemeFrontendClassic(t *testing.T) {
	common.OptionMapRWMutex.Lock()
	common.OptionMap = make(map[string]string)
	common.OptionMapRWMutex.Unlock()
	common.SetTheme("classic")

	if err := updateOptionMap("theme.frontend", "default"); err != nil {
		t.Fatalf("updateOptionMap returned error: %v", err)
	}

	common.OptionMapRWMutex.RLock()
	gotOption := common.OptionMap["theme.frontend"]
	common.OptionMapRWMutex.RUnlock()

	if gotOption != "classic" {
		t.Fatalf("theme.frontend option = %q, want classic", gotOption)
	}
	if gotTheme := system_setting.GetThemeSettings().Frontend; gotTheme != "classic" {
		t.Fatalf("theme setting = %q, want classic", gotTheme)
	}
	if gotRuntimeTheme := common.GetTheme(); gotRuntimeTheme != "classic" {
		t.Fatalf("runtime theme = %q, want classic", gotRuntimeTheme)
	}
}
