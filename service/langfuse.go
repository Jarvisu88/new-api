package service

import (
	"bytes"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/setting/langfuse_setting"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type langfuseEvent struct {
	Id        string      `json:"id"`
	Type      string      `json:"type"`
	Timestamp string      `json:"timestamp"`
	Body      interface{} `json:"body"`
}

type langfuseTraceBody struct {
	Id       string                 `json:"id"`
	Name     string                 `json:"name"`
	UserId   string                 `json:"userId,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
	Input    interface{}            `json:"input,omitempty"`
	Output   interface{}            `json:"output,omitempty"`
}

type langfuseGenerationBody struct {
	Id        string                 `json:"id"`
	TraceId   string                 `json:"traceId"`
	Name      string                 `json:"name"`
	StartTime string                 `json:"startTime"`
	EndTime   string                 `json:"endTime"`
	Model     string                 `json:"model"`
	Input     interface{}            `json:"input,omitempty"`
	Output    interface{}            `json:"output,omitempty"`
	Usage     *langfuseUsage         `json:"usage,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

type langfuseUsage struct {
	Input     int     `json:"input"`
	Output    int     `json:"output"`
	Total     int     `json:"total"`
	TotalCost float64 `json:"totalCost,omitempty"`
}

type langfuseBatchRequest struct {
	Batch []langfuseEvent `json:"batch"`
}

// PLACEHOLDER_LANGFUSE_SEND

func SendLangfuseTrace(ctx *gin.Context, relayInfo *relaycommon.RelayInfo, usage *dto.Usage, promptTokens, completionTokens, totalTokens, quota int) {
	cfg := langfuse_setting.GetLangfuseSetting()
	if !cfg.Enabled || cfg.Host == "" || cfg.PublicKey == "" || cfg.SecretKey == "" {
		return
	}

	now := time.Now().UTC()
	traceId := uuid.New().String()
	generationId := uuid.New().String()
	startTime := relayInfo.StartTime.UTC().Format(time.RFC3339Nano)
	endTime := now.Format(time.RFC3339Nano)

	metadata := map[string]interface{}{
		"channel_id": relayInfo.ChannelId,
		"token_id":   relayInfo.TokenId,
		"group":      relayInfo.UsingGroup,
		"is_stream":  relayInfo.IsStream,
		"request_id": ctx.GetString(common.RequestIdKey),
		"quota":      quota,
	}

	var input interface{}
	var output interface{}
	if cfg.TraceContent && relayInfo.Request != nil {
		input = relayInfo.Request
	} else {
		input = map[string]int{"prompt_tokens": promptTokens}
		output = map[string]int{"completion_tokens": completionTokens}
	}

	traceBody := langfuseTraceBody{
		Id:       traceId,
		Name:     relayInfo.OriginModelName,
		UserId:   strconv.Itoa(relayInfo.UserId),
		Metadata: metadata,
	}

	generationBody := langfuseGenerationBody{
		Id:        generationId,
		TraceId:   traceId,
		Name:      relayInfo.OriginModelName,
		StartTime: startTime,
		EndTime:   endTime,
		Model:     relayInfo.UpstreamModelName,
		Input:     input,
		Output:    output,
		Usage: &langfuseUsage{
			Input:     promptTokens,
			Output:    completionTokens,
			Total:     totalTokens,
			TotalCost: float64(quota) / common.QuotaPerUnit,
		},
		Metadata: metadata,
	}

	traceEvent := langfuseEvent{
		Id:        uuid.New().String(),
		Type:      "trace-create",
		Timestamp: now.Format(time.RFC3339Nano),
		Body:      traceBody,
	}

	generationEvent := langfuseEvent{
		Id:        uuid.New().String(),
		Type:      "generation-create",
		Timestamp: now.Format(time.RFC3339Nano),
		Body:      generationBody,
	}

	batch := langfuseBatchRequest{
		Batch: []langfuseEvent{traceEvent, generationEvent},
	}

	jsonData, err := common.Marshal(batch)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("langfuse: failed to marshal trace: %s", err.Error()))
		return
	}

	sendLangfuseRequest(ctx, cfg, jsonData)
}

func sendLangfuseRequest(ctx *gin.Context, cfg *langfuse_setting.LangfuseSetting, jsonData []byte) {
	url := cfg.Host + "/api/public/ingestion"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(jsonData))
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("langfuse: failed to create request: %s", err.Error()))
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(cfg.PublicKey, cfg.SecretKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("langfuse: failed to send trace: %s", err.Error()))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		logger.LogError(ctx, fmt.Sprintf("langfuse: ingestion API returned status %d", resp.StatusCode))
	} else {
		logger.LogInfo(ctx, fmt.Sprintf("langfuse: trace sent successfully (status %d)", resp.StatusCode))
	}
}
