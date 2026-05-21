package langfuse_setting

import (
	"github.com/QuantumNous/new-api/setting/config"
)

type LangfuseSetting struct {
	Enabled      bool   `json:"enabled"`
	Host         string `json:"host"`
	PublicKey    string `json:"public_key"`
	SecretKey    string `json:"secret_key"`
	TraceContent bool   `json:"trace_content"`
}

var langfuseSetting = LangfuseSetting{
	Enabled:      false,
	Host:         "https://cloud.langfuse.com",
	PublicKey:    "",
	SecretKey:    "",
	TraceContent: false,
}

func init() {
	config.GlobalConfig.Register("langfuse_setting", &langfuseSetting)
}

func GetLangfuseSetting() *LangfuseSetting {
	return &langfuseSetting
}
