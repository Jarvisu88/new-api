package model

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSumUsedQuotaFiltersRequestID(t *testing.T) {
	truncateTables(t)

	now := time.Now().Unix()
	logs := []Log{
		{
			UserId:           1,
			Username:         "alice",
			CreatedAt:        now,
			Type:             LogTypeConsume,
			ModelName:        "gpt-test",
			Quota:            10,
			PromptTokens:     3,
			CompletionTokens: 7,
			RequestId:        "req-a",
		},
		{
			UserId:           1,
			Username:         "alice",
			CreatedAt:        now,
			Type:             LogTypeConsume,
			ModelName:        "gpt-test",
			Quota:            20,
			PromptTokens:     11,
			CompletionTokens: 13,
			RequestId:        "req-b",
		},
		{
			UserId:           1,
			Username:         "alice",
			CreatedAt:        now,
			Type:             LogTypeConsume,
			ModelName:        "gpt-test",
			Quota:            30,
			PromptTokens:     17,
			CompletionTokens: 19,
			RequestId:        "req-a",
		},
	}
	require.NoError(t, LOG_DB.Create(&logs).Error)

	stat, err := SumUsedQuota(LogTypeConsume, 0, 0, "", "", "", 0, "", "req-a")
	require.NoError(t, err)

	assert.Equal(t, 40, stat.Quota)
	assert.Equal(t, 2, stat.Rpm)
	assert.Equal(t, 46, stat.Tpm)
}
